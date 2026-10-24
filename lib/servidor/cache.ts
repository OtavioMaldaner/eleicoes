import { AsyncLocalStorage } from 'node:async_hooks';
import { relator, type Falha, type Meta, type Motivo } from '../tse/falhas';

// Cache da CDN: `fresco` segundos valendo; depois disso serve a cópia velha enquanto renova em segundo
// plano (`renova`), e, se a origem der erro, segue servindo a cópia velha por até `erro` segundos.
// Assim, muitos visitantes viram uma consulta ao TSE por vez, e uma falha do TSE não vira tela vazia.
export const cdn = (fresco: number, renova = 60, erro = 900) =>
  `public, s-maxage=${fresco}, stale-while-revalidate=${renova}, stale-if-error=${erro}`;

// Resposta servida do último dado bom: a CDN guarda por pouco, para a versão fresca entrar logo que o TSE volte.
const CDN_DESATUALIZADO = 'public, s-maxage=5, stale-while-revalidate=30';

export type Servida<T> = { dados: T; meta: Meta };

// Recolhe, por busca, as falhas passageiras que `consultarTse` anota.
const coleta = new AsyncLocalStorage<Falha[]>();
relator.registrar = (f) => coleta.getStore()?.push(f);

const MAX_ULTIMOS_BONS = 150; // teto de chaves com último dado bom (as de município são as mais pesadas)
const MAX_ENTRADAS = 500;
const ESPERA_429_PADRAO_MS = 15_000;
const ESPERA_429_MAXIMA_MS = 5 * 60_000;

type Bom = { dados: unknown; obtidoEm: string };
// Mais recente por último: ao passar do teto, sai o que ficou mais tempo sem ser pedido.
const ultimosBons = new Map<string, Bom>();
const bloqueadoAte = new Map<string, number>();
const entradas = new Map<string, { em: number; ttl: number; valor: Promise<Servida<unknown>> }>();

function lerBom(chave: string): Bom | undefined {
  const b = ultimosBons.get(chave);
  if (b) {
    ultimosBons.delete(chave);
    ultimosBons.set(chave, b);
  }
  return b;
}

function guardarBom(chave: string, b: Bom) {
  ultimosBons.delete(chave);
  ultimosBons.set(chave, b);
  while (ultimosBons.size > MAX_ULTIMOS_BONS) ultimosBons.delete(ultimosBons.keys().next().value!);
}

// A falha mais informativa de uma busca: 429 antes de tempo esgotado antes de erro qualquer.
function motivoDe(falhas: Falha[]): Exclude<Motivo, 'incompleto'> | null {
  for (const m of ['tse_429', 'tse_timeout', 'tse_erro'] as const) if (falhas.some((f) => f.motivo === m)) return m;
  return null;
}

export type Opcoes<T> = {
  ttlMs: number; // quanto tempo uma resposta completa vale
  completo: (dados: T) => boolean; // o que conta como resposta completa nesta rota (veja lib/servidor/completo.ts)
  ttlFalhaMs?: number; // quanto tempo uma resposta ruim vale, para tentar de novo logo
};

