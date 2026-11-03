import { listCampaigns, listEntries } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
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
import { CampaignQuerySelect } from '@/components/admin/campaign-query-select';

export const metadata = {
  title: 'Participações | Admin MEGA SORTE',
};

/**
 * No Next 16, searchParams é uma Promise.
 * Lê ?campaign_id= (ou usa a primeira campanha) e lista as participações no servidor.
 */
export default async function AdminParticipacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string }>;
}) {
  const { campaign_id } = await searchParams;
  const campaigns = await listCampaigns();

  const selectedCampaignId = campaign_id ?? campaigns[0]?.id ?? null;
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const entries = selectedCampaignId ? await listEntries(selectedCampaignId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Participações</h1>
        <p className="text-sm text-muted-foreground">
          Veja quem participa de cada campanha e quais identificadores foram distribuídos.
        </p>
      </div>

      <CampaignQuerySelect
        campaigns={campaigns}
        basePath="/admin/participacoes"
        currentId={selectedCampaignId}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCampaign ? (
            <>
              Campanha <span className="font-medium text-foreground">{selectedCampaign.title}</span>
            </>
          ) : (
            'Nenhuma campanha selecionada.'
          )}
        </p>
        <Badge variant="secondary">
          {entries.length} {entries.length === 1 ? 'participação' : 'participações'}
        </Badge>
      </div>

      {!selectedCampaign ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma campanha cadastrada.
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma participação nesta campanha ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="outline">{entry.identifier}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.profile_name}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.profile_email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(entry.created_at)}
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
