import {
  countEntries,
  listAuditLogs,
  listCampaigns,
  listDrawSessions,
  listResults,
} from '@/lib/db';
import { formatDateTime } from '@/lib/format';
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

export const metadata = {
  title: 'Dashboard | Admin MEGA SORTE',
};

export default async function AdminDashboardPage() {
  // O guard requireAdmin() roda no layout pai (src/app/admin/layout.tsx).
  const [campaigns, sessions, results, auditLogs] = await Promise.all([
    listCampaigns(),
    listDrawSessions(),
    listResults(),
    listAuditLogs(5),
  ]);

  // Soma o total de participações de todas as campanhas.
  const entryCounts = await Promise.all(campaigns.map((c) => countEntries(c.id)));
  const totalEntries = entryCounts.reduce((sum, n) => sum + n, 0);

  const cards = [
    { label: 'Campanhas ativas', value: campaigns.filter((c) => c.status === 'active').length },
    { label: 'Total de participações', value: totalEntries },
    {
      label: 'Apurações agendadas',
      value: sessions.filter((s) => s.status === 'scheduled').length,
    },
    { label: 'Resultados publicados', value: results.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da plataforma MEGA SORTE.
        </p>
      </div>

      {/* Alerta: ambiente demo */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ambiente de demonstração</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Todas as campanhas desta plataforma são DEMO: não há campanhas reais, pagamentos de
          participação nem apurações oficiais. Nada aqui gera efeito jurídico ou financeiro.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((item) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Últimos eventos de auditoria</CardTitle>
          <CardDescription>As 5 ações mais recentes registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum evento registrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">{log.entity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
