"use client";

// Botão "Pagar com Mercado Pago": cria a preferência de pagamento no
// servidor (POST /api/payments/create) e redireciona para o checkout
// (init_point). Nada é cobrado nesta etapa — só gera o link seguro.

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Entry } from "@/lib/types";

interface MercadoPagoPayButtonProps {
  entryId: string;
  onPaid?: (entry: Entry) => void;
  size?: "sm" | "lg";
  className?: string;
}

export function MercadoPagoPayButton({
  entryId,
  onPaid,
  size = "sm",
  className,
}: MercadoPagoPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: entryId }),
      });
      const data = (await res.json().catch(() => null)) as {
        init_point?: string;
        simulated?: boolean;
        already?: boolean;
        entry?: Entry;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Não foi possível gerar o pagamento.");
      }
      if (data?.init_point) {
        window.location.assign(data.init_point);
        return;
      }
      // Fallback de demonstração (dev local sem gateway): confirma na hora.
      if (data?.simulated && data?.entry) {
        onPaid?.(data.entry);
        return;
      }
      if (data?.already && data?.entry) {
        onPaid?.(data.entry);
        return;
      }
      throw new Error("Resposta inesperada do servidor.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Gerando pagamento..." : "Pagar com Mercado Pago"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
