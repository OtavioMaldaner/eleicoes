'use client';

import { vagasPorBancada } from '@/lib/bancadas';
import type { Marca, Marcados } from '@/lib/marcados';
import type { Candidato, ResultadoCargo } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';
import { BotoesMarca, Situacao } from './LinhaCandidato';

type Props = { cargos: ResultadoCargo[]; marcados: Marcados; alternar: (id: string, m: Marca) => void };

function Cartao({ c, cargo, marca, alternar }: { c: Candidato; cargo: ResultadoCargo; marca: Marca; alternar: Props['alternar'] }) {
  // Nos proporcionais, o que decide é a posição dentro da bancada e quantas vagas ela tem.
  const bancada = cargo.bancadas?.find((b) => b.id === c.bancada);
  const { vagas, fonte } = vagasPorBancada(cargo.bancadas ?? [], cargo.vagas);
  const vagasDaBancada = bancada ? (vagas.get(bancada.id) ?? 0) : 0;
  const acima = cargo.candidatos[c.posicao - 2];
  const abaixo = cargo.candidatos[c.posicao];
  return (
    <article className={`flex gap-3 rounded-lg border-2 bg-zinc-900 p-3 ${marca === 'votei' ? 'border-amber-400' : 'border-sky-400'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.fotoUrl}
        alt=""
        loading="lazy"
        className="h-20 w-16 shrink-0 rounded bg-zinc-800 object-cover"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          {cargo.nome} · {marca === 'votei' ? 'votei' : 'acompanhando'}
        </p>
        <p className="truncate font-semibold">{c.nome}</p>
        <p className="truncate text-xs text-zinc-400">
          {c.partido} · {c.numero}
          {c.vice && <> · vice/suplentes: {c.vice}</>}
        </p>
        <p className="mt-1 tabular-nums">
          <span className="text-lg font-bold">{fmtInt(c.votos)}</span> votos · {fmtPct(c.percentual)}
        </p>
        <p className="text-xs text-zinc-300">
          {c.posicao}º de {cargo.candidatos.length} · {c.posicaoPartido}º no {c.partido} · {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
        </p>
        {bancada && fonte !== 'nenhuma' && (
          <p className={`text-xs ${(c.posicaoBancada ?? Infinity) <= vagasDaBancada ? 'text-emerald-300' : 'text-zinc-300'}`}>
            {c.posicaoBancada}º na bancada {bancada.nome}, que tem {vagasDaBancada} {vagasDaBancada === 1 ? 'vaga' : 'vagas'}
            {fonte === 'projecao' ? ' (projeção)' : ''}: {(c.posicaoBancada ?? Infinity) <= vagasDaBancada ? 'dentro das vagas' : 'fora das vagas'}
          </p>
        )}
        <p className="text-xs tabular-nums text-zinc-400">
          {acima && (
            <>
              {fmtInt(acima.votos - c.votos)} atrás de {acima.nome}
            </>
          )}
          {acima && abaixo && ' · '}
          {abaixo && (
            <>
              {fmtInt(c.votos - abaixo.votos)} à frente de {abaixo.nome}
            </>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <Situacao c={c} />
          <BotoesMarca id={c.id} marca={marca} onMarcar={alternar} />
        </div>
      </div>
    </article>
  );
}

export function MeusCandidatos({ cargos, marcados, alternar }: Props) {
  const itens = cargos
    .flatMap((cargo) => cargo.candidatos.filter((c) => marcados[c.id]).map((c) => ({ c, cargo, marca: marcados[c.id] })))
    .sort((a, b) => Number(b.marca === 'votei') - Number(a.marca === 'votei'));

  return (
    <section aria-labelledby="meus">
      <h2 id="meus" className="mb-2 text-lg font-semibold">
        Meus candidatos
      </h2>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
          Use os botões “votei” e “acompanhar” nas listas abaixo para trazer candidatos para cá.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map(({ c, cargo, marca }) => (
            <Cartao key={c.id} c={c} cargo={cargo} marca={marca} alternar={alternar} />
          ))}
        </div>
      )}
    </section>
  );
}
