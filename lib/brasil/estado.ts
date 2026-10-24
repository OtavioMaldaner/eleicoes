import type { Local } from '../mapas/agregar';
import { lembrar } from '../servidor/cache';
import { UFS } from '../mapas/dados';
import tabela from '../tse/municipios-br.json';
import type { CargoBrasil } from './analise';
import { buscarLocal, type Turno } from './fetch';

export type MunicipioBr = { cd: string; ibge: string; nome: string };

const TABELA = tabela as Record<string, string[][]>;
const SIGLAS = new Set(UFS.map((u) => u.sigla));
const CANDIDATOS_POR_MUNICIPIO = 4;
const SIMULTANEAS = 60;
const UMA_HORA = 60 * 60_000;

export function ufValida(uf: string | null | undefined): uf is string {
  return typeof uf === 'string' && SIGLAS.has(uf);
}

export function municipiosDe(uf: string): MunicipioBr[] {
  return (Object.hasOwn(TABELA, uf) ? TABELA[uf] : []).map(([cd, ibge, nome]) => ({ cd, ibge, nome }));
}

export type Estado = { uf: string; presidente: Local | null; governador: Local | null; senador: Local | null; buscadoEm: string };

// Os três cargos majoritários de um estado.
export async function buscarEstado(uf: string, init?: RequestInit): Promise<Estado> {
  const nome = UFS.find((u) => u.sigla === uf)?.nome ?? uf.toUpperCase();
  const [presidente, governador, senador] = await Promise.all(
    (['presidente', 'governador', 'senador'] as const).map((cargo) => buscarLocal(cargo, uf, nome, init)),
  );
  return { uf, presidente, governador, senador, buscadoEm: new Date().toISOString() };
}

export type Municipios = { uf: string; cargo: CargoBrasil; municipios: Local[]; falhas: number; buscadoEm: string };

// Um cargo em todos os municípios de um estado. A chave de cada local é o código do IBGE,
// o mesmo dos contornos. São centenas de arquivos, buscados em lotes.
export async function buscarMunicipios(uf: string, cargo: CargoBrasil, init?: RequestInit, turno: Turno = 1): Promise<Municipios> {
  const lista = municipiosDe(uf);
  const resultados: (Local | null)[] = new Array(lista.length).fill(null);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < lista.length) {
      const i = proximo++;
      const m = lista[i];
      const local = await buscarLocal(cargo, uf, m.nome, init, { cd: m.cd, chave: m.ibge }, turno);
      // Só os primeiros colocados: o total e o líder já estão calculados.
      resultados[i] = local && { ...local, votos: local.votos.slice(0, CANDIDATOS_POR_MUNICIPIO), camara: undefined };
    }
  }
  await Promise.all(Array.from({ length: Math.min(SIMULTANEAS, lista.length) }, trabalhador));
  const municipios = resultados.filter((l): l is Local => l !== null);
  return { uf, cargo, municipios, falhas: lista.length - municipios.length, buscadoEm: new Date().toISOString() };
}

// Um estado de perto para a tela do 2º turno: o 2º turno de presidente e governador (ao vivo)
// e o 1º turno de tudo, que já terminou. Governador do 2º turno é null onde não há disputa.
export type EstadoSegundoTurno = {
  uf: string;
  presidente2: Local | null;
  governador2: Local | null;
  presidente1: Local | null;
  governador1: Local | null;
  senador: Local | null;
  depFederal: Local | null;
  buscadoEm: string;
};

export async function buscarEstadoSegundoTurno(uf: string, init?: RequestInit): Promise<EstadoSegundoTurno> {
  const nome = UFS.find((u) => u.sigla === uf)?.nome ?? uf.toUpperCase();
  const sem = undefined;
  const [presidente2, governador2, presidente1, governador1, senador, depFederal] = await Promise.all([
    buscarLocal('presidente', uf, nome, init, sem, 2),
    buscarLocal('governador', uf, nome, init, sem, 2),
    // O 1º turno já terminou: não precisa ser consultado de novo a cada rodada.
    lembrar(`1t:${uf}:presidente`, UMA_HORA, () => buscarLocal('presidente', uf, nome, init)),
    lembrar(`1t:${uf}:governador`, UMA_HORA, () => buscarLocal('governador', uf, nome, init)),
    lembrar(`1t:${uf}:senador`, UMA_HORA, () => buscarLocal('senador', uf, nome, init)),
    lembrar(`1t:${uf}:depFederal`, UMA_HORA, () => buscarLocal('depFederal', uf, nome, init)),
  ]);
  return { uf, presidente2, governador2, presidente1, governador1, senador, depFederal, buscadoEm: new Date().toISOString() };
}
