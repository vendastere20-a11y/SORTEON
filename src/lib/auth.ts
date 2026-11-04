import "server-only";

// Autenticação da plataforma.
// Modo demo: sessão via cookie httpOnly 'ms_session' (valor = profile id), 7 dias.
// Modo Supabase: sessão gerenciada pelo @supabase/ssr (cookies próprios); aqui
// apenas resolvemos o profile + flag de admin a partir do usuário autenticado.

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import type { Profile, Session } from './types';
import { DEMO_ACCOUNTS } from './demo-data';
import { createSupabaseServerClient, createSupabaseServiceClient } from './supabase';
import { createProfile, getMode, getProfile, getProfileByEmail, isAdminUser } from './db';

const SESSION_COOKIE = 'ms_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

async function setSessionCookie(profileId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, profileId, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<Session | null> {
  if (getMode() === 'demo') {
    const profileId = await readSessionCookie();
    if (!profileId) return null;
    const profile = await getProfile(profileId);
    if (!profile) return null;
    return { profile, isAdmin: await isAdminUser(profile.id) };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile) return null;
  return { profile, isAdmin: await isAdminUser(user.id) };
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (!session.isAdmin) throw new Error('FORBIDDEN');
  return session;
}

export async function loginWithPassword(email: string, password: string): Promise<Session> {
  if (getMode() === 'demo') {
    const normalized = email.trim().toLowerCase();
    const account = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === normalized && a.password === password,
    );
    if (!account) throw new Error('INVALID_CREDENTIALS');
    const profile = await getProfileByEmail(account.email);
    if (!profile) throw new Error('INVALID_CREDENTIALS');
    await setSessionCookie(profile.id);
    return { profile, isAdmin: account.isAdmin };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error('INVALID_CREDENTIALS');
  // Garante que existe um profile ligado ao usuário do Supabase Auth.
  let profile = await getProfile(data.user.id);
  if (!profile) {
    const metaName = data.user.user_metadata?.['name'];
    profile = await createProfile({
      id: data.user.id,
      email: data.user.email ?? email,
      name: typeof metaName === 'string' && metaName ? metaName : email.split('@')[0] ?? 'Usuário',
    });
  }
  return { profile, isAdmin: await isAdminUser(profile.id) };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<Session> {
  if (getMode() === 'demo') {
    const existing = await getProfileByEmail(input.email);
    if (existing) throw new Error('EMAIL_TAKEN');
    const profile: Profile = await createProfile({
      id: `profile-${randomBytes(6).toString('hex')}`,
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
    });
    await setSessionCookie(profile.id);
    return { profile, isAdmin: false };
  }
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error('Supabase não configurado');
  // Cria o usuário já confirmado via Admin API. O supabase.auth.signUp() comum
  // não serve aqui: com a confirmação de e-mail ativada no projeto (padrão do
  // Supabase), ele retorna sem usuário e o cadastro quebra com erro genérico.
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name, phone: input.phone ?? null },
  });
  if (error) {
    if (/already.*registered|already exists/i.test(error.message)) {
      throw new Error('EMAIL_TAKEN');
    }
    throw new Error(error.message);
  }
  const user = data.user;
  if (!user) throw new Error('Falha ao criar usuário');
  // O trigger on_auth_user_created já criou o profile (nome via metadados).
  // Busca com pequena espera caso haja latência; se não existir, cria manual.
  let profile = await getProfile(user.id);
  if (!profile) {
    try {
      profile = await createProfile({
        id: user.id,
        email: user.email ?? input.email,
        name: input.name,
        phone: input.phone ?? null,
      });
    } catch (e) {
      // Condição de corrida com o trigger: o profile apareceu entre o get e o
      // insert — busca de novo em vez de falhar.
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        profile = await getProfile(user.id);
      } else {
        throw e;
      }
    }
  }
  if (!profile) throw new Error('Falha ao criar perfil');
  // O trigger não salva o telefone — completa o profile quando necessário.
  if (input.phone && !profile.phone) {
    const { data: updated, error: upErr } = await admin
      .from('profiles')
      .update({ phone: input.phone })
      .eq('id', profile.id)
      .select()
      .single();
    if (!upErr && updated) profile = updated as Profile;
  }
  return { profile, isAdmin: await isAdminUser(profile.id) };
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  if (getMode() === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  }
}
