import { describe, expect, it } from 'vitest';
import { montar, type Local, type VotoCand } from '../mapas/agregar';
import { eventosAtuais, registrarEventos } from './eventos';

const cand = (id: string, votos: number): VotoCand => ({ id, numero: '0', nome: id, partido: id, votos });
const estado = (uf: string, a: number, b: number, feitas: number): Local => montar(uf, uf, 100, feitas, [cand('lula', a), cand('flavio', b)]);

describe('registrarEventos', () => {
  it('a primeira busca só guarda a base; as seguintes geram eventos, do mais novo ao mais antigo', () => {
    const k = 'ev1';
    expect(registrarEventos(k, [estado('rs', 0, 0, 0)], '2026-10-25T20:00:00Z')).toEqual([]);
    const a = registrarEventos(k, [estado('rs', 10, 5, 10)], '2026-10-25T20:00:30Z');
    expect(a.map((e) => e.tipo)).toContain('primeiros');
    const b = registrarEventos(k, [estado('rs', 10, 30, 60)], '2026-10-25T20:01:00Z');
    expect(b[0].tipo).not.toBe('primeiros');
    expect(b.length).toBeGreaterThan(a.length);
    expect(b.some((e) => e.tipo === 'virada')).toBe(true);
  });
  it('pedir de novo a mesma busca, ou uma mais velha, não duplica eventos', () => {
    const k = 'ev2';
    registrarEventos(k, [estado('sp', 0, 0, 0)], '2026-10-25T20:00:00Z');
    const a = registrarEventos(k, [estado('sp', 10, 5, 10)], '2026-10-25T20:00:30Z');
    expect(registrarEventos(k, [estado('sp', 10, 5, 10)], '2026-10-25T20:00:30Z')).toEqual(a);
    expect(registrarEventos(k, [estado('sp', 0, 0, 0)], '2026-10-25T19:00:00Z')).toEqual(a);
    expect(eventosAtuais(k)).toEqual(a);
  });
  it('guarda no máximo 30', () => {
    const k = 'ev3';
    let r = registrarEventos(k, [estado('mg', 0, 0, 0)], '2026-10-25T20:00:00Z');
    for (let i = 1; i <= 40; i++) {
      // alterna o líder a cada busca: uma virada por vez
      r = registrarEventos(k, [estado('mg', i % 2 ? 10 + i : 5, i % 2 ? 5 : 10 + i, 20)], `2026-10-25T20:${String(i).padStart(2, '0')}:00Z`);
    }
    expect(r.length).toBe(30);
  });
});
