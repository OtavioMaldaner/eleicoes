'use client';

import type { VotoCand } from '@/lib/mapas/agregar';
import { nomeBonito } from '@/lib/nome';
import type { MudancaUF } from '@/lib/mudanca';

type Props = {
  mudanca: Record<string, MudancaUF[]>;
  finalistas: VotoCand[]; // na ordem em que aparecem
  cor: (v: VotoCand) => string;
  onUf: (uf: string) => void;
};

const TOPO = 8;
const umaCasa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Onde cada finalista mais cresceu em relação ao 1º turno, nas urnas já apuradas.
export function MudancaPorEstado({ mudanca, finalistas, cor, onUf }: Props) {
  const maior = Math.max(0, ...finalistas.flatMap((f) => (mudanca[f.id] ?? []).slice(0, TOPO).map((m) => m.delta)));
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="O que mudou desde o 1º turno">
      <h2 className="text-xs uppercase tracking-widest text-zinc-400">O que mudou desde o 1º turno</h2>
      <p className="text-xs text-zinc-400">Nas urnas já apuradas, em pontos</p>
      {maior === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Aparece quando os primeiros estados apurarem.</p>
      ) : (
        finalistas.map((f) => {
          const itens = (mudanca[f.id] ?? []).slice(0, TOPO);
          return (
            <div key={f.id} className="mt-3">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor(f) }} />
                Onde {nomeBonito(f.nome).split(' ')[0]} cresceu
              </h3>
              {itens.length === 0 ? (
                <p className="text-sm text-zinc-400">Nenhum estado ainda.</p>
              ) : (
                <ul>
                  {itens.map((m) => (
                    <li key={m.uf}>
                      <button type="button" onClick={() => onUf(m.uf)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-zinc-800" title={m.nome}>
                        <span className="w-7 text-xs font-semibold uppercase text-zinc-300">{m.uf}</span>
                        <span className="h-2.5 flex-1">
                          <span className="block h-full rounded" style={{ width: `${(m.delta / maior) * 100}%`, background: cor(f) }} />
                        </span>
                        <span className="w-12 text-right text-xs tabular-nums text-zinc-300">+{umaCasa.format(m.delta)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
