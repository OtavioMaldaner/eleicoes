'use client';

import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local } from '@/lib/mapas/agregar';
import { assentos, disputaSegundaVaga, hemiciclo, placarSenado, VAGAS_EM_DISPUTA, VAGAS_FORA_DA_DISPUTA } from '@/lib/brasil/senado';
import { BASE } from '@/lib/tse/config';

const TOTAL = VAGAS_EM_DISPUTA + VAGAS_FORA_DA_DISPUTA;
const POSICOES = hemiciclo(TOTAL, 4);
const EM_DISPUTA = '#52525b';
const FORA = '#27272a';
const L = 300;
const A = 160;
const RAIO = 138;

type Props = { estados: Local[]; cor: (partido: string) => string; onUf: (uf: string) => void; contagem: React.ReactNode };

function Foto({ uf, id, cor }: { uf: string; id: string; cor: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/6259/fotos/${uf}/${id}.jpeg`}
      alt=""
      loading="lazy"
      className="h-8 w-8 shrink-0 rounded-full bg-zinc-800 object-cover object-top"
      style={{ boxShadow: `0 0 0 2px #18181b, 0 0 0 3.5px ${cor}` }}
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  );
}

// Visão do país no Senado: hemiciclo, vagas por partido e os estados em que a 2ª vaga está mais apertada.
export function PainelSenado({ estados, cor, onUf, contagem }: Props) {
  const placar = placarSenado(estados);
  const ocupados = assentos(estados);
  const disputas = disputaSegundaVaga(estados);
  const porUf = new Map<string, typeof ocupados>();
  for (const a of ocupados) porUf.set(a.uf, [...(porUf.get(a.uf) ?? []), a]);

  // Da esquerda para a direita: partidos (do maior para o menor), vagas ainda sem votos, vagas fora da disputa.
  const cadeiras: { cor: string; opacidade: number; titulo: string }[] = [
    ...placar.partidos.flatMap((p) =>
      ocupados
        .filter((a) => a.partido === p.partido)
        .sort((a, b) => Number(b.eleito) - Number(a.eleito))
        .map((a) => ({
          cor: cor(a.partido),
          opacidade: a.eleito ? 1 : 0.5,
          titulo: `${a.nome} (${a.partido}, ${a.uf.toUpperCase()})${a.eleito ? ', eleito' : ', na vaga'}`,
        })),
    ),
    ...Array.from({ length: placar.semLider }, () => ({ cor: EM_DISPUTA, opacidade: 1, titulo: 'Vaga em disputa, ainda sem votos' })),
    ...Array.from({ length: VAGAS_FORA_DA_DISPUTA }, () => ({ cor: FORA, opacidade: 1, titulo: 'Fora da disputa: mandato até 2031' })),
  ];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Senado no Brasil">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Senado · Brasil</p>
        <p className="text-xs text-zinc-500">Duas vagas por estado</p>
      </div>
      {ocupados.length === 0 && <div className="mt-2">{contagem}</div>}

      <div className="relative mx-auto mt-3" style={{ maxWidth: L }}>
        <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`Hemiciclo do Senado: ${placar.definidas} de ${VAGAS_EM_DISPUTA} vagas definidas`}>
          {POSICOES.map((p, i) => {
            const c = cadeiras[i];
            return (
              <circle key={i} cx={L / 2 + p.x * RAIO} cy={A - 8 - p.y * RAIO} r={6.5} fill={c.cor} fillOpacity={c.opacidade}>
                <title>{c.titulo}</title>
              </circle>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center leading-none">
          <span className="block text-3xl font-semibold tabular-nums">{placar.definidas}</span>
          <span className="text-xs text-zinc-400">de {VAGAS_EM_DISPUTA} definidas</span>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-300">
        {placar.partidos.map((p) => (
          <li key={p.partido} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor(p.partido) }} />
            {p.partido} <span className="font-semibold tabular-nums">{p.vagas}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: EM_DISPUTA }} />
          Sem votos <span className="font-semibold tabular-nums">{placar.semLider}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-zinc-600" style={{ background: FORA }} />
          Fora da disputa <span className="font-semibold tabular-nums">{VAGAS_FORA_DA_DISPUTA}</span>
        </li>
      </ul>
      <p className="mt-1 text-xs text-zinc-500">Cor cheia: eleito pelo TSE. Cor clara: está na vaga, ainda em apuração.</p>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <h2 className="mb-2 text-sm font-semibold">Quem está nas duas vagas de cada estado</h2>
        <div className="grid grid-cols-9 gap-1">
          {[...estados]
            .sort((a, b) => a.chave.localeCompare(b.chave))
            .map((l) => {
              const dois = porUf.get(l.chave) ?? [];
              return (
                <button
                  key={l.chave}
                  type="button"
                  onClick={() => onUf(l.chave)}
                  title={dois.length ? dois.map((a) => `${a.nome} (${a.partido})`).join(' e ') : `${l.nome}: sem votos apurados`}
                  className="rounded bg-zinc-800 px-0.5 pb-1 pt-0.5 text-center text-[10px] font-semibold tracking-wide text-zinc-200 hover:bg-zinc-700"
                >
                  {l.chave.toUpperCase()}
                  <span className="mt-0.5 flex h-1.5 gap-px overflow-hidden rounded-sm">
                    {[0, 1].map((i) => (
                      <span
                        key={i}
                        className="flex-1"
                        style={{ background: dois[i] ? cor(dois[i].partido) : EM_DISPUTA, opacity: dois[i] && !dois[i].eleito ? 0.5 : 1 }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <h2 className="text-sm font-semibold">A disputa pela 2ª vaga</h2>
        {disputas.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Aguardando as primeiras seções.</p>
        ) : (
          <>
            <p className="text-xs text-zinc-500">Do estado mais apertado ao mais folgado: 2º colocado contra o 3º.</p>
            <ol className="mt-2 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {disputas.map((d) => (
                <li key={d.uf}>
                  <button type="button" onClick={() => onUf(d.uf)} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-zinc-800">
                    <span className="w-8 shrink-0 rounded bg-zinc-800 py-1 text-center text-xs font-semibold">{d.uf.toUpperCase()}</span>
                    <Foto uf={d.uf} id={d.segundo.id} cor={cor(d.segundo.partido)} />
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="block truncate text-sm">
                        {d.segundo.nome} <span className="text-zinc-500">{d.segundo.partido}</span>
                      </span>
                      <span className="block truncate text-zinc-400">
                        {fmtPct(d.margem)} à frente de {d.terceiro.nome} ({fmtInt(d.votos)} votos)
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
