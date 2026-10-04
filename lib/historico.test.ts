import { describe, expect, it } from 'vitest';
import {
  atribuirSlots,
  atribuirSlotsComLimite,
  criarPonto,
  idsDoGrafico,
  lerHistorico,
  registrar,
  semApuracao,
  series,
  INTERVALO_MIN_MS,
  MAX_PONTOS,
  type Ponto,
} from './historico';
import type { Candidato, ResultadoCargo, Resultados } from './tse/types';

const cand = (id: string, votos: number, posicao: number): Candidato => ({
  id,
  numero: id,
  nome: `C${id}`,
  partido: 'P',
  votos,
  percentual: votos / 10,
  eleito: false,
  situacao: '',
  posicao,
  posicaoPartido: posicao,
  fotoUrl: '',
});

function cargo(chave: ResultadoCargo['chave'], proporcional: boolean, n: number, pct = 10): ResultadoCargo {
  return {
    chave,
    nome: chave,
    vagas: 1,
    proporcional,
    apuracao: { pctSecoes: pct } as ResultadoCargo['apuracao'],
    candidatos: Array.from({ length: n }, (_, i) => cand(String(i + 1), 1000 - i, i + 1)),
  };
}

const resultados = (cargos: ResultadoCargo[]): Resultados => ({ cargos, buscadoEm: '' });
const ponto = (t: number, votos: number): Ponto => ({ t, cargos: { presidente: { p: 1, c: { a: [votos, 1] } } } });

describe('criarPonto', () => {
  it('guarda todos os candidatos de cargo majoritário', () => {
    const p = criarPonto(resultados([cargo('presidente', false, 12, 33.5)]), {}, 123);
    expect(p.t).toBe(123);
    expect(p.cargos.presidente?.p).toBe(33.5);
    expect(Object.keys(p.cargos.presidente!.c)).toHaveLength(12);
    expect(p.cargos.presidente!.c['1']).toEqual([1000, 100]);
  });
  it('nos proporcionais guarda os 40 primeiros e os marcados', () => {
    const p = criarPonto(resultados([cargo('depFederal', true, 100)]), { '90': 'votei' }, 1);
    const ids = Object.keys(p.cargos.depFederal!.c);
    expect(ids).toHaveLength(41);
    expect(ids).toContain('40');
    expect(ids).not.toContain('41');
    expect(ids).toContain('90');
  });
  it('deixa de fora o cargo com erro', () => {
    const ruim: ResultadoCargo = { ...cargo('senador', false, 3), apuracao: null, candidatos: [], erro: 'HTTP 500' };
    expect(criarPonto(resultados([ruim]), {}, 1).cargos.senador).toBeUndefined();
  });
});

describe('registrar', () => {
  it('guarda o primeiro ponto', () => {
    expect(registrar([], ponto(0, 1))).toHaveLength(1);
  });
  it('ignora ponto com o mesmo conteúdo do último', () => {
    const h = [ponto(0, 1)];
    expect(registrar(h, ponto(10 * INTERVALO_MIN_MS, 1))).toBe(h);
  });
  it('ignora ponto novo antes do intervalo mínimo', () => {
    const h = [ponto(0, 1)];
    expect(registrar(h, ponto(INTERVALO_MIN_MS - 1, 2))).toBe(h);
  });
  it('guarda ponto novo depois do intervalo', () => {
    expect(registrar([ponto(0, 1)], ponto(INTERVALO_MIN_MS, 2))).toHaveLength(2);
  });
  it('respeita o limite, mantendo o primeiro e o último', () => {
    let h: Ponto[] = [];
    for (let i = 0; i <= MAX_PONTOS + 50; i++) h = registrar(h, ponto(i * INTERVALO_MIN_MS, i));
    expect(h.length).toBeLessThanOrEqual(MAX_PONTOS);
    expect(h[0].t).toBe(0);
    expect(h.at(-1)!.t).toBe((MAX_PONTOS + 50) * INTERVALO_MIN_MS);
    expect(h.map((p) => p.t)).toEqual([...h.map((p) => p.t)].sort((a, b) => a - b));
  });
});

describe('lerHistorico', () => {
  it('lê pontos válidos', () => {
    const h = [ponto(1, 1), ponto(2, 2)];
    expect(lerHistorico(JSON.stringify(h))).toEqual(h);
  });
  it('trata vazio, corrompido e formato errado como vazio', () => {
    for (const raw of [null, '', '{', '{}', '"x"', '[1,2]', '[{"t":"a"}]', '[{"t":1}]', '[{"t":1,"cargos":{"presidente":{}}}]', '[{"t":1,"cargos":{"presidente":null}}]', '[{"t":1,"cargos":{"presidente":{"p":"x","c":{}}}}]']) expect(lerHistorico(raw)).toEqual([]);
  });
});

