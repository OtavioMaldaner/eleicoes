import { urlFoto } from './config';
import type { Apuracao, Candidato, CargoConfig, ResultadoCargo } from './types';

export function num(s: unknown): number {
  if (typeof s !== 'string' || s === '') return 0;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

const txt = (s: unknown): string => (typeof s === 'string' ? s : '');

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizar(cfg: CargoConfig, bruto: unknown): ResultadoCargo {
  const b = bruto as any;
  const carg = b?.carg?.[0];
  if (!carg) throw new Error('Formato inesperado: sem carg[0]');

  const vistos = new Set<string>();
  const candidatos: Candidato[] = [];
  for (const agr of carg.agr ?? [])
    for (const par of agr.par ?? [])
      for (const c of par.cand ?? []) {
        const id = txt(c.sqcand);
        if (!id || vistos.has(id)) continue;
        vistos.add(id);
        const vices = (c.vs ?? []).map((v: any) => txt(v.nmu)).filter(Boolean);
        candidatos.push({
          id,
          numero: txt(c.n),
          nome: txt(c.nmu) || txt(c.nm),
          vice: vices.length ? vices.join(' / ') : undefined,
          partido: txt(par.sg),
          votos: num(c.vap),
          percentual: num(c.pvap),
          eleito: c.e === 's',
          situacao: txt(c.st),
          posicao: 0,
          posicaoPartido: 0,
          fotoUrl: urlFoto(cfg, id),
        });
      }

  candidatos.sort((x, y) => y.votos - x.votos || Number(x.numero) - Number(y.numero));
  const porPartido = new Map<string, number>();
  candidatos.forEach((c, i) => {
    c.posicao = i + 1;
    c.posicaoPartido = (porPartido.get(c.partido) ?? 0) + 1;
    porPartido.set(c.partido, c.posicaoPartido);
  });

  const { s = {}, e = {}, v = {} } = b;
  const apuracao: Apuracao = {
    secoesTotal: num(s.ts),
    secoesTotalizadas: num(s.st),
    pctSecoes: num(s.pst),
    eleitorado: num(e.te),
    comparecimento: num(e.c),
    pctComparecimento: num(e.pc),
    abstencao: num(e.a),
    pctAbstencao: num(e.pa),
    validos: num(v.vv),
    brancos: num(v.vb),
    pctBrancos: num(v.pvb),
    nulos: num(v.tvn),
    pctNulos: num(v.ptvn),
    atualizadoEm: b.dt && b.ht ? `${b.dt} ${b.ht}` : `${txt(b.dg)} ${txt(b.hg)}`.trim(),
    finalizada: b.tf === 's',
  };

  return {
    chave: cfg.chave,
    nome: cfg.nome,
    vagas: num(carg.nv) || 1,
    proporcional: cfg.proporcional,
    apuracao,
    candidatos,
  };
}
