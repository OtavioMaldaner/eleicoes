import { fmtPct } from '../formato';
import { somar, type Local, type VotoCand } from '../mapas/agregar';
import type { ResultadoCargo } from '../tse/types';

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

// Distância, em pontos percentuais, entre o último dentro das vagas e o primeiro fora.
export function vantagem(l: Local, vagas = 1): number {
  if (l.total === 0) return 0;
  return (((l.votos[vagas - 1]?.votos ?? 0) - (l.votos[vagas]?.votos ?? 0)) / l.total) * 100;
}

// O que recebe uma cor no mapa: o candidato para presidente; o partido nos
// cargos estaduais, em que os candidatos mudam de estado para estado.
export function entidadeDe(cargo: CargoBrasil): (v: VotoCand) => string {
  return cargo === 'presidente' ? (v) => v.id : (v) => v.partido;
}

export type Evento = { uf: string; tipo: 'primeiros' | 'virada' | 'marco'; texto: string };

const MARCOS = [100, 90, 50];

// Compara duas atualizações seguidas e descreve o que mudou em cada estado.
// Com mais de uma vaga (senado), o que conta é quem entra e quem sai das vagas.
export function eventos(anterior: Local[], novo: Local[], vagas = 1): Evento[] {
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
    } else if (vagas > 1) {
      const antesNaVaga = a.votos.slice(0, vagas).map((v) => v.id);
      const agoraNaVaga = l.votos.slice(0, vagas).map((v) => v.id);
      const entrou = agoraNaVaga.filter((id) => !antesNaVaga.includes(id));
      const saiu = antesNaVaga.filter((id) => !agoraNaVaga.includes(id));
      if (entrou.length && saiu.length && a.total > 0) {
        saida.push({ uf: l.chave, tipo: 'virada', texto: `Mudança em ${uf}: ${nome(entrou[0], l)} entra na vaga no lugar de ${nome(saiu[0], l)}` });
      }
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

// Quantos estados cada entidade (candidato ou partido) lidera, do maior para o menor.
export function placar(estados: Local[], ent: (v: VotoCand) => string): { chave: string; estados: string[] }[] {
  const porChave = new Map<string, string[]>();
  for (const l of estados) {
    if (!l.lider) continue;
    const k = ent(l.votos[0]);
    porChave.set(k, [...(porChave.get(k) ?? []), l.chave]);
  }
  return [...porChave].map(([chave, ufs]) => ({ chave, estados: ufs })).sort((a, b) => b.estados.length - a.estados.length);
}

// Total nacional de presidente no formato que o gráfico de evolução consome.
export function comoResultado(l: Local): ResultadoCargo {
  return {
    chave: 'presidente',
    nome: 'Presidente',
    vagas: 1,
    proporcional: false,
    apuracao: {
      secoesTotal: l.secoes,
      secoesTotalizadas: l.secoesTotalizadas,
      pctSecoes: l.pctSecoes,
      eleitorado: l.eleitorado ?? 0,
      comparecimento: 0,
      pctComparecimento: 0,
      abstencao: 0,
      pctAbstencao: 0,
      validos: l.total,
      brancos: 0,
      pctBrancos: 0,
      nulos: 0,
      pctNulos: 0,
      atualizadoEm: '',
      finalizada: false,
    },
    candidatos: l.votos.map((v, i) => ({
      id: v.id,
      numero: v.numero,
      nome: v.nome,
      partido: v.partido,
      votos: v.votos,
      percentual: l.total ? (v.votos / l.total) * 100 : 0,
      eleito: false,
      situacao: '',
      posicao: i + 1,
      posicaoPartido: 1,
      fotoUrl: '',
    })),
  };
}
