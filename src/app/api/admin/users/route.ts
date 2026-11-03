import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { isAdminUser, listProfiles } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return forbidden();
  }

  const profiles = await listProfiles();
  const users = await Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      isAdmin: await isAdminUser(profile.id),
    })),
  );
  return Response.json({ users });
}
