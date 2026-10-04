import { describe, expect, it } from 'vitest';
import type { Local } from '../mapas/agregar';
import { comoResultado, entidadeDe, eventos, placar, porRegiao, REGIOES, vantagem } from './analise';

const v = (id: string, votos: number, partido = `P${id}`) => ({ id, numero: id, nome: `C${id}`, partido, votos });

function local(chave: string, votos: Record<string, number>, pctSecoes = 10): Local {
  const lista = Object.entries(votos).map(([id, n]) => v(id, n)).sort((a, b) => b.votos - a.votos);
  const total = lista.reduce((s, x) => s + x.votos, 0);
  const empate = lista.length > 1 && lista[0].votos === lista[1].votos && total > 0;
  return {
    chave, nome: chave.toUpperCase(), secoes: 100, secoesTotalizadas: pctSecoes, pctSecoes, total, votos: lista,
    lider: total > 0 && !empate ? lista[0].id : null, empate,
  };
}

describe('REGIOES', () => {
  it('cobre os 27 estados sem repetir', () => {
    const ufs = REGIOES.flatMap((r) => r.ufs);
    expect(ufs).toHaveLength(27);
    expect(new Set(ufs).size).toBe(27);
  });
});

describe('porRegiao', () => {
  it('soma os estados de cada região e ignora os que faltam', () => {
    const r = porRegiao([local('rs', { a: 10, b: 30 }), local('sc', { a: 25, b: 5 }), local('sp', { a: 1, b: 2 })]);
    expect(r.map((x) => x.nome)).toEqual(['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']);
    const sul = r.find((x) => x.nome === 'Sul')!;
    expect(sul.total).toBe(70);
    expect(sul.votos.map((x) => [x.id, x.votos]).sort()).toEqual([['a', 35], ['b', 35]]);
    expect(sul.empate).toBe(true);
    expect(r.find((x) => x.nome === 'Norte')!.total).toBe(0);
  });
});

describe('vantagem', () => {
  it('é a diferença em pontos percentuais entre os dois primeiros', () => {
    expect(vantagem(local('rs', { a: 60, b: 30, c: 10 }))).toBe(30);
  });
  it('é zero sem votos e 100 com um só candidato votado', () => {
    expect(vantagem(local('rs', { a: 0, b: 0 }))).toBe(0);
    expect(vantagem(local('rs', { a: 5 }))).toBe(100);
  });
});

describe('entidadeDe', () => {
  it('presidente pinta por candidato; os demais por partido', () => {
    expect(entidadeDe('presidente')(v('1', 0, 'PT'))).toBe('1');
    expect(entidadeDe('governador')(v('1', 0, 'PT'))).toBe('PT');
    expect(entidadeDe('senador')(v('1', 0, 'PT'))).toBe('PT');
  });
});

describe('eventos', () => {
  it('avisa dos primeiros votos de um estado', () => {
    const e = eventos([local('mg', { a: 0, b: 0 }, 0)], [local('mg', { a: 7, b: 3 }, 2)]);
    expect(e).toEqual([{ uf: 'mg', tipo: 'primeiros', texto: 'Primeiros votos em MG: Ca na frente' }]);
  });
  it('avisa da troca de líder', () => {
    const e = eventos([local('mg', { a: 7, b: 3 })], [local('mg', { a: 8, b: 9 })]);
    expect(e).toEqual([{ uf: 'mg', tipo: 'virada', texto: 'Virada em MG: Cb passa Ca' }]);
  });
  it('avisa quando o estado cruza 50%, 90% e 100% das seções', () => {
    const e = eventos([local('mg', { a: 7, b: 3 }, 49)], [local('mg', { a: 70, b: 30 }, 91)]);
    expect(e.map((x) => x.texto)).toEqual(['MG passa de 90% das seções: Ca lidera com 70,00%']);
    expect(eventos([local('mg', { a: 7, b: 3 }, 99)], [local('mg', { a: 7, b: 3 }, 100)])[0].texto).toBe('MG com 100% das seções: Ca lidera com 70,00%');
  });
  it('não gera nada sem mudança, sem anterior ou para estado novo sem votos', () => {
    const a = [local('mg', { a: 7, b: 3 }, 20)];
    expect(eventos(a, a)).toEqual([]);
    expect(eventos([], [local('mg', { a: 0 }, 0)])).toEqual([]);
  });
});

describe('placar', () => {
  it('conta quantos estados cada entidade lidera, do maior para o menor', () => {
    const p = placar([local('rs', { a: 9, b: 1 }), local('sc', { a: 5, b: 2 }), local('pr', { b: 7, a: 1 }), local('sp', { a: 3, b: 3 }), local('mg', { a: 0 })], (x) => x.partido);
    expect(p).toEqual([
      { chave: 'Pa', estados: ['rs', 'sc'] },
      { chave: 'Pb', estados: ['pr'] },
    ]);
  });
});

describe('comoResultado', () => {
  it('transforma um local no formato usado pelo gráfico de evolução', () => {
    const r = comoResultado(local('br', { a: 30, b: 70 }, 40));
    expect(r).toMatchObject({ chave: 'presidente', nome: 'Presidente', vagas: 1, proporcional: false });
    expect(r.apuracao?.pctSecoes).toBe(40);
    expect(r.candidatos.map((c) => [c.id, c.votos, c.percentual, c.posicao])).toEqual([['b', 70, 70, 1], ['a', 30, 30, 2]]);
  });
  it('sem votos, percentual zero', () => {
    expect(comoResultado(local('br', { a: 0 })).candidatos[0].percentual).toBe(0);
  });
});

describe('cargo com duas vagas (senado)', () => {
  it('a vantagem é a distância entre o último na vaga e o primeiro fora', () => {
    expect(vantagem(local('rs', { a: 50, b: 30, c: 20 }), 2)).toBe(10);
    expect(vantagem(local('rs', { a: 50, b: 50 }), 2)).toBe(50);
  });
  it('troca de ordem dentro das vagas não é virada', () => {
    expect(eventos([local('mg', { a: 7, b: 5, c: 1 })], [local('mg', { a: 5, b: 7, c: 1 })], 2)).toEqual([]);
  });
  it('avisa quando alguém entra na vaga no lugar de outro', () => {
    const e = eventos([local('mg', { a: 7, b: 5, c: 1 })], [local('mg', { a: 7, b: 5, c: 6 })], 2);
    expect(e).toEqual([{ uf: 'mg', tipo: 'virada', texto: 'Mudança em MG: Cc entra na vaga no lugar de Cb' }]);
  });
});
