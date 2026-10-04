import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARGOS } from '../tse/config';
import { normalizar } from '../tse/normalize';
import { composicao, localCamara } from './camara';

const fed = () => JSON.parse(readFileSync(join(__dirname, '..', 'tse', '__fixtures__', 'rs-c0006-e006259-u.json'), 'utf8'));

// Dá votos a duas bancadas e a alguns candidatos.
function comVotos() {
  const bruto = fed();
  const [a1, a2] = bruto.carg[0].agr;
  a1.par[0].tvtn = '1000';
  a1.par[0].cand[0].vap = '700';
  a2.par[0].tvtn = '3000';
  a2.par[0].tvtl = '500';
  a2.par[0].cand[0].vap = '2000';
  a2.par[0].cand[0].e = 's';
  return { bruto, n1: a1.com as string, n2: a2.com as string };
}

describe('localCamara', () => {
  it('sem votos: bancadas zeradas, sem líder e sem vagas', () => {
    const l = localCamara('rs', 'Rio Grande do Sul', normalizar(CARGOS[3], fed()));
    expect(l).toMatchObject({ chave: 'rs', nome: 'Rio Grande do Sul', total: 0, lider: null });
    expect(l.votos).toHaveLength(20);
    expect(l.camara).toMatchObject({ vagas: 31, eleitos: 0, fonte: 'nenhuma' });
  });

  it('trata cada bancada como um concorrente do estado e projeta as vagas', () => {
    const { bruto, n1, n2 } = comVotos();
    const l = localCamara('rs', 'Rio Grande do Sul', normalizar(CARGOS[3], bruto));
    expect(l.votos[0]).toMatchObject({ id: n2, nome: n2, partido: n2, votos: 3500 });
    expect(l.votos[1]).toMatchObject({ id: n1, votos: 1000 });
    expect(l.lider).toBe(n2);
    expect(l.total).toBe(4500);
    expect(l.camara!.fonte).toBe('projecao');
    expect(l.camara!.eleitos).toBe(1);
    const vagas = Object.fromEntries(l.camara!.bancadas.map((b) => [b.nome, b.vagas]));
    expect(vagas[n1] + vagas[n2]).toBe(31);
    expect(vagas[n2]).toBeGreaterThan(vagas[n1]);
    expect(l.camara!.maisVotados.slice(0, 2).map((c) => c.votos)).toEqual([2000, 700]);
    expect(l.camara!.maisVotados[0].eleito).toBe(true);
  });
});

describe('composicao', () => {
  it('soma vagas e votos das bancadas dos estados e junta os mais votados', () => {
    const { bruto, n2 } = comVotos();
    const r = normalizar(CARGOS[3], bruto);
    const c = composicao([localCamara('rs', 'RS', r), localCamara('sc', 'SC', r)]);
    expect(c.vagas).toBe(62);
    expect(c.eleitos).toBe(2);
    expect(c.projecao).toBe(true);
    expect(c.bancadas[0].nome).toBe(n2);
    expect(c.bancadas.reduce((s, b) => s + b.vagas, 0)).toBe(62);
    expect(c.bancadas[0].votos).toBe(7000);
    expect(c.maisVotados.slice(0, 2).map((x) => [x.uf, x.votos])).toEqual([['rs', 2000], ['sc', 2000]]);
  });
  it('sem estados, tudo zero', () => {
    expect(composicao([])).toMatchObject({ vagas: 0, eleitos: 0, projecao: false, bancadas: [], maisVotados: [] });
  });
});
