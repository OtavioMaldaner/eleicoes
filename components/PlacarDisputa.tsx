'use client';

import { fmtInt, fmtPct } from '@/lib/formato';
import type { VotoCand } from '@/lib/mapas/agregar';
import { nomeBonito } from '@/lib/nome';
import { manchete, type Placar, type PrimeiroTurno } from '@/lib/placar';
import { SECOES_MINIMAS_PAIS, type Projecao } from '@/lib/projecao';
import { FotoCandidato } from './FotoCandidato';

type Props = {
  placar: Placar | null;
  eleito: VotoCand | null;
  cor: (v: VotoCand) => string;
  primeiro: PrimeiroTurno | null; // como terminou o 1º turno, na ordem do placar
  projecao: Projecao | null; // na ordem do placar
};

const umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

// Uma linha de comparação no mesmo desenho do placar: valor de A, rótulo no meio, valor de B.
function Comparacao({ rotulo, sub, a, b, corA, corB }: { rotulo: string; sub?: string; a: string; b: string; corA: string; corB: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2">
      <span className="text-lg font-semibold" style={{ color: corA }}>
        {a}
      </span>
      <span className="text-center leading-tight">
        <span className="block text-xs uppercase tracking-widest text-zinc-400">{rotulo}</span>
        {sub && <span className="block text-[11px] text-zinc-400">{sub}</span>}
      </span>
      <span className="text-right text-lg font-semibold" style={{ color: corB }}>
        {b}
      </span>
    </div>
  );
}

function Lado({ v, cor, direita }: { v: VotoCand; cor: string; direita?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${direita ? 'flex-row-reverse text-right' : ''}`}>
      <FotoCandidato id={v.id} cor={cor} />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold">{nomeBonito(v.nome).split(' ')[0]}</p>
        <p className="text-xs text-zinc-400">
          {v.partido} · {v.numero}
        </p>
      </div>
    </div>
  );
}

// Disputa do 2º turno de ponta a ponta: manchete, barra única com o marcador de 50% e o quanto falta apurar.
export function PlacarDisputa({ placar, eleito, cor, primeiro, projecao }: Props) {
  if (!placar) return null;
  const { a, b, pctA, pctB, votosA, votosB, semVotos } = placar;
  const projecaoLiberada = !!projecao && placar.pctApurado >= SECOES_MINIMAS_PAIS;
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Placar do 2º turno">
      <p className="text-center text-lg font-semibold sm:text-2xl" aria-live="polite">
        {manchete(placar, eleito)}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Lado v={a} cor={cor(a)} />
        <Lado v={b} cor={cor(b)} direita />
      </div>
      <div className="mt-3 flex items-baseline justify-between text-2xl font-semibold tabular-nums sm:text-3xl">
        <span style={{ color: semVotos ? undefined : cor(a) }}>{fmtPct(pctA)}</span>
        <span style={{ color: semVotos ? undefined : cor(b) }}>{fmtPct(pctB)}</span>
      </div>
      <div className="relative mt-1.5 h-4 overflow-hidden rounded bg-zinc-800" role="img" aria-label={`${fmtPct(pctA)} contra ${fmtPct(pctB)}`}>
        {!semVotos && (
          <>
            <div className="absolute inset-y-0 left-0" style={{ width: `${pctA}%`, background: cor(a) }} />
            <div className="absolute inset-y-0 right-0" style={{ width: `${pctB}%`, background: cor(b) }} />
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90" />
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs tabular-nums text-zinc-400">
        <span>{fmtInt(votosA)} votos</span>
        <span className="text-center">
          {fmtPct(placar.pctApurado)} apurado · faltam {fmtPct(placar.pctFaltam)} das seções
        </span>
        <span>{fmtInt(votosB)} votos</span>
      </div>
      {(primeiro || !eleito) && (
        <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 tabular-nums">
          {primeiro && <Comparacao rotulo="1º turno" a={fmtPct(primeiro.pctA)} b={fmtPct(primeiro.pctB)} corA={cor(a)} corB={cor(b)} />}
          {!eleito &&
            (projecaoLiberada ? (
              <Comparacao
                rotulo="Projeção"
                sub={`${projecao.empateTecnico ? 'empate técnico · ' : ''}margem ±${umaCasa.format(projecao.margem)} pts`}
                a={fmtPct(projecao.pctA)}
                b={fmtPct(projecao.pctB)}
                corA={cor(a)}
                corB={cor(b)}
              />
            ) : (
              <p className="text-center text-xs text-zinc-400">
                Projeção a partir de {SECOES_MINIMAS_PAIS}% das seções apuradas (agora {fmtPct(placar.pctApurado)}).
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
