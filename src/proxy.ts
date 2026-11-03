import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (Next 16) — barreira inicial para rotas protegidas.
 * Só verifica a presença do cookie de sessão; a validação real
 * (papel de admin etc.) acontece nas páginas e API routes via lib/auth.ts.
 */
export function proxy(request: NextRequest) {
  const session = request.cookies.get("ms_session")?.value;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/admin/:path*"],
};
