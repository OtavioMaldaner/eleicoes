import type { Ponto } from './historico';
import { montar, type Local } from './mapas/agregar';

// Momentos gravados em qualquer um dos históricos, sem repetir e em ordem.
export function instantes(historicos: Ponto[][]): number[] {
  return [...new Set(historicos.flatMap((h) => h.map((p) => p.t)))].sort((a, b) => a - b);
}

// Último ponto gravado até o momento `t`.
export function pontoEm(hist: Ponto[], t: number): Ponto | null {
  let achado: Ponto | null = null;
  for (const p of hist) if (p.t <= t && (!achado || p.t >= achado.t)) achado = p;
  return achado;
}

// O local como estava em `t`: votos e % de seções do ponto, nomes e partidos do local atual.
export function localEm(base: Local | undefined, hist: Ponto[], t: number): Local | undefined {
  const c = pontoEm(hist, t)?.cargos.presidente;
  if (!base || !c) return undefined;
  const votos = base.votos.map((v) => ({ ...v, votos: c.c[v.id]?.[0] ?? 0 }));
  return montar(base.chave, base.nome, base.secoes, Math.round((c.p / 100) * base.secoes), votos);
}
