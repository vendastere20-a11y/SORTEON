"use client";

// Página de retorno do Mercado Pago.
// Consulta GET /api/payments/status?order_id= a cada 3s até o pagamento
// ser confirmado (o webhook confirma de forma assíncrona).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Phase = "loading" | "confirmed" | "pending" | "failed" | "error";

const MAX_POLLS = 40;

export function PagamentoClient({
  mpStatus,
  orderId,
}: {
  mpStatus: string | null;
  orderId: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const polls = useRef(0);

  useEffect(() => {
    if (!orderId) {
      setPhase("error");
      return;
    }
    let cancelled = false;
    const timer = window.setInterval(async () => {
      polls.current += 1;
      try {
        const res = await fetch(`/api/payments/status?order_id=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          payment_status?: string;
        } | null;
        if (cancelled) return;
        if (data?.payment_status === "confirmado") {
          window.clearInterval(timer);
          setPhase("confirmed");
          return;
        }
      } catch {
        // mantém tentando até o limite
      }
      if (polls.current >= MAX_POLLS && !cancelled) {
        window.clearInterval(timer);
        setPhase(mpStatus === "falhou" ? "failed" : "pending");
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, mpStatus]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card className="border-primary/40">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {phase === "loading" && (
            <>
              <p className="text-muted-foreground">Verificando a confirmação do pagamento…</p>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </>
          )}
          {phase === "confirmed" && (
            <>
              <Badge variant="success" className="text-sm">Pagamento confirmado</Badge>
              <p className="text-muted-foreground">
                Sua participação está confirmada. Boa sorte na apuração!
              </p>
              <Button asChild>
                <Link href="/painel">Ver meus números</Link>
              </Button>
            </>
          )}
          {phase === "pending" && (
            <>
              <Badge variant="warning" className="text-sm">Pagamento pendente</Badge>
              <p className="text-sm text-muted-foreground">
                Ainda não recebemos a confirmação. Ela costuma chegar em alguns minutos —
                acompanhe em “Meus números”.
              </p>
              <Button asChild variant="outline">
                <Link href="/painel">Ir para o painel</Link>
              </Button>
            </>
          )}
          {phase === "failed" && (
            <>
              <Badge variant="destructive" className="text-sm">Pagamento não concluído</Badge>
              <p className="text-sm text-muted-foreground">
                O pagamento não foi aprovado. Você pode tentar novamente na página da campanha.
              </p>
              <Button asChild variant="outline">
                <Link href="/campanhas">Ver campanhas</Link>
              </Button>
            </>
          )}
          {phase === "error" && (
            <p className="text-sm text-destructive">
              Pedido inválido. Volte à página da campanha e tente novamente.
            </p>
          )}
          {orderId && (
            <p className="font-mono text-xs text-muted-foreground">Pedido {orderId}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
