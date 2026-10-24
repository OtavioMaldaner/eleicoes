import { buscarMapas } from '@/lib/mapas/fetch';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const turno = new URL(request.url).searchParams.get('turno') === '2' ? 2 : 1;
  const dados = await buscarMapas({ cache: 'no-store' }, turno);
  const falhouTudo = dados.estados.length === 0 && dados.paises.length === 0;
  // Resposta com falhas fica pouco tempo no cache para não prender uma soma incompleta.
  return responder(`mapas:${turno}`, dados, { falhouTudo, cache: dados.falhas ? cdn(5, 0, 600) : cdn(20) });
}
