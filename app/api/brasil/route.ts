import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarBrasil, CARGOS_BRASIL, CARGOS_SEGUNDO_TURNO } from '@/lib/brasil/fetch';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoBrasil } from '@/lib/servidor/completo';
import { eventosAtuais, registrarEventos } from '@/lib/servidor/eventos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const cargo = params.get('cargo') ?? 'presidente';
  const turno = params.get('turno') === '2' ? 2 : 1;
  if (!Object.hasOwn(turno === 2 ? CARGOS_SEGUNDO_TURNO : CARGOS_BRASIL, cargo)) return Response.json({ erro: 'Cargo inválido' }, { status: 400 });

  // `final`: dados que já não mudam (1º turno encerrado) ficam muito tempo no cache.
  const final = params.get('final') === '1' && turno === 1;
  // O TSE é consultado no máximo uma vez a cada 30s por instância, para qualquer número de visitantes.
  const servida = await compartilhar(
    `brasil:${cargo}:${turno}:${final ? 'final' : 'vivo'}`,
    { ttlMs: final ? 3_600_000 : 30_000, completo: completoBrasil(turno, cargo) },
    () => buscarBrasil(cargo as CargoBrasil, { cache: 'no-store' }, turno),
  );
  // Últimas atualizações: só uma busca completa e fresca gera eventos; as demais mostram o que já há.
  const chaveEventos = `brasil:${cargo}:${turno}`;
  const fresca = !servida.meta.desatualizado && !servida.meta.motivo;
  const lista = final ? [] : fresca ? registrarEventos(chaveEventos, servida.dados.estados, servida.meta.obtidoEm, cargo === 'senador' ? 2 : 1) : eventosAtuais(chaveEventos);
  const dados = { ...servida.dados, eventos: lista };
  const falhouTudo = dados.estados.length === 0;
  // Resposta com falhas fica pouco tempo no cache.
  const cache = dados.semResposta.length ? cdn(5, 0, 600) : final ? cdn(3600, 3600, 86400) : cdn(30);
  return responder({ dados, meta: servida.meta }, { falhouTudo, cache });
}
