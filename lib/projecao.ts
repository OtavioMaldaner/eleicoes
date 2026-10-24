import type { Local } from './mapas/agregar';

export const SECOES_MINIMAS_ESTADO = 5; // % de seções para extrapolar um estado
export const SECOES_MINIMAS_PAIS = 10; // % de seções no país para mostrar a projeção

export type Projecao = {
  a: number;
  b: number;
  pctA: number; // % dos votos dos dois, projetado
  pctB: number;
  estadosPelaApuracao: number; // extrapolados do que já foi contado
  estadosPeloPrimeiroTurno: number; // ainda sem contagem suficiente: usa o 1º turno como base
};

const votos = (l: Local | undefined, id: string) => l?.votos.find((v) => v.id === id)?.votos ?? 0;

// Estimativa simples do resultado final: em cada estado, o que já foi contado é multiplicado pelo
// que falta (seções totais / seções apuradas); onde ainda não há contagem suficiente, usa a divisão
// entre os dois finalistas no 1º turno, com o total de votos válidos do 1º turno. Não leva em conta
// que a ordem da apuração enviesa o parcial (cidades grandes ou pequenas primeiro), então é só uma
// estimativa e precisa ser apresentada como tal.
export function projetar(estados2: Local[], estados1: Local[], idA: string, idB: string): Projecao | null {
  const por1 = new Map(estados1.map((l) => [l.chave, l]));
  let a = 0;
  let b = 0;
  let pelaApuracao = 0;
  let peloPrimeiro = 0;
  for (const l2 of estados2) {
    const feito = l2.secoes > 0 ? (l2.secoesTotalizadas / l2.secoes) * 100 : 0;
    const dois = votos(l2, idA) + votos(l2, idB);
    if (feito >= SECOES_MINIMAS_ESTADO && dois > 0) {
      const fator = l2.secoes / l2.secoesTotalizadas;
      a += votos(l2, idA) * fator;
      b += votos(l2, idB) * fator;
      pelaApuracao++;
      continue;
    }
    const l1 = por1.get(l2.chave);
    const dois1 = votos(l1, idA) + votos(l1, idB);
    if (l1 && dois1 > 0) {
      a += (l1.total * votos(l1, idA)) / dois1;
      b += (l1.total * votos(l1, idB)) / dois1;
      peloPrimeiro++;
    }
  }
  const soma = a + b;
  if (soma === 0) return null;
  return { a, b, pctA: (a / soma) * 100, pctB: (b / soma) * 100, estadosPelaApuracao: pelaApuracao, estadosPeloPrimeiroTurno: peloPrimeiro };
}
