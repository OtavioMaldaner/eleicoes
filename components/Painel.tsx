'use client';

import { MUNICIPIOS, municipioValido } from '@/lib/tse/config';
import { useHistorico } from '@/lib/useHistorico';
import { useMarcados } from '@/lib/useMarcados';
import { useResultados } from '@/lib/useResultados';
import type { Turno } from '@/lib/tse/types';
import { useValorLocal } from '@/lib/useValorLocal';
import { ApuracaoGlobal } from './ApuracaoGlobal';
import { GraficoEvolucao } from './GraficoEvolucao';
import { MeusCandidatos } from './MeusCandidatos';
import { PainelCargo } from './PainelCargo';
import { SeletorMunicipio } from './SeletorMunicipio';

export function Painel({ turno = 1 }: { turno?: Turno }) {
  const [munSalvo, setMunicipio] = useValorLocal('eleicoes2026:municipio');
  const municipio = municipioValido(munSalvo) ? munSalvo : null;
  const { dados, erro } = useResultados(municipio, turno);
  const { marcados, alternar } = useMarcados();
  const escopo = municipio ?? 'geral';
  const historico = useHistorico(turno === 2 ? `2t:${escopo}` : escopo, dados, marcados);

  return (
    <div className="space-y-6">
      <SeletorMunicipio valor={municipio} onMudar={setMunicipio} />
      {!dados ? (
        erro && turno === 2 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
            Os resultados do 2º turno ainda não estão disponíveis no TSE. A votação é em 25 de outubro; esta página tenta de novo a cada 30s.
          </p>
        ) : erro ? (
          <p role="alert" className="text-red-400">
            Não foi possível carregar os resultados ({erro}). Nova tentativa em 30s.
          </p>
        ) : (
          <p className="text-zinc-400">Carregando resultados…</p>
        )
      ) : (
        <>
          <ApuracaoGlobal
            cargos={dados.cargos}
            buscadoEm={dados.buscadoEm}
            erro={erro}
            municipio={MUNICIPIOS.find((m) => m.cd === municipio)}
          />
          <MeusCandidatos cargos={dados.cargos} marcados={marcados} alternar={alternar} />
          <GraficoEvolucao cargos={dados.cargos} historico={historico} marcados={marcados} />
          <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${turno === 2 ? 'xl:grid-cols-3' : 'xl:grid-cols-5'}`}>
            {dados.cargos.map((cargo) => (
              <PainelCargo key={cargo.chave} cargo={cargo} marcados={marcados} alternar={alternar} destacarVaga={!municipio} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
