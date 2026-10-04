# Município e gráfico de evolução — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o painel entre visão geral e um município do RS, e mostrar um gráfico de evolução dos votos montado no navegador.

**Architecture:** A camada de dados ganha um parâmetro opcional de município que só muda a URL consultada. O histórico é uma lista de pontos por abrangência, mantida por funções puras e persistida em `localStorage`. O gráfico é um SVG próprio que lê essas séries.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Vitest. Sem biblioteca de gráficos.

**Spec:** `docs/superpowers/specs/2026-10-04-municipio-e-evolucao-design.md`

## Global Constraints

- Chaves de `localStorage`: `eleicoes2026:municipio`, `eleicoes2026:historico:<geral|cdmun>`.
- Histórico: intervalo mínimo 60s, máximo 400 pontos, 40 primeiros nos proporcionais.
- Gráfico: no máximo 8 linhas, um eixo vertical, paleta `#3987e5 #d95926 #199e70 #c98500 #d55181 #008300 #9085e9 #e66767` em ordem fixa.
- Arquivos em `lib/` importam por caminho relativo. Textos em pt-BR.
- Branch `evolucao`. Commits em inglês com as linhas de atribuição da sessão.
- A republicação na Vercel usa o mesmo projeto e a mesma URL (`eleicoes-zeta.vercel.app`, escopo `otaviomaldaners-projects`).

## Review Focus

1. Trocar de abrangência com uma requisição em voo: a resposta atrasada da abrangência anterior não pode aparecer na nova (estado atrelado à abrangência, Task 3; conferência manual).
2. `localStorage` cheio ou com histórico corrompido: a página continua funcionando e o histórico segue em memória (testes de `lerHistorico` na Task 2).
3. Código de município inválido na URL da rota: responde 400, sem consultar o TSE (teste de `municipioValido` na Task 1; curl na Task 5).
4. Candidato some de um ponto para o outro (saiu dos 40 primeiros): a linha dele tem lacuna, sem quebrar o gráfico (teste de `series` na Task 2).
5. Todos os valores zerados (antes da apuração): o eixo vertical não divide por zero (conferência manual na Task 4).

---

### Task 1: Camada de dados por município

**Files:**
- Create: `lib/tse/municipios-rs.json`
- Modify: `lib/tse/config.ts`, `lib/tse/fetch.ts`, `app/api/resultados/route.ts`, `lib/tse/types.ts`
- Test: `lib/tse/config.test.ts`, `lib/tse/fetch.test.ts`

**Interfaces:**
- Produces: `type Municipio = { cd: string; nm: string }`; `MUNICIPIOS: Municipio[]` (ordenado por nome); `municipioValido(cd: string | null | undefined): cd is string`; `urlDados(c: CargoConfig, municipio?: string): string`; `buscarResultados(init?: RequestInit, municipio?: string): Promise<Resultados>`; `GET /api/resultados?mun=<cd>` (400 se inválido).

- [ ] **Step 1: Gerar a lista**

```bash
S=/tmp/claude-1000/-home-otavio-maldaner-Documentos-eleicoes/41dbb51e-d478-4214-90b4-22e8a64857ae/scratchpad
python3 -c "
import json
d=json.load(open('$S/mun.json'))
rs=[a for a in d['abr'] if a['cd'].lower()=='rs'][0]
mu=sorted(({'cd':m['cd'],'nm':m['nm']} for m in rs['mu']), key=lambda m:m['nm'])
json.dump(mu, open('lib/tse/municipios-rs.json','w'), ensure_ascii=False, separators=(',',':'))
print(len(mu))"
```

Expected: `497`.

- [ ] **Step 2: Testes (falhando)**

