import { unauthorized } from '@/lib/admin';
import { requireUser } from '@/lib/auth';
import { listNotifications } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch {
    return unauthorized();
  }

  const notifications = await listNotifications(session.profile.id);
  return Response.json({ notifications });
}
