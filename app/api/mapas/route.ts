import { buscarMapas } from '@/lib/mapas/fetch';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dados = await buscarMapas({ cache: 'no-store' });
  const falhouTudo = dados.estados.length === 0 && dados.paises.length === 0;
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : 'public, s-maxage=60' },
  });
}
