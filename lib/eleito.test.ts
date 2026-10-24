import { describe, expect, it } from 'vitest';
import { eleitoDe, foiEleito } from './eleito';
import type { Local, VotoCand } from './mapas/agregar';

const v = (id: string, situacao?: string, eleito = false): VotoCand => ({ id, numero: '0', nome: id, partido: 'X', votos: 1, eleito, situacao });
const local = (votos: VotoCand[]) => ({ votos }) as Local;

describe('foiEleito', () => {
  it('só "Eleito..." conta; 2º turno e não eleito não', () => {
    expect(foiEleito(v('a', 'Eleito'))).toBe(true);
    expect(foiEleito(v('a', 'Eleito por QP'))).toBe(true);
    expect(foiEleito(v('a', '2º turno', true))).toBe(false);
    expect(foiEleito(v('a', 'Não eleito'))).toBe(false);
    expect(foiEleito(v('a'))).toBe(false);
  });
});

describe('eleitoDe', () => {
  it('acha o eleito, ou nada quando ainda não há', () => {
    expect(eleitoDe(local([v('a', '2º turno', true), v('b', 'Eleito', true)]))?.id).toBe('b');
    expect(eleitoDe(local([v('a', '2º turno', true), v('b', '2º turno', true)]))).toBeUndefined();
    expect(eleitoDe(null)).toBeUndefined();
  });
});
