// Cliente do gateway de pagamentos do MEGA SORTE.
//
// ARQUITETURA: o MP_ACCESS_TOKEN da Bsmarket é criptografado na Vercel e a
// API da Vercel não devolve o valor em texto — por isso ele NÃO pode ser
// copiado para este projeto. O projeto `bsmarket` expõe o gateway
// POST/GET https://bsmarket.vercel.app/api/mp-gateway, que roda onde o
// token descriptografa em runtime. Este módulo é o client desse gateway.
//
// SEGURANÇA:
// - MS_GATEWAY_SECRET é env var server-only (nunca NEXT_PUBLIC_*). Todas
//   as funções daqui rodam no servidor (API routes / Server Components).
// - O browser nunca fala com o gateway: ele recebe apenas o init_point.
// - Sem MS_GATEWAY_SECRET configurado (dev local), o app opera em modo
//   simulado: isPaymentsConfigured() === false e a UI mostra "Simular
//   pagamento" em vez do checkout real.

import "server-only";

const GATEWAY_URL = "https://bsmarket.vercel.app/api/mp-gateway";

/** true quando o secret do gateway está configurado (produção). */
export function isPaymentsConfigured(): boolean {
  return Boolean(process.env.MS_GATEWAY_SECRET);
}

function getSecret(): string {
  const secret = process.env.MS_GATEWAY_SECRET;
  if (!secret) throw new Error("PAYMENTS_NOT_CONFIGURED");
  return secret;
}

export interface CreatePreferenceInput {
  email: string;
  orderId: string;
  /** Título exibido no checkout (1..120 chars). */
  title: string;
  /** Valor em R$ (>0, ≤100000). */
  unitPrice: number;
}

export interface GatewayPaymentStatus {
  status: string;
  external_reference: string | null;
  payment_id: string | null;
}

/**
 * Cria uma preferência de pagamento no Mercado Pago via gateway da Bsmarket.
 * Retorna o init_point (URL do checkout) — seguro, não cobra nada sozinho.
 */
export async function createPreference(
  input: CreatePreferenceInput,
): Promise<{ init_point: string; order_id: string }> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_preference_ms",
      email: input.email,
      order_id: input.orderId,
      title: input.title,
      unit_price: input.unitPrice,
      secret: getSecret(),
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    init_point?: string;
    order_id?: string;
    error?: string;
  } | null;
  if (!res.ok || !data?.init_point) {
    throw new Error(data?.error ?? "GATEWAY_ERROR");
  }
  return { init_point: data.init_point, order_id: data.order_id ?? input.orderId };
}

/** Consulta o status de um pagamento pelo order_id (external_reference ms-...). */
export async function getStatusByExternalReference(
  orderId: string,
): Promise<GatewayPaymentStatus> {
  const url = `${GATEWAY_URL}?action=status&external_reference=${encodeURIComponent(orderId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as GatewayPaymentStatus | null;
  if (!res.ok || !data) throw new Error("GATEWAY_ERROR");
  return data;
}

/** Consulta o status de um pagamento pelo payment_id do Mercado Pago. */
export async function getStatusByPaymentId(paymentId: string): Promise<GatewayPaymentStatus> {
  const url = `${GATEWAY_URL}?action=status&payment_id=${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as GatewayPaymentStatus | null;
  if (!res.ok || !data) throw new Error("GATEWAY_ERROR");
  return data;
}
