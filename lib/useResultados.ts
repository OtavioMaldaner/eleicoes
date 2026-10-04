'use client';

import { useEffect, useState } from 'react';
import { buscarResultados, mesclar } from './tse/fetch';
import type { Resultados } from './tse/types';

const INTERVALO_MS = 30_000;

async function buscar(municipio: string | null): Promise<Resultados> {
  try {
    const url = municipio ? `/api/resultados?mun=${municipio}` : '/api/resultados';
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou (por exemplo, TSE bloqueando o servidor): busca direto do navegador.
    const d = await buscarResultados({ cache: 'no-store' }, municipio ?? undefined);
    if (d.cargos.every((c) => c.erro)) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

type Estado = { escopo: string; dados: Resultados | null; erro: string | null };

export function useResultados(municipio: string | null) {
  const escopo = municipio ?? 'geral';
  const [estado, setEstado] = useState<Estado>({ escopo, dados: null, erro: null });

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar(municipio);
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
  }, [municipio, escopo]);

  // Logo após trocar de abrangência, o estado ainda é da anterior: não mostra.
  return estado.escopo === escopo ? { dados: estado.dados, erro: estado.erro } : { dados: null, erro: null };
}
