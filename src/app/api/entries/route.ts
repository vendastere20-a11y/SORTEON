import { forbidden, unauthorized } from '@/lib/admin';
import { requireAdmin, requireUser } from '@/lib/auth';
import { createEntry, listEntries } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return forbidden();
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');

  if (!campaignId) {
    return Response.json({ error: 'Informe o parâmetro campaign_id.' }, { status: 400 });
  }

  const entries = await listEntries(campaignId);
  return Response.json({ entries });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const campaignId = typeof body?.campaign_id === 'string' ? body.campaign_id.trim() : '';
  const numero = typeof body?.numero === 'number' ? body.numero : undefined;

  if (!campaignId) {
    return Response.json({ error: 'Informe a campanha.' }, { status: 400 });
  }

  try {
    const entry = await createEntry(campaignId, session.profile.id, numero);
    return Response.json({ entry }, { status: 201 });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'DUPLICATE') {
        return Response.json(
          { error: 'Você já está participando desta campanha.' },
          { status: 409 },
        );
      }
      if (e.message === 'NUMBER_TAKEN') {
        return Response.json(
          { error: 'Este número já foi escolhido. Escolha outro.' },
          { status: 409 },
        );
      }
      if (e.message === 'INVALID_NUMBER') {
        return Response.json({ error: 'Escolha um número válido para esta campanha.' }, { status: 400 });
      }
      if (e.message === 'FULL') {
        return Response.json({ error: 'Identificadores esgotados.' }, { status: 409 });
      }
      if (e.message === 'CLOSED') {
        return Response.json({ error: 'Esta campanha não aceita mais participações.' }, { status: 400 });
      }
    }
    throw e;
  }
}
