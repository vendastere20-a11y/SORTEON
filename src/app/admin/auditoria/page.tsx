import { listAuditLogs } from '@/lib/db';
import { formatDateTime, truncateMiddle } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata = {
  title: 'Auditoria | Admin MEGA SORTE',
};

/** Trunca o JSON do meta para caber na tabela. */
function metaPreview(meta: Record<string, unknown> | null): string {
  if (!meta) return '—';
  const json = JSON.stringify(meta);
  return json.length > 60 ? `${json.slice(0, 60)}…` : json;
}

export default async function AdminAuditoriaPage() {
  // O guard requireAdmin() roda no layout pai (src/app/admin/layout.tsx).
  const logs = await listAuditLogs(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Registro imutável das ações realizadas na plataforma.
          </p>
        </div>
        <Badge variant="secondary">{logs.length} eventos</Badge>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum evento registrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID da entidade</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">{log.entity}</TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={log.entity_id ?? undefined}
                    >
                      {truncateMiddle(log.entity_id, 12)}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={log.actor_id ?? undefined}
                    >
                      {truncateMiddle(log.actor_id, 12)}
                    </TableCell>
                    <TableCell className="max-w-xs font-mono text-xs text-muted-foreground">
                      {metaPreview(log.meta)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
