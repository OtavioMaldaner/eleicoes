// Cache da CDN: `fresco` segundos valendo; depois disso serve a cópia velha enquanto renova em segundo
// plano (`renova`), e, se a origem der erro, segue servindo a cópia velha por até `erro` segundos.
// Assim, muitos visitantes viram uma consulta ao TSE por vez, e uma falha do TSE não vira tela vazia.
export const cdn = (fresco: number, renova = 60, erro = 900) =>
  `public, s-maxage=${fresco}, stale-while-revalidate=${renova}, stale-if-error=${erro}`;

const ultimoBom = new Map<string, object>();

type Opcoes = { falhouTudo: boolean; cache: string };

// Resposta de uma rota que consulta o TSE. Quando o TSE falha por completo, devolve a última resposta
// boa desta instância (marcada `desatualizado`) em vez de um erro. Só vale numa instância já quente:
// é um reserva, o que segura a carga é o cache da CDN.
export function responder<T extends object>(chave: string, dados: T, { falhouTudo, cache }: Opcoes): Response {
  if (!falhouTudo) {
    ultimoBom.set(chave, dados);
    return Response.json(dados, { headers: { 'Cache-Control': cache } });
  }
  const antigo = ultimoBom.get(chave);
  if (antigo) {
    return Response.json({ ...antigo, desatualizado: true }, { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' } });
  }
  return Response.json(dados, { status: 502, headers: { 'Cache-Control': 'no-store' } });
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
