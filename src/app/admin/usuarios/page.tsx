import { isAdminUser, listProfiles } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata = {
  title: 'Usuários | Admin MEGA SORTE',
};

export default async function AdminUsuariosPage() {
  // O guard requireAdmin() roda no layout pai (src/app/admin/layout.tsx).
  const profiles = await listProfiles();

  // Resolve o papel de cada perfil em paralelo.
  const rows = await Promise.all(
    profiles.map(async (profile) => ({
      profile,
      isAdmin: await isAdminUser(profile.id),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Perfis cadastrados na plataforma e seus papéis.
          </p>
        </div>
        <Badge variant="secondary">
          {rows.length} {rows.length === 1 ? 'usuário' : 'usuários'}
        </Badge>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Papel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ profile, isAdmin }) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {profile.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(profile.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Badge variant="default">ADMIN</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Participante</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
