# Painel de apuração das Eleições 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar hoje um painel Next.js que mostra ao vivo a apuração de Presidente e dos quatro cargos do RS, com destaque para candidatos marcados pelo usuário.

**Architecture:** Uma rota `/api/resultados` busca cinco arquivos JSON do TSE, normaliza com uma função pura e responde com cache de 20s. A página consulta a rota a cada 30s e, se ela falhar, busca direto no TSE pelo navegador com o mesmo código. Marcações ficam em `localStorage`.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-04-painel-eleicoes-design.md`

## Global Constraints

- Base da API: `https://resultados.tse.jus.br/oficial/ele2026`.
- Eleições: `6257` (federal), `6259` (estadual). Cargos: `1`, `3`, `5`, `6`, `7`.
- Cache da rota: 20s. Polling do cliente: 30s. Região da função: `gru1`.
- Chave do `localStorage`: `eleicoes2026:marcados`, valor `{ [sqcand]: 'votei' | 'acompanhar' }`.
- Textos da interface em português do Brasil; números no formato `pt-BR`.
- Arquivos em `lib/` importam uns aos outros por caminho relativo (os testes rodam sem alias). Componentes podem usar `@/`.
- Fora do escopo: 2º turno, resumo por partido, gráfico de evolução, resultados por município.
- Mensagens de commit em inglês, terminando com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GUnhdQKm7QC6BBVhacSrGm
  ```

## Review Focus

1. Arquivo do TSE sem `carg` ou com formato inesperado: o cargo aparece com erro e os outros quatro continuam funcionando (teste na Task 3).
2. Rota devolve erro ou HTML (bloqueio geográfico do TSE à Vercel): o cliente cai para a busca direta (verificação manual na Task 6).
3. `localStorage` com conteúdo corrompido ou valores inválidos: é tratado como vazio, sem quebrar a tela (teste na Task 4).
4. Candidato sem `vap` ou com valor não numérico: conta como 0 votos (teste na Task 2).
5. Falha num ciclo depois de um ciclo bom: a tela mantém o último dado bom daquele cargo (teste de `mesclar` na Task 3).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/tse/types.ts` | Tipos do formato normalizado |
| `lib/tse/config.ts` | Os cinco cargos e a montagem de URLs |
| `lib/tse/normalize.ts` | JSON do TSE → `ResultadoCargo` |
| `lib/tse/fetch.ts` | `buscarResultados`, `mesclar` |
| `lib/marcados.ts` | `lerMarcados` (parse seguro) |
| `lib/useMarcados.ts` | Hook de marcações |
| `lib/useResultados.ts` | Hook de polling com fallback |
| `lib/formato.ts` | Formatação de números |
| `app/api/resultados/route.ts` | Rota proxy |
| `components/*.tsx` | `Painel`, `ApuracaoGlobal`, `MeusCandidatos`, `PainelCargo`, `LinhaCandidato` |

---

### Task 1: Projeto, tipos, config e fixtures

**Files:**
- Create: projeto Next na raiz, `lib/tse/types.ts`, `lib/tse/config.ts`, `lib/tse/__fixtures__/*.json`
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces: `CargoConfig`, `ChaveCargo`, `Candidato`, `Apuracao`, `ResultadoCargo`, `Resultados`; `CARGOS`, `urlDados(cfg)`, `urlFoto(cfg, sqcand)`.

- [ ] **Step 1: Criar o projeto**

```bash
npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
npm i -D vitest
```

Em `package.json`, adicionar em `scripts`: `"test": "vitest run"`.

- [ ] **Step 2: Copiar as fixtures (arquivos reais de 2026, zerados, baixados antes da apuração)**

```bash
mkdir -p lib/tse/__fixtures__
S=/tmp/claude-1000/-home-otavio-maldaner-Documentos-eleicoes/41dbb51e-d478-4214-90b4-22e8a64857ae/scratchpad
cp $S/br-c0001-e006257-u.json $S/rs-c0006-e006259-u.json lib/tse/__fixtures__/
```

Não baixar de novo: depois das 17h os arquivos deixam de estar zerados e os testes dependem dos zeros.

- [ ] **Step 3: `lib/tse/types.ts`**

