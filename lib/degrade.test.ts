import { describe, expect, it } from 'vitest';
import { EMPATE, FAIXA_CANDIDATO, FAIXA_LIDER, intensidade, pinturaDegrade, SEM_VOTOS } from './degrade';
import { montar, type Local, type VotoCand } from './mapas/agregar';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const local = (a: number, b: number): Local => montar('x', 'X', 10, 10, [cand('a', a), cand('b', b)]);
const cor = (v: VotoCand) => (v.id === 'a' ? '#a' : '#b');
const finalistas = [cand('a', 0), cand('b', 0)];

describe('intensidade', () => {
  it('vai de 0,12 a 1 e não passa dos limites', () => {
    expect(intensidade(50, FAIXA_LIDER)).toBeCloseTo(0.12);
    expect(intensidade(80, FAIXA_LIDER)).toBeCloseTo(1);
    expect(intensidade(10, FAIXA_LIDER)).toBeCloseTo(0.12);
    expect(intensidade(99, FAIXA_LIDER)).toBeCloseTo(1);
    expect(intensidade(47.5, FAIXA_CANDIDATO)).toBeCloseTo(0.12 + 0.88 * 0.5);
  });
});

describe('pinturaDegrade', () => {
  it('quem lidera pinta com a cor dele, mais forte quanto maior o percentual', () => {
    const fraco = pinturaDegrade(local(52, 48), undefined, null, finalistas, cor);
    const forte = pinturaDegrade(local(78, 22), undefined, null, finalistas, cor);
    expect(fraco.fill).toBe('#a');
    expect(forte.opacidade).toBeGreaterThan(fraco.opacidade);
  });
  it('com candidato escolhido, usa a cor e o percentual dele mesmo onde perde', () => {
    const p = pinturaDegrade(local(30, 70), undefined, 'a', finalistas, cor);
    expect(p.fill).toBe('#a');
    expect(p.opacidade).toBeCloseTo(intensidade(30, FAIXA_CANDIDATO));
  });
  it('sem votos no 2º turno usa o 1º turno; sem nenhum dos dois, cinza', () => {
    expect(pinturaDegrade(local(0, 0), local(60, 40), null, finalistas, cor).fill).toBe('#a');
    expect(pinturaDegrade(local(0, 0), local(0, 0), null, finalistas, cor)).toEqual({ fill: SEM_VOTOS, opacidade: 1 });
    expect(pinturaDegrade(undefined, undefined, null, finalistas, cor).fill).toBe(SEM_VOTOS);
  });
  it('empate fica cinza-claro', () => {
    expect(pinturaDegrade(local(50, 50), undefined, null, finalistas, cor)).toEqual({ fill: EMPATE, opacidade: 1 });
  });
});
