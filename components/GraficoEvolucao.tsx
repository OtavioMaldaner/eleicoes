'use client';

import { useEffect, useRef, useState } from 'react';
import { idsDoGrafico, series, type Metrica, type Ponto } from '@/lib/historico';
import type { Marcados } from '@/lib/marcados';
import type { ChaveCargo, ResultadoCargo } from '@/lib/tse/types';
import { coresDosCandidatos, SUPERFICIE } from '@/lib/cores';
import { fmtInt, fmtPct } from '@/lib/formato';

const ALTURA = 280;
const M = { topo: 12, direita: 16, base: 24, esquerda: 52 };

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

type Props = { cargos: ResultadoCargo[]; historico: Ponto[]; marcados: Marcados };

export function GraficoEvolucao({ cargos, historico, marcados }: Props) {
  const [chave, setChave] = useState<ChaveCargo>('presidente');
  const [metrica, setMetrica] = useState<Metrica>('pct');
  const cargo = cargos.find((c) => c.chave === chave) ?? cargos[0];
  const botao = (ativo: boolean) =>
    `rounded border px-2 py-1 text-sm ${ativo ? 'border-zinc-200 bg-zinc-200 text-black' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`;

  return (
    <section aria-labelledby="evolucao" className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 id="evolucao" className="mr-auto text-lg font-semibold">
          Evolução
        </h2>
        <select
          value={chave}
          onChange={(e) => setChave(e.target.value as ChaveCargo)}
          aria-label="Cargo do gráfico"
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
        >
          {cargos.map((c) => (
            <option key={c.chave} value={c.chave}>
              {c.nome}
            </option>
          ))}
        </select>
        <button type="button" aria-pressed={metrica === 'pct'} onClick={() => setMetrica('pct')} className={botao(metrica === 'pct')}>
          % dos válidos
        </button>
        <button type="button" aria-pressed={metrica === 'votos'} onClick={() => setMetrica('votos')} className={botao(metrica === 'votos')}>
          Votos
        </button>
      </div>
      {cargo && <Corpo key={cargo.chave} cargo={cargo} historico={historico} metrica={metrica} marcados={marcados} />}
    </section>
  );
}

type CorpoProps = { cargo: ResultadoCargo; historico: Ponto[]; metrica: Metrica; marcados: Marcados };