```ts
export type ChaveCargo = 'presidente' | 'governador' | 'senador' | 'depFederal' | 'depEstadual';

export type CargoConfig = {
  chave: ChaveCargo;
  nome: string;
  eleicao: string;
  codigo: string;
  uf: string;
  proporcional: boolean;
};

export type Candidato = {
  id: string;
  numero: string;
  nome: string;
  vice?: string;
  partido: string;
  votos: number;
  percentual: number;
  eleito: boolean;
  situacao: string;
  posicao: number;
  posicaoPartido: number;
  fotoUrl: string;
};

export type Apuracao = {
  secoesTotal: number;
  secoesTotalizadas: number;
  pctSecoes: number;
  eleitorado: number;
  comparecimento: number;
  pctComparecimento: number;
  abstencao: number;
  pctAbstencao: number;
  validos: number;
  brancos: number;
  pctBrancos: number;
  nulos: number;
  pctNulos: number;
  atualizadoEm: string;
  finalizada: boolean;
};

export type ResultadoCargo = {
  chave: ChaveCargo;
  nome: string;
  vagas: number;
  proporcional: boolean;
  apuracao: Apuracao | null;
  candidatos: Candidato[];
  erro?: string;
};

export type Resultados = { cargos: ResultadoCargo[]; buscadoEm: string };
```

- [ ] **Step 4: `lib/tse/config.ts`**

