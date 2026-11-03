import { forbidden } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { deletePrize, updatePrize } from '@/lib/db';
import type { PrizeInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const input: Partial<PrizeInput> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return Response.json({ error: 'Informe o nome do prêmio.' }, { status: 400 });
    }
    input.name = name;
  }
  if (body.description !== undefined) {
    input.description = typeof body.description === 'string' ? body.description.trim() : '';
  }
  if (body.value !== undefined) {
    const rawValue = body.value;
    if (rawValue === null || rawValue === '') {
      input.value = null;
    } else if (typeof rawValue === 'number' && Number.isFinite(rawValue) && rawValue >= 0) {
      input.value = Math.round(rawValue * 100) / 100;
    } else {
      return Response.json(
        { error: 'Valor deve ser um número maior ou igual a zero.' },
        { status: 400 },
      );
    }
  }
  if (body.quantity !== undefined) {
    if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1) {
      return Response.json(
        { error: 'Quantidade deve ser um número inteiro maior que zero.' },
        { status: 400 },
      );
    }
    input.quantity = body.quantity;
  }
  if (body.position !== undefined) {
    if (typeof body.position !== 'number' || !Number.isInteger(body.position) || body.position < 0) {
      return Response.json(
        { error: 'Posição deve ser um número inteiro maior ou igual a zero.' },
        { status: 400 },
      );
    }
    input.position = body.position;
  }

  const prize = await updatePrize(id, input, session.profile.id);
  return Response.json({ prize });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;

  let session;
  try {
    session = await requireAdmin();
  } catch {
    return forbidden();
  }

  await deletePrize(id, session.profile.id);
  return Response.json({ ok: true });
}
