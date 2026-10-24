'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { UFS } from './mapas/dados';

const EVENTO = 'estado-na-url';
const SIGLAS = new Set(UFS.map((u) => u.sigla));

export function lerUf(busca: string): string | null {
  const u = new URLSearchParams(busca).get('uf')?.toLowerCase() ?? null;
  return u && SIGLAS.has(u) ? u : null;
}

function assinar(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EVENTO, cb);
  };
}

// O estado aberto mora no endereço (?uf=sp), para poder ser compartilhado e sobreviver a um recarregamento.
// No servidor (HTML estático) é sempre null; no navegador passa a valer o endereço.
export function useEstadoNaUrl(): [string | null, (uf: string | null) => void] {
  const uf = useSyncExternalStore(
    assinar,
    () => lerUf(location.search),
    () => null,
  );
  const definir = useCallback((k: string | null) => {
    try {
      history.replaceState(null, '', k ? `?uf=${k}` : location.pathname);
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [uf, definir];
}
