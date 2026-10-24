'use client';

import type { Feature } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { comoResultado } from '@/lib/brasil/analise';
import type { EstadoSegundoTurno } from '@/lib/brasil/estado';
import { corPartido } from '@/lib/cores';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';
import { useBrasil } from '@/lib/useBrasil';
import { useEstadoSegundoTurno } from '@/lib/useEstado';
import { useHistorico } from '@/lib/useHistorico';
import { useMarcados } from '@/lib/useMarcados';
import { Duelo, Linha } from './CartaoEstado';
import { GraficoEvolucao } from './GraficoEvolucao';
import { MapaBrasil, type Pintura } from './MapaBrasil';
import { MapaCoropletico } from './MapaCoropletico';
import { PainelCamara } from './PainelCamara';

const SEM_VOTOS = '#3f3f46';
const EMPATE = '#71717a';
const OPACIDADE_1T = 0.4;
// Degradê: a cor vai do quase apagado ao pleno entre estes percentuais.
const FAIXA_LIDER = [50, 80] as const; // quem lidera num 2º turno tem 50% ou mais
const FAIXA_CANDIDATO = [15, 80] as const;
const FAIXA_LIDER_1T = [30, 70] as const; // no 1º turno o líder tem bem menos de 50%
const intensidade = (p: number, [de, ate]: readonly [number, number]) => 0.12 + 0.88 * Math.min(Math.max((p - de) / (ate - de), 0), 1);
const PRIMEIRO_TURNO_FINAL_MS = 10 * 60_000; // o 1º turno já acabou: basta rever de vez em quando

