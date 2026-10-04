'use client';

import { useMarcados } from '@/lib/useMarcados';
import { useResultados } from '@/lib/useResultados';
import { ApuracaoGlobal } from './ApuracaoGlobal';
import { MeusCandidatos } from './MeusCandidatos';
import { PainelCargo } from './PainelCargo';

export function Painel() {
  const { dados, erro } = useResultados();
  const { marcados, alternar } = useMarcados();

  if (!dados) {
    return erro ? (
      <p role="alert" className="text-red-400">
        Não foi possível carregar os resultados ({erro}). Nova tentativa em 30s.
      </p>
    ) : (
      <p className="text-zinc-400">Carregando resultados…</p>
    );
  }

  return (
    <div className="space-y-6">
      <ApuracaoGlobal cargos={dados.cargos} buscadoEm={dados.buscadoEm} erro={erro} />
      <MeusCandidatos cargos={dados.cargos} marcados={marcados} alternar={alternar} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {dados.cargos.map((cargo) => (
          <PainelCargo key={cargo.chave} cargo={cargo} marcados={marcados} alternar={alternar} />
        ))}
      </div>
    </div>
  );
}
