import { municipioValido } from '@/lib/tse/config';
import { buscarResultados } from '@/lib/tse/fetch';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mun = params.get('mun');
  const turno = params.get('turno') ?? '1';
  if (mun !== null && !municipioValido(mun)) return Response.json({ erro: 'Município inválido' }, { status: 400 });
  if (turno !== '1' && turno !== '2') return Response.json({ erro: 'Turno inválido' }, { status: 400 });

  const dados = await buscarResultados({ cache: 'no-store' }, mun ?? undefined, turno === '2' ? 2 : 1);
  const falhouTudo = dados.cargos.every((c) => c.erro);
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : 'public, s-maxage=10' },
  });
}
