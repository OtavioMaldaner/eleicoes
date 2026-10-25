import { describe, expect, it } from 'vitest';
import { montar, type Local, type VotoCand } from './mapas/agregar';
import { mudancaPorEstado } from './mudanca';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const a = cand('a', 0);
const b = cand('b', 0);
const estado = (chave: string, nome: string, votos: Record<string, number>): Local =>
  montar(chave, nome, 100, 100, Object.entries(votos).map(([id, v]) => cand(id, v)));
const umt = (chave: string, nome: string, v: [number, number]): Local => estado(chave, nome, { a: v[0], b: v[1] });
const pt = (chave: string, nome: string, v: [number, number, number]): Local => estado(chave, nome, { a: v[0], b: v[1], c: v[2] });

describe('mudancaPorEstado', () => {
  it('põe cada estado na lista de quem mais subiu nele', () => {
    const r = mudancaPorEstado(
      [umt('x', 'X', [60, 40]), umt('y', 'Y', [35, 65])],
      [pt('x', 'X', [30, 30, 40]), pt('y', 'Y', [20, 40, 40])],
      [a, b],
    );
    expect(r.a).toHaveLength(1);
    expect(r.a[0].uf).toBe('x');
    expect(r.a[0].delta).toBeCloseTo(30);
    expect(r.b).toHaveLength(1);
    expect(r.b[0].uf).toBe('y');
    expect(r.b[0].delta).toBeCloseTo(25);
  });
  it('ordena do maior para o menor e desempata pelo nome', () => {
    const base = [pt('x', 'X', [30, 30, 40]), pt('z', 'Zulu', [30, 30, 40]), pt('k', 'Alfa', [30, 30, 40])];
    const r = mudancaPorEstado([umt('x', 'X', [60, 40]), umt('z', 'Zulu', [55, 45]), umt('k', 'Alfa', [55, 45])], base, [a, b]);
    expect(r.a.map((m) => m.uf)).toEqual(['x', 'k', 'z']);
  });
  it('deixa de fora estado sem votos no 2º turno ou sem 1º turno', () => {
    const r = mudancaPorEstado(
      [umt('x', 'X', [0, 0]), umt('y', 'Y', [60, 40])],
      [pt('x', 'X', [30, 30, 40])],
      [a, b],
    );
    expect(r).toEqual({});
  });
  it('deixa de fora estado em que os dois subiram igual', () => {
    const r = mudancaPorEstado([umt('x', 'X', [50, 50])], [pt('x', 'X', [30, 30, 40])], [a, b]);
    expect(r).toEqual({});
  });
  it('sem estados devolve objeto vazio', () => {
    expect(mudancaPorEstado([], [], [a, b])).toEqual({});
  });
});
