import type { CargoConfig } from './types';

export const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

// 2º turno: eleição federal 6258, estadual 6260.
export const CARGOS: CargoConfig[] = [
  { chave: 'presidente', nome: 'Presidente', eleicao: '6257', codigo: '1', uf: 'br', proporcional: false },
  { chave: 'governador', nome: 'Governador RS', eleicao: '6259', codigo: '3', uf: 'rs', proporcional: false },
  { chave: 'senador', nome: 'Senador RS', eleicao: '6259', codigo: '5', uf: 'rs', proporcional: false },
  { chave: 'depFederal', nome: 'Deputado Federal RS', eleicao: '6259', codigo: '6', uf: 'rs', proporcional: true },
  { chave: 'depEstadual', nome: 'Deputado Estadual RS', eleicao: '6259', codigo: '7', uf: 'rs', proporcional: true },
];

export function urlDados(c: CargoConfig): string {
  return `${BASE}/${c.eleicao}/dados/${c.uf}/${c.uf}-c${c.codigo.padStart(4, '0')}-e${c.eleicao.padStart(6, '0')}-u.json`;
}

export function urlFoto(c: CargoConfig, sqcand: string): string {
  return `${BASE}/${c.eleicao}/fotos/${c.uf}/${sqcand}.jpeg`;
}
