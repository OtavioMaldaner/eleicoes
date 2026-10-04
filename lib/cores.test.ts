import { describe, expect, it } from 'vitest';
import { coresDosCandidatos, corPartido } from './cores';

describe('corPartido', () => {
  it('usa a cor do partido, sem depender de maiúsculas, acentos ou espaços', () => {
    expect(corPartido('PT')).toBe('#e0262d');
    expect(corPartido('pt')).toBe(corPartido('PT'));
    expect(corPartido('UNIÃO')).toBe(corPartido('uniao'));
    expect(corPartido('PC do B')).toBe(corPartido('PCDOB'));
    expect(corPartido('PL')).not.toBe(corPartido('PT'));
  });
  it('numa federação, usa a cor do partido mais conhecido dela', () => {
    expect(corPartido('PCDOB / PT / PV')).toBe(corPartido('PT'));
    expect(corPartido('PP / UNIÃO')).toBe(corPartido('PP'));
    expect(corPartido('CIDADANIA / PSDB')).toBe(corPartido('PSDB'));
  });
  it('partido desconhecido recebe sempre a mesma cor', () => {
    expect(corPartido('PARTIDO NOVÍSSIMO')).toBe(corPartido('PARTIDO NOVÍSSIMO'));
    expect(corPartido('PARTIDO NOVÍSSIMO')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('coresDosCandidatos', () => {
  it('candidatos do mesmo partido ganham variações distinguíveis', () => {
    const c = coresDosCandidatos([
      { id: 'a', partido: 'PT' },
      { id: 'b', partido: 'PL' },
      { id: 'c', partido: 'PT' },
      { id: 'd', partido: 'PT' },
    ]);
    expect(c.get('a')).toEqual({ cor: corPartido('PT'), tracejado: undefined });
    expect(c.get('b')!.cor).toBe(corPartido('PL'));
    expect(c.get('c')!.cor).not.toBe(c.get('a')!.cor);
    expect(c.get('d')!.cor).not.toBe(c.get('c')!.cor);
    expect(c.get('c')!.tracejado).toBeDefined();
    expect(c.get('d')!.tracejado).not.toBe(c.get('c')!.tracejado);
  });
});
