import { eventos, type EventoComHora } from '../brasil/analise';
import type { Local } from '../mapas/agregar';

const MAX_EVENTOS = 30;

type Historico = { estados: Local[]; obtidoEm: string; lista: EventoComHora[] };
const historicos = new Map<string, Historico>();

// Últimas atualizações, iguais para todos os visitantes: o servidor compara cada busca completa com a
// anterior e guarda os eventos (viradas, primeiros votos, marcos), do mais novo para o mais antigo.
// `obtidoEm` identifica a busca, então pedir de novo a mesma não duplica nada. Chame só com busca completa e
// fresca; sem ela, use `eventosAtuais`. O histórico vive na memória da instância (some se ela reiniciar).
export function registrarEventos(chave: string, estados: Local[], obtidoEm: string, vagas = 1): EventoComHora[] {
  const h = historicos.get(chave);
  if (!h) {
    historicos.set(chave, { estados, obtidoEm, lista: [] });
    return [];
  }
  if (obtidoEm <= h.obtidoEm) return h.lista; // a mesma busca, ou uma mais velha
  const t = Date.parse(obtidoEm);
  const novos = eventos(h.estados, estados, vagas).map((e) => ({ ...e, t }));
  h.lista = [...novos, ...h.lista].slice(0, MAX_EVENTOS);
  h.estados = estados;
  h.obtidoEm = obtidoEm;
  return h.lista;
}

export const eventosAtuais = (chave: string): EventoComHora[] => historicos.get(chave)?.lista ?? [];
