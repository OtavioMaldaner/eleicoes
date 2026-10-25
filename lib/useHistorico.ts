'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { criarPonto, lerHistorico, registrar, semApuracao, type Ponto } from './historico';
import type { Marcados } from './marcados';
import type { Resultados } from './tse/types';

const chave = (escopo: string) => `eleicoes2026:historico:${escopo}`;
const VAZIO: Ponto[] = [];

// Histórico em memória por abrangência, espelhado no localStorage.
const memoria = new Map<string, Ponto[]>();
const ouvintes = new Set<() => void>();
let versao = 0; // sobe a cada histórico que muda, para quem acompanha vários escopos de uma vez

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

// `persistir: false` guarda só em memória (para muitos locais, como os municípios de um estado).
export function adicionar(escopo: string, ponto: Ponto, persistir = true) {
  if (semApuracao(ponto)) return;
  const atual = obter(escopo);
  const novo = registrar(atual, ponto);
  if (novo === atual) return;
  memoria.set(escopo, novo);
  versao++;
  if (persistir) {
    try {
      localStorage.setItem(chave(escopo), JSON.stringify(novo));
    } catch {
      // Sem espaço no navegador: o histórico segue só em memória.
    }
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

// Histórico já registrado de uma abrangência, para quem só quer desenhar (não registra nada).
export function useHistoricoLido(escopo: string): Ponto[] {
  const ler = useCallback(() => obter(escopo), [escopo]);
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

// Históricos já registrados de vários escopos, para quem só quer desenhar (não registra nada).
export function useHistoricos(escopos: string[]): Map<string, Ponto[]> {
  const v = useSyncExternalStore(assinar, () => versao, () => 0);
  const chaves = escopos.join('|');
  // `v` só invalida o memo quando algum histórico muda; os dados vêm de `obter`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Map((chaves ? chaves.split('|') : []).map((e) => [e, obter(e)])), [v, chaves]);
}
