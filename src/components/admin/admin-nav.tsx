'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/campanhas', label: 'Campanhas' },
  { href: '/admin/premios', label: 'Prêmios' },
  { href: '/admin/participacoes', label: 'Participações' },
  { href: '/admin/apuracoes', label: 'Apurações' },
  { href: '/admin/auditoria', label: 'Auditoria' },
  { href: '/admin/usuarios', label: 'Usuários' },
];

/**
 * Navegação do painel admin.
 * Desktop: sidebar vertical. Mobile: barra horizontal com rolagem.
 * O link ativo é destacado via usePathname (comparação exata de rota).
 */
export function AdminNav() {
  const pathname = usePathname();

  const linkClass = (href: string): string =>
    cn(
      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
      pathname === href
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <>
      {/* Mobile: navegação horizontal */}
      <nav
        aria-label="Navegação do painel"
        className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(linkClass(link.href), 'whitespace-nowrap')}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop: sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border md:block">
        <nav aria-label="Navegação do painel" className="sticky top-0 flex flex-col gap-1 p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administração
          </p>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
