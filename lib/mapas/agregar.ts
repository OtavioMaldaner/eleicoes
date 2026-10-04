import type { ResultadoCargo } from '../tse/types';

export type VotoCand = { id: string; numero: string; nome: string; partido: string; votos: number; eleito?: boolean };

// Um estado ou um país, com os votos para presidente.
export type Local = {
  chave: string;
  nome: string;
  secoes: number;
  secoesTotalizadas: number;
  pctSecoes: number;
  total: number;
  eleitorado?: number;
  votos: VotoCand[]; // do mais para o menos votado
  lider: string | null; // id do candidato; null sem votos ou em empate
  empate: boolean;
  cidades?: string[];
  cidadesFaltando?: string[]; // cidades do país que não responderam: a soma está incompleta
  camara?: Camara; // só na Câmara dos Deputados: `votos` traz as bancadas do estado
};

export type Camara = {
  vagas: number;
  eleitos: number;
  fonte: 'tse' | 'projecao' | 'nenhuma';
  bancadas: { nome: string; vagas: number; votos: number }[];
  maisVotados: VotoCand[];
};

// semResposta: chaves de estados e países sem nenhum dado nesta busca.
export type Mapas = { estados: Local[]; paises: Local[]; semResposta: string[]; falhas: number; buscadoEm: string };

export function liderDe(votos: { id: string; votos: number }[]): { lider: string | null; empate: boolean } {
  const [primeiro, segundo] = [...votos].sort((a, b) => b.votos - a.votos);
  if (!primeiro || primeiro.votos === 0) return { lider: null, empate: false };
  if (segundo && segundo.votos === primeiro.votos) return { lider: null, empate: true };
  return { lider: primeiro.id, empate: false };
}

export function montar(chave: string, nome: string, secoes: number, secoesTotalizadas: number, votos: VotoCand[]): Local {
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
  const votos = r.candidatos.map((c) => ({ id: c.id, numero: c.numero, nome: c.nome, partido: c.partido, votos: c.votos, eleito: c.eleito }));
  return { ...montar(chave, nome, r.apuracao?.secoesTotal ?? 0, r.apuracao?.secoesTotalizadas ?? 0, votos), eleitorado: r.apuracao?.eleitorado ?? 0 };
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
    eleitorado: soma((l) => l.eleitorado ?? 0),
    cidades: locais.map((l) => l.nome),
  };
}

// Estado ou país que não respondeu mantém o último dado; soma parcial de um
// país dá lugar à última soma completa.
export function mesclarMapas(anterior: Mapas | null, novo: Mapas): Mapas {
  if (!anterior) return novo;
  const faltou = new Set(novo.semResposta);
  const manter = (antes: Local[], agora: Local[]) => {
    const velhos = new Map(antes.map((l) => [l.chave, l]));
    const atuais = agora.map((l) => {
      const velho = velhos.get(l.chave);
      return l.cidadesFaltando && velho && !velho.cidadesFaltando ? velho : l;
    });
    const presentes = new Set(agora.map((l) => l.chave));
    return [...atuais, ...antes.filter((l) => faltou.has(l.chave) && !presentes.has(l.chave))];
  };
  return { ...novo, estados: manter(anterior.estados, novo.estados), paises: manter(anterior.paises, novo.paises) };
}
