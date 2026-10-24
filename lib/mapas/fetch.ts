import { CARGOS_SEGUNDO_TURNO, type Turno } from '../brasil/fetch';
import { BASE, CARGOS } from '../tse/config';
import { normalizar } from '../tse/normalize';
import { localDe, somar, type Local, type Mapas } from './agregar';
import { CIDADES_EXTERIOR, UFS } from './dados';

const PRESIDENTE = CARGOS[0];
const TEMPO_LIMITE_MS = 8_000;

// Presidente é eleição federal: 6257 no 1º turno, 6258 no 2º.
const urlDe = (turno: Turno) => (uf: string, municipio = '') => {
  const e = turno === 2 ? CARGOS_SEGUNDO_TURNO.presidente.eleicao : PRESIDENTE.eleicao;
  return `${BASE}/${e}/dados/${uf}/${uf}${municipio}-c0001-e${e.padStart(6, '0')}-u.json`;
};

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
// No 2º turno só o exterior é buscado: os estados já têm a própria tela.
export async function buscarMapas(init?: RequestInit, turno: Turno = 1): Promise<Mapas> {
  const url = urlDe(turno);
  const ufs = turno === 2 ? [] : UFS;
  const [estados, cidades] = await Promise.all([
    Promise.all(ufs.map((u) => buscarLocal(url(u.sigla), u.sigla, u.nome, init))),
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
      ...ufs.filter((_, i) => estados[i] === null).map((u) => u.sigla),
      ...[...porPais].filter(([, g]) => g.locais.length === 0).map(([pais]) => pais),
    ],
    falhas: [...estados, ...cidades].filter((l) => l === null).length,
    buscadoEm: new Date().toISOString(),
  };
}
