'use client';

import { horaCurta } from '@/lib/formato';

type Props = {
  instantes: number[]; // momentos gravados, em ordem
  valor: number | null; // momento mostrado; null = ao vivo
  onMudar: (t: number | null) => void;
  desativado?: string; // motivo, quando o controle não se aplica ao modo atual
};

// Slider para voltar o mapa no tempo, com o histórico gravado neste navegador.
export function LinhaDoTempo({ instantes, valor, onMudar, desativado }: Props) {
  const pronto = instantes.length >= 2 && !desativado;
  const ultimo = instantes.length - 1;
  let indice = ultimo;
  if (valor !== null) instantes.forEach((t, i) => t <= valor && (indice = i));
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={Math.max(ultimo, 0)}
          step={1}
          value={Math.max(indice, 0)}
          disabled={!pronto}
          aria-label="Voltar no tempo"
          aria-valuetext={pronto ? horaCurta(instantes[indice]) : undefined}
          onChange={(e) => {
            const i = Number(e.target.value);
            onMudar(i >= ultimo ? null : instantes[i]);
          }}
          className="h-2 flex-1 cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <button
          type="button"
          aria-pressed={valor === null}
          onClick={() => onMudar(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${valor === null ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200' : 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'}`}
        >
          Ao vivo
        </button>
      </div>
      {pronto ? (
        <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-400">
          <span>{horaCurta(instantes[0])}</span>
          <span className="text-zinc-200">{valor === null ? 'Ao vivo' : horaCurta(valor)}</span>
          <span>{horaCurta(instantes[ultimo])}</span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-zinc-400">
          {desativado ?? 'O histórico é gravado neste navegador enquanto a página fica aberta; ainda não há o suficiente para voltar no tempo.'}
        </p>
      )}
    </div>
  );
}
