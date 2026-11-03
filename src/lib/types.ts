// Tipos centrais do domínio MEGA SORTE.
// Compartilhados pelo modo Supabase e pelo modo demo (store em memória).

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'finished' | 'cancelled';

export type DrawStatus = 'scheduled' | 'running' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: CampaignStatus;
  identifier_count: number;
  starts_at: string;
  ends_at: string;
  draw_at: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  title: string;
  description: string;
  image_url?: string | null;
  status: CampaignStatus;
  identifier_count: number;
  starts_at: string;
  ends_at: string;
  draw_at?: string | null;
}

export interface CampaignRule {
  id: string;
  campaign_id: string;
  min_age: number;
  max_entries_per_user: number;
  terms_url: string | null;
  notes: string | null;
}

export interface Prize {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  /** Valor do prêmio em R$ (definido pelo admin; null = não informado). */
  value: number | null;
  quantity: number;
  position: number;
  created_at: string;
}

export interface PrizeInput {
  campaign_id: string;
  name: string;
  description: string;
  value?: number | null;
  quantity: number;
  position: number;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
}

/** Status de pagamento da participação (DEMO: sem cobrança real). */
export type PaymentStatus = 'pendente' | 'confirmado';

export interface Entry {
  id: string;
  campaign_id: string;
  profile_id: string;
  identifier: string;
  payment_status: PaymentStatus;
  /** Pedido no gateway MP (ms-<ts>-<rand>); null até o usuário iniciar o pagamento. */
  order_id: string | null;
  created_at: string;
}

export interface EntryWithProfile extends Entry {
  profile_name: string;
  profile_email: string;
}

export interface EntryWithCampaign extends Entry {
  campaign_title: string;
  campaign_status: CampaignStatus;
}

export interface DrawSession {
  id: string;
  campaign_id: string;
  status: DrawStatus;
  scheduled_at: string;
  executed_at: string | null;
  seed_hash: string | null;
  total_entries: number | null;
  created_at: string;
}

export interface DrawResult {
  id: string;
  draw_session_id: string;
  campaign_id: string;
  prize_id: string | null;
  winning_identifier: string;
  winner_profile_id: string | null;
  seed_hash: string;
  executed_at: string;
  created_at: string;
}

export interface ResultView extends DrawResult {
  campaign_title: string;
  prize_name: string | null;
  prize_value: number | null;
  winner_name: string | null;
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  profile_id: string;
  role: 'admin' | 'manager';
  created_at: string;
}

export interface Session {
  profile: Profile;
  isAdmin: boolean;
}

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  isAdmin: boolean;
}
