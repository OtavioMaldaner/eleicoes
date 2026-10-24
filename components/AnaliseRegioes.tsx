'use client';

import { porRegiao, REGIOES } from '@/lib/brasil/analise';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';

type Props = {
  estados2: Local[]; // presidente, 2º turno
  estados1: Local[]; // presidente, 1º turno (encerrado)
  finalistas: VotoCand[];
  cor: (v: VotoCand) => string;
  onUf: (uf: string) => void;
};

const apurado = (l: Local | undefined): l is Local => !!l && l.total > 0;
const pct = (v: number, l: Local) => (l.total ? (v / l.total) * 100 : 0);
const votosDe = (l: Local | undefined, id: string) => l?.votos.find((v) => v.id === id)?.votos ?? 0;

// Presidente por região do país: placar, vantagem e os estados de cada uma.
export function AnaliseRegioes({ estados2, estados1, finalistas, cor, onUf }: Props) {
  const r2 = new Map(porRegiao(estados2).map((l) => [l.chave, l]));
  const r1 = new Map(porRegiao(estados1).map((l) => [l.chave, l]));
  const [a, b] = finalistas;
  const porUf2 = new Map(estados2.map((l) => [l.chave, l]));
  const porUf1 = new Map(estados1.map((l) => [l.chave, l]));

  // Quem lidera cada região, no 2º turno ou, enquanto não há votos, no 1º.
  const lideres = REGIOES.map((r) => {
    const l = apurado(r2.get(r.nome)) ? r2.get(r.nome)! : r1.get(r.nome);
    if (!apurado(l) || !a || !b) return null;
    const va = votosDe(l, a.id);
    const vb = votosDe(l, b.id);
    return va === vb ? null : va > vb ? a.id : b.id;
  });
  const contagem = (id: string) => lideres.filter((x) => x === id).length;
  const segundoComVotos = REGIOES.some((r) => apurado(r2.get(r.nome)));

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Presidente por região">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400">Por região</h2>
        {!segundoComVotos && <span className="text-xs text-zinc-400">1º turno, até o 2º ter votos</span>}
      </div>

      {a && b && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {[a, b].map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor(v) }} />
              {v.nome.split(' ')[0]} lidera <span className="font-semibold tabular-nums">{contagem(v.id)}</span> de 5 regiões
            </span>
          ))}
        </p>
      )}

      <ul className="mt-3 divide-y divide-zinc-800">
        {REGIOES.map((r) => {
          const l2 = r2.get(r.nome);
          const l1 = r1.get(r.nome);
          const usa2 = apurado(l2);
          const l = usa2 ? l2 : l1;
          const ufs = r.ufs.map((u) => porUf2.get(u) ?? porUf1.get(u)).filter((x): x is Local => !!x);
          const va = a ? votosDe(l, a.id) : 0;
          const vb = b ? votosDe(l, b.id) : 0;
          const dif = l && apurado(l) ? ((va - vb) / l.total) * 100 : 0;
          const lider = va === vb ? null : va > vb ? a : b;
          return (
            <li key={r.nome} className="py-2.5">
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      <span className="mr-1 inline-block text-zinc-400 transition-transform group-open:rotate-90">›</span>
                      {r.nome}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-400">
                      {lider && apurado(l) && `${lider.nome.split(' ')[0]} +${fmtPct(Math.abs(dif))} · `}
                      {usa2 ? `${fmtPct(l2.pctSecoes)} das seções` : '1º turno'}
                    </span>
                  </div>
                  {a && b && apurado(l) ? (
                    <div title={lider ? `${lider.nome.split(' ')[0]} +${fmtPct(Math.abs(dif))}${usa2 ? '' : ' (1º turno)'}` : 'empate'}>
                      <div className="mt-1.5 flex items-baseline justify-between text-sm font-semibold tabular-nums">
                        <span style={{ color: cor(a) }}>{fmtPct(pct(va, l))}</span>
                        <span style={{ color: cor(b) }}>{fmtPct(pct(vb, l))}</span>
                      </div>
                      <div className="mt-0.5 flex h-2 gap-0.5 overflow-hidden rounded bg-zinc-800">
                        <div style={{ width: `${pct(va, l)}%`, background: cor(a) }} />
                        <div className="flex-1" />
                        <div style={{ width: `${pct(vb, l)}%`, background: cor(b) }} />
                      </div>
                      <p className="mt-1 flex justify-between gap-3 text-xs tabular-nums text-zinc-300">
                        <span>{fmtInt(va)} votos</span>
                        <span>{fmtInt(vb)} votos</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-400">Sem dados desta região nesta atualização.</p>
                  )}
                </summary>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  {ufs
                    .sort((x, y) => x.chave.localeCompare(y.chave))
                    .map((e) => {
                      const eu = apurado(porUf2.get(e.chave)) ? porUf2.get(e.chave)! : porUf1.get(e.chave);
                      const top = eu && apurado(eu) && eu.lider ? eu.votos[0] : null;
                      return (
                        <li key={e.chave}>
                          <button type="button" onClick={() => onUf(e.chave)} className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-zinc-800">
                            <span className="w-6 font-semibold">{e.chave.toUpperCase()}</span>
                            {top ? (
                              <>
                                <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: cor(top) }} />
                                <span className="tabular-nums text-zinc-300">{fmtPct(pct(top.votos, eu!))}</span>
                              </>
                            ) : (
                              <span className="text-zinc-400">sem votos</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
