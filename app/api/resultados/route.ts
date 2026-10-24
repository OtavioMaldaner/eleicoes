import { municipioValido } from '@/lib/tse/config';
import { cdn, responder } from '@/lib/servidor/cache';
import { buscarResultados } from '@/lib/tse/fetch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const mun = new URL(request.url).searchParams.get('mun');
  if (mun !== null && !municipioValido(mun)) return Response.json({ erro: 'Município inválido' }, { status: 400 });

  const dados = await buscarResultados({ cache: 'no-store' }, mun ?? undefined);
  const falhouTudo = dados.cargos.every((c) => c.erro);
  return responder(`resultados:${mun ?? 'rs'}`, dados, { falhouTudo, cache: cdn(10) });
}
