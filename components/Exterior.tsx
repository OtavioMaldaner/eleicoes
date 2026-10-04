'use client';

import type { Feature } from 'geojson';
import { useEffect, useState } from 'react';
import { feature } from 'topojson-client';
import { CORES } from '@/lib/cores';
import { fmtInt, fmtPct } from '@/lib/formato';
import { atribuirSlotsComLimite } from '@/lib/historico';
import { somar, type Local } from '@/lib/mapas/agregar';
import { useMapas } from '@/lib/useMapas';
import { MapaCoropletico } from './MapaCoropletico';

const SEM_SECAO = '#232326';
const SEM_VOTOS = '#3f3f46';
const OUTROS = '#71717a';
const SEM_RESPOSTA = '#78350f';

const chavePais = (f: Feature) => String(f.properties?.name ?? '');

type Geo = { paises: Feature[] };

function useGeo() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch('/geo/paises-50m.json')
      .then((r) => r.json())
      .then((topo) => {
        if (!vivo) return;
        const paises = feature(topo, topo.objects.countries) as unknown as { features: Feature[] };
        setGeo({ paises: paises.features.filter((f) => f.properties?.name !== 'Antarctica') });
      })
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);
  return { geo, erro };
}

function Amostra({ cor }: { cor: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor }} />;
}

function Detalhe({ local, vazio, corDe }: { local: Local | undefined; vazio: string; corDe: (id: string) => string }) {
  if (!local) return <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">{vazio}</p>;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
      <p className="font-semibold">{local.nome}</p>
      <p className="text-xs text-zinc-400">
        {fmtPct(local.pctSecoes)} das seções ({fmtInt(local.secoesTotalizadas)} de {fmtInt(local.secoes)}) · {fmtInt(local.total)} votos em candidatos
      </p>
      {local.total === 0 ? (
        <p className="mt-2 text-zinc-400">Ainda sem votos apurados.</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {local.votos
            .filter((v) => v.votos > 0)
            .slice(0, 6)
            .map((v) => (
              <li key={v.id} className="flex items-center gap-2">
                <Amostra cor={corDe(v.id)} />
                <span className="truncate">{v.nome}</span>
                <span className="text-xs text-zinc-500">{v.partido}</span>
                <span className="ml-auto tabular-nums">
                  {fmtInt(v.votos)} · {fmtPct((v.votos / local.total) * 100)}
                </span>
              </li>
            ))}
        </ol>
      )}
      {local.empate && <p className="mt-2 text-xs text-zinc-400">Empate entre os dois primeiros.</p>}
      {local.cidades && <p className="mt-2 text-xs text-zinc-500">Cidades somadas: {local.cidades.join(', ')}</p>}
      {local.cidadesFaltando && <p className="mt-1 text-xs text-amber-300">Soma incompleta: sem resposta de {local.cidadesFaltando.join(', ')}.</p>}
    </div>
  );
}

