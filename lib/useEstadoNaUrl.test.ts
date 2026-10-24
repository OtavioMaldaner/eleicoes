import { describe, expect, it } from 'vitest';
import { lerUf } from './useEstadoNaUrl';

describe('lerUf', () => {
  it('aceita só siglas de estado, em qualquer caixa', () => {
    expect(lerUf('?uf=sp')).toBe('sp');
    expect(lerUf('?uf=RS')).toBe('rs');
    expect(lerUf('?uf=xx')).toBeNull();
    expect(lerUf('?uf=')).toBeNull();
    expect(lerUf('')).toBeNull();
    expect(lerUf('?outro=sp')).toBeNull();
  });
});
