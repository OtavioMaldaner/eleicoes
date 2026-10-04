'use client';

import type { Apuracao, Municipio, ResultadoCargo } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';

function Bloco({ titulo, a }: { titulo: string; a: Apuracao | null | undefined }) {
  if (!a) return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-500">{titulo}: sem dados</div>;
  const itens: [string, string][] = [
    ['Comparecimento', `${fmtInt(a.comparecimento)} (${fmtPct(a.pctComparecimento)})`],
    ['Abstenção', `${fmtInt(a.abstencao)} (${fmtPct(a.pctAbstencao)})`],
    ['Brancos', `${fmtInt(a.brancos)} (${fmtPct(a.pctBrancos)})`],
    ['Nulos', `${fmtInt(a.nulos)} (${fmtPct(a.pctNulos)})`],
  ];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        <span className="text-2xl font-bold tabular-nums">{fmtPct(a.pctSecoes)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Seções totalizadas, ${titulo}`}
        aria-valuenow={a.pctSecoes}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 overflow-hidden rounded bg-zinc-800"
      >
        <div className="h-full bg-emerald-400" style={{ width: `${Math.min(a.pctSecoes, 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {fmtInt(a.secoesTotalizadas)} de {fmtInt(a.secoesTotal)} seções · {fmtInt(a.eleitorado)} eleitores
        {a.finalizada && ' · totalização finalizada'}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        {itens.map(([k, v]) => (
          <div key={k}>
            <dt className="text-zinc-500">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-zinc-500">TSE: {a.atualizadoEm}</p>
    </div>
  );
}

type Props = { cargos: ResultadoCargo[]; buscadoEm: string; erro: string | null; municipio?: Municipio };

export function ApuracaoGlobal({ cargos, buscadoEm, erro, municipio }: Props) {
  // Todos os cargos desta página têm a mesma abrangência; o de governador é a referência.
  const a = cargos.find((c) => c.chave === 'governador')?.apuracao ?? cargos.find((c) => c.apuracao)?.apuracao;
  const hora = new Date(buscadoEm).toLocaleTimeString('pt-BR');
  return (
    <section aria-label="Apuração" className="space-y-2">
      {erro && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          Dados desatualizados: a última atualização falhou ({erro}). Exibindo o resultado das {hora}.
        </p>
      )}
      <Bloco titulo={municipio?.nm ?? 'Rio Grande do Sul'} a={a} />
      <p className="text-xs text-zinc-500">Última busca: {hora} · atualiza a cada 30s</p>
    </section>
  );
}
