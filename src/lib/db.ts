import "server-only";

// Camada de dados com padrão adapter: usa Supabase quando as env vars existem,
// senão usa um store em memória populado com dados demo (buildDemoStore).
// Assinaturas idênticas nos dois modos.
// Nomes de tabelas (modo Supabase) devem espelhar o schema.sql:
// campaigns, campaign_rules, prizes, profiles, entries, draw_sessions,
// draw_results, notifications, audit_logs, admin_users.

import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

import type {
  AuditLog,
  Campaign,
  CampaignInput,
  CampaignRule,
  CampaignStatus,
  DrawResult,
  DrawSession,
  Entry,
  EntryWithCampaign,
  EntryWithProfile,
  Notification,
  Prize,
  PrizeInput,
  Profile,
  ResultView,
} from './types';
import { buildDemoStore, DEMO_ACCOUNTS, type DemoStore } from './demo-data';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  supabaseConfigured,
} from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getMode(): 'supabase' | 'demo' {
  return supabaseConfigured() ? 'supabase' : 'demo';
}

// ---------- Store em memória (modo demo, instância única por processo) ----------

const store: DemoStore = buildDemoStore();

const nowIso = (): string => new Date().toISOString();

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString('hex')}`;
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

// ---------- Cliente Supabase (service role quando houver, senão server client) ----------

async function getClient(): Promise<SupabaseClient> {
  const client = createSupabaseServiceClient() ?? (await createSupabaseServerClient());
  if (!client) throw new Error('Supabase não configurado');
  return client;
}

// ---------- Campanhas ----------

export async function listCampaigns(filter?: { status?: CampaignStatus }): Promise<Campaign[]> {
  if (getMode() === 'demo') {
    const all = filter?.status
      ? store.campaigns.filter((c) => c.status === filter.status)
      : [...store.campaigns];
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const client = await getClient();
  let query = client.from('campaigns').select('*').order('created_at', { ascending: false });
  if (filter?.status) query = query.eq('status', filter.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (getMode() === 'demo') {
    return store.campaigns.find((c) => c.id === id) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Campaign | null;
}

export async function createCampaign(input: CampaignInput, actorId: string): Promise<Campaign> {
  const base = {
    title: input.title,
    description: input.description,
    image_url: input.image_url ?? null,
    status: input.status,
    identifier_count: input.identifier_count,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    draw_at: input.draw_at ?? null,
    is_demo: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  let campaign: Campaign;
  if (getMode() === 'demo') {
    campaign = { ...base, id: genId('camp') };
    store.campaigns.push(campaign);
    // Toda campanha nasce com uma regra padrão (1 participação por usuário, 18+).
    store.rules.push({
      id: genId('rule'),
      campaign_id: campaign.id,
      min_age: 18,
      max_entries_per_user: 1,
      terms_url: null,
      notes: null,
    });
  } else {
    const client = await getClient();
    const { data, error } = await client.from('campaigns').insert(base).select().single();
    if (error) throw new Error(error.message);
    campaign = data as Campaign;
    const { error: ruleError } = await client
      .from('campaign_rules')
      .insert({ campaign_id: campaign.id, min_age: 18, max_entries_per_user: 1 });
    if (ruleError) throw new Error(ruleError.message);
  }
  await logAudit(actorId, 'campaign.created', 'campaign', campaign.id, { title: campaign.title });
  return campaign;
}

export async function updateCampaign(
  id: string,
  input: Partial<CampaignInput>,
  actorId: string,
): Promise<Campaign> {
  if (getMode() === 'demo') {
    const campaign = store.campaigns.find((c) => c.id === id);
    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
    Object.assign(campaign, input, { updated_at: nowIso() });
    await logAudit(actorId, 'campaign.updated', 'campaign', id, { changes: Object.keys(input) });
    return campaign;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('campaigns')
    .update({ ...input, updated_at: nowIso() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAudit(actorId, 'campaign.updated', 'campaign', id, { changes: Object.keys(input) });
  return data as Campaign;
}

export async function deleteCampaign(id: string, actorId: string): Promise<void> {
  if (getMode() === 'demo') {
    const idx = store.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('CAMPAIGN_NOT_FOUND');
    // Cascata manual no modo demo: remove tudo ligado à campanha.
    store.campaigns.splice(idx, 1);
    store.prizes = store.prizes.filter((p) => p.campaign_id !== id);
    store.rules = store.rules.filter((r) => r.campaign_id !== id);
    store.entries = store.entries.filter((e) => e.campaign_id !== id);
    store.drawResults = store.drawResults.filter((r) => r.campaign_id !== id);
    store.drawSessions = store.drawSessions.filter((s) => s.campaign_id !== id);
  } else {
    const client = await getClient();
    // Remove dependentes antes da campanha (ordem respeita as FKs).
    await client.from('draw_results').delete().eq('campaign_id', id);
    await client.from('draw_sessions').delete().eq('campaign_id', id);
    await client.from('entries').delete().eq('campaign_id', id);
    await client.from('prizes').delete().eq('campaign_id', id);
    await client.from('campaign_rules').delete().eq('campaign_id', id);
    const { error } = await client.from('campaigns').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  await logAudit(actorId, 'campaign.deleted', 'campaign', id, null);
}

// ---------- Prêmios ----------

export async function getPrizes(campaignId: string): Promise<Prize[]> {
  if (getMode() === 'demo') {
    return store.prizes
      .filter((p) => p.campaign_id === campaignId)
      .sort((a, b) => a.position - b.position);
  }
  const client = await getClient();
  const { data, error } = await client
    .from('prizes')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Prize[];
}

export async function getPrize(id: string): Promise<Prize | null> {
  if (getMode() === 'demo') {
    return store.prizes.find((p) => p.id === id) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client.from('prizes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Prize | null;
}

export async function createPrize(input: PrizeInput, actorId: string): Promise<Prize> {
  if (getMode() === 'demo') {
    const prize: Prize = {
      ...input,
      value: input.value ?? null,
      id: genId('prize'),
      created_at: nowIso(),
    };
    store.prizes.push(prize);
    await logAudit(actorId, 'prize.created', 'prize', prize.id, { campaign_id: input.campaign_id });
    return prize;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('prizes')
    .insert({ ...input, created_at: nowIso() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const prize = data as Prize;
  await logAudit(actorId, 'prize.created', 'prize', prize.id, { campaign_id: input.campaign_id });
  return prize;
}

export async function updatePrize(
  id: string,
  input: Partial<PrizeInput>,
  actorId: string,
): Promise<Prize> {
  if (getMode() === 'demo') {
    const prize = store.prizes.find((p) => p.id === id);
    if (!prize) throw new Error('PRIZE_NOT_FOUND');
    Object.assign(prize, input);
    await logAudit(actorId, 'prize.updated', 'prize', id, { changes: Object.keys(input) });
    return prize;
  }
  const client = await getClient();
  const { data, error } = await client.from('prizes').update(input).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await logAudit(actorId, 'prize.updated', 'prize', id, { changes: Object.keys(input) });
  return data as Prize;
}

export async function deletePrize(id: string, actorId: string): Promise<void> {
  if (getMode() === 'demo') {
    const idx = store.prizes.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('PRIZE_NOT_FOUND');
    store.prizes.splice(idx, 1);
  } else {
    const client = await getClient();
    const { error } = await client.from('prizes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  await logAudit(actorId, 'prize.deleted', 'prize', id, null);
}

// ---------- Regras ----------

export async function getRules(campaignId: string): Promise<CampaignRule | null> {
  if (getMode() === 'demo') {
    return store.rules.find((r) => r.campaign_id === campaignId) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('campaign_rules')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as CampaignRule | null;
}

// ---------- Participações ----------

export async function countEntries(campaignId: string): Promise<number> {
  if (getMode() === 'demo') {
    return store.entries.filter((e) => e.campaign_id === campaignId).length;
  }
  const client = await getClient();
  const { count, error } = await client
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listEntries(campaignId: string): Promise<EntryWithProfile[]> {
  if (getMode() === 'demo') {
    return store.entries
      .filter((e) => e.campaign_id === campaignId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((e) => {
        const p = store.profiles.find((x) => x.id === e.profile_id);
        return {
          ...e,
          profile_name: p?.name ?? 'Participante',
          profile_email: p?.email ?? '—',
        };
      });
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('*, profile:profiles!inner(name, email)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  type Row = Entry & { profile: { name: string; email: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((r) => ({
    id: r.id,
    campaign_id: r.campaign_id,
    profile_id: r.profile_id,
    identifier: r.identifier,
    payment_status: r.payment_status,
    order_id: r.order_id ?? null,
    created_at: r.created_at,
    profile_name: r.profile?.name ?? 'Participante',
    profile_email: r.profile?.email ?? '—',
  }));
}

/** Números já ocupados numa campanha (1..N). Usado pela grade de escolha. */
export async function getTakenNumbers(campaignId: string): Promise<number[]> {
  const parse = (identifier: string): number | null => {
    const n = Number.parseInt(identifier, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  if (getMode() === 'demo') {
    const taken = new Set<number>();
    for (const e of store.entries) {
      if (e.campaign_id !== campaignId) continue;
      const n = parse(e.identifier);
      if (n !== null) taken.add(n);
    }
    return [...taken].sort((a, b) => a - b);
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('identifier')
    .eq('campaign_id', campaignId);
  if (error) throw new Error(error.message);
  const taken = new Set<number>();
  for (const row of (data ?? []) as { identifier: string }[]) {
    const n = parse(row.identifier);
    if (n !== null) taken.add(n);
  }
  return [...taken].sort((a, b) => a - b);
}

export async function createEntry(
  campaignId: string,
  profileId: string,
  numero?: number,
): Promise<Entry> {
  // Validações comuns aos dois modos.
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  if (campaign.status !== 'active') throw new Error('CAMPAIGN_NOT_ACTIVE');
  const now = new Date();
  if (now < new Date(campaign.starts_at) || now > new Date(campaign.ends_at)) {
    throw new Error('CAMPAIGN_CLOSED');
  }
  if (numero !== undefined) {
    if (!Number.isInteger(numero) || numero < 1 || numero > campaign.identifier_count) {
      throw new Error('INVALID_NUMBER');
    }
  }

  if (getMode() === 'demo') {
    if (store.entries.some((e) => e.campaign_id === campaignId && e.profile_id === profileId)) {
      throw new Error('DUPLICATE');
    }
    const taken = new Set(
      store.entries
        .filter((e) => e.campaign_id === campaignId)
        .map((e) => e.identifier),
    );
    let chosen: number | undefined = numero;
    if (chosen === undefined) {
      // Sem número escolhido: usa o primeiro livre.
      for (let n = 1; n <= campaign.identifier_count; n++) {
        if (!taken.has(pad4(n))) {
          chosen = n;
          break;
        }
      }
      if (chosen === undefined) throw new Error('FULL');
    } else if (taken.has(pad4(chosen))) {
      throw new Error('NUMBER_TAKEN');
    }
    const entry: Entry = {
      id: genId('entry'),
      campaign_id: campaignId,
      profile_id: profileId,
      identifier: pad4(chosen),
      payment_status: 'pendente',
      order_id: null,
      created_at: nowIso(),
    };
    store.entries.push(entry);
    await logAudit(profileId, 'entry.created', 'entry', entry.id, {
      campaign_id: campaignId,
      identifier: entry.identifier,
    });
    return entry;
  }

  const client = await getClient();
  const { data: dup, error: dupError } = await client
    .from('entries')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (dupError) throw new Error(dupError.message);
  if (dup) throw new Error('DUPLICATE');

  let chosen: number | undefined = numero;
  if (chosen === undefined) {
    const taken = new Set(await getTakenNumbers(campaignId));
    for (let n = 1; n <= campaign.identifier_count; n++) {
      if (!taken.has(n)) {
        chosen = n;
        break;
      }
    }
    if (chosen === undefined) throw new Error('FULL');
  } else {
    const { data: taken, error: takenError } = await client
      .from('entries')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('identifier', pad4(chosen))
      .maybeSingle();
    if (takenError) throw new Error(takenError.message);
    if (taken) throw new Error('NUMBER_TAKEN');
  }

  const entry = {
    id: randomUUID(),
    campaign_id: campaignId,
    profile_id: profileId,
    identifier: pad4(chosen),
    payment_status: 'pendente' as const,
    order_id: null as string | null,
    created_at: nowIso(),
  };
  try {
    const { data, error } = await client.from('entries').insert(entry).select().single();
    if (error) throw error;
    await logAudit(profileId, 'entry.created', 'entry', entry.id, {
      campaign_id: campaignId,
      identifier: entry.identifier,
    });
    return data as Entry;
  } catch (e) {
    // Condição de corrida: a UNIQUE(campaign_id, identifier) do banco decide.
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === '23505') {
      const { data: conflict } = await client
        .from('entries')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('profile_id', profileId)
        .maybeSingle();
      throw new Error(conflict ? 'DUPLICATE' : 'NUMBER_TAKEN');
    }
    throw new Error(e instanceof Error ? e.message : 'ENTRY_FAILED');
  }
}

export async function getMyEntries(profileId: string): Promise<EntryWithCampaign[]> {
  if (getMode() === 'demo') {
    return store.entries
      .filter((e) => e.profile_id === profileId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((e) => {
        const c = store.campaigns.find((x) => x.id === e.campaign_id);
        return {
          ...e,
          campaign_title: c?.title ?? '—',
          campaign_status: (c?.status ?? 'cancelled') as CampaignStatus,
        };
      });
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('*, campaign:campaigns!inner(title, status)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  type Row = Entry & { campaign: { title: string; status: CampaignStatus } | null };
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((r) => ({
    id: r.id,
    campaign_id: r.campaign_id,
    profile_id: r.profile_id,
    identifier: r.identifier,
    payment_status: r.payment_status,
    order_id: r.order_id ?? null,
    created_at: r.created_at,
    campaign_title: r.campaign?.title ?? '—',
    campaign_status: r.campaign?.status ?? 'cancelled',
  }));
}

/** Participação por id (sem checagem de dono — a rota valida). */
export async function getEntryById(entryId: string): Promise<Entry | null> {
  if (getMode() === 'demo') {
    return store.entries.find((e) => e.id === entryId) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client.from('entries').select('*').eq('id', entryId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Entry | null;
}

/** Participação do usuário numa campanha (1 por pessoa). */
export async function getMyEntry(campaignId: string, profileId: string): Promise<Entry | null> {
  if (getMode() === 'demo') {
    return (
      store.entries.find((e) => e.campaign_id === campaignId && e.profile_id === profileId) ?? null
    );
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Entry | null;
}

/** Busca uma participação pelo identificador (usado no comprovante da apuração). */
export async function getEntryByIdentifier(
  campaignId: string,
  identifier: string,
): Promise<Entry | null> {
  if (getMode() === 'demo') {
    return (
      store.entries.find((e) => e.campaign_id === campaignId && e.identifier === identifier) ??
      null
    );
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('identifier', identifier)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Entry | null;
}

/**
 * Marca a participação como pagamento confirmado (modo DEMO: simulação,
 * sem cobrança real). Só o dono da participação pode confirmar.
 */
export async function confirmEntryPayment(entryId: string, profileId: string): Promise<Entry> {
  if (getMode() === 'demo') {
    const entry = store.entries.find((e) => e.id === entryId && e.profile_id === profileId);
    if (!entry) throw new Error('ENTRY_NOT_FOUND');
    if (entry.payment_status !== 'confirmado') {
      entry.payment_status = 'confirmado';
      await logAudit(profileId, 'payment.confirmed', 'entry', entry.id, {
        campaign_id: entry.campaign_id,
        identifier: entry.identifier,
        simulated: true,
      });
    }
    return entry;
  }
  const client = await getClient();
  const { data: entry, error: fetchError } = await client
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!entry) throw new Error('ENTRY_NOT_FOUND');
  if ((entry as Entry).payment_status !== 'confirmado') {
    const { data, error } = await client
      .from('entries')
      .update({ payment_status: 'confirmado' })
      .eq('id', entryId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAudit(profileId, 'payment.confirmed', 'entry', entryId, {
      campaign_id: (data as Entry).campaign_id,
      identifier: (data as Entry).identifier,
      simulated: true,
    });
    return data as Entry;
  }
  return entry as Entry;
}

/** Gera um order_id no formato exigido pelo gateway (ms-<ts>-<rand>). */
export function generateOrderId(): string {
  const rand = randomBytes(4).toString('hex').slice(0, 8);
  return `ms-${Date.now()}-${rand}`;
}

/** Vincula um order_id à participação (só o dono). */
export async function setEntryOrderId(
  entryId: string,
  profileId: string,
  orderId: string,
): Promise<Entry> {
  if (!/^ms-\d+-[a-z0-9]{4,12}$/.test(orderId)) throw new Error('INVALID_ORDER_ID');
  if (getMode() === 'demo') {
    const entry = store.entries.find((e) => e.id === entryId && e.profile_id === profileId);
    if (!entry) throw new Error('ENTRY_NOT_FOUND');
    entry.order_id = orderId;
    return entry;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .update({ order_id: orderId })
    .eq('id', entryId)
    .eq('profile_id', profileId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Entry;
}

/** Busca participação pelo order_id (usado pelo webhook do Mercado Pago). */
export async function getEntryByOrderId(orderId: string): Promise<Entry | null> {
  if (getMode() === 'demo') {
    return store.entries.find((e) => e.order_id === orderId) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('entries')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Entry | null;
}

/**
 * Confirma o pagamento a partir do order_id (webhook MP).
 * Idempotente: se já estiver confirmado, não faz nada.
 */
export async function confirmEntryByOrderId(orderId: string): Promise<Entry | null> {
  const entry = await getEntryByOrderId(orderId);
  if (!entry) return null;
  if (entry.payment_status === 'confirmado') return entry;
  if (getMode() === 'demo') {
    entry.payment_status = 'confirmado';
  } else {
    const client = await getClient();
    const { error } = await client
      .from('entries')
      .update({ payment_status: 'confirmado' })
      .eq('id', entry.id);
    if (error) throw new Error(error.message);
    entry.payment_status = 'confirmado';
  }
  await logAudit(null, 'payment.confirmed', 'entry', entry.id, {
    campaign_id: entry.campaign_id,
    identifier: entry.identifier,
    order_id: orderId,
    via: 'mercadopago_webhook',
  });
  return entry;
}

export async function getMyResults(profileId: string): Promise<ResultView[]> {
  if (getMode() === 'demo') {
    return store.drawResults
      .filter((r) => r.winner_profile_id === profileId)
      .sort((a, b) => b.executed_at.localeCompare(a.executed_at))
      .map((r) => toResultView(r));
  }
  const client = await getClient();
  const { data, error } = await client
    .from('draw_results')
    .select('*, campaign:campaigns!inner(title), prize:prizes(name, value), winner:profiles(name)')
    .eq('winner_profile_id', profileId)
    .order('executed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapResultRows(data);
}

// ---------- Apurações ----------

export async function listDrawSessions(): Promise<DrawSession[]> {
  if (getMode() === 'demo') {
    return [...store.drawSessions].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  }
  const client = await getClient();
  const { data, error } = await client
    .from('draw_sessions')
    .select('*')
    .order('scheduled_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DrawSession[];
}

export async function getDrawSession(id: string): Promise<DrawSession | null> {
  if (getMode() === 'demo') {
    return store.drawSessions.find((s) => s.id === id) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client.from('draw_sessions').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as DrawSession | null;
}

export async function createDrawSession(
  campaignId: string,
  scheduledAt: string,
  actorId: string,
): Promise<DrawSession> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  const base = {
    campaign_id: campaignId,
    status: 'scheduled' as DrawSession['status'],
    scheduled_at: scheduledAt,
    executed_at: null,
    seed_hash: null,
    total_entries: null,
    created_at: nowIso(),
  };
  let session: DrawSession;
  if (getMode() === 'demo') {
    session = { ...base, id: genId('sess') };
    store.drawSessions.push(session);
  } else {
    const client = await getClient();
    const { data, error } = await client.from('draw_sessions').insert(base).select().single();
    if (error) throw new Error(error.message);
    session = data as DrawSession;
  }
  await logAudit(actorId, 'draw_session.created', 'draw_session', session.id, {
    campaign_id: campaignId,
    scheduled_at: scheduledAt,
  });
  return session;
}

export async function executeDraw(sessionId: string, actorId: string): Promise<DrawResult> {
  const session = await getDrawSession(sessionId);
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (session.status !== 'scheduled') throw new Error('SESSION_NOT_SCHEDULED');
  const existing = await getResultBySession(sessionId);
  if (existing) throw new Error('ALREADY_EXECUTED');

  // Pool de participações da campanha.
  let pool: Entry[];
  if (getMode() === 'demo') {
    pool = store.entries.filter((e) => e.campaign_id === session.campaign_id);
  } else {
    const client = await getClient();
    const { data, error } = await client
      .from('entries')
      .select('*')
      .eq('campaign_id', session.campaign_id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    pool = (data ?? []) as Entry[];
  }
  if (pool.length === 0) throw new Error('NO_ENTRIES');

  // Sorteio criptograficamente aleatório + seed auditável.
  const idx = randomInt(pool.length);
  const seed = randomBytes(32).toString('hex');
  const seedHash = createHash('sha256').update(seed + sessionId + String(Date.now())).digest('hex');
  const winner = pool[idx];
  const executedAt = nowIso();

  const prizes = await getPrizes(session.campaign_id);
  const prize = prizes.length > 0 ? prizes[0] : null;

  let result: DrawResult;
  if (getMode() === 'demo') {
    result = {
      id: genId('result'),
      draw_session_id: sessionId,
      campaign_id: session.campaign_id,
      prize_id: prize ? prize.id : null,
      winning_identifier: winner.identifier,
      winner_profile_id: winner.profile_id,
      seed_hash: seedHash,
      executed_at: executedAt,
      created_at: executedAt,
    };
    store.drawResults.push(result);
    const s = store.drawSessions.find((x) => x.id === sessionId);
    if (s) {
      s.status = 'completed';
      s.executed_at = executedAt;
      s.seed_hash = seedHash;
      s.total_entries = pool.length;
    }
    store.notifications.push({
      id: genId('notif'),
      profile_id: winner.profile_id,
      title: 'Você ganhou! 🎉',
      body: `Seu número ${winner.identifier} foi sorteado. Confira o resultado na plataforma!`,
      read: false,
      created_at: executedAt,
    });
  } else {
    const client = await getClient();
    const { data, error } = await client
      .from('draw_results')
      .insert({
        draw_session_id: sessionId,
        campaign_id: session.campaign_id,
        prize_id: prize ? prize.id : null,
        winning_identifier: winner.identifier,
        winner_profile_id: winner.profile_id,
        seed_hash: seedHash,
        executed_at: executedAt,
        created_at: executedAt,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    result = data as DrawResult;
    const { error: sessionError } = await client
      .from('draw_sessions')
      .update({
        status: 'completed',
        executed_at: executedAt,
        seed_hash: seedHash,
        total_entries: pool.length,
      })
      .eq('id', sessionId);
    if (sessionError) throw new Error(sessionError.message);
    const { error: notifError } = await client.from('notifications').insert({
      profile_id: winner.profile_id,
      title: 'Você ganhou! 🎉',
      body: `Seu número ${winner.identifier} foi sorteado. Confira o resultado na plataforma!`,
      created_at: executedAt,
    });
    if (notifError) throw new Error(notifError.message);
  }

  await logAudit(actorId, 'draw.executed', 'draw_session', sessionId, {
    campaign_id: session.campaign_id,
    winner_profile_id: winner.profile_id,
    winning_identifier: winner.identifier,
    total_entries: pool.length,
  });
  return result;
}

export async function getResultBySession(sessionId: string): Promise<DrawResult | null> {
  if (getMode() === 'demo') {
    return store.drawResults.find((r) => r.draw_session_id === sessionId) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('draw_results')
    .select('*')
    .eq('draw_session_id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as DrawResult | null;
}

export async function listResults(): Promise<ResultView[]> {
  if (getMode() === 'demo') {
    return [...store.drawResults]
      .sort((a, b) => b.executed_at.localeCompare(a.executed_at))
      .map((r) => toResultView(r));
  }
  const client = await getClient();
  const { data, error } = await client
    .from('draw_results')
    .select('*, campaign:campaigns!inner(title), prize:prizes(name, value), winner:profiles(name)')
    .order('executed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapResultRows(data);
}

// Enriquecimento de DrawResult -> ResultView.

function toResultView(r: DrawResult): ResultView {
  const campaign = store.campaigns.find((c) => c.id === r.campaign_id);
  const prize = r.prize_id ? store.prizes.find((p) => p.id === r.prize_id) : undefined;
  const winner = r.winner_profile_id
    ? store.profiles.find((p) => p.id === r.winner_profile_id)
    : undefined;
  return {
    ...r,
    campaign_title: campaign?.title ?? '—',
    prize_name: prize?.name ?? null,
    prize_value: prize?.value ?? null,
    winner_name: winner?.name ?? null,
  };
}

type ResultRow = DrawResult & {
  campaign: { title: string } | null;
  prize: { name: string; value: number | null } | null;
  winner: { name: string } | null;
};

function mapResultRows(data: unknown): ResultView[] {
  const rows = (Array.isArray(data) ? data : []) as unknown as ResultRow[];
  return rows.map((r) => ({
    id: r.id,
    draw_session_id: r.draw_session_id,
    campaign_id: r.campaign_id,
    prize_id: r.prize_id,
    winning_identifier: r.winning_identifier,
    winner_profile_id: r.winner_profile_id,
    seed_hash: r.seed_hash,
    executed_at: r.executed_at,
    created_at: r.created_at,
    campaign_title: r.campaign?.title ?? '—',
    prize_name: r.prize?.name ?? null,
    prize_value: r.prize?.value ?? null,
    winner_name: r.winner?.name ?? null,
  }));
}

// ---------- Notificações ----------

export async function listNotifications(profileId: string): Promise<Notification[]> {
  if (getMode() === 'demo') {
    return store.notifications
      .filter((n) => n.profile_id === profileId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const client = await getClient();
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string, profileId: string): Promise<void> {
  if (getMode() === 'demo') {
    const notif = store.notifications.find((n) => n.id === id && n.profile_id === profileId);
    if (notif) notif.read = true;
    return;
  }
  const client = await getClient();
  const { error } = await client
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('profile_id', profileId);
  if (error) throw new Error(error.message);
}

// ---------- Auditoria ----------

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  if (getMode() === 'demo') {
    return [...store.auditLogs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const client = await getClient();
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLog[];
}

export async function logAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  if (getMode() === 'demo') {
    store.auditLogs.push({
      id: genId('audit'),
      actor_id: actorId,
      action,
      entity,
      entity_id: entityId ?? null,
      meta: meta ?? null,
      created_at: nowIso(),
    });
    return;
  }
  const client = await getClient();
  const { error } = await client.from('audit_logs').insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId ?? null,
    meta: meta ?? null,
    created_at: nowIso(),
  });
  if (error) throw new Error(error.message);
}

// ---------- Perfis ----------

export async function getProfile(id: string): Promise<Profile | null> {
  if (getMode() === 'demo') {
    return store.profiles.find((p) => p.id === id) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Profile | null;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const normalized = email.trim().toLowerCase();
  if (getMode() === 'demo') {
    return store.profiles.find((p) => p.email.toLowerCase() === normalized) ?? null;
  }
  const client = await getClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .ilike('email', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Profile | null;
}

export async function createProfile(input: {
  email: string;
  name: string;
  phone?: string | null;
  // id opcional: no modo Supabase o auth.ts passa o id do usuário do Supabase Auth.
  id?: string;
}): Promise<Profile> {
  const existing = await getProfileByEmail(input.email);
  if (existing) throw new Error('EMAIL_TAKEN');
  const profile: Profile = {
    id: input.id ?? (getMode() === 'demo' ? genId('profile') : randomUUID()),
    email: input.email.trim().toLowerCase(),
    name: input.name,
    phone: input.phone ?? null,
    created_at: nowIso(),
  };
  if (getMode() === 'demo') {
    store.profiles.push(profile);
    return profile;
  }
  const client = await getClient();
  const { data, error } = await client.from('profiles').insert(profile).select().single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function listProfiles(): Promise<Profile[]> {
  if (getMode() === 'demo') {
    return [...store.profiles].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  const client = await getClient();
  const { data, error } = await client.from('profiles').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function isAdminUser(profileId: string): Promise<boolean> {
  if (getMode() === 'demo') {
    // No modo demo, admin = qualquer conta demo marcada como isAdmin.
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) return false;
    return DEMO_ACCOUNTS.some((a) => a.isAdmin && a.email === profile.email);
  }
  const client = await getClient();
  const { data, error } = await client
    .from('admin_users')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
