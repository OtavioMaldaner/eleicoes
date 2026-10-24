import { describe, expect, it } from 'vitest';
import { montar, type Local, type VotoCand } from './mapas/agregar';
import { projetar } from './projecao';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const estado = (chave: string, secoes: number, feitas: number, a: number, b: number, c = 0): Local => ({ ...montar(chave, chave, secoes, feitas, [cand('a', a), cand('b', b), cand('c', c)]) });

describe('projetar', () => {
  it('multiplica o contado pelo que falta em cada estado e soma', () => {
    // 50% das seções: a 60, b 40 → projeta a 120, b 80.
    const p = projetar([estado('x', 100, 50, 60, 40)], [], 'a', 'b')!;
    expect(p.a).toBeCloseTo(120);
    expect(p.b).toBeCloseTo(80);
    expect(p.pctA).toBeCloseTo(60);
    expect(p.estadosPelaApuracao).toBe(1);
  });
  it('estado sem contagem suficiente usa o 1º turno como base', () => {
    // 1º turno: a 30, b 10, c 60 (total 100): a/(a+b)=75% de 100 votos válidos → a 75, b 25.
    const p = projetar([estado('x', 100, 1, 0, 0)], [estado('x', 100, 100, 30, 10, 60)], 'a', 'b')!;
    expect(p.a).toBeCloseTo(75);
    expect(p.b).toBeCloseTo(25);
    expect(p.estadosPeloPrimeiroTurno).toBe(1);
  });
  it('mistura estados contados e não contados', () => {
    const p = projetar(
      [estado('x', 100, 50, 60, 40), estado('y', 100, 0, 0, 0)],
      [estado('y', 100, 100, 20, 20, 60)],
      'a',
      'b',
    )!;
    expect(p.a).toBeCloseTo(120 + 50);
    expect(p.b).toBeCloseTo(80 + 50);
    expect(p.estadosPelaApuracao).toBe(1);
    expect(p.estadosPeloPrimeiroTurno).toBe(1);
  });
  it('sem nenhum dado, null', () => {
    expect(projetar([estado('x', 100, 0, 0, 0)], [], 'a', 'b')).toBeNull();
  });
});
