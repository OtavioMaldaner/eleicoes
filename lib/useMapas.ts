'use client';

import { useEffect, useState } from 'react';
import type { Mapas } from './mapas/agregar';
import { buscarMapas } from './mapas/fetch';

const INTERVALO_MS = 60_000;

async function buscar(): Promise<Mapas> {
  try {
    const r = await fetch('/api/mapas', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou: busca direto do navegador.
    const d = await buscarMapas({ cache: 'no-store' });
    if (d.estados.length === 0 && d.paises.length === 0) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

export function useMapas() {
  const [dados, setDados] = useState<Mapas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar();
        if (!vivo) return;
        // Descarta resposta mais antiga que a já exibida.
        setDados((a) => (a && d.buscadoEm < a.buscadoEm ? a : d));
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
