import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/admin';
import { getMyEntries, getMyResults, getPrizes, listDrawSessions, listNotifications } from '@/lib/db';
import { isPaymentsConfigured } from '@/lib/payments';
import { formatBRL, formatDateTime } from '@/lib/format';
import type { CampaignStatus, DrawSession, Prize } from '@/lib/types';
import { PaymentCell } from '@/components/painel/payment-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MarkReadButton } from '@/components/painel/mark-read-button';
import { PainelTabs } from '@/components/painel/painel-tabs';

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  finished: 'Encerrada',
  cancelled: 'Cancelada',
};

function statusVariant(status: CampaignStatus): 'success' | 'warning' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'finished':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

export const metadata = {
  title: 'Meu painel | MEGA SORTE',
};

export default async function PainelPage() {
  const session = await requireUser().catch(() => redirect('/login'));
  const profileId = session.profile.id;

  // Buscas independentes em paralelo.
  const [entries, results, notifications, sessions] = await Promise.all([
    getMyEntries(profileId),
    getMyResults(profileId),
    listNotifications(profileId),
    listDrawSessions(),
  ]);

  const activeEntries = entries.filter((e) => e.campaign_status === 'active');
  const unread = notifications.filter((n) => !n.read);
  const paymentsConfigured = isPaymentsConfigured();

  // Mapa campanha -> sessão de apuração mais recente (a lista já vem ordenada).
  const sessionByCampaign = new Map<string, DrawSession>();
  for (const s of sessions) {
    if (!sessionByCampaign.has(s.campaign_id)) sessionByCampaign.set(s.campaign_id, s);
  }

  // Prêmio principal (posição 1) de cada campanha com participação — "Meus números".
  const prizeByCampaign = new Map<string, Prize | null>();
  const campaignIds = [...new Set(entries.map((e) => e.campaign_id))];
  await Promise.all(
    campaignIds.map(async (campaignId) => {
      const prizes = await getPrizes(campaignId);
      prizeByCampaign.set(campaignId, prizes[0] ?? null);
    }),
  );

  const summary = [
    { label: 'Participações ativas', value: activeEntries.length },
    { label: 'Meus identificadores', value: entries.length },
    { label: 'Resultados ganhos', value: results.length },
    { label: 'Notificações não lidas', value: unread.length },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {session.profile.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas participações, resultados e notificações.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PainelTabs
        participacoes={
          entries.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Você ainda não participa de nenhuma campanha.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Meu número</TableHead>
                    <TableHead>Prêmio</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Apuração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const drawSession = sessionByCampaign.get(entry.campaign_id);
                    const prize = prizeByCampaign.get(entry.campaign_id);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.campaign_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono tabular-nums">
                            {entry.identifier}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {prize ? (
                            <>
                              <span className="font-medium">{prize.name}</span>
                              {prize.value !== null && prize.value !== undefined && (
                                <span className="block text-xs font-semibold text-primary">
                                  {formatBRL(prize.value)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PaymentCell entry={entry} paymentsEnabled={paymentsConfigured} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(entry.campaign_status)}>
                            {STATUS_LABELS[entry.campaign_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {drawSession ? (
                            <Button asChild size="sm" variant="link">
                              <Link href={`/apuracao/${drawSession.id}`}>Ver apuração</Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )
        }
        resultados={
          results.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum resultado ganho por enquanto. Boa sorte nas próximas!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((result) => (
                <Card key={result.id} className="border-primary/40">
                  <CardHeader>
                    <CardTitle className="text-lg">{result.campaign_title}</CardTitle>
                    <CardDescription>
                      Sorteio em {formatDateTime(result.executed_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prêmio</span>
                      <span className="font-semibold text-primary">
                        {result.prize_name ?? 'Prêmio'}
                      </span>
                    </div>
                    {result.prize_value !== null && result.prize_value !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valor do prêmio</span>
                        <span className="font-semibold">{formatBRL(result.prize_value)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Identificador sorteado</span>
                      <Badge variant="outline">{result.winning_identifier}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Comprovante (seed)</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.seed_hash.slice(0, 12)}…
                      </span>
                    </div>
                    <div className="pt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/apuracao/${result.draw_session_id}`}>
                          Ver página da apuração
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
        notificacoes={
          notifications.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma notificação.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{notif.title}</p>
                        {!notif.read && (
                          <Badge variant="default" className="text-[10px]">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notif.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read && <MarkReadButton notificationId={notif.id} />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        }
      />
    </div>
  );
}
