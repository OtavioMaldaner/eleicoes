'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { criarPonto, lerHistorico, registrar, semApuracao, type Ponto } from './historico';
import type { Marcados } from './marcados';
import type { Resultados } from './tse/types';

const chave = (escopo: string) => `eleicoes2026:historico:${escopo}`;
const VAZIO: Ponto[] = [];

// Histórico em memória por abrangência, espelhado no localStorage.
const memoria = new Map<string, Ponto[]>();
const ouvintes = new Set<() => void>();

function obter(escopo: string): Ponto[] {
  let h = memoria.get(escopo);
  if (!h) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(chave(escopo));
    } catch {}
    h = lerHistorico(raw);
    memoria.set(escopo, h);
  }
  return h;
}

function adicionar(escopo: string, ponto: Ponto) {
  if (semApuracao(ponto)) return;
  const atual = obter(escopo);
  const novo = registrar(atual, ponto);
  if (novo === atual) return;
  memoria.set(escopo, novo);
  try {
    localStorage.setItem(chave(escopo), JSON.stringify(novo));
  } catch {
    // Sem espaço no navegador: o histórico segue só em memória.
  }
  ouvintes.forEach((f) => f());
}

function assinar(cb: () => void) {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

export function useHistorico(escopo: string, dados: Resultados | null, marcados: Marcados): Ponto[] {
  const ler = useCallback(() => obter(escopo), [escopo]);
  const historico = useSyncExternalStore(assinar, ler, () => VAZIO);

  useEffect(() => {
    if (dados) adicionar(escopo, criarPonto(dados, marcados, Date.now()));
  }, [escopo, dados, marcados]);

  return historico;
}
