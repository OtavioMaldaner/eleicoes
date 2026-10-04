'use client';

import type { Feature } from 'geojson';
import { useEffect, useState } from 'react';
import type { CargoBrasil } from './brasil/analise';
import type { Estado, Municipios } from './brasil/estado';

const INTERVALO_ESTADO_MS = 30_000;
const INTERVALO_MUNICIPIOS_MS = 90_000;

// Repete uma busca enquanto a chave não mudar; devolve o dado só se for da chave atual.
function usePeriodico<T>(chave: string | null, url: string | null, intervalo: number, tempoLimite: number) {
  const [estado, setEstado] = useState<{ chave: string | null; dados: T | null; erro: string | null }>({ chave: null, dados: null, erro: null });
  useEffect(() => {
    if (!chave || !url) return;
    let vivo = true;
    async function ciclo() {
      try {
        const r = await fetch(url!, { cache: 'no-store', signal: AbortSignal.timeout(tempoLimite) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const dados: T = await r.json();
        if (vivo) setEstado({ chave, dados, erro: null });
      } catch (e) {
        if (!vivo) return;
        const erro = e instanceof Error ? e.message : String(e);
        setEstado((a) => ({ chave, dados: a.chave === chave ? a.dados : null, erro }));
      }
    }
    ciclo();
    const id = setInterval(ciclo, intervalo);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [chave, url, intervalo, tempoLimite]);
  return estado.chave === chave ? estado : { chave, dados: null, erro: null };
}

// Dados de um estado selecionado: os três cargos majoritários, o cargo atual por município e os contornos.
export function useEstado(uf: string | null, cargo: CargoBrasil) {
  const porMunicipio = uf && cargo !== 'depFederal';
  const resumo = usePeriodico<Estado>(uf, uf && `/api/estado?uf=${uf}`, INTERVALO_ESTADO_MS, 15_000);
  const municipios = usePeriodico<Municipios>(
    porMunicipio ? `${uf}:${cargo}` : null,
    porMunicipio ? `/api/municipios?uf=${uf}&cargo=${cargo}` : null,
    INTERVALO_MUNICIPIOS_MS,
    60_000,
  );

  const [geo, setGeo] = useState<{ uf: string; features: Feature[] } | null>(null);
  useEffect(() => {
    if (!uf) return;
    let vivo = true;
    fetch(`/geo/mun/${uf}.json`)
      .then((r) => r.json())
      .then((g) => vivo && setGeo({ uf, features: g.features }))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [uf]);

  return {
    resumo: resumo.dados,
    municipios: municipios.dados,
    erroMunicipios: municipios.erro,
    contornos: geo && geo.uf === uf ? geo.features : null,
  };
}