`lib/tse/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CARGOS, MUNICIPIOS, municipioValido, urlDados } from './config';

describe('urlDados', () => {
  it('mantém as URLs gerais', () => {
    expect(urlDados(CARGOS[0])).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');
    expect(urlDados(CARGOS[1])).toBe('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs-c0003-e006259-u.json');
  });
  it('monta as URLs municipais, com presidente sob a pasta do RS', () => {
    expect(urlDados(CARGOS[0], '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rs/rs88013-c0001-e006257-u.json');
    expect(urlDados(CARGOS[3], '88013')).toBe('https://resultados.tse.jus.br/oficial/ele2026/6259/dados/rs/rs88013-c0006-e006259-u.json');
  });
});

describe('municípios', () => {
  it('traz os 497 municípios do RS em ordem de nome', () => {
    expect(MUNICIPIOS).toHaveLength(497);
    expect(MUNICIPIOS.find((m) => m.cd === '88013')?.nm).toBe('PORTO ALEGRE');
    const nomes = MUNICIPIOS.map((m) => m.nm);
    expect(nomes).toEqual([...nomes].sort());
  });
  it('valida só códigos da lista', () => {
    expect(municipioValido('88013')).toBe(true);
    for (const v of [null, undefined, '', '00000', '8801', '88013/../x', 'abc']) expect(municipioValido(v)).toBe(false);
  });
});
```

Em `lib/tse/fetch.test.ts`, dentro de `describe('buscarResultados')`:

```ts
  it('consulta os arquivos do município quando informado', async () => {
    stubFetch();
    await buscarResultados(undefined, '88013');
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(5);
    expect(urls.every((u) => u.includes('/dados/rs/rs88013-c'))).toBe(true);
  });
```

Run: `npm test` — Expected: FAIL (`MUNICIPIOS` e `municipioValido` não existem; URLs sem município).

- [ ] **Step 3: Implementar**

`lib/tse/types.ts`: adicionar `export type Municipio = { cd: string; nm: string };`.

`lib/tse/config.ts`:

```ts
import municipios from './municipios-rs.json';
import type { CargoConfig, Municipio } from './types';

export const MUNICIPIOS: Municipio[] = municipios;
const CODIGOS = new Set(MUNICIPIOS.map((m) => m.cd));

export function municipioValido(cd: string | null | undefined): cd is string {
  return typeof cd === 'string' && CODIGOS.has(cd);
}

// Os arquivos municipais ficam sempre sob a pasta do RS, inclusive os de presidente.
export function urlDados(c: CargoConfig, municipio?: string): string {
  const arq = `c${c.codigo.padStart(4, '0')}-e${c.eleicao.padStart(6, '0')}-u.json`;
  return municipio
    ? `${BASE}/${c.eleicao}/dados/rs/rs${municipio}-${arq}`
    : `${BASE}/${c.eleicao}/dados/${c.uf}/${c.uf}-${arq}`;
}
```

`lib/tse/fetch.ts`: assinatura `buscarResultados(init?: RequestInit, municipio?: string)` e `fetch(urlDados(cfg, municipio), ...)`.

`app/api/resultados/route.ts`:

```ts
export async function GET(request: Request) {
  const mun = new URL(request.url).searchParams.get('mun');
  if (mun !== null && !municipioValido(mun)) return Response.json({ erro: 'Município inválido' }, { status: 400 });
  const dados = await buscarResultados({ cache: 'no-store' }, mun ?? undefined);
  // resto igual
}
```

- [ ] **Step 4: Verificar e commitar**

Run: `npm test && npx tsc --noEmit` — Expected: PASS.

```bash
git add -A && git commit -m "Add per-municipality results to the data layer"
```

---

### Task 2: Funções do histórico

**Files:**
- Create: `lib/historico.ts`
- Test: `lib/historico.test.ts`

**Interfaces:**
- Consumes: `Resultados`, `ResultadoCargo`, `ChaveCargo`, `Marcados`.
- Produces:

