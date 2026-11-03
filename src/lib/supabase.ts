// Fábricas de clientes Supabase.
// - supabaseConfigured(): diz se há env vars para o modo Supabase.
// - createSupabaseServerClient(): para Server Components / Route Handlers (gerencia cookies via @supabase/ssr).
// - createSupabaseBrowserClient(): para componentes client (uso futuro).
// - createSupabaseServiceClient(): SOMENTE server-side — usa a service_role key,
//   que NUNCA pode ir para o browser. Retorna null se a chave não existir.

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
        ) => {
          try {
            // Em Server Components o set pode falhar — o middleware cuida da renovação.
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // ignora: leitura continua válida
          }
        },
      },
    },
  );
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

/**
 * Cliente privilegiado (service_role). Chamar APENAS em código server-side
 * (db.ts, auth.ts, admin.ts, route handlers). Nunca expor no browser.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
