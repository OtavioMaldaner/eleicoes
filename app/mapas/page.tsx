import type { Metadata } from 'next';
import Link from 'next/link';
import { Mapas } from '@/components/Mapas';

export const metadata: Metadata = { title: 'Mapas — Eleições 2026' };

export default function PaginaMapas() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Presidente — Brasil e exterior</h1>
        <Link href="/" className="text-sm text-sky-300 underline underline-offset-2">
          ← Voltar ao painel
        </Link>
      </div>
      <Mapas />
    </main>
  );
}
