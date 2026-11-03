"use client";

// Cerimônia pública da apuração (client component).
// - Se o resultado já existe: estado "revealed" direto.
// - Sessão agendada: contagem regressiva até scheduled_at.
//   - Admin vê o botão "Executar apuração agora" (POST /api/draw/[id]/execute),
//     que roda uma animação ilustrativa de 20s e depois busca o resultado real
//     via GET /api/draw/[id].
//   - Visitante sem resultado vê a mensagem de "ainda não realizada".
// A animação é apenas ilustrativa: o resultado válido é o retornado pela API
// e auditável pelo seed_hash.

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Campaign, DrawResult, DrawSession, PaymentStatus } from "@/lib/types";

type Phase = "countdown" | "animating" | "revealed";

interface PrizeSummary {
  name: string;
  value: number | null;
}

interface ApuracaoClientProps {
  session: DrawSession;
  campaign: Campaign;
  result: DrawResult | null;
  prize: PrizeSummary | null;
  winnerPaymentStatus: PaymentStatus | null;
  isAdmin: boolean;
}

const ANIMATION_MS = 20_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatCountdown(targetIso: string, now: number): string {
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(days)}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function randomIdentifier(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function ApuracaoClient({
  session,
  campaign,
  result,
  prize,
  winnerPaymentStatus,
  isAdmin,
}: ApuracaoClientProps) {
  const [phase, setPhase] = useState<Phase>(result ? "revealed" : "countdown");
  const [revealed, setRevealed] = useState<DrawResult | null>(result);
  const [revealedPrize, setRevealedPrize] = useState<PrizeSummary | null>(prize);
  const [revealedPaymentStatus, setRevealedPaymentStatus] = useState<PaymentStatus | null>(
    winnerPaymentStatus,
  );
  const [now, setNow] = useState<number>(() => Date.now());
  const [spinner, setSpinner] = useState<string>("0000");
  const [animProgress, setAnimProgress] = useState(0);
  const [execError, setExecError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const timers = useRef<number[]>([]);

  // Contagem regressiva (1s).
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Limpa timers da animação ao desmontar.
  useEffect(() => {
    const current = timers.current;
    return () => current.forEach((t) => window.clearTimeout(t));
  }, []);

  const startAnimation = useCallback(() => {
    setPhase("animating");
    setAnimProgress(0);
    // Números girando rápido (ilustrativo).
    const spin = window.setInterval(() => setSpinner(randomIdentifier()), 90);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setAnimProgress(Math.min(100, Math.round((elapsed / ANIMATION_MS) * 100)));
    }, 100);
    timers.current.push(spin, tick);
    const done = window.setTimeout(() => {
      window.clearInterval(spin);
      window.clearInterval(tick);
      void (async () => {
        try {
          const res = await fetch(`/api/draw/${session.id}`, { cache: "no-store" });
          const data = (await res.json().catch(() => null)) as {
            result?: DrawResult;
            prize?: PrizeSummary | null;
            winnerPaymentStatus?: PaymentStatus | null;
          } | null;
          if (!res.ok || !data?.result) {
            throw new Error("RESULT_NOT_FOUND");
          }
          setRevealed(data.result);
          setRevealedPrize(data.prize ?? null);
          setRevealedPaymentStatus(data.winnerPaymentStatus ?? null);
          setPhase("revealed");
        } catch {
          setExecError(
            "A apuração foi executada, mas não foi possível carregar o resultado. Recarregue a página.",
          );
          setPhase("countdown");
        }
      })();
    }, ANIMATION_MS);
    timers.current.push(done);
  }, [session.id]);

  async function handleExecute() {
    setExecError(null);
    setExecuting(true);
    try {
      const res = await fetch(`/api/draw/${session.id}/execute`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const messages: Record<string, string> = {
          ALREADY_EXECUTED: "Esta apuração já foi executada.",
          SESSION_NOT_SCHEDULED: "Esta apuração não está mais agendada.",
          NO_ENTRIES: "Não há participações para apurar.",
        };
        throw new Error(messages[data?.error ?? ""] ?? "Não foi possível executar a apuração.");
      }
      startAnimation();
    } catch (err) {
      setExecError(err instanceof Error ? err.message : "Não foi possível executar a apuração.");
    } finally {
      setExecuting(false);
    }
  }

  const finalResult = revealed;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/40 text-primary">
          DEMONSTRAÇÃO
        </Badge>
        <Badge variant={session.status === "completed" ? "success" : "secondary"}>
          {session.status === "completed" ? "Apurada" : "Agendada"}
        </Badge>
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Apuração</h1>
      <p className="mt-2 text-lg text-muted-foreground">{campaign.title}</p>

      {/* ---------- Contagem regressiva ---------- */}
      {phase === "countdown" && (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Apuração agendada para
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-primary sm:text-4xl">
              {formatCountdown(session.scheduled_at, now)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatDateTime(session.scheduled_at)}
            </p>
            {isAdmin ? (
              <div className="mt-8 space-y-3">
                <Button onClick={handleExecute} disabled={executing} size="lg">
                  {executing ? "Executando..." : "Executar apuração agora"}
                </Button>
                {execError && <p className="text-sm text-destructive">{execError}</p>}
                <p className="text-xs text-muted-foreground">
                  Visível apenas para administradores.
                </p>
              </div>
            ) : (
              <p className="mt-8 rounded-lg border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
                A apuração ainda não foi realizada. Volte em breve.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------- Animação ilustrativa ---------- */}
      {phase === "animating" && (
        <Card className="mt-10 border-primary/40">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Sorteando...</p>
            <p className="mt-4 font-mono text-7xl font-extrabold tracking-widest text-primary tabular-nums">
              {spinner}
            </p>
            <div className="mt-8 w-full max-w-md">
              <Progress value={animProgress} ariaLabel="Progresso da apuração" />
            </div>
            <p className="mt-4 max-w-md text-xs text-muted-foreground">
              Animação ilustrativa. O resultado oficial é gerado pelo servidor e pode ser auditado
              pelo hash publicado no comprovante.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------- Revelação / comprovante ---------- */}
      {phase === "revealed" && finalResult && (
        <Card className="mt-10 border-primary/40">
          <CardHeader className="text-center">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Comprovante de apuração
            </p>
            <CardTitle className="text-2xl">{campaign.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Identificador vencedor</p>
              <p className="mt-2 font-mono text-7xl font-extrabold tracking-widest text-primary">
                {finalResult.winning_identifier}
              </p>
            </div>
            <Separator />
            <dl className="space-y-3 text-sm">
              {revealedPrize && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Prêmio</dt>
                    <dd className="text-right font-semibold text-primary">
                      {revealedPrize.name}
                    </dd>
                  </div>
                  {revealedPrize.value !== null && revealedPrize.value !== undefined && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Valor do prêmio</dt>
                      <dd className="font-semibold">{formatBRL(revealedPrize.value)}</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Data / hora da execução</dt>
                <dd className="font-medium">{formatDateTime(finalResult.executed_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Sessão de apuração</dt>
                <dd className="font-mono text-xs">{finalResult.draw_session_id}</dd>
              </div>
              {revealedPaymentStatus && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Pagamento do vencedor</dt>
                  <dd>
                    <Badge
                      variant={revealedPaymentStatus === "confirmado" ? "success" : "warning"}
                    >
                      {revealedPaymentStatus === "confirmado" ? "Confirmado" : "Pendente"}
                    </Badge>
                  </dd>
                </div>
              )}
              <div>
                <dt className="mb-1 text-muted-foreground">Seed hash (auditável)</dt>
                <dd className="break-all rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {finalResult.seed_hash}
                </dd>
              </div>
            </dl>
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => window.print()}>
                Imprimir comprovante
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              A animação exibida durante a apuração é ilustrativa. O resultado válido é este,
              registrado com hash único e verificável.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
