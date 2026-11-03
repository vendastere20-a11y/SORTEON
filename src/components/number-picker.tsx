"use client";

// Grade de escolha de número da campanha (1..N).
// - Visitante não logado: link para a página de login.
// - Usuário que já participa: mostra o número escolhido + selo de pagamento.
// - Usuário logado sem participação: grade com ocupados/desabilitados,
//   botão de número aleatório e confirmação com o número tocado.
//   A participação nasce com pagamento 'pendente' (demo).

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MercadoPagoPayButton } from "@/components/mercadopago-pay-button";
import { SimulatePaymentButton } from "@/components/simulate-payment-button";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/types";

interface NumberPickerProps {
  campaignId: string;
  identifierCount: number;
  takenNumbers: number[];
  isLoggedIn: boolean;
  myEntry: Entry | null;
  /** true = checkout real via Mercado Pago; false = simulação (dev local). */
  paymentsEnabled: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; entry: Entry }
  | { kind: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE: "Você já está participando desta campanha.",
  NUMBER_TAKEN: "Este número acabou de ser escolhido. Escolha outro.",
  FULL: "Identificadores esgotados.",
};

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

export function PaymentBadge({ status }: { status: Entry["payment_status"] }) {
  return status === "confirmado" ? (
    <Badge variant="success">Pagamento confirmado</Badge>
  ) : (
    <Badge variant="warning">Pagamento pendente</Badge>
  );
}

export function NumberPicker({
  campaignId,
  identifierCount,
  takenNumbers,
  isLoggedIn,
  myEntry,
  paymentsEnabled,
}: NumberPickerProps) {
  const router = useRouter();
  const taken = useMemo(() => new Set(takenNumbers), [takenNumbers]);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<State>(
    myEntry ? { kind: "success", entry: myEntry } : { kind: "idle" },
  );

  const available = useMemo(
    () =>
      Array.from({ length: identifierCount }, (_, i) => i + 1).filter((n) => !taken.has(n)),
    [identifierCount, taken],
  );

  if (!isLoggedIn) {
    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href={`/login?next=${encodeURIComponent(`/campanhas/${campaignId}`)}`}>
          Entrar para escolher seu número
        </Link>
      </Button>
    );
  }

  // Já participa: mostra o número + status do pagamento.
  if (state.kind === "success") {
    const entry = state.entry;
    return (
      <Card className="border-primary/40">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">Seu número nesta campanha</p>
          <p className="font-mono text-6xl font-extrabold tracking-widest text-primary tabular-nums">
            {entry.identifier}
          </p>
          <PaymentBadge status={entry.payment_status} />
          {entry.payment_status === "pendente" ? (
            paymentsEnabled ? (
              <MercadoPagoPayButton entryId={entry.id} size="lg" />
            ) : (
              <SimulatePaymentButton
                entryId={entry.id}
                onConfirmed={(updated) => {
                  setState({ kind: "success", entry: updated });
                  router.refresh();
                }}
              />
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              Guarde este número — ele vale para a apuração desta campanha.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  function pickRandom() {
    if (available.length === 0) return;
    const n = available[Math.floor(Math.random() * available.length)];
    setSelected(n);
    setState({ kind: "idle" });
  }

  async function handleConfirm() {
    if (selected === null) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, numero: selected }),
      });
      const data = (await res.json().catch(() => null)) as {
        entry?: Entry;
        error?: string;
      } | null;

      if (!res.ok || !data?.entry) {
        const code = data?.error ?? "";
        setState({
          kind: "error",
          message:
            ERROR_MESSAGES[code] ??
            "Não foi possível concluir a participação. Tente novamente.",
        });
        return;
      }

      setState({ kind: "success", entry: data.entry });
      router.refresh();
    } catch {
      setState({
        kind: "error",
        message: "Erro de conexão. Verifique sua internet e tente novamente.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Escolha seu número</CardTitle>
        <CardDescription>
          Toque em um número disponível e confirme. Cada participante fica com um número por
          campanha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-primary/60 bg-primary/15" />
            Disponível
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
            Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
            Selecionado
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={pickRandom}>
            🎲 Número aleatório
          </Button>
        </div>

        <div
          className="grid max-h-80 grid-cols-5 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-8 lg:grid-cols-10"
          role="group"
          aria-label="Números disponíveis"
        >
          {Array.from({ length: identifierCount }, (_, i) => i + 1).map((n) => {
            const occupied = taken.has(n);
            const isSelected = selected === n;
            return (
              <button
                key={n}
                type="button"
                disabled={occupied || state.kind === "loading"}
                onClick={() => {
                  setSelected(n);
                  setState({ kind: "idle" });
                }}
                aria-label={occupied ? `Número ${n} ocupado` : `Escolher número ${n}`}
                className={cn(
                  "rounded-md border py-2 font-mono text-sm font-semibold tabular-nums transition-colors",
                  occupied &&
                    "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50",
                  !occupied &&
                    !isSelected &&
                    "border-primary/30 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/15",
                  isSelected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {pad4(n)}
              </button>
            );
          })}
        </div>

        {state.kind === "error" && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Atenção</Badge>
            <p className="text-sm text-destructive">{state.message}</p>
          </div>
        )}

        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleConfirm}
          disabled={selected === null || state.kind === "loading"}
        >
          {state.kind === "loading"
            ? "Registrando..."
            : selected !== null
              ? `Confirmar participação com o número ${pad4(selected)}`
              : "Escolha um número acima"}
        </Button>
      </CardContent>
    </Card>
  );
}
