'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { CHAVE_MARCADOS, lerMarcados, type Marca } from './marcados';

const EVENTO = 'marcados-mudou';

function assinar(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENTO, cb);
  };
}

function ler(): string | null {
  try {
    return localStorage.getItem(CHAVE_MARCADOS);
  } catch {
    return null;
  }
}

export function useMarcados() {
  const raw = useSyncExternalStore(assinar, ler, () => null);
  const marcados = useMemo(() => lerMarcados(raw), [raw]);

  // Clicar na marca já ativa remove a marcação.
  const alternar = useCallback((id: string, marca: Marca) => {
    const atual = lerMarcados(ler());
    if (atual[id] === marca) delete atual[id];
    else atual[id] = marca;
    try {
      localStorage.setItem(CHAVE_MARCADOS, JSON.stringify(atual));
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { marcados, alternar };
}