```ts
import type { CargoConfig } from './types';

export const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

// 2º turno: eleição federal 6258, estadual 6260.
export const CARGOS: CargoConfig[] = [
  { chave: 'presidente', nome: 'Presidente', eleicao: '6257', codigo: '1', uf: 'br', proporcional: false },
  { chave: 'governador', nome: 'Governador RS', eleicao: '6259', codigo: '3', uf: 'rs', proporcional: false },
  { chave: 'senador', nome: 'Senador RS', eleicao: '6259', codigo: '5', uf: 'rs', proporcional: false },
  { chave: 'depFederal', nome: 'Deputado Federal RS', eleicao: '6259', codigo: '6', uf: 'rs', proporcional: true },
  { chave: 'depEstadual', nome: 'Deputado Estadual RS', eleicao: '6259', codigo: '7', uf: 'rs', proporcional: true },
];

export function urlDados(c: CargoConfig): string {
  return `${BASE}/${c.eleicao}/dados/${c.uf}/${c.uf}-c${c.codigo.padStart(4, '0')}-e${c.eleicao.padStart(6, '0')}-u.json`;
}

export function urlFoto(c: CargoConfig, sqcand: string): string {
  return `${BASE}/${c.eleicao}/fotos/${c.uf}/${sqcand}.jpeg`;
}
```

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit` — Expected: sem erros.

```bash
git add -A && git commit -m "Scaffold Next.js app with TSE config, types and fixtures"
```

---

### Task 2: `normalize.ts` (TDD)

**Files:**
- Create: `lib/tse/normalize.ts`
- Test: `lib/tse/normalize.test.ts`

**Interfaces:**
- Consumes: `CargoConfig`, `ResultadoCargo`, `CARGOS`, `urlFoto`.
- Produces: `normalizar(cfg: CargoConfig, bruto: unknown): ResultadoCargo` (lança `Error` se o JSON não tiver `carg[0]`); `num(s: unknown): number`.

- [ ] **Step 1: Escrever os testes**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARGOS } from './config';
import { normalizar, num } from './normalize';

const ler = (f: string) => JSON.parse(readFileSync(join(__dirname, '__fixtures__', f), 'utf8'));
const presCfg = CARGOS[0];
const fedCfg = CARGOS[3];
const pres = () => ler('br-c0001-e006257-u.json');
const fed = () => ler('rs-c0006-e006259-u.json');

// Preenche votos nos candidatos pelo número.
function comVotos(bruto: any, votos: Record<string, { vap?: string; pvap?: string; e?: string; st?: string }>) {
  for (const agr of bruto.carg[0].agr)
    for (const par of agr.par)
      for (const c of par.cand) if (votos[c.n]) Object.assign(c, votos[c.n]);
  return bruto;
}

describe('num', () => {
  it('converte inteiros e percentuais com vírgula', () => {
    expect(num('158745502')).toBe(158745502);
    expect(num('12,34')).toBe(12.34);
  });
  it('devolve 0 para ausente ou inválido', () => {
    expect(num(undefined)).toBe(0);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
  });
});

describe('normalizar', () => {
  it('lê o arquivo zerado de presidente', () => {
    const r = normalizar(presCfg, pres());
    expect(r.chave).toBe('presidente');
    expect(r.vagas).toBe(1);
    expect(r.proporcional).toBe(false);
    expect(r.candidatos.length).toBeGreaterThan(1);
    expect(r.candidatos.every((c) => c.votos === 0 && !c.eleito)).toBe(true);
    expect(r.apuracao).toMatchObject({
      secoesTotal: 499248,
      secoesTotalizadas: 0,
      pctSecoes: 0,
      eleitorado: 158745502,
      atualizadoEm: '03/10/2026 14:47:37',
      finalizada: false,
    });
  });

  it('com tudo empatado, ordena pelo número do candidato', () => {
    const ns = normalizar(presCfg, pres()).candidatos.map((c) => Number(c.numero));
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
  });

  it('lê vice, partido e foto', () => {
    const c = normalizar(presCfg, pres()).candidatos.find((c) => c.numero === '22')!;
    expect(c.nome).toBe('FLAVIO BOLSONARO');
    expect(c.vice).toBe('ALFREDO GASPAR');
    expect(c.partido).toBe('PL');
    expect(c.fotoUrl).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/fotos/br/280002551544.jpeg');
  });

  it('lê o arquivo de deputado federal', () => {
    const r = normalizar(fedCfg, fed());
    expect(r.vagas).toBe(31);
    expect(r.proporcional).toBe(true);
    expect(r.candidatos).toHaveLength(435);
    expect(new Set(r.candidatos.map((c) => c.id)).size).toBe(435);
  });

  it('ordena por votos e calcula posição, percentual e eleito', () => {
    const [a, b, c] = normalizar(presCfg, pres()).candidatos.map((x) => x.numero);
    const r = normalizar(
      presCfg,
      comVotos(pres(), {
        [c]: { vap: '5000', pvap: '50,25', e: 's', st: 'Eleito' },
        [a]: { vap: '3000', pvap: '30,15' },
        [b]: { vap: '1950', pvap: '19,60' },
      }),
    );
    expect(r.candidatos.slice(0, 3).map((x) => x.numero)).toEqual([c, a, b]);
    expect(r.candidatos.slice(0, 3).map((x) => x.posicao)).toEqual([1, 2, 3]);
    expect(r.candidatos[0]).toMatchObject({ votos: 5000, percentual: 50.25, eleito: true, situacao: 'Eleito' });
    expect(r.candidatos[1].eleito).toBe(false);
  });

  it('calcula a posição dentro do partido', () => {
    const base = normalizar(fedCfg, fed()).candidatos;
    const [p1, p2] = base.filter((c) => c.partido === 'PSTU');
    const outro = base.find((c) => c.partido !== 'PSTU')!;
    const r = normalizar(
      fedCfg,
      comVotos(fed(), { [outro.numero]: { vap: '900' }, [p2.numero]: { vap: '500' }, [p1.numero]: { vap: '100' } }),
    );
    const achar = (n: string) => r.candidatos.find((c) => c.numero === n)!;
    expect(achar(p2.numero)).toMatchObject({ posicao: 2, posicaoPartido: 1 });
    expect(achar(p1.numero)).toMatchObject({ posicao: 3, posicaoPartido: 2 });
    expect(achar(outro.numero)).toMatchObject({ posicao: 1, posicaoPartido: 1 });
  });

  it('usa dt/ht quando preenchidos e lê tf', () => {
    const b = pres();
    Object.assign(b, { dt: '04/10/2026', ht: '18:05:00', tf: 's' });
    const r = normalizar(presCfg, b);
    expect(r.apuracao?.atualizadoEm).toBe('04/10/2026 18:05:00');
    expect(r.apuracao?.finalizada).toBe(true);
  });

  it('candidato sem vap conta 0 votos', () => {
    const b = pres();
    delete b.carg[0].agr[0].par[0].cand[0].vap;
    expect(normalizar(presCfg, b).candidatos.every((c) => c.votos === 0)).toBe(true);
  });

  it('lança erro em formato inesperado', () => {
    expect(() => normalizar(presCfg, {})).toThrow();
    expect(() => normalizar(presCfg, null)).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` — Expected: FAIL (módulo `./normalize` não existe).

