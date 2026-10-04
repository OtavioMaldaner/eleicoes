import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarEstado, buscarMunicipios, municipiosDe, ufValida } from './estado';

const pres = readFileSync(join(__dirname, '..', 'tse', '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');
afterEach(() => vi.unstubAllGlobals());

describe('municípios por estado', () => {
  it('conhece os municípios de cada estado com o código do IBGE', () => {
    expect(municipiosDe('rs')).toHaveLength(497);
    expect(municipiosDe('rs').find((m) => m.cd === '88013')).toEqual({ cd: '88013', ibge: '4314902', nome: 'PORTO ALEGRE' });
    expect(municipiosDe('df')).toHaveLength(1);
    expect(municipiosDe('xx')).toEqual([]);
  });
  it('valida a sigla do estado', () => {
    expect(ufValida('rs')).toBe(true);
    for (const v of [null, '', 'RS', 'zz', 'br', 'constructor']) expect(ufValida(v)).toBe(false);
  });
});

describe('buscarEstado', () => {
  it('traz presidente, governador e senador do estado', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('c0005') ? new Response('x', { status: 500 }) : new Response(pres))));
    const r = await buscarEstado('rs');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls.sort()).toEqual([
      'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rs/rs-c0001-e006257-u.json',
      'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs-c0003-e006259-u.json',
      'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs-c0005-e006259-u.json',
    ]);
    expect(r.uf).toBe('rs');
    expect(r.presidente?.nome).toBe('Rio Grande do Sul');
    expect(r.governador).not.toBeNull();
    expect(r.senador).toBeNull();
  });
});

describe('buscarMunicipios', () => {
  it('busca um arquivo por município, usa o código do IBGE como chave e resume os votos', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('/rr03050-') ? new Response('x', { status: 500 }) : new Response(pres))));
    const r = await buscarMunicipios('rr', 'governador');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(15);
    expect(urls.every((u) => /\/6259\/dados\/rr\/rr\d{5}-c0003-e006259-u\.json$/.test(u))).toBe(true);
    const total = municipiosDe('rr').length;
    expect(r.municipios.length + r.falhas).toBe(total);
    expect(r.municipios.every((m) => /^14\d{5}$/.test(m.chave))).toBe(true);
    expect(r.municipios.every((m) => m.votos.length <= 4)).toBe(true);
    expect(r.municipios[0].nome).not.toBe('');
  });
});
