import { PagamentoClient } from "@/components/pagamento-client";

export const metadata = {
  title: "Pagamento | MEGA SORTE",
};

/**
 * Retorno do checkout do Mercado Pago.
 * O MP redireciona para cá com ?status=aprovado|falhou|pendente&pedido=<order_id>.
 * A confirmação oficial chega pelo webhook; esta página consulta o status
 * até confirmar (ou orienta a aguardar).
 */
export default async function PagamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pedido?: string }>;
}) {
  const { status, pedido } = await searchParams;
  return <PagamentoClient mpStatus={status ?? null} orderId={pedido ?? null} />;
}
