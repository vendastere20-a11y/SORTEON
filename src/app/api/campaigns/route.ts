import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import {
  createCampaign,
  listCampaigns,
} from '@/lib/db';
import type { CampaignInput, CampaignStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: CampaignStatus[] = ['draft', 'active', 'paused', 'finished', 'cancelled'];
const VALID_IDENTIFIER_COUNTS = [20, 50, 100, 200, 500, 1000];

function isValidDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');

  if (statusParam !== null && !VALID_STATUSES.includes(statusParam as CampaignStatus)) {
    return Response.json({ error: 'Status inválido.' }, { status: 400 });
  }

  const campaigns = await listCampaigns(
    statusParam ? { status: statusParam as CampaignStatus } : undefined,
  );
  return Response.json({ campaigns });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const imageUrlRaw = typeof body?.image_url === 'string' ? body.image_url.trim() : '';
  const status = typeof body?.status === 'string' ? body.status : 'draft';
  const identifierCount = typeof body?.identifier_count === 'number' ? body.identifier_count : null;
  const pricePerNumberRaw = body?.price_per_number;
  const pricePerNumber =
    pricePerNumberRaw === null || pricePerNumberRaw === undefined || pricePerNumberRaw === ''
      ? null
      : Number(pricePerNumberRaw);
  const startsAt = typeof body?.starts_at === 'string' ? body.starts_at : '';
  const endsAt = typeof body?.ends_at === 'string' ? body.ends_at : '';
  const drawAtRaw = typeof body?.draw_at === 'string' ? body.draw_at : '';

  if (title.length < 3) {
    return Response.json({ error: 'Informe um título para a campanha.' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status as CampaignStatus)) {
    return Response.json({ error: 'Status inválido.' }, { status: 400 });
  }
  if (identifierCount === null || !VALID_IDENTIFIER_COUNTS.includes(identifierCount)) {
    return Response.json(
      { error: 'Quantidade de identificadores deve ser 20, 50, 100, 200, 500 ou 1000.' },
      { status: 400 },
    );
  }
  if (pricePerNumber !== null && (!Number.isFinite(pricePerNumber) || pricePerNumber <= 0 || pricePerNumber > 100000)) {
    return Response.json({ error: 'Valor por número deve ser maior que zero.' }, { status: 400 });
  }
  if (!isValidDate(startsAt)) {
    return Response.json({ error: 'Data de início inválida.' }, { status: 400 });
  }
  if (!isValidDate(endsAt)) {
    return Response.json({ error: 'Data de término inválida.' }, { status: 400 });
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return Response.json(
      { error: 'A data de término deve ser posterior à data de início.' },
      { status: 400 },
    );
  }
  if (drawAtRaw && !isValidDate(drawAtRaw)) {
    return Response.json({ error: 'Data do sorteio inválida.' }, { status: 400 });
  }

  const input: CampaignInput = {
    title,
    description,
    image_url: imageUrlRaw || null,
    status: status as CampaignStatus,
    identifier_count: identifierCount,
    price_per_number: pricePerNumber,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    draw_at: drawAtRaw ? new Date(drawAtRaw).toISOString() : null,
  };

  try {
    const campaign = await createCampaign(input, session.profile.id);
    return Response.json({ campaign }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === 'CAMPAIGN_NOT_FOUND') {
      return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }
    return Response.json({ error: 'Não foi possível criar a campanha.' }, { status: 500 });
  }
}
