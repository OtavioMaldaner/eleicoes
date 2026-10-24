import type { Local } from '../mapas/agregar';
import { lembrar } from '../servidor/cache';
import { municipiosDe } from './estado';
import { buscarLocal } from './fetch';

// Nome de cada capital como está na tabela de municípios do TSE.
export const CAPITAIS: Record<string, string> = {
  ac: 'RIO BRANCO', al: 'MACEIÓ', ap: 'MACAPÁ', am: 'MANAUS', ba: 'SALVADOR', ce: 'FORTALEZA', df: 'BRASÍLIA',
  es: 'VITÓRIA', go: 'GOIÂNIA', ma: 'SÃO LUÍS', mt: 'CUIABÁ', ms: 'CAMPO GRANDE', mg: 'BELO HORIZONTE', pa: 'BELÉM',
  pb: 'JOÃO PESSOA', pr: 'CURITIBA', pe: 'RECIFE', pi: 'TERESINA', rj: 'RIO DE JANEIRO', rn: 'NATAL', rs: 'PORTO ALEGRE',
  ro: 'PORTO VELHO', rr: 'BOA VISTA', sc: 'FLORIANÓPOLIS', sp: 'SÃO PAULO', se: 'ARACAJU', to: 'PALMAS',
};

export type Capital = { uf: string; nome: string; l2: Local | null; l1: Local | null };
export type Capitais = { capitais: Capital[]; falhas: number; buscadoEm: string; desatualizado?: boolean };

const UMA_HORA = 60 * 60_000;

// Presidente nas 27 capitais: o 2º turno (ao vivo) e o 1º (encerrado, guardado por uma hora).
// São 27 arquivos por turno, uma consulta por capital.
export async function buscarCapitais(init?: RequestInit): Promise<Capitais> {
  const capitais = await Promise.all(
    Object.entries(CAPITAIS).map(async ([uf, nome]): Promise<Capital> => {
      const m = municipiosDe(uf).find((x) => x.nome === nome);
      if (!m) return { uf, nome, l2: null, l1: null };
      const alvo = { cd: m.cd, chave: m.ibge };
      const [l2, l1] = await Promise.all([
        buscarLocal('presidente', uf, nome, init, alvo, 2),
        lembrar(`1t-capital:${uf}`, UMA_HORA, () => buscarLocal('presidente', uf, nome, init, alvo, 1)),
      ]);
      return { uf, nome, l2, l1 };
    }),
  );
  return { capitais, falhas: capitais.filter((c) => !c.l2).length, buscadoEm: new Date().toISOString() };
}
