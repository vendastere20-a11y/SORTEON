import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { createDrawSession, listDrawSessions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return forbidden();
  }

  const sessions = await listDrawSessions();
  return Response.json({ sessions });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const campaignId = typeof body?.campaign_id === 'string' ? body.campaign_id.trim() : '';
  const scheduledAt = typeof body?.scheduled_at === 'string' ? body.scheduled_at : '';

  if (!campaignId) {
    return Response.json({ error: 'Informe a campanha.' }, { status: 400 });
  }
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    return Response.json({ error: 'Data de agendamento inválida.' }, { status: 400 });
  }

  try {
    const drawSession = await createDrawSession(
      campaignId,
      new Date(scheduledAt).toISOString(),
      session.profile.id,
    );
    return Response.json({ session: drawSession }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === 'CAMPAIGN_NOT_FOUND') {
      return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }
    throw e;
  }
}
