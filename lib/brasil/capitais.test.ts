import { describe, expect, it } from 'vitest';
import { CAPITAIS } from './capitais';
import { municipiosDe } from './estado';
import { UFS } from '../mapas/dados';

describe('CAPITAIS', () => {
  it('tem uma capital por estado, e cada uma existe na tabela de municípios do TSE', () => {
    expect(Object.keys(CAPITAIS).sort()).toEqual(UFS.map((u) => u.sigla).sort());
    for (const [uf, nome] of Object.entries(CAPITAIS)) {
      expect(municipiosDe(uf).some((m) => m.nome === nome), `${nome}/${uf}`).toBe(true);
    }
  });
});
