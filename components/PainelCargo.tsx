'use client';

import { useState } from 'react';
import type { Marca, Marcados } from '@/lib/marcados';
import type { Candidato, ResultadoCargo } from '@/lib/tse/types';
import { Bancadas } from './Bancadas';
import { LinhaCandidato } from './LinhaCandidato';

const TOPO = 10;

type Props = { cargo: ResultadoCargo; marcados: Marcados; alternar: (id: string, m: Marca) => void; destacarVaga: boolean };

export function PainelCargo({ cargo, marcados, alternar, destacarVaga }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [busca, setBusca] = useState('');
  const [visao, setVisao] = useState<'candidatos' | 'bancadas'>('candidatos');
  const temBancadas = cargo.proporcional && (cargo.bancadas?.length ?? 0) > 0;
  const pilula = (ativa: boolean) => `rounded-full px-2.5 py-1 text-xs font-medium ${ativa ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`;

  const naVaga = (c: Candidato) => c.eleito || (destacarVaga && !cargo.proporcional && c.votos > 0 && c.posicao <= cargo.vagas);
  const linha = (c: Candidato) => <LinhaCandidato key={c.id} c={c} marca={marcados[c.id]} naVaga={naVaga(c)} onMarcar={alternar} />;

  let lista = cargo.candidatos;
  if (cargo.proporcional) {
    if (expandido) {
      const q = busca.trim().toLowerCase();
      if (q) lista = lista.filter((c) => c.nome.toLowerCase().includes(q) || c.numero.startsWith(q) || c.partido.toLowerCase() === q);
    } else {
      lista = lista.slice(0, TOPO);
    }
  }

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <header className="mb-2">
        <h2 className="text-base font-semibold">{cargo.nome}</h2>
        <p className="text-xs text-zinc-400">
          {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
          {cargo.proporcional && visao === 'candidatos' && !expandido && cargo.candidatos.length > TOPO && <> · {TOPO} mais votados</>}
        </p>
        {cargo.erro && <p className="mt-1 text-xs text-red-400">Falha ao atualizar ({cargo.erro})</p>}
        {temBancadas && (
          <div className="mt-2 inline-flex rounded-full border border-zinc-800 bg-zinc-950 p-0.5" role="group" aria-label={`Visão de ${cargo.nome}`}>
            <button type="button" aria-pressed={visao === 'candidatos'} onClick={() => setVisao('candidatos')} className={pilula(visao === 'candidatos')}>
              Candidatos
            </button>
            <button type="button" aria-pressed={visao === 'bancadas'} onClick={() => setVisao('bancadas')} className={pilula(visao === 'bancadas')}>
              Bancadas
            </button>
          </div>
        )}
      </header>

      {temBancadas && visao === 'bancadas' ? (
        <Bancadas cargo={cargo} marcados={marcados} alternar={alternar} />
      ) : (
        <>
          {cargo.candidatos.length === 0 && <p className="text-sm text-zinc-500">Sem dados para este cargo.</p>}

          {cargo.proporcional && expandido && (
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, número ou partido"
              aria-label={`Buscar em ${cargo.nome}`}
              className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
            />
          )}

          <ul className={`space-y-1 ${expandido ? 'max-h-[70vh] overflow-y-auto' : ''}`}>{lista.map(linha)}</ul>
          {expandido && lista.length === 0 && <p className="text-sm text-zinc-500">Nenhum candidato encontrado.</p>}

          {cargo.proporcional && cargo.candidatos.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              className="mt-2 rounded border border-zinc-700 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {expandido ? 'Mostrar só os mais votados' : `Ver todos os ${cargo.candidatos.length} candidatos`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
