import { listResults } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = await listResults();
  return Response.json({ results });
}
