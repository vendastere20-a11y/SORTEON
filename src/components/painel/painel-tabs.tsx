'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Envoltório client para as abas da área do participante.
 * O Tabs da UI é controlado (value/onValueChange), então o estado vive aqui.
 */
export function PainelTabs({
  participacoes,
  resultados,
  notificacoes,
}: {
  participacoes: React.ReactNode;
  resultados: React.ReactNode;
  notificacoes: React.ReactNode;
}) {
  const [tab, setTab] = useState('participacoes');

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="participacoes">Minhas participações</TabsTrigger>
        <TabsTrigger value="resultados">Meus resultados</TabsTrigger>
        <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
      </TabsList>
      <TabsContent value="participacoes" className="mt-4">
        {participacoes}
      </TabsContent>
      <TabsContent value="resultados" className="mt-4">
        {resultados}
      </TabsContent>
      <TabsContent value="notificacoes" className="mt-4">
        {notificacoes}
      </TabsContent>
    </Tabs>
  );
}
