'use client';

import { fmtVotosCurto } from '@/lib/formato';
import { corPartido } from '@/lib/cores';
import type { Vantagem } from '@/lib/vantagem';

const TOPO = 8;

// Os estados em que o líder abriu a maior diferença de votos, do maior para o menor.
export function MaioresVantagens({ itens, onUf }: { itens: Vantagem[]; onUf: (uf: string) => void }) {
  const lista = itens.slice(0, TOPO);
  const maior = lista[0]?.votos ?? 0;
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Maiores vantagens por estado">
      <h2 className="text-xs uppercase tracking-widest text-zinc-400">Maiores vantagens por estado</h2>
      {lista.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Aparece quando os primeiros estados apurarem.</p>
      ) : (
        <ul className="mt-2">
          {lista.map((v) => (
            <li key={v.chave}>
              <button type="button" onClick={() => onUf(v.chave)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-zinc-800" title={`${v.nome}: ${v.lider.nome}`}>
                <span className="w-7 text-xs font-semibold uppercase text-zinc-300">{v.chave}</span>
                <span className="h-2.5 flex-1">
                  <span className="block h-full rounded" style={{ width: `${maior ? (v.votos / maior) * 100 : 0}%`, background: corPartido(v.lider.partido) }} />
                </span>
                <span className="w-16 text-right text-xs tabular-nums text-zinc-300">+{fmtVotosCurto(v.votos)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
