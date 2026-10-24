import { buscarCidades } from '@/lib/brasil/busca';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return Response.json(buscarCidades(q.slice(0, 60)), { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
}
