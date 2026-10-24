import type { Brasil } from '../brasil/fetch';
import type { Estado, EstadoSegundoTurno, Municipios } from '../brasil/estado';
import type { Mapas } from '../mapas/agregar';
import type { Resultados } from '../tse/types';

// O que conta como resposta COMPLETA em cada rota ao vivo. Só ela vira "último dado bom" (veja cache.ts).
// Uma falha passageira (429, 5xx, tempo esgotado) torna a resposta incompleta mesmo que estes testes passem.
// Arquivo inexistente (404) não é falha: no 2º turno só alguns estados têm governador.

const UFS = 27;

export const completoBrasil = (turno: 1 | 2, cargo: string) => (d: Brasil) =>
  turno === 2 && cargo === 'governador' ? d.estados.length > 0 : d.estados.length === UFS && (cargo !== 'presidente' || d.nacional !== null);

export const completoEstado = (d: Estado) => !!d.presidente && !!d.governador && !!d.senador;

// O governador do 2º turno pode não existir no estado; os dois turnos de presidente têm de existir.
export const completoEstadoSegundoTurno = (d: EstadoSegundoTurno) => !!d.presidente1 && !!d.presidente2;

export const completoMapas = (d: Mapas) => d.estados.length === UFS && d.falhas === 0;

export const completoResultados = (d: Resultados) => d.cargos.every((c) => !c.erro);

export const completoMunicipios = (d: Municipios) => d.falhas === 0 && d.municipios.length > 0;
