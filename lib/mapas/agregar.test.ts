import { describe, expect, it } from 'vitest';
import { liderDe, localDe, somar } from './agregar';
import type { Candidato, ResultadoCargo } from '../tse/types';

const cand = (id: string, votos: number): Candidato => ({
  id, numero: id, nome: `C${id}`, partido: `P${id}`, votos, percentual: 0, eleito: false, situacao: '', posicao: 0, posicaoPartido: 0, fotoUrl: '',
});

const resultado = (votos: Record<string, number>, st = 5, ts = 10): ResultadoCargo => ({
  chave: 'presidente', nome: 'Presidente', vagas: 1, proporcional: false,
  apuracao: { secoesTotal: ts, secoesTotalizadas: st, pctSecoes: (st / ts) * 100 } as ResultadoCargo['apuracao'],
  candidatos: Object.entries(votos).map(([id, v]) => cand(id, v)).sort((a, b) => b.votos - a.votos),
});

describe('liderDe', () => {
  it('sem votos não há líder', () => {
    expect(liderDe([])).toEqual({ lider: null, empate: false });
    expect(liderDe([{ id: 'a', votos: 0 }, { id: 'b', votos: 0 }])).toEqual({ lider: null, empate: false });
  });
  it('devolve o mais votado, em qualquer ordem de entrada', () => {
    expect(liderDe([{ id: 'a', votos: 3 }, { id: 'b', votos: 7 }])).toEqual({ lider: 'b', empate: false });
  });
  it('empate entre os dois primeiros não tem líder', () => {
    expect(liderDe([{ id: 'a', votos: 7 }, { id: 'b', votos: 7 }, { id: 'c', votos: 1 }])).toEqual({ lider: null, empate: true });
  });
});

describe('localDe', () => {
  it('resume um resultado', () => {
    const l = localDe('rs', 'Rio Grande do Sul', resultado({ a: 30, b: 70 }));
    expect(l).toMatchObject({ chave: 'rs', nome: 'Rio Grande do Sul', secoes: 10, secoesTotalizadas: 5, pctSecoes: 50, total: 100, lider: 'b', empate: false });
    expect(l.votos.map((v) => [v.id, v.votos])).toEqual([['b', 70], ['a', 30]]);
    expect(l.votos[0]).toMatchObject({ nome: 'Cb', partido: 'Pb', numero: 'b' });
  });
});

describe('somar', () => {
  it('soma votos e seções de vários locais', () => {
    const l = somar('France', 'França', [
      localDe('1', 'PARIS', resultado({ a: 10, b: 5 }, 2, 4)),
      localDe('2', 'MARSELHA', resultado({ a: 1, b: 20, c: 2 }, 1, 6)),
    ]);
    expect(l).toMatchObject({ chave: 'France', nome: 'França', secoes: 10, secoesTotalizadas: 3, pctSecoes: 30, total: 38, lider: 'b' });
    expect(l.votos.map((v) => [v.id, v.votos])).toEqual([['b', 25], ['a', 11], ['c', 2]]);
    expect(l.cidades).toEqual(['PARIS', 'MARSELHA']);
  });
  it('sem seções não divide por zero', () => {
    expect(somar('x', 'X', []).pctSecoes).toBe(0);
  });
});