const pilula = (ativa: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${ativa ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`;
const chaveMunicipio = (f: Feature) => String(f.properties?.codarea ?? '');
const cartao = 'rounded-2xl border border-zinc-800 bg-zinc-900 p-4';
// `eleito` do TSE também marca quem vai ao 2º turno; só a situação distingue.
const foiEleito = (v: VotoCand) => /^eleito/i.test(v.situacao ?? '');
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
        {direita && <span className="text-xs tabular-nums text-zinc-500">{direita}</span>}
      </div>
      {children}
    </div>
  );
}

const Aviso = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-zinc-500">{children}</p>;

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
                  <Disputa cargo="governador" uf={uf} l={gov2} />
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
  const [uf, setUf] = useState<string | null>(null);
  const presidente2 = useBrasil('presidente', 2);
  const presidente1 = useBrasil('presidente', 1, PRIMEIRO_TURNO_FINAL_MS);
  const governadores = useBrasil('governador', 2);
  const detalhe = useEstadoSegundoTurno(uf);
  const [munSel, setMunSel] = useState<string | null>(null);
  const [modo, setModo] = useState<'lider' | 'degrade'>('lider');
  const [foco, setFoco] = useState<string | null>(null); // no degradê: candidato escolhido, ou quem lidera
  const escolher = (k: string | null) => {
    setUf(k);
    setMunSel(null);
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
  const governadores2 = [...(governadores.dados?.estados ?? [])].sort((a, b) => a.chave.localeCompare(b.chave));
  const nomeUf = (k: string) => por2.get(k)?.nome ?? por1.get(k)?.nome ?? k.toUpperCase();

  // 2º turno quando já há votos; senão o líder do 1º turno, em tom suave.
  function pinturaDe(l2: Local | undefined, l1: Local | undefined): Pintura {
    // Sem votos no 2º turno, o degradê usa os percentuais do 1º turno para já mostrar onde cada um é forte.
    const base = apurado(l2) ? l2 : apurado(l1) ? l1 : undefined;
    if (base && modo === 'degrade') {
      const alvo = foco ? candidatos2.find((c) => c.id === foco) : undefined;
      if (alvo) {
        const v = base.votos.find((x) => x.id === alvo.id);
        return { fill: cor(alvo), opacidade: intensidade(v ? pct(v, base) : 0, FAIXA_CANDIDATO) };
      }
      return base.lider
        ? { fill: cor(base.votos[0]), opacidade: intensidade(pct(base.votos[0], base), base === l2 ? FAIXA_LIDER : FAIXA_LIDER_1T) }
        : { fill: EMPATE, opacidade: 1 };
    }
    if (apurado(l2)) return { fill: l2.lider ? cor(l2.votos[0]) : EMPATE, opacidade: 1 };
    if (apurado(l1) && l1.lider) return { fill: cor(l1.votos[0]), opacidade: OPACIDADE_1T };
    return { fill: SEM_VOTOS, opacidade: 1 };
  }
  function descreve(l2: Local | undefined, l1: Local | undefined, nome: string) {
    if (apurado(l2)) return l2.lider ? `${nome}: ${l2.votos[0].nome} lidera com ${fmtPct(pct(l2.votos[0], l2))} (2º turno)` : `${nome}: empate (2º turno)`;
    if (apurado(l1) && l1.lider) return `${nome}: 2º turno sem votos apurados; no 1º turno, ${l1.votos[0].nome} liderou`;
    return `${nome}: sem votos apurados`;
  }
  const pintura = (k: string) => pinturaDe(por2.get(k), por1.get(k));
  const rotulo = (k: string) => descreve(por2.get(k), por1.get(k), nomeUf(k));
  const pinturaMun = (k: string) => pinturaDe(porMun2.get(k), porMun1.get(k));
  const rotuloMun = (k: string) => {
    const l2 = porMun2.get(k);
    const l1 = porMun1.get(k);
    return descreve(l2, l1, (l2 ?? l1)?.nome ?? 'Município');
  };
  const munAtual = munSel ? (porMun2.get(munSel) ?? porMun1.get(munSel)) : undefined;
  const munApurado = munSel ? porMun2.get(munSel) : undefined;
  const lMun = apurado(munApurado) ? munApurado : munSel ? porMun1.get(munSel) : undefined;

  const candidatos2 = (nac2 ?? nac1)?.votos.slice(0, 2) ?? [];
  const erro = presidente2.erro && !presidente2.dados ? presidente2.erro : null;
  const hora = presidente2.dados ? new Date(presidente2.dados.buscadoEm).toLocaleTimeString('pt-BR') : '';
  const aguardando = !!nac2 && nac2.total === 0;
  const semVotos2 = !nac2 || nac2.total === 0;
  const estadosApurados = [...por2.values()].filter((l) => l.total > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
        <h2 className="text-lg font-semibold text-zinc-100">Presidente · 2º turno</h2>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          {presidente2.dados && <span>Atualizado às {hora}</span>}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
              else document.documentElement.requestFullscreen?.().catch(() => {});
            }}
            className="rounded-full border border-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            Tela cheia
          </button>
        </span>
      </div>

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
      {aguardando && (
        <p role="status" className="rounded-lg border border-amber-500/60 bg-amber-950/40 p-3 text-sm text-amber-100">
          Apuração do 2º turno ainda não iniciada. O mapa mostra, em tom suave, quem liderou cada estado no 1º turno e se atualiza sozinho a cada 30s.
        </p>
      )}
      {!presidente2.dados && !erro && <p className="text-zinc-400">Carregando os 27 estados…</p>}

      {presidente2.dados && (
        <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <section className={cartao} aria-label="Presidente no Brasil, 2º turno">
              <p className="text-xs uppercase tracking-widest text-zinc-400">Presidente · Brasil · 2º turno</p>
              {nac2 ? (
                <>
                  <p className="mt-2 text-2xl font-semibold leading-tight">
                    <span className="tabular-nums">{fmtPct(nac2.pctSecoes)}</span> das seções apuradas
                  </p>
                  {nac2.total > 0 ? (
                    <div className="mt-4">
                      <Disputa cargo="presidente" uf="br" l={nac2} />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">Ainda sem votos apurados.</p>
                  )}
                  <dl className="mt-4 space-y-1 border-t border-zinc-800 pt-3 text-sm">
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
                    <div className="flex justify-between">
                      <dt className="text-zinc-400">Eleitorado</dt>
                      <dd className="tabular-nums">{fmtInt(nac2.eleitorado ?? 0)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">Sem dados nacionais nesta atualização.</p>
              )}
              {apurado(nac1) && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <h3 className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Como terminou o 1º turno</h3>
                  <ol className="space-y-2">
                    {nac1.votos.slice(0, 4).map((v) => (
                      <Linha key={v.id} cargo="presidente" uf="br" v={v} l={nac1} cor={corDe} />
                    ))}
                  </ol>
                </div>
              )}
            </section>

            {nacional && <GraficoEvolucao cargos={nacional.cargos} historico={historico} marcados={marcados} />}

            <section className={cartao} aria-label="Governadores no 2º turno">
              <h2 className="text-xs uppercase tracking-widest text-zinc-400">Governadores · 2º turno</h2>
              {governadores2.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
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
                            <span className="text-xs tabular-nums text-zinc-500">{fmtPct(l.pctSecoes)} das seções</span>
                          </span>
                          {[a, b].map(
                            (v) =>
                              v && (
                                <span key={v.id} className="flex items-center gap-2">
                                  <Amostra cor={cor(v)} />
                                  <span className="min-w-0 flex-1 truncate">
                                    {v.nome} <span className="text-xs text-zinc-500">{v.partido}</span>
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

          <section className={`${cartao} order-first xl:order-none`} aria-label="Mapa">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-zinc-800 bg-zinc-950 p-1" role="group" aria-label="Cor do mapa">
                <button type="button" aria-pressed={modo === 'lider'} onClick={() => setModo('lider')} className={pilula(modo === 'lider')}>
                  Líder
                </button>
                <button type="button" aria-pressed={modo === 'degrade'} onClick={() => setModo('degrade')} className={pilula(modo === 'degrade')}>
                  Degradê
                </button>
              </div>
              {modo === 'degrade' && (
                <div className="flex flex-wrap rounded-full border border-zinc-800 bg-zinc-950 p-1" role="group" aria-label="Candidato do degradê">
                  <button type="button" aria-pressed={foco === null} onClick={() => setFoco(null)} className={pilula(foco === null)}>
                    Quem lidera
                  </button>
                  {candidatos2.map((v) => (
                    <button key={v.id} type="button" aria-pressed={foco === v.id} onClick={() => setFoco(v.id)} className={pilula(foco === v.id)}>
                      {v.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {uf ? (
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <button type="button" onClick={() => escolher(null)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800">
                    ‹ Brasil
                  </button>
                  <span className="font-semibold">{nomeUf(uf)}</span>
                  <span className="text-xs text-zinc-500">por município · atualiza a cada 90s</span>
                </div>
                {detalhe.contornos && (detalhe.municipios2 || detalhe.municipios1) ? (
                  <div className="mx-auto max-w-[760px]">
                    <MapaCoropletico
                      titulo={`Mapa de ${nomeUf(uf)} por município`}
                      features={detalhe.contornos}
                      chaveDe={chaveMunicipio}
                      projecao="plana"
                      proporcao={0.85}
                      cor={(k) => pinturaMun(k).fill}
                      opacidade={(k) => pinturaMun(k).opacidade}
                      rotulo={rotuloMun}
                      selecionado={munSel}
                      onSelecionar={setMunSel}
                    />
                  </div>
                ) : (
                  <p className="py-16 text-center text-sm text-zinc-400">
                    {detalhe.erroMunicipios ? `Não foi possível carregar os municípios (${detalhe.erroMunicipios}).` : `Carregando os municípios de ${nomeUf(uf)}…`}
                  </p>
                )}
                <p className="mt-2 min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" aria-live="polite">
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
                    <span className="text-zinc-500">Passe o mouse ou toque num município para ver os votos.</span>
                  )}
                </p>
                {(detalhe.municipios2?.falhas ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-amber-300">{detalhe.municipios2!.falhas} municípios não responderam nesta atualização.</p>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-[760px]">
                <MapaBrasil features={contornos} pintura={pintura} rotulo={rotulo} selecionado={uf} onSelecionar={escolher} />
              </div>
            )}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
              {candidatos2.map((v) => (
                <li key={v.id} className="flex items-center gap-1.5">
                  <Amostra cor={cor(v)} /> {v.nome} ({v.partido})
                </li>
              ))}
              {modo === 'degrade' && (
                <li className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1">
                  {(foco ? candidatos2.filter((v) => v.id === foco) : candidatos2).map((v) => {
                    const [de, ate] = foco ? FAIXA_CANDIDATO : semVotos2 ? FAIXA_LIDER_1T : FAIXA_LIDER;
                    return (
                      <span key={v.id} className="flex items-center gap-1.5">
                        <span className="tabular-nums text-zinc-400">{de}%</span>
                        <span
                          className="h-2.5 w-24 rounded"
                          style={{ background: `linear-gradient(to right, ${cor(v)}1f, ${cor(v)})` }}
                          role="img"
                          aria-label={`Escala de ${v.nome}: de ${de}% a ${ate}% dos votos`}
                        />
                        <span className="tabular-nums text-zinc-400">{ate}%</span>
                        <span className="text-zinc-300">{v.nome}</span>
                      </span>
                    );
                  })}
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <Amostra cor={EMPATE} /> Empate
              </li>
              <li className="flex items-center gap-1.5">
                <Amostra cor={SEM_VOTOS} /> Sem votos apurados
              </li>
            </ul>
            <p className="mt-2 text-xs text-zinc-500">
              {modo === 'lider'
                ? 'Cada estado (e, ao abrir um estado, cada município) tem a cor de quem lidera o 2º turno. '
                : foco
                  ? 'Quanto mais forte a cor, maior o percentual do candidato escolhido no local. '
                  : 'A cor é a de quem lidera; quanto mais forte, maior o percentual do líder no local. '}
              {modo === 'degrade' && semVotos2 && 'Enquanto o 2º turno não tem votos, o degradê usa os percentuais do 1º turno. '}
              Enquanto não há votos, aparece em tom suave o líder do 1º turno. Clique num estado para ver as cidades, o presidente, o governador, o senado e os deputados.
            </p>
          </section>

          <div className="space-y-4">
            {uf ? (
              <>
                <CartaoEstado uf={uf} nome={nomeUf(uf)} dados={detalhe.resumo} onFechar={() => escolher(null)} />
                {detalhe.resumo && apurado(detalhe.resumo.depFederal) && (
                  <PainelCamara titulo={nomeUf(uf)} locais={[detalhe.resumo.depFederal]} cor={corPartido} contagem={null} />
                )}
              </>
            ) : (
              <section className={`${cartao} text-sm text-zinc-400`}>
                <h2 className="mb-1 text-base font-semibold text-zinc-100">Escolha um estado</h2>
                Clique no mapa ou num governador da lista para ver, no mesmo lugar: o 2º turno ao vivo, como terminou o 1º turno, os senadores eleitos e a bancada de deputados federais.
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
