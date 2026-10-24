'use client';

import type { EventoComHora } from '@/lib/useBrasil';

// Viradas, primeiros votos e marcos de cada estado, do mais novo para o mais antigo. Os eventos são
// detectados comparando uma atualização com a anterior, então só existem enquanto a página está aberta.
export function UltimasAtualizacoes({ eventos, onUf }: { eventos: EventoComHora[]; onUf?: (uf: string) => void }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4" aria-live="polite" aria-label="Últimas atualizações">
      <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Últimas atualizações</h2>
      {eventos.length === 0 ? (
        <p className="text-sm text-zinc-500">Viradas, primeiros votos e marcos de cada estado aparecem aqui enquanto esta página estiver aberta.</p>
      ) : (
        <ol className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
          {eventos.map((e, i) => (
            <li key={`${e.t}-${e.uf}-${e.tipo}-${i}`} className="flex gap-2">
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {new Date(e.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {onUf ? (
                <button type="button" onClick={() => onUf(e.uf)} className="text-left hover:underline">
                  {e.texto}
                </button>
              ) : (
                <span>{e.texto}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
