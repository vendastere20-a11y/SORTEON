'use client';

import { useRouter } from 'next/navigation';
import type { Campaign } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/**
 * Select de campanha que navega para `${basePath}?campaign_id=<id>`.
 * Usado nas telas admin que filtram conteúdo por campanha (Prêmios, Participações).
 */
export function CampaignQuerySelect({
  campaigns,
  basePath,
  currentId,
}: {
  campaigns: Campaign[];
  basePath: string;
  currentId: string | null;
}) {
  const router = useRouter();

  function handleChange(value: string): void {
    router.push(`${basePath}?campaign_id=${encodeURIComponent(value)}`);
  }

  return (
    <div className="max-w-md space-y-2">
      <Label htmlFor="campaign-query-select">Campanha</Label>
      <Select
        id="campaign-query-select"
        value={currentId ?? ''}
        onChange={(e) => handleChange(e.target.value)}
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
