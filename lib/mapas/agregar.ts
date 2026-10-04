import type { ResultadoCargo } from '../tse/types';

export type VotoCand = { id: string; numero: string; nome: string; partido: string; votos: number };

// Um estado ou um país, com os votos para presidente.
export type Local = {
  chave: string;
  nome: string;
  secoes: number;
  secoesTotalizadas: number;
  pctSecoes: number;
  total: number;
  votos: VotoCand[]; // do mais para o menos votado
  lider: string | null; // id do candidato; null sem votos ou em empate
  empate: boolean;
  cidades?: string[];
};

export type Mapas = { estados: Local[]; paises: Local[]; falhas: number; buscadoEm: string };

export function liderDe(votos: { id: string; votos: number }[]): { lider: string | null; empate: boolean } {
  const [primeiro, segundo] = [...votos].sort((a, b) => b.votos - a.votos);
  if (!primeiro || primeiro.votos === 0) return { lider: null, empate: false };
  if (segundo && segundo.votos === primeiro.votos) return { lider: null, empate: true };
  return { lider: primeiro.id, empate: false };
}

function montar(chave: string, nome: string, secoes: number, secoesTotalizadas: number, votos: VotoCand[]): Local {
  const ordenados = [...votos].sort((a, b) => b.votos - a.votos || Number(a.numero) - Number(b.numero));
  return {
    chave,
    nome,
    secoes,
    secoesTotalizadas,
    pctSecoes: secoes ? (secoesTotalizadas / secoes) * 100 : 0,
    total: ordenados.reduce((s, v) => s + v.votos, 0),
    votos: ordenados,
    ...liderDe(ordenados),
  };
}

export function localDe(chave: string, nome: string, r: ResultadoCargo): Local {
  const votos = r.candidatos.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos }));
  return montar(chave, nome, r.apuracao?.secoesTotal ?? 0, r.apuracao?.secoesTotalizadas ?? 0, votos);
}

export function somar(chave: string, nome: string, locais: Local[]): Local {
  const porId = new Map<string, VotoCand>();
  for (const l of locais)
    for (const v of l.votos) {
      const atual = porId.get(v.id);
      if (atual) atual.votos += v.votos;
      else porId.set(v.id, { ...v });
    }
  const soma = (f: (l: Local) => number) => locais.reduce((s, l) => s + f(l), 0);
  return {
    ...montar(chave, nome, soma((l) => l.secoes), soma((l) => l.secoesTotalizadas), [...porId.values()]),
    cidades: locais.map((l) => l.nome),
  };
}
