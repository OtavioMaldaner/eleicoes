import type { Metadata } from 'next';
import { Exterior } from '@/components/Exterior';

export const metadata: Metadata = { title: 'Exterior · 2º turno — Eleições 2026' };

export default function PaginaExteriorSegundoTurno() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <h1 className="mb-1 text-xl font-bold">2º turno · Presidente: o voto dos brasileiros no exterior</h1>
      <p className="mb-4 text-sm text-zinc-400">Quem lidera em cada país, somando as cidades com seção eleitoral. Quanto mais forte a cor, maior o percentual do líder.</p>
      <Exterior turno={2} />
    </main>
  );
}
