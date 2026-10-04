import { fmtPct } from '../formato';
import { somar, type Local, type VotoCand } from '../mapas/agregar';

export type CargoBrasil = 'presidente' | 'governador' | 'senador';

export const REGIOES: { nome: string; ufs: string[] }[] = [
  { nome: 'Norte', ufs: ['ac', 'ap', 'am', 'pa', 'ro', 'rr', 'to'] },
  { nome: 'Nordeste', ufs: ['al', 'ba', 'ce', 'ma', 'pb', 'pe', 'pi', 'rn', 'se'] },
  { nome: 'Centro-Oeste', ufs: ['df', 'go', 'mt', 'ms'] },
  { nome: 'Sudeste', ufs: ['es', 'mg', 'rj', 'sp'] },
  { nome: 'Sul', ufs: ['pr', 'rs', 'sc'] },
];

export function porRegiao(estados: Local[]): Local[] {
  return REGIOES.map((r) => ({ ...somar(r.nome, r.nome, estados.filter((e) => r.ufs.includes(e.chave))), cidades: undefined }));
}

// Distância, em pontos percentuais, entre o primeiro e o segundo colocados.
export function vantagem(l: Local): number {
  if (l.total === 0) return 0;
  return (((l.votos[0]?.votos ?? 0) - (l.votos[1]?.votos ?? 0)) / l.total) * 100;
}

// O que recebe uma cor no mapa: o candidato para presidente; o partido nos
// cargos estaduais, em que os candidatos mudam de estado para estado.
export function entidadeDe(cargo: CargoBrasil): (v: VotoCand) => string {
  return cargo === 'presidente' ? (v) => v.id : (v) => v.partido;
}

export type Evento = { uf: string; tipo: 'primeiros' | 'virada' | 'marco'; texto: string };

const MARCOS = [100, 90, 50];

// Compara duas atualizações seguidas e descreve o que mudou em cada estado.
export function eventos(anterior: Local[], novo: Local[]): Evento[] {
  const antes = new Map(anterior.map((l) => [l.chave, l]));
  const saida: Evento[] = [];
  for (const l of novo) {
    const a = antes.get(l.chave);
    if (!a) continue;
    const uf = l.chave.toUpperCase();
    const nome = (id: string | null, de: Local) => de.votos.find((v) => v.id === id)?.nome ?? '';
    if (a.total === 0 && l.total > 0) {
      const frente = l.lider ? `${nome(l.lider, l)} na frente` : 'empate na frente';
      saida.push({ uf: l.chave, tipo: 'primeiros', texto: `Primeiros votos em ${uf}: ${frente}` });
    } else if (a.lider && l.lider && a.lider !== l.lider) {
      saida.push({ uf: l.chave, tipo: 'virada', texto: `Virada em ${uf}: ${nome(l.lider, l)} passa ${nome(a.lider, l)}` });
    }
    const marco = MARCOS.find((m) => a.pctSecoes < m && l.pctSecoes >= m);
    if (marco && l.lider) {
      const lider = l.votos[0];
      const quanto = `${lider.nome} lidera com ${fmtPct((lider.votos / l.total) * 100)}`;
      saida.push({ uf: l.chave, tipo: 'marco', texto: marco === 100 ? `${uf} com 100% das seções: ${quanto}` : `${uf} passa de ${marco}% das seções: ${quanto}` });
    }
  }
  return saida;
}
