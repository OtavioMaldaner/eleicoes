import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projetarVagas, vagasPorBancada } from './bancadas';
import { CARGOS } from './tse/config';
import { normalizar } from './tse/normalize';
import type { Bancada } from './tse/types';

const fed = () => JSON.parse(readFileSync(join(__dirname, 'tse', '__fixtures__', 'rs-c0006-e006259-u.json'), 'utf8'));
const b = (id: string, votos: number, vagas = 0): Bancada => ({ id, nome: id, tipo: 'partido', vagas, votosNominais: votos, votosLegenda: 0, votos, candidatos: 1 });

describe('normalizar: bancadas', () => {
  it('lê as bancadas de um cargo proporcional', () => {
    const r = normalizar(CARGOS[3], fed());
    expect(r.bancadas).toHaveLength(20);
    const pstu = r.bancadas!.find((x) => x.nome === 'PSTU')!;
    expect(pstu).toMatchObject({ tipo: 'partido', vagas: 0, votos: 0 });
    expect(pstu.candidatos).toBeGreaterThan(0);
    expect(r.bancadas!.some((x) => x.tipo === 'federacao')).toBe(true);
    expect(r.candidatos.every((c) => r.bancadas!.some((x) => x.id === c.bancada))).toBe(true);
  });

  it('soma votos nominais e de legenda, lê vagas e quociente, e ordena por votos', () => {
    const bruto = fed();
    bruto.carg[0].qe = '150000';
    const [a1, a2] = bruto.carg[0].agr;
    a1.vag = '2';
    a1.par[0].tvtn = '1000';
    a1.par[0].tvtl = '50';
    a2.vag = '5';
    for (const p of a2.par) Object.assign(p, { tvtn: '3000', tvtl: '100' });
    const r = normalizar(CARGOS[3], bruto);
    expect(r.quociente).toBe(150000);
    expect(r.bancadas![0]).toMatchObject({ id: a2.n, vagas: 5, votosNominais: 3000 * a2.par.length, votosLegenda: 100 * a2.par.length });
    expect(r.bancadas![1]).toMatchObject({ id: a1.n, vagas: 2, votos: 1050 });
  });

  it('numera os candidatos dentro da bancada, pelos votos', () => {
    const bruto = fed();
    const cands = bruto.carg[0].agr[1].par.flatMap((p: { cand: { vap: string }[] }) => p.cand);
    cands[2].vap = '900';
    cands[0].vap = '500';
    const r = normalizar(CARGOS[3], bruto);
    const daBancada = r.candidatos.filter((c) => c.bancada === bruto.carg[0].agr[1].n);
    expect(daBancada.find((c) => c.votos === 900)!.posicaoBancada).toBe(1);
    expect(daBancada.find((c) => c.votos === 500)!.posicaoBancada).toBe(2);
    expect(daBancada.map((c) => c.posicaoBancada).sort((x, y) => x! - y!)).toEqual(daBancada.map((_, i) => i + 1));
  });

  it('cargo majoritário não tem bancadas', () => {
    const pres = JSON.parse(readFileSync(join(__dirname, 'tse', '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8'));
    expect(normalizar(CARGOS[0], pres).bancadas).toBeUndefined();
  });
});

describe('projetarVagas', () => {
  it('distribui pelas maiores médias', () => {
    // 7 vagas, votos 340/280/160/60 → 3/3/1/0 (D'Hondt)
    const p = projetarVagas([b('a', 340), b('b', 280), b('c', 160), b('d', 60)], 7);
    expect(Object.fromEntries(p)).toEqual({ a: 3, b: 3, c: 1, d: 0 });
  });
  it('sem votos, ninguém recebe vaga', () => {
    expect([...projetarVagas([b('a', 0), b('b', 0)], 5).values()]).toEqual([0, 0]);
  });
});

describe('vagasPorBancada', () => {
  it('usa as vagas do TSE quando existem', () => {
    const r = vagasPorBancada([b('a', 340, 4), b('b', 280, 3)], 7);
    expect(r.fonte).toBe('tse');
    expect(Object.fromEntries(r.vagas)).toEqual({ a: 4, b: 3 });
  });
  it('projeta quando o TSE ainda não informou vagas mas já há votos', () => {
    const r = vagasPorBancada([b('a', 340), b('b', 280), b('c', 160), b('d', 60)], 7);
    expect(r.fonte).toBe('projecao');
    expect(r.vagas.get('a')).toBe(3);
  });
  it('sem votos, não há vagas a mostrar', () => {
    expect(vagasPorBancada([b('a', 0)], 7).fonte).toBe('nenhuma');
  });
});
