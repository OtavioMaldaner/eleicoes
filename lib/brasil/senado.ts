import type { Local, VotoCand } from '../mapas/agregar';

export const VAGAS_POR_ESTADO = 2;
export const VAGAS_EM_DISPUTA = 54;
// Senadores eleitos em 2022, com mandato até 2031: não estão em disputa.
export const VAGAS_FORA_DA_DISPUTA = 27;

export type Assento = { uf: string; id: string; nome: string; partido: string; eleito: boolean };

// Quem ocupa hoje cada uma das duas vagas de cada estado que já tem votos.
export function assentos(estados: Local[]): Assento[] {
  return estados.flatMap((l) =>
    l.votos
      .slice(0, VAGAS_POR_ESTADO)
      .filter((v) => v.votos > 0)
      .map((v) => ({ uf: l.chave, id: v.id, nome: v.nome, partido: v.partido, eleito: v.eleito === true })),
  );
}

export type PlacarSenado = { partidos: { partido: string; vagas: number; definidas: number }[]; definidas: number; semLider: number };

export function placarSenado(estados: Local[]): PlacarSenado {
  const lista = assentos(estados);
  const porPartido = new Map<string, { partido: string; vagas: number; definidas: number }>();
  for (const a of lista) {
    const p = porPartido.get(a.partido) ?? { partido: a.partido, vagas: 0, definidas: 0 };
    p.vagas++;
    if (a.eleito) p.definidas++;
    porPartido.set(a.partido, p);
  }
  return {
    partidos: [...porPartido.values()].sort((a, b) => b.vagas - a.vagas || a.partido.localeCompare(b.partido)),
    definidas: lista.filter((a) => a.eleito).length,
    semLider: VAGAS_EM_DISPUTA - lista.length,
  };
}

export type Disputa = { uf: string; nome: string; segundo: VotoCand; terceiro: VotoCand; margem: number; votos: number };

// Distância entre o 2º (última vaga) e o 3º (primeiro fora), do estado mais apertado ao mais folgado.
export function disputaSegundaVaga(estados: Local[]): Disputa[] {
  return estados
    .flatMap((l) => {
      const [, segundo, terceiro] = l.votos;
      if (l.total === 0 || !segundo || !terceiro) return [];
      const votos = segundo.votos - terceiro.votos;
      return [{ uf: l.chave, nome: l.nome, segundo, terceiro, votos, margem: (votos / l.total) * 100 }];
    })
    .sort((a, b) => a.margem - b.margem);
}

// Posições das cadeiras num semicírculo de raio 1, da esquerda para a direita.
export function hemiciclo(cadeiras: number, fileiras: number): { x: number; y: number }[] {
  const raios = Array.from({ length: fileiras }, (_, i) => 0.45 + (0.55 * i) / Math.max(fileiras - 1, 1));
  const somaRaios = raios.reduce((s, r) => s + r, 0);
  // Cada fileira recebe cadeiras em proporção ao seu comprimento; a sobra vai para a mais externa.
  const porFileira = raios.map((r) => Math.floor((cadeiras * r) / somaRaios));
  porFileira[fileiras - 1] += cadeiras - porFileira.reduce((s, n) => s + n, 0);

  const pontos = raios.flatMap((r, i) =>
    Array.from({ length: porFileira[i] }, (_, k) => {
      const angulo = Math.PI - (Math.PI * (k + 0.5)) / porFileira[i];
      return { x: r * Math.cos(angulo), y: r * Math.sin(angulo), angulo, r };
    }),
  );
  return pontos.sort((a, b) => b.angulo - a.angulo || a.r - b.r).map(({ x, y }) => ({ x, y }));
}