- [ ] **Step 3: Implementar `lib/tse/normalize.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` — Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add TSE result normalizer"
```

---

### Task 3: `fetch.ts` e rota `/api/resultados`

**Files:**
- Create: `lib/tse/fetch.ts`, `app/api/resultados/route.ts`
- Test: `lib/tse/fetch.test.ts`

**Interfaces:**
- Consumes: `CARGOS`, `urlDados`, `normalizar`, `Resultados`.
- Produces: `buscarResultados(init?: RequestInit): Promise<Resultados>` (nunca lança; cargo com falha vem com `erro`, `apuracao: null`, `candidatos: []`); `mesclar(anterior: Resultados | null, novo: Resultados): Resultados`; `GET /api/resultados` → `Resultados` (status 502 se os cinco cargos falharem).

- [ ] **Step 1: Escrever os testes**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarResultados, mesclar } from './fetch';

const pres = readFileSync(join(__dirname, '__fixtures__', 'br-c0001-e006257-u.json'), 'utf8');
const fed = readFileSync(join(__dirname, '__fixtures__', 'rs-c0006-e006259-u.json'), 'utf8');

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('c0001')) return new Response(pres);
      if (url.includes('c0006')) return new Response(fed);
      if (url.includes('c0003')) return new Response('<html>bloqueado</html>', { status: 403 });
      if (url.includes('c0005')) return new Response('{}');
      throw new Error('rede caiu');
    }),
  );
}

describe('buscarResultados', () => {
  it('isola a falha de cada cargo', async () => {
    stubFetch();
    const r = await buscarResultados();
    const por = Object.fromEntries(r.cargos.map((c) => [c.chave, c]));
    expect(r.cargos.map((c) => c.chave)).toEqual(['presidente', 'governador', 'senador', 'depFederal', 'depEstadual']);
    expect(por.presidente.erro).toBeUndefined();
    expect(por.depFederal.candidatos).toHaveLength(435);
    expect(por.governador).toMatchObject({ erro: 'HTTP 403', apuracao: null, candidatos: [] });
    expect(por.senador.erro).toMatch(/Formato inesperado/);
    expect(por.depEstadual.erro).toBe('rede caiu');
    expect(typeof r.buscadoEm).toBe('string');
  });
});

describe('mesclar', () => {
  it('mantém o último dado bom do cargo que falhou e marca o erro', async () => {
    stubFetch();
    const bom = await buscarResultados();
    const ruim = { ...bom, buscadoEm: 'depois', cargos: bom.cargos.map((c) => ({ ...c, apuracao: null, candidatos: [], erro: 'HTTP 500' })) };
    const m = mesclar(bom, ruim);
    expect(m.buscadoEm).toBe('depois');
    expect(m.cargos[0].candidatos.length).toBeGreaterThan(1);
    expect(m.cargos[0].erro).toBe('HTTP 500');
    expect(m.cargos[1].candidatos).toEqual([]);
  });

  it('sem anterior, devolve o novo', async () => {
    stubFetch();
    const r = await buscarResultados();
    expect(mesclar(null, r)).toBe(r);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` — Expected: FAIL (módulo `./fetch` não existe).

- [ ] **Step 3: Implementar `lib/tse/fetch.ts`**

```ts
import { CARGOS, urlDados } from './config';
import { normalizar } from './normalize';
import type { ResultadoCargo, Resultados } from './types';

export async function buscarResultados(init?: RequestInit): Promise<Resultados> {
  const cargos = await Promise.all(
    CARGOS.map(async (cfg): Promise<ResultadoCargo> => {
      try {
        const r = await fetch(urlDados(cfg), init);
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
export function mesclar(anterior: Resultados | null, novo: Resultados): Resultados {
  if (!anterior) return novo;
  return {
    ...novo,
    cargos: novo.cargos.map((c) => {
      if (!c.erro) return c;
      const velho = anterior.cargos.find((a) => a.chave === c.chave);
      return velho?.apuracao ? { ...velho, erro: c.erro } : c;
    }),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: `app/api/resultados/route.ts`**

```ts
import { buscarResultados } from '@/lib/tse/fetch';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'gru1';

export async function GET() {
  const dados = await buscarResultados({ cache: 'no-store' });
  const falhouTudo = dados.cargos.every((c) => c.erro);
  return Response.json(dados, {
    status: falhouTudo ? 502 : 200,
    headers: { 'Cache-Control': falhouTudo ? 'no-store' : 'public, s-maxage=20, stale-while-revalidate=40' },
  });
}
```

- [ ] **Step 6: Verificar contra a API real**

Run: `npm run dev` em background, depois
`curl -s localhost:3000/api/resultados | python3 -c "import json,sys; d=json.load(sys.stdin); print([(c['chave'], c['vagas'], len(c['candidatos']), c.get('erro')) for c in d['cargos']])"`

Expected: cinco cargos, vagas `1, 1, 2, 31, 55`, sem `erro`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add results fetcher and API route"
```

---

### Task 4: Marcações e hooks

**Files:**
- Create: `lib/marcados.ts`, `lib/useMarcados.ts`, `lib/useResultados.ts`, `lib/formato.ts`
- Test: `lib/marcados.test.ts`