```ts
export type PontoCargo = { p: number; c: Record<string, [number, number]> }; // % seções; id → [votos, %]
export type Ponto = { t: number; cargos: Partial<Record<ChaveCargo, PontoCargo>> };
export type Metrica = 'pct' | 'votos';
export type Serie = { id: string; pontos: { t: number; y: number }[] };
export const MAX_PONTOS = 400;
export const INTERVALO_MIN_MS = 60_000;
export const TOPO_PROPORCIONAL = 40;
export const MAX_LINHAS = 8;
export function criarPonto(r: Resultados, marcados: Marcados, agora: number): Ponto;
export function registrar(hist: Ponto[], ponto: Ponto): Ponto[]; // devolve o mesmo array se nada mudou
export function lerHistorico(raw: string | null): Ponto[];
export function idsDoGrafico(cargo: ResultadoCargo, marcados: Marcados): string[];
export function series(hist: Ponto[], chave: ChaveCargo, ids: string[], metrica: Metrica): Serie[];
export function atribuirSlots(anterior: Record<string, number>, ids: string[]): Record<string, number>; // devolve `anterior` se nada mudou
```

- [ ] **Step 1: Testes (falhando)**

```ts
import { describe, expect, it } from 'vitest';
import {
  atribuirSlots, criarPonto, idsDoGrafico, lerHistorico, registrar, series,
  INTERVALO_MIN_MS, MAX_PONTOS, type Ponto,
} from './historico';
import type { Candidato, ResultadoCargo, Resultados } from './tse/types';

const cand = (id: string, votos: number, posicao: number): Candidato => ({
  id, numero: id, nome: `C${id}`, partido: 'P', votos, percentual: votos / 10, eleito: false,
  situacao: '', posicao, posicaoPartido: posicao, fotoUrl: '',
});

function cargo(chave: ResultadoCargo['chave'], proporcional: boolean, n: number, pct = 10): ResultadoCargo {
  return {
    chave, nome: chave, vagas: 1, proporcional,
    apuracao: { pctSecoes: pct } as ResultadoCargo['apuracao'],
    candidatos: Array.from({ length: n }, (_, i) => cand(String(i + 1), 1000 - i, i + 1)),
  };
}

const resultados = (cargos: ResultadoCargo[]): Resultados => ({ cargos, buscadoEm: '' });
const ponto = (t: number, votos: number): Ponto => ({ t, cargos: { presidente: { p: 1, c: { a: [votos, 1] } } } });

describe('criarPonto', () => {
  it('guarda todos os candidatos de cargo majoritário', () => {
    const p = criarPonto(resultados([cargo('presidente', false, 12, 33.5)]), {}, 123);
    expect(p.t).toBe(123);
    expect(p.cargos.presidente?.p).toBe(33.5);
    expect(Object.keys(p.cargos.presidente!.c)).toHaveLength(12);
    expect(p.cargos.presidente!.c['1']).toEqual([1000, 100]);
  });
  it('nos proporcionais guarda os 40 primeiros e os marcados', () => {
    const p = criarPonto(resultados([cargo('depFederal', true, 100)]), { '90': 'votei' }, 1);
    const ids = Object.keys(p.cargos.depFederal!.c);
    expect(ids).toHaveLength(41);
    expect(ids).toContain('40');
    expect(ids).not.toContain('41');
    expect(ids).toContain('90');
  });
  it('deixa de fora o cargo com erro', () => {
    const ruim: ResultadoCargo = { ...cargo('senador', false, 3), apuracao: null, candidatos: [], erro: 'HTTP 500' };
    expect(criarPonto(resultados([ruim]), {}, 1).cargos.senador).toBeUndefined();
  });
});

describe('registrar', () => {
  it('guarda o primeiro ponto', () => {
    expect(registrar([], ponto(0, 1))).toHaveLength(1);
  });
  it('ignora ponto com o mesmo conteúdo do último', () => {
    const h = [ponto(0, 1)];
    expect(registrar(h, ponto(10 * INTERVALO_MIN_MS, 1))).toBe(h);
  });
  it('ignora ponto novo antes do intervalo mínimo', () => {
    const h = [ponto(0, 1)];
    expect(registrar(h, ponto(INTERVALO_MIN_MS - 1, 2))).toBe(h);
  });
  it('guarda ponto novo depois do intervalo', () => {
    expect(registrar([ponto(0, 1)], ponto(INTERVALO_MIN_MS, 2))).toHaveLength(2);
  });
  it('respeita o limite, mantendo o primeiro e o último', () => {
    let h: Ponto[] = [];
    for (let i = 0; i <= MAX_PONTOS + 50; i++) h = registrar(h, ponto(i * INTERVALO_MIN_MS, i));
    expect(h.length).toBeLessThanOrEqual(MAX_PONTOS);
    expect(h[0].t).toBe(0);
    expect(h.at(-1)!.t).toBe((MAX_PONTOS + 50) * INTERVALO_MIN_MS);
    expect(h.map((p) => p.t)).toEqual([...h.map((p) => p.t)].sort((a, b) => a - b));
  });
});

describe('lerHistorico', () => {
  it('lê pontos válidos', () => {
    const h = [ponto(1, 1), ponto(2, 2)];
    expect(lerHistorico(JSON.stringify(h))).toEqual(h);
  });
  it('trata vazio, corrompido e formato errado como vazio', () => {
    for (const raw of [null, '', '{', '{}', '"x"', '[1,2]', '[{"t":"a"}]', '[{"t":1}]']) expect(lerHistorico(raw)).toEqual([]);
  });
});

describe('idsDoGrafico', () => {
  it('põe os marcados primeiro e completa com os mais votados até 8', () => {
    expect(idsDoGrafico(cargo('depFederal', true, 100), { '50': 'votei', '3': 'acompanhar' })).toEqual(['3', '50', '1', '2', '4', '5', '6', '7']);
  });
  it('nunca passa de 8, mesmo com mais marcados', () => {
    const m = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), 'votei' as const]));
    expect(idsDoGrafico(cargo('depFederal', true, 100), m)).toHaveLength(8);
  });
  it('com menos de 8 candidatos, devolve todos', () => {
    expect(idsDoGrafico(cargo('governador', false, 7), {})).toHaveLength(7);
  });
});

describe('series', () => {
  const h: Ponto[] = [
    { t: 1, cargos: { presidente: { p: 1, c: { a: [10, 1.5], b: [5, 0.5] } } } },
    { t: 2, cargos: { presidente: { p: 2, c: { a: [20, 2.5] } } } },
    { t: 3, cargos: {} },
  ];
  it('extrai votos ou percentual', () => {
    expect(series(h, 'presidente', ['a'], 'votos')).toEqual([{ id: 'a', pontos: [{ t: 1, y: 10 }, { t: 2, y: 20 }] }]);
    expect(series(h, 'presidente', ['a'], 'pct')[0].pontos.map((p) => p.y)).toEqual([1.5, 2.5]);
  });
  it('pula os pontos em que o candidato ou o cargo não aparece', () => {
    expect(series(h, 'presidente', ['b'], 'votos')[0].pontos).toEqual([{ t: 1, y: 5 }]);
    expect(series(h, 'presidente', ['z'], 'votos')[0].pontos).toEqual([]);
  });
});

describe('atribuirSlots', () => {
  it('distribui em ordem fixa', () => {
    expect(atribuirSlots({}, ['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 2 });
  });
  it('quem fica mantém a cor; quem entra pega a primeira livre', () => {
    expect(atribuirSlots({ a: 0, b: 1, c: 2 }, ['c', 'd', 'a'])).toEqual({ a: 0, c: 2, d: 1 });
  });
  it('devolve o mesmo objeto se nada mudou', () => {
    const s = { a: 0, b: 1 };
    expect(atribuirSlots(s, ['b', 'a'])).toBe(s);
  });
});
```

