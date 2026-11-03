-- =============================================================================
-- MEGA SORTE — schema.sql
-- Plataforma DEMO de campanhas promocionais (PT-BR)
-- Banco: PostgreSQL 15 / Supabase
-- =============================================================================
--
-- >>> AVISO — MODO DEMO <<<
-- - Este banco destina-se APENAS a demonstrações (is_demo = true).
-- - NÃO existem campanhas reais, cobrança de participação, venda de números
--   ou apuração oficial neste banco.
-- - Antes de qualquer uso real: validação jurídica e técnica obrigatórias.
--
-- Como executar:
-- 1. No dashboard do Supabase, crie um projeto gratuito.
-- 2. Abra o SQL Editor, cole TODO este arquivo e clique em "Run".
-- 3. Depois, informe as variáveis de ambiente do projeto no Vercel
--    (SUPABASE_URL e SUPABASE_ANON_KEY) — NUNCA cole segredos neste arquivo.
--
-- =============================================================================
-- SEÇÃO 1 — EXTENSÕES
-- =============================================================================

-- Extensão pgcrypto: fornece gen_random_uuid() para as chaves primárias.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SEÇÃO 2 — TABELAS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles — participantes da plataforma.
-- Criado automaticamente pelo trigger handle_new_user quando um usuário se
-- cadastra via Supabase Auth (auth.users).
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text        UNIQUE NOT NULL,
    name       text        NOT NULL,
    phone      text,
    cpf        text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- admin_users — vínculo entre um profile e o papel administrativo.
-- role: 'admin' (acesso total) ou 'manager' (gestão operacional).
-- ---------------------------------------------------------------------------
CREATE TABLE public.admin_users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('admin', 'manager')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- campaigns — campanhas promocionais (DEMO).
-- status: draft (rascunho), active (publicada), paused (pausada),
--         finished (finalizada), cancelled (cancelada).
-- identifier_count: quantidade de identificadores da campanha
--                   (20, 50, 100, 200, 500 ou 1000).
-- ---------------------------------------------------------------------------
CREATE TABLE public.campaigns (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title            text NOT NULL,
    description      text NOT NULL DEFAULT '',
    image_url        text,
    status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'paused', 'finished', 'cancelled')),
    identifier_count int  NOT NULL
                     CHECK (identifier_count IN (20, 50, 100, 200, 500, 1000)),
    starts_at        timestamptz NOT NULL DEFAULT now(),
    ends_at          timestamptz NOT NULL,
    draw_at          timestamptz,
    is_demo          boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT campaigns_period_check CHECK (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- campaign_rules — regras de participação de cada campanha (1:1).
-- ---------------------------------------------------------------------------
CREATE TABLE public.campaign_rules (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
    min_age              int  NOT NULL DEFAULT 18,
    max_entries_per_user int  NOT NULL DEFAULT 1,
    terms_url            text,
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- entries — inscrições dos participantes.
-- UNIQUE(campaign_id, profile_id): 1 inscrição por participante por campanha.
-- UNIQUE(campaign_id, identifier): cada número só pode ser escolhido 1 vez.
-- O campo "identifier" é o número escolhido pelo participante (1..N).
-- payment_status: 'pendente' (nasce assim) | 'confirmado' (via Mercado Pago).
-- order_id: pedido no gateway MP (ms-<ts>-<rand>), único quando preenchido.
-- ---------------------------------------------------------------------------
CREATE TABLE public.entries (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    profile_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    identifier     text NOT NULL,
    payment_status text NOT NULL DEFAULT 'pendente'
                   CHECK (payment_status IN ('pendente', 'confirmado')),
    order_id       text UNIQUE,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, profile_id),
    UNIQUE (campaign_id, identifier)
);

-- ---------------------------------------------------------------------------
-- prizes — prêmios de cada campanha.
-- name = produto; value = valor em R$ definido pelo admin (pode ser nulo).
-- ---------------------------------------------------------------------------
CREATE TABLE public.prizes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    value       numeric(12,2),
    quantity    int  NOT NULL DEFAULT 1,
    position    int  NOT NULL DEFAULT 1,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- draw_sessions — sessões de apuração (sorteio) das campanhas.
-- status: scheduled (agendada), running (em execução),
--         completed (concluída), cancelled (cancelada).
-- seed_hash: hash da semente usada no sorteio (auditoria, DEMO).
-- ---------------------------------------------------------------------------
CREATE TABLE public.draw_sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'running', 'completed', 'cancelled')),
    scheduled_at timestamptz NOT NULL,
    executed_at  timestamptz,
    seed_hash    text,
    total_entries int,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- draw_results — resultado da apuração. UM resultado por sessão, IMUTÁVEL.
