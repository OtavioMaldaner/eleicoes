import type { Marcados } from './marcados';
import type { ChaveCargo, ResultadoCargo, Resultados } from './tse/types';

// p: % de seções totalizadas; c: id do candidato → [votos, percentual]
export type PontoCargo = { p: number; c: Record<string, [number, number]> };
export type Ponto = { t: number; cargos: Partial<Record<ChaveCargo, PontoCargo>> };
export type Metrica = 'pct' | 'votos';
export type Serie = { id: string; pontos: { t: number; y: number }[] };

export const MAX_PONTOS = 400;
export const INTERVALO_MIN_MS = 60_000;
export const TOPO_PROPORCIONAL = 40;
export const MAX_LINHAS = 8;

export function criarPonto(r: Resultados, marcados: Marcados, agora: number): Ponto {
  const cargos: Ponto['cargos'] = {};
  for (const cargo of r.cargos) {
    if (!cargo.apuracao) continue;
    const c: PontoCargo['c'] = {};
    for (const cand of cargo.candidatos)
      if (!cargo.proporcional || cand.posicao <= TOPO_PROPORCIONAL || marcados[cand.id]) c[cand.id] = [cand.votos, cand.percentual];
    cargos[cargo.chave] = { p: cargo.apuracao.pctSecoes, c };
  }
  return { t: agora, cargos };
}

// Antes da apuração começar não há o que registrar.
export function semApuracao(ponto: Ponto): boolean {
  return Object.values(ponto.cargos).every((c) => c.p === 0);
}

// Devolve o mesmo array quando o ponto não entra (conteúdo repetido ou cedo demais).
export function registrar(hist: Ponto[], ponto: Ponto): Ponto[] {
  const ultimo = hist.at(-1);
  if (ultimo) {
    if (JSON.stringify(ultimo.cargos) === JSON.stringify(ponto.cargos)) return hist;
    if (ponto.t - ultimo.t < INTERVALO_MIN_MS) return hist;
  }
  const novo = [...hist, ponto];
  if (novo.length <= MAX_PONTOS) return novo;
  // Rareia a metade mais antiga, mantendo o primeiro ponto.
  const meio = Math.floor(novo.length / 2);
  return novo.filter((_, i) => i === 0 || i >= meio || i % 2 === 1);
}

export function lerHistorico(raw: string | null): Ponto[] {
  try {
    const o: unknown = JSON.parse(raw ?? '');
    if (!Array.isArray(o)) return [];
    const ok = o.every(
      (p) => p && typeof p === 'object' && typeof p.t === 'number' && p.cargos && typeof p.cargos === 'object',
    );
    return ok ? (o as Ponto[]) : [];
  } catch {
    return [];
  }
}

export function idsDoGrafico(cargo: ResultadoCargo, marcados: Marcados): string[] {
  const marcadosDoCargo = cargo.candidatos.filter((c) => marcados[c.id]);
  const demais = cargo.candidatos.filter((c) => !marcados[c.id]);
  return [...marcadosDoCargo, ...demais].slice(0, MAX_LINHAS).map((c) => c.id);
}

export function series(hist: Ponto[], chave: ChaveCargo, ids: string[], metrica: Metrica): Serie[] {
  const i = metrica === 'votos' ? 0 : 1;
  return ids.map((id) => ({
    id,
    pontos: hist.flatMap((p) => {
      const v = p.cargos[chave]?.c[id];
      return v ? [{ t: p.t, y: v[i] }] : [];
    }),
  }));
}

// A cor acompanha o candidato: quem continua mantém o slot; quem entra pega o menor livre.
export function atribuirSlots(anterior: Record<string, number>, ids: string[]): Record<string, number> {
  const novo: Record<string, number> = {};
  for (const id of ids) if (id in anterior) novo[id] = anterior[id];
  const usados = new Set(Object.values(novo));
  for (const id of ids) {
    if (id in novo) continue;
    let slot = 0;
    while (usados.has(slot)) slot++;
    usados.add(slot);
    novo[id] = slot;
  }
  const iguais = Object.keys(anterior).length === ids.length && ids.every((id) => anterior[id] === novo[id]);
  return iguais ? anterior : novo;
}
