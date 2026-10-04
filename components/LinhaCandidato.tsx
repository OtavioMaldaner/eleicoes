'use client';

import type { Marca } from '@/lib/marcados';
import type { Candidato } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';

export function BotoesMarca({ id, marca, onMarcar }: { id: string; marca?: Marca; onMarcar: (id: string, m: Marca) => void }) {
  const base = 'rounded px-1.5 py-0.5 text-xs border';
  return (
    <span className="flex gap-1">
      <button
        type="button"
        aria-pressed={marca === 'votei'}
        title="Votei neste candidato"
        onClick={() => onMarcar(id, 'votei')}
        className={`${base} ${marca === 'votei' ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-amber-400'}`}
      >
        votei
      </button>
      <button
        type="button"
        aria-pressed={marca === 'acompanhar'}
        title="Acompanhar este candidato"
        onClick={() => onMarcar(id, 'acompanhar')}
        className={`${base} ${marca === 'acompanhar' ? 'border-sky-400 bg-sky-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-sky-400'}`}
      >
        acompanhar
      </button>
    </span>
  );
}

export function Situacao({ c }: { c: Candidato }) {
  const texto = c.eleito ? c.situacao || 'Eleito' : c.situacao;
  if (!texto) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${c.eleito ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-200'}`}>
      {texto}
    </span>
  );
}

type Props = { c: Candidato; marca?: Marca; naVaga: boolean; onMarcar: (id: string, m: Marca) => void };

export function LinhaCandidato({ c, marca, naVaga, onMarcar }: Props) {
  const borda = marca === 'votei' ? 'border-amber-400 bg-amber-400/10' : marca === 'acompanhar' ? 'border-sky-400 bg-sky-400/10' : 'border-transparent';
  return (
    <li className={`rounded border-l-4 px-2 py-1.5 ${borda}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate">
          <span className="mr-1 tabular-nums text-zinc-500">{c.posicao}º</span>
          <span className={naVaga ? 'font-semibold text-emerald-300' : 'font-medium'}>{c.nome}</span>
          <span className="ml-1 text-xs text-zinc-400">
            {c.partido} · {c.numero}
          </span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{fmtPct(c.percentual)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
        <div className={`h-full ${naVaga ? 'bg-emerald-400' : 'bg-zinc-500'}`} style={{ width: `${Math.min(c.percentual, 100)}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{fmtInt(c.votos)} votos</span>
          <Situacao c={c} />
        </span>
        <BotoesMarca id={c.id} marca={marca} onMarcar={onMarcar} />
      </div>
    </li>
  );
}
