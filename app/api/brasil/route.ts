import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarBrasil, CARGOS_BRASIL, CARGOS_SEGUNDO_TURNO } from '@/lib/brasil/fetch';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const cargo = params.get('cargo') ?? 'presidente';
  const turno = params.get('turno') === '2' ? 2 : 1;
  if (!Object.hasOwn(turno === 2 ? CARGOS_SEGUNDO_TURNO : CARGOS_BRASIL, cargo)) return Response.json({ erro: 'Cargo inválido' }, { status: 400 });

  const dados = await buscarBrasil(cargo as CargoBrasil, { cache: 'no-store' }, turno);
  const falhouTudo = dados.estados.length === 0;
  // `final`: dados que já não mudam (1º turno encerrado) ficam muito tempo no cache.
  const final = params.get('final') === '1' && turno === 1;
  // Resposta com falhas fica pouco tempo no cache.
  const cache = dados.semResposta.length ? cdn(5, 0, 600) : final ? cdn(3600, 3600, 86400) : cdn(15);
  return responder(`brasil:${cargo}:${turno}`, dados, { falhouTudo, cache });
}