-- Não existem políticas de UPDATE/DELETE (ver seção 6).
-- ---------------------------------------------------------------------------
CREATE TABLE public.draw_results (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_session_id    uuid NOT NULL UNIQUE REFERENCES public.draw_sessions(id) ON DELETE CASCADE,
    campaign_id        uuid NOT NULL REFERENCES public.campaigns(id),
    prize_id           uuid REFERENCES public.prizes(id),
    winning_identifier text NOT NULL,
    winner_profile_id  uuid REFERENCES public.profiles(id),
    seed_hash          text NOT NULL,
    executed_at        timestamptz NOT NULL DEFAULT now(),
    created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- notifications — notificações para os participantes.
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title      text NOT NULL,
    body       text NOT NULL DEFAULT '',
    read       boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- audit_logs — trilha de auditoria de ações administrativas.
-- Inserções apenas via service_role (sem política pública de INSERT).
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id   uuid REFERENCES public.profiles(id),
    action     text NOT NULL,
    entity     text NOT NULL,
    entity_id  text,
    meta       jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SEÇÃO 3 — ÍNDICES
-- =============================================================================

CREATE INDEX idx_campaigns_status              ON public.campaigns (status);
CREATE INDEX idx_entries_campaign_id           ON public.entries (campaign_id);
CREATE INDEX idx_entries_profile_id            ON public.entries (profile_id);
CREATE INDEX idx_notifications_profile_read    ON public.notifications (profile_id, read);
CREATE INDEX idx_audit_logs_created_at         ON public.audit_logs (created_at);
CREATE INDEX idx_audit_logs_entity             ON public.audit_logs (entity, entity_id);
CREATE INDEX idx_prizes_campaign_id            ON public.prizes (campaign_id);
CREATE INDEX idx_draw_sessions_campaign_id     ON public.draw_sessions (campaign_id);
CREATE INDEX idx_draw_results_campaign_id      ON public.draw_results (campaign_id);

-- =============================================================================
-- SEÇÃO 4 — FUNÇÕES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- is_admin(): retorna true se o usuário autenticado (auth.uid()) possui
-- vínculo em admin_users. SECURITY DEFINER para ler admin_users mesmo
-- quando o chamador não tem acesso direto à tabela.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE admin_users.profile_id = auth.uid()
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- set_updated_at(): atualiza NEW.updated_at = now() antes de cada UPDATE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user(): cria o profile automaticamente quando um usuário se
-- cadastra no Supabase Auth (auth.users). O nome vem do metadado 'name'
-- ou do prefixo do e-mail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data ->> 'name',
            split_part(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$;

-- =============================================================================
-- SEÇÃO 5 — TRIGGERS
-- =============================================================================

-- updated_at automático em profiles e campaigns.
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Criação automática de profile no cadastro via Supabase Auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SEÇÃO 6 — RLS (Row Level Security) E POLÍTICAS
-- =============================================================================
-- RLS habilitado em TODAS as tabelas.
-- =============================================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- campaigns
-- - Leitura pública (anon + authenticated) quando status IN ('active','finished').
-- - Tudo para admin.
-- ---------------------------------------------------------------------------
CREATE POLICY "campaigns_public_read"
    ON public.campaigns FOR SELECT
    TO anon, authenticated
    USING (status IN ('active', 'finished') OR public.is_admin());

CREATE POLICY "campaigns_admin_all"
    ON public.campaigns FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- campaign_rules
-- - Leitura pública para campanhas publicadas (active/finished).
-- - Tudo para admin.
-- ---------------------------------------------------------------------------
CREATE POLICY "campaign_rules_public_read"
    ON public.campaign_rules FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaigns c
            WHERE c.id = campaign_rules.campaign_id
              AND (c.status IN ('active', 'finished') OR public.is_admin())
        )
    );

CREATE POLICY "campaign_rules_admin_all"
    ON public.campaign_rules FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- prizes
-- - Leitura pública para campanhas publicadas (active/finished).
-- - Tudo para admin.
-- ---------------------------------------------------------------------------
CREATE POLICY "prizes_public_read"
    ON public.prizes FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.campaigns c
            WHERE c.id = prizes.campaign_id
              AND (c.status IN ('active', 'finished') OR public.is_admin())
        )
    );

