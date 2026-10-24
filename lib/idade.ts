export type NivelIdade = 'ok' | 'atencao' | 'critico';

const ATENCAO_S = 90;
const CRITICO_S = 300;

// Há quanto tempo os dados foram buscados no TSE. `desatualizado` é a marca do servidor quando o
// TSE falhou e ele devolveu a última cópia boa: nesse caso nunca fica no verde.
export function idadeDosDados(buscadoEm: string, agora: number, desatualizado = false): { segundos: number; nivel: NivelIdade } {
  const t = Date.parse(buscadoEm);
  const segundos = Number.isFinite(t) ? Math.max(Math.round((agora - t) / 1000), 0) : 0;
  const nivel: NivelIdade = segundos >= CRITICO_S ? 'critico' : segundos >= ATENCAO_S || desatualizado ? 'atencao' : 'ok';
  return { segundos, nivel };
}

export function textoIdade(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const m = Math.floor(segundos / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
