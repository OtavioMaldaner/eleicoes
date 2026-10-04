import cidades from './cidades-exterior.json';

export type Uf = { sigla: string; nome: string; ibge: string };
// pais: nome do país nos contornos (Natural Earth); paisPt: nome exibido.
export type CidadeExterior = { cd: string; nm: string; pais: string; paisPt: string };

export const CIDADES_EXTERIOR: CidadeExterior[] = cidades;

export const UFS: Uf[] = [
  { sigla: 'ac', nome: 'Acre', ibge: '12' },
  { sigla: 'al', nome: 'Alagoas', ibge: '27' },
  { sigla: 'ap', nome: 'Amapá', ibge: '16' },
  { sigla: 'am', nome: 'Amazonas', ibge: '13' },
  { sigla: 'ba', nome: 'Bahia', ibge: '29' },
  { sigla: 'ce', nome: 'Ceará', ibge: '23' },
  { sigla: 'df', nome: 'Distrito Federal', ibge: '53' },
  { sigla: 'es', nome: 'Espírito Santo', ibge: '32' },
  { sigla: 'go', nome: 'Goiás', ibge: '52' },
  { sigla: 'ma', nome: 'Maranhão', ibge: '21' },
  { sigla: 'mt', nome: 'Mato Grosso', ibge: '51' },
  { sigla: 'ms', nome: 'Mato Grosso do Sul', ibge: '50' },
  { sigla: 'mg', nome: 'Minas Gerais', ibge: '31' },
  { sigla: 'pa', nome: 'Pará', ibge: '15' },
  { sigla: 'pb', nome: 'Paraíba', ibge: '25' },
  { sigla: 'pr', nome: 'Paraná', ibge: '41' },
  { sigla: 'pe', nome: 'Pernambuco', ibge: '26' },
  { sigla: 'pi', nome: 'Piauí', ibge: '22' },
  { sigla: 'rj', nome: 'Rio de Janeiro', ibge: '33' },
  { sigla: 'rn', nome: 'Rio Grande do Norte', ibge: '24' },
  { sigla: 'rs', nome: 'Rio Grande do Sul', ibge: '43' },
  { sigla: 'ro', nome: 'Rondônia', ibge: '11' },
  { sigla: 'rr', nome: 'Roraima', ibge: '14' },
  { sigla: 'sc', nome: 'Santa Catarina', ibge: '42' },
  { sigla: 'sp', nome: 'São Paulo', ibge: '35' },
  { sigla: 'se', nome: 'Sergipe', ibge: '28' },
  { sigla: 'to', nome: 'Tocantins', ibge: '17' },
];
