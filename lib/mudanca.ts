import type { Local, VotoCand } from './mapas/agregar';
import { variacao } from './variacao';

export type MudancaUF = { uf: string; nome: string; delta: number }; // delta em pontos percentuais

// Em cada estado com votos nos dois turnos, quem mais subiu em relação ao 1º turno. A chave do
// resultado é o id do candidato; as listas vão da maior para a menor subida.
export function mudancaPorEstado(estados2: Local[], estados1: Local[], finalistas: VotoCand[]): Record<string, MudancaUF[]> {
  const por1 = new Map(estados1.map((l) => [l.chave, l]));
  const saida: Record<string, MudancaUF[]> = {};
  for (const l2 of estados2) {
    const v = variacao(l2, por1.get(l2.chave), finalistas);
    if (!v?.ganhou) continue;
    const delta = v.deltas[v.ganhou];
    if (delta <= 0) continue;
    (saida[v.ganhou] ??= []).push({ uf: l2.chave, nome: l2.nome, delta });
  }
  for (const lista of Object.values(saida)) lista.sort((x, y) => y.delta - x.delta || x.nome.localeCompare(y.nome));
  return saida;
}
