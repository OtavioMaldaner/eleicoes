import type { Bancada } from './tse/types';

// Distribuição pelas maiores médias (D'Hondt). É uma aproximação: não aplica as
// cláusulas de desempenho da lei (mínimo do quociente por partido e por candidato).
export function projetarVagas(bancadas: Bancada[], vagas: number): Map<string, number> {
  const obtidas = new Map(bancadas.map((b) => [b.id, 0]));
  const comVotos = bancadas.filter((b) => b.votos > 0);
  if (comVotos.length === 0) return obtidas;
  for (let i = 0; i < vagas; i++) {
    let melhor = comVotos[0];
    for (const b of comVotos) {
      if (b.votos / (obtidas.get(b.id)! + 1) > melhor.votos / (obtidas.get(melhor.id)! + 1)) melhor = b;
    }
    obtidas.set(melhor.id, obtidas.get(melhor.id)! + 1);
  }
  return obtidas;
}

export type FonteVagas = 'tse' | 'projecao' | 'nenhuma';

// Vagas de cada bancada: as do TSE quando ele já informa; senão, a projeção.
export function vagasPorBancada(bancadas: Bancada[], vagas: number): { vagas: Map<string, number>; fonte: FonteVagas } {
  if (bancadas.some((b) => b.vagas > 0)) return { vagas: new Map(bancadas.map((b) => [b.id, b.vagas])), fonte: 'tse' };
  if (bancadas.some((b) => b.votos > 0)) return { vagas: projetarVagas(bancadas, vagas), fonte: 'projecao' };
  return { vagas: new Map(bancadas.map((b) => [b.id, 0])), fonte: 'nenhuma' };
}