**Interfaces:**
- Consumes: `buscarResultados`, `mesclar`, `Resultados`.
- Produces:
  - `type Marca = 'votei' | 'acompanhar'`; `type Marcados = Record<string, Marca>`; `CHAVE_MARCADOS`; `lerMarcados(raw: string | null): Marcados`
  - `useMarcados(): { marcados: Marcados; alternar: (id: string, marca: Marca) => void }`
  - `useResultados(): { dados: Resultados | null; erro: string | null }`
  - `fmtInt(n: number): string`; `fmtPct(n: number): string`

- [ ] **Step 1: Teste de `lerMarcados`**

```ts
import { describe, expect, it } from 'vitest';
import { lerMarcados } from './marcados';

describe('lerMarcados', () => {
  it('lê marcações válidas', () => {
    expect(lerMarcados('{"1":"votei","2":"acompanhar"}')).toEqual({ '1': 'votei', '2': 'acompanhar' });
  });
  it('descarta valores inválidos', () => {
    expect(lerMarcados('{"1":"votei","2":"outro","3":5}')).toEqual({ '1': 'votei' });
  });
  it('trata vazio, corrompido e tipos errados como vazio', () => {
    for (const raw of [null, '', '{', '[]', '"x"', 'null', '42']) expect(lerMarcados(raw)).toEqual({});
  });
});
```

Run: `npm test` — Expected: FAIL (módulo não existe).

- [ ] **Step 2: `lib/marcados.ts`**

```ts
export type Marca = 'votei' | 'acompanhar';
export type Marcados = Record<string, Marca>;

export const CHAVE_MARCADOS = 'eleicoes2026:marcados';

export function lerMarcados(raw: string | null): Marcados {
  try {
    const o: unknown = JSON.parse(raw ?? '');
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    return Object.fromEntries(
      Object.entries(o).filter(([, v]) => v === 'votei' || v === 'acompanhar'),
    ) as Marcados;
  } catch {
    return {};
  }
}
```

Run: `npm test` — Expected: PASS.

- [ ] **Step 3: `lib/useMarcados.ts`**

```ts
'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { CHAVE_MARCADOS, lerMarcados, type Marca } from './marcados';

const EVENTO = 'marcados-mudou';

function assinar(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENTO, cb);
  };
}

function ler(): string | null {
  try {
    return localStorage.getItem(CHAVE_MARCADOS);
  } catch {
    return null;
  }
}

export function useMarcados() {
  const raw = useSyncExternalStore(assinar, ler, () => null);
  const marcados = useMemo(() => lerMarcados(raw), [raw]);

  // Clicar na marca já ativa remove a marcação.
  const alternar = useCallback((id: string, marca: Marca) => {
    const atual = lerMarcados(ler());
    if (atual[id] === marca) delete atual[id];
    else atual[id] = marca;
    try {
      localStorage.setItem(CHAVE_MARCADOS, JSON.stringify(atual));
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return { marcados, alternar };
}
```

- [ ] **Step 4: `lib/useResultados.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { buscarResultados, mesclar } from './tse/fetch';
import type { Resultados } from './tse/types';

const INTERVALO_MS = 30_000;

async function buscar(): Promise<Resultados> {
  try {
    const r = await fetch('/api/resultados', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // A rota falhou (por exemplo, TSE bloqueando o servidor): busca direto do navegador.
    const d = await buscarResultados({ cache: 'no-store' });
    if (d.cargos.every((c) => c.erro)) throw new Error('Não foi possível consultar o TSE');
    return d;
  }
}

export function useResultados() {
  const [dados, setDados] = useState<Resultados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function ciclo() {
      try {
        const d = await buscar();
        if (!vivo) return;
        setDados((anterior) => mesclar(anterior, d));
        setErro(null);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      }
    }
    ciclo();
    const id = setInterval(ciclo, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  return { dados, erro };
}
```

- [ ] **Step 5: `lib/formato.ts`**

```ts
const inteiro = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => inteiro.format(n);
export const fmtPct = (n: number) => `${pct.format(n)}%`;
```

- [ ] **Step 6: Verificar e commitar**

Run: `npm test && npx tsc --noEmit` — Expected: PASS, sem erros.

```bash
git add -A && git commit -m "Add marks storage and polling hooks"
```

---

### Task 5: Interface

**Files:**
- Create: `components/Painel.tsx`, `components/ApuracaoGlobal.tsx`, `components/MeusCandidatos.tsx`, `components/PainelCargo.tsx`, `components/LinhaCandidato.tsx`
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `useResultados`, `useMarcados`, `Marca`, `Marcados`, `ResultadoCargo`, `Candidato`, `fmtInt`, `fmtPct`.

