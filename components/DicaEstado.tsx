'use client';

import { fmtInt, fmtPct } from '@/lib/formato';
import { series } from '@/lib/historico';
import type { Local, VotoCand } from '@/lib/mapas/agregar';
import { BASE } from '@/lib/tse/config';
import { useHistoricoLido } from '@/lib/useHistorico';
import { variacao } from '@/lib/variacao';

const SUPERFICIE = '#09090b';
const L = 306;
const A = 84;
const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const pct = (v: VotoCand, l: Local) => (l.total ? (v.votos / l.total) * 100 : 0);

function Foto({ eleicao, pasta, id, cor, tamanho }: { eleicao: string; pasta: string; id: string; cor: string; tamanho: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/${eleicao}/fotos/${pasta}/${id}.jpeg`}
      alt=""
      width={tamanho}
      height={tamanho}
      className="shrink-0 rounded-full bg-zinc-800 object-cover object-top"
      style={{ width: tamanho, height: tamanho, boxShadow: `0 0 0 2px #09090b, 0 0 0 4px ${cor}` }}
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  );
}

// Linhas do percentual de cada candidato ao longo da apuração, registradas enquanto o site fica aberto.
function Evolucao({ escopo, candidatos, cor }: { escopo: string; candidatos: VotoCand[]; cor: (v: VotoCand) => string }) {
  const hist = useHistoricoLido(escopo);
  const ids = candidatos.map((c) => c.id);
  const ss = series(hist, 'presidente', ids, 'pct');
  const pontos = ss.flatMap((s) => s.pontos);
  const temLinha = ss.some((s) => s.pontos.length >= 2);

  const [t0, t1] = pontos.length ? [Math.min(...pontos.map((p) => p.t)), Math.max(...pontos.map((p) => p.t))] : [0, 1];
  const ys = pontos.map((p) => p.y);
  // Escala ajustada aos dados (no mínimo 10 pontos de altura), para a variação aparecer.
  const [mn, mx] = ys.length ? [Math.min(...ys), Math.max(...ys)] : [45, 55];
  const meio = (mn + mx) / 2;
  const meia = Math.max((mx - mn) / 2 + 2, 5);
  const y0 = Math.max(Math.floor((meio - meia) / 5) * 5, 0);
  const y1 = Math.min(Math.ceil((meio + meia) / 5) * 5, 100);
  const x = (t: number) => 6 + ((t - t0) / Math.max(t1 - t0, 1)) * (L - 36);
  const y = (v: number) => 6 + (1 - (v - y0) / Math.max(y1 - y0, 1)) * (A - 24);

  return (
    <div>
      <p className="mb-1 flex justify-between text-[11px] uppercase tracking-wider text-zinc-400">
        <span>Evolução dos votos (%)</span>
        {temLinha && (
          <span className="normal-case tabular-nums">
            {hora(t0)}–{hora(t1)}
          </span>
        )}
      </p>
      <svg width={L} height={A} role="img" aria-label="Evolução do percentual de votos de cada candidato" className="block">
        {temLinha &&
          [y0, y1].map((g) => (
          <g key={g}>
            <line x1={6} x2={L - 30} y1={y(g)} y2={y(g)} stroke="#27272a" />
            <text x={L - 26} y={y(g) + 3} fontSize={10} fill="#a1a1aa">
              {g}%
            </text>
          </g>
        ))}
        {temLinha && y0 < 50 && y1 > 50 && <line x1={6} x2={L - 30} y1={y(50)} y2={y(50)} stroke="#52525b" strokeDasharray="3 3" />}
        {temLinha ? (
          ss.map((s, i) => {
            const c = candidatos[i];
            const fim = s.pontos.at(-1);
            return (
              <g key={s.id}>
                {s.segmentos.map((seg, k) => (
                  <polyline key={k} points={seg.map((p) => `${x(p.t)},${y(p.y)}`).join(' ')} fill="none" stroke={cor(c)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {fim && <circle cx={x(fim.t)} cy={y(fim.y)} r={3} fill={cor(c)} stroke={SUPERFICIE} strokeWidth={1.5} />}
              </g>
            );
          })
        ) : (
          <text x={(L - 24) / 2} y={A / 2 - 2} fontSize={11} textAnchor="middle" fill="#71717a">
            A linha aparece conforme a apuração avança
          </text>
        )}
      </svg>
    </div>
  );
}

type Props = {
  uf: string; // pasta das fotos de governador
  nome: string;
  sub?: string; // ao lado do nome, por exemplo a sigla do estado
  escopo?: string; // onde a curva é registrada; por padrão a do estado
  clique?: string; // dica no rodapé
  l2: Local | undefined; // presidente, 2º turno
  l1: Local | undefined; // presidente, 1º turno (encerrado)
  gov?: Local; // governador, 2º turno, onde há
  finalistas: VotoCand[]; // os dois do 2º turno, na ordem nacional
  cor: (v: VotoCand) => string;
};

export function DicaEstado({ uf, nome, sub, escopo = `2t:uf:${uf}`, clique = 'Clique para ver as cidades, o senado e os deputados.', l2, l1, gov, finalistas, cor }: Props) {
  const ref = l2 ?? l1;
  const apurado = !!l2 && l2.total > 0;
  const base = apurado ? l2 : undefined;
  const porId = (l: Local | undefined, id: string) => l?.votos.find((v) => v.id === id);
  const urnas = ref ? { feitas: l2?.secoesTotalizadas ?? 0, total: l2?.secoes ?? ref.secoes, pct: l2?.pctSecoes ?? 0 } : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-semibold leading-tight">
          {nome}
          {sub && <span className="ml-1.5 text-xs font-normal text-zinc-400">{sub}</span>}
        </p>
        {ref && <p className="text-xs text-zinc-400">{fmtInt(ref.eleitorado ?? 0)} eleitores</p>}
      </div>

      {urnas && (
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-zinc-400">Urnas apuradas</span>
            <span className="tabular-nums text-zinc-200">
              {fmtInt(urnas.feitas)} de {fmtInt(urnas.total)} · <span className="font-semibold">{fmtPct(urnas.pct)}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
            <div className="h-full rounded bg-emerald-400" style={{ width: `${Math.min(urnas.pct, 100)}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-400">Presidente · 2º turno</p>
        <div className="grid grid-cols-2 gap-2">
          {finalistas.map((f) => {
            const v = porId(base, f.id);
            return (
              <div key={f.id} className="flex flex-col items-center rounded-lg bg-zinc-900 p-2 text-center">
                <Foto eleicao="6257" pasta="br" id={f.id} cor={cor(f)} tamanho={52} />
                <p className="mt-1.5 w-full truncate text-xs font-medium">{f.nome}</p>
                <p className="text-[10px] text-zinc-500">{f.partido}</p>
                <p className="mt-0.5 text-xl font-bold leading-none tabular-nums">{base && v ? fmtPct(pct(v, base)) : '—'}</p>
                <p className="mt-0.5 text-xs tabular-nums text-zinc-400">{base && v ? `${fmtInt(v.votos)} votos` : 'sem votos'}</p>
              </div>
            );
          })}
        </div>
        {base && finalistas.length === 2 && (
          <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded bg-zinc-800">
            {finalistas.map((f) => {
              const v = porId(base, f.id);
              return <div key={f.id} style={{ width: `${v ? pct(v, base) : 0}%`, background: cor(f) }} />;
            })}
          </div>
        )}
      </div>

      <Evolucao escopo={escopo} candidatos={finalistas} cor={cor} />

      {l1 && l1.total > 0 && (
        <p className="text-xs text-zinc-400">
          {(() => {
            const v = apurado ? variacao(l2, l1, finalistas) : null;
            return v ? (
              <span className="mb-1 block text-zinc-300">
                Variação vs 1º turno:{' '}
                {finalistas.map((f, i) => (
                  <span key={f.id}>
                    {i > 0 && ' · '}
                    {f.nome.split(' ')[0]} <span className="tabular-nums">{`${v.deltas[f.id] >= 0 ? '+' : ''}${v.deltas[f.id].toFixed(1).replace('.', ',')} pts`}</span>
                  </span>
                ))}
              </span>
            ) : null;
          })()}
          1º turno:{' '}
          {finalistas.map((f, i) => {
            const v = porId(l1, f.id);
            return (
              <span key={f.id}>
                {i > 0 && ' · '}
                <span className="text-zinc-200">{f.nome.split(' ')[0]}</span> <span className="tabular-nums">{v ? fmtPct(pct(v, l1)) : '—'}</span>
              </span>
            );
          })}
        </p>
      )}

      {gov && (
        <div className="border-t border-zinc-800 pt-2">
          <p className="mb-1 flex justify-between text-[11px] uppercase tracking-wider text-zinc-400">
            <span>Governador · 2º turno</span>
            <span className="normal-case tabular-nums">{fmtPct(gov.pctSecoes)} das urnas</span>
          </p>
          <div className="space-y-1.5">
            {gov.votos.slice(0, 2).map((v) => (
              <p key={v.id} className="flex items-center gap-2 text-sm">
                <Foto eleicao="6259" pasta={uf} id={v.id} cor={cor(v)} tamanho={26} />
                <span className="min-w-0 flex-1 truncate">{v.nome}</span>
                <span className="tabular-nums">{gov.total ? fmtPct(pct(v, gov)) : '—'}</span>
                <span className="w-16 text-right text-xs tabular-nums text-zinc-400">{fmtInt(v.votos)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">{clique}</p>
    </div>
  );
}
