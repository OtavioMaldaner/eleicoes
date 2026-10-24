import { describe, expect, it } from 'vitest';
import { EMPATE, SEM_VOTOS } from './degrade';
import { montar, type Local, type VotoCand } from './mapas/agregar';
import { pinturaVariacao, variacao } from './variacao';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const local = (...v: [string, number][]): Local => montar('x', 'X', 10, 10, v.map(([id, n]) => cand(id, n)));
const fin = [cand('a', 0), cand('b', 0)];
const cor = (v: VotoCand) => (v.id === 'a' ? '#a' : '#b');

describe('variacao', () => {
  it('calcula a mudança em pontos de cada finalista e quem subiu mais', () => {
    // 1º turno: a 40, b 40, c 20. 2º turno: a 55, b 45.
    const v = variacao(local(['a', 55], ['b', 45]), local(['a', 40], ['b', 40], ['c', 20]), fin)!;
    expect(v.deltas.a).toBeCloseTo(15);
    expect(v.deltas.b).toBeCloseTo(5);
    expect(v.ganhou).toBe('a');
  });
  it('sem votos num dos turnos ou sem um finalista, não há variação', () => {
    expect(variacao(local(['a', 0], ['b', 0]), local(['a', 4], ['b', 4]), fin)).toBeNull();
    expect(variacao(local(['a', 5], ['b', 5]), undefined, fin)).toBeNull();
    expect(variacao(local(['a', 5], ['b', 5]), local(['a', 4], ['c', 4]), fin)).toBeNull();
  });
});

describe('pinturaVariacao', () => {
  it('pinta com a cor de quem subiu mais, mais forte quanto maior a subida', () => {
    const fraca = pinturaVariacao(local(['a', 52], ['b', 48]), local(['a', 46], ['b', 46], ['c', 8]), fin, cor);
    const forte = pinturaVariacao(local(['a', 70], ['b', 30]), local(['a', 40], ['b', 40], ['c', 20]), fin, cor);
    expect(fraca.fill).toBe('#a');
    expect(forte.opacidade).toBeGreaterThan(fraca.opacidade);
  });
  it('sem dados fica cinza; subida igual vira empate', () => {
    expect(pinturaVariacao(undefined, undefined, fin, cor)).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
    expect(pinturaVariacao(local(['a', 50], ['b', 50]), local(['a', 40], ['b', 40], ['c', 20]), fin, cor)).toEqual({ fill: EMPATE, opacidade: 1 });
  });
});
