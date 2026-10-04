'use client';

import { useEffect, useState } from 'react';
import { eventos, type CargoBrasil, type Evento } from './brasil/analise';
import { buscarBrasil, mesclarBrasil, type Brasil } from './brasil/fetch';

const INTERVALO_MS = 30_000;
const MAX_EVENTOS = 30;

async function buscar(cargo: CargoBrasil): Promise<Brasil> {
  try {
    const r = await fetch(`/api/brasil?cargo=${cargo}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou: busca direto do navegador.
    const d = await buscarBrasil(cargo, { cache: 'no-store' });
    if (d.estados.length === 0) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

export type EventoComHora = Evento & { t: number };
type Estado = { cargo: CargoBrasil; dados: Brasil | null; erro: string | null; eventos: EventoComHora[] };

export function useBrasil(cargo: CargoBrasil) {
  const [estado, setEstado] = useState<Estado>({ cargo, dados: null, erro: null, eventos: [] });

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar(cargo);
        if (!vivo) return;
        setEstado((a) => {
          const mesmo = a.cargo === cargo;
          const anterior = mesmo ? a.dados : null;
          if (anterior && d.buscadoEm < anterior.buscadoEm) return a; // resposta atrasada
          const dados = mesclarBrasil(anterior, d);
          const novos = anterior ? eventos(anterior.estados, dados.estados).map((e) => ({ ...e, t: Date.now() })) : [];
          return { cargo, dados, erro: null, eventos: [...novos, ...(mesmo ? a.eventos : [])].slice(0, MAX_EVENTOS) };
        });
      } catch (e) {
        if (!vivo) return;
        const erro = e instanceof Error ? e.message : String(e);
        setEstado((a) => (a.cargo === cargo ? { ...a, erro } : { cargo, dados: null, erro, eventos: [] }));
      }
    }
    ciclo();
    const id = setInterval(ciclo, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [cargo]);

  // Logo após trocar de cargo, o estado ainda é do anterior: não mostra.
  return estado.cargo === cargo ? estado : { cargo, dados: null, erro: null, eventos: [] };
}
