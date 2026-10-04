import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarBrasil, mesclarBrasil } from './fetch';

const pres = readFileSync(join(__dirname, '..', 'tse', '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');
afterEach(() => vi.unstubAllGlobals());

const stub = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url.includes('/dados/mg/') ? new Response('x', { status: 500 }) : new Response(pres))),
  );

describe('buscarBrasil', () => {
  it('presidente: arquivo nacional mais os 27 estados', async () => {
    stub();
    const r = await buscarBrasil('presidente');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(28);
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rs/rs-c0001-e006257-u.json');
    expect(r.cargo).toBe('presidente');
    expect(r.nacional?.nome).toBe('Brasil');
    expect(r.nacional?.eleitorado).toBe(158745502);
    expect(r.estados).toHaveLength(26);
    expect(r.semResposta).toEqual(['mg']);
  });
  it('governador e senador: só os estados, na eleição estadual', async () => {
    stub();
    const g = await buscarBrasil('governador');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(27);
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/sp/sp-c0003-e006259-u.json');
    expect(g.nacional).toBeNull();
    vi.mocked(fetch).mockClear();
    await buscarBrasil('senador');
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('-c0005-e006259-u.json');
  });
});

describe('mesclarBrasil', () => {
  it('mantém o último dado do estado sem resposta, só dentro do mesmo cargo', async () => {
    stub();
    const falho = await buscarBrasil('presidente');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pres)));
    const bom = await buscarBrasil('presidente');
    expect(mesclarBrasil(bom, falho).estados).toHaveLength(27);
    expect(mesclarBrasil(null, falho)).toBe(falho);
    expect(mesclarBrasil({ ...bom, cargo: 'governador' }, falho)).toBe(falho);
  });
});
