'use client';

import type { Feature } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { comoResultado, entidadeDe, placar, porRegiao, vantagem, type CargoBrasil } from '@/lib/brasil/analise';
import { CARGOS_BRASIL } from '@/lib/brasil/fetch';
import { composicao } from '@/lib/brasil/camara';
import { placarSenado } from '@/lib/brasil/senado';
import { corPartido } from '@/lib/cores';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';
import { BASE } from '@/lib/tse/config';
import { useBrasil } from '@/lib/useBrasil';
import { useEstado } from '@/lib/useEstado';
import { useHistorico } from '@/lib/useHistorico';
import { useMarcados } from '@/lib/useMarcados';
import { GraficoEvolucao } from './GraficoEvolucao';
import { CartaoEstado } from './CartaoEstado';
import { MapaBrasil, type Pintura } from './MapaBrasil';
import { MapaCoropletico } from './MapaCoropletico';
import { PainelCamara } from './PainelCamara';
import { PainelSenado } from './PainelSenado';

const SEM_VOTOS = '#3f3f46';
const OUTROS = '#71717a';
const SEM_RESPOSTA = '#78350f';
const NEUTRO_CLARO = '#e4e4e7';
const INICIO_APURACAO = Date.parse('2026-10-04T17:00:00-03:00');
const chaveMunicipio = (f: Feature) => String(f.properties?.codarea ?? '');

type Modo = 'lider' | 'vantagem' | 'candidato';
const ABAS: { cargo: CargoBrasil; rotulo: string }[] = [
  { cargo: 'presidente', rotulo: 'Presidente' },
  { cargo: 'governador', rotulo: 'Governadores' },
  { cargo: 'senador', rotulo: 'Senado' },
  { cargo: 'depFederal', rotulo: 'Câmara' },
];

const pilula = (ativa: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${ativa ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`;
const cartao = 'rounded-2xl border border-zinc-800 bg-zinc-900 p-4';

function Amostra({ cor }: { cor: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor }} />;
}

function Contagem() {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    tique();
    const id = setInterval(tique, 1000);
    return () => clearInterval(id);
  }, []);
  if (agora === null) return null;
  const falta = Math.floor((INICIO_APURACAO - agora) / 1000);
  if (falta <= 0) return <p className="text-2xl font-semibold leading-tight">Aguardando os primeiros números do TSE</p>;
  const h = Math.floor(falta / 3600);
  const m = String(Math.floor((falta % 3600) / 60)).padStart(2, '0');
  const s = String(falta % 60).padStart(2, '0');
  return (
    <p className="text-2xl font-semibold leading-tight">
      A apuração começa em <span className="tabular-nums">{h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`}</span>
    </p>
  );
}

type PainelProps = { cargo: CargoBrasil; local: Local | undefined; cor: (v: VotoCand) => string; onBrasil?: () => void };

