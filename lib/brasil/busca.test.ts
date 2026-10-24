import { describe, expect, it } from 'vitest';
import { buscarCidades } from './busca';

describe('buscarCidades', () => {
  it('ignora acento e caixa; quem começa com o texto vem primeiro', () => {
    const r = buscarCidades('sao paulo');
    expect(r[0]).toMatchObject({ uf: 'sp', nome: 'São Paulo' });
  });
  it('filtra pelo estado quando ele vem depois do nome', () => {
    const r = buscarCidades('santa maria rs');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((c) => c.uf === 'rs')).toBe(true);
  });
  it('não busca com menos de duas letras', () => {
    expect(buscarCidades('a')).toEqual([]);
  });
});