CREATE POLICY "prizes_admin_all"
    ON public.prizes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- - O dono lê e atualiza o próprio perfil (auth.uid() = id).
-- - Admin lê todos os perfis.
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_owner_read"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_owner_update"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- entries
-- - O dono lê as próprias inscrições; admin lê todas.
-- - Usuário autenticado pode inserir a própria inscrição.
--   (A unicidade 1 por campanha é garantida pela constraint;
--    demais validações são feitas no servidor.)
-- ---------------------------------------------------------------------------
CREATE POLICY "entries_owner_read"
    ON public.entries FOR SELECT
    TO authenticated
    USING (auth.uid() = profile_id OR public.is_admin());

CREATE POLICY "entries_authenticated_insert"
    ON public.entries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "entries_admin_all"
    ON public.entries FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- draw_sessions
-- - Leitura pública quando status IN ('scheduled','completed').
-- - Tudo para admin.
-- ---------------------------------------------------------------------------
CREATE POLICY "draw_sessions_public_read"
    ON public.draw_sessions FOR SELECT
    TO anon, authenticated
    USING (status IN ('scheduled', 'completed') OR public.is_admin());

CREATE POLICY "draw_sessions_admin_all"
    ON public.draw_sessions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- draw_results — IMUTÁVEL
-- - Leitura pública (qualquer um pode conferir o resultado DEMO).
-- - INSERT somente para admin.
-- - SEM políticas de UPDATE ou DELETE: o resultado não pode ser alterado.
-- ---------------------------------------------------------------------------
CREATE POLICY "draw_results_public_read"
    ON public.draw_results FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "draw_results_admin_insert"
    ON public.draw_results FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications
-- - O dono lê e atualiza (ex.: marcar como lida) as próprias notificações.
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications_owner_read"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = profile_id);

CREATE POLICY "notifications_owner_update"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- - Leitura SOMENTE para admin.
-- - SEM política pública de INSERT: inserções apenas via service_role
--   (a service_role contorna o RLS).
-- ---------------------------------------------------------------------------
CREATE POLICY "audit_logs_admin_read"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_users
-- - Leitura SOMENTE para admin.
-- ---------------------------------------------------------------------------
CREATE POLICY "admin_users_admin_read"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- SEÇÃO 7 — SEEDS DEMO (is_demo = true)
-- =============================================================================
-- 5 campanhas demo:
--   1 e 2 — ativas
--   3     — ativa, com apuração AGENDADA
--   4     — finalizada, com apuração CONCLUÍDA + resultado + inscrições
--   5     — rascunho (draft, não aparece no site público)
-- Prêmios para cada uma, regras, inscrições de exemplo e notificações
-- de boas-vindas. IDs gerados com gen_random_uuid(); as referências entre
-- as tabelas são amarradas via variáveis dentro do bloco DO.
-- =============================================================================

DO $$
DECLARE
    -- campanhas
    c_ativa_1   uuid;
    c_ativa_2   uuid;
    c_ativa_3   uuid;
    c_finished  uuid;
    c_draft     uuid;
    -- perfis demo
    p_ana       uuid;
    p_beto      uuid;
    p_carla     uuid;
    -- prêmios
    prm_gamer   uuid;
    -- sessão de apuração concluída
    ds_finished uuid;
