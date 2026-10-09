import type { Metadata } from 'next';
import { Painel } from '@/components/Painel';

export const metadata: Metadata = { title: '2º turno — Eleições 2026' };

export default function PaginaSegundoTurno() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <h1 className="sr-only">Apuração do 2º turno</h1>
      <Painel turno={2} />
    </main>
  );
}