- [ ] **Step 1: `components/LinhaCandidato.tsx`**

```tsx
'use client';

import type { Marca } from '@/lib/marcados';
import type { Candidato } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';

export function BotoesMarca({ id, marca, onMarcar }: { id: string; marca?: Marca; onMarcar: (id: string, m: Marca) => void }) {
  const base = 'rounded px-1.5 py-0.5 text-xs border';
  return (
    <span className="flex gap-1">
      <button
        type="button"
        aria-pressed={marca === 'votei'}
        title="Votei neste candidato"
        onClick={() => onMarcar(id, 'votei')}
        className={`${base} ${marca === 'votei' ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-amber-400'}`}
      >
        votei
      </button>
      <button
        type="button"
        aria-pressed={marca === 'acompanhar'}
        title="Acompanhar este candidato"
        onClick={() => onMarcar(id, 'acompanhar')}
        className={`${base} ${marca === 'acompanhar' ? 'border-sky-400 bg-sky-400 text-black' : 'border-zinc-700 text-zinc-400 hover:border-sky-400'}`}
      >
        acompanhar
      </button>
    </span>
  );
}

export function Situacao({ c }: { c: Candidato }) {
  const texto = c.eleito ? c.situacao || 'Eleito' : c.situacao;
  if (!texto) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${c.eleito ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-200'}`}>
      {texto}
    </span>
  );
}

type Props = { c: Candidato; marca?: Marca; naVaga: boolean; onMarcar: (id: string, m: Marca) => void };