BEGIN
    -- ------------------------------------------------------------------
    -- 1) Perfis DEMO (participantes de exemplo)
    -- ------------------------------------------------------------------
    INSERT INTO public.profiles (email, name, phone)
    VALUES
        ('ana.demo@sorteon.exemplo',   'Ana Demo',   '(21) 99999-0001'),
        ('beto.demo@sorteon.exemplo',  'Beto Demo',  '(21) 99999-0002'),
        ('carla.demo@sorteon.exemplo', 'Carla Demo', '(21) 99999-0003');

    -- Recupera os três IDs na ordem de criação (e-mails únicos garantem a ordem).
    SELECT id INTO p_ana   FROM public.profiles WHERE email = 'ana.demo@sorteon.exemplo';
    SELECT id INTO p_beto  FROM public.profiles WHERE email = 'beto.demo@sorteon.exemplo';
    SELECT id INTO p_carla FROM public.profiles WHERE email = 'carla.demo@sorteon.exemplo';

    -- ------------------------------------------------------------------
    -- 2) Campanhas DEMO
    -- ------------------------------------------------------------------
    INSERT INTO public.campaigns
        (title, description, status, identifier_count, starts_at, ends_at, draw_at, is_demo)
    VALUES
        (
            'Sorteio Relâmpago — Fone Bluetooth',
            'Campanha DEMO: participe e concorra a um fone de ouvido Bluetooth. Sem cobrança, sem venda de números.',
            'active', 100,
            now() - interval '2 days',
            now() + interval '10 days',
            now() + interval '11 days',
            true
        )
    RETURNING id INTO c_ativa_1;

    INSERT INTO public.campaigns
        (title, description, status, identifier_count, starts_at, ends_at, draw_at, is_demo)
    VALUES
        (
            'Super Prêmio — Smart TV 50"',
            'Campanha DEMO: concorra a uma Smart TV de 50 polegadas. Demonstração da plataforma, sem apuração oficial.',
            'active', 500,
            now() - interval '1 day',
            now() + interval '20 days',
            now() + interval '21 days',
            true
        )
    RETURNING id INTO c_ativa_2;

    INSERT INTO public.campaigns
        (title, description, status, identifier_count, starts_at, ends_at, draw_at, is_demo)
    VALUES
        (
            'Vale-Compras R$ 500',
            'Campanha DEMO com apuração agendada: concorra a um vale-compras de R$ 500. Resultado apenas ilustrativo.',
            'active', 200,
            now() - interval '3 days',
            now() + interval '15 days',
            now() + interval '7 days',
            true
        )
    RETURNING id INTO c_ativa_3;

    INSERT INTO public.campaigns
        (title, description, status, identifier_count, starts_at, ends_at, draw_at, is_demo)
    VALUES
        (
            'Kit Gamer Pro',
            'Campanha DEMO finalizada: kit gamer sorteado entre os participantes de exemplo. Sem valor real.',
            'finished', 50,
            now() - interval '30 days',
            now() - interval '7 days',
            now() - interval '6 days',
            true
        )
    RETURNING id INTO c_finished;

    INSERT INTO public.campaigns
        (title, description, status, identifier_count, starts_at, ends_at, is_demo)
    VALUES
        (
            'Smartphone do Futuro (rascunho)',
            'Campanha DEMO em rascunho: ainda não publicada, visível apenas para administradores.',
            'draft', 1000,
            now(),
            now() + interval '30 days',
            true
        )
    RETURNING id INTO c_draft;

    -- ------------------------------------------------------------------
    -- 3) Regras de cada campanha
    -- ------------------------------------------------------------------
    INSERT INTO public.campaign_rules
        (campaign_id, min_age, max_entries_per_user, terms_url, notes)
    VALUES
        (c_ativa_1,  18, 1, 'https://sorteon.exemplo/termos', 'DEMO: 1 inscrição por participante.'),
        (c_ativa_2,  18, 1, 'https://sorteon.exemplo/termos', 'DEMO: 1 inscrição por participante.'),
        (c_ativa_3,  18, 1, 'https://sorteon.exemplo/termos', 'DEMO: apuração agendada, resultado ilustrativo.'),
        (c_finished, 18, 1, 'https://sorteon.exemplo/termos', 'DEMO: campanha de exemplo já apurada.'),
        (c_draft,    18, 1, NULL,                             'DEMO: rascunho interno.');

    -- ------------------------------------------------------------------
    -- 4) Prêmios de cada campanha
    -- ------------------------------------------------------------------
    INSERT INTO public.prizes (campaign_id, name, description, value, quantity, position)
    VALUES
        (c_ativa_1, 'Fone de Ouvido Bluetooth', 'Fone Bluetooth com cancelamento de ruído (DEMO).', 349.90, 1, 1),
        (c_ativa_2, 'Smart TV 50"', 'Smart TV 50 polegadas 4K (DEMO).', 2799.00, 1, 1),
        (c_ativa_2, 'Soundbar', 'Soundbar para acompanhar a TV (DEMO).', 499.90, 1, 2),
        (c_ativa_3, 'Vale-Compras R$ 500', 'Vale-compras de R$ 500 (DEMO, sem valor real).', 500.00, 1, 1),
        (c_finished, 'Kit Gamer Pro', 'Teclado + mouse + headset gamer (DEMO).', 1299.00, 1, 1),
        (c_finished, 'Mousepad XL', 'Mousepad gamer extra-grande (DEMO).', 129.90, 1, 2),
        (c_draft, 'Smartphone do Futuro', 'Prêmio placeholder do rascunho (DEMO).', NULL, 1, 1);

    -- ID do prêmio principal da campanha finalizada (usado no resultado).
    SELECT id INTO prm_gamer
    FROM public.prizes
    WHERE campaign_id = c_finished AND position = 1;

    -- ------------------------------------------------------------------
    -- 5) Inscrições de exemplo na campanha finalizada (DEMO)
    -- ------------------------------------------------------------------
    INSERT INTO public.entries (campaign_id, profile_id, identifier, payment_status)
    VALUES
        (c_finished, p_ana,   'SORTE-0001', 'confirmado'),
        (c_finished, p_beto,  'SORTE-0002', 'confirmado'),
        (c_finished, p_carla, 'SORTE-0003', 'confirmado');

    -- Algumas inscrições de exemplo também nas campanhas ativas.
    INSERT INTO public.entries (campaign_id, profile_id, identifier, payment_status)
    VALUES
        (c_ativa_1, p_ana,  'SORTE-0101', 'confirmado'),
        (c_ativa_2, p_beto, 'SORTE-0201', 'pendente');

    -- ------------------------------------------------------------------
    -- 6) Sessão de apuração AGENDADA (campanha ativa 3)
    -- ------------------------------------------------------------------
    INSERT INTO public.draw_sessions (campaign_id, status, scheduled_at)
    VALUES (c_ativa_3, 'scheduled', now() + interval '7 days');

    -- ------------------------------------------------------------------
    -- 7) Sessão de apuração CONCLUÍDA + resultado (campanha finalizada)
    -- ------------------------------------------------------------------
    INSERT INTO public.draw_sessions
        (campaign_id, status, scheduled_at, executed_at, seed_hash, total_entries)
    VALUES
        (
            c_finished,
            'completed',
            now() - interval '6 days',
            now() - interval '6 days' + interval '5 minutes',
            'demo-seed-0001-kit-gamer',
            3
        )
    RETURNING id INTO ds_finished;

    INSERT INTO public.draw_results
        (draw_session_id, campaign_id, prize_id, winning_identifier, winner_profile_id, seed_hash, executed_at)
    VALUES
        (
            ds_finished,
            c_finished,
            prm_gamer,
            'SORTE-0002',
            p_beto,
            'demo-seed-0001-kit-gamer',
            now() - interval '6 days' + interval '5 minutes'
        );

    -- ------------------------------------------------------------------
    -- 8) Notificações de boas-vindas (DEMO)
    -- ------------------------------------------------------------------
    INSERT INTO public.notifications (profile_id, title, body)
    VALUES
        (
            p_ana,
            'Bem-vinda à MEGA SORTE! 🎉',
            'Esta é uma plataforma DEMO de campanhas promocionais. Explore as campanhas ativas — sem cobrança e sem apuração oficial.'
        ),
        (
            p_beto,
            'Bem-vindo à MEGA SORTE! 🎉',
            'Esta é uma plataforma DEMO de campanhas promocionais. Explore as campanhas ativas — sem cobrança e sem apuração oficial.'
        ),
        (
            p_carla,
            'Bem-vinda à MEGA SORTE! 🎉',
            'Esta é uma plataforma DEMO de campanhas promocionais. Explore as campanhas ativas — sem cobrança e sem apuração oficial.'
        ),
        (
            p_beto,
            'Você venceu a campanha DEMO "Kit Gamer Pro"! 🏆',
            'Parabéns! Seu identificador SORTE-0002 foi sorteado na campanha de demonstração. Lembre-se: é apenas uma DEMO, sem prêmio real.'
        );

    -- ------------------------------------------------------------------
    -- 9) Log de auditoria do seed (DEMO)
    -- ------------------------------------------------------------------
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, meta)
    VALUES
        (
            NULL,
            'seed_demo',
            'database',
            'schema.sql',
            '{"versao": "1.0", "modo": "DEMO", "campanhas": 5}'::jsonb
        );
END $$;

-- =============================================================================
-- FIM — MEGA SORTE schema.sql
-- =============================================================================
-- Lembretes pós-execução (fora do banco):
-- • Modo DEMO: sem campanhas reais, sem cobrança, sem apuração oficial.
-- • O primeiro usuário administrador deve ser vinculado manualmente:
--     INSERT INTO public.admin_users (profile_id, role)
--     VALUES ('<UUID do profile>', 'admin');
-- • Conferir no Table Editor se as 10 tabelas, os 9 índices, as funções,
--   os triggers e as políticas de RLS foram criados.
-- =============================================================================
