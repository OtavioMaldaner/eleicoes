import type { Local, VotoCand } from './mapas/agregar';

export type Vantagem = { chave: string; nome: string; lider: VotoCand; votos: number }; // votos = 1º menos 2º

// Só entram locais com líder (sem empate e com votos), da maior para a menor vantagem.
export function vantagens(locais: Local[]): Vantagem[] {
  const saida: Vantagem[] = [];
  for (const l of locais) {
    if (!l.lider) continue;
    const [primeiro, segundo] = l.votos;
    saida.push({ chave: l.chave, nome: l.nome, lider: primeiro, votos: primeiro.votos - (segundo?.votos ?? 0) });
  }
  return saida.sort((x, y) => y.votos - x.votos || x.nome.localeCompare(y.nome));
}

// A área do círculo é proporcional à vantagem: o raio cresce com a raiz.
export function raioVantagem(votos: number, maximo: number, raioMax: number): number {
  return maximo > 0 ? raioMax * Math.sqrt(votos / maximo) : 0;
}

// Quantos locais cada candidato lidera, por id.
export function contarLideres(locais: Local[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const l of locais) if (l.lider) contagem[l.lider] = (contagem[l.lider] ?? 0) + 1;
  return contagem;
}
