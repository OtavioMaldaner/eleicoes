// O TSE manda os nomes em caixa alta e, às vezes, sem acento. Aqui viram "Flávio Bolsonaro".
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du']);

// Acentos que o TSE costuma omitir nos nomes de urna.
const ACENTOS: Record<string, string> = {
  flavio: 'Flávio',
  jose: 'José',
  antonio: 'Antônio',
  joao: 'João',
  marcio: 'Márcio',
  julio: 'Júlio',
  claudio: 'Cláudio',
  sergio: 'Sérgio',
  ze: 'Zé',
  vania: 'Vânia',
  lucia: 'Lúcia',
  patricia: 'Patrícia',
  ines: 'Inês',
  cesar: 'César',
};

export function nomeBonito(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => {
      if (i > 0 && MINUSCULAS.has(p)) return p;
      if (ACENTOS[p]) return ACENTOS[p];
      // "d'ávila", "o'neil", "maria-clara"
      return p.replace(/(^|['-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
    })
    .join(' ');
}
