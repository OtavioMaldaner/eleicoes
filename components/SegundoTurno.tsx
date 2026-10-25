'use client';

import type { Feature } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { comoResultado } from '@/lib/brasil/analise';
import type { EstadoSegundoTurno } from '@/lib/brasil/estado';
import { corPartido } from '@/lib/cores';
import { FAIXA_CANDIDATO, FAIXA_LIDER, FAIXA_LIDER_1T, EMPATE, SEM_VOTOS, pinturaDegrade } from '@/lib/degrade';
import { eleitoDe, foiEleito } from '@/lib/eleito';
import { mudancaPorEstado } from '@/lib/mudanca';
import { placar } from '@/lib/placar';
import { projetar } from '@/lib/projecao';
import { FAIXA_VARIACAO, pinturaVariacao } from '@/lib/variacao';
import { ABSTENCAO, FAIXA_ABSTENCAO, pinturaAbstencao } from '@/lib/abstencao';
import { contarLideres, raioVantagem, vantagens } from '@/lib/vantagem';
import { fmtInt, fmtPct, fmtVotosCurto, horaCurta } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';
import { useBrasil } from '@/lib/useBrasil';
import { useEstadoNaUrl } from '@/lib/useEstadoNaUrl';
import { useEstadoSegundoTurno } from '@/lib/useEstado';
import { adicionar, useHistorico, useHistoricos } from '@/lib/useHistorico';
import { instantes as instantesDe, localEm } from '@/lib/replay';
import { criarPonto } from '@/lib/historico';
import { useMarcados } from '@/lib/useMarcados';
import { Duelo, Linha } from './CartaoEstado';
import { AnaliseRegioes } from './AnaliseRegioes';
import { BuscaCidade } from './BuscaCidade';
import { Trilho } from './Trilho';
import { DicaEstado } from './DicaEstado';
import { SeloAtualizacao } from './SeloAtualizacao';
import { UltimasAtualizacoes } from './UltimasAtualizacoes';
import { GraficoEvolucao } from './GraficoEvolucao';
import { MapaBrasil, type Pintura } from './MapaBrasil';
import { MapaCoropletico } from './MapaCoropletico';
import { PainelCamara } from './PainelCamara';
import { CartaoProjecao } from './CartaoProjecao';
import { FotoCandidato } from './FotoCandidato';
import { LinhaDoTempo } from './LinhaDoTempo';
import { MaioresVantagens } from './MaioresVantagens';
import { MudancaPorEstado } from './MudancaPorEstado';
import { PlacarDisputa } from './PlacarDisputa';

const PRIMEIRO_TURNO_FINAL_MS = 10 * 60_000; // o 1º turno já acabou: basta rever de vez em quando

const pilula = (ativa: boolean) =>
  `relative z-10 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-3.5 ${ativa ? 'text-white' : 'text-zinc-300 hover:text-white'}`;
const chaveMunicipio = (f: Feature) => String(f.properties?.codarea ?? '');
const VARIACAO = '__variacao';
const VANTAGEM = '__vantagem'; // só no mapa do Brasil
const MODO_ABSTENCAO = '__abstencao'; // só no mapa do Brasil
const cartao = 'rounded-2xl border border-zinc-800 bg-zinc-900 p-4';
const apurado = (l: Local | null | undefined): l is Local => !!l && l.total > 0;
const pct = (v: VotoCand, l: Local) => (l.total ? (v.votos / l.total) * 100 : 0);
const cor = (v: VotoCand) => corPartido(v.partido);
const corDe = (_cargo: unknown, v: VotoCand) => cor(v);

function Amostra({ cor }: { cor: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor }} />;
}

function Secao({ titulo, direita, children }: { titulo: string; direita?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800 pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-widest text-zinc-400">{titulo}</h3>
        {direita && <span className="text-xs tabular-nums text-zinc-400">{direita}</span>}
      </div>
      {children}
    </div>
  );
}

const Aviso = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-zinc-400">{children}</p>;

// Disputa entre os dois primeiros, ou só a lista enquanto não há segundo colocado com votos.
function Disputa({ cargo, uf, l }: { cargo: 'presidente' | 'governador'; uf: string; l: Local }) {
  const [a, b] = l.votos;
  if (!a) return null;
  if (!b) return <Linha cargo={cargo} uf={uf} v={a} l={l} cor={corDe} />;
  return <Duelo cargo={cargo} uf={uf} a={a} b={b} l={l} cor={corDe} rotuloVantagem="Vantagem" />;
}

