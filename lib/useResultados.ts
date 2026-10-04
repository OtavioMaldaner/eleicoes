'use client';

import { useEffect, useState } from 'react';
import { buscarResultados, mesclar } from './tse/fetch';
import type { Resultados } from './tse/types';

const INTERVALO_MS = 30_000;

async function buscar(): Promise<Resultados> {
  try {
    const r = await fetch('/api/resultados', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou (por exemplo, TSE bloqueando o servidor): busca direto do navegador.
    const d = await buscarResultados({ cache: 'no-store' });
    if (d.cargos.every((c) => c.erro)) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

export function useResultados() {
  const [dados, setDados] = useState<Resultados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar();
        if (!vivo) return;
        setDados((anterior) => mesclar(anterior, d));
        setErro(null);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      }
    }
    ciclo();
    const id = setInterval(ciclo, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  return { dados, erro };
}
