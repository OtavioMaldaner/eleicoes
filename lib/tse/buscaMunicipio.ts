import { MUNICIPIOS } from './config';

const chave = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();

const NOMES = MUNICIPIOS.map((m) => ({ cd: m.cd, k: chave(m.nm) }));

// Devolve o código do município com aquele nome. Ao digitar, espera enquanto o
// texto ainda pode virar outro município (ex.: "SANTA MARIA DO HERVAL").
export function acharMunicipio(texto: string, aoDigitar: boolean): string | null {
  const k = chave(texto);
  const exato = NOMES.find((m) => m.k === k);
  if (!exato) return null;
  if (aoDigitar && NOMES.some((m) => m.k !== k && m.k.startsWith(k))) return null;
  return exato.cd;
}
