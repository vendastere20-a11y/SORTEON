// Lista pública de campanhas com filtro por status.
// Server component; searchParams é Promise no Next 16.

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/campaign-card";
import { listCampaigns } from "@/lib/db";
import type { CampaignStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "todas" | "ativas" | "finalizadas";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "ativas", label: "Ativas" },
  { key: "finalizadas", label: "Finalizadas" },
];

function resolveFilter(status: string | undefined): { key: StatusFilter; db: CampaignStatus | undefined } {
  if (status === "ativas") return { key: "ativas", db: "active" };
  if (status === "finalizadas") return { key: "finalizadas", db: "finished" };
  return { key: "todas", db: undefined };
}

interface CampanhasPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function CampanhasPage({ searchParams }: CampanhasPageProps) {
  const params = await searchParams;
  const filter = resolveFilter(params.status);
  const campaigns = await listCampaigns(filter.db ? { status: filter.db } : undefined);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Campanhas</h1>
      <p className="mt-2 text-muted-foreground">
        Explore as campanhas de demonstração disponíveis na plataforma.
      </p>

      {/* Filtro por status (links com searchParams) */}
      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter.key === f.key;
          const href = f.key === "todas" ? "/campanhas" : `/campanhas?status=${f.key}`;
          return (
            <Button key={f.key} asChild variant={active ? "default" : "outline"} size="sm">
              <Link href={href} aria-current={active ? "page" : undefined}>
                {f.label}
              </Link>
            </Button>
          );
        })}
      </div>

      {campaigns.length > 0 ? (
        <div className={cn("mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3")}>
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <p className="mt-12 rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
          Nenhuma campanha encontrada para este filtro.
        </p>
      )}
    </main>
  );
}
