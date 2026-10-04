'use client';

import { vagasPorBancada } from '@/lib/bancadas';
import { corPartido } from '@/lib/cores';
import type { Marca, Marcados } from '@/lib/marcados';
import type { Candidato, ResultadoCargo } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';
import { BotoesMarca, Situacao } from './LinhaCandidato';

type Props = { cargos: ResultadoCargo[]; marcados: Marcados; alternar: (id: string, m: Marca) => void };

function Etiqueta({ children, destaque }: { children: React.ReactNode; destaque?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${destaque ? 'bg-emerald-400/15 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>{children}</span>
  );
}

function Cartao({ c, cargo, marca, alternar }: { c: Candidato; cargo: ResultadoCargo; marca: Marca; alternar: Props['alternar'] }) {
  // Nos proporcionais, o que decide é a posição dentro da bancada e quantas vagas ela tem.
  const bancada = cargo.bancadas?.find((b) => b.id === c.bancada);
  const { vagas, fonte } = vagasPorBancada(cargo.bancadas ?? [], cargo.vagas);
  const vagasDaBancada = bancada ? (vagas.get(bancada.id) ?? 0) : 0;
  const dentro = (c.posicaoBancada ?? Infinity) <= vagasDaBancada;
  const naVaga = !cargo.proporcional && c.votos > 0 && c.posicao <= cargo.vagas;
  const acima = cargo.candidatos[c.posicao - 2];
  const abaixo = cargo.candidatos[c.posicao];

  return (
    // min-w-0: sem isso, um nome comprido que não quebra alarga o cartão para fora da tela.
    <article className={`flex min-w-0 gap-3 rounded-xl border-2 bg-zinc-900 p-3 ${marca === 'votei' ? 'border-amber-400' : 'border-sky-400'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.fotoUrl}
        alt=""
        loading="lazy"
        className="h-20 w-16 shrink-0 rounded-lg bg-zinc-800 object-cover object-top"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] uppercase tracking-wide text-zinc-400">{cargo.nome}</p>
          <Situacao c={c} />
        </div>
        <p className="truncate font-semibold leading-tight">{c.nome}</p>
        <p className="truncate text-xs text-zinc-400">
          {c.partido} · {c.numero}
        </p>

        <div className="mt-2 flex items-baseline justify-between gap-2 tabular-nums">
          <span>
            <span className="text-xl font-bold">{fmtInt(c.votos)}</span> <span className="text-xs text-zinc-400">votos</span>
          </span>
          <span className="text-lg font-semibold">{fmtPct(c.percentual)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
          <div className="h-full rounded" style={{ width: `${Math.min(c.percentual, 100)}%`, background: corPartido(c.partido) }} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <Etiqueta destaque={naVaga}>
            {c.posicao}º de {cargo.candidatos.length}
            {naVaga && (cargo.vagas === 1 ? ' · lidera' : ' · na vaga')}
          </Etiqueta>
          {bancada && fonte !== 'nenhuma' ? (
            <Etiqueta destaque={dentro}>
              {c.posicaoBancada}º de {vagasDaBancada} {vagasDaBancada === 1 ? 'vaga' : 'vagas'} na bancada · {dentro ? 'dentro' : 'fora'}
              {fonte === 'projecao' ? ' (projeção)' : ''}
            </Etiqueta>
          ) : (
            <Etiqueta>
              {c.posicaoPartido}º no {c.partido}
            </Etiqueta>
          )}
        </div>

        {(acima || abaixo) && c.votos > 0 && (
          <p className="mt-1.5 text-xs tabular-nums text-zinc-400">
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
        )}

        <div className="mt-2 flex justify-end">
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
  const votei = itens.filter((i) => i.marca === 'votei').length;

  return (
    <section aria-labelledby="meus">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="meus" className="text-lg font-semibold">
          Meus candidatos
        </h2>
        {itens.length > 0 && (
          <p className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> votei ({votei})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" /> acompanho ({itens.length - votei})
            </span>
          </p>
        )}
      </div>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
          Use os botões “votei” e “acompanhar” nas listas abaixo para trazer candidatos para cá.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {itens.map(({ c, cargo, marca }) => (
            <Cartao key={c.id} c={c} cargo={cargo} marca={marca} alternar={alternar} />
          ))}
        </div>
      )}
    </section>
  );
}
