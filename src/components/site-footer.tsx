import Link from "next/link";
import { Trophy, ShieldAlert } from "lucide-react";

/** Rodapé do site com aviso de demonstração. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Trophy className="h-5 w-5" />
              </span>
              <span className="text-base font-extrabold tracking-wide">
                MEGA <span className="text-primary">SORTE</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              SUA CHANCE. SEU MOMENTO.
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Plataforma de campanhas promocionais com apuração transparente e
              auditável.
            </p>
          </div>

          <nav aria-label="Navegação do rodapé">
            <p className="text-sm font-bold tracking-wide text-foreground">
              Navegação
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/campanhas" className="hover:text-primary">
                  Campanhas
                </Link>
              </li>
              <li>
                <Link href="/resultados" className="hover:text-primary">
                  Resultados
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="hover:text-primary">
                  Cadastrar
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-foreground">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Aviso importante
            </p>
            <p className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              Versão de <strong className="text-primary">demonstração</strong>.
              Nenhuma campanha real, cobrança ou apuração oficial está ativa.
              Campanhas reais só serão publicadas após validação do
              enquadramento jurídico e das autorizações aplicáveis.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 MEGA SORTE — Demonstração.</span>
          <span>SUA CHANCE. SEU MOMENTO.</span>
        </div>
      </div>
    </footer>
  );
}
