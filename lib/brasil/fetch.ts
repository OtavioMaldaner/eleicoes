import { localDe, somar, type Local } from '../mapas/agregar';
import { UFS } from '../mapas/dados';
import { BASE } from '../tse/config';
import { normalizar } from '../tse/normalize';
import type { CargoConfig } from '../tse/types';
import type { CargoBrasil } from './analise';
import { localCamara } from './camara';

export const CARGOS_BRASIL: Record<CargoBrasil, { nome: string; eleicao: string; codigo: string }> = {
  presidente: { nome: 'Presidente', eleicao: '6257', codigo: '1' },
  governador: { nome: 'Governador', eleicao: '6259', codigo: '3' },
  senador: { nome: 'Senador', eleicao: '6259', codigo: '5' },
  depFederal: { nome: 'Câmara dos Deputados', eleicao: '6259', codigo: '6' },
};

export type Brasil = { cargo: CargoBrasil; nacional: Local | null; estados: Local[]; semResposta: string[]; buscadoEm: string };

const TEMPO_LIMITE_MS = 8_000;

// Um arquivo do TSE como `Local`. Com `municipio`, busca o arquivo daquele município e usa `chave` no lugar da sigla.
export async function buscarLocal(
  cargo: CargoBrasil,
  uf: string,
  nome: string,
  init?: RequestInit,
  municipio?: { cd: string; chave: string },
): Promise<Local | null> {
  const c = CARGOS_BRASIL[cargo];
  const cfg: CargoConfig = { chave: cargo, nome: c.nome, eleicao: c.eleicao, codigo: c.codigo, uf, proporcional: cargo === 'depFederal' };
  const url = `${BASE}/${c.eleicao}/dados/${uf}/${uf}${municipio?.cd ?? ''}-c${c.codigo.padStart(4, '0')}-e${c.eleicao.padStart(6, '0')}-u.json`;
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
    if (!r.ok) return null;
    const resultado = normalizar(cfg, await r.json());
    const chave = municipio?.chave ?? uf;
    return cargo === 'depFederal' ? localCamara(chave, nome, resultado) : localDe(chave, nome, resultado);
  } catch {
    return null;
  }
}

// Um cargo nos 27 estados; para presidente, também o total nacional.
export async function buscarBrasil(cargo: CargoBrasil, init?: RequestInit): Promise<Brasil> {
  const [nacional, estados] = await Promise.all([
    cargo === 'presidente' ? buscarLocal(cargo, 'br', 'Brasil', init) : null,
    Promise.all(UFS.map((u) => buscarLocal(cargo, u.sigla, u.nome, init))),
  ]);
  const recebidos = estados.filter((e): e is Local => e !== null);
  // Se o arquivo nacional falhar, o total é a soma dos estados recebidos.
  const somaDosEstados = () => ({ ...somar('br', 'Brasil', recebidos), cidades: undefined });
  return {
    cargo,
    nacional: cargo === 'presidente' ? (nacional ?? (recebidos.length ? somaDosEstados() : null)) : null,
    estados: recebidos,
    semResposta: UFS.filter((_, i) => estados[i] === null).map((u) => u.sigla),
    buscadoEm: new Date().toISOString(),
  };
}

// Estado sem resposta mantém o último dado, desde que seja do mesmo cargo.
export function mesclarBrasil(anterior: Brasil | null, novo: Brasil): Brasil {
  if (!anterior || anterior.cargo !== novo.cargo) return novo;
  const faltou = new Set(novo.semResposta);
  return {
    ...novo,
    nacional: novo.nacional ?? anterior.nacional,
    estados: [...novo.estados, ...anterior.estados.filter((e) => faltou.has(e.chave))],
  };
}
