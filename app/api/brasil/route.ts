import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarBrasil, CARGOS_BRASIL, CARGOS_SEGUNDO_TURNO } from '@/lib/brasil/fetch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const cargo = params.get('cargo') ?? 'presidente';
  const turno = params.get('turno') === '2' ? 2 : 1;
  if (!Object.hasOwn(turno === 2 ? CARGOS_SEGUNDO_TURNO : CARGOS_BRASIL, cargo)) return Response.json({ erro: 'Cargo inválido' }, { status: 400 });

  const dados = await buscarBrasil(cargo as CargoBrasil, { cache: 'no-store' }, turno);
  const falhouTudo = dados.estados.length === 0;
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    // Resposta com falhas fica pouco tempo no cache.
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : `public, s-maxage=${dados.semResposta.length ? 5 : 15}` },
  });
}
