'use client';

import { useEffect, useState } from 'react';
import { mesclarMapas, type Mapas } from './mapas/agregar';
import { aoVivo } from './aoVivo';

const INTERVALO_MS = 60_000;

async function buscar(): Promise<Mapas> {
  // Só o servidor consulta o TSE (veja useResultados).
  const r = await fetch('/api/mapas', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
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
        setDados((a) => mesclarMapas(a, d));
        setErro(null);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      }
    }
    const parar = aoVivo(ciclo, INTERVALO_MS);
    return () => {
      vivo = false;
      parar();
    };
  }, []);

  return { dados, erro };
}
