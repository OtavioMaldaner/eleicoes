import { buscarResultados } from '@/lib/tse/fetch';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dados = await buscarResultados({ cache: 'no-store' });
  const falhouTudo = dados.cargos.every((c) => c.erro);
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : 'public, s-maxage=10' },
  });
}
