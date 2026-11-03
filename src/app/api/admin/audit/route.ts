import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { listAuditLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return forbidden();
  }

  const logs = await listAuditLogs(100);
  return Response.json({ logs });
}