Run: `npm test` — Expected: FAIL (módulo `./historico` não existe).

- [ ] **Step 2: Implementar `lib/historico.ts`** conforme as assinaturas acima:
  - `criarPonto`: por cargo com `apuracao`, `p = apuracao.pctSecoes`; candidatos = todos se majoritário, senão `posicao <= 40` ou marcado; valor `[votos, percentual]`.
  - `registrar`: vazio → `[ponto]`; `JSON.stringify(cargos)` igual ao do último → mesmo array; `ponto.t - ultimo.t < INTERVALO_MIN_MS` → mesmo array; senão acrescenta e, se passar de `MAX_PONTOS`, mantém o índice 0, os índices ímpares da metade mais antiga e toda a metade mais recente.
  - `lerHistorico`: `JSON.parse` em `try`; aceita só array cujos itens têm `t` numérico e `cargos` objeto; qualquer item inválido → `[]`.
  - `idsDoGrafico`: marcados na ordem de `posicao`, depois os demais na ordem de `posicao`, cortado em `MAX_LINHAS`.
  - `series`: para cada id, os pontos em que `cargos[chave]?.c[id]` existe.
  - `atribuirSlots`: mantém os slots de quem continua; novos recebem o menor slot livre na ordem de `ids`; se o resultado for igual ao anterior, devolve `anterior`.

