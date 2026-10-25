import { intensidade, SEM_VOTOS, type Pintura } from './degrade';
import type { Local } from './mapas/agregar';

export const ABSTENCAO = '#a78bfa'; // cor que não é de nenhum candidato
export const FAIXA_ABSTENCAO = [10, 40] as const; // % de abstenção do quase apagado ao pleno

// Cor do local pela abstenção das seções já apuradas; sem o dado, cinza de "sem votos".
export function pinturaAbstencao(l: Local | undefined): Pintura {
  const p = l?.pctAbstencao;
  if (p === undefined || !Number.isFinite(p)) return { fill: SEM_VOTOS, opacidade: 1 };
  return { fill: ABSTENCAO, opacidade: intensidade(p, FAIXA_ABSTENCAO) };
}
