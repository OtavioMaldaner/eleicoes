import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consultarTse, esperaDe } from '../tse/consulta';
import { cdn, compartilhar, lembrar, responder } from './cache';

describe('cdn', () => {
  it('monta o Cache-Control com renovação em segundo plano e tolerância a erro', () => {
    expect(cdn(15)).toBe('public, s-maxage=15, stale-while-revalidate=60, stale-if-error=900');
    expect(cdn(5, 0, 600)).toBe('public, s-maxage=5, stale-while-revalidate=0, stale-if-error=600');
  });
});

const meta = { obtidoEm: '2026-10-25T20:00:00.000Z', desatualizado: false };

describe('responder', () => {
  it('resposta boa vai com o cache pedido e leva os metadados', async () => {
    const r = responder({ dados: { a: 1 }, meta }, { falhouTudo: false, cache: cdn(30) });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe(cdn(30));
    expect(await r.json()).toEqual({ a: 1, desatualizado: false, meta });
  });
  it('último dado bom vai marcado e com cache curto na CDN', async () => {
    const m = { ...meta, desatualizado: true, motivo: 'tse_429' as const };
    const r = responder({ dados: { a: 2 }, meta: m }, { falhouTudo: false, cache: cdn(30) });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toContain('s-maxage=5');
    expect(await r.json()).toEqual({ a: 2, desatualizado: true, meta: m });
  });
  it('falha total sem dado anterior vira 502 sem cache', () => {
    const r = responder({ dados: { a: 0 }, meta: { ...meta, motivo: 'tse_erro' } }, { falhouTudo: true, cache: cdn(30) });
    expect(r.status).toBe(502);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('lembrar', () => {
  it('reaproveita o valor dentro do prazo e não guarda falha', async () => {
    const f = vi.fn(async () => 'x');
    expect(await lembrar('l1', 1000, f)).toBe('x');
    expect(await lembrar('l1', 1000, f)).toBe('x');
    expect(f).toHaveBeenCalledTimes(1);

    const g = vi.fn(async () => null);
    await lembrar('l2', 1000, g);
    await new Promise((r) => setTimeout(r, 0));
    await lembrar('l2', 1000, g);
    expect(g).toHaveBeenCalledTimes(2);
  });
});

describe('esperaDe', () => {
  it('lê Retry-After em segundos ou como data', () => {
    expect(esperaDe('30')).toBe(30_000);
    expect(esperaDe(new Date(Date.now() + 10_000).toUTCString(), Date.now())).toBeLessThanOrEqual(10_000);
    expect(esperaDe(null)).toBeUndefined();
    expect(esperaDe('lixo')).toBeUndefined();
  });
});

// Uma "rota" de mentira: consulta o TSE (ou a simulação) e diz se veio tudo.
type Dado = { n: number; completo: boolean };
let n = 0;
const buscarTse = (completo = true) => async (): Promise<Dado> => {
  const r = await consultarTse('https://tse.exemplo/arquivo.json');
  return { n: ++n, completo: r.ok && completo };
};
const opcoes = { ttlMs: 30_000, completo: (d: Dado) => d.completo };

describe('compartilhar: último dado bom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T20:00:00Z'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const passar = (s: number) => vi.setSystemTime(Date.now() + s * 1000);

  it('1. depois de uma resposta boa, a falha do TSE devolve o último dado bom desatualizado', async () => {
    const boa = await compartilhar('a', opcoes, buscarTse());
    expect(boa.meta.desatualizado).toBe(false);
    passar(31);
    vi.stubEnv('SIMULAR_FALHA_TSE', '429');
    const falha = await compartilhar('a', opcoes, buscarTse());
    expect(falha.dados).toEqual(boa.dados);
    expect(falha.meta).toEqual({ obtidoEm: boa.meta.obtidoEm, desatualizado: true, motivo: 'tse_429' });
  });

  it('2. sem dado anterior, mantém o comportamento atual: resposta incompleta, TTL curto', async () => {
    vi.stubEnv('SIMULAR_FALHA_TSE', '500');
    const buscar = vi.fn(buscarTse());
    const r = await compartilhar('b', opcoes, buscar);
    expect(r.meta).toMatchObject({ desatualizado: false, motivo: 'tse_erro' });
    expect(r.dados.completo).toBe(false);
    await compartilhar('b', opcoes, buscar);
    expect(buscar).toHaveBeenCalledTimes(1); // ainda dentro dos 5s
    passar(6);
    await compartilhar('b', opcoes, buscar);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('3. resposta incompleta não sobrescreve o último dado bom', async () => {
    const boa = await compartilhar('c', opcoes, buscarTse());
    passar(31);
    const parcial = await compartilhar('c', opcoes, buscarTse(false));
    expect(parcial.dados).toEqual(boa.dados);
    expect(parcial.meta).toMatchObject({ desatualizado: true, motivo: 'incompleto', obtidoEm: boa.meta.obtidoEm });
    passar(6);
    vi.stubEnv('SIMULAR_FALHA_TSE', 'timeout');
    const falha = await compartilhar('c', opcoes, buscarTse());
    expect(falha.dados).toEqual(boa.dados); // ainda o original
    expect(falha.meta).toMatchObject({ desatualizado: true, motivo: 'tse_timeout' });
  });

  it('4. quando o TSE volta, a resposta volta a ser fresca', async () => {
    const boa = await compartilhar('d', opcoes, buscarTse());
    passar(31);
    vi.stubEnv('SIMULAR_FALHA_TSE', 'erro');
    expect((await compartilhar('d', opcoes, buscarTse())).meta.desatualizado).toBe(true);
    vi.unstubAllEnvs();
    passar(6);
    const volta = await compartilhar('d', opcoes, buscarTse());
    expect(volta.meta.desatualizado).toBe(false);
    expect(volta.meta.motivo).toBeUndefined();
    expect(volta.dados.n).toBeGreaterThan(boa.dados.n);
  });

  it('em 429 respeita o Retry-After: não consulta o TSE antes disso', async () => {
    await compartilhar('e', opcoes, buscarTse());
    passar(31);
    vi.stubEnv('SIMULAR_FALHA_TSE', '429');
    vi.stubEnv('SIMULAR_RETRY_AFTER', '60');
    await compartilhar('e', opcoes, buscarTse());
    vi.unstubAllEnvs();
    const buscar = vi.fn(buscarTse());
    passar(20);
    const dentro = await compartilhar('e', opcoes, buscar);
    expect(buscar).not.toHaveBeenCalled();
    expect(dentro.meta).toMatchObject({ desatualizado: true, motivo: 'tse_429' });
    passar(45); // 65s depois do 429
    const depois = await compartilhar('e', opcoes, buscar);
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(depois.meta.desatualizado).toBe(false);
  });

  it('só guarda o último dado bom das chaves mais recentes (teto de memória)', async () => {
    for (let i = 0; i < 160; i++) await compartilhar(`lru:${i}`, opcoes, buscarTse());
    passar(31);
    vi.stubEnv('SIMULAR_FALHA_TSE', '500');
    expect((await compartilhar('lru:159', opcoes, buscarTse())).meta.desatualizado).toBe(true);
    expect((await compartilhar('lru:0', opcoes, buscarTse())).meta.desatualizado).toBe(false); // já saiu do teto
  });
});
