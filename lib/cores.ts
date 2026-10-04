export const SUPERFICIE = '#18181b';

// Paleta de reserva, para partidos sem cor cadastrada.
const RESERVA = ['#8fa3bf', '#b59f7a', '#9fb58a', '#b58aa6', '#7fb5b0', '#c2a36b'];

// Cores dos partidos, próximas da identidade visual de cada um e ajustadas para
// aparecer no fundo escuro. Partidos da mesma família de cor (os vermelhos, os
// azuis) têm tons diferentes para não se confundirem. A ordem também decide qual
// partido dá a cor a uma federação: o que vier primeiro.
const PARTIDOS: [string, string][] = [
  ['PT', '#e0262d'],
  ['PL', '#2f5fd0'],
  ['MDB', '#2fa84f'],
  ['PSD', '#f59e0b'],
  ['PP', '#5ec8f2'],
  ['UNIAO', '#00a3e0'],
  ['REPUBLICANOS', '#2a9db3'],
  ['PSDB', '#4f8ef7'],
  ['PDT', '#f0577a'],
  ['PSB', '#f7c600'],
  ['PSOL', '#9b5de5'],
  ['NOVO', '#ff6b1a'],
  ['PODE', '#8bd346'],
  ['CIDADANIA', '#ec4899'],
  ['AVANTE', '#14b8a6'],
  ['SOLIDARIEDADE', '#ff8c42'],
  ['PRD', '#6b8fd6'],
  ['REDE', '#2bb39a'],
  ['PV', '#3fae6a'],
  ['PCDOB', '#c81e3a'],
  ['MISSAO', '#fde047'],
  ['DEMOCRATA', '#86efac'],
  ['DC', '#c9a227'],
  ['PSTU', '#d9531e'],
  ['PCB', '#e2725b'],
  ['PCO', '#c0392b'],
  ['UP', '#e5e5e5'],
];

const POR_SIGLA = new Map(PARTIDOS);
const ORDEM = new Map(PARTIDOS.map(([sigla], i) => [sigla, i]));

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '');

// Cor de um partido ou de uma federação ("PCDOB / PT / PV").
export function corPartido(nome: string): string {
  const siglas = nome.split('/').map(normalizar);
  const conhecida = siglas.filter((s) => POR_SIGLA.has(s)).sort((a, b) => ORDEM.get(a)! - ORDEM.get(b)!)[0];
  if (conhecida) return POR_SIGLA.get(conhecida)!;
  let h = 0;
  for (const ch of normalizar(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return RESERVA[h % RESERVA.length];
}

// Mistura a cor com branco: 0 mantém, 1 vira branco.
function clarear(hex: string, quanto: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (c: number) => Math.round(c + (255 - c) * quanto);
  const [r, g, b] = [canal(n >> 16), canal((n >> 8) & 255), canal(n & 255)];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const TRACEJADOS = [undefined, '6 4', '2 4', '10 3 2 3'];

// Uma cor por candidato num mesmo gráfico: a do partido; quando o partido se
// repete, uma versão mais clara e um traço diferente para a linha.
export function coresDosCandidatos(candidatos: { id: string; partido: string }[]): Map<string, { cor: string; tracejado: string | undefined }> {
  const vezes = new Map<string, number>();
  return new Map(
    candidatos.map((c) => {
      const base = corPartido(c.partido);
      const n = vezes.get(base) ?? 0;
      vezes.set(base, n + 1);
      return [c.id, { cor: n === 0 ? base : clarear(base, Math.min(0.3 * n, 0.75)), tracejado: TRACEJADOS[n % TRACEJADOS.length] }];
    }),
  );
}
