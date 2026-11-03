// Home da plataforma. Server component.

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampaignCard } from "@/components/campaign-card";
import { listCampaigns, listResults } from "@/lib/db";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Crie sua conta",
    description: "Cadastre-se grátis em menos de um minuto. Suas informações ficam protegidas.",
  },
  {
    title: "Escolha uma campanha",
    description: "Explore as campanhas ativas e veja os prêmios, regras e datas de apuração.",
  },
  {
    title: "Garanta seu identificador",
    description: "Ao participar, você recebe um identificador único válido para a apuração.",
  },
  {
    title: "Acompanhe o resultado",
    description: "O resultado é publicado com hash auditável e comprovante imprimível.",
  },
] as const;

const FAQ = [
  {
    q: "O que é a MEGA SORTE?",
    a: "É uma plataforma de demonstração para campanhas promocionais: você participa, recebe um identificador e acompanha a apuração de forma transparente, com comprovante auditável.",
  },
  {
    q: "Preciso pagar para participar?",
    a: "Não. Esta é uma versão demo: não há campanhas reais, nem venda de números, nem cobrança de participação.",
  },
  {
    q: "Como funciona a apuração?",
    a: "Na data agendada, o sistema sorteia um identificador entre os participantes usando geração aleatória criptográfica e publica um hash único (seed_hash) que garante a integridade do resultado.",
  },
  {
    q: "Posso participar de várias campanhas?",
    a: "Sim. Cada campanha tem seu próprio regulamento, incluindo o limite de participações por pessoa.",
  },
  {
    q: "Onde vejo meus identificadores?",
    a: "Após fazer login, acesse o seu painel de participante: lá estão suas participações, seus identificadores e os seus resultados.",
  },
] as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const [activeCampaigns, results] = await Promise.all([
    listCampaigns({ status: "active" }),
    listResults(),
  ]);
  const latestResults = results.slice(0, 3);

  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-faint absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-24 text-center sm:pt-32">
          <Badge variant="outline" className="mb-6 border-primary/40 text-primary">
            DEMONSTRAÇÃO
          </Badge>
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl">
            SUA CHANCE.{" "}
            <span className="bg-gradient-to-r from-primary via-amber-200 to-primary bg-clip-text text-transparent">
              SEU MOMENTO.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Participe de campanhas promocionais demo, receba seu identificador e acompanhe cada
            apuração com transparência total e resultado auditável.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/campanhas">Ver campanhas</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#como-funciona">Como funciona</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Campanhas ativas ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Campanhas ativas</h2>
            <p className="mt-2 text-muted-foreground">
              Escolha uma campanha e garanta seu identificador.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/campanhas">Ver todas</Link>
          </Button>
        </div>
        {activeCampaigns.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeCampaigns.slice(0, 6).map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma campanha ativa no momento. Volte em breve.
            </CardContent>
          </Card>
        )}
      </section>

      {/* ---------- Como funciona ---------- */}
      <section id="como-funciona" className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
          <p className="mt-2 text-muted-foreground">Do cadastro ao resultado em quatro passos.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card key={step.title}>
                <CardHeader>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                    {i + 1}
                  </span>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Últimos resultados ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Últimos resultados</h2>
            <p className="mt-2 text-muted-foreground">
              Apurações concluídas, com comprovante auditável.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/resultados">Ver todos</Link>
          </Button>
        </div>
        {latestResults.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestResults.map((result) => (
              <Card key={result.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{result.campaign_title}</CardTitle>
                  <CardDescription>
                    {result.prize_name ?? "Prêmio da campanha"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Identificador vencedor</p>
                  <p className="text-4xl font-extrabold tracking-widest text-primary">
                    {result.winning_identifier}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(result.executed_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ainda não há resultados publicados.
            </CardContent>
          </Card>
        )}
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-border bg-background px-5 py-4 open:border-primary/40"
              >
                <summary
                  className={cn(
                    "cursor-pointer list-none font-medium",
                    "flex items-center justify-between gap-4",
                    "marker:hidden [&::-webkit-details-marker]:hidden",
                  )}
                >
                  {item.q}
                  <span
                    className="shrink-0 text-xl text-primary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA final ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Card className="relative overflow-hidden border-primary/30">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,173,81,0.12),transparent_70%)]"
            aria-hidden="true"
          />
          <CardContent className="relative flex flex-col items-center px-6 py-14 text-center">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Pronto para tentar a sua sorte?
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Crie sua conta gratuita e participe das campanhas de demonstração em segundos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cadastro">Criar conta grátis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Entrar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