function Corpo({ cargo, historico, metrica, marcados }: CorpoProps) {
  const ids = idsDoGrafico(cargo, marcados);

  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [foco, setFoco] = useState<number | null>(null);

  const pontos = historico.filter((p) => p.cargos[cargo.chave]);
  const candidatos = new Map(cargo.candidatos.map((c) => [c.id, c]));
  // Cor do partido de cada candidato; partidos repetidos ganham tom mais claro e linha tracejada.
  const estilos = coresDosCandidatos(ids.map((id) => ({ id, partido: candidatos.get(id)?.partido ?? '' })));
  const cor = (id: string) => estilos.get(id)?.cor ?? '#a1a1aa';
  const valor = (n: number) => (metrica === 'pct' ? fmtPct(n) : fmtInt(n));

  const temGrafico = pontos.length >= 2 && largura > 0;
  const linhas = series(pontos, cargo.chave, ids, metrica);
  const t0 = pontos[0]?.t ?? 0;
  const t1 = pontos.at(-1)?.t ?? 1;
  const maxY = Math.max(1, ...linhas.flatMap((s) => s.pontos.map((p) => p.y))) * 1.1;
  const w = Math.max(largura - M.esquerda - M.direita, 10);
  const h = ALTURA - M.topo - M.base;
  const x = (t: number) => M.esquerda + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * w;
  const y = (v: number) => M.topo + h - (v / maxY) * h;
  const grade = [0, 1, 2, 3, 4].map((i) => (maxY * i) / 4);
  const marcasX = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3);
  const emFoco = foco !== null ? pontos[Math.min(foco, pontos.length - 1)] : null;

  function aoMover(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - r.left) / r.width) * (t1 - t0);
    let melhor = 0;
    pontos.forEach((p, i) => {
      if (Math.abs(p.t - t) < Math.abs(pontos[melhor].t - t)) melhor = i;
    });
    setFoco(melhor);
  }

  return (
    <div>
      <div ref={caixa} className="relative" style={{ minHeight: temGrafico ? ALTURA : undefined }}>
        {pontos.length < 2 && (
          <p className="py-6 text-sm text-zinc-400">
            O gráfico aparece depois de duas atualizações com dados novos. Os pontos só são registrados com esta página aberta.
          </p>
        )}
        {temGrafico && (
          <svg width={largura} height={ALTURA} role="img" aria-label={`Evolução de ${cargo.nome} ao longo da apuração`}>
            {grade.map((g) => (
              <g key={g}>
                <line x1={M.esquerda} x2={M.esquerda + w} y1={y(g)} y2={y(g)} stroke="#3f3f46" strokeWidth={1} />
                <text x={M.esquerda - 6} y={y(g)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#a1a1aa">
                  {metrica === 'pct' ? `${umaCasa.format(g)}%` : compacto.format(g)}
                </text>
              </g>
            ))}
            {marcasX.map((t, i) => (
              <text key={i} x={x(t)} y={ALTURA - 6} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} fontSize={11} fill="#a1a1aa">
                {hora(t)}
              </text>
            ))}
            {linhas.map((s) => {
              if (s.pontos.length === 0) return null;
              const ultimo = s.pontos[s.pontos.length - 1];
              return (
                <g key={s.id}>
                  {/* Trecho de um ponto só não forma linha: vira um ponto. */}
                  {s.segmentos
                    .filter((seg) => seg.length === 1 && seg[0] !== ultimo)
                    .map((seg) => (
                      <circle key={seg[0].t} cx={x(seg[0].t)} cy={y(seg[0].y)} r={2} fill={cor(s.id)} />
                    ))}
                  {s.segmentos.map((seg, n) => (
                    <path
                      key={n}
                      d={seg.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join('')}
                      fill="none"
                      stroke={cor(s.id)}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeDasharray={estilos.get(s.id)?.tracejado}
                    />
                  ))}
                  <circle cx={x(ultimo.t)} cy={y(ultimo.y)} r={4} fill={cor(s.id)} stroke={SUPERFICIE} strokeWidth={2} />
                </g>
              );
            })}
            {emFoco && <line x1={x(emFoco.t)} x2={x(emFoco.t)} y1={M.topo} y2={M.topo + h} stroke="#a1a1aa" strokeWidth={1} />}
            <rect
              x={M.esquerda}
              y={M.topo}
              width={w}
              height={h}
              fill="transparent"
              onPointerMove={aoMover}
              onPointerDown={aoMover}
              onPointerLeave={() => setFoco(null)}
            />
          </svg>
        )}
        {temGrafico && emFoco && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded border border-zinc-700 bg-zinc-950 p-2 text-xs shadow-lg"
            style={x(emFoco.t) > largura / 2 ? { right: largura - x(emFoco.t) + 8 } : { left: x(emFoco.t) + 8 }}
          >
            <p className="mb-1 font-semibold">
              {hora(emFoco.t)} · {fmtPct(emFoco.cargos[cargo.chave]?.p ?? 0)} das seções
            </p>
            <ul className="space-y-0.5">
              {ids
                .map((id) => ({ id, v: emFoco.cargos[cargo.chave]?.c[id] }))
                .filter((i) => i.v)
                .sort((a, b) => b.v![0] - a.v![0])
                .map(({ id, v }) => (
                  <li key={id} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor(id) }} />
                    <span className="mr-2 truncate">{candidatos.get(id)?.nome ?? id}</span>
                    <span className="ml-auto tabular-nums">{valor(metrica === 'pct' ? v![1] : v![0])}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
        {ids.map((id) => {
          const c = candidatos.get(id);
          if (!c) return null;
          return (
            <li key={id} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor(id) }} />
              <span>{c.nome}</span>
              <span className="text-zinc-500">{c.partido}</span>
              <span className="tabular-nums">{valor(metrica === 'pct' ? c.percentual : c.votos)}</span>
            </li>
          );
        })}
      </ul>

      <details className="mt-2 text-xs text-zinc-300">
        <summary className="cursor-pointer text-zinc-400">Ver como tabela</summary>
        <table className="mt-2 w-full max-w-xl text-left tabular-nums">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Candidato</th>
              <th className="font-normal">Partido</th>
              <th className="text-right font-normal">Votos</th>
              <th className="text-right font-normal">% dos válidos</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const c = candidatos.get(id);
              if (!c) return null;
              return (
                <tr key={id} className="border-t border-zinc-800">
                  <td className="py-1">{c.nome}</td>
                  <td>{c.partido}</td>
                  <td className="text-right">{fmtInt(c.votos)}</td>
                  <td className="text-right">{fmtPct(c.percentual)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
