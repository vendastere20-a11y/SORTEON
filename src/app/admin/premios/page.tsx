import { getCampaign, getPrizes, listCampaigns } from '@/lib/db';
import { PrizeManager } from '@/components/admin/prize-manager';

export const metadata = {
  title: 'Prêmios | Admin MEGA SORTE',
};

/**
 * No Next 16, searchParams é uma Promise.
 * Lê ?campaign_id= (ou usa a primeira campanha) e carrega os prêmios no servidor.
 */
export default async function AdminPremiosPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign_id?: string }>;
}) {
  const { campaign_id } = await searchParams;
  const campaigns = await listCampaigns();

  const selectedCampaignId = campaign_id ?? campaigns[0]?.id ?? null;
  const [prizes, campaign] = await Promise.all([
    selectedCampaignId ? getPrizes(selectedCampaignId) : Promise.resolve([]),
    selectedCampaignId ? getCampaign(selectedCampaignId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prêmios</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os prêmios de cada campanha, ordenados por posição.
        </p>
      </div>
      <PrizeManager
        campaigns={campaigns}
        prizes={prizes}
        selectedCampaignId={selectedCampaignId}
        campaignTitle={campaign?.title ?? null}
      />
    </div>
  );
}
