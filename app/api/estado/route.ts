import { buscarEstado, ufValida } from '@/lib/brasil/estado';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoEstado } from '@/lib/servidor/completo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get('uf');
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });

  const servida = await compartilhar(`estado:${uf}`, { ttlMs: 30_000, completo: completoEstado }, () => buscarEstado(uf, { cache: 'no-store' }));
  const dados = servida.dados;
  const falhouTudo = !dados.presidente && !dados.governador && !dados.senador;
  return responder(servida, { falhouTudo, cache: cdn(30) });
}
