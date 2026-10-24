import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarMunicipios, ufValida } from '@/lib/brasil/estado';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CARGOS = ['presidente', 'governador', 'senador'];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const uf = params.get('uf');
  const cargo = params.get('cargo') ?? 'presidente';
  if (!ufValida(uf)) return Response.json({ erro: 'Estado inválido' }, { status: 400 });
  const turno = params.get('turno') === '2' ? 2 : 1;
  // `final`: dados que já não mudam (1º turno encerrado) ficam muito tempo no cache.
  const final = params.get('final') === '1';
  if (turno === 2 && cargo === 'senador') return Response.json({ erro: 'Não há 2º turno para senador' }, { status: 400 });
  if (!CARGOS.includes(cargo)) return Response.json({ erro: 'Cargo inválido' }, { status: 400 });

  const dados = await buscarMunicipios(uf, cargo as CargoBrasil, { cache: 'no-store' }, turno);
  const falhouTudo = dados.municipios.length === 0;
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    // São centenas de arquivos por estado: cache mais longo que o do resto do site.
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : `public, s-maxage=${dados.falhas ? 20 : final ? 3600 : 90}` },
  });
}
