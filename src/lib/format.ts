// Helpers de formatação de datas (PT-BR).
// As datas chegam do backend como strings ISO em UTC.

/** "02/11/2026 22:58" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "02/11/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Converte ISO UTC para o formato aceito por <input type="datetime-local">
 * ("2026-11-02T22:58"), usando o fuso local do navegador.
 */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** "R$ 1.234,56" — null/undefined vira "—". */
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

/** Trunca um hash/ID longo para exibição (ex.: seed_hash). */
export function truncateMiddle(value: string | null | undefined, head = 10): string {
  if (!value) return '—';
  return value.length > head + 3 ? `${value.slice(0, head)}…` : value;
}
