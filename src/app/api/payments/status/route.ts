import { unauthorized } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { confirmEntryByOrderId, getEntryByOrderId } from '@/lib/db';
import { getStatusByExternalReference, isPaymentsConfigured } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/status?order_id=ms-...
 * Devolve o status de pagamento da participação do próprio usuário.
 * Se o gateway já aprovou mas o webhook ainda não processou, confirma aqui
 * também (cinto e suspensórios — idempotente).
 */
export async function GET(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id') ?? '';
  if (!/^ms-\d+-[a-z0-9]{4,12}$/.test(orderId)) {
    return Response.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const entry = await getEntryByOrderId(orderId);
  if (!entry || entry.profile_id !== session.profile.id) {
    return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  let gatewayStatus: string | null = null;
  if (entry.payment_status !== 'confirmado' && isPaymentsConfigured()) {
    try {
      const g = await getStatusByExternalReference(orderId);
      gatewayStatus = g.status;
      if (g.status === 'approved') {
        const updated = await confirmEntryByOrderId(orderId);
        return Response.json({
          payment_status: updated?.payment_status ?? 'confirmado',
          gateway_status: gatewayStatus,
          order_id: orderId,
        });
      }
    } catch {
      gatewayStatus = 'error';
    }
  }

  return Response.json({
    payment_status: entry.payment_status,
    gateway_status: gatewayStatus,
    order_id: orderId,
  });
}
