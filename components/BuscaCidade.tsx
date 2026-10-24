'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Cidade } from '@/lib/brasil/busca';

type Props = { onEscolher: (c: Cidade) => void };

// Campo de busca de cidade em todo o país: sugere enquanto digita e entrega a escolhida.
export function BuscaCidade({ onEscolher }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [achadas, setAchadas] = useState<Cidade[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    let vivo = true;
    const espera = setTimeout(() => {
      setBuscando(true);
      fetch(`/api/busca?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((c: Cidade[]) => {
          if (!vivo) return;
          setAchadas(c);
          setAtiva(0);
        })
        .catch(() => vivo && setAchadas([]))
        .finally(() => vivo && setBuscando(false));
    }, 150);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [texto]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  function escolher(c: Cidade) {
    onEscolher(c);
    setTexto('');
    setAchadas([]);
    setAberto(false);
  }

  const mostrar = aberto && texto.trim().length >= 2;
  const achadasVisiveis = mostrar ? achadas : [];

  return (
    <div ref={caixa} className="relative w-full sm:max-w-sm">
      <label htmlFor={id} className="sr-only">
        Buscar a votação de uma cidade
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={`${id}-lista`}
        aria-activedescendant={mostrar && achadasVisiveis[ativa] ? `${id}-${ativa}` : undefined}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAtiva((a) => Math.min(a + 1, achadas.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAtiva((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && mostrar && achadasVisiveis[ativa]) {
            e.preventDefault();
            escolher(achadasVisiveis[ativa]);
          } else if (e.key === 'Escape') {
            setAberto(false);
          }
        }}
        placeholder="Buscar cidade… (ex.: Santa Maria RS)"
        autoComplete="off"
        className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none"
      />
      {mostrar && (
        <ul id={`${id}-lista`} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {achadasVisiveis.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-400">{buscando ? 'Buscando…' : 'Nenhuma cidade encontrada.'}</li>
          ) : (
            achadasVisiveis.map((c, i) => (
              <li key={c.ibge} id={`${id}-${i}`} role="option" aria-selected={i === ativa}>
                <button
                  type="button"
                  onMouseEnter={() => setAtiva(i)}
                  onClick={() => escolher(c)}
                  className={`flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm ${i === ativa ? 'bg-zinc-800' : ''}`}
                >
                  <span>{c.nome}</span>
                  <span className="text-xs font-medium text-zinc-300">{c.uf.toUpperCase()}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
