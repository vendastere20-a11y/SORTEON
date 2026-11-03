# MEGA SORTE — Sua chance. Seu momento.

Plataforma de campanhas promocionais com site público, cadastro de participantes,
área do usuário, painel administrativo e central de apuração com resultado
auditável.

> **Versão de DEMONSTRAÇÃO.** Nenhuma campanha real, cobrança, venda de
> identificadores ou apuração oficial está ativa. Campanhas reais só serão
> publicadas após validação do enquadramento jurídico e das autorizações
> aplicáveis.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Componentes estilo shadcn/ui feitos à mão (`src/components/ui`)
- Supabase (PostgreSQL + Auth + RLS) — opcional; sem ele o app roda em **modo demo**
- GitHub + Vercel

## Como rodar localmente

```bash
cd sorteon
npm install
npm run dev
# abra http://localhost:3000
```

Build de produção: `npm run build` / `npm run start`.

## Contas demo (modo sem Supabase)

Na tela de login há um box com as credenciais demo:

| Conta                 | Senha    | Papel         |
| --------------------- | -------- | ------------- |
| demo@megasorte.demo   | demo123  | Participante  |
| admin@megasorte.demo  | demo123  | Administrador |

Sem nenhuma variável de ambiente configurada, o app usa um banco em memória
populado com campanhas demo (20/50/100/200/500/1000 identificadores), sessões
de apuração e um resultado de exemplo. Tudo funciona: cadastro, participação,
agendamento e execução de apuração, auditoria.

## Rotas

Públicas: `/` · `/campanhas` · `/campanhas/[id]` · `/resultados` ·
`/apuracao/[id]` · `/login` · `/cadastro`

Participante (login): `/painel`

Admin: `/admin` · `/admin/campanhas` · `/admin/premios` ·
`/admin/participacoes` · `/admin/apuracoes` · `/admin/auditoria` ·
`/admin/usuarios`

API: `/api/auth/*` · `/api/campaigns*` · `/api/prizes*` · `/api/entries` ·
`/api/draw-sessions` · `/api/draw/[id]` · `/api/draw/[id]/execute` ·
`/api/results` · `/api/notifications*` · `/api/admin/*`

## Ligar o Supabase (3 passos)

O app detecta sozinho: se `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` existirem, usa o Supabase; senão, modo demo.

1. **Crie um projeto grátis** em [supabase.com](https://supabase.com) (2 minutos).
2. **Rode o schema**: abra o SQL Editor do projeto, cole o conteúdo de
   `supabase/schema.sql` e execute. Ele cria as 10 tabelas
   (`profiles`, `campaigns`, `campaign_rules`, `entries`, `prizes`,
   `draw_sessions`, `draw_results`, `notifications`, `audit_logs`,
   `admin_users`), índices, relacionamentos, políticas RLS, triggers e dados
   demo. Depois vincule seu usuário como admin:
   ```sql
   INSERT INTO public.admin_users (profile_id, role)
   VALUES ('<uuid-do-seu-usuario>', 'admin');
   ```
3. **Configure as variáveis** no projeto da Vercel (Settings → Environment
   Variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   (somente server-side) `SUPABASE_SERVICE_ROLE_KEY`. Faça novo deploy.

## Pagamentos (Mercado Pago via gateway da Bsmarket)

O `MP_ACCESS_TOKEN` é criptografado na Vercel e **não pode ser copiado**
entre projetos. Por isso o MEGA SORTE não guarda o token: o projeto
`bsmarket` expõe o gateway `POST/GET /api/mp-gateway`, que roda onde o
token descriptografa em runtime.

- **Fluxo**: participante escolhe o número → clica em "Pagar com Mercado
  Pago" → `POST /api/payments/create` gera `order_id` (`ms-<ts>-<rand>`),
  salva na participação e chama o gateway com o `MS_GATEWAY_SECRET`
  (server-side, nunca no browser) → redirect ao `init_point` do MP →
  retorno em `/pagamento` → webhook `POST /api/webhooks/mercadopago`
  confirma automaticamente (`payment_status = 'confirmado'` + audit log).
- **Preço**: valor do prêmio (posição 1) definido pelo admin em
  `/admin/premios`. Sem valor > 0, o pagamento não é gerado.
- **Env vars** (produção, tipo `sensitive`):
  - `MS_GATEWAY_SECRET` no projeto `bsmarket` (o gateway valida) e no
    projeto `sorteon` (o client assina as chamadas).
- **Segurança**: o webhook só confia em `status === 'approved'` verificado
  na API do MP + `external_reference` com prefixo `ms-`. Idempotente.
- **Dev local**: sem `MS_GATEWAY_SECRET`, a UI mostra "Simular pagamento"
  (fallback de demonstração, sem cobrança).

> Sem validação jurídica/técnica, não ligar cobrança em campanhas reais.

## Segurança

- `service_role` só em API routes server-side; nunca exposta no navegador.
- Rotas `/painel` e `/admin` protegidas (proxy + checagem de papel no servidor).
- 1 inscrição por participante por campanha (constraint única + validação).
- Apuração: sorteio com `crypto` no servidor, `seed_hash` SHA-256, resultado
  gravado **uma única vez** (sem UPDATE/DELETE — nem política RLS existe).
- Auditoria registra ações administrativas.
- Todos os campos de senha têm botão mostrar/ocultar.

## Estrutura

```
src/
  app/            páginas + API routes (inclui /pagamento,
                  /api/payments/* e /api/webhooks/mercadopago)
  components/     ui/ (shadcn-style) + site + admin + painel
  lib/            types, db (adapter demo/Supabase), auth, admin,
                  demo-data, supabase, utils, format,
                  payments (client do gateway MP da Bsmarket)
supabase/
  schema.sql      banco completo pronto para o SQL Editor
```
