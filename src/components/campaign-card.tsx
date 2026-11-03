// Card de campanha usado nas listagens públicas.
// Server component (async): busca prêmios e contagem de participações em paralelo.

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { countEntries, getPrizes } from "@/lib/db";
import type { Campaign, CampaignStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface CampaignCardProps {
  campaign: Campaign;
}

export async function CampaignCard({ campaign }: CampaignCardProps) {
  const meta = STATUS_META[campaign.status];
  const [prizes, entries] = await Promise.all([
    getPrizes(campaign.id),
    countEntries(campaign.id),
  ]);
  const mainPrize = prizes[0] ?? null;
  const total = Math.max(campaign.identifier_count, 1);
  const percent = Math.min(100, Math.round((entries / total) * 100));
  const canJoin = campaign.status === "active";

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <Badge variant="outline">DEMO</Badge>
        </div>
        <CardTitle className="text-xl">{campaign.title}</CardTitle>
        <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {mainPrize && (
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/40">
            {mainPrize.image_url && (
              <img
                src={mainPrize.image_url}
                alt={mainPrize.name}
                className="aspect-video w-full object-cover"
              />
            )}
            <div className="p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Prêmio principal
              </p>
              <p className="mt-1 font-semibold text-primary">{mainPrize.name}</p>
              {mainPrize.description && (
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                  {mainPrize.description}
                </p>
              )}
            </div>
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Identificadores</span>
            <span className="font-medium tabular-nums">
              {entries.toLocaleString("pt-BR")} / {campaign.identifier_count.toLocaleString("pt-BR")}
            </span>
          </div>
          <Progress value={percent} ariaLabel={`Progresso de participações: ${percent}%`} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant={canJoin ? "default" : "outline"}
          className={cn("w-full", !canJoin && "text-muted-foreground")}
        >
          <Link href={`/campanhas/${campaign.id}`}>
            {canJoin ? "Participar" : "Ver detalhes"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
