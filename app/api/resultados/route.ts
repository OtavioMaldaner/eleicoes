import { municipioValido } from '@/lib/tse/config';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoResultados } from '@/lib/servidor/completo';
import { buscarResultados } from '@/lib/tse/fetch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const mun = new URL(request.url).searchParams.get('mun');
  if (mun !== null && !municipioValido(mun)) return Response.json({ erro: 'Município inválido' }, { status: 400 });

  const servida = await compartilhar(`resultados:${mun ?? 'rs'}`, { ttlMs: 30_000, completo: completoResultados }, () => buscarResultados({ cache: 'no-store' }, mun ?? undefined));
  const dados = servida.dados;
  const falhouTudo = dados.cargos.every((c) => c.erro);
  return responder(servida, { falhouTudo, cache: cdn(30) });
}
