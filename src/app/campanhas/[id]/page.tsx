// Detalhe público de uma campanha. Server component (params é Promise no Next 16).

import { notFound } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { NumberPicker } from "@/components/number-picker";
import { getSession } from "@/lib/auth";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  countEntries,
  getCampaign,
  getMyEntry,
  getPrizes,
  getRules,
  getTakenNumbers,
} from "@/lib/db";
import { formatBRL } from "@/lib/format";
import type { CampaignStatus } from "@/lib/types";

const STATUS_META: Record<
  CampaignStatus,
  { label: string; variant: "success" | "secondary" | "warning" | "outline" | "destructive" }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativa", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  finished: { label: "Finalizada", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const [campaign, session] = await Promise.all([getCampaign(id), getSession()]);

  if (!campaign) {
    notFound();
  }

  const meta = STATUS_META[campaign.status];
  const profileId = session?.profile.id ?? null;
  const [prizes, rules, entries, takenNumbers, myEntry] = await Promise.all([
    getPrizes(campaign.id),
    getRules(campaign.id),
    countEntries(campaign.id),
    getTakenNumbers(campaign.id),
    profileId ? getMyEntry(campaign.id, profileId) : Promise.resolve(null),
  ]);
  const total = Math.max(campaign.identifier_count, 1);
  const percent = Math.min(100, Math.round((entries / total) * 100));
  const remaining = Math.max(campaign.identifier_count - entries, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/campanhas">Voltar para campanhas</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/40 text-primary">
          DEMONSTRAÇÃO
        </Badge>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">{campaign.title}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{campaign.description}</p>

      {/* Progresso */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Identificadores</CardTitle>
          <CardDescription>
            {remaining > 0
              ? `${remaining.toLocaleString("pt-BR")} identificadores ainda disponíveis`
              : "Todos os identificadores foram distribuídos"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Distribuídos</span>
            <span className="font-medium tabular-nums">
              {entries.toLocaleString("pt-BR")} / {campaign.identifier_count.toLocaleString("pt-BR")}
            </span>
          </div>
          <Progress value={percent} ariaLabel={`Progresso de identificadores: ${percent}%`} />
        </CardContent>
      </Card>

      {/* Prêmios */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Prêmios</h2>
        {prizes.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {prizes.map((prize, i) => (
              <Card key={prize.id}>
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">
                    {i + 1}º prêmio
                  </Badge>
                  <CardTitle className="text-lg text-primary">{prize.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{prize.description}</p>
                  {prize.value !== null && prize.value !== undefined && (
                    <p className="mt-2 text-sm">
                      Valor:{" "}
                      <strong className="text-primary">{formatBRL(prize.value)}</strong>
                    </p>
                  )}
                  {prize.quantity > 1 && (
                    <p className="mt-2 text-sm">
                      Quantidade: <strong>{prize.quantity}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">Prêmios a serem divulgados.</p>
        )}
      </section>

      {/* Regras */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Regras</h2>
        <Card className="mt-4">
          <CardContent className="space-y-3 pt-6">
            {rules ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Idade mínima</span>
                  <strong>{rules.min_age} anos</strong>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Limite por participante</span>
                  <strong>
                    {rules.max_entries_per_user}{" "}
                    {rules.max_entries_per_user === 1 ? "participação" : "participações"}
                  </strong>
                </div>
                {rules.notes && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">{rules.notes}</p>
                  </>
                )}
                {rules.terms_url && (
                  <>
                    <Separator />
                    <a
                      href={rules.terms_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ler o regulamento completo
                    </a>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Regulamento a ser divulgado.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Datas */}
      <section className="mt-10">
        <h2 className="text-2xl font-bold tracking-tight">Datas</h2>
        <Card className="mt-4">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Início das participações</span>
              <strong>{formatDateTime(campaign.starts_at)}</strong>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Encerramento das participações</span>
              <strong>{formatDateTime(campaign.ends_at)}</strong>
            </div>
            {campaign.draw_at && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Apuração prevista</span>
                  <strong>{formatDateTime(campaign.draw_at)}</strong>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Participação — o participante escolhe o próprio número */}
      <section className="mt-10">
        {campaign.status === "active" ? (
          <NumberPicker
            campaignId={campaign.id}
            identifierCount={campaign.identifier_count}
            takenNumbers={takenNumbers}
            isLoggedIn={session !== null}
            myEntry={myEntry}
            paymentsEnabled={isPaymentsConfigured()}
          />
        ) : (
          <p className="rounded-lg border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Esta campanha não está aceitando participações no momento (status: {meta.label}).
          </p>
        )}
      </section>
    </main>
  );
}
