import { registerUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.consent !== true) {
    return Response.json(
      { error: 'É necessário aceitar o consentimento de dados.' },
      { status: 400 },
    );
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const phoneRaw = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const phone = phoneRaw ? phoneRaw : undefined;

  if (name.length < 2) {
    return Response.json({ error: 'Informe seu nome.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json(
      { error: 'A senha deve ter no mínimo 6 caracteres.' },
      { status: 400 },
    );
  }

  try {
    const session = await registerUser({ name, email, password, phone });
    return Response.json(
      {
        ok: true,
        profile: {
          id: session.profile.id,
          name: session.profile.name,
          email: session.profile.email,
        },
        isAdmin: session.isAdmin,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
      return Response.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 });
    }
    throw e;
  }
}
