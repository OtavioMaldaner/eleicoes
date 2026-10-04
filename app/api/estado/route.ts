import { buscarEstado, ufValida } from '@/lib/brasil/estado';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const uf = new URL(request.url).searchParams.get('uf');
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });

  const dados = await buscarEstado(uf, { cache: 'no-store' });
  const falhouTudo = !dados.presidente && !dados.governador && !dados.senador;
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : 'public, s-maxage=15' },
  });
}
