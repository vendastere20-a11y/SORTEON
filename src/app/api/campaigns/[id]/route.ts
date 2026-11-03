import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import {
  deleteCampaign,
  getCampaign,
  updateCampaign,
} from '@/lib/db';
import type { CampaignInput, CampaignStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: CampaignStatus[] = ['draft', 'active', 'paused', 'finished', 'cancelled'];
const VALID_IDENTIFIER_COUNTS = [20, 50, 100, 200, 500, 1000];

function isValidDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }
  return Response.json({ campaign });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  const existing = await getCampaign(id);
  if (!existing) {
    return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const input: Partial<CampaignInput> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 3) {
      return Response.json({ error: 'Informe um título para a campanha.' }, { status: 400 });
    }
    input.title = title;
  }
  if (body.description !== undefined) {
    input.description = typeof body.description === 'string' ? body.description.trim() : '';
  }
  if (body.image_url !== undefined) {
    const raw = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    input.image_url = raw || null;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status as CampaignStatus)) {
      return Response.json({ error: 'Status inválido.' }, { status: 400 });
    }
    input.status = body.status as CampaignStatus;
  }
  if (body.identifier_count !== undefined) {
    if (typeof body.identifier_count !== 'number' || !VALID_IDENTIFIER_COUNTS.includes(body.identifier_count)) {
      return Response.json(
        { error: 'Quantidade de identificadores deve ser 20, 50, 100, 200, 500 ou 1000.' },
        { status: 400 },
      );
    }
    input.identifier_count = body.identifier_count;
  }
  if (body.starts_at !== undefined) {
    if (typeof body.starts_at !== 'string' || !isValidDate(body.starts_at)) {
      return Response.json({ error: 'Data de início inválida.' }, { status: 400 });
    }
    input.starts_at = new Date(body.starts_at).toISOString();
  }
  if (body.ends_at !== undefined) {
    if (typeof body.ends_at !== 'string' || !isValidDate(body.ends_at)) {
      return Response.json({ error: 'Data de término inválida.' }, { status: 400 });
    }
    input.ends_at = new Date(body.ends_at).toISOString();
  }
  if (body.draw_at !== undefined) {
    if (typeof body.draw_at !== 'string' || !isValidDate(body.draw_at)) {
      return Response.json({ error: 'Data do sorteio inválida.' }, { status: 400 });
    }
    input.draw_at = new Date(body.draw_at).toISOString();
  }

  const updated = await updateCampaign(id, input, session.profile.id);
  return Response.json({ campaign: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  const existing = await getCampaign(id);
  if (!existing) {
    return Response.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  }

  await deleteCampaign(id, session.profile.id);
  return Response.json({ ok: true });
}
