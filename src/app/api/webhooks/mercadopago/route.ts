import { confirmEntryByOrderId } from '@/lib/db';
import { getStatusByPaymentId, isPaymentsConfigured } from '@/lib/payments';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/mercadopago — webhook do Mercado Pago (MEGA SORTE).
 * O MP notifica { type: 'payment', data: { id } }. A rota consulta o
 * pagamento no gateway da Bsmarket e SÓ confirma a participação quando:
 *   - status === 'approved' (verificado na API do MP, nunca no corpo), E
 *   - external_reference começa com 'ms-' (pedidos do MEGA SORTE).
 * Qualquer outro caso é ignorado com 200 (evita tempestade de retries).
 * Idempotente: confirmar duas vezes não duplica nada.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const data = body?.data as Record<string, unknown> | undefined;
  const paymentId =
    (typeof data?.id === 'string' || typeof data?.id === 'number' ? String(data.id) : null) ??
    (typeof body?.id === 'string' || typeof body?.id === 'number' ? String(body.id) : null);

  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return Response.json({ received: true, ignored: 'no_payment_id' });
  }

  if (!isPaymentsConfigured()) {
    return Response.json({ received: true, ignored: 'payments_not_configured' });
  }

  try {
    const payment = await getStatusByPaymentId(paymentId);
    const ref = payment.external_reference ?? '';
    if (payment.status === 'approved' && ref.startsWith('ms-')) {
      const entry = await confirmEntryByOrderId(ref);
      return Response.json({ received: true, confirmed: Boolean(entry), order_id: ref });
    }
    return Response.json({ received: true, ignored: 'not_approved_or_not_ms' });
  } catch (e) {
    console.error('webhook mp error:', e instanceof Error ? e.message : e);
    return Response.json({ received: true, ignored: 'gateway_error' });
  }
}
