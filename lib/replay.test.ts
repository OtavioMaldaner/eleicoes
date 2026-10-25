import { describe, expect, it } from 'vitest';
import type { Ponto } from './historico';
import { montar, type VotoCand } from './mapas/agregar';
import { instantes, localEm, pontoEm } from './replay';

const ponto = (t: number, p: number, c: Record<string, [number, number]>): Ponto => ({ t, cargos: { presidente: { p, c } } });
const cand = (id: string, votos: number): VotoCand => ({ id, numero: id === 'a' ? '13' : '22', nome: `Cand ${id}`, partido: id === 'a' ? 'PT' : 'PL', votos });
const base = montar('sp', 'São Paulo', 100, 80, [cand('a', 900), cand('b', 700)]);

describe('instantes', () => {
  it('junta os momentos de todos os históricos, sem repetir e em ordem', () => {
    expect(instantes([[ponto(3, 1, {}), ponto(1, 1, {})], [ponto(2, 1, {}), ponto(1, 1, {})]])).toEqual([1, 2, 3]);
  });
  it('sem histórico não há momentos', () => {
    expect(instantes([])).toEqual([]);
    expect(instantes([[]])).toEqual([]);
  });
});

describe('pontoEm', () => {
  const hist = [ponto(10, 1, {}), ponto(20, 2, {}), ponto(30, 3, {})];
  it('devolve o último ponto até o momento pedido', () => {
    expect(pontoEm(hist, 25)?.t).toBe(20);
    expect(pontoEm(hist, 20)?.t).toBe(20);
    expect(pontoEm(hist, 99)?.t).toBe(30);
  });
  it('antes do primeiro ponto, ou sem histórico, devolve null', () => {
    expect(pontoEm(hist, 5)).toBeNull();
    expect(pontoEm([], 5)).toBeNull();
  });
});

describe('localEm', () => {
  const hist = [ponto(10, 50, { a: [600, 60], b: [400, 40] })];
  it('reconstrói o local com os votos e as seções daquele momento, mantendo os dados do candidato', () => {
    const l = localEm(base, hist, 10)!;
    expect(l.chave).toBe('sp');
    expect(l.nome).toBe('São Paulo');
    expect(l.secoesTotalizadas).toBe(50);
    expect(l.pctSecoes).toBe(50);
    expect(l.total).toBe(1000);
    expect(l.lider).toBe('a');
    expect(l.votos.map((v) => [v.id, v.votos, v.partido, v.numero])).toEqual([
      ['a', 600, 'PT', '13'],
      ['b', 400, 'PL', '22'],
    ]);
  });
  it('sem ponto até o momento pedido devolve undefined', () => {
    expect(localEm(base, hist, 5)).toBeUndefined();
  });
  it('sem o local de base devolve undefined', () => {
    expect(localEm(undefined, hist, 10)).toBeUndefined();
  });
  it('candidato que não está no ponto conta zero votos', () => {
    const l = localEm(base, [ponto(10, 50, { a: [600, 100] })], 10)!;
    expect(l.votos.find((v) => v.id === 'b')?.votos).toBe(0);
  });
});