function PainelLocal({ cargo, local, cor, onBrasil }: PainelProps) {
  const [todos, setTodos] = useState(false);
  const c = CARGOS_BRASIL[cargo];
  if (!local) return <div className={`${cartao} text-sm text-zinc-400`}>Sem dados para este local nesta atualização.</div>;
  const ufFoto = cargo === 'presidente' ? 'br' : local.chave;
  const vagas = cargo === 'senador' ? 2 : 1;
  const lista = todos ? local.votos : local.votos.slice(0, 6);
  return (
    <section className={cartao} aria-label={`${c.nome} em ${local.nome}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          {c.nome} · {local.nome}
        </p>
        {onBrasil && (
          <button type="button" onClick={onBrasil} className="text-xs text-sky-300 underline underline-offset-2">
            {cargo === 'presidente' ? 'Ver Brasil' : 'Ver placar'}
          </button>
        )}
      </div>
      <div className="mt-2">
        {local.total === 0 ? (
          <Contagem />
        ) : (
          <p className="text-2xl font-semibold leading-tight">
            <span className="tabular-nums">{fmtPct(local.pctSecoes)}</span> das seções apuradas
          </p>
        )}
      </div>
      <ol className="mt-4 space-y-3">
        {lista.map((v, i) => {
          const pct = local.total ? (v.votos / local.total) * 100 : 0;
          return (
            <li key={v.id} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE}/${c.eleicao}/fotos/${ufFoto}/${v.id}.jpeg`}
                alt=""
                loading="lazy"
                className="h-11 w-11 shrink-0 rounded-full bg-zinc-800 object-cover object-top"
                style={{ boxShadow: `0 0 0 2px #18181b, 0 0 0 4px ${cor(v)}` }}
                onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {v.nome}
                    {local.total > 0 && i < vagas && cargo === 'senador' && (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-300">na vaga</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtPct(pct)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
                  <div className="h-full rounded" style={{ width: `${Math.min(pct, 100)}%`, background: cor(v) }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-zinc-400">
                  <span>
                    {v.partido} · {v.numero}
                  </span>
                  <span className="tabular-nums">{fmtInt(v.votos)} votos</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {local.votos.length > 6 && (
        <button
          type="button"
          onClick={() => setTodos(!todos)}
          className="mt-3 w-full rounded-full border border-zinc-700 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          {todos ? 'Mostrar só os 6 primeiros' : `Ver todos os ${local.votos.length}`}
        </button>
      )}
      <dl className="mt-4 space-y-1 border-t border-zinc-800 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-400">Seções</dt>
          <dd className="tabular-nums">
            {fmtInt(local.secoesTotalizadas)} de {fmtInt(local.secoes)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-400">Eleitorado</dt>
          <dd className="tabular-nums">{fmtInt(local.eleitorado ?? 0)}</dd>
        </div>
      </dl>
    </section>
  );
}

type PlacarProps = { cargo: CargoBrasil; estados: Local[]; linhas: { chave: string; estados: string[] }[]; cor: (k: string) => string };

// Visão do país nos cargos estaduais: quantos estados cada partido lidera.
function Placar({ cargo, estados, linhas, cor }: PlacarProps) {
  const comVotos = estados.filter((l) => l.total > 0).length;
  return (
    <section className={cartao} aria-label={`${CARGOS_BRASIL[cargo].nome}: estados liderados por partido`}>
      <p className="text-xs uppercase tracking-widest text-zinc-400">{CARGOS_BRASIL[cargo].nome} · Brasil</p>
      <div className="mt-2">
        {comVotos === 0 ? (
          <Contagem />
        ) : (
          <p className="text-2xl font-semibold leading-tight">
            <span className="tabular-nums">{comVotos}</span> de 27 estados com votos apurados
          </p>
        )}
      </div>
      <h2 className="mt-4 text-sm font-semibold">Estados em que cada partido lidera</h2>
      {linhas.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Ainda sem líder em nenhum estado.</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {linhas.map((l) => (
            <li key={l.chave} className="flex items-baseline gap-2 text-sm">
              <span className="relative top-0.5">
                <Amostra cor={cor(l.chave)} />
              </span>
              <span className="w-28 shrink-0 truncate font-medium">{l.chave}</span>
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums">{l.estados.length}</span>
              <span className="text-xs text-zinc-400">{l.estados.map((u) => u.toUpperCase()).join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
        {cargo === 'senador' && 'Cada estado elege dois senadores; aqui conta só o mais votado. '}
        Clique num estado no mapa ou na lista para ver os candidatos.
      </p>
    </section>
  );
}

export function Brasil() {
  const [cargo, setCargo] = useState<CargoBrasil>('presidente');
  const [modo, setModo] = useState<Modo>('lider');
  const [foco, setFoco] = useState<string | null>(null);
  const [ufEscolhida, setUfEscolhida] = useState<string | null>(null);
  const [munSel, setMunSel] = useState<string | null>(null);
  const setUf = (k: string | null) => {
    setUfEscolhida(k);
    setMunSel(null);
  };
  const estadoSel = useEstado(ufEscolhida, cargo);
  const { dados, erro, eventos } = useBrasil(cargo);

  // Curva de presidente no país, registrada enquanto a aba Presidente está aberta.
  const { marcados } = useMarcados();
  const nacional = useMemo(() => (dados?.nacional ? { cargos: [comoResultado(dados.nacional)], buscadoEm: dados.buscadoEm } : null), [dados]);
  const historico = useHistorico('brasil', nacional, marcados);

  const [ufs, setUfs] = useState<Feature[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/geo/ufs.geojson')
      .then((r) => r.json())
      .then((g) => vivo && setUfs(g.features))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const estados = dados?.estados ?? [];
  const ent = entidadeDe(cargo);
  const vagas = cargo === 'senador' ? 2 : 1;

  // Cor por entidade (candidato ou partido). Quem já recebeu cor a mantém.
  const peso = new Map<string, number>();
  for (const l of estados) for (const v of l.votos) peso.set(ent(v), (peso.get(ent(v)) ?? 0) + v.votos);
  // As cores vão primeiro para quem lidera mais estados; em caso de igualdade, para quem tem mais votos.
  const lideres = placar(estados, ent)
    .sort((a, b) => b.estados.length - a.estados.length || (peso.get(b.chave) ?? 0) - (peso.get(a.chave) ?? 0))
    .map((l) => l.chave);
  // No Senado, a cor vai para os partidos que ocupam mais vagas (duas por estado).
  const comCor =
    cargo === 'senador'
      ? placarSenado(estados).partidos.map((p) => p.partido)
      : cargo === 'depFederal'
        ? composicao(estados)
            .bancadas.filter((b) => b.vagas > 0)
            .map((b) => b.nome)
        : lideres;
  // Cada candidato ou bancada tem a cor do seu partido.
  const partidoDoCandidato = new Map([...(dados?.nacional ? [dados.nacional] : []), ...estados].flatMap((l) => l.votos).map((v) => [v.id, v.partido]));
  const corEnt = (k: string) => corPartido(cargo === 'presidente' ? (partidoDoCandidato.get(k) ?? k) : k);
  const cor = (v: VotoCand) => corPartido(v.partido);

  const porUf = new Map(estados.map((l) => [l.chave, l]));
  const semResposta = new Set(dados?.semResposta ?? []);
  const uf = ufEscolhida;
  const local = dados?.nacional ?? undefined;
  const candidatos = dados?.nacional?.votos ?? [];
  const focoId = foco ?? candidatos[0]?.id ?? null;
  const modoAtivo: Modo = modo === 'candidato' && cargo !== 'presidente' ? 'lider' : modo;

  // A mesma regra de cor vale para um estado no mapa do país e para um município no mapa do estado.
  function pinturaLocal(l: Local | undefined, faltou: boolean): Pintura {
    if (!l) return { fill: faltou ? SEM_RESPOSTA : SEM_VOTOS, opacidade: 1 };
    if (l.total === 0) return { fill: SEM_VOTOS, opacidade: 1 };
    if (modoAtivo === 'candidato' && focoId) {
      const v = l.votos.find((x) => x.id === focoId);
      const fatia = v ? v.votos / l.total : 0;
      // Tom neutro: neste modo a cor não identifica quem lidera.
      return { fill: NEUTRO_CLARO, opacidade: 0.1 + 0.9 * Math.min(fatia / 0.7, 1) };
    }
    if (!l.lider) return { fill: OUTROS, opacidade: 1 };
    return { fill: cor(l.votos[0]), opacidade: modoAtivo === 'vantagem' ? 0.3 + 0.7 * Math.min(vantagem(l, vagas) / 30, 1) : 1 };
  }
  const pintura = (k: string) => pinturaLocal(porUf.get(k), semResposta.has(k));

  // Estado selecionado: mapa por município e cartão com os três cargos.
  const porMun = new Map((estadoSel.municipios?.municipios ?? []).map((l) => [l.chave, l]));
  const munAtual = munSel ? porMun.get(munSel) : undefined;
  const nomeUf = uf ? (porUf.get(uf)?.nome ?? uf.toUpperCase()) : '';
  const corPara = (_c: CargoBrasil, v: VotoCand) => corPartido(v.partido);
  const rotuloMun = (k: string) => {
    const l = porMun.get(k);
    if (!l) return 'Sem dado deste município';
    if (l.total === 0) return `${l.nome}: sem votos apurados`;
    return l.lider ? `${l.nome}: ${l.votos[0].nome} lidera com ${fmtPct((l.votos[0].votos / l.total) * 100)}` : `${l.nome}: empate`;
  };

  const rotuloUf = (k: string) => {
    const l = porUf.get(k);
    if (!l) return `${k.toUpperCase()}: sem resposta do TSE`;
    if (l.total === 0) return `${l.nome}: sem votos apurados`;
    const p = l.votos[0];
    return l.lider
      ? `${l.nome}: ${p.nome}${p.partido !== p.nome ? ` (${p.partido})` : ''} lidera com ${fmtPct((p.votos / l.total) * 100)}`
      : `${l.nome}: empate`;
  };

  const nomeEnt = (k: string) =>
    cargo === 'presidente' ? (candidatos.find((v) => v.id === k)?.nome ?? estados.flatMap((l) => l.votos).find((v) => v.id === k)?.nome ?? k) : k;
  const presidente = nacional?.cargos ?? [];
  const hora = dados ? new Date(dados.buscadoEm).toLocaleTimeString('pt-BR') : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex rounded-full border border-zinc-800 bg-zinc-900 p-1" role="group" aria-label="Cargo">
          {ABAS.map((a) => (
            <button key={a.cargo} type="button" aria-pressed={cargo === a.cargo} onClick={() => setCargo(a.cargo)} className={pilula(cargo === a.cargo)}>
              {a.rotulo}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 p-1" role="group" aria-label="Cor do mapa">
          <button type="button" aria-pressed={modoAtivo === 'lider'} onClick={() => setModo('lider')} className={pilula(modoAtivo === 'lider')}>
            Líder
          </button>
          <button type="button" aria-pressed={modoAtivo === 'vantagem'} onClick={() => setModo('vantagem')} className={pilula(modoAtivo === 'vantagem')}>
            Vantagem
          </button>
          {cargo === 'presidente' && (
            <button type="button" aria-pressed={modoAtivo === 'candidato'} onClick={() => setModo('candidato')} className={pilula(modoAtivo === 'candidato')}>
              Candidato
            </button>
          )}
        </div>
        {modoAtivo === 'candidato' && (
          <select
            value={focoId ?? ''}
            onChange={(e) => setFoco(e.target.value)}
            aria-label="Candidato do mapa"
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          >
            {candidatos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome} ({v.partido})
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          {dados && <span>Atualizado às {hora}</span>}
          <button
            type="button"
            onClick={() => {
              // Nem todo navegador permite tela cheia (iPhone, por exemplo).
              if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
              else document.documentElement.requestFullscreen?.().catch(() => {});
            }}
            className="rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            Tela cheia
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          {dados ? `Dados desatualizados: a última atualização falhou (${erro}).` : `Não foi possível carregar os resultados (${erro}). Nova tentativa em 30s.`}
        </p>
      )}
      {!dados && !erro && <p className="text-zinc-400">Carregando os 27 estados…</p>}

      {dados && (
        <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)_330px]">
          <div className="space-y-4">
            {cargo === 'depFederal' ? (
              <PainelCamara
                titulo={uf ? (porUf.get(uf)?.nome ?? uf.toUpperCase()) : 'Brasil'}
                locais={uf ? estados.filter((l) => l.chave === uf) : estados}
                cor={corEnt}
                onBrasil={uf ? () => setUf(null) : undefined}
                contagem={<Contagem />}
              />
            ) : cargo === 'senador' ? (
              <PainelSenado estados={estados} cor={corEnt} onUf={setUf} contagem={<Contagem />} />
            ) : cargo !== 'presidente' ? (
              <Placar cargo={cargo} estados={estados} linhas={placar(estados, ent)} cor={corEnt} />
            ) : (
              <PainelLocal key={cargo} cargo={cargo} local={local} cor={cor} />
            )}
            {cargo === 'presidente' && presidente.length > 0 && <GraficoEvolucao cargos={presidente} historico={historico} marcados={marcados} />}
          </div>

          <section className={`${cartao} order-first xl:order-none`} aria-label="Mapa">
            {uf && cargo !== 'depFederal' ? (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <button type="button" onClick={() => setUf(null)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800">
                    ‹ Brasil
                  </button>
                  <span className="font-semibold">{nomeUf}</span>
                  <span className="text-xs text-zinc-500">por município · atualiza a cada 90s</span>
                </div>
                {estadoSel.contornos && estadoSel.municipios ? (
                  <div className="mx-auto max-w-[760px]">
                    <MapaCoropletico
                      titulo={`Mapa de ${nomeUf} por município`}
                      features={estadoSel.contornos}
                      chaveDe={chaveMunicipio}
                      projecao="plana"
                      proporcao={0.85}
                      cor={(k) => pinturaLocal(porMun.get(k), true).fill}
                      opacidade={(k) => pinturaLocal(porMun.get(k), true).opacidade}
                      rotulo={rotuloMun}
                      selecionado={munSel}
                      onSelecionar={setMunSel}
                    />
                  </div>
                ) : (
                  <p className="py-16 text-center text-sm text-zinc-400">
                    {estadoSel.erroMunicipios
                      ? `Não foi possível carregar os municípios (${estadoSel.erroMunicipios}).`
                      : `Carregando os municípios de ${nomeUf}…`}
                  </p>
                )}
                <p className="mt-2 min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                  {munAtual ? (
                    <>
                      <span className="font-semibold">{munAtual.nome}</span>{' '}
                      <span className="text-xs text-zinc-400">{fmtPct(munAtual.pctSecoes)} das seções</span>
                      {munAtual.total > 0 ? (
                        munAtual.votos.slice(0, 3).map((v) => (
                          <span key={v.id} className="ml-3 inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Amostra cor={cor(v)} /> {v.nome} <span className="tabular-nums text-zinc-300">{fmtPct((v.votos / munAtual.total) * 100)}</span>
                          </span>
                        ))
                      ) : (
                        <span className="ml-3 text-zinc-400">sem votos apurados</span>
                      )}
                    </>
                  ) : (
                    <span className="text-zinc-500">Passe o mouse ou toque num município para ver os votos.</span>
                  )}
                </p>
                {(estadoSel.municipios?.falhas ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-amber-300">{estadoSel.municipios!.falhas} municípios não responderam nesta atualização.</p>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-[760px]">
                <MapaBrasil features={ufs} pintura={pintura} rotulo={rotuloUf} selecionado={uf} onSelecionar={setUf} />
              </div>
            )}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
              {comCor.map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <Amostra cor={corEnt(k)} /> {nomeEnt(k)}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <Amostra cor={OUTROS} /> Empate
              </li>
              <li className="flex items-center gap-1.5">
                <Amostra cor={SEM_VOTOS} /> Sem votos apurados
              </li>
              {semResposta.size > 0 && (
                <li className="flex items-center gap-1.5">
                  <Amostra cor={SEM_RESPOSTA} /> Sem resposta do TSE
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">
              {modoAtivo === 'lider' && (uf && cargo !== 'depFederal' ? 'Cada município tem a cor de quem lidera. ' : 'Cada estado tem a cor de quem lidera. ')}
              {modoAtivo === 'vantagem' && 'Cor de quem lidera; mais forte quanto maior a distância para o segundo (máximo em 30 pontos). '}
              {modoAtivo === 'candidato' && 'Mais forte quanto maior o percentual do candidato escolhido (máximo em 70%). '}
              {cargo === 'depFederal' ? 'A cor é a do partido da bancada mais votada no estado. ' : 'A cor é a do partido. '}
              {uf && cargo !== 'depFederal' ? 'Use “‹ Brasil” para voltar ao mapa do país.' : 'Clique num estado para ver os municípios e os três cargos.'}
            </p>
          </section>

          <div className="space-y-4">
            {uf && <CartaoEstado uf={uf} nome={nomeUf} estado={estadoSel.resumo} cor={corPara} onFechar={() => setUf(null)} />}
            <section className={`${cartao} ${uf ? 'hidden' : ''}`}>
              <h2 className="mb-2 text-base font-semibold">
                {cargo === 'presidente' ? 'Por região' : cargo === 'depFederal' ? 'Bancada mais votada em cada estado' : 'Quem lidera em cada estado'}
              </h2>
              {cargo === 'presidente' ? (
                <ul className="divide-y divide-zinc-800">
                  {porRegiao(estados).map((r) => (
                    <li key={r.chave} className="py-2">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{r.nome}</span>
                        <span className="text-xs tabular-nums text-zinc-400">{fmtPct(r.pctSecoes)} das seções</span>
                      </div>
                      <div className="mt-1 flex h-2 overflow-hidden rounded bg-zinc-800">
                        {r.total > 0 &&
                          r.votos
                            .slice(0, 4)
                            .map((v) => <div key={v.id} style={{ width: `${(v.votos / r.total) * 100}%`, background: cor(v), marginRight: 2 }} />)}
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        {r.total === 0
                          ? 'Sem votos apurados'
                          : r.lider
                            ? `${r.votos[0].nome} ${fmtPct((r.votos[0].votos / r.total) * 100)} · ${r.votos[1]?.nome ?? ''} ${r.votos[1] ? fmtPct((r.votos[1].votos / r.total) * 100) : ''}`
                            : 'Empate'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="max-h-[420px] divide-y divide-zinc-800 overflow-y-auto text-sm">
                  {[...estados]
                    .sort((a, b) => a.chave.localeCompare(b.chave))
                    .map((l) => (
                      <li key={l.chave}>
                        <button
                          type="button"
                          onClick={() => setUf(l.chave)}
                          className={`flex w-full items-center gap-2 px-1 py-1.5 text-left hover:bg-zinc-800 ${l.chave === uf ? 'bg-zinc-800' : ''}`}
                        >
                          <span className="w-7 font-semibold">{l.chave.toUpperCase()}</span>
                          {l.lider ? (
                            <>
                              <Amostra cor={cor(l.votos[0])} />
                              <span className="min-w-0 flex-1 truncate">
                                {l.votos[0].nome}{' '}
                                {l.votos[0].partido !== l.votos[0].nome && <span className="text-xs text-zinc-500">{l.votos[0].partido}</span>}
                              </span>
                              <span className="tabular-nums">{fmtPct((l.votos[0].votos / l.total) * 100)}</span>
                            </>
                          ) : (
                            <span className="flex-1 text-zinc-500">{l.empate ? 'Empate' : 'Sem votos apurados'}</span>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section className={cartao} aria-live="polite">
              <h2 className="mb-2 text-base font-semibold">Últimas atualizações</h2>
              {eventos.length === 0 ? (
                <p className="text-sm text-zinc-400">Viradas, primeiros votos e marcos de cada estado aparecem aqui enquanto esta página estiver aberta.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {eventos.map((e, i) => (
                    <li key={`${e.t}-${e.uf}-${e.tipo}-${i}`} className="flex gap-2">
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {new Date(e.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{e.texto}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
