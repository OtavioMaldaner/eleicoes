export type ChaveCargo = 'presidente' | 'governador' | 'senador' | 'depFederal' | 'depEstadual';

export type CargoConfig = {
  chave: ChaveCargo;
  nome: string;
  eleicao: string;
  codigo: string;
  uf: string;
  proporcional: boolean;
};

export type Candidato = {
  id: string;
  numero: string;
  nome: string;
  vice?: string;
  partido: string;
  votos: number;
  percentual: number;
  eleito: boolean;
  situacao: string;
  posicao: number;
  posicaoPartido: number;
  fotoUrl: string;
};

export type Apuracao = {
  secoesTotal: number;
  secoesTotalizadas: number;
  pctSecoes: number;
  eleitorado: number;
  comparecimento: number;
  pctComparecimento: number;
  abstencao: number;
  pctAbstencao: number;
  validos: number;
  brancos: number;
  pctBrancos: number;
  nulos: number;
  pctNulos: number;
  atualizadoEm: string;
  finalizada: boolean;
};

export type ResultadoCargo = {
  chave: ChaveCargo;
  nome: string;
  vagas: number;
  proporcional: boolean;
  apuracao: Apuracao | null;
  candidatos: Candidato[];
  erro?: string;
};

export type Resultados = { cargos: ResultadoCargo[]; buscadoEm: string };
