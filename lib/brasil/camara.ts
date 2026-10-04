import { vagasPorBancada } from '../bancadas';
import { montar, type Local, type VotoCand } from '../mapas/agregar';
import type { ResultadoCargo } from '../tse/types';

const MAIS_VOTADOS_POR_ESTADO = 12;

// Câmara num estado: cada bancada (partido ou federação) entra como um concorrente,
// para o mapa e as listas funcionarem como nos outros cargos.
export function localCamara(uf: string, nome: string, r: ResultadoCargo): Local {
  const bancadas = r.bancadas ?? [];
  const { vagas, fonte } = vagasPorBancada(bancadas, r.vagas);
  const votos = bancadas.map((b) => ({ id: b.nome, numero: '0', nome: b.nome, partido: b.nome, votos: b.votos }));
  return {
    ...montar(uf, nome, r.apuracao?.secoesTotal ?? 0, r.apuracao?.secoesTotalizadas ?? 0, votos),
    eleitorado: r.apuracao?.eleitorado ?? 0,
    camara: {
      vagas: r.vagas,
      eleitos: r.candidatos.filter((c) => c.eleito).length,
      fonte,
      bancadas: bancadas.map((b) => ({ nome: b.nome, vagas: vagas.get(b.id) ?? 0, votos: b.votos })),
      maisVotados: r.candidatos
        .slice(0, MAIS_VOTADOS_POR_ESTADO)
        .filter((c) => c.votos > 0)
        .map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos, eleito: c.eleito })),
    },
  };
}

export type Composicao = {
  vagas: number;
  eleitos: number;
  projecao: boolean; // alguma vaga vem de projeção nossa, não do TSE
  bancadas: { nome: string; vagas: number; votos: number }[];
  maisVotados: (VotoCand & { uf: string })[];
};

// Soma dos estados recebidos: a composição da Câmara (ou de um estado só).
export function composicao(locais: Local[]): Composicao {
  const porNome = new Map<string, { nome: string; vagas: number; votos: number }>();
  let vagas = 0;
  let eleitos = 0;
  let projecao = false;
  const maisVotados: Composicao['maisVotados'] = [];
  for (const l of locais) {
    if (!l.camara) continue;
    vagas += l.camara.vagas;
    eleitos += l.camara.eleitos;
    projecao ||= l.camara.fonte === 'projecao';
    for (const b of l.camara.bancadas) {
      const soma = porNome.get(b.nome) ?? { nome: b.nome, vagas: 0, votos: 0 };
      soma.vagas += b.vagas;
      soma.votos += b.votos;
      porNome.set(b.nome, soma);
    }
    maisVotados.push(...l.camara.maisVotados.map((c) => ({ ...c, uf: l.chave })));
  }
  return {
    vagas,
    eleitos,
    projecao,
    bancadas: [...porNome.values()].sort((a, b) => b.vagas - a.vagas || b.votos - a.votos),
    maisVotados: maisVotados.sort((a, b) => b.votos - a.votos),
  };
}
