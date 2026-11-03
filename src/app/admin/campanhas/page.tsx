import { countEntries, listCampaigns } from '@/lib/db';
import { CampaignManager } from '@/components/admin/campaign-manager';

export const metadata = {
  title: 'Campanhas | Admin MEGA SORTE',
};

/**
 * Lista as campanhas no servidor e entrega ao CampaignManager (client)
 * junto com o mapa de participações por campanha.
 */
export default async function AdminCampanhasPage() {
  const campaigns = await listCampaigns();

  const pairs = await Promise.all(
    campaigns.map(async (c) => [c.id, await countEntries(c.id)] as const),
  );
  const counts: Record<string, number> = Object.fromEntries(pairs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Crie, edite e exclua campanhas promocionais (todas em modo demo).
        </p>
      </div>
      <CampaignManager campaigns={campaigns} counts={counts} />
    </div>
  );
}
