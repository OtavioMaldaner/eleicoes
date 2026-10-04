'use client';

import { composicao } from '@/lib/brasil/camara';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local } from '@/lib/mapas/agregar';
import { Hemiciclo, type Cadeira } from './Hemiciclo';

const VAGA_ABERTA = '#3f3f46';
const MAIS_VOTADOS = 12;

type Props = { titulo: string; locais: Local[]; cor: (bancada: string) => string; onBrasil?: () => void; contagem: React.ReactNode };

// Câmara dos Deputados no país ou num estado: cadeiras por bancada e os mais votados.
export function PainelCamara({ titulo, locais, cor, onBrasil, contagem }: Props) {
  const c = composicao(locais);
  const totalVotos = c.bancadas.reduce((s, b) => s + b.votos, 0);
  const comVagas = c.bancadas.filter((b) => b.vagas > 0);
  const distribuidas = comVagas.reduce((s, b) => s + b.vagas, 0);
  const cadeiras: Cadeira[] = [
    ...comVagas.flatMap((b) =>
      Array.from({ length: b.vagas }, () => ({
        cor: cor(b.nome),
        opacidade: c.projecao ? 0.6 : 1,
        titulo: `${b.nome}: ${b.vagas} ${b.vagas === 1 ? 'vaga' : 'vagas'}`,
      })),
    ),
    ...Array.from({ length: Math.max(c.vagas - distribuidas, 0) }, () => ({ cor: VAGA_ABERTA, titulo: 'Vaga ainda sem dono' })),
  ];
  const fileiras = c.vagas > 200 ? 11 : c.vagas > 40 ? 4 : 3;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label={`Câmara dos Deputados: ${titulo}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Câmara · {titulo}</p>
        {onBrasil ? (
          <button type="button" onClick={onBrasil} className="text-xs text-sky-300 underline underline-offset-2">
            Ver Brasil
          </button>
        ) : (
          <p className="text-xs text-zinc-500">{c.vagas} vagas</p>
        )}
      </div>
      {totalVotos === 0 && <div className="mt-2">{contagem}</div>}

      <div className="mt-3">
        {c.vagas > 0 && (
          <Hemiciclo cadeiras={cadeiras} fileiras={fileiras} rotulo={`Câmara dos Deputados, ${titulo}: ${c.eleitos} eleitos de ${c.vagas}`}>
            <span className="block text-3xl font-semibold tabular-nums">{c.eleitos}</span>
            <span className="text-xs text-zinc-400">eleitos de {c.vagas}</span>
          </Hemiciclo>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {totalVotos === 0
          ? 'As cadeiras ganham cor quando houver votos apurados.'
          : c.projecao
            ? 'Cadeiras projetadas por nós pelas maiores médias em cada estado, sem as cláusulas de desempenho. O TSE ainda não informou as vagas de todos os estados.'
            : 'Vagas informadas pelo TSE.'}
      </p>

      {totalVotos > 0 && (
        <>
          <h2 className="mt-4 border-t border-zinc-800 pt-3 text-sm font-semibold">Bancadas</h2>
          <ul className="mt-1 max-h-72 divide-y divide-zinc-800 overflow-y-auto pr-1 text-sm">
            {c.bancadas
              .filter((b) => b.votos > 0)
              .map((b) => (
                <li key={b.nome} className="flex items-center gap-2 py-1.5">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: b.vagas > 0 ? cor(b.nome) : VAGA_ABERTA }} />
                  <span className="min-w-0 flex-1 truncate" title={b.nome}>
                    {b.nome}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-400">{fmtPct((b.votos / totalVotos) * 100)}</span>
                  <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{b.vagas}</span>
                </li>
              ))}
          </ul>

          <h2 className="mt-4 border-t border-zinc-800 pt-3 text-sm font-semibold">Mais votados {onBrasil ? 'do estado' : 'do Brasil'}</h2>
          <ol className="mt-1 space-y-1.5 text-sm">
            {c.maisVotados.slice(0, MAIS_VOTADOS).map((v, i) => (
              <li key={`${v.uf}-${v.id}`} className="flex items-baseline gap-2">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-500">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {v.nome}{' '}
                  <span className="text-xs text-zinc-500">
                    {v.partido} · {v.uf.toUpperCase()}
                  </span>
                  {v.eleito && <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-300">eleito</span>}
                </span>
                <span className="shrink-0 tabular-nums">{fmtInt(v.votos)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {!onBrasil && <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">Clique num estado no mapa ou na lista para ver a bancada dele.</p>}
    </section>
  );
}
