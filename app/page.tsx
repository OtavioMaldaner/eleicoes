import { Painel } from '@/components/Painel';

export default function Home() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <h1 className="sr-only">Painel de apuração</h1>
      <Painel />
    </main>
  );
}
