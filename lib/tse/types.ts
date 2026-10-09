export type ChaveCargo = 'presidente' | 'presidenteBr' | 'governador' | 'senador' | 'depFederal' | 'depEstadual';

export type Turno = 1 | 2;

export type CargoConfig = {
  chave: ChaveCargo;
  nome: string;
  eleicao: string;
  codigo: string;
  uf: string;
  ufFoto?: string; // pasta das fotos, quando difere de `uf`
  nacional?: boolean; // total do país, mesmo com um município escolhido
  proporcional: boolean;
};

export type Municipio = { cd: string; nm: string };

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
  // Só nos cargos proporcionais: a bancada (partido ou federação) e a posição dentro dela.
  bancada?: string;
  posicaoBancada?: number;
};

// Partido isolado ou federação que disputa as vagas de um cargo proporcional.
export type Bancada = {
  id: string;
  nome: string;
  tipo: 'partido' | 'federacao' | 'coligacao';
  vagas: number; // vagas informadas pelo TSE (0 enquanto não informa)
  votosNominais: number;
  votosLegenda: number;
  votos: number;
  candidatos: number;
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
  bancadas?: Bancada[]; // do mais para o menos votado
  quociente?: number; // quociente eleitoral informado pelo TSE
  erro?: string;
};

export type Resultados = { cargos: ResultadoCargo[]; buscadoEm: string };
