'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Campaign, DrawSession, DrawStatus } from '@/lib/types';
import { formatDateTime, truncateMiddle } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_LABELS: Record<DrawStatus, string> = {
  scheduled: 'Agendada',
  running: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

function statusVariant(status: DrawStatus): 'default' | 'warning' | 'success' | 'destructive' {
  switch (status) {
    case 'scheduled':
      return 'default';
    case 'running':
      return 'warning';
    case 'completed':
      return 'success';
    default:
      return 'destructive';
  }
}

/**
 * Gerencia sessões de apuração:
 * - formulário "Agendar apuração" -> POST /api/draw-sessions
 * - tabela de sessões com botão "Executar" (só quando agendada) -> POST /api/draw/[id]/execute
 * - link para a página pública da apuração (/apuracao/[id])
 */
export function DrawSessionManager({
  sessions,
  campaigns,
}: {
  sessions: DrawSession[];
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  async function handleSchedule(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!campaignId) {
      setError('Selecione uma campanha.');
      return;
    }
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      setError('Informe uma data e hora válidas para o agendamento.');
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch('/api/draw-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, scheduled_at: date.toISOString() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'Falha ao agendar a apuração.');
      }
      setScheduledAt('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setScheduling(false);
    }
  }

  async function handleExecute(session: DrawSession): Promise<void> {
    const confirmed = window.confirm(
      `Executar a apuração da campanha "${campaignById.get(session.campaign_id)?.title ?? ''}" agora?\n\nO sorteio é aleatório e auditável, e não pode ser desfeito.`,
    );
    if (!confirmed) return;
    setExecutingId(session.id);
    setError(null);
    try {
      const res = await fetch(`/api/draw/${session.id}/execute`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'Falha ao executar a apuração.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de agendamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agendar apuração</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSchedule} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="w-full space-y-2 md:max-w-sm">
              <Label htmlFor="draw-campaign">Campanha</Label>
              <Select
                id="draw-campaign"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="draw-scheduled-at">Agendada para</Label>
              <Input
                id="draw-scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={scheduling}>
              {scheduling ? 'Agendando…' : 'Agendar'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Tabela de sessões */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma apuração agendada.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Agendada para</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executada em</TableHead>
                <TableHead>Comprovante (seed)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {campaignById.get(session.campaign_id)?.title ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(session.scheduled_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(session.status)}>
                      {STATUS_LABELS[session.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(session.executed_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncateMiddle(session.seed_hash, 12)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {session.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => handleExecute(session)}
                          disabled={executingId === session.id}
                        >
                          {executingId === session.id ? 'Executando…' : 'Executar'}
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/apuracao/${session.id}`}>Ver página pública</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
