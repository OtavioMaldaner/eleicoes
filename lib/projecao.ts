import type { Local } from './mapas/agregar';

export const SECOES_MINIMAS_ESTADO = 5; // % de seções para extrapolar um estado
export const SECOES_MINIMAS_PAIS = 10; // % de seções no país para mostrar a projeção
export const MARGEM_BASE = 8; // pontos percentuais de diferença com nada apurado

export type Projecao = {
  a: number;
  b: number;
  pctA: number; // % dos votos dos dois, projetado
  pctB: number;
  estadosPelaApuracao: number; // extrapolados do que já foi contado
  estadosPeloPrimeiroTurno: number; // ainda sem contagem suficiente: usa o 1º turno como base
  margem: number; // margem de erro estimada, em pontos percentuais, aplicada à diferença entre os dois
  empateTecnico: boolean; // a diferença projetada cabe na margem
};

const votos = (l: Local | undefined, id: string) => l?.votos.find((v) => v.id === id)?.votos ?? 0;

// Estimativa simples do resultado final: em cada estado, o que já foi contado é multiplicado pelo
// que falta (seções totais / seções apuradas); onde ainda não há contagem suficiente, usa a divisão
// entre os dois finalistas no 1º turno, com o total de votos válidos do 1º turno. Não leva em conta
// que a ordem da apuração enviesa o parcial (cidades grandes ou pequenas primeiro), então é só uma
// estimativa e precisa ser apresentada como tal.
//
// A margem não é um intervalo estatístico: cada estado contribui com MARGEM_BASE * sqrt(1 - apurado),
// ou MARGEM_BASE inteira quando usa o 1º turno, ponderada pelos votos projetados do estado.
export function projetar(estados2: Local[], estados1: Local[], idA: string, idB: string): Projecao | null {
  const por1 = new Map(estados1.map((l) => [l.chave, l]));
  let a = 0;
  let b = 0;
  let pelaApuracao = 0;
  let peloPrimeiro = 0;
  let somaMargem = 0; // margem de cada estado × votos projetados dele
  for (const l2 of estados2) {
    const feito = l2.secoes > 0 ? (l2.secoesTotalizadas / l2.secoes) * 100 : 0;
    const dois = votos(l2, idA) + votos(l2, idB);
    if (feito >= SECOES_MINIMAS_ESTADO && dois > 0) {
      const fator = l2.secoes / l2.secoesTotalizadas;
      const pa = votos(l2, idA) * fator;
      const pb = votos(l2, idB) * fator;
      a += pa;
      b += pb;
      somaMargem += (pa + pb) * MARGEM_BASE * Math.sqrt(Math.max(1 - feito / 100, 0));
      pelaApuracao++;
      continue;
    }
    const l1 = por1.get(l2.chave);
    const dois1 = votos(l1, idA) + votos(l1, idB);
    if (l1 && dois1 > 0) {
      const pa = (l1.total * votos(l1, idA)) / dois1;
      const pb = (l1.total * votos(l1, idB)) / dois1;
      a += pa;
      b += pb;
      somaMargem += (pa + pb) * MARGEM_BASE;
      peloPrimeiro++;
    }
  }
  const soma = a + b;
  if (soma === 0) return null;
  const pctA = (a / soma) * 100;
  const pctB = (b / soma) * 100;
  const margem = somaMargem / soma;
  return { a, b, pctA, pctB, estadosPelaApuracao: pelaApuracao, estadosPeloPrimeiroTurno: peloPrimeiro, margem, empateTecnico: Math.abs(pctA - pctB) <= margem };
}
