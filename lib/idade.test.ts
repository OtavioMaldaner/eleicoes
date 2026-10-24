import { describe, expect, it } from 'vitest';
import { idadeDosDados, textoIdade } from './idade';

const base = '2026-10-25T20:00:00.000Z';
const em = (s: number) => Date.parse(base) + s * 1000;

describe('idadeDosDados', () => {
  it('recente fica ok; passa de 90s vira atenção; passa de 5 min vira crítico', () => {
    expect(idadeDosDados(base, em(20))).toEqual({ segundos: 20, nivel: 'ok' });
    expect(idadeDosDados(base, em(90)).nivel).toBe('atencao');
    expect(idadeDosDados(base, em(300)).nivel).toBe('critico');
  });
  it('marca do servidor tira o verde mesmo com dado recente', () => {
    expect(idadeDosDados(base, em(5), true).nivel).toBe('atencao');
  });
  it('data inválida ou no futuro não quebra', () => {
    expect(idadeDosDados('lixo', em(10)).segundos).toBe(0);
    expect(idadeDosDados(base, em(-30)).segundos).toBe(0);
  });
});

describe('textoIdade', () => {
  it('formata segundos, minutos e horas', () => {
    expect(textoIdade(45)).toBe('45s');
    expect(textoIdade(125)).toBe('2 min');
    expect(textoIdade(3900)).toBe('1 h 5 min');
  });
});
