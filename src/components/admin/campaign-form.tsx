'use client';

import { useState } from 'react';
import type { Campaign, CampaignInput, CampaignStatus } from '@/lib/types';
import { toDatetimeLocalValue } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'finished', label: 'Encerrada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const IDENTIFIER_OPTIONS = [20, 50, 100, 200, 500, 1000];

/**
 * Formulário de criação/edição de campanha.
 * No submit faz POST /api/campaigns (nova) ou PATCH /api/campaigns/[id] (edição)
 * e avisa o pai via onSuccess para fechar o dialog e recarregar os dados.
 */
export function CampaignForm({
  campaign,
  onSuccess,
}: {
  campaign?: Campaign | null;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(campaign);

  const [title, setTitle] = useState(campaign?.title ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status ?? 'draft');
  const [identifierCount, setIdentifierCount] = useState<number>(campaign?.identifier_count ?? 100);
  const [pricePerNumber, setPricePerNumber] = useState<string>(
    campaign?.price_per_number != null ? String(campaign.price_per_number).replace('.', ',') : '',
  );
  const [startsAt, setStartsAt] = useState(
    () =>
      toDatetimeLocalValue(campaign?.starts_at) ||
      toDatetimeLocalValue(new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(
    () =>
      toDatetimeLocalValue(campaign?.ends_at) ||
      toDatetimeLocalValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
  );
  const [drawAt, setDrawAt] = useState(toDatetimeLocalValue(campaign?.draw_at ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toIso(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const startsIso = toIso(startsAt);
    const endsIso = toIso(endsAt);
    if (!title.trim()) {
      setError('Informe o título da campanha.');
      return;
    }
    if (!startsIso || !endsIso) {
      setError('Informe datas de início e término válidas.');
      return;
    }
    if (new Date(startsIso) >= new Date(endsIso)) {
      setError('O término precisa ser depois do início.');
      return;
    }
    const priceTrimmed = pricePerNumber.trim().replace(',', '.');
    const priceNum = priceTrimmed === '' ? null : Number(priceTrimmed);
    if (priceNum !== null && (!Number.isFinite(priceNum) || priceNum <= 0)) {
      setError('Valor por número deve ser maior que zero (ex.: 10,00).');
      return;
    }

    const payload: CampaignInput = {
      title: title.trim(),
      description: description.trim(),
      status,
      identifier_count: identifierCount,
      price_per_number: priceNum === null ? null : Math.round(priceNum * 100) / 100,
      starts_at: startsIso,
      ends_at: endsIso,
      draw_at: toIso(drawAt),
    };

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/campaigns/${campaign!.id}` : '/api/campaigns', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(data?.error ?? data?.message ?? 'Falha ao salvar a campanha.');
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
        <Label htmlFor="campaign-title">Título</Label>
        <Input
          id="campaign-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Sorteio de inauguração"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-description">Descrição</Label>
        <Textarea
          id="campaign-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva a campanha, regras básicas e como participar."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="campaign-status">Status</Label>
          <Select
            id="campaign-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CampaignStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-identifiers">Identificadores</Label>
          <Select
            id="campaign-identifiers"
            value={String(identifierCount)}
            onChange={(e) => setIdentifierCount(Number(e.target.value))}
          >
            {IDENTIFIER_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} números
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-price">Valor por número (R$)</Label>
          <Input
            id="campaign-price"
            inputMode="decimal"
            placeholder="Ex.: 10,00"
            value={pricePerNumber}
            onChange={(e) => setPricePerNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Quanto o participante paga por cada número escolhido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="campaign-starts">Início</Label>
          <Input
            id="campaign-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-ends">Término</Label>
          <Input
            id="campaign-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-draw">Apuração em (opcional)</Label>
          <Input
            id="campaign-draw"
            type="datetime-local"
            value={drawAt}
            onChange={(e) => setDrawAt(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar campanha'}
        </Button>
      </div>
    </form>
  );
}
