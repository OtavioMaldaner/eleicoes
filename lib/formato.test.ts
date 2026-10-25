import { describe, expect, it } from 'vitest';
import { fmtVotosCurto } from './formato';

describe('fmtVotosCurto', () => {
  it('abaixo de 10 mil mostra o número inteiro com ponto de milhar', () => {
    expect(fmtVotosCurto(8779)).toBe('8.779');
    expect(fmtVotosCurto(0)).toBe('0');
  });
  it('de 10 mil a menos de 1 milhão arredonda para mil', () => {
    expect(fmtVotosCurto(84123)).toBe('84 mil');
    expect(fmtVotosCurto(10000)).toBe('10 mil');
  });
  it('arredondar para 1.000 mil vira 1 milhão, nunca "1.000 mil"', () => {
    expect(fmtVotosCurto(999999)).toBe('1 milhão');
  });
  it('a partir de 1 milhão usa uma casa decimal e o plural certo', () => {
    expect(fmtVotosCurto(1200000)).toBe('1,2 milhão');
    expect(fmtVotosCurto(3400000)).toBe('3,4 milhões');
    expect(fmtVotosCurto(2000000)).toBe('2 milhões');
  });
});
