import { listCampaigns, listDrawSessions } from '@/lib/db';
import { DrawSessionManager } from '@/components/admin/draw-session-manager';

export const metadata = {
  title: 'Apurações | Admin MEGA SORTE',
};

/**
 * Sessões de apuração no servidor; o agendamento e a execução
 * são feitos pelo DrawSessionManager (client) via API routes.
 */
export default async function AdminApuracoesPage() {
  const [sessions, campaigns] = await Promise.all([listDrawSessions(), listCampaigns()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Apurações</h1>
        <p className="text-sm text-muted-foreground">
          Agende e execute as apurações das campanhas. Cada execução gera um
          comprovante (seed) auditável.
        </p>
      </div>
      <DrawSessionManager sessions={sessions} campaigns={campaigns} />
    </div>
  );
}
