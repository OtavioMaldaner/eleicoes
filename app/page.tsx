import Link from 'next/link';
import { Painel } from '@/components/Painel';

export default function Home() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">Apuração — Eleições 2026</h1>
        <Link href="/mapas" className="text-sm text-sky-300 underline underline-offset-2">
          Mapas do Brasil e do exterior →
        </Link>
      </div>
      <Painel />
    </main>
  );
}
