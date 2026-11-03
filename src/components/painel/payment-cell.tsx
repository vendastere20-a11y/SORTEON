"use client";

// Célula de status de pagamento na tabela de participações do painel.
// Mostra o selo Pendente/Confirmado e, se pendente, o botão de pagamento
// (Mercado Pago em produção; simulação apenas em dev local sem gateway).

import { useRouter } from "next/navigation";

import { MercadoPagoPayButton } from "@/components/mercadopago-pay-button";
import { PaymentBadge } from "@/components/number-picker";
import { SimulatePaymentButton } from "@/components/simulate-payment-button";
import type { Entry } from "@/lib/types";

export function PaymentCell({
  entry,
  paymentsEnabled,
}: {
  entry: Entry;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();

  if (entry.payment_status === "confirmado") {
    return <PaymentBadge status="confirmado" />;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <PaymentBadge status="pendente" />
      {paymentsEnabled ? (
        <MercadoPagoPayButton entryId={entry.id} />
      ) : (
        <SimulatePaymentButton
          entryId={entry.id}
          onConfirmed={() => router.refresh()}
        />
      )}
    </div>
  );
}
