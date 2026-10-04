import { describe, expect, it } from 'vitest';
import type { Local } from '../mapas/agregar';
import { assentos, disputaSegundaVaga, hemiciclo, placarSenado } from './senado';

const v = (id: string, votos: number, partido: string, eleito = false) => ({ id, numero: id, nome: `C${id}`, partido, votos, eleito });

function local(chave: string, cands: ReturnType<typeof v>[]): Local {
  const votos = [...cands].sort((a, b) => b.votos - a.votos);
  const total = votos.reduce((s, x) => s + x.votos, 0);
  return { chave, nome: chave.toUpperCase(), secoes: 10, secoesTotalizadas: 5, pctSecoes: 50, total, votos, lider: total ? votos[0].id : null, empate: false };
}

const rs = local('rs', [v('1', 50, 'PA', true), v('2', 30, 'PB'), v('3', 20, 'PA')]);
const sc = local('sc', [v('4', 40, 'PB'), v('5', 39, 'PC'), v('6', 21, 'PA')]);
const pr = local('pr', [v('7', 0, 'PA'), v('8', 0, 'PB')]);
const ac = local('ac', [v('9', 10, 'PA')]);

describe('assentos', () => {
  it('lista quem ocupa as duas vagas de cada estado com votos', () => {
    const a = assentos([rs, sc, pr]);
    expect(a.map((x) => [x.uf, x.id, x.partido, x.eleito])).toEqual([
      ['rs', '1', 'PA', true],
      ['rs', '2', 'PB', false],
      ['sc', '4', 'PB', false],
      ['sc', '5', 'PC', false],
    ]);
  });
  it('estado com um só candidato votado ocupa uma vaga', () => {
    expect(assentos([ac]).map((x) => x.id)).toEqual(['9']);
  });
});

describe('placarSenado', () => {
  it('conta vagas por partido, do maior para o menor, e as definidas', () => {
    const p = placarSenado([rs, sc, pr]);
    expect(p.partidos).toEqual([
      { partido: 'PB', vagas: 2, definidas: 0 },
      { partido: 'PA', vagas: 1, definidas: 1 },
      { partido: 'PC', vagas: 1, definidas: 0 },
    ]);
    expect(p.definidas).toBe(1);
    expect(p.semLider).toBe(50);
  });
});

describe('disputaSegundaVaga', () => {
  it('ordena os estados pela menor distância entre o 2º e o 3º', () => {
    const d = disputaSegundaVaga([rs, sc, pr, ac]);
    expect(d.map((x) => x.uf)).toEqual(['rs', 'sc']);
    expect(d[0]).toMatchObject({ segundo: { id: '2' }, terceiro: { id: '3' }, votos: 10 });
    expect(d[0].margem).toBeCloseTo(10);
    expect(d[1].margem).toBeCloseTo(18);
  });
});

describe('hemiciclo', () => {
  it('distribui as cadeiras em arcos, da esquerda para a direita', () => {
    const p = hemiciclo(81, 4);
    expect(p).toHaveLength(81);
    expect(p.every((c) => c.y >= 0 && c.y <= 1 && c.x >= -1 && c.x <= 1)).toBe(true);
    const angulos = p.map((c) => Math.atan2(c.y, c.x));
    // Ângulo não crescente (com folga para arredondamento): vai da esquerda para a direita.
    expect(angulos.every((a, i) => i === 0 || a <= angulos[i - 1] + 1e-9)).toBe(true);
    expect(new Set(p.map((c) => `${c.x.toFixed(4)},${c.y.toFixed(4)}`)).size).toBe(81);
  });
});
