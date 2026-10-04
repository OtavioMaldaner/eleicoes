import { describe, expect, it } from 'vitest';
import { acharMunicipio } from './buscaMunicipio';

describe('acharMunicipio', () => {
  it('acha por nome sem acento e sem diferenciar maiúsculas', () => {
    expect(acharMunicipio('porto alegre', true)).toBe('88013');
    expect(acharMunicipio('  Aceguá ', false)).toBe('88986');
    expect(acharMunicipio('acegua', false)).toBe('88986');
  });
  it('ao digitar, espera quando o texto ainda pode virar outro município', () => {
    expect(acharMunicipio('santa maria', true)).toBeNull();
    expect(acharMunicipio('gramado', true)).toBeNull();
  });
  it('ao escolher da lista ou confirmar, aceita o nome que é prefixo de outro', () => {
    expect(acharMunicipio('SANTA MARIA', false)).not.toBeNull();
    expect(acharMunicipio('GRAMADO', false)).not.toBeNull();
    expect(acharMunicipio('SANTA MARIA', false)).not.toBe(acharMunicipio('SANTA MARIA DO HERVAL', false));
  });
  it('devolve null para nome desconhecido ou vazio', () => {
    expect(acharMunicipio('xyz', false)).toBeNull();
    expect(acharMunicipio('', false)).toBeNull();
  });
});
