import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { executeDraw } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  try {
    const result = await executeDraw(id, session.profile.id);
    return Response.json({ result });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'ALREADY_EXECUTED') {
        return Response.json({ error: 'Este sorteio já foi executado.' }, { status: 409 });
      }
      if (e.message === 'NO_ENTRIES') {
        return Response.json({ error: 'Sem participações para sortear.' }, { status: 400 });
      }
      if (e.message === 'SESSION_NOT_FOUND') {
        return Response.json({ error: 'Sessão de sorteio não encontrada.' }, { status: 404 });
      }
      if (e.message === 'SESSION_NOT_SCHEDULED') {
        return Response.json({ error: 'Esta sessão não está agendada.' }, { status: 400 });
      }
    }
    throw e;
  }
}