function Tabela({
  locais,
  rotulo,
  selecionado,
  onSelecionar,
  corDe,
}: {
  locais: Local[];
  rotulo: string;
  selecionado: string | null;
  onSelecionar: (c: string) => void;
  corDe: (id: string) => string;
}) {
  const ordenados = [...locais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return (
    <details className="text-xs text-zinc-300">
      <summary className="cursor-pointer text-zinc-400">
        Ver lista ({locais.length} {rotulo})
      </summary>
      <div className="mt-2 max-h-80 overflow-y-auto">
        <table className="w-full text-left tabular-nums">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Local</th>
              <th className="font-normal">Lidera</th>
              <th className="text-right font-normal">Votos do líder</th>
              <th className="text-right font-normal">Seções</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((l) => {
              const lider = l.votos.find((v) => v.id === l.lider);
              return (
                <tr key={l.chave} className={`border-t border-zinc-800 ${l.chave === selecionado ? 'bg-zinc-800' : ''}`}>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => onSelecionar(l.chave)}
                      className="text-left underline decoration-zinc-600 underline-offset-2 hover:decoration-zinc-300"
                    >
                      {l.nome}
                    </button>
                    {l.cidadesFaltando && <span className="ml-1 text-amber-300">(incompleto)</span>}
                  </td>
                  <td>
                    {lider ? (
                      <span className="flex items-center gap-1.5">
                        <Amostra cor={corDe(lider.id)} />
                        {lider.nome}
                      </span>
                    ) : l.empate ? (
                      'Empate'
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-right">{lider ? `${fmtInt(lider.votos)} · ${fmtPct((lider.votos / l.total) * 100)}` : '—'}</td>
                  <td className="text-right">{fmtPct(l.pctSecoes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Exterior() {
  const { dados, erro } = useMapas();
  const { geo, erro: erroGeo } = useGeo();
  const [pais, setPais] = useState<string | null>(null);

  const paises = dados?.paises ?? [];
  const todos = paises;

  // Quem já liderou algum lugar mantém a cor, mesmo que deixe de liderar.
  const numero = new Map(todos.flatMap((l) => l.votos).map((v) => [v.id, Number(v.numero)]));
  const lideres = [...new Set(todos.flatMap((l) => (l.lider ? [l.lider] : [])))].sort((a, b) => (numero.get(a) ?? 0) - (numero.get(b) ?? 0));
  const [slots, setSlots] = useState<Record<string, number>>({});
  const novosSlots = atribuirSlotsComLimite(slots, lideres, CORES.length);
  if (novosSlots !== slots) setSlots(novosSlots);

  if (!dados) {
    return erro ? (
      <p role="alert" className="text-red-400">
        Não foi possível carregar os mapas ({erro}). Nova tentativa em 60s.
      </p>
    ) : (
      <p className="text-zinc-400">Carregando votos por país…</p>
    );
  }

  const porPais = new Map(paises.map((l) => [l.chave, l]));
  const corDe = (id: string) => (id in novosSlots && novosSlots[id] < CORES.length ? CORES[novosSlots[id]] : OUTROS);
  const semResposta = new Set(dados.semResposta);
  const corLocal = (l: Local | undefined, chave: string) =>
    !l ? (semResposta.has(chave) ? SEM_RESPOSTA : SEM_SECAO) : l.lider ? corDe(l.lider) : l.empate ? OUTROS : SEM_VOTOS;
  const nomeDe = (id: string) => todos.flatMap((l) => l.votos).find((v) => v.id === id);
  const rotulo = (l: Local | undefined, nome: string) => {
    if (!l) return semResposta.has(nome) ? `${nome}: sem resposta do TSE` : `${nome}: sem seção eleitoral`;
    const lider = l.votos.find((v) => v.id === l.lider);
    return lider ? `${l.nome}: ${lider.nome} lidera` : `${l.nome}: ${l.empate ? 'empate' : 'sem votos apurados'}`;
  };
  const hora = new Date(dados.buscadoEm).toLocaleTimeString('pt-BR');

  return (
    <div className="space-y-6">
      {erro && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          Dados desatualizados: a última atualização falhou ({erro}). Exibindo o resultado das {hora}.
        </p>
      )}
      {dados.falhas > 0 && (
        <p className="rounded-lg border border-amber-500 bg-amber-950 p-3 text-sm">
          {dados.falhas} {dados.falhas === 1 ? 'local não respondeu' : 'locais não responderam'} nesta atualização. Onde havia dado anterior ele foi mantido;
          países com soma incompleta estão marcados.
        </p>
      )}
      {todos.every((l) => l.total === 0) && (
        <p className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm">
          Ainda não há votos totalizados. O TSE só começa a divulgar a totalização às 17h (horário de Brasília), mesmo para os países onde a votação já
          terminou. O mapa se pinta sozinho quando os primeiros resultados chegarem.
        </p>
      )}
      {erroGeo && (
        <p className="rounded-lg border border-amber-500 bg-amber-950 p-3 text-sm">
          Não foi possível carregar os contornos do mapa. A lista de países continua funcionando.
        </p>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
        {Object.keys(novosSlots)
          .filter((id) => novosSlots[id] < CORES.length)
          .map((id) => {
            const c = nomeDe(id);
            return (
              <li key={id} className="flex items-center gap-1.5">
                <Amostra cor={corDe(id)} />
                {c?.nome ?? id} <span className="text-zinc-500">{c?.partido}</span>
              </li>
            );
          })}
        <li className="flex items-center gap-1.5">
          <Amostra cor={OUTROS} /> Empate{lideres.length > CORES.length ? ' / outros' : ''}
        </li>
        <li className="flex items-center gap-1.5">
          <Amostra cor={SEM_VOTOS} /> Sem votos apurados
        </li>
        <li className="flex items-center gap-1.5">
          <Amostra cor={SEM_SECAO} /> Sem seção eleitoral
        </li>
        {dados.semResposta.length > 0 && (
          <li className="flex items-center gap-1.5">
            <Amostra cor={SEM_RESPOSTA} /> Sem resposta do TSE
          </li>
        )}
        <li className="ml-auto text-zinc-500">Última busca: {hora} · atualiza a cada 60s</li>
      </ul>

      <section aria-labelledby="mapa-mundo" className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <h2 id="mapa-mundo" className="sr-only">
          Exterior por país
        </h2>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {geo && (
            <MapaCoropletico
              titulo="Mapa-múndi: quem lidera para presidente entre os eleitores brasileiros de cada país"
              features={geo.paises}
              chaveDe={chavePais}
              projecao="mundo"
              proporcao={0.5}
              cor={(k) => corLocal(porPais.get(k), k)}
              rotulo={(k) => rotulo(porPais.get(k), k)}
              selecionado={pais}
              onSelecionar={(k) => porPais.has(k) && setPais(k)}
            />
          )}
          <div className="space-y-3">
            <Detalhe local={{ ...somar('exterior', 'Todo o exterior', paises), cidades: undefined }} vazio="" corDe={corDe} />
            <Detalhe
              local={pais ? porPais.get(pais) : undefined}
              vazio="Passe o mouse ou toque num país com seção eleitoral brasileira. Países pequenos estão na lista abaixo."
              corDe={corDe}
            />
            <Tabela locais={paises} rotulo="países" selecionado={pais} onSelecionar={setPais} corDe={corDe} />
          </div>
        </div>
      </section>
    </div>
  );
}
