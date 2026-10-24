'use client';

import type { Capital, Capitais } from '@/lib/brasil/capitais';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';

type Props = { dados: Capitais | null; finalistas: VotoCand[]; cor: (v: VotoCand) => string; onUf: (uf: string) => void };

const apurado = (l: Local | null | undefined): l is Local => !!l && l.total > 0;
const votosDe = (l: Local, id: string) => l.votos.find((v) => v.id === id)?.votos ?? 0;

const MINUSCULAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS']);
const nomeBonito = (n: string) =>
  n
    .split(' ')
    .map((p) => (MINUSCULAS.has(p) ? p.toLowerCase() : p.charAt(0) + p.slice(1).toLowerCase()))
    .join(' ');

// Presidente nas capitais, da maior para a menor. Antes de o 2º turno ter votos na cidade, mostra o 1º.
export function PainelCapitais({ dados, finalistas, cor, onUf }: Props) {
  const [a, b] = finalistas;
  const lista = [...(dados?.capitais ?? [])].sort((x, y) => (y.l2?.eleitorado ?? y.l1?.eleitorado ?? 0) - (x.l2?.eleitorado ?? x.l1?.eleitorado ?? 0));

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Capitais">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400">Capitais</h2>
        <span className="text-xs text-zinc-500">por eleitorado</span>
      </div>
      {!dados ? (
        <p className="mt-2 text-sm text-zinc-500">Carregando as 27 capitais…</p>
      ) : (
        <ul className="mt-2 max-h-96 divide-y divide-zinc-800 overflow-y-auto pr-1 text-sm">
          {lista.map((c: Capital) => {
            const usa2 = apurado(c.l2);
            const l = usa2 ? c.l2 : c.l1;
            const va = a && apurado(l) ? votosDe(l, a.id) : 0;
            const vb = b && apurado(l) ? votosDe(l, b.id) : 0;
            return (
              <li key={c.uf}>
                <button type="button" onClick={() => onUf(c.uf)} className="block w-full px-1 py-2 text-left hover:bg-zinc-800">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {nomeBonito(c.nome)} <span className="text-xs text-zinc-500">{c.uf.toUpperCase()}</span>
                    </span>
                    <span className="text-xs tabular-nums text-zinc-500">
                      {usa2 ? `${fmtPct(c.l2!.pctSecoes)} das seções` : c.l2 ? '2º turno sem votos' : 'sem resposta'}
                    </span>
                  </span>
                  {a && b && apurado(l) ? (
                    <>
                      <span className="mt-1 flex items-baseline justify-between text-xs font-semibold tabular-nums">
                        <span style={{ color: cor(a) }}>{fmtPct((va / l.total) * 100)}</span>
                        <span className="font-normal text-zinc-500">{usa2 ? `${fmtInt(l.total)} votos` : '1º turno'}</span>
                        <span style={{ color: cor(b) }}>{fmtPct((vb / l.total) * 100)}</span>
                      </span>
                      <span className="mt-0.5 flex h-1.5 gap-0.5 overflow-hidden rounded bg-zinc-800">
                        <span style={{ width: `${(va / l.total) * 100}%`, background: cor(a) }} />
                        <span className="flex-1" />
                        <span style={{ width: `${(vb / l.total) * 100}%`, background: cor(b) }} />
                      </span>
                    </>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