- [ ] **Step 3: Verificar e commitar**

Run: `npm test && npx tsc --noEmit` — Expected: PASS.

```bash
git add -A && git commit -m "Add vote history functions"
```

---

### Task 3: Seletor de município na tela

**Files:**
- Create: `lib/useValorLocal.ts`, `components/SeletorMunicipio.tsx`
- Modify: `lib/useResultados.ts`, `components/Painel.tsx`, `components/ApuracaoGlobal.tsx`, `components/PainelCargo.tsx`

**Interfaces:**
- Consumes: `MUNICIPIOS`, `municipioValido`, `buscarResultados(init, municipio)`.
- Produces: `useValorLocal(chave: string): [string | null, (v: string | null) => void]`; `useResultados(municipio: string | null)`; `<SeletorMunicipio valor={string | null} onMudar={(cd: string | null) => void} />`; `ApuracaoGlobal` ganha `municipio?: Municipio`; `PainelCargo` ganha `destacarVaga: boolean`.

- [ ] **Step 1: `lib/useValorLocal.ts`** — mesmo padrão de `useMarcados` (`useSyncExternalStore`, evento `storage` mais um evento próprio por chave, `try/catch` em leitura e escrita, snapshot de servidor `null`). `null` remove a chave.

- [ ] **Step 2: `lib/useResultados.ts`** — recebe `municipio`. O estado guarda `{ escopo, dados }`; o hook devolve `dados` só quando `estado.escopo` é o escopo atual, e a atualização funcional só chama `mesclar` com o anterior do mesmo escopo. A URL da rota vira `/api/resultados?mun=<cd>` quando há município, e o fallback chama `buscarResultados({ cache: 'no-store' }, municipio ?? undefined)`. O efeito depende de `municipio`.

- [ ] **Step 3: `components/SeletorMunicipio.tsx`** — `<label>` "Abrangência", `<input list>` com `<datalist>` dos 497 nomes, e botão "Geral". Ao digitar ou escolher um nome que bate com um município (comparação sem acento e sem diferenciar maiúsculas), chama `onMudar(cd)`. Mostra a abrangência atual em texto ("Geral: Brasil e RS" ou o nome do município).

- [ ] **Step 4: Ligar em `Painel`, `ApuracaoGlobal`, `PainelCargo`**
  - `Painel`: `useValorLocal('eleicoes2026:municipio')`, valor aceito só se `municipioValido`; passa para `useResultados`; renderiza o seletor acima de tudo, inclusive durante o carregamento.
  - `ApuracaoGlobal`: com `municipio`, um único `Bloco` com o nome do município, usando a apuração de governador (ou a de presidente se aquela faltar).
  - `PainelCargo`: `naVaga` vira `c.eleito || (destacarVaga && !cargo.proporcional && c.votos > 0 && c.posicao <= cargo.vagas)`.

- [ ] **Step 5: Verificar e commitar**

Run: `npm test && npm run lint && npm run build` — Expected: tudo passa.

