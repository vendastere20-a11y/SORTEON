// Resultados públicos das apurações concluídas. Server component.

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listResults } from "@/lib/db";
import { formatBRL } from "@/lib/format";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-6)}` : hash;
}

export default async function ResultadosPage() {
  const results = await listResults();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Resultados</h1>
      <p className="mt-2 text-muted-foreground">
        Todas as apurações concluídas, com identificador vencedor, data e hash auditável.
      </p>

      {results.length > 0 ? (
        <div className="mt-8 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableCaption>
              {results.length} {results.length === 1 ? "resultado publicado" : "resultados publicados"}.
              Clique em “Ver comprovante” para conferir os detalhes auditáveis.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Identificador vencedor</TableHead>
                <TableHead>Data / hora</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead className="text-right">Comprovante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.campaign_title}</TableCell>
                  <TableCell>
                    {result.prize_name ?? "—"}
                    {result.prize_value !== null && result.prize_value !== undefined && (
                      <span className="block text-xs font-semibold text-primary">
                        {formatBRL(result.prize_value)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono tracking-widest text-primary">
                      {result.winning_identifier}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(result.executed_at)}
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs text-muted-foreground" title={result.seed_hash}>
                      {truncateHash(result.seed_hash)}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/apuracao/${result.draw_session_id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver comprovante
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-12 rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
          Ainda não há resultados publicados. Volte em breve.
        </p>
      )}
    </main>
  );
}
