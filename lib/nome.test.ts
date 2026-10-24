import { describe, expect, it } from 'vitest';
import { nomeBonito } from './nome';

describe('nomeBonito', () => {
  it('passa de caixa alta para nome próprio, com partículas em minúscula', () => {
    expect(nomeBonito('PROFESSORA MARIA DO CARMO')).toBe('Professora Maria do Carmo');
    expect(nomeBonito('LUIZ INACIO LULA DA SILVA')).toBe('Luiz Inacio Lula da Silva');
  });
  it('devolve os acentos que o TSE omite', () => {
    expect(nomeBonito('FLAVIO BOLSONARO')).toBe('Flávio Bolsonaro');
  });
});
