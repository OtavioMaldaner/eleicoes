const inteiro = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => inteiro.format(n);
export const fmtPct = (n: number) => `${pct.format(n)}%`;
