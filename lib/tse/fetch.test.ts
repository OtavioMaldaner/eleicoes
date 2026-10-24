import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarResultados, mesclar } from './fetch';

const pres = readFileSync(join(__dirname, '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');
const fed = readFileSync(join(__dirname, '__fixtures__', 'rs-c0006-e006259-u.json'), 'utf8');

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('c0001')) return new Response(pres);
      if (url.includes('c0006')) return new Response(fed);
      if (url.includes('c0003')) return new Response('<html>bloqueado</html>', { status: 403 });
      if (url.includes('c0005')) return new Response('{}');
      throw new Error('rede caiu');
    }),
  );
}

describe('buscarResultados', () => {
  it('isola a falha de cada cargo', async () => {
    stubFetch();
    const r = await buscarResultados();
    const por = Object.fromEntries(r.cargos.map((c) => [c.chave, c]));
    expect(r.cargos.map((c) => c.chave)).toEqual(['presidente', 'governador', 'senador', 'depFederal', 'depEstadual']);
    expect(por.presidente.erro).toBeUndefined();
    expect(por.depFederal.candidatos).toHaveLength(435);
    expect(por.governador).toMatchObject({ erro: 'HTTP 403', apuracao: null, candidatos: [] });
    expect(por.senador.erro).toMatch(/Formato inesperado/);
    expect(por.depEstadual.erro).toBe('rede caiu');
    expect(typeof r.buscadoEm).toBe('string');
  });

  it('consulta os arquivos do município quando informado', async () => {
    stubFetch();
    await buscarResultados(undefined, '88013');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(5);
    expect(urls.every((u) => u.includes('/dados/rs/rs88013-c'))).toBe(true);
  });

  it('passa um sinal de tempo limite em cada requisição, preservando as opções', async () => {
    stubFetch();
    await buscarResultados({ cache: 'no-store' });
    const chamadas = vi.mocked(fetch).mock.calls;
    expect(chamadas).toHaveLength(5);
    for (const [, init] of chamadas) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.cache).toBe('no-store');
    }
  });
});

describe('mesclar', () => {
  it('mantém o último dado bom do cargo que falhou e marca o erro', async () => {
    stubFetch();
    const bom = await buscarResultados();
    const ruim = {
      ...bom,
      buscadoEm: 'depois',
      cargos: bom.cargos.map((c) => ({ ...c, apuracao: null, candidatos: [], erro: 'HTTP 500' })),
    };
    const m = mesclar(bom, ruim);
    expect(m.buscadoEm).toBe('depois');
    expect(m.cargos[0].candidatos.length).toBeGreaterThan(1);
    expect(m.cargos[0].erro).toBe('HTTP 500');
    expect(m.cargos[1].candidatos).toEqual([]);
  });

  it('descarta uma resposta mais antiga que a já exibida', async () => {
    stubFetch();
    const r = await buscarResultados();
    const atual = { ...r, buscadoEm: '2026-10-04T21:00:30.000Z' };
    const atrasada = { ...r, buscadoEm: '2026-10-04T21:00:00.000Z' };
    expect(mesclar(atual, atrasada)).toBe(atual);
  });

  it('sem anterior, devolve o novo', async () => {
    stubFetch();
    const r = await buscarResultados();
    expect(mesclar(null, r)).toBe(r);
  });
});
