// Falhas ao consultar o TSE e os metadados que as rotas devolvem junto com os dados.
// Este arquivo é compartilhado com o navegador: nada aqui pode depender do servidor.

export type Motivo = 'tse_429' | 'tse_erro' | 'tse_timeout' | 'incompleto';

// `obtidoEm`: quando estes dados foram buscados no TSE. `desatualizado`: o TSE falhou e o servidor
// devolveu a última resposta completa que tinha. `motivo`: por que a busca não deu certo.
export type Meta = { obtidoEm: string; desatualizado: boolean; motivo?: Motivo };

// Uma falha passageira (429, 5xx, tempo esgotado, rede). Arquivo inexistente (404) não conta: no 2º turno
// há estados sem governador, e isso é normal.
export type Falha = { motivo: Exclude<Motivo, 'incompleto'>; esperarMs?: number };

// O servidor (lib/servidor/cache.ts) liga este gancho para recolher as falhas da busca em andamento.
// Guardado em globalThis para ser um só, mesmo que o módulo seja carregado mais de uma vez.
type Relator = { registrar: ((f: Falha) => void) | null };
const g = globalThis as typeof globalThis & { __relatorTse?: Relator };
export const relator: Relator = (g.__relatorTse ??= { registrar: null });
