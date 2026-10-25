import { describe, expect, it } from 'vitest';
import { ABSTENCAO, FAIXA_ABSTENCAO, pinturaAbstencao } from './abstencao';
import { SEM_VOTOS } from './degrade';
import { montar, type Local, type VotoCand } from './mapas/agregar';

const cand: VotoCand = { id: 'a', numero: '13', nome: 'A', partido: 'PT', votos: 10 };
const comAbstencao = (pct: number | undefined): Local => ({ ...montar('x', 'X', 100, 100, [cand]), pctAbstencao: pct });
// O TSE manda 0 de abstenção enquanto o estado ainda não apurou nada.
const semApuracao = (pct: number): Local => ({ ...montar('x', 'X', 100, 0, []), pctAbstencao: pct });

describe('pinturaAbstencao', () => {
  it('fica mais forte quanto maior a abstenção, dentro da faixa', () => {
    const [de, ate] = FAIXA_ABSTENCAO;
    const fraco = pinturaAbstencao(comAbstencao(de));
    const forte = pinturaAbstencao(comAbstencao(ate));
    expect(fraco.fill).toBe(ABSTENCAO);
    expect(fraco.opacidade).toBeCloseTo(0.12);
    expect(forte.opacidade).toBeCloseTo(1);
  });
  it('sem dado de abstenção pinta como sem votos, sem NaN', () => {
    expect(pinturaAbstencao(undefined)).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
    expect(pinturaAbstencao(comAbstencao(undefined))).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
    expect(pinturaAbstencao(comAbstencao(NaN))).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
  });
  it('estado sem nenhum voto apurado fica cinza, mesmo com abstenção 0 informada', () => {
    expect(pinturaAbstencao(semApuracao(0))).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
  });
});
