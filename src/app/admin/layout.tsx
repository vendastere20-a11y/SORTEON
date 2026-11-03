import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { AdminNav } from '@/components/admin/admin-nav';

/**
 * Layout das rotas /admin.
 * O guard requireAdmin() lança erro quando não há sessão de administrador;
 * capturamos e redirecionamos para o login.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin().catch(() => redirect('/login'));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
