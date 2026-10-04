import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CIDADES_EXTERIOR, UFS } from './dados';

const geo = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'geo', f), 'utf8'));

describe('cidades do exterior', () => {
  it('são 186, sem código repetido', () => {
    expect(CIDADES_EXTERIOR).toHaveLength(186);
    expect(new Set(CIDADES_EXTERIOR.map((c) => c.cd)).size).toBe(186);
  });
  it('todo país da tabela existe nos contornos', () => {
    const nomes = new Set(geo('paises-50m.json').objects.countries.geometries.map((g: { properties: { name: string } }) => g.properties.name));
    expect(CIDADES_EXTERIOR.filter((c) => !nomes.has(c.pais)).map((c) => c.nm)).toEqual([]);
  });
  it('cada país tem um só nome em português', () => {
    const pt = new Map<string, string>();
    for (const c of CIDADES_EXTERIOR) {
      expect(pt.get(c.pais) ?? c.paisPt).toBe(c.paisPt);
      pt.set(c.pais, c.paisPt);
    }
  });
});

describe('UFs', () => {
  it('são 27 e todo código IBGE existe nos contornos', () => {
    expect(UFS).toHaveLength(27);
    const codigos = new Set(geo('ufs.geojson').features.map((f: { properties: { codarea: string } }) => f.properties.codarea));
    expect(UFS.filter((u) => !codigos.has(u.ibge)).map((u) => u.sigla)).toEqual([]);
    expect(new Set(UFS.map((u) => u.ibge)).size).toBe(27);
  });
});
