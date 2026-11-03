'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign, Prize, PrizeInput } from '@/lib/types';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CampaignQuerySelect } from '@/components/admin/campaign-query-select';

type PrizeDialogState = { mode: 'create' } | { mode: 'edit'; prize: Prize } | null;

/**
 * Gerencia os prêmios da campanha selecionada.
 * O select de campanha navega com ?campaign_id= (o servidor recarrega a lista).
 * Criar/editar usa Dialog + formulário interno; excluir pede confirmação.
 */
export function PrizeManager({
  campaigns,
  prizes,
  selectedCampaignId,
  campaignTitle,
}: {
  campaigns: Campaign[];
  prizes: Prize[];
  selectedCampaignId: string | null;
  campaignTitle: string | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<PrizeDialogState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function closeAndRefresh(): void {
    setDialog(null);
    router.refresh();
  }

  async function handleDelete(prize: Prize): Promise<void> {
    const confirmed = window.confirm(`Excluir o prêmio "${prize.name}"?`);
    if (!confirmed) return;
    setDeletingId(prize.id);
    setError(null);
    try {
      const res = await fetch(`/api/prizes/${prize.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'Falha ao excluir o prêmio.');
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
      <CampaignQuerySelect
        campaigns={campaigns}
        basePath="/admin/premios"
        currentId={selectedCampaignId}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaignTitle ? (
            <>
              Prêmios de <span className="font-medium text-foreground">{campaignTitle}</span> —{' '}
              {prizes.length}
            </>
          ) : (
            'Selecione uma campanha.'
          )}
        </p>
        {selectedCampaignId && (
          <Button onClick={() => setDialog({ mode: 'create' })}>Novo prêmio</Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!selectedCampaignId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma campanha selecionada.
          </CardContent>
        </Card>
      ) : prizes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum prêmio cadastrado para esta campanha.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prizes.map((prize) => (
                <TableRow key={prize.id}>
                  <TableCell className="font-semibold text-primary">
                    {prize.position}º
                  </TableCell>
                  <TableCell className="font-medium">{prize.name}</TableCell>
                  <TableCell className="whitespace-nowrap font-semibold text-primary">
                    {prize.value !== null && prize.value !== undefined
                      ? formatBRL(prize.value)
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {prize.description || '—'}
                  </TableCell>
                  <TableCell>{prize.quantity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialog({ mode: 'edit', prize })}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(prize)}
                        disabled={deletingId === prize.id}
                      >
                        {deletingId === prize.id ? 'Excluindo…' : 'Excluir'}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'edit' ? 'Editar prêmio' : 'Novo prêmio'}
            </DialogTitle>
            <DialogDescription>
              {campaignTitle ? `Campanha: ${campaignTitle}` : 'Preencha os dados do prêmio.'}
            </DialogDescription>
          </DialogHeader>
          {selectedCampaignId && (
            <PrizeForm
              key={dialog?.mode === 'edit' ? dialog.prize.id : 'new'}
              campaignId={selectedCampaignId}
              prize={dialog?.mode === 'edit' ? dialog.prize : null}
              onSuccess={closeAndRefresh}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Formulário interno de criar/editar prêmio. */
function PrizeForm({
  campaignId,
  prize,
  onSuccess,
}: {
  campaignId: string;
  prize?: Prize | null;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(prize);
  const [name, setName] = useState(prize?.name ?? '');
  const [description, setDescription] = useState(prize?.description ?? '');
  const [value, setValue] = useState(prize?.value != null ? String(prize.value) : '');
  const [quantity, setQuantity] = useState(prize?.quantity ?? 1);
  const [position, setPosition] = useState(prize?.position ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    const parsedValue = value.trim() === '' ? null : Number(value.replace(',', '.'));
    if (parsedValue !== null && (!Number.isFinite(parsedValue) || parsedValue < 0)) {
      setError('Valor precisa ser um número maior ou igual a zero.');
      return;
    }
    if (quantity < 1 || position < 1) {
      setError('Quantidade e posição precisam ser maiores que zero.');
      return;
    }

    const payload: PrizeInput = {
      campaign_id: campaignId,
      name: name.trim(),
      description: description.trim(),
      value: parsedValue,
      quantity,
      position,
    };

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/prizes/${prize!.id}` : '/api/prizes', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? 'Falha ao salvar o prêmio.');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prize-name">Produto</Label>
        <Input
          id="prize-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Smartphone"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prize-value">Valor (R$)</Label>
        <Input
          id="prize-value"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex.: 4999.90"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prize-description">Descrição</Label>
        <Textarea
          id="prize-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes do prêmio."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prize-quantity">Quantidade</Label>
          <Input
            id="prize-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prize-position">Posição</Label>
          <Input
            id="prize-position"
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            required
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar prêmio'}
        </Button>
      </div>
    </form>
  );
}
