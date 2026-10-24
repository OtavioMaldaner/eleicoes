import { buscarMapas } from '@/lib/mapas/fetch';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoMapas } from '@/lib/servidor/completo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const turno = new URL(request.url).searchParams.get('turno') === '2' ? 2 : 1;
  const servida = await compartilhar(`mapas:${turno}`, { ttlMs: 30_000, completo: completoMapas }, () => buscarMapas({ cache: 'no-store' }, turno));
  const dados = servida.dados;
  const falhouTudo = dados.estados.length === 0 && dados.paises.length === 0;
  // Resposta com falhas fica pouco tempo no cache para não prender uma soma incompleta.
  return responder(servida, { falhouTudo, cache: dados.falhas ? cdn(5, 0, 600) : cdn(30) });
}
