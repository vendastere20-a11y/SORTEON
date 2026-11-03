import { loginWithPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return Response.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  try {
    const session = await loginWithPassword(email, password);
    return Response.json({
      ok: true,
      profile: {
        id: session.profile.id,
        name: session.profile.name,
        email: session.profile.email,
      },
      isAdmin: session.isAdmin,
    });
  } catch {
    return Response.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }
}
