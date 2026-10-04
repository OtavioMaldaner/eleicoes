import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARGOS } from './config';
import { normalizar, num } from './normalize';

const ler = (f: string) => JSON.parse(readFileSync(join(__dirname, '__fixtures__', f), 'utf8'));
const presCfg = CARGOS[0];
const fedCfg = CARGOS[3];
const pres = () => ler('br-c0001-e006257-u.json');
const fed = () => ler('rs-c0006-e006259-u.json');

type Campos = { vap?: string; pvap?: string; e?: string; st?: string };

// Preenche votos nos candidatos pelo número.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function comVotos(bruto: any, votos: Record<string, Campos>) {
  for (const agr of bruto.carg[0].agr)
    for (const par of agr.par)
      for (const c of par.cand) if (votos[c.n]) Object.assign(c, votos[c.n]);
  return bruto;
}

describe('num', () => {
  it('converte inteiros e percentuais com vírgula', () => {
    expect(num('158745502')).toBe(158745502);
    expect(num('12,34')).toBe(12.34);
  });
  it('devolve 0 para ausente ou inválido', () => {
    expect(num(undefined)).toBe(0);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
  });
});

describe('normalizar', () => {
  it('lê o arquivo zerado de presidente', () => {
    const r = normalizar(presCfg, pres());
    expect(r.chave).toBe('presidente');
    expect(r.vagas).toBe(1);
    expect(r.proporcional).toBe(false);
    expect(r.candidatos.length).toBeGreaterThan(1);
    expect(r.candidatos.every((c) => c.votos === 0 && !c.eleito)).toBe(true);
    expect(r.apuracao).toMatchObject({
      secoesTotal: 499248,
      secoesTotalizadas: 0,
      pctSecoes: 0,
      eleitorado: 158745502,
      atualizadoEm: '03/10/2026 14:47:37',
      finalizada: false,
    });
  });

  it('com tudo empatado, ordena pelo número do candidato', () => {
    const ns = normalizar(presCfg, pres()).candidatos.map((c) => Number(c.numero));
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
  });

  it('lê vice, partido e foto', () => {
    const c = normalizar(presCfg, pres()).candidatos.find((c) => c.numero === '22')!;
    expect(c.nome).toBe('FLAVIO BOLSONARO');
    expect(c.vice).toBe('ALFREDO GASPAR');
    expect(c.partido).toBe('PL');
    expect(c.fotoUrl).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/280002551544.jpeg');
  });

  it('lê o arquivo de deputado federal', () => {
    const r = normalizar(fedCfg, fed());
    expect(r.vagas).toBe(31);
    expect(r.proporcional).toBe(true);
    expect(r.candidatos).toHaveLength(435);
    expect(new Set(r.candidatos.map((c) => c.id)).size).toBe(435);
  });

  it('ordena por votos e calcula posição, percentual e eleito', () => {
    const [a, b, c] = normalizar(presCfg, pres()).candidatos.map((x) => x.numero);
    const r = normalizar(
      presCfg,
      comVotos(pres(), {
        [c]: { vap: '5000', pvap: '50,25', e: 's', st: 'Eleito' },
        [a]: { vap: '3000', pvap: '30,15' },
        [b]: { vap: '1950', pvap: '19,60' },
      }),
    );
    expect(r.candidatos.slice(0, 3).map((x) => x.numero)).toEqual([c, a, b]);
    expect(r.candidatos.slice(0, 3).map((x) => x.posicao)).toEqual([1, 2, 3]);
    expect(r.candidatos[0]).toMatchObject({ votos: 5000, percentual: 50.25, eleito: true, situacao: 'Eleito' });
    expect(r.candidatos[1].eleito).toBe(false);
  });

  it('calcula a posição dentro do partido', () => {
    const base = normalizar(fedCfg, fed()).candidatos;
    const [p1, p2] = base.filter((c) => c.partido === 'PSTU');
    const outro = base.find((c) => c.partido !== 'PSTU')!;
    const r = normalizar(
      fedCfg,
      comVotos(fed(), { [outro.numero]: { vap: '900' }, [p2.numero]: { vap: '500' }, [p1.numero]: { vap: '100' } }),
    );
    const achar = (n: string) => r.candidatos.find((c) => c.numero === n)!;
    expect(achar(p2.numero)).toMatchObject({ posicao: 2, posicaoPartido: 1 });
    expect(achar(p1.numero)).toMatchObject({ posicao: 3, posicaoPartido: 2 });
    expect(achar(outro.numero)).toMatchObject({ posicao: 1, posicaoPartido: 1 });
  });

  it('usa dt/ht quando preenchidos e lê tf', () => {
    const b = pres();
    Object.assign(b, { dt: '04/10/2026', ht: '18:05:00', tf: 's' });
    const r = normalizar(presCfg, b);
    expect(r.apuracao?.atualizadoEm).toBe('04/10/2026 18:05:00');
    expect(r.apuracao?.finalizada).toBe(true);
  });

  it('candidato sem vap conta 0 votos', () => {
    const b = pres();
    delete b.carg[0].agr[0].par[0].cand[0].vap;
    expect(normalizar(presCfg, b).candidatos.every((c) => c.votos === 0)).toBe(true);
  });

  it('lança erro em formato inesperado', () => {
    expect(() => normalizar(presCfg, {})).toThrow();
    expect(() => normalizar(presCfg, null)).toThrow();
  });
});
