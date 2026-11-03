import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { createPrize, getPrizes } from '@/lib/db';
import type { PrizeInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');

  if (!campaignId) {
    return Response.json({ error: 'Informe o parâmetro campaign_id.' }, { status: 400 });
  }

  const prizes = await getPrizes(campaignId);
  return Response.json({ prizes });
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
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const rawValue = body?.value;
  const value =
    rawValue === null || rawValue === undefined || rawValue === ''
      ? null
      : typeof rawValue === 'number'
        ? rawValue
        : Number.NaN;
  const quantity = typeof body?.quantity === 'number' ? body.quantity : 1;
  const position = typeof body?.position === 'number' ? body.position : 0;

  if (!campaignId) {
    return Response.json({ error: 'Informe a campanha do prêmio.' }, { status: 400 });
  }
  if (name.length < 2) {
    return Response.json({ error: 'Informe o nome do prêmio.' }, { status: 400 });
  }
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    return Response.json({ error: 'Valor deve ser um número maior ou igual a zero.' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return Response.json({ error: 'Quantidade deve ser um número inteiro maior que zero.' }, { status: 400 });
  }
  if (!Number.isInteger(position) || position < 0) {
    return Response.json({ error: 'Posição deve ser um número inteiro maior ou igual a zero.' }, { status: 400 });
  }

  const input: PrizeInput = {
    campaign_id: campaignId,
    name,
    description,
    value: value === null ? null : Math.round(value * 100) / 100,
    quantity,
    position,
  };

  const prize = await createPrize(input, session.profile.id);
  return Response.json({ prize }, { status: 201 });
}
