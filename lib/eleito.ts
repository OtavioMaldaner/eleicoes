import type { Local, VotoCand } from './mapas/agregar';

// O campo `eleito` do TSE também marca quem vai ao 2º turno; só o texto da situação distingue.
export const foiEleito = (v: VotoCand) => /^eleito/i.test(v.situacao ?? '');

// Quem o TSE já declarou eleito num local, se houver.
export const eleitoDe = (l: Local | null | undefined): VotoCand | undefined => l?.votos.find(foiEleito);
