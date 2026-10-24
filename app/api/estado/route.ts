import { buscarEstado, ufValida } from '@/lib/brasil/estado';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get('uf');
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });

  const dados = await buscarEstado(uf, { cache: 'no-store' });
  const falhouTudo = !dados.presidente && !dados.governador && !dados.senador;
  return responder(`estado:${uf}`, dados, { falhouTudo, cache: cdn(15) });
}
