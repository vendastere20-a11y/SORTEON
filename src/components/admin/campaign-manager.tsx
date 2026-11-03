'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignStatus } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CampaignForm } from '@/components/admin/campaign-form';

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

type DialogState = { mode: 'create' } | { mode: 'edit'; campaign: Campaign } | null;

/**
 * Tabela de campanhas com criar/editar (Dialog + CampaignForm) e excluir
 * (confirmação via window.confirm -> DELETE /api/campaigns/[id]).
 * `counts` é um mapa campanha_id -> participações, calculado no servidor.
 */
export function CampaignManager({
  campaigns,
  counts,
}: {
  campaigns: Campaign[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function closeAndRefresh(): void {
    setDialog(null);
    router.refresh();
  }

  async function handleDelete(campaign: Campaign): Promise<void> {
    const confirmed = window.confirm(
      `Excluir a campanha "${campaign.title}"?\n\nIsso remove também prêmios, participações e apurações vinculadas.`,
    );
    if (!confirmed) return;
    setDeletingId(campaign.id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'Falha ao excluir a campanha.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} {campaigns.length === 1 ? 'campanha' : 'campanhas'}
        </p>
        <Button onClick={() => setDialog({ mode: 'create' })}>Nova campanha</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma campanha cadastrada. Clique em "Nova campanha" para começar.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Identificadores</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{campaign.title}</span>
                      {campaign.is_demo && (
                        <Badge variant="warning" className="text-[10px]">
                          DEMO
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(campaign.status)}>
                      {STATUS_LABELS[campaign.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {counts[campaign.id] ?? 0}/{campaign.identifier_count}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(campaign.starts_at)} — {formatDateTime(campaign.ends_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialog({ mode: 'edit', campaign })}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(campaign)}
                        disabled={deletingId === campaign.id}
                      >
                        {deletingId === campaign.id ? 'Excluindo…' : 'Excluir'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'edit' ? 'Editar campanha' : 'Nova campanha'}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === 'edit'
                ? 'Atualize os dados da campanha.'
                : 'Cadastre uma nova campanha promocional (demo).'}
            </DialogDescription>
          </DialogHeader>
          <CampaignForm
            campaign={dialog?.mode === 'edit' ? dialog.campaign : null}
            onSuccess={closeAndRefresh}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
