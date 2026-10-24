'use client';

import type { Feature } from 'geojson';
import { useEffect, useState } from 'react';
import type { CargoBrasil } from './brasil/analise';
import type { Estado, EstadoSegundoTurno, Municipios } from './brasil/estado';

const INTERVALO_ESTADO_MS = 30_000;
const INTERVALO_MUNICIPIOS_MS = 90_000;

// Repete uma busca enquanto a chave não mudar; devolve o dado só se for da chave atual.
export function usePeriodico<T>(chave: string | null, url: string | null, intervalo: number, tempoLimite: number) {
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

// Contornos dos municípios de um estado.
function useContornos(uf: string | null) {
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
  return geo && geo.uf === uf ? geo.features : null;
}

const INTERVALO_1T_FINAL_MS = 30 * 60_000;

// Um estado na tela do 2º turno: 2º turno ao vivo e 1º turno encerrado, com os municípios dos dois.
// Só o estado escolhido é buscado: o país inteiro seriam 5.570 arquivos do TSE por rodada.
export function useEstadoSegundoTurno(uf: string | null) {
  const resumo = usePeriodico<EstadoSegundoTurno>(uf, uf && `/api/segundo-turno/estado?uf=${uf}`, INTERVALO_ESTADO_MS, 15_000);
  const municipios2 = usePeriodico<Municipios>(uf, uf && `/api/municipios?uf=${uf}&cargo=presidente&turno=2`, INTERVALO_MUNICIPIOS_MS, 60_000);
  const municipios1 = usePeriodico<Municipios>(uf, uf && `/api/municipios?uf=${uf}&cargo=presidente&final=1`, INTERVALO_1T_FINAL_MS, 60_000);
  return {
    resumo: resumo.dados,
    municipios2: municipios2.dados,
    municipios1: municipios1.dados,
    erroMunicipios: municipios2.erro,
    contornos: useContornos(uf),
  };
}
