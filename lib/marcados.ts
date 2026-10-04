export type Marca = 'votei' | 'acompanhar';
export type Marcados = Record<string, Marca>;

export const CHAVE_MARCADOS = 'eleicoes2026:marcados';

export function lerMarcados(raw: string | null): Marcados {
  try {
    const o: unknown = JSON.parse(raw ?? '');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return Object.fromEntries(
      Object.entries(o).filter(([, v]) => v === 'votei' || v === 'acompanhar'),
    ) as Marcados;
  } catch {
    return {};
  }
}
