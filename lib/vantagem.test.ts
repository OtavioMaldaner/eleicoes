import { describe, expect, it } from 'vitest';
import { montar, type Local, type VotoCand } from './mapas/agregar';
import { contarLideres, raioVantagem, vantagens } from './vantagem';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const estado = (chave: string, nome: string, a: number, b: number): Local => montar(chave, nome, 100, 100, [cand('a', a), cand('b', b)]);

describe('vantagens', () => {
  it('é a diferença entre o 1º e o 2º, do maior para o menor, com desempate pelo nome', () => {
    const r = vantagens([estado('x', 'X', 60, 50), estado('y', 'Y', 10, 40), estado('k', 'Alfa', 110, 100)]);
    expect(r.map((v) => [v.chave, v.votos, v.lider.id])).toEqual([
      ['y', 30, 'b'],
      ['k', 10, 'a'],
      ['x', 10, 'a'],
    ]);
  });
  it('ignora locais sem líder (empate ou sem votos)', () => {
    expect(vantagens([estado('x', 'X', 5, 5), estado('y', 'Y', 0, 0)])).toEqual([]);
  });
});

describe('raioVantagem', () => {
  it('a área é proporcional à vantagem', () => {
    expect(raioVantagem(100, 100, 30)).toBe(30);
    expect(raioVantagem(25, 100, 30)).toBe(15);
  });
  it('sem máximo positivo o raio é zero', () => {
    expect(raioVantagem(5, 0, 30)).toBe(0);
  });
});

describe('contarLideres', () => {
  it('conta quantos locais cada candidato lidera', () => {
    expect(contarLideres([estado('x', 'X', 60, 50), estado('y', 'Y', 10, 40), estado('z', 'Z', 9, 3), estado('w', 'W', 4, 4)])).toEqual({ a: 2, b: 1 });
  });
  it('lista vazia devolve objeto vazio', () => {
    expect(contarLideres([])).toEqual({});
  });
});