export function LinhaCandidato({ c, marca, naVaga, onMarcar }: Props) {
  const borda = marca === 'votei' ? 'border-amber-400 bg-amber-400/10' : marca === 'acompanhar' ? 'border-sky-400 bg-sky-400/10' : 'border-transparent';
  return (
    <li className={`rounded border-l-4 px-2 py-1.5 ${borda}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate">
          <span className="mr-1 tabular-nums text-zinc-500">{c.posicao}º</span>
          <span className={naVaga ? 'font-semibold text-emerald-300' : 'font-medium'}>{c.nome}</span>
          <span className="ml-1 text-xs text-zinc-400">
            {c.partido} · {c.numero}
          </span>
        </span>
        <span className="shrink-0 tabular-nums font-semibold">{fmtPct(c.percentual)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800">
        <div className={`h-full ${naVaga ? 'bg-emerald-400' : 'bg-zinc-500'}`} style={{ width: `${Math.min(c.percentual, 100)}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{fmtInt(c.votos)} votos</span>
          <Situacao c={c} />
        </span>
        <BotoesMarca id={c.id} marca={marca} onMarcar={onMarcar} />
      </div>
    </li>
  );
}
```

- [ ] **Step 2: `components/PainelCargo.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { Marca, Marcados } from '@/lib/marcados';
import type { Candidato, ResultadoCargo } from '@/lib/tse/types';
import { fmtPct } from '@/lib/formato';
import { LinhaCandidato } from './LinhaCandidato';

const TOPO = 10;

type Props = { cargo: ResultadoCargo; marcados: Marcados; alternar: (id: string, m: Marca) => void };

export function PainelCargo({ cargo, marcados, alternar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [busca, setBusca] = useState('');

  const naVaga = (c: Candidato) => c.eleito || (!cargo.proporcional && c.votos > 0 && c.posicao <= cargo.vagas);
  const linha = (c: Candidato) => <LinhaCandidato key={c.id} c={c} marca={marcados[c.id]} naVaga={naVaga(c)} onMarcar={alternar} />;

  let fixos: Candidato[] = [];
  let lista = cargo.candidatos;
  if (cargo.proporcional) {
    if (expandido) {
      const q = busca.trim().toLowerCase();
      if (q) lista = lista.filter((c) => c.nome.toLowerCase().includes(q) || c.numero.startsWith(q) || c.partido.toLowerCase() === q);
    } else {
      fixos = lista.filter((c) => marcados[c.id]);
      lista = lista.filter((c) => !marcados[c.id]).slice(0, TOPO);
    }
  }

  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <header className="mb-2">
        <h2 className="text-base font-semibold">{cargo.nome}</h2>
        <p className="text-xs text-zinc-400">
          {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
          {cargo.apuracao && <> · {fmtPct(cargo.apuracao.pctSecoes)} das seções</>}
        </p>
        {cargo.erro && <p className="mt-1 text-xs text-red-400">Falha ao atualizar ({cargo.erro})</p>}
      </header>

      {cargo.candidatos.length === 0 && <p className="text-sm text-zinc-500">Sem dados para este cargo.</p>}

      {fixos.length > 0 && (
        <>
          <ul className="space-y-1">{fixos.map(linha)}</ul>
          <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-zinc-500">Mais votados</p>
        </>
      )}

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
        <button type="button" onClick={() => setExpandido(!expandido)} className="mt-2 rounded border border-zinc-700 py-1 text-sm text-zinc-300 hover:bg-zinc-800">
          {expandido ? 'Mostrar só os mais votados' : `Ver todos os ${cargo.candidatos.length} candidatos`}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 3: `components/MeusCandidatos.tsx`**

```tsx
'use client';

import type { Marca, Marcados } from '@/lib/marcados';
import type { Candidato, ResultadoCargo } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';
import { BotoesMarca, Situacao } from './LinhaCandidato';

type Props = { cargos: ResultadoCargo[]; marcados: Marcados; alternar: (id: string, m: Marca) => void };

function Cartao({ c, cargo, marca, alternar }: { c: Candidato; cargo: ResultadoCargo; marca: Marca; alternar: Props['alternar'] }) {
  const acima = cargo.candidatos[c.posicao - 2];
  const abaixo = cargo.candidatos[c.posicao];
  return (
    <article className={`flex gap-3 rounded-lg border-2 bg-zinc-900 p-3 ${marca === 'votei' ? 'border-amber-400' : 'border-sky-400'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.fotoUrl}
        alt=""
        loading="lazy"
        className="h-20 w-16 shrink-0 rounded bg-zinc-800 object-cover"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs uppercase tracking-wide text-zinc-400">{cargo.nome}</p>
        <p className="truncate font-semibold">{c.nome}</p>
        <p className="truncate text-xs text-zinc-400">
          {c.partido} · {c.numero}
          {c.vice && <> · vice/suplentes: {c.vice}</>}
        </p>
        <p className="mt-1 tabular-nums">
          <span className="text-lg font-bold">{fmtInt(c.votos)}</span> votos · {fmtPct(c.percentual)}
        </p>
        <p className="text-xs text-zinc-300">
          {c.posicao}º de {cargo.candidatos.length} · {c.posicaoPartido}º no {c.partido} · {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
        </p>
        <p className="text-xs tabular-nums text-zinc-400">
          {acima && <>{fmtInt(acima.votos - c.votos)} atrás de {acima.nome}</>}
          {acima && abaixo && ' · '}
          {abaixo && <>{fmtInt(c.votos - abaixo.votos)} à frente de {abaixo.nome}</>}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Situacao c={c} />
          <BotoesMarca id={c.id} marca={marca} onMarcar={alternar} />
        </div>
      </div>
    </article>
  );
}

export function MeusCandidatos({ cargos, marcados, alternar }: Props) {
  const itens = cargos
    .flatMap((cargo) => cargo.candidatos.filter((c) => marcados[c.id]).map((c) => ({ c, cargo, marca: marcados[c.id] })))
    .sort((a, b) => Number(b.marca === 'votei') - Number(a.marca === 'votei'));

  return (
    <section aria-labelledby="meus">
      <h2 id="meus" className="mb-2 text-lg font-semibold">Meus candidatos</h2>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
          Use os botões “votei” e “acompanhar” nas listas abaixo para trazer candidatos para cá.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map(({ c, cargo, marca }) => (
            <Cartao key={c.id} c={c} cargo={cargo} marca={marca} alternar={alternar} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: `components/ApuracaoGlobal.tsx`**

```tsx
'use client';

import type { Apuracao, ResultadoCargo } from '@/lib/tse/types';
import { fmtInt, fmtPct } from '@/lib/formato';

function Bloco({ titulo, a }: { titulo: string; a: Apuracao | null | undefined }) {
  if (!a) return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-500">{titulo}: sem dados</div>;
  const itens: [string, string][] = [
    ['Comparecimento', `${fmtInt(a.comparecimento)} (${fmtPct(a.pctComparecimento)})`],
    ['Abstenção', `${fmtInt(a.abstencao)} (${fmtPct(a.pctAbstencao)})`],
    ['Brancos', `${fmtInt(a.brancos)} (${fmtPct(a.pctBrancos)})`],
    ['Nulos', `${fmtInt(a.nulos)} (${fmtPct(a.pctNulos)})`],
  ];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        <span className="text-2xl font-bold tabular-nums">{fmtPct(a.pctSecoes)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Seções totalizadas, ${titulo}`}
        aria-valuenow={a.pctSecoes}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 overflow-hidden rounded bg-zinc-800"
      >
        <div className="h-full bg-emerald-400" style={{ width: `${Math.min(a.pctSecoes, 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {fmtInt(a.secoesTotalizadas)} de {fmtInt(a.secoesTotal)} seções · {fmtInt(a.eleitorado)} eleitores
        {a.finalizada && ' · totalização finalizada'}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        {itens.map(([k, v]) => (
          <div key={k}>
            <dt className="text-zinc-500">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-zinc-500">TSE: {a.atualizadoEm}</p>
    </div>
  );
}

type Props = { cargos: ResultadoCargo[]; buscadoEm: string; erro: string | null };

export function ApuracaoGlobal({ cargos, buscadoEm, erro }: Props) {
  const br = cargos.find((c) => c.chave === 'presidente')?.apuracao;
  const rs = cargos.find((c) => c.chave === 'governador')?.apuracao;
  const naoIniciada = [br, rs].every((a) => !a || a.secoesTotalizadas === 0);
  const hora = new Date(buscadoEm).toLocaleTimeString('pt-BR');
  return (
    <section aria-label="Apuração global" className="space-y-2">
      {naoIniciada && (
        <p className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm">
          Apuração ainda não iniciada. Você já pode marcar seus candidatos; os números aparecem aqui sozinhos.
        </p>
      )}
      {erro && (
        <p role="alert" className="rounded-lg border border-red-500 bg-red-950 p-3 text-sm">
          Dados desatualizados: a última atualização falhou ({erro}). Exibindo o resultado das {hora}.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Bloco titulo="Brasil" a={br} />
        <Bloco titulo="Rio Grande do Sul" a={rs} />
      </div>
      <p className="text-xs text-zinc-500">Última busca: {hora} · atualiza a cada 30s</p>
    </section>
  );
}
```

- [ ] **Step 5: `components/Painel.tsx`**

```tsx
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
      <p role="alert" className="text-red-400">Não foi possível carregar os resultados ({erro}). Nova tentativa em 30s.</p>
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
```

- [ ] **Step 6: Página, layout e CSS**

`app/page.tsx` (substituir todo o conteúdo):

```tsx
import { Painel } from '@/components/Painel';

export default function Home() {
  return (
    <main className="mx-auto max-w-[1800px] p-3 sm:p-4">
      <h1 className="mb-4 text-xl font-bold">Apuração — Eleições 2026</h1>
      <Painel />
    </main>
  );
}
```

`app/layout.tsx`: trocar `lang="en"` por `lang="pt-BR"` e o `metadata` por
`{ title: 'Apuração — Eleições 2026', description: 'Painel pessoal de apuração: Presidente e cargos do RS.' }`.

`app/globals.css`: manter a linha `@import "tailwindcss";`, remover as regras de tema geradas e deixar:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

body {
  background: #09090b;
  color: #f4f4f5;
}
```

- [ ] **Step 7: Verificar**

Run: `npm test && npm run lint && npm run build` — Expected: tudo passa.

Com `npm run dev`, abrir `http://localhost:3000` e conferir:
1. Aparecem o bloco global (Brasil e RS), o aviso de apuração não iniciada (se ainda for antes das 17h) e os cinco cargos.
2. Marcar “votei” num deputado: ele sobe para o topo do cargo e aparece em “Meus candidatos”; recarregar a página mantém a marca.
3. Clicar de novo em “votei” remove a marca.
4. “Ver todos” abre a lista completa e a busca filtra por nome e por número.
5. Em largura de celular, os cargos empilham sem rolagem horizontal.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Add dashboard UI"
```

---

### Task 6: Deploy na Vercel

**Files:** nenhum arquivo novo (`.vercel/` é criado pela CLI e já está no `.gitignore` gerado).

- [ ] **Step 1: Login (ação do usuário)**

Pedir ao usuário para rodar `! npx vercel login` se `npx vercel whoami` falhar.

- [ ] **Step 2: Confirmar com o usuário e publicar**

Publicar torna o site acessível por URL pública; pedir confirmação antes.

```bash
npx vercel --prod --yes
```

- [ ] **Step 3: Verificar o deploy**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<url-do-deploy>/api/resultados
```

- `200`: a rota funciona a partir da Vercel.
- `502`: o TSE está recusando o servidor da Vercel. Abrir a página no navegador e confirmar que os dados aparecem mesmo assim (fallback direto). Informar o usuário de que o site está operando pelo fallback.

Abrir a URL no navegador e repetir as conferências 1 e 2 da Task 5, Step 7.

- [ ] **Step 4: Entregar a URL ao usuário**
