import "server-only";

// Helpers de autorização para API routes.
// Re-exporta os guards de auth.ts e oferece respostas 401/403 prontas.

export { requireAdmin, requireUser, getSession } from './auth';
export type { Session } from './types';

/** Resposta JSON 401 padrão (não autenticado). */
export function unauthorized(): Response {
  return Response.json(
    { error: 'unauthorized', message: 'Autenticação necessária.' },
    { status: 401 },
  );
}

/** Resposta JSON 403 padrão (sem permissão de administrador). */
export function forbidden(): Response {
  return Response.json(
    { error: 'forbidden', message: 'Acesso restrito a administradores.' },
    { status: 403 },
  );
}
