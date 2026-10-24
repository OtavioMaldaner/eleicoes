import { buscarEstadoSegundoTurno, ufValida } from '@/lib/brasil/estado';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get('uf');
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });

  const dados = await buscarEstadoSegundoTurno(uf, { cache: 'no-store' });
  const falhouTudo = !dados.presidente2 && !dados.presidente1 && !dados.governador1;
  return responder(`2t-estado:${uf}`, dados, { falhouTudo, cache: cdn(15) });
}
