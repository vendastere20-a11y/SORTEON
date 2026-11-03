import { unauthorized } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { confirmEntryPayment } from '@/lib/db';
import { isPaymentsConfigured } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/simulate — fallback de DEMONSTRAÇÃO (dev local).
 * Só funciona quando o gateway real NÃO está configurado. Em produção,
 * o pagamento é real via Mercado Pago — esta rota responde 403.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  if (isPaymentsConfigured()) {
    return Response.json(
      { error: 'Use o checkout do Mercado Pago para confirmar o pagamento.' },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const entryId = typeof body?.entry_id === 'string' ? body.entry_id.trim() : '';

  if (!entryId) {
    return Response.json({ error: 'Informe a participação.' }, { status: 400 });
  }

  try {
    const entry = await confirmEntryPayment(entryId, session.profile.id);
    return Response.json({ entry, simulated: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'ENTRY_NOT_FOUND') {
      return Response.json({ error: 'Participação não encontrada.' }, { status: 404 });
    }
    throw e;
  }
}
