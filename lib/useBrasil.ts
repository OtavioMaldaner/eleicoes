'use client';

import { useEffect, useState } from 'react';
import type { CargoBrasil, EventoComHora } from './brasil/analise';
import { mesclarBrasil, type Brasil, type Turno } from './brasil/fetch';
import { aoVivo } from './aoVivo';

const INTERVALO_MS = 30_000;

// `final`: o 1º turno já terminou, então o servidor guarda a resposta por bastante tempo.
async function buscar(cargo: CargoBrasil, turno: Turno, final: boolean): Promise<Brasil> {
  // Só o servidor consulta o TSE (veja useResultados).
  const q = new URLSearchParams({ cargo });
  if (turno === 2) q.set('turno', '2');
  else if (final) q.set('final', '1');
  const r = await fetch(`/api/brasil?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

export type { EventoComHora };
type Estado = { chave: string; cargo: CargoBrasil; dados: Brasil | null; erro: string | null; eventos: EventoComHora[] };

export function useBrasil(cargo: CargoBrasil, turno: Turno = 1, intervaloMs = INTERVALO_MS, final = false) {
  const chave = `${turno}:${cargo}`;
  const [estado, setEstado] = useState<Estado>({ chave, cargo, dados: null, erro: null, eventos: [] });

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar(cargo, turno, final);
        if (!vivo) return;
        setEstado((a) => {
          const mesmo = a.chave === chave;
          const anterior = mesmo ? a.dados : null;
          if (anterior && d.buscadoEm < anterior.buscadoEm) return a; // resposta atrasada
          // As últimas atualizações vêm prontas do servidor, iguais para todos os visitantes.
          return { chave, cargo, dados: mesclarBrasil(anterior, d), erro: null, eventos: d.eventos ?? [] };
        });
      } catch (e) {
        if (!vivo) return;
        const erro = e instanceof Error ? e.message : String(e);
        setEstado((a) => (a.chave === chave ? { ...a, erro } : { chave, cargo, dados: null, erro, eventos: [] }));
      }
    }
    const parar = aoVivo(ciclo, intervaloMs);
    return () => {
      vivo = false;
      parar();
    };
  }, [cargo, turno, chave, intervaloMs, final]);

  // Logo após trocar de cargo, o estado ainda é do anterior: não mostra.
  return estado.chave === chave ? estado : { chave, cargo, dados: null, erro: null, eventos: [] };
}
