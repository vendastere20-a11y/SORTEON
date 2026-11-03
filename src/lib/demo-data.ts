// Dados de demonstração para o modo sem Supabase.
// buildDemoStore() devolve um objeto com todos os arrays tipados,
// que o db.ts mantém em memória (uma única instância por processo).

import type {
  AuditLog,
  Campaign,
  CampaignRule,
  DemoAccount,
  DrawResult,
  DrawSession,
  Entry,
  Notification,
  Prize,
  Profile,
} from './types';

/** Contas de acesso da demonstração (login por e-mail + senha). */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'demo@megasorte.demo', password: 'bruno123', name: 'Participante Demo', isAdmin: false },
  { email: 'admin@megasorte.demo', password: 'bruno123', name: 'Admin Demo', isAdmin: true },
];

/** Formato do store em memória usado no modo demo. */
export interface DemoStore {
  profiles: Profile[];
  campaigns: Campaign[];
  prizes: Prize[];
  rules: CampaignRule[];
  entries: Entry[];
  drawSessions: DrawSession[];
  drawResults: DrawResult[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Data ISO relativa ao momento em que o store é construído. */
const at = (offsetMs: number): string => new Date(Date.now() + offsetMs).toISOString();

const pad4 = (n: number): string => String(n).padStart(4, '0');

export function buildDemoStore(): DemoStore {
  // ---- Perfis: 2 contas demo + 12 participantes fictícios ----
  const profiles: Profile[] = [
    {
      id: 'profile-demo',
      email: 'demo@megasorte.demo',
      name: 'Participante Demo',
      phone: null,
      created_at: at(-40 * DAY),
    },
    {
      id: 'profile-admin',
      email: 'admin@megasorte.demo',
      name: 'Admin Demo',
      phone: null,
      created_at: at(-40 * DAY),
    },
  ];
  for (let i = 1; i <= 12; i++) {
    const n = String(i).padStart(2, '0');
    profiles.push({
      id: `profile-p${n}`,
      email: `participante${n}@demo.local`,
      name: `Participante ${n}`,
      phone: null,
      created_at: at(-35 * DAY),
    });
  }
  const fakeIds = profiles
    .filter((p) => p.id.startsWith('profile-p'))
    .map((p) => p.id);

  // ---- Campanhas demo ----
  const campaigns: Campaign[] = [
    {
      id: 'camp-iphone',
      title: 'iPhone 17 Pro Max 256GB',
      description:
        'Participe da demonstração do MEGA SORTE e concorra a um iPhone 17 Pro Max com 256GB de armazenamento. ' +
        'Esta é uma campanha de demonstração — nenhum prêmio real será entregue. ' +
        'Garanta seu número da sorte e acompanhe a apuração ao vivo na plataforma.',
      image_url: null,
      status: 'active',
      identifier_count: 1000,
      price_per_number: 10.0,
      starts_at: at(-7 * DAY),
      ends_at: at(30 * DAY),
      draw_at: at(32 * DAY),
      is_demo: true,
      created_at: at(-7 * DAY),
      updated_at: at(-7 * DAY),
    },
    {
      id: 'camp-ps5',
      title: 'PlayStation 5 Slim + 2 controles DualSense',
      description:
        'Demonstração do MEGA SORTE valendo um PlayStation 5 Slim com dois controles DualSense. ' +
        'Campanha fictícia para testar o fluxo de participação e apuração. ' +
        'Nenhum prêmio real será entregue — participe e veja como funciona.',
      image_url: null,
      status: 'active',
      identifier_count: 500,
      price_per_number: 10.0,
      starts_at: at(-5 * DAY),
      ends_at: at(20 * DAY),
      draw_at: at(22 * DAY),
      is_demo: true,
      created_at: at(-5 * DAY),
      updated_at: at(-5 * DAY),
    },
    {
      id: 'camp-pix',
      title: 'R$ 5.000 no PIX',
      description:
        'Campanha de demonstração do MEGA SORTE com prêmio fictício de R$ 5.000 via PIX. ' +
        'Serve apenas para demonstrar o cadastro, a participação e a apuração dos resultados. ' +
        'Nenhum valor real será pago.',
      image_url: null,
      status: 'active',
      identifier_count: 200,
      price_per_number: 20.0,
      starts_at: at(-2 * DAY),
      ends_at: at(10 * DAY),
      draw_at: at(12 * DAY),
      is_demo: true,
      created_at: at(-2 * DAY),
      updated_at: at(-2 * DAY),
    },
    {
      id: 'camp-moto',
      title: 'Honda CB 300F Twister 0km',
      description:
        'Demonstração do MEGA SORTE: uma Honda CB 300F Twister 0km fictícia como prêmio. ' +
        'As participações encerram em breve e a apuração já está agendada. ' +
        'Tudo aqui é simulado — nenhum prêmio real será entregue.',
      image_url: null,
      status: 'active',
      identifier_count: 100,
      price_per_number: 25.0,
      starts_at: at(-1 * DAY),
      ends_at: at(1 * DAY),
      draw_at: at(26 * HOUR),
      is_demo: true,
      created_at: at(-1 * DAY),
      updated_at: at(-1 * DAY),
    },
    {
      id: 'camp-airfryer',
      title: 'Air Fryer 5L + Kit Churrasco',
      description:
        'Campanha de demonstração do MEGA SORTE já encerrada e apurada. ' +
        'O sorteio foi executado com seed auditável e o resultado está publicado. ' +
        'Nenhum prêmio real foi entregue — use como referência do fluxo completo.',
      image_url: null,
      status: 'finished',
      identifier_count: 50,
      price_per_number: 50.0,
      starts_at: at(-20 * DAY),
      ends_at: at(-5 * DAY),
      draw_at: at(-4 * DAY),
      is_demo: true,
      created_at: at(-20 * DAY),
      updated_at: at(-4 * DAY),
    },
    {
      id: 'camp-echo',
      title: 'Echo Dot 5ª geração',
      description:
        'Rascunho de campanha de demonstração do MEGA SORTE valendo uma Echo Dot 5ª geração fictícia. ' +
        'Ainda não está aberta para participação — o administrador pode publicá-la quando quiser. ' +
        'Nenhum prêmio real será entregue.',
      image_url: null,
      status: 'draft',
      identifier_count: 20,
      price_per_number: 100.0,
      starts_at: at(5 * DAY),
      ends_at: at(40 * DAY),
      draw_at: at(42 * DAY),
      is_demo: true,
      created_at: at(-3 * DAY),
      updated_at: at(-3 * DAY),
    },
  ];

  // ---- Prêmios: 1-2 por campanha (valores fictícios em R$) ----
  const prizes: Prize[] = [
    { id: 'prize-iphone-1', campaign_id: 'camp-iphone', name: 'iPhone 17 Pro Max 256GB', description: 'Prêmio principal (demonstração).', value: 9499.0, quantity: 1, position: 1, image_url: '/demo-prizes/iphone-17-pro-max.jpg', created_at: at(-7 * DAY) },
    { id: 'prize-iphone-2', campaign_id: 'camp-iphone', name: 'Capinha + película premium', description: 'Prêmio secundário (demonstração).', value: 149.9, quantity: 1, position: 2, image_url: '/demo-prizes/capinha-pelicula.jpg', created_at: at(-7 * DAY) },
    { id: 'prize-ps5-1', campaign_id: 'camp-ps5', name: 'PlayStation 5 Slim + 2 controles DualSense', description: 'Prêmio único (demonstração).', value: 4299.0, quantity: 1, position: 1, image_url: '/demo-prizes/ps5-slim.jpg', created_at: at(-5 * DAY) },
    { id: 'prize-pix-1', campaign_id: 'camp-pix', name: 'R$ 5.000 via PIX', description: 'Prêmio principal (demonstração).', value: 5000.0, quantity: 1, position: 1, image_url: '/demo-prizes/pix-5000.jpg', created_at: at(-2 * DAY) },
    { id: 'prize-pix-2', campaign_id: 'camp-pix', name: 'R$ 1.000 via PIX', description: 'Prêmio secundário (demonstração).', value: 1000.0, quantity: 1, position: 2, image_url: '/demo-prizes/pix-1000.jpg', created_at: at(-2 * DAY) },
    { id: 'prize-moto-1', campaign_id: 'camp-moto', name: 'Honda CB 300F Twister 0km', description: 'Prêmio único (demonstração).', value: 27900.0, quantity: 1, position: 1, image_url: '/demo-prizes/honda-cb300f.jpg', created_at: at(-1 * DAY) },
    { id: 'prize-airfryer-1', campaign_id: 'camp-airfryer', name: 'Air Fryer 5L', description: 'Prêmio principal (demonstração).', value: 649.0, quantity: 1, position: 1, image_url: '/demo-prizes/air-fryer-5l.jpg', created_at: at(-20 * DAY) },
    { id: 'prize-airfryer-2', campaign_id: 'camp-airfryer', name: 'Kit Churrasco Inox 12 peças', description: 'Prêmio secundário (demonstração).', value: 189.9, quantity: 1, position: 2, image_url: '/demo-prizes/kit-churrasco.jpg', created_at: at(-20 * DAY) },
    { id: 'prize-echo-1', campaign_id: 'camp-echo', name: 'Echo Dot 5ª geração', description: 'Prêmio único (demonstração).', value: 429.0, quantity: 1, position: 1, image_url: '/demo-prizes/echo-dot-5.jpg', created_at: at(-3 * DAY) },
  ];

  // ---- Regras: uma por campanha ----
  const rules: CampaignRule[] = campaigns.map((c) => ({
    id: `rule-${c.id}`,
    campaign_id: c.id,
    min_age: 18,
    max_entries_per_user: 1,
    terms_url: null,
    notes: null,
  }));

  // ---- Participações (identifiers sempre com 4 dígitos) ----
  // payment_status varia de propósito para demonstrar os selos Pendente/Confirmado.
  const entries: Entry[] = [];
  const addEntries = (
    campaignId: string,
    profileIds: string[],
    createdOffsetMs: number,
    confirmedEvery = 3,
  ): void => {
    profileIds.forEach((profileId, i) => {
      entries.push({
        id: `entry-${campaignId.replace('camp-', '')}-${pad4(i + 1)}`,
        campaign_id: campaignId,
        profile_id: profileId,
        identifier: pad4(i + 1),
        payment_status: (i + 1) % confirmedEvery === 0 ? 'pendente' : 'confirmado',
        order_id: null,
        created_at: at(createdOffsetMs + i * HOUR),
      });
    });
  };
  addEntries('camp-iphone', [...fakeIds, 'profile-demo'], -6 * DAY); // 0013 = demo
  addEntries('camp-ps5', [...fakeIds, 'profile-demo'], -4 * DAY); // 0013 = demo
  addEntries('camp-pix', [...fakeIds, 'profile-demo'], -2 * DAY); // 0013 = demo
  addEntries('camp-moto', fakeIds, -20 * HOUR); // só os 12 fictícios
  addEntries('camp-airfryer', [...fakeIds, 'profile-demo'], -6 * DAY); // 13 no total

  // ---- Sessões de apuração ----
  const drawSessions: DrawSession[] = [
    {
      id: 'demo',
      campaign_id: 'camp-airfryer',
      status: 'completed',
      scheduled_at: at(-4 * DAY),
      executed_at: at(-4 * DAY + HOUR),
      seed_hash: 'demo-seed-hash-9f2c4a1bd3e7f5a2c8b4d6e1f0a3c5b7d9e1f3a5c7b9d1e3f5a7c9b1d3e5f7',
      total_entries: 13,
      created_at: at(-5 * DAY),
    },
    {
      id: 'sess-moto',
      campaign_id: 'camp-moto',
      status: 'scheduled',
      scheduled_at: at(26 * HOUR),
      executed_at: null,
      seed_hash: null,
      total_entries: null,
      created_at: at(-1 * DAY),
    },
    {
      id: 'sess-iphone',
      campaign_id: 'camp-iphone',
      status: 'scheduled',
      scheduled_at: at(32 * DAY),
      executed_at: null,
      seed_hash: null,
      total_entries: null,
      created_at: at(-7 * DAY),
    },
  ];

  // ---- Resultado da apuração concluída (camp-airfryer) ----
  const drawResults: DrawResult[] = [
    {
      id: 'res-demo',
      draw_session_id: 'demo',
      campaign_id: 'camp-airfryer',
      prize_id: 'prize-airfryer-1',
      winning_identifier: '0007',
      winner_profile_id: 'profile-p07',
      seed_hash: 'demo-seed-hash-9f2c4a1bd3e7f5a2c8b4d6e1f0a3c5b7d9e1f3a5c7b9d1e3f5a7c9b1d3e5f7',
      executed_at: at(-4 * DAY + HOUR),
      created_at: at(-4 * DAY + HOUR),
    },
  ];

  // ---- Notificações da conta demo ----
  const notifications: Notification[] = [
    {
      id: 'notif-1',
      profile_id: 'profile-demo',
      title: 'Bem-vindo ao MEGA SORTE',
      body: 'Sua conta de demonstração está pronta. Explore as campanhas, participe e acompanhe as apurações em tempo real.',
      read: false,
      created_at: at(-2 * DAY),
    },
    {
      id: 'notif-2',
      profile_id: 'profile-demo',
      title: 'Participação confirmada',
      body: 'Sua participação na campanha "iPhone 17 Pro Max 256GB" foi registrada com o identificador 0013. Boa sorte!',
      read: false,
      created_at: at(-1 * DAY),
    },
  ];

  // ---- Trilha de auditoria de exemplo ----
  const auditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      actor_id: 'profile-admin',
      action: 'campaign.created',
      entity: 'campaign',
      entity_id: 'camp-iphone',
      meta: { title: 'iPhone 17 Pro Max 256GB' },
      created_at: at(-7 * DAY),
    },
    {
      id: 'audit-2',
      actor_id: 'profile-demo',
      action: 'entry.created',
      entity: 'entry',
      entity_id: 'entry-iphone-0013',
      meta: { campaign_id: 'camp-iphone', identifier: '0013' },
      created_at: at(-6 * DAY),
    },
    {
      id: 'audit-3',
      actor_id: 'profile-admin',
      action: 'draw.executed',
      entity: 'draw_session',
      entity_id: 'demo',
      meta: { campaign_id: 'camp-airfryer', winning_identifier: '0007', winner_profile_id: 'profile-p07' },
      created_at: at(-4 * DAY + HOUR),
    },
    {
      id: 'audit-4',
      actor_id: 'profile-admin',
      action: 'admin.login',
      entity: 'profile',
      entity_id: 'profile-admin',
      meta: null,
      created_at: at(-1 * DAY),
    },
  ];

  return {
    profiles,
    campaigns,
    prizes,
    rules,
    entries,
    drawSessions,
    drawResults,
    notifications,
    auditLogs,
  };
}
