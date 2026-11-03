import { unauthorized } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { markNotificationRead } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  await markNotificationRead(id, session.profile.id);
  return Response.json({ ok: true });
}
