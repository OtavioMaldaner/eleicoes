import { describe, expect, it } from 'vitest';
import { montar, type Local, type VotoCand } from './mapas/agregar';
import { MARGEM_BASE, projetar } from './projecao';

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

describe('margem de erro da projeção', () => {
  it('cai com a raiz do que falta apurar e não é empate técnico quando a diferença é grande', () => {
    const p = projetar([estado('x', 100, 50, 60, 40)], [], 'a', 'b')!;
    expect(p.margem).toBeCloseTo(MARGEM_BASE * Math.sqrt(0.5));
    expect(p.empateTecnico).toBe(false);
  });
  it('diferença dentro da margem é empate técnico', () => {
    const p = projetar([estado('x', 100, 50, 51, 49)], [], 'a', 'b')!;
    expect(p.empateTecnico).toBe(true);
  });
  it('estado todo apurado tem margem zero', () => {
    const p = projetar([estado('x', 100, 100, 60, 40)], [], 'a', 'b')!;
    expect(p.margem).toBeCloseTo(0);
    expect(p.empateTecnico).toBe(false);
  });
  it('estado projetado pelo 1º turno usa a margem base', () => {
    const p = projetar([estado('x', 100, 1, 0, 0)], [estado('x', 100, 100, 30, 10, 60)], 'a', 'b')!;
    expect(p.margem).toBe(MARGEM_BASE);
  });
  it('pondera a margem de cada estado pelos votos projetados', () => {
    // x: projeta a 120 + b 80 = 200 votos; y (1º turno): a 50 + b 50 = 100 votos.
    const p = projetar([estado('x', 100, 50, 60, 40), estado('y', 100, 0, 0, 0)], [estado('y', 100, 100, 20, 20, 60)], 'a', 'b')!;
    expect(p.margem).toBeCloseTo((200 * MARGEM_BASE * Math.sqrt(0.5) + 100 * MARGEM_BASE) / 300);
  });
  it('mais seções apuradas nunca aumenta a margem', () => {
    const m = (feitas: number) => projetar([estado('x', 100, feitas, 60, 40)], [], 'a', 'b')!.margem;
    expect(m(60)).toBeLessThan(m(30));
    expect(m(90)).toBeLessThan(m(60));
  });
});
