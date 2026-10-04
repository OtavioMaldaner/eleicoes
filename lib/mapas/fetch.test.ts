import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarMapas } from './fetch';

const pres = readFileSync(join(__dirname, '..', 'tse', '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');

afterEach(() => vi.unstubAllGlobals());

describe('buscarMapas', () => {
  it('busca 27 estados e 186 cidades, agrupa por país e conta as falhas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/dados/rs/')) return new Response('x', { status: 500 });
        if (url.includes('/dados/zz/zz29955-')) throw new Error('rede caiu'); // Lisboa
        if (url.includes('/dados/zz/zz30805-')) return new Response('x', { status: 500 }); // Wellington, única cidade da Nova Zelândia
        return new Response(pres);
      }),
    );
    const r = await buscarMapas();
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(213);
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp-c0001-e006257-u.json');
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/zz/zz29955-c0001-e006257-u.json');
    expect(r.falhas).toBe(3);
    expect(r.estados).toHaveLength(26);
    expect(r.estados.find((e) => e.chave === 'rs')).toBeUndefined();
    expect(r.estados.find((e) => e.chave === 'sp')?.nome).toBe('São Paulo');
    expect(r.paises).toHaveLength(132);
    const pt = r.paises.find((p) => p.chave === 'Portugal')!;
    expect(pt.nome).toBe('Portugal');
    expect(pt.cidades).toEqual(['FARO', 'PORTO']);
    expect(pt.cidadesFaltando).toEqual(['LISBOA']);
    expect(r.paises.find((p) => p.chave === 'Spain')?.cidadesFaltando).toBeUndefined();
    expect(r.semResposta.sort()).toEqual(['New Zealand', 'rs']);
    expect(r.paises.find((p) => p.chave === 'United States of America')?.cidades).toHaveLength(11);
  });
});
