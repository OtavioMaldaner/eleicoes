import { buscarEstadoSegundoTurno, ufValida } from '@/lib/brasil/estado';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoEstadoSegundoTurno } from '@/lib/servidor/completo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get('uf');
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });

  const servida = await compartilhar(`2t-estado:${uf}`, { ttlMs: 30_000, completo: completoEstadoSegundoTurno }, () => buscarEstadoSegundoTurno(uf, { cache: 'no-store' }));
  const dados = servida.dados;
  const falhouTudo = !dados.presidente2 && !dados.presidente1 && !dados.governador1;
  return responder(servida, { falhouTudo, cache: cdn(30) });
}
