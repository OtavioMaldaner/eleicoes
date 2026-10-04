import { CARGOS, urlDados } from './config';
import { normalizar } from './normalize';
import type { ResultadoCargo, Resultados } from './types';

const TEMPO_LIMITE_MS = 8_000;

export async function buscarResultados(init?: RequestInit): Promise<Resultados> {
  const cargos = await Promise.all(
    CARGOS.map(async (cfg): Promise<ResultadoCargo> => {
      try {
        const r = await fetch(urlDados(cfg), { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return normalizar(cfg, await r.json());
      } catch (e) {
        return {
          chave: cfg.chave,
          nome: cfg.nome,
          vagas: 1,
          proporcional: cfg.proporcional,
          apuracao: null,
          candidatos: [],
          erro: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );
  return { cargos, buscadoEm: new Date().toISOString() };
}

// Cargo que falhou neste ciclo mantém o último dado bom, com o erro anotado.
// Uma resposta mais antiga que a já exibida (ciclos sobrepostos) é descartada.
export function mesclar(anterior: Resultados | null, novo: Resultados): Resultados {
  if (!anterior) return novo;
  if (novo.buscadoEm < anterior.buscadoEm) return anterior;
  return {
    ...novo,
    cargos: novo.cargos.map((c) => {
      if (!c.erro) return c;
      const velho = anterior.cargos.find((a) => a.chave === c.chave);
      return velho?.apuracao ? { ...velho, erro: c.erro } : c;
    }),
  };
}
