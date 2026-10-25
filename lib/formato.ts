const inteiro = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => inteiro.format(n);
export const fmtPct = (n: number) => `${pct.format(n)}%`;

const umaCasa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

// Contagem de votos para manchetes: "8.779", "84 mil", "1,2 milhão", "3,4 milhões".
export function fmtVotosCurto(n: number): string {
  if (n < 10_000) return fmtInt(n);
  const mil = Math.round(n / 1000);
  if (mil < 1000) return `${mil} mil`;
  const milhoes = Math.round(n / 100_000) / 10;
  return `${umaCasa.format(milhoes)} ${milhoes < 2 ? 'milhão' : 'milhões'}`;
}

export const horaCurta = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
