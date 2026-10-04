import municipios from './municipios-rs.json';
import type { CargoConfig, Municipio } from './types';

export const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

// 2º turno: eleição federal 6258, estadual 6260.
export const CARGOS: CargoConfig[] = [
  // No painel do RS, presidente é a votação no estado; o total nacional fica na página Brasil.
  { chave: 'presidente', nome: 'Presidente no RS', eleicao: '6257', codigo: '1', uf: 'rs', ufFoto: 'br', proporcional: false },
  { chave: 'governador', nome: 'Governador RS', eleicao: '6259', codigo: '3', uf: 'rs', proporcional: false },
  { chave: 'senador', nome: 'Senador RS', eleicao: '6259', codigo: '5', uf: 'rs', proporcional: false },
  { chave: 'depFederal', nome: 'Deputado Federal RS', eleicao: '6259', codigo: '6', uf: 'rs', proporcional: true },
  { chave: 'depEstadual', nome: 'Deputado Estadual RS', eleicao: '6259', codigo: '7', uf: 'rs', proporcional: true },
];

export const MUNICIPIOS: Municipio[] = municipios;
const CODIGOS = new Set(MUNICIPIOS.map((m) => m.cd));

export function municipioValido(cd: string | null | undefined): cd is string {
  return typeof cd === 'string' && CODIGOS.has(cd);
}

// Os arquivos municipais ficam sempre sob a pasta do RS, inclusive os de presidente.
export function urlDados(c: CargoConfig, municipio?: string): string {
  const arq = `c${c.codigo.padStart(4, '0')}-e${c.eleicao.padStart(6, '0')}-u.json`;
  return municipio
    ? `${BASE}/${c.eleicao}/dados/rs/rs${municipio}-${arq}`
    : `${BASE}/${c.eleicao}/dados/${c.uf}/${c.uf}-${arq}`;
}

export function urlFoto(c: CargoConfig, sqcand: string): string {
  return `${BASE}/${c.eleicao}/fotos/${c.ufFoto ?? c.uf}/${sqcand}.jpeg`;
}
