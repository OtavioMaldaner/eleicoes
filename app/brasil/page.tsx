import type { Metadata } from 'next';
import { Brasil } from '@/components/Brasil';

export const metadata: Metadata = { title: 'Brasil — Eleições 2026' };

export default function PaginaBrasil() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <h1 className="sr-only">Apuração no Brasil por estado</h1>
      <Brasil />
    </main>
  );
}
