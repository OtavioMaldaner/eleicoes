import type { CargoBrasil } from '@/lib/brasil/analise';
import { buscarMunicipios, ufValida } from '@/lib/brasil/estado';
import { cdn, compartilhar, responder } from '@/lib/servidor/cache';
import { completoMunicipios } from '@/lib/servidor/completo';

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

  const servida = await compartilhar(
    `municipios:${uf}:${cargo}:${turno}:${final}`,
    { ttlMs: final ? 3_600_000 : 90_000, completo: completoMunicipios, ttlFalhaMs: 10_000 },
    () => buscarMunicipios(uf, cargo as CargoBrasil, { cache: 'no-store' }, turno),
  );
  const dados = servida.dados;
  const falhouTudo = dados.municipios.length === 0;
  // São centenas de arquivos por estado: cache mais longo que o do resto do site.
  const cache = dados.falhas ? cdn(20, 0, 600) : final ? cdn(3600, 3600, 86400) : cdn(90, 120);
  return responder(servida, { falhouTudo, cache });
}
