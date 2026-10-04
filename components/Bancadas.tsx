'use client';

import { Fragment, useState } from 'react';
import { vagasPorBancada } from '@/lib/bancadas';
import { CORES } from '@/lib/cores';
import { fmtInt, fmtPct } from '@/lib/formato';
import { atribuirSlotsComLimite } from '@/lib/historico';
import type { Marca, Marcados } from '@/lib/marcados';
import type { ResultadoCargo } from '@/lib/tse/types';
import { Hemiciclo, type Cadeira } from './Hemiciclo';
import { LinhaCandidato } from './LinhaCandidato';

const SEM_COR = '#71717a';
const VAGA_ABERTA = '#3f3f46';
const SEM_SLOTS: Record<string, number> = {};

type Props = { cargo: ResultadoCargo; marcados: Marcados; alternar: (id: string, m: Marca) => void };

// Partidos e federações de um cargo proporcional: votos, vagas e os candidatos de cada um.
export function Bancadas({ cargo, marcados, alternar }: Props) {
  const [aberta, setAberta] = useState<string | null>(null);
  const bancadas = cargo.bancadas ?? [];
  const { vagas, fonte } = vagasPorBancada(bancadas, cargo.vagas);
  const totalVotos = bancadas.reduce((s, b) => s + b.votos, 0);
  const comVagas = bancadas.filter((b) => (vagas.get(b.id) ?? 0) > 0).sort((a, b) => vagas.get(b.id)! - vagas.get(a.id)! || b.votos - a.votos);

  // Cor para as bancadas com mais vagas; as demais ficam em cinza.
  const [slots, setSlots] = useState(SEM_SLOTS);
  const novosSlots = atribuirSlotsComLimite(
    slots,
    comVagas.map((b) => b.id),
    CORES.length,
  );
  if (novosSlots !== slots) setSlots(novosSlots);
  const cor = (id: string) => (id in novosSlots && novosSlots[id] < CORES.length ? CORES[novosSlots[id]] : SEM_COR);

  const distribuidas = comVagas.reduce((s, b) => s + vagas.get(b.id)!, 0);
  const cadeiras: Cadeira[] = [
    ...comVagas.flatMap((b) =>
      Array.from({ length: vagas.get(b.id)! }, () => ({
        cor: cor(b.id),
        opacidade: fonte === 'tse' ? 1 : 0.55,
        titulo: `${b.nome}: ${vagas.get(b.id)} ${vagas.get(b.id) === 1 ? 'vaga' : 'vagas'}`,
      })),
    ),
    ...Array.from({ length: Math.max(cargo.vagas - distribuidas, 0) }, () => ({ cor: VAGA_ABERTA, titulo: 'Vaga ainda sem dono' })),
  ];
  const eleitos = cargo.candidatos.filter((c) => c.eleito).length;
  const lista = totalVotos > 0 ? bancadas : [...bancadas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div>
      <Hemiciclo cadeiras={cadeiras} fileiras={cargo.vagas > 40 ? 4 : 3} rotulo={`${cargo.nome}: ${cargo.vagas} vagas por bancada`}>
        <span className="block text-2xl font-semibold tabular-nums">{eleitos}</span>
        <span className="text-[11px] text-zinc-400">de {cargo.vagas} eleitos</span>
      </Hemiciclo>
      <p className="mt-2 text-xs text-zinc-500">
        {fonte === 'tse' && 'Vagas informadas pelo TSE.'}
        {fonte === 'projecao' && 'Vagas projetadas por nós pelas maiores médias, sem as cláusulas de desempenho. O TSE ainda não informou as vagas.'}
        {fonte === 'nenhuma' && 'As vagas aparecem quando houver votos apurados.'}
        {cargo.quociente ? ` Quociente eleitoral: ${fmtInt(cargo.quociente)} votos.` : ''}
      </p>

      <ul className="mt-2 divide-y divide-zinc-800">
        {lista.map((b) => {
          const n = vagas.get(b.id) ?? 0;
          const daBancada = cargo.candidatos.filter((c) => c.bancada === b.id);
          const meus = daBancada.filter((c) => marcados[c.id]).length;
          return (
            <li key={b.id}>
              <button
                type="button"
                aria-expanded={aberta === b.id}
                onClick={() => setAberta(aberta === b.id ? null : b.id)}
                className="flex w-full items-center gap-2 py-1.5 text-left text-sm hover:bg-zinc-800"
              >
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: n > 0 ? cor(b.id) : VAGA_ABERTA }} />
                <span className="min-w-0 flex-1 truncate" title={b.nome}>
                  {b.nome}
                  {meus > 0 && <span className="ml-1 text-xs text-amber-300">★</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-400">{totalVotos ? fmtPct((b.votos / totalVotos) * 100) : '—'}</span>
                <span className="w-7 shrink-0 text-right font-semibold tabular-nums">{n}</span>
              </button>
              {aberta === b.id && (
                <div className="pb-2">
                  <p className="px-1 text-xs text-zinc-500">
                    {fmtInt(b.votos)} votos ({fmtInt(b.votosNominais)} em candidatos, {fmtInt(b.votosLegenda)} de legenda) · {b.candidatos} candidatos
                  </p>
                  <ul className="mt-1 max-h-80 space-y-1 overflow-y-auto">
                    {daBancada.map((c) => (
                      <Fragment key={c.id}>
                        {n > 0 && c.posicaoBancada === n + 1 && (
                          <li className="my-1 border-t border-dashed border-zinc-600 pt-1 text-center text-[10px] uppercase tracking-wide text-zinc-500">
                            fora das {n} {n === 1 ? 'vaga' : 'vagas'} da bancada
                          </li>
                        )}
                        <LinhaCandidato c={c} marca={marcados[c.id]} naVaga={c.eleito || (n > 0 && (c.posicaoBancada ?? Infinity) <= n)} onMarcar={alternar} />
                      </Fragment>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-zinc-500">Percentual dos votos do cargo e número de vagas. ★ marca bancadas com candidatos seus.</p>
    </div>
  );
}