// Uma busca ao TSE por chave a cada `ttlMs`, não importa quantos visitantes peçam: quem chega com a busca
// em andamento, ou logo depois dela, recebe o mesmo resultado.
//
// Só uma resposta COMPLETA (`completo` e nenhuma falha passageira) vira o "último dado bom" da chave, que não
// expira pelo ttl. Quando o TSE falha ou responde incompleto, devolve esse último dado bom, marcado
// `desatualizado`; sem ele, devolve a resposta incompleta mesmo, por pouco tempo. Resposta incompleta nunca
// substitui o último dado bom. Em 429, a chave fica sem consultar o TSE até o fim do Retry-After (ou 15s),
// servindo o último dado bom nesse intervalo.
export function compartilhar<T>(chave: string, { ttlMs, completo, ttlFalhaMs = 5000 }: Opcoes<T>, buscar: () => Promise<T>): Promise<Servida<T>> {
  const agora = Date.now();
  const antigo = entradas.get(chave);
  if (antigo && agora - antigo.em < antigo.ttl) return antigo.valor as Promise<Servida<T>>;

  const bom = lerBom(chave);
  const servirBom = (motivo: Motivo): Servida<T> => ({ dados: bom!.dados as T, meta: { obtidoEm: bom!.obtidoEm, desatualizado: true, motivo } });
  const ate = bloqueadoAte.get(chave);
  if (bom && ate && agora < ate) return Promise.resolve(servirBom('tse_429'));

  async function executar(): Promise<Servida<T>> {
    const falhas: Falha[] = [];
    let dados: T;
    try {
      dados = await coleta.run(falhas, buscar);
    } catch (e) {
      if (!bom) throw e;
      return servirBom(motivoDe(falhas) ?? 'tse_erro');
    }
    const motivo = motivoDe(falhas);
    if (!motivo && completo(dados)) {
      const obtidoEm = new Date().toISOString();
      guardarBom(chave, { dados, obtidoEm });
      bloqueadoAte.delete(chave);
      return { dados, meta: { obtidoEm, desatualizado: false } };
    }
    if (motivo === 'tse_429') {
      const espera = Math.max(...falhas.map((f) => f.esperarMs ?? 0), ESPERA_429_PADRAO_MS);
      bloqueadoAte.set(chave, Date.now() + Math.min(espera, ESPERA_429_MAXIMA_MS));
    }
    if (bom) return servirBom(motivo ?? 'incompleto');
    return { dados, meta: { obtidoEm: new Date().toISOString(), desatualizado: false, motivo: motivo ?? 'incompleto' } };
  }

  const entrada = { em: agora, ttl: ttlMs, valor: executar() as Promise<Servida<unknown>> };
  entradas.set(chave, entrada);
  if (entradas.size > MAX_ENTRADAS) for (const [k, e] of entradas) if (Date.now() - e.em >= e.ttl) entradas.delete(k);
  entrada.valor.then(
    (s) => {
      if (!s.meta.desatualizado && !s.meta.motivo) return;
      // Em 429 sem dado anterior não há o que servir no lugar, mas também não adianta insistir antes do fim da espera.
      entrada.ttl = Math.max(ttlFalhaMs, (bloqueadoAte.get(chave) ?? 0) - entrada.em);
    },
    () => entradas.get(chave) === entrada && entradas.delete(chave),
  );
  return entrada.valor as Promise<Servida<T>>;
}

type OpcoesResposta = { falhouTudo: boolean; cache: string };

// Resposta de uma rota ao vivo. O formato de cada rota continua o mesmo, com dois campos a mais:
// `desatualizado` (já existia) e `meta` ({ obtidoEm, desatualizado, motivo? }).
export function responder<T extends object>({ dados, meta }: Servida<T>, { falhouTudo, cache }: OpcoesResposta): Response {
  const corpo = { ...dados, desatualizado: meta.desatualizado, meta };
  if (meta.desatualizado) return Response.json(corpo, { headers: { 'Cache-Control': CDN_DESATUALIZADO } });
  if (falhouTudo) return Response.json(corpo, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  return Response.json(corpo, { headers: { 'Cache-Control': cache } });
}

// Guarda um resultado que não muda (como o 1º turno, já encerrado) por `ttlMs`. Falha (null) não é guardada.
const memoria = new Map<string, { em: number; valor: Promise<unknown> }>();
export function lembrar<T>(chave: string, ttlMs: number, buscar: () => Promise<T | null>): Promise<T | null> {
  const agora = Date.now();
  const antigo = memoria.get(chave);
  if (antigo && agora - antigo.em < ttlMs) return antigo.valor as Promise<T | null>;
  const valor = buscar();
  memoria.set(chave, { em: agora, valor });
  valor.then(
    (v) => v === null && memoria.get(chave)?.valor === valor && memoria.delete(chave),
    () => memoria.get(chave)?.valor === valor && memoria.delete(chave),
  );
  return valor;
}