describe('idsDoGrafico', () => {
  it('põe os marcados primeiro e completa com os mais votados até 8', () => {
    expect(idsDoGrafico(cargo('depFederal', true, 100), { '50': 'votei', '3': 'acompanhar' })).toEqual(['3', '50', '1', '2', '4', '5', '6', '7']);
  });
  it('nunca passa de 8, mesmo com mais marcados', () => {
    const m = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), 'votei' as const]));
    expect(idsDoGrafico(cargo('depFederal', true, 100), m)).toHaveLength(8);
  });
  it('com menos de 8 candidatos, devolve todos', () => {
    expect(idsDoGrafico(cargo('governador', false, 7), {})).toHaveLength(7);
  });
});

describe('series', () => {
  const h: Ponto[] = [
    { t: 1, cargos: { presidente: { p: 1, c: { a: [10, 1.5], b: [5, 0.5] } } } },
    { t: 2, cargos: { presidente: { p: 2, c: { a: [20, 2.5] } } } },
    { t: 3, cargos: {} },
  ];
  it('extrai votos ou percentual', () => {
    expect(series(h, 'presidente', ['a'], 'votos')).toEqual([
      { id: 'a', pontos: [{ t: 1, y: 10 }, { t: 2, y: 20 }], segmentos: [[{ t: 1, y: 10 }, { t: 2, y: 20 }]] },
    ]);
    expect(series(h, 'presidente', ['a'], 'pct')[0].pontos.map((p) => p.y)).toEqual([1.5, 2.5]);
  });
  it('pula os pontos em que o candidato ou o cargo não aparece', () => {
    expect(series(h, 'presidente', ['b'], 'votos')[0].pontos).toEqual([{ t: 1, y: 5 }]);
    expect(series(h, 'presidente', ['z'], 'votos')[0].pontos).toEqual([]);
  });
});

describe('series com lacunas', () => {
  const c = (ids: string[]) => ({ presidente: { p: 1, c: Object.fromEntries(ids.map((id) => [id, [1, 1] as [number, number]])) } });
  const h: Ponto[] = [
    { t: 1, cargos: c(['a']) },
    { t: 2, cargos: c(['a']) },
    { t: 3, cargos: c(['b']) },
    { t: 4, cargos: {} },
    { t: 5, cargos: c(['a']) },
  ];
  it('quebra a linha onde o candidato some, sem ligar os trechos', () => {
    expect(series(h, 'presidente', ['a'], 'votos')[0].segmentos.map((s) => s.map((p) => p.t))).toEqual([[1, 2], [5]]);
  });
  it('ponto sem o cargo (erro naquele ciclo) não quebra a linha', () => {
    const h2: Ponto[] = [{ t: 1, cargos: c(['a']) }, { t: 2, cargos: {} }, { t: 3, cargos: c(['a']) }];
    expect(series(h2, 'presidente', ['a'], 'votos')[0].segmentos.map((s) => s.map((p) => p.t))).toEqual([[1, 3]]);
  });
});

describe('atribuirSlots', () => {
  it('distribui em ordem fixa', () => {
    expect(atribuirSlots({}, ['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 2 });
  });
  it('quem fica mantém a cor; quem entra pega a primeira livre', () => {
    expect(atribuirSlots({ a: 0, b: 1, c: 2 }, ['c', 'd', 'a'])).toEqual({ a: 0, c: 2, d: 1 });
  });
  it('devolve o mesmo objeto se nada mudou', () => {
    const s = { a: 0, b: 1 };
    expect(atribuirSlots(s, ['b', 'a'])).toBe(s);
  });
});

describe('semApuracao', () => {
  it('é verdadeiro quando nenhum cargo tem seção totalizada', () => {
    expect(semApuracao({ t: 1, cargos: { presidente: { p: 0, c: {} }, senador: { p: 0, c: {} } } })).toBe(true);
    expect(semApuracao({ t: 1, cargos: {} })).toBe(true);
  });
  it('é falso quando algum cargo já tem seções totalizadas', () => {
    expect(semApuracao({ t: 1, cargos: { presidente: { p: 0, c: {} }, senador: { p: 0.01, c: {} } } })).toBe(false);
  });
});

describe('atribuirSlotsComLimite', () => {
  it('mantém a cor de quem saiu enquanto houver cor livre', () => {
    expect(atribuirSlotsComLimite({ a: 0, b: 1 }, ['b', 'c'], 3)).toEqual({ a: 0, b: 1, c: 2 });
  });
  it('sem cor livre, o novo desejado toma a cor de quem não é mais desejado', () => {
    expect(atribuirSlotsComLimite({ a: 0, b: 1, c: 2 }, ['b', 'd'], 3)).toEqual({ b: 1, c: 2, d: 0 });
  });
  it('sem ninguém para ceder, o novo fica sem cor', () => {
    const r = atribuirSlotsComLimite({ a: 0, b: 1 }, ['a', 'b', 'c'], 2);
    expect(r).toMatchObject({ a: 0, b: 1 });
    expect(r.c).toBeGreaterThanOrEqual(2);
  });
  it('devolve o mesmo objeto se nada mudou', () => {
    const s = { a: 0, b: 1 };
    expect(atribuirSlotsComLimite(s, ['b'], 3)).toBe(s);
  });
});
