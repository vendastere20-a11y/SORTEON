import { getDrawSession, getEntryByIdentifier, getPrize, getResultBySession } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;

  const session = await getDrawSession(id);
  if (!session) {
    return Response.json({ error: 'Sessão de sorteio não encontrada.' }, { status: 404 });
  }

  const result = await getResultBySession(id);

  // Enriquecimento do comprovante: prêmio (produto + valor) e status de
  // pagamento do identificador vencedor.
  let prize: { name: string; value: number | null } | null = null;
  let winnerPaymentStatus: 'pendente' | 'confirmado' | null = null;
  if (result) {
    if (result.prize_id) {
      const p = await getPrize(result.prize_id);
      prize = p ? { name: p.name, value: p.value } : null;
    }
    const entry = await getEntryByIdentifier(result.campaign_id, result.winning_identifier);
    winnerPaymentStatus = entry?.payment_status ?? null;
  }

  return Response.json({ session, result, prize, winnerPaymentStatus });
}
