import { unauthorized } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import {
  confirmEntryPayment,
  generateOrderId,
  getCampaign,
  getEntryById,
  getPrizes,
  setEntryOrderId,
} from '@/lib/db';
import { createPreference, isPaymentsConfigured } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/create — inicia o pagamento da participação.
 * Body: { entry_id }.
 * - Valida dono, campanha e valor do prêmio (definido pelo admin, > 0).
 * - Gera (ou reutiliza) o order_id ms-<ts>-<rand> e salva na entry.
 * - Com gateway configurado: cria a preferência no Mercado Pago e devolve
 *   { init_point } para redirect. Nada é cobrado aqui — só gera o link.
 * - Sem gateway (dev local): simula a confirmação (fallback de demonstração).
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const entryId = typeof body?.entry_id === 'string' ? body.entry_id.trim() : '';
  if (!entryId) {
    return Response.json({ error: 'Informe a participação.' }, { status: 400 });
  }

  const entry = await getEntryById(entryId);
  if (!entry || entry.profile_id !== session.profile.id) {
    return Response.json({ error: 'Participação não encontrada.' }, { status: 404 });
  }
  if (entry.payment_status === 'confirmado') {
    return Response.json({ already: true, entry });
  }

  const campaign = await getCampaign(entry.campaign_id);
  if (!campaign) {
    return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }
  const prizes = await getPrizes(entry.campaign_id);
  const price = prizes[0]?.value ?? null;
  if (price === null || price === undefined || !(price > 0)) {
    return Response.json(
      { error: 'O valor desta campanha ainda não foi definido pelo administrador.' },
      { status: 400 },
    );
  }

  // Fallback de demonstração: sem gateway configurado, simula a confirmação.
  if (!isPaymentsConfigured()) {
    const updated = await confirmEntryPayment(entry.id, session.profile.id);
    return Response.json({ simulated: true, entry: updated });
  }

  const orderId = entry.order_id ?? generateOrderId();
  if (!entry.order_id) {
    await setEntryOrderId(entry.id, session.profile.id, orderId);
  }

  const title = `MEGA SORTE · ${campaign.title} · Nº ${entry.identifier}`.slice(0, 120);
  try {
    const { init_point } = await createPreference({
      email: session.profile.email,
      orderId,
      title,
      unitPrice: price,
    });
    return Response.json({ init_point, order_id: orderId });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'GATEWAY_ERROR';
    if (message === 'PAYMENTS_NOT_CONFIGURED') {
      return Response.json({ error: 'Pagamento em ativação. Tente novamente em instantes.' }, { status: 503 });
    }
    return Response.json(
      { error: 'Não foi possível gerar o pagamento. Tente novamente.' },
      { status: 502 },
    );
  }
}
