import { describe, expect, it } from 'vitest';
import { montar, type VotoCand } from './mapas/agregar';
import { manchete, placar } from './placar';

const cand = (id: string, votos: number, nome = id): VotoCand => ({ id, numero: '0', nome, partido: id, votos });
const lula = cand('a', 0, 'LULA');
const flavio = cand('b', 0, 'FLAVIO BOLSONARO');
const local = (a: number, b: number, secoes = 100, feitas = 50) =>
  montar('br', 'Brasil', secoes, feitas, [cand('a', a, 'LULA'), cand('b', b, 'FLAVIO BOLSONARO')]);

describe('placar', () => {
  it('calcula percentuais, vantagem, líder e o que falta apurar', () => {
    const p = placar(local(1011437, 927752), [lula, flavio])!;
    expect(p.vantagem).toBe(83685);
    expect(p.lider?.id).toBe('a');
    expect(p.pctA).toBeCloseTo(52.16, 2);
    expect(p.pctB).toBeCloseTo(47.84, 2);
    expect(p.pctFaltam).toBe(50);
    expect(p.semVotos).toBe(false);
  });
  it('mantém a ordem dos finalistas recebida', () => {
    const p = placar(local(1011437, 927752), [flavio, lula])!;
    expect(p.a.id).toBe('b');
    expect(p.pctA).toBeCloseTo(47.84, 2);
  });
  it('empate em votos não tem líder', () => {
    const p = placar(local(500, 500), [lula, flavio])!;
    expect(p.lider).toBeNull();
    expect(p.vantagem).toBe(0);
    expect(p.semVotos).toBe(false);
  });
  it('sem votos zera tudo, sem NaN', () => {
    const p = placar(local(0, 0, 100, 0), [lula, flavio])!;
    expect(p.semVotos).toBe(true);
    expect(p.pctA).toBe(0);
    expect(p.pctB).toBe(0);
    expect(p.pctFaltam).toBe(100);
  });
  it('devolve null sem local ou com menos de dois finalistas', () => {
    expect(placar(null, [lula, flavio])).toBeNull();
    expect(placar(undefined, [lula, flavio])).toBeNull();
    expect(placar(local(1, 2), [lula])).toBeNull();
  });
});

describe('manchete', () => {
  it('diz quem lidera e por quantos votos', () => {
    const p = placar(local(1011437, 927752), [lula, flavio])!;
    expect(manchete(p, null)).toBe('Lula lidera por 84 mil votos');
  });
  it('empate em votos', () => {
    expect(manchete(placar(local(500, 500), [lula, flavio])!, null)).toBe('Empate em votos');
  });
  it('antes da apuração', () => {
    expect(manchete(placar(local(0, 0, 100, 0), [lula, flavio])!, null)).toBe('Apuração ainda não começou');
  });
  it('com eleito', () => {
    const p = placar(local(600, 400), [lula, flavio])!;
    expect(manchete(p, p.a)).toBe('Lula eleito presidente');
  });
});
