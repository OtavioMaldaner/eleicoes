'use client';

import type { CargoBrasil } from '@/lib/brasil/analise';
import type { Estado } from '@/lib/brasil/estado';
import { CARGOS_BRASIL } from '@/lib/brasil/fetch';
import { fmtInt, fmtPct } from '@/lib/formato';
import type { Local, VotoCand } from '@/lib/mapas/agregar';
import { BASE } from '@/lib/tse/config';

type Cor = (cargo: CargoBrasil, v: VotoCand) => string;
type Props = { uf: string; nome: string; estado: Estado | null; cor: Cor; onFechar: () => void };

const pct = (v: VotoCand | undefined, l: Local) => (v && l.total ? (v.votos / l.total) * 100 : 0);

function Foto({ cargo, uf, v, cor, tamanho = 'h-9 w-9' }: { cargo: CargoBrasil; uf: string; v: VotoCand; cor: string; tamanho?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/${CARGOS_BRASIL[cargo].eleicao}/fotos/${cargo === 'presidente' ? 'br' : uf}/${v.id}.jpeg`}
      alt=""
      loading="lazy"
      className={`${tamanho} shrink-0 rounded-full bg-zinc-800 object-cover object-top`}
      style={{ boxShadow: `0 0 0 2px #18181b, 0 0 0 3.5px ${cor}` }}
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
  );
}

function Linha({ cargo, uf, v, l, cor }: { cargo: CargoBrasil; uf: string; v: VotoCand; l: Local; cor: Cor }) {
  return (
    <li className="flex items-center gap-2.5">
      <Foto cargo={cargo} uf={uf} v={v} cor={cor(cargo, v)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{v.nome}</span>
        <span className="block text-xs text-zinc-400">
          {v.partido} · {v.numero}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtPct(pct(v, l))}</span>
    </li>
  );
}

// Dois candidatos frente a frente, com uma barra dividida entre eles.
function Duelo({
  cargo,
  uf,
  a,
  b,
  l,
  cor,
  rotuloVantagem,
}: {
  cargo: CargoBrasil;
  uf: string;
  a: VotoCand;
  b: VotoCand;
  l: Local;
  cor: Cor;
  rotuloVantagem: string;
}) {
  const pa = pct(a, l);
  const pb = pct(b, l);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Foto cargo={cargo} uf={uf} v={a} cor={cor(cargo, a)} />
          <span className="min-w-0">
            <span className="block truncate text-sm">{a.nome}</span>
            <span className="block text-xs text-zinc-400">{a.partido}</span>
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-right">
          <span className="min-w-0">
            <span className="block truncate text-sm">{b.nome}</span>
            <span className="block text-xs text-zinc-400">{b.partido}</span>
          </span>
          <Foto cargo={cargo} uf={uf} v={b} cor={cor(cargo, b)} />
        </div>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between text-xl font-semibold tabular-nums">
        <span>{fmtPct(pa)}</span>
        <span>{fmtPct(pb)}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded bg-zinc-800">
        <div style={{ width: `${pa}%`, background: cor(cargo, a) }} />
        <div className="flex-1" />
        <div style={{ width: `${pb}%`, background: cor(cargo, b) }} />
      </div>
      <p className="mt-1.5 flex justify-between text-xs text-zinc-400">
        <span>{rotuloVantagem}</span>
        <span className="tabular-nums text-zinc-200">{fmtInt(a.votos - b.votos)} votos</span>
      </p>
    </div>
  );
}

function Secao({ titulo, l, children }: { titulo: string; l: Local | null; children: (l: Local) => React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800 pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs uppercase tracking-widest text-zinc-400">{titulo}</h3>
        {l && l.total > 0 && <span className="text-xs tabular-nums text-zinc-500">{fmtPct(l.pctSecoes)} das seções</span>}
      </div>
      {!l ? (
        <p className="text-sm text-zinc-500">Sem resposta do TSE nesta atualização.</p>
      ) : l.total === 0 ? (
        <p className="text-sm text-zinc-500">Ainda sem votos apurados.</p>
      ) : (
        children(l)
      )}
    </div>
  );
}

// Um estado de perto: presidente, governador e senado, lado a lado no mesmo cartão.
export function CartaoEstado({ uf, nome, estado, cor, onFechar }: Props) {
  const ref = estado?.presidente ?? estado?.governador ?? estado?.senador;
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-label={nome}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold leading-tight">{nome}</h2>
          {ref && (
            <p className="text-xs text-zinc-400">
              {fmtPct(ref.pctSecoes)} das seções · {fmtInt(ref.eleitorado ?? 0)} eleitores
            </p>
          )}
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

      {!estado ? (
        <p className="text-sm text-zinc-400">Carregando {nome}…</p>
      ) : (
        <>
          <Secao titulo={`Presidente em ${uf.toUpperCase()}`} l={estado.presidente}>
            {(l) => (
              <ol className="space-y-2">
                {l.votos.slice(0, 3).map((v) => (
                  <Linha key={v.id} cargo="presidente" uf={uf} v={v} l={l} cor={cor} />
                ))}
              </ol>
            )}
          </Secao>

          <Secao titulo="Governador" l={estado.governador}>
            {(l) => (
              <>
                {l.votos[1] && l.votos[1].votos > 0 ? (
                  <Duelo cargo="governador" uf={uf} a={l.votos[0]} b={l.votos[1]} l={l} cor={cor} rotuloVantagem="Vantagem" />
                ) : (
                  <ol>
                    <Linha cargo="governador" uf={uf} v={l.votos[0]} l={l} cor={cor} />
                  </ol>
                )}
                {l.votos[2] && l.votos[2].votos > 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    3º: {l.votos[2].nome} ({l.votos[2].partido}) {fmtPct(pct(l.votos[2], l))}
                  </p>
                )}
              </>
            )}
          </Secao>

          <Secao titulo="Senado · duas vagas" l={estado.senador}>
            {(l) => (
              <>
                <ol>
                  <Linha cargo="senador" uf={uf} v={l.votos[0]} l={l} cor={cor} />
                </ol>
                {l.votos[1] && l.votos[2] && l.votos[1].votos > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-zinc-500">2ª vaga</p>
                    <Duelo cargo="senador" uf={uf} a={l.votos[1]} b={l.votos[2]} l={l} cor={cor} rotuloVantagem="Vantagem na 2ª vaga" />
                  </div>
                )}
              </>
            )}
          </Secao>
        </>
      )}
    </section>
  );
}
