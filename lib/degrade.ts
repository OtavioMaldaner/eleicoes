import type { Local, VotoCand } from './mapas/agregar';

export const SEM_VOTOS = '#3f3f46';
export const EMPATE = '#71717a';

// O degradê vai do quase apagado ao pleno entre estes percentuais.
export const FAIXA_LIDER = [50, 80] as const; // quem lidera num 2º turno tem 50% ou mais
export const FAIXA_LIDER_1T = [30, 70] as const; // no 1º turno o líder tem bem menos de 50%
export const FAIXA_CANDIDATO = [15, 80] as const;

export const intensidade = (p: number, [de, ate]: readonly [number, number]) => 0.12 + 0.88 * Math.min(Math.max((p - de) / (ate - de), 0), 1);

export type Pintura = { fill: string; opacidade: number };

const apurado = (l: Local | undefined): l is Local => !!l && l.total > 0;
const pct = (v: VotoCand, l: Local) => (l.total ? (v.votos / l.total) * 100 : 0);

// Cor de um lugar no mapa. Quanto maior o percentual, mais forte a cor: o de quem lidera, ou o do
// candidato escolhido (`foco`). Sem votos no 2º turno, usa os percentuais do 1º turno para já mostrar
// onde cada um é forte; sem votos em nenhum dos dois, cinza.
export function pinturaDegrade(
  l2: Local | undefined,
  l1: Local | undefined,
  foco: string | null,
  finalistas: VotoCand[],
  cor: (v: VotoCand) => string,
): Pintura {
  const base = apurado(l2) ? l2 : apurado(l1) ? l1 : undefined;
  if (!base) return { fill: SEM_VOTOS, opacidade: 1 };
  const alvo = foco ? finalistas.find((c) => c.id === foco) : undefined;
  if (alvo) {
    const v = base.votos.find((x) => x.id === alvo.id);
    return { fill: cor(alvo), opacidade: intensidade(v ? pct(v, base) : 0, FAIXA_CANDIDATO) };
  }
  if (!base.lider) return { fill: EMPATE, opacidade: 1 };
  return { fill: cor(base.votos[0]), opacidade: intensidade(pct(base.votos[0], base), base === l2 ? FAIXA_LIDER : FAIXA_LIDER_1T) };
}
