import { relator, type Falha } from './falhas';

// "Retry-After" vem em segundos ou como data HTTP.
export function esperaDe(valor: string | null, agora = Date.now()): number | undefined {
  if (!valor) return undefined;
  const s = Number(valor);
  if (Number.isFinite(s)) return Math.max(s, 0) * 1000;
  const t = Date.parse(valor);
  return Number.isFinite(t) ? Math.max(t - agora, 0) : undefined;
}

function relatar(f: Falha) {
  relator.registrar?.(f);
}

// Simulação de falha do TSE, para testar o site sem derrubar nada de verdade.
//   SIMULAR_FALHA_TSE=429 | 500 | timeout | erro      (SIMULAR_RETRY_AFTER=<segundos> acompanha o 429)
// Sem a variável, não há efeito. Só o servidor lê process.env; no navegador ela nunca existe.
function simulada(): Response | Error | null {
  const modo = typeof process !== 'undefined' ? process.env.SIMULAR_FALHA_TSE : undefined;
  if (!modo) return null;
  if (modo === '429') return new Response(null, { status: 429, headers: process.env.SIMULAR_RETRY_AFTER ? { 'Retry-After': process.env.SIMULAR_RETRY_AFTER } : undefined });
  if (modo === '500') return new Response(null, { status: 500 });
  if (modo === 'timeout') return new DOMException('simulado', 'TimeoutError') as unknown as Error;
  return new TypeError('fetch failed (simulado)');
}

// fetch ao TSE que anota as falhas passageiras, para o servidor saber por que uma busca ficou incompleta.
export async function consultarTse(url: string, init?: RequestInit): Promise<Response> {
  const sim = simulada();
  let r: Response;
  try {
    if (sim instanceof Response) r = sim;
    else if (sim) throw sim;
    else r = await fetch(url, init);
  } catch (e) {
    const tempo = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    relatar({ motivo: tempo ? 'tse_timeout' : 'tse_erro' });
    throw e;
  }
  if (r.status === 429) relatar({ motivo: 'tse_429', esperarMs: esperaDe(r.headers.get('Retry-After')) });
  else if (r.status >= 500) relatar({ motivo: 'tse_erro' });
  return r;
}
