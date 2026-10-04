'use client';

import { useCallback, useSyncExternalStore } from 'react';

const evento = (chave: string) => `valor-local:${chave}`;

// Lê e grava uma chave do localStorage; `null` remove a chave.
export function useValorLocal(chave: string): [string | null, (v: string | null) => void] {
  const assinar = useCallback(
    (cb: () => void) => {
      window.addEventListener('storage', cb);
      window.addEventListener(evento(chave), cb);
      return () => {
        window.removeEventListener('storage', cb);
        window.removeEventListener(evento(chave), cb);
      };
    },
    [chave],
  );

  const ler = useCallback(() => {
    try {
      return localStorage.getItem(chave);
    } catch {
      return null;
    }
  }, [chave]);

  const valor = useSyncExternalStore(assinar, ler, () => null);

  const gravar = useCallback(
    (v: string | null) => {
      try {
        if (v === null) localStorage.removeItem(chave);
        else localStorage.setItem(chave, v);
      } catch {}
      window.dispatchEvent(new Event(evento(chave)));
    },
    [chave],
  );

  return [valor, gravar];
}
