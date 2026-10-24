import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarEstadoSegundoTurno } from './estado';
import { buscarBrasil, mesclarBrasil } from './fetch';

const pres = readFileSync(join(__dirname, '..', 'tse', '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');
afterEach(() => vi.unstubAllGlobals());

const stub = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url.includes('/dados/mg/') ? new Response('x', { status: 500 }) : new Response(pres))),
  );

describe('buscarBrasil no 2º turno', () => {
  it('presidente: eleição federal 6258; governador: estadual 6260', async () => {
    stub();
    await buscarBrasil('presidente', undefined, 2);
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(28);
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json');
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/rs/rs-c0001-e006258-u.json');
    vi.mocked(fetch).mockClear();
    await buscarBrasil('governador', undefined, 2);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/6260/dados/');
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('-c0003-e006260-u.json');
  });
});

describe('buscarEstadoSegundoTurno', () => {
  it('2º turno de presidente e governador e 1º turno de tudo; sem disputa de governador vira null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.includes('/6260/') ? new Response('x', { status: 404 }) : new Response(pres))),
    );
    const e = await buscarEstadoSegundoTurno('sp');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(6);
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json');
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp-c0001-e006257-u.json');
    expect(urls).toContain('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/sp/sp-c0005-e006259-u.json');
    expect(e.presidente2).not.toBeNull();
    expect(e.governador2).toBeNull();
  });
});

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
