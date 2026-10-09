'use client';

import { useEffect, useState } from 'react';
import { buscarResultados, mesclar } from './tse/fetch';
import type { Resultados, Turno } from './tse/types';

const INTERVALO_MS = 30_000;

async function buscar(municipio: string | null, turno: Turno): Promise<Resultados> {
  try {
    const params = new URLSearchParams();
    if (municipio) params.set('mun', municipio);
    if (turno === 2) params.set('turno', '2');
    const url = params.size ? `/api/resultados?${params}` : '/api/resultados';
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou (por exemplo, TSE bloqueando o servidor): busca direto do navegador.
    const d = await buscarResultados({ cache: 'no-store' }, municipio ?? undefined, turno);
    if (d.cargos.every((c) => c.erro)) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

type Estado = { escopo: string; dados: Resultados | null; erro: string | null };

export function useResultados(municipio: string | null, turno: Turno = 1) {
  const escopo = `${turno}:${municipio ?? 'geral'}`;
  const [estado, setEstado] = useState<Estado>({ escopo, dados: null, erro: null });

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar(municipio, turno);
        if (!vivo) return;
        // Só mescla com dados da mesma abrangência.
        setEstado((a) => ({ escopo, dados: mesclar(a.escopo === escopo ? a.dados : null, d), erro: null }));
      } catch (e) {
        if (!vivo) return;
        const erro = e instanceof Error ? e.message : String(e);
        setEstado((a) => ({ escopo, dados: a.escopo === escopo ? a.dados : null, erro }));
      }
    }
    ciclo();
    const id = setInterval(ciclo, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [municipio, turno, escopo]);

  // Logo após trocar de abrangência, o estado ainda é da anterior: não mostra.
  return estado.escopo === escopo ? { dados: estado.dados, erro: estado.erro } : { dados: null, erro: null };
}
