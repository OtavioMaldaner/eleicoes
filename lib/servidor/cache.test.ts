import { describe, expect, it, vi } from 'vitest';
import { cdn, lembrar, responder } from './cache';

describe('cdn', () => {
  it('monta o Cache-Control com renovação em segundo plano e tolerância a erro', () => {
    expect(cdn(15)).toBe('public, s-maxage=15, stale-while-revalidate=60, stale-if-error=900');
    expect(cdn(5, 0, 600)).toBe('public, s-maxage=5, stale-while-revalidate=0, stale-if-error=600');
  });
});

describe('responder', () => {
  it('resposta boa vai com o cache pedido', async () => {
    const r = responder('t1', { a: 1 }, { falhouTudo: false, cache: cdn(10) });
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe(cdn(10));
    expect(await r.json()).toEqual({ a: 1 });
  });
  it('quando o TSE falha por completo, devolve a última boa marcada como desatualizada', async () => {
    responder('t2', { a: 2, buscadoEm: 'antes' }, { falhouTudo: false, cache: cdn(10) });
    const r = responder('t2', { a: 0, buscadoEm: 'agora' }, { falhouTudo: true, cache: cdn(10) });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ a: 2, buscadoEm: 'antes', desatualizado: true });
  });
  it('sem resposta boa guardada, a falha vira 502 sem cache', () => {
    const r = responder('t3', { a: 0 }, { falhouTudo: true, cache: cdn(10) });
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