// Como o 1º turno terminou: os primeiros colocados, com o eleito marcado.
function PrimeiroTurno({ cargo, uf, l, n = 3 }: { cargo: 'presidente' | 'governador' | 'senador'; uf: string; l: Local | null; n?: number }) {
  if (!apurado(l)) return <Aviso>Sem dados do 1º turno.</Aviso>;
  return (
    <ol className="space-y-2">
      {l.votos.slice(0, n).map((v) => (
        <Linha key={v.id} cargo={cargo} uf={uf} v={v} l={l} cor={corDe} selo={foiEleito(v) ? 'eleito' : undefined} />
      ))}
    </ol>
  );
}

function CartaoEstado({ uf, nome, dados, onFechar }: { uf: string; nome: string; dados: EstadoSegundoTurno | null; onFechar: () => void }) {
  const sigla = uf.toUpperCase();
  const gov1 = dados?.governador1;
  const eleitoGov = gov1?.votos.find(foiEleito);
  const gov2 = dados?.governador2;
  const ref = dados?.presidente2 ?? dados?.presidente1;

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label={nome}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold leading-tight">{nome}</h2>
          {ref && <p className="text-xs text-zinc-400">{fmtInt(ref.eleitorado ?? 0)} eleitores</p>}
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label={`Fechar ${nome} e voltar ao Brasil`}
          className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-lg leading-none text-zinc-300 hover:bg-zinc-800"
        >
          ×
        </button>
      </div>

      {!dados ? (
        <p className="text-sm text-zinc-400">Carregando {nome}…</p>
      ) : (
        <>
          <Secao titulo={`Presidente em ${sigla} · 2º turno`} direita={apurado(dados.presidente2) ? `${fmtPct(dados.presidente2.pctSecoes)} das seções` : undefined}>
            {apurado(dados.presidente2) ? (
              <Disputa cargo="presidente" uf={uf} l={dados.presidente2} />
            ) : (
              <Aviso>Ainda sem votos apurados no 2º turno.</Aviso>
            )}
          </Secao>
          <Secao titulo="Presidente · como terminou o 1º turno">
            <PrimeiroTurno cargo="presidente" uf={uf} l={dados.presidente1} />
          </Secao>

          {eleitoGov ? (
            <Secao titulo="Governador · eleito no 1º turno" direita={apurado(gov1) ? `${fmtPct(pct(eleitoGov, gov1))} dos votos` : undefined}>
              <ol>{apurado(gov1) && <Linha cargo="governador" uf={uf} v={eleitoGov} l={gov1} cor={corDe} selo="eleito" />}</ol>
            </Secao>
          ) : (
            <>
              <Secao titulo="Governador · 2º turno" direita={apurado(gov2) ? `${fmtPct(gov2.pctSecoes)} das seções` : undefined}>
                {apurado(gov2) ? (
                  <>
                    {eleitoDe(gov2) && (
                      <p className="mb-2 rounded-md bg-emerald-950/50 px-2 py-1 text-xs text-emerald-200">
                        Eleito no 2º turno: <span className="font-semibold">{eleitoDe(gov2)!.nome}</span>
                      </p>
                    )}
                    <Disputa cargo="governador" uf={uf} l={gov2} />
                  </>
                ) : gov2 ? (
                  <Aviso>Ainda sem votos apurados no 2º turno.</Aviso>
                ) : (
                  <Aviso>O TSE ainda não publicou o 2º turno para governador neste estado.</Aviso>
                )}
              </Secao>
              <Secao titulo="Governador · como terminou o 1º turno">
                <PrimeiroTurno cargo="governador" uf={uf} l={gov1 ?? null} />
              </Secao>
            </>
          )}

          <Secao titulo="Senado · eleitos no 1º turno · duas vagas">
            <PrimeiroTurno cargo="senador" uf={uf} l={dados.senador} />
          </Secao>
        </>
      )}
    </section>
  );
}

