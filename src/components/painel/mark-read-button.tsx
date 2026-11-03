'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Botão "Marcar como lida" de uma notificação.
 * Faz PATCH /api/notifications/[id] e recarrega os dados do servidor.
 */
export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Falha ao marcar a notificação como lida.');
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="text-xs font-medium text-muted-foreground">Lida</span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
        {loading ? 'Marcando…' : 'Marcar como lida'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
