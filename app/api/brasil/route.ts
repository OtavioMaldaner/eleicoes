import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarBrasil, CARGOS_BRASIL } from '@/lib/brasil/fetch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cargo = new URL(request.url).searchParams.get('cargo') ?? 'presidente';
  if (!Object.hasOwn(CARGOS_BRASIL, cargo)) return Response.json({ erro: 'Cargo inválido' }, { status: 400 });

  const dados = await buscarBrasil(cargo as CargoBrasil, { cache: 'no-store' });
  const falhouTudo = dados.estados.length === 0;
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    // Resposta com falhas fica pouco tempo no cache.
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : `public, s-maxage=${dados.semResposta.length ? 5 : 15}` },
  });
}
