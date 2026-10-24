import { buscarMapas } from '@/lib/mapas/fetch';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dados = await buscarMapas({ cache: 'no-store' });
  const falhouTudo = dados.estados.length === 0 && dados.paises.length === 0;
  // Resposta com falhas fica pouco tempo no cache para não prender uma soma incompleta.
  return responder('mapas', dados, { falhouTudo, cache: dados.falhas ? cdn(5, 0, 600) : cdn(20) });
}
