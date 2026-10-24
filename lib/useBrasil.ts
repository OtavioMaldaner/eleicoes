'use client';

import { useEffect, useState } from 'react';
import { eventos, type CargoBrasil, type Evento } from './brasil/analise';
import { mesclarBrasil, type Brasil, type Turno } from './brasil/fetch';

const INTERVALO_MS = 30_000;
const MAX_EVENTOS = 30;

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

export type EventoComHora = Evento & { t: number };
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
          const dados = mesclarBrasil(anterior, d);
          const novos = anterior ? eventos(anterior.estados, dados.estados, cargo === 'senador' ? 2 : 1).map((e) => ({ ...e, t: Date.now() })) : [];
          return { chave, cargo, dados, erro: null, eventos: [...novos, ...(mesmo ? a.eventos : [])].slice(0, MAX_EVENTOS) };
        });
      } catch (e) {
        if (!vivo) return;
        const erro = e instanceof Error ? e.message : String(e);
        setEstado((a) => (a.chave === chave ? { ...a, erro } : { chave, cargo, dados: null, erro, eventos: [] }));
      }
    }
    ciclo();
    const id = setInterval(ciclo, intervaloMs);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [cargo, turno, chave, intervaloMs, final]);

  // Logo após trocar de cargo, o estado ainda é do anterior: não mostra.
  return estado.chave === chave ? estado : { chave, cargo, dados: null, erro: null, eventos: [] };
}
