import { fmtVotosCurto } from './formato';
import type { Local, VotoCand } from './mapas/agregar';
import { nomeBonito } from './nome';

export type Placar = {
  a: VotoCand;
  b: VotoCand; // na ordem recebida em `finalistas`
  votosA: number;
  votosB: number;
  pctA: number; // % sobre o total de votos do local; 0 sem votos
  pctB: number;
  vantagem: number;
  lider: VotoCand | null; // null em empate ou sem votos
  semVotos: boolean;
  pctApurado: number;
  pctFaltam: number;
};

const votosDe = (l: Local, id: string) => l.votos.find((v) => v.id === id)?.votos ?? 0;

export function placar(l: Local | null | undefined, finalistas: VotoCand[]): Placar | null {
  if (!l || finalistas.length < 2) return null;
  const [a, b] = finalistas;
  const votosA = votosDe(l, a.id);
  const votosB = votosDe(l, b.id);
  const semVotos = l.total === 0;
  return {
    a,
    b,
    votosA,
    votosB,
    pctA: semVotos ? 0 : (votosA / l.total) * 100,
    pctB: semVotos ? 0 : (votosB / l.total) * 100,
    vantagem: Math.abs(votosA - votosB),
    lider: semVotos || votosA === votosB ? null : votosA > votosB ? a : b,
    semVotos,
    pctApurado: l.pctSecoes,
    pctFaltam: Math.max(100 - l.pctSecoes, 0),
  };
}

const primeiroNome = (v: VotoCand) => nomeBonito(v.nome).split(' ')[0];

export function manchete(p: Placar, eleito: VotoCand | null): string {
  if (eleito) return `${primeiroNome(eleito)} eleito presidente`;
  if (p.semVotos) return 'Apuração ainda não começou';
  if (!p.lider) return 'Empate em votos';
  return `${primeiroNome(p.lider)} lidera por ${fmtVotosCurto(p.vantagem)} votos`;
}