Com `npm run start -- -p 3210`:
`curl -s 'localhost:3210/api/resultados?mun=88013'` → cinco cargos sem erro, eleitorado de Porto Alegre (1.062.047) na apuração de governador.
`curl -s -o /dev/null -w '%{http_code}' 'localhost:3210/api/resultados?mun=00000'` → `400`.

```bash
git add -A && git commit -m "Add municipality scope selector"
```

---

### Task 4: Gráfico de evolução

**Files:**
- Create: `lib/useHistorico.ts`, `components/GraficoEvolucao.tsx`
- Modify: `components/Painel.tsx`

**Interfaces:**
- Consumes: tudo de `lib/historico.ts`; `Resultados`, `Marcados`.
- Produces: `useHistorico(escopo: string, dados: Resultados | null, marcados: Marcados): Ponto[]`; `<GraficoEvolucao cargos={ResultadoCargo[]} historico={Ponto[]} marcados={Marcados} />`.

- [ ] **Step 1: `lib/useHistorico.ts`** — armazém em módulo, por escopo: carrega de `localStorage` na primeira leitura (`lerHistorico`), mantém em memória, notifica assinantes. O hook lê com `useSyncExternalStore` e, num efeito disparado por `dados`, chama `registrar(hist, criarPonto(dados, marcados, Date.now()))`; se o array mudou, grava em `localStorage` dentro de `try/catch` (falha de cota mantém só em memória).

- [ ] **Step 2: `components/GraficoEvolucao.tsx`**
  - Controles numa linha: `<select>` de cargo e dois botões de métrica (`aria-pressed`): "% dos válidos" e "Votos".
  - Largura medida com `ResizeObserver`; altura fixa de 280px; margens para os rótulos dos eixos.
  - Eixo X: tempo, de `min(t)` a `max(t)`, 4 rótulos `HH:MM`. Eixo Y: de 0 a `max(y) * 1,1`, com mínimo de 1 para não dividir por zero; 4 linhas de grade discretas; rótulos com `fmtInt` ou `fmtPct`.
  - Linhas de 2px, `stroke-linejoin: round`, um marcador de 4px de raio no último ponto de cada série, com anel de 2px na cor da superfície.
  - Cores por `atribuirSlots`, guardado em estado e atualizado durante a renderização quando o resultado muda; o corpo do gráfico recebe `key={chave}` para recomeçar a atribuição ao trocar de cargo.
  - Legenda abaixo: amostra de cor, nome, partido e valor atual, em cor de texto.
  - Interação: `pointermove`/`pointerleave` numa área transparente sobre o gráfico; linha vertical no ponto de tempo mais próximo e caixa com horário, `% de seções` e o valor de cada série, ordenados do maior para o menor.
  - `<details>` "Ver como tabela": uma linha por série com nome, partido, votos e percentual do último ponto.
  - Menos de 2 pontos: texto "O gráfico aparece depois de duas atualizações com dados novos."

- [ ] **Step 3: `Painel`** — `useHistorico(municipio ?? 'geral', dados, marcados)` e a seção "Evolução" entre "Meus candidatos" e a grade de cargos.

- [ ] **Step 4: Verificar e commitar**

Run: `npm test && npm run lint && npm run build` — Expected: tudo passa.

```bash
git add -A && git commit -m "Add vote evolution chart"
```

---

### Task 5: Republicar

- [ ] **Step 1:** `npx vercel --prod --yes --scope otaviomaldaners-projects`
- [ ] **Step 2:** conferir em `https://eleicoes-zeta.vercel.app`:
  - `/api/resultados` → 200, cinco cargos;
  - `/api/resultados?mun=88013` → 200, cinco cargos;
  - `/api/resultados?mun=00000` → 400.
- [ ] **Step 3:** pedir ao usuário para conferir no navegador: trocar de município e voltar para "Geral"; marcações preservadas; gráfico aparecendo depois de dois pontos; troca de cargo e de métrica; caixa ao passar o mouse.
