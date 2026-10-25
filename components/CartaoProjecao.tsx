'use client';

import { fmtInt, fmtPct } from '@/lib/formato';
import type { VotoCand } from '@/lib/mapas/agregar';
import { SECOES_MINIMAS_PAIS, type Projecao } from '@/lib/projecao';

const umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

type Props = { projecao: Projecao | null; pctSecoes: number; finalistas: VotoCand[]; cor: (v: VotoCand) => string };

// Estimativa do resultado final. Fica sempre marcada como estimativa e só aparece com apuração suficiente.
export function CartaoProjecao({ projecao, pctSecoes, finalistas, cor }: Props) {
  const [a, b] = finalistas;
  const liberada = pctSecoes >= SECOES_MINIMAS_PAIS && !!projecao && !!a && !!b;
  return (
    <section className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-4" aria-label="Projeção do resultado">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400">Projeção</h2>
        <span className="flex gap-1.5">
          {liberada && projecao.empateTecnico && (
            <span className="rounded-full border border-sky-500/60 bg-sky-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-200">empate técnico</span>
          )}
          <span className="rounded-full border border-amber-500/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">estimativa</span>
        </span>
      </div>
      {!liberada ? (
        <p className="mt-2 text-sm text-zinc-400">
          A projeção aparece quando {SECOES_MINIMAS_PAIS}% das seções estiverem apuradas (agora {fmtPct(pctSecoes)}).
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline justify-between text-lg font-semibold tabular-nums">
            <span style={{ color: cor(a) }}>{fmtPct(projecao.pctA)}</span>
            <span style={{ color: cor(b) }}>{fmtPct(projecao.pctB)}</span>
          </div>
          <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded bg-zinc-800">
            <div style={{ width: `${projecao.pctA}%`, background: cor(a) }} />
            <div style={{ width: `${projecao.pctB}%`, background: cor(b) }} />
          </div>
          <p className="mt-1 flex justify-between text-xs text-zinc-400">
            <span>
              {a.nome.split(' ')[0]} ≈ {fmtInt(Math.round(projecao.a))}
            </span>
            <span>
              {b.nome.split(' ')[0]} ≈ {fmtInt(Math.round(projecao.b))}
            </span>
          </p>
          <p className="mt-2 text-xs text-zinc-300">
            {projecao.pctA === projecao.pctB
              ? 'Empate na projeção.'
              : projecao.empateTecnico
                ? 'Diferença dentro da margem de erro.'
                : `Projeção: ${(projecao.pctA > projecao.pctB ? a : b).nome.split(' ')[0]} à frente por ${fmtPct(Math.abs(projecao.pctA - projecao.pctB))} pontos.`}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">Margem de erro estimada: ±{umaCasa.format(projecao.margem)} pontos na diferença</p>
        </>
      )}
      <p className="mt-2 border-t border-zinc-800 pt-2 text-xs text-zinc-400">
        Não é resultado oficial. Estima o fim da apuração multiplicando o que já foi contado em cada estado pelo que falta e, onde ainda
        não há contagem suficiente, usa o 1º turno como base. Como a ordem da apuração pode favorecer um lado no começo, a diferença
        pode mudar bastante. A margem de erro diminui conforme a apuração avança, mas não é um intervalo estatístico formal. O resultado vale o do TSE.
      </p>
    </section>
  );
}
