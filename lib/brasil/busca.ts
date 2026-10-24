import tabela from '../tse/municipios-br.json';
import { nomeBonito } from '../nome';

export type Cidade = { uf: string; ibge: string; nome: string };

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const TODAS = Object.entries(tabela as Record<string, string[][]>).flatMap(([uf, lista]) =>
  lista.map(([, ibge, nome]) => ({ uf, ibge, nome: nomeBonito(nome), k: semAcento(nome) })),
);

// Cidades cujo nome começa com o texto vêm antes das que apenas o contêm; depois, ordem alfabética.
// Aceita "cidade sp" ou "cidade/sp" para filtrar por estado.
export function buscarCidades(texto: string, limite = 8): Cidade[] {
  const m = semAcento(texto).match(/^(.*?)(?:[\s/,-]+([a-z]{2}))?$/);
  const termo = m?.[1] ?? '';
  const uf = m?.[2];
  if (termo.length < 2 && !(termo.length >= 1 && uf)) return [];
  const achadas = TODAS.filter((c) => c.k.includes(termo) && (!uf || c.uf === uf));
  // "Rio" e "sp": se o sufixo de duas letras não casar com nenhum estado, trata tudo como nome.
  const lista = achadas.length || !uf ? achadas : TODAS.filter((c) => c.k.includes(semAcento(texto)));
  return lista
    .sort((a, b) => Number(!a.k.startsWith(termo)) - Number(!b.k.startsWith(termo)) || a.k.localeCompare(b.k) || a.uf.localeCompare(b.uf))
    .slice(0, limite)
    .map(({ uf, ibge, nome }) => ({ uf, ibge, nome }));
}
