// Página pública da sessão de apuração. Server component (params é Promise no Next 16).
// Busca sessão + resultado + campanha e delega a cerimônia ao client component.

import { notFound } from "next/navigation";

import { ApuracaoClient } from "@/components/apuracao-client";
import { getSession } from "@/lib/auth";
import {
  getCampaign,
  getDrawSession,
  getEntryByIdentifier,
  getPrize,
  getResultBySession,
} from "@/lib/db";

interface ApuracaoPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApuracaoPage({ params }: ApuracaoPageProps) {
  const { id } = await params;
  const [session, authSession] = await Promise.all([getDrawSession(id), getSession()]);

  if (!session) {
    notFound();
  }

  const [result, campaign] = await Promise.all([
    getResultBySession(session.id),
    getCampaign(session.campaign_id),
  ]);

  if (!campaign) {
    notFound();
  }

  // Enriquecimento do comprovante: prêmio (produto + valor) e status de
  // pagamento do identificador vencedor.
  let prize: { name: string; value: number | null } | null = null;
  let winnerPaymentStatus: "pendente" | "confirmado" | null = null;
  if (result) {
    const [p, entry] = await Promise.all([
      result.prize_id ? getPrize(result.prize_id) : Promise.resolve(null),
      getEntryByIdentifier(result.campaign_id, result.winning_identifier),
    ]);
    prize = p ? { name: p.name, value: p.value } : null;
    winnerPaymentStatus = entry?.payment_status ?? null;
  }

  return (
    <ApuracaoClient
      session={session}
      campaign={campaign}
      result={result}
      prize={prize}
      winnerPaymentStatus={winnerPaymentStatus}
      isAdmin={authSession?.isAdmin ?? false}
    />
  );
}
