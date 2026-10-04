import { describe, expect, it } from 'vitest';
import { liderDe, localDe, mesclarMapas, somar, type Local, type Mapas } from './agregar';
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

describe('mesclarMapas', () => {
  const l = (chave: string, total: number, extra: Partial<Local> = {}): Local => ({
    chave, nome: chave, secoes: 1, secoesTotalizadas: 1, pctSecoes: 100, total, votos: [], lider: null, empate: false, ...extra,
  });
  const m = (estados: Local[], paises: Local[], semResposta: string[] = []): Mapas => ({ estados, paises, semResposta, falhas: semResposta.length, buscadoEm: 'x' });

  it('sem anterior, devolve o novo', () => {
    const novo = m([l('rs', 1)], []);
    expect(mesclarMapas(null, novo)).toBe(novo);
  });
  it('mantém o último dado do estado ou país que não respondeu', () => {
    const r = mesclarMapas(m([l('rs', 5), l('sp', 7)], [l('Japan', 3)]), m([l('sp', 9)], [], ['rs', 'Japan']));
    expect(r.estados.map((e) => [e.chave, e.total]).sort()).toEqual([['rs', 5], ['sp', 9]]);
    expect(r.paises.map((e) => [e.chave, e.total])).toEqual([['Japan', 3]]);
    expect(r.semResposta).toEqual(['rs', 'Japan']);
  });
  it('troca a soma parcial de um país pela última completa', () => {
    const completo = l('Portugal', 100);
    const parcial = l('Portugal', 40, { cidadesFaltando: ['LISBOA'] });
    expect(mesclarMapas(m([], [completo]), m([], [parcial])).paises[0]).toBe(completo);
    expect(mesclarMapas(m([], [parcial]), m([], [parcial])).paises[0].total).toBe(40);
  });
});
