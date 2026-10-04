import { BASE, CARGOS } from '../tse/config';
import { normalizar } from '../tse/normalize';
import { localDe, somar, type Local, type Mapas } from './agregar';
import { CIDADES_EXTERIOR, UFS } from './dados';

const PRESIDENTE = CARGOS[0];
const TEMPO_LIMITE_MS = 8_000;

const url = (uf: string, municipio = '') =>
  `${BASE}/${PRESIDENTE.eleicao}/dados/${uf}/${uf}${municipio}-c0001-e${PRESIDENTE.eleicao.padStart(6, '0')}-u.json`;

async function buscarLocal(endereco: string, chave: string, nome: string, init?: RequestInit): Promise<Local | null> {
  try {
    const r = await fetch(endereco, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!r.ok) return null;
    return localDe(chave, nome, normalizar(PRESIDENTE, await r.json()));
  } catch {
    return null;
  }
}

// Presidente por estado e, no exterior, por país (soma das cidades de cada país).
export async function buscarMapas(init?: RequestInit): Promise<Mapas> {
  const [estados, cidades] = await Promise.all([
    Promise.all(UFS.map((u) => buscarLocal(url(u.sigla), u.sigla, u.nome, init))),
    Promise.all(CIDADES_EXTERIOR.map((c) => buscarLocal(url('zz', c.cd), c.cd, c.nm, init))),
  ]);

  const porPais = new Map<string, { nome: string; locais: Local[]; faltando: string[] }>();
  CIDADES_EXTERIOR.forEach((c, i) => {
    const grupo = porPais.get(c.pais) ?? { nome: c.paisPt, locais: [], faltando: [] };
    const local = cidades[i];
    if (local) grupo.locais.push(local);
    else grupo.faltando.push(c.nm);
    porPais.set(c.pais, grupo);
  });
  const comDado = [...porPais].filter(([, g]) => g.locais.length > 0);

  return {
    estados: estados.filter((e): e is Local => e !== null),
    paises: comDado.map(([pais, g]) => ({
      ...somar(pais, g.nome, g.locais),
      ...(g.faltando.length ? { cidadesFaltando: g.faltando } : {}),
    })),
    semResposta: [
      ...UFS.filter((_, i) => estados[i] === null).map((u) => u.sigla),
      ...[...porPais].filter(([, g]) => g.locais.length === 0).map(([pais]) => pais),
    ],
    falhas: [...estados, ...cidades].filter((l) => l === null).length,
    buscadoEm: new Date().toISOString(),
  };
}
