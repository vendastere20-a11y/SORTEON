"use client";

// Botão "Simular pagamento" (DEMO): marca a participação do usuário como
// pagamento confirmado via POST /api/payments/simulate. Nenhuma cobrança
// real acontece.

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Entry } from "@/lib/types";

interface SimulatePaymentButtonProps {
  entryId: string;
  onConfirmed?: (entry: Entry) => void;
}

export function SimulatePaymentButton({ entryId, onConfirmed }: SimulatePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: entryId }),
      });
      const data = (await res.json().catch(() => null)) as {
        entry?: Entry;
        error?: string;
      } | null;
      if (!res.ok || !data?.entry) {
        throw new Error(data?.error ?? "Não foi possível simular o pagamento.");
      }
      onConfirmed?.(data.entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="border-primary/40 text-primary hover:bg-primary/10"
      >
        {loading ? "Confirmando..." : "Simular pagamento"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        Demonstração — nenhum valor real é cobrado.
      </p>
    </div>
  );
}
