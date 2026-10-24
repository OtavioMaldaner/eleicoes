import { buscarCapitais } from '@/lib/brasil/capitais';
import { cdn, responder } from '@/lib/servidor/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dados = await buscarCapitais({ cache: 'no-store' });
  const falhouTudo = dados.capitais.every((c) => !c.l2);
  return responder('capitais', dados, { falhouTudo, cache: dados.falhas ? cdn(5, 0, 600) : cdn(20) });
}