export function SegundoTurno() {
  const [uf, setUfNaUrl] = useEstadoNaUrl();
  const presidente2 = useBrasil('presidente', 2);
  const presidente1 = useBrasil('presidente', 1, PRIMEIRO_TURNO_FINAL_MS, true);
  const governadores = useBrasil('governador', 2);
  const detalhe = useEstadoSegundoTurno(uf);
  const [munSel, setMunSel] = useState<string | null>(null);
  const [munSobre, setMunSobre] = useState<string | null>(null); // município sob o mouse, só enquanto ele está lá
  // no degradê: candidato escolhido, ou quem lidera (null); ou a variação em relação ao 1º turno
  const [foco, setFoco] = useState<string | null>(null);
  const emVariacao = foco === VARIACAO;
  const [instante, setInstante] = useState<number | null>(null); // momento do replay do mapa; null = ao vivo
  const emVantagem = foco === VANTAGEM;
  const emAbstencao = foco === MODO_ABSTENCAO;
  const escolher = (k: string | null) => {
    // O mapa de municípios não tem esses dois modos.
    if (k && (foco === VANTAGEM || foco === MODO_ABSTENCAO)) setFoco(null);
    if (k) setInstante(null);
    setUfNaUrl(k);
    setMunSel(null);
    setMunSobre(null);
  };
  // Abre o estado da cidade e já seleciona o município, para o resumo de votos aparecer sob o mapa.
  const irParaCidade = (c: { uf: string; ibge: string }) => {
    if (foco === VANTAGEM || foco === MODO_ABSTENCAO) setFoco(null);
    setInstante(null);
    setUfNaUrl(c.uf);
    setMunSel(c.ibge);
  };
  const { marcados } = useMarcados();

  const nac2 = presidente2.dados?.nacional ?? null;
  const nac1 = presidente1.dados?.nacional ?? null;
  const porMun2 = new Map((detalhe.municipios2?.municipios ?? []).map((l) => [l.chave, l]));
  const porMun1 = new Map((detalhe.municipios1?.municipios ?? []).map((l) => [l.chave, l]));
  const nacional = useMemo(
    () => (nac2 ? { cargos: [comoResultado(nac2)], buscadoEm: presidente2.dados!.buscadoEm } : null),
    [nac2, presidente2.dados],
  );
  const historico = useHistorico('2t:brasil', nacional, marcados);

  // Curva de cada estado, registrada a cada atualização com votos (alimenta o resumo ao passar o mouse).
  useEffect(() => {
    const d = presidente2.dados;
    if (!d) return;
    const agora = Date.now();
    for (const l of d.estados) adicionar(`2t:uf:${l.chave}`, criarPonto({ cargos: [comoResultado(l)], buscadoEm: d.buscadoEm }, marcados, agora));
  }, [presidente2.dados, marcados]);

  // Curva de cada município do estado aberto, só em memória (são centenas de locais).
  useEffect(() => {
    const m = detalhe.municipios2;
    if (!m) return;
    const agora = Date.now();
    for (const l of m.municipios) adicionar(`2t:mun:${l.chave}`, criarPonto({ cargos: [comoResultado(l)], buscadoEm: m.buscadoEm }, marcados, agora), false);
  }, [detalhe.municipios2, marcados]);

  const [contornos, setContornos] = useState<Feature[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/geo/ufs.geojson')
      .then((r) => r.json())
      .then((g) => vivo && setContornos(g.features))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const por2 = new Map((presidente2.dados?.estados ?? []).map((l) => [l.chave, l]));
  const por1 = new Map((presidente1.dados?.estados ?? []).map((l) => [l.chave, l]));
  // Histórico gravado neste navegador, para voltar o mapa no tempo.
  const historicosUf = useHistoricos([...por2.keys()].map((k) => `2t:uf:${k}`));
  const momentos = instantesDe([...historicosUf.values()]);
  // Os estados como estavam no momento escolhido; ao vivo, são os atuais.
  const por2Vista =
    instante === null
      ? por2
      : new Map(
          [...por2].flatMap(([k, l]) => {
            const antes = localEm(l, historicosUf.get(`2t:uf:${k}`) ?? [], instante);
            return antes ? [[k, antes] as const] : [];
          }),
        );
  const governadores2 = [...(governadores.dados?.estados ?? [])].sort((a, b) => a.chave.localeCompare(b.chave));
  const nomeUf = (k: string) => por2.get(k)?.nome ?? por1.get(k)?.nome ?? k.toUpperCase();

  // 2º turno quando já há votos; senão o líder do 1º turno, em tom suave.
  const pinturaDe = (l2: Local | undefined, l1: Local | undefined): Pintura =>
    emVariacao ? pinturaVariacao(l2, l1, candidatos2, cor) : pinturaDegrade(l2, l1, foco, candidatos2, cor);
  function descreve(l2: Local | undefined, l1: Local | undefined, nome: string) {
    if (apurado(l2)) return l2.lider ? `${nome}: ${l2.votos[0].nome} lidera com ${fmtPct(pct(l2.votos[0], l2))} (2º turno)` : `${nome}: empate (2º turno)`;
    if (apurado(l1) && l1.lider) return `${nome}: 2º turno sem votos apurados; no 1º turno, ${l1.votos[0].nome} liderou`;
    return `${nome}: sem votos apurados`;
  }
  const pintura = (k: string): Pintura =>
    emAbstencao ? pinturaAbstencao(por2.get(k)) : emVantagem ? { fill: SEM_VOTOS, opacidade: 1 } : pinturaDe(por2Vista.get(k), por1.get(k));
  const listaVantagens = vantagens([...por2Vista.values()]);
  const maiorVantagem = listaVantagens[0]?.votos ?? 0;
  const vantagemPorUf = new Map(listaVantagens.map((v) => [v.chave, v]));
  const selo = (k: string) => {
    const l = por2Vista.get(k);
    if (emAbstencao) return l?.pctAbstencao !== undefined ? `${Math.round(l.pctAbstencao)}%` : null;
    if (!apurado(l) || emVariacao || emVantagem) return null;
    const v = foco ? l.votos.find((x) => x.id === foco) : l.lider ? l.votos[0] : undefined;
    return v ? `${Math.round(pct(v, l))}%` : null;
  };
  const lideresPorId = contarLideres([...por2Vista.values()]);
  const marcas = emVantagem
    ? (k: string) => {
        const v = vantagemPorUf.get(k);
        return v ? { raio: raioVantagem(v.votos, maiorVantagem, 1), cor: cor(v.lider) } : null;
      }
    : undefined;
  const dicaMun = (k: string) => (
    <DicaEstado
      uf={uf ?? ''}
      nome={(porMun2.get(k) ?? porMun1.get(k))?.nome ?? 'Município'}
      sub={(uf ?? '').toUpperCase()}
      escopo={`2t:mun:${k}`}
      clique="Dados do município, atualizados a cada 90s."
      l2={porMun2.get(k)}
      l1={porMun1.get(k)}
      finalistas={candidatos2}
      cor={cor}
    />
  );
  const governador2 = new Map(governadores2.map((l) => [l.chave, l]));

  const dicaEstado = (k: string) => (
    <DicaEstado uf={k} nome={nomeUf(k)} l2={por2.get(k)} l1={por1.get(k)} gov={governador2.get(k)} finalistas={candidatos2} cor={cor} />
  );
  const rotulo = (k: string) => descreve(por2.get(k), por1.get(k), nomeUf(k));
  const pinturaMun = (k: string) => pinturaDe(porMun2.get(k), porMun1.get(k));
  const rotuloMun = (k: string) => {
    const l2 = porMun2.get(k);
    const l1 = porMun1.get(k);
    return descreve(l2, l1, (l2 ?? l1)?.nome ?? 'Município');
  };
  const munFoco = munSobre ?? munSel;
  const munAtual = munFoco ? (porMun2.get(munFoco) ?? porMun1.get(munFoco)) : undefined;
  const munApurado = munFoco ? porMun2.get(munFoco) : undefined;
  const lMun = apurado(munApurado) ? munApurado : munFoco ? porMun1.get(munFoco) : undefined;

  const candidatos2 = (nac2 ?? nac1)?.votos.slice(0, 2) ?? [];
  const erro = presidente2.erro && !presidente2.dados ? presidente2.erro : null;
  const aguardando = !!nac2 && nac2.total === 0;
  const eleitoPresidente = eleitoDe(nac2);
  const semVotos2 = !nac2 || nac2.total === 0;
  const projecao = candidatos2.length === 2 ? projetar(presidente2.dados?.estados ?? [], presidente1.dados?.estados ?? [], candidatos2[0].id, candidatos2[1].id) : null;
  // Ordem fixa por número, para a barra do placar não trocar de lado quando a liderança muda.
  const finalistasFixos = [...candidatos2].sort((x, y) => Number(x.numero) - Number(y.numero));
  const placarNac = placar(nac2, finalistasFixos);
  const mudanca = mudancaPorEstado(presidente2.dados?.estados ?? [], presidente1.dados?.estados ?? [], finalistasFixos);
  const estadosApurados = [...por2.values()].filter((l) => l.total > 0).length;

  return (
    <div className="space-y-4">
      {erro && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          Não foi possível carregar o 2º turno ({erro}). Nova tentativa em 30s.
        </p>
      )}
      {presidente2.erro && presidente2.dados && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          Dados desatualizados: a última atualização falhou ({presidente2.erro}).
        </p>
      )}
      {!presidente2.dados && !erro && <p className="text-zinc-400">Carregando os 27 estados…</p>}

      {presidente2.dados && (
        <div className="space-y-4">
          <PlacarDisputa placar={placarNac} eleito={eleitoPresidente ?? null} cor={cor} />
          <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
            <div className="order-1 xl:sticky xl:top-16 xl:order-2">
              <section className={cartao} aria-label="Mapa">
                <div className="mb-3">
                  <BuscaCidade onEscolher={irParaCidade} />
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Trilho className="flex flex-wrap" role="group" aria-label="Candidato do degradê">
                    <button type="button" aria-pressed={foco === null} onClick={() => setFoco(null)} className={pilula(foco === null)}>
                      Quem lidera
                    </button>
                    {candidatos2.map((v) => (
                      <button key={v.id} type="button" aria-pressed={foco === v.id} onClick={() => setFoco(v.id)} className={pilula(foco === v.id)}>
                        <span className="sm:hidden">{v.nome.split(' ')[0]}</span>
                        <span className="hidden sm:inline">{v.nome}</span>
                      </button>
                    ))}
                    <button type="button" aria-pressed={emVariacao} onClick={() => setFoco(VARIACAO)} className={pilula(emVariacao)}>
                      <span className="sm:hidden">Variação</span>
                      <span className="hidden sm:inline">Variação vs 1º turno</span>
                    </button>
                    {!uf && (
                      <>
                        <button type="button" aria-pressed={emVantagem} onClick={() => setFoco(VANTAGEM)} className={pilula(emVantagem)}>
                          Vantagem
                        </button>
                        <button type="button" aria-pressed={emAbstencao} onClick={() => {
                            setFoco(MODO_ABSTENCAO);
                            setInstante(null);
                          }} className={pilula(emAbstencao)}>
                          Abstenção
                        </button>
                      </>
                    )}
                  </Trilho>
                  <span className="ml-auto flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    <SeloAtualizacao prefixo="Presidente · 2º turno · " buscadoEm={presidente2.dados.buscadoEm} desatualizado={presidente2.dados.desatualizado} meta={presidente2.dados.meta} />
                    <button
                      type="button"
                      onClick={() => {
                        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
                        else document.documentElement.requestFullscreen?.().catch(() => {});
                      }}
                      className="glass glass-forte hidden rounded-full border px-3 py-1.5 text-zinc-100 hover:bg-white/10 sm:block"
                    >
                      Tela cheia
                    </button>
                  </span>
                </div>
                {eleitoPresidente && nac2 && (
                <p role="status" className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/60 bg-emerald-950/40 px-4 py-3 text-emerald-100">
                  <FotoCandidato id={eleitoPresidente.id} cor={cor(eleitoPresidente)} />
                  <span>
                    <span className="block text-xs uppercase tracking-widest text-emerald-300">Presidente eleito</span>
                    <span className="text-lg font-semibold">{eleitoPresidente.nome}</span>
                    <span className="ml-2 text-sm tabular-nums">
                      {fmtPct(pct(eleitoPresidente, nac2))} · {fmtInt(eleitoPresidente.votos)} votos
                    </span>
                  </span>
                </p>
              )}
              {aguardando && (
                  <p role="status" className="mb-2 rounded-lg border border-amber-500/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
                    Apuração do 2º turno ainda não iniciada: o mapa mostra o líder de cada lugar no 1º turno e se atualiza sozinho a cada 30s.
                  </p>
                )}
                {!uf && instante !== null && (
                  <p role="status" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sky-500/60 bg-sky-950/40 px-3 py-2 text-xs text-sky-100">
                    <span>Mapa de {horaCurta(instante)} · histórico gravado neste navegador. O resumo ao passar o mouse segue ao vivo.</span>
                    <button type="button" onClick={() => setInstante(null)} className="rounded-full border border-sky-400/60 px-2.5 py-0.5 font-medium hover:bg-sky-900/60">
                      Voltar ao vivo
                    </button>
                  </p>
                )}
                {uf ? (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      <button type="button" onClick={() => escolher(null)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800">
                        ‹ Brasil
                      </button>
                      <span className="font-semibold">{nomeUf(uf)}</span>
                      <span className="text-xs text-zinc-400">por município · atualiza a cada 90s</span>
                    </div>
                    <p className="mb-2 min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" aria-live="polite">
                      {munAtual ? (
                        <>
                          <span className="font-semibold">{munAtual.nome}</span>{' '}
                          {apurado(lMun) ? (
                            <>
                              <span className="text-xs text-zinc-400">{apurado(munApurado) ? `2º turno · ${fmtPct(munApurado.pctSecoes)} das seções` : '1º turno (2º ainda sem votos)'}</span>
                              {lMun.votos.slice(0, 2).map((v) => (
                                <span key={v.id} className="ml-3 inline-flex items-center gap-1.5 whitespace-nowrap">
                                  <Amostra cor={cor(v)} /> {v.nome} <span className="tabular-nums text-zinc-300">{fmtPct(pct(v, lMun))}</span>
                                </span>
                              ))}
                            </>
                          ) : (
                            <span className="ml-3 text-zinc-400">sem votos apurados</span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-400">Passe o mouse ou toque num município para ver os votos.</span>
                      )}
                    </p>
                    {detalhe.contornos && (detalhe.municipios2 || detalhe.municipios1) ? (
                      <div className="mx-auto w-full max-w-[min(900px,calc(100vh-15rem))]">
                        <MapaCoropletico
                          titulo={`Mapa de ${nomeUf(uf)} por município`}
                          features={detalhe.contornos}
                          chaveDe={chaveMunicipio}
                          projecao="plana"
                          proporcao={0.85}
                          cor={(k) => pinturaMun(k).fill}
                          opacidade={(k) => pinturaMun(k).opacidade}
                          rotulo={rotuloMun}
                          selecionado={munSobre ?? munSel}
                          onSelecionar={setMunSel}
                          onSobre={setMunSobre}
                          dica={dicaMun}
                        />
                      </div>
                    ) : (
                      <p className="py-16 text-center text-sm text-zinc-400">
                        {detalhe.erroMunicipios ? `Não foi possível carregar os municípios (${detalhe.erroMunicipios}).` : `Carregando os municípios de ${nomeUf(uf)}…`}
                      </p>
                    )}
                    {(detalhe.municipios2?.falhas ?? 0) > 0 && (
                      <p className="mt-1 text-xs text-amber-300">{detalhe.municipios2!.falhas} municípios não responderam nesta atualização.</p>
                    )}
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-[min(900px,calc(100vh-15rem))]">
                    <MapaBrasil features={contornos} pintura={pintura} rotulo={rotulo} selecionado={uf} onSelecionar={escolher} dica={dicaEstado} marcas={marcas} selo={selo} />
                  </div>
                )}
                {!uf && (
                  <LinhaDoTempo
                    instantes={momentos}
                    valor={instante}
                    onMudar={setInstante}
                    desativado={emAbstencao ? 'A abstenção não tem histórico: volte a outro modo do mapa para usar a linha do tempo.' : undefined}
                  />
                )}
                <ul className="glass mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-xs text-zinc-200">
                  {candidatos2.map((v) => (
                    <li key={v.id} className="flex items-center gap-1.5">
                      <Amostra cor={cor(v)} /> {v.nome} ({v.partido})
                      {estadosApurados > 0 && !uf && (
                        <span className="text-zinc-400">
                          · {lideresPorId[v.id] ?? 0} {lideresPorId[v.id] === 1 ? 'estado' : 'estados'}
                        </span>
                      )}
                    </li>
                  ))}
                  <li className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1">
                    {emVantagem ? (
                      <span className="text-zinc-300">
                        Tamanho do círculo: vantagem em votos{maiorVantagem > 0 && ` (a maior: ${fmtVotosCurto(maiorVantagem)})`}
                      </span>
                    ) : emAbstencao ? (
                      <span className="flex items-center gap-1.5">
                        <span className="tabular-nums text-zinc-400">{FAIXA_ABSTENCAO[0]}%</span>
                        <span
                          className="h-2.5 w-24 rounded"
                          style={{ background: `linear-gradient(to right, ${ABSTENCAO}1f, ${ABSTENCAO})` }}
                          role="img"
                          aria-label={`Escala de abstenção: de ${FAIXA_ABSTENCAO[0]}% a ${FAIXA_ABSTENCAO[1]}%`}
                        />
                        <span className="tabular-nums text-zinc-400">{FAIXA_ABSTENCAO[1]}%</span>
                        <span className="text-zinc-300">Abstenção</span>
                      </span>
                    ) : (foco && !emVariacao ? candidatos2.filter((v) => v.id === foco) : candidatos2).map((v) => {
                      const [de, ate] = emVariacao ? FAIXA_VARIACAO : foco ? FAIXA_CANDIDATO : semVotos2 ? FAIXA_LIDER_1T : FAIXA_LIDER;
                      const sinal = emVariacao ? '+' : '';
                      return (
                        <span key={v.id} className="flex items-center gap-1.5">
                          <span className="tabular-nums text-zinc-400">{emVariacao ? `${sinal}${de}` : `${de}%`}</span>
                          <span
                            className="h-2.5 w-24 rounded"
                            style={{ background: `linear-gradient(to right, ${cor(v)}1f, ${cor(v)})` }}
                            role="img"
                            aria-label={`Escala de ${v.nome}: de ${de}% a ${ate}% dos votos`}
                          />
                          <span className="tabular-nums text-zinc-400">{emVariacao ? `${sinal}${ate} pts` : `${ate}%`}</span>
                          <span className="text-zinc-300">{v.nome}</span>
                        </span>
                      );
                    })}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Amostra cor={EMPATE} /> Empate
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Amostra cor={SEM_VOTOS} /> Sem votos apurados
                  </li>
                </ul>
                <details className="group mt-2 text-xs text-zinc-300">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-zinc-700 px-2.5 py-1 hover:bg-zinc-800">
                    <span aria-hidden="true" className="font-semibold">?</span> Como ler o mapa
                  </summary>
                  <p className="mt-2 leading-relaxed">
                  {emVantagem
                    ? 'O círculo tem a cor de quem lidera no estado; quanto maior, maior a diferença de votos para o segundo. Estados sem líder ficam sem círculo. '
                    : emAbstencao
                      ? 'A cor mostra a abstenção nas seções já apuradas de cada estado; por isso o valor muda conforme a apuração avança. Quanto mais forte, maior a abstenção. '
                      : emVariacao
                    ? 'A cor é a de quem mais subiu em relação ao 1º turno (em pontos percentuais dos votos); quanto mais forte, maior a subida. Fica cinza onde o 2º turno ainda não tem votos. '
                    : foco
                      ? 'Quanto mais forte a cor, maior o percentual do candidato escolhido no local. '
                      : 'A cor é a de quem lidera; quanto mais forte, maior o percentual do líder no local. '}
                  {semVotos2 && !emVariacao && 'Enquanto o 2º turno não tem votos, o degradê usa os percentuais do 1º turno. '}
                  Enquanto não há votos, aparece em tom suave o líder do 1º turno. Clique num estado para ver as cidades, o presidente, o governador, o senado e os deputados.
                                  </p>
                </details>
              </section>
            </div>
            <div className="contents xl:order-1 xl:flex xl:flex-col xl:gap-4">
            <div className="order-2">
            <section className={cartao} aria-label="Presidente no Brasil, 2º turno">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-xs uppercase tracking-widest text-zinc-400">Presidente · Brasil · 2º turno</p>
                {nac2 && !semVotos2 && (
                  <p className="text-sm text-zinc-300">
                    <span className="text-xl font-semibold tabular-nums text-zinc-100">{fmtPct(nac2.pctSecoes)}</span> das seções
                  </p>
                )}
              </div>
              {nac2 ? (
                <>
                  {semVotos2 ? (
                    <p className="mt-1 text-sm text-zinc-300">Apuração ainda não começou.</p>
                  ) : (
                    <>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-zinc-800">
                        <div className="h-full rounded bg-emerald-400" style={{ width: `${Math.min(nac2.pctSecoes, 100)}%` }} />
                      </div>
                      <div className="mt-3">
                        <Disputa cargo="presidente" uf="br" l={nac2} />
                      </div>
                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-zinc-400">Seções</dt>
                          <dd className="tabular-nums">
                            {fmtInt(nac2.secoesTotalizadas)} de {fmtInt(nac2.secoes)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-zinc-400">Estados com votos</dt>
                          <dd className="tabular-nums">{estadosApurados} de 27</dd>
                        </div>
                      </dl>
                    </>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">Sem dados nacionais nesta atualização.</p>
              )}
              {apurado(nac1) && (
                <div className={semVotos2 ? 'mt-3' : 'mt-3 border-t border-zinc-800 pt-3'}>
                  <h3 className={semVotos2 ? 'mb-3 text-base font-semibold text-zinc-100' : 'mb-2 text-xs uppercase tracking-widest text-zinc-400'}>Como terminou o 1º turno</h3>
                  {semVotos2 ? (
                    <Duelo cargo="presidente" uf="br" a={nac1.votos[0]} b={nac1.votos[1]} l={nac1} cor={corDe} rotuloVantagem="Vantagem" />
                  ) : (
                    <ol className="space-y-2">
                      {nac1.votos.slice(0, 2).map((v) => (
                        <Linha key={v.id} cargo="presidente" uf="br" v={v} l={nac1} cor={corDe} />
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </section>
            </div>
            {!uf && (
              <div className="order-4">
                <MudancaPorEstado mudanca={mudanca} finalistas={finalistasFixos} cor={cor} onUf={escolher} />
              </div>
            )}
            {!uf && (
              <div className="order-4">
                <MaioresVantagens itens={listaVantagens} onUf={escolher} />
              </div>
            )}
            {!uf && (
              <div className="order-4">
              <section className={cartao} aria-label="Governadores no 2º turno">
                <h2 className="text-xs uppercase tracking-widest text-zinc-400">Governadores · 2º turno</h2>
                {governadores2.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    {governadores.dados ? 'Nenhum estado com 2º turno para governador.' : 'Buscando os estados com 2º turno para governador…'}
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-zinc-800 text-sm">
                    {governadores2.map((l) => {
                      const [a, b] = l.votos;
                      return (
                        <li key={l.chave}>
                          <button
                            type="button"
                            onClick={() => escolher(l.chave)}
                            className={`flex w-full flex-col gap-0.5 px-1 py-2 text-left hover:bg-zinc-800 ${uf === l.chave ? 'bg-zinc-800' : ''}`}
                          >
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold">{l.nome}</span>
                              <span className="text-xs tabular-nums text-zinc-400">{fmtPct(l.pctSecoes)} das seções</span>
                            </span>
                            {[a, b].map(
                              (v) =>
                                v && (
                                  <span key={v.id} className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate" title={v.nome}>
                                      {v.nome} <span className="text-xs font-medium text-zinc-300">{v.partido}</span>
                                      {foiEleito(v) && <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-300">eleito</span>}
                                    </span>
                                    <span className="tabular-nums">{fmtPct(pct(v, l))}</span>
                                  </span>
                                ),
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              </div>
            )}
            {!uf && (
              <div className="order-2">
                <CartaoProjecao projecao={projecao} pctSecoes={nac2?.pctSecoes ?? 0} finalistas={candidatos2} cor={cor} />
              </div>
            )}
            <div className="order-5">
              <UltimasAtualizacoes eventos={presidente2.eventos} onUf={escolher} />
            </div>
            {!uf && (
              <div className="order-6">
              {nacional && <GraficoEvolucao cargos={nacional.cargos} historico={historico} marcados={marcados} />}
              </div>
            )}
            </div>
            <div className="contents xl:sticky xl:top-16 xl:order-3 xl:flex xl:flex-col xl:gap-4 xl:self-start">
            <div className="order-3 space-y-4">
            {uf ? (
              <>
                <CartaoEstado uf={uf} nome={nomeUf(uf)} dados={detalhe.resumo} onFechar={() => escolher(null)} />
                {detalhe.resumo && apurado(detalhe.resumo.depFederal) && (
                  <PainelCamara titulo={nomeUf(uf)} locais={[detalhe.resumo.depFederal]} cor={corPartido} onBrasil={() => escolher(null)} contagem={null} compacto />
                )}
              </>
            ) : (
              <section className={`${cartao} text-sm text-zinc-400`}>
                <h2 className="mb-1 text-base font-semibold text-zinc-100">Escolha um estado</h2>
                Clique no mapa ou num governador da lista para ver, no mesmo lugar: o 2º turno ao vivo, como terminou o 1º turno, os senadores eleitos e a bancada de deputados federais.
              </section>
            )}
            </div>
            {!uf && (
              <div className="order-5">
                <AnaliseRegioes
                  estados2={presidente2.dados?.estados ?? []}
                  estados1={presidente1.dados?.estados ?? []}
                  finalistas={candidatos2}
                  cor={cor}
                  onUf={escolher}
                />
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
