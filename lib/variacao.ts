import { EMPATE, intensidade, SEM_VOTOS, type Pintura } from './degrade';
import type { Local, VotoCand } from './mapas/agregar';

// Quanto cada finalista subiu ou caiu, em pontos percentuais dos votos, do 1º para o 2º turno.
export type Variacao = { deltas: Record<string, number>; ganhou: string | null };

// A variação cresce de 0 (quase apagado) a 20 pontos (pleno).
export const FAIXA_VARIACAO = [0, 20] as const;

const pct = (l: Local, id: string): number | null => {
  const v = l.votos.find((x) => x.id === id);
  return v && l.total > 0 ? (v.votos / l.total) * 100 : null;
};

// Precisa de votos nos dois turnos e dos dois finalistas em cada um (as cidades só trazem os quatro
// mais votados do 1º turno, então um finalista pode faltar): senão devolve null.
export function variacao(l2: Local | undefined, l1: Local | undefined, finalistas: VotoCand[]): Variacao | null {
  if (!l2 || !l1 || finalistas.length < 2) return null;
  const deltas: Record<string, number> = {};
  for (const f of finalistas) {
    const a = pct(l2, f.id);
    const b = pct(l1, f.id);
    if (a === null || b === null) return null;
    deltas[f.id] = a - b;
  }
  const [x, y] = finalistas.map((f) => deltas[f.id]);
  return { deltas, ganhou: x === y ? null : x > y ? finalistas[0].id : finalistas[1].id };
}

// Cor de quem mais subiu em relação ao 1º turno, mais forte quanto maior a subida.
export function pinturaVariacao(l2: Local | undefined, l1: Local | undefined, finalistas: VotoCand[], cor: (v: VotoCand) => string): Pintura {
  const v = variacao(l2, l1, finalistas);
  if (!v) return { fill: SEM_VOTOS, opacidade: 1 };
  const alvo = finalistas.find((f) => f.id === v.ganhou);
  return alvo ? { fill: cor(alvo), opacidade: intensidade(v.deltas[alvo.id], FAIXA_VARIACAO) } : { fill: EMPATE, opacidade: 1 };
}
