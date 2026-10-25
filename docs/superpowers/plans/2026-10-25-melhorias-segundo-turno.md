# Melhorias do 2º turno — Plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa por tarefa. Os passos usam caixas `- [ ]`.

**Objetivo:** trazer para `/segundo-turno` seis ideias vistas no painel de apuração de seuimposto.com: placar de disputa no topo, projeção com margem de erro, ranking "o que mudou desde o 1º turno", modos Vantagem e Abstenção no mapa, selos de % por estado com maiores vantagens, e linha do tempo "Ao vivo".

**Arquitetura:** lógica nova em funções puras em `lib/` (testadas com vitest, no estilo dos `lib/*.test.ts`) e componentes finos em `components/`, ligados em `components/SegundoTurno.tsx`. Nenhuma rota, API ou dependência nova; tudo reaproveita `Local`, `variacao`, `projetar` e o histórico em `localStorage`.

**Stack:** Next 16.3.8 (App Router, componentes de cliente), React 19, Tailwind 4, d3-geo, vitest.

**Spec:** não há documento separado. O pedido do usuário foi a lista de seis itens do objetivo (sem o chat e sem os extras de contador de pessoas, tema claro/escuro e compartilhar). As decisões do "como" estão em cada tarefa e marcadas como **[decisão minha]**.

## Restrições globais

- **Antes de escrever código**, leia em `node_modules/next/dist/docs/` o que for relevante a componentes de cliente (AGENTS.md: este Next tem mudanças que quebram o que se conhece). Nenhuma tarefa mexe em rotas, então a leitura é curta, mas é obrigatória.
- Textos da interface em português do Brasil, no tom do resto do app. Nomes de candidatos via `nomeBonito` (`lib/nome.ts`) quando exibidos por extenso; primeiro nome via `nome.split(' ')[0]`, como `CartaoProjecao` já faz.
- Estilo visual: tema escuro existente (`bg-zinc-900`, `border-zinc-800`, cartão = `rounded-2xl border border-zinc-800 bg-zinc-900 p-4`, rótulo = `text-xs uppercase tracking-widest text-zinc-400`). Cores de candidato sempre por `corPartido` (`lib/cores.ts`).
- Percentuais com `fmtPct`, inteiros com `fmtInt` (`lib/formato.ts`).
- Funções puras ganham teste em `lib/<nome>.test.ts`. Componentes não têm teste no repo; a verificação deles é visual (última tarefa de cada bloco) mais `npm run lint`.
- Layout: precisa funcionar em 390 px de largura (celular) e em 1440 px. A grade do `SegundoTurno` é `xl:grid-cols-[320px_minmax(0,1fr)_380px]`.
- Commits: um por tarefa, mensagem em inglês no imperativo (padrão do `git log`), terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. **Só commite depois que o usuário confirmar que quer commits por tarefa.**
- Cada tarefa termina com `npm test` e `npm run lint` verdes.

## Foco da revisão

Entradas que o pedido não menciona e que mais provavelmente quebram, com o comportamento esperado. O teste de cada uma está na tarefa dona do código.

1. **Apuração zerada** (início da noite): nenhuma divisão por zero nem `NaN`; placar diz "Apuração ainda não começou", projeção fica oculta, mapas voltam ao tom do 1º turno. (Tarefas 1, 2, 4)
2. **Empate exato em votos:** manchete "Empate em votos", vantagem 0, sem líder. (Tarefa 1)
3. **Estado sem dado em um dos turnos:** fica fora do ranking de mudança e do raio de vantagem, sem erro. (Tarefas 3, 4)
4. **Histórico vazio, com um só ponto ou corrompido no `localStorage`:** a linha do tempo fica desativada com explicação; "Ao vivo" continua funcionando. (Tarefa 6)
5. **`pctAbstencao` ausente** (dado em cache sem o campo novo): modo Abstenção pinta cinza "sem dados", sem `NaN`. (Tarefa 4)

---

## Tarefa 1: Placar de disputa no topo

**Arquivos:**
- Criar: `lib/placar.ts`, `lib/placar.test.ts`, `lib/formato.test.ts`, `components/PlacarDisputa.tsx`, `components/FotoCandidato.tsx`
- Modificar: `lib/formato.ts`, `components/SegundoTurno.tsx` (mover `FotoEleito` para `FotoCandidato.tsx`; inserir o placar logo acima da grade `xl:grid-cols-[320px_...]`, dentro do bloco `presidente2.dados &&`)

**Interfaces:**
- Produz, em `lib/formato.ts`: `fmtVotosCurto(n: number): string`.
- Produz, em `lib/placar.ts`:
  ```ts
  export type Placar = {
    a: VotoCand; b: VotoCand;          // ordem fixa recebida em `finalistas`
    votosA: number; votosB: number;
    pctA: number; pctB: number;        // % sobre `l.total`; 0 e 0 sem votos
    vantagem: number;                  // |votosA - votosB|
    lider: VotoCand | null;            // null em empate ou sem votos
    semVotos: boolean;                 // l.total === 0
    pctApurado: number;                // l.pctSecoes
    pctFaltam: number;                 // 100 - pctApurado, nunca negativo
  };
  export function placar(l: Local | null | undefined, finalistas: VotoCand[]): Placar | null; // null se l ausente ou finalistas.length < 2
  export function manchete(p: Placar, eleito: VotoCand | null): string;
  ```
- `components/FotoCandidato.tsx` exporta `FotoCandidato({ id, cor })`, o mesmo componente que hoje é `FotoEleito` em `SegundoTurno.tsx`.
- Consome: `Local`, `VotoCand` de `lib/mapas/agregar`.

- [ ] **Passo 1: testes que falham.**
  `lib/formato.test.ts` (`fmtVotosCurto`): `8779` → `"8.779"`; `84123` → `"84 mil"`; `999999` → `"1 milhão"` (arredonda para milhar primeiro e, se der 1.000 mil, passa para milhão, nunca "1.000 mil"); `1200000` → `"1,2 milhão"`; `3400000` → `"3,4 milhões"`.
  `lib/placar.test.ts` (use o helper `montar` como em `lib/projecao.test.ts`):
  - `placar(montar('br','Brasil',100,50,[cand('a',1011437),cand('b',927752)]), [a,b])`: `vantagem === 83685`, `lider.id === 'a'`, `pctA ≈ 52.16`, `pctB ≈ 47.84`, `pctFaltam === 50`.
  - Mantém a ordem recebida: com `finalistas = [b, a]`, `p.a.id === 'b'` e `pctA ≈ 47.84`.
  - Empate: `a` e `b` com 500 → `lider === null`, `vantagem === 0`, `semVotos === false`.
  - Sem votos: `l.total === 0` → `semVotos === true`, `pctA === 0`, `pctB === 0`, sem `NaN`.
  - `placar(null, [a,b]) === null` e `placar(l, [a]) === null`.
  - `manchete`: líder → `"Lula lidera por 84 mil votos"` (primeiro nome do líder, `fmtVotosCurto(vantagem)`); empate → `"Empate em votos"`; sem votos → `"Apuração ainda não começou"`; com `eleito` → `"Lula eleito presidente"`.
- [ ] **Passo 2:** `npx vitest run lib/formato.test.ts lib/placar.test.ts` → FAIL (módulos não existem).
- [ ] **Passo 3: implementar** `fmtVotosCurto` em `lib/formato.ts` e `placar`/`manchete` em `lib/placar.ts` com as assinaturas acima. Os corpos seguem os testes.
- [ ] **Passo 4:** os mesmos testes → PASS.
- [ ] **Passo 5: componente.** `PlacarDisputa({ placar, eleito, cor }: { placar: Placar | null; eleito: VotoCand | null; cor: (v: VotoCand) => string })`:
  - Faixa de largura total: foto + nome + número do candidato A à esquerda, B à direita (`FotoCandidato`), no centro a `manchete` em destaque.
  - Barra única de ponta a ponta: segmento A com `width: pctA%` na cor de A, restante na cor de B, marcador vertical em 50%. Sem votos, barra cinza `bg-zinc-800` sem marcador.
  - Sob a barra: `pctA`/`pctB` com `fmtPct`, votos de cada lado com `fmtInt`, e `"{fmtPct(pctApurado)} apurado · faltam {fmtPct(pctFaltam)} das seções"`.
  - Em tela estreita, fotos menores e nomes só pelo primeiro nome; nada de rolagem horizontal.
  - **[decisão minha]** O site mostra "faltam 156 milhões" (eleitorado menos votos contados, que inclui abstenção e engana). Aqui mostra-se só o % de seções a apurar, que é um dado real.
  - **[decisão minha]** Ordem fixa dos finalistas por `Number(numero)` crescente, para a barra não trocar de lado quando a liderança muda.
- [ ] **Passo 6: ligar em `SegundoTurno.tsx`.** Calcule `finalistasFixos = [...candidatos2].sort((x, y) => Number(x.numero) - Number(y.numero))`, `placarNac = placar(nac2, finalistasFixos)`, e renderize `<PlacarDisputa placar={placarNac} eleito={eleitoPresidente} cor={cor} />` acima da grade. Troque o uso de `FotoEleito` pelo import de `FotoCandidato`.
- [ ] **Passo 7: verificar.** `npm test && npm run lint`. Depois `npm run dev`, abra `/segundo-turno` em 1440 px e em 390 px e confira: barra, manchete, ordem estável, sem rolagem horizontal.
- [ ] **Passo 8: commit** (se autorizado): `git add lib components && git commit -m "Add head-to-head scoreboard to the runoff page"`

---

## Tarefa 2: Projeção com margem de erro e "empate técnico"

**Arquivos:**
- Modificar: `lib/projecao.ts`, `lib/projecao.test.ts`, `components/CartaoProjecao.tsx`

**Interfaces:**
- Produz, em `lib/projecao.ts`: `export const MARGEM_BASE = 8;` e dois campos novos em `Projecao`: `margem: number` (pontos percentuais, aplicada à diferença entre os candidatos) e `empateTecnico: boolean`.
- `projetar(estados2, estados1, idA, idB)` mantém a assinatura.

**[decisão minha] Como a margem é calculada.** Não é um intervalo estatístico formal (a ordem da apuração enviesa o parcial, como o próprio texto do cartão avisa). É uma estimativa honesta e monotônica: para cada estado incluído, `m = MARGEM_BASE * sqrt(1 - feito/100)` quando projetado pela apuração (`feito` = % de seções apuradas do estado), ou `m = MARGEM_BASE` quando usa o 1º turno como base. A margem total é a média das `m` ponderada pelos votos projetados do estado (`a + b`). `empateTecnico = |pctA - pctB| <= margem`. O cartão rotula como "margem de erro estimada".

- [ ] **Passo 1: testes que falham** em `lib/projecao.test.ts`:
  - Um estado a 50% apurado, `a 60 / b 40` → `margem ≈ MARGEM_BASE * Math.sqrt(0.5)` (≈ 5,657) e `empateTecnico === false` (diferença 20).
  - Um estado a 50%, `a 51 / b 49` → diferença ≈ 2 ≤ margem → `empateTecnico === true`.
  - Estado a 100% (`secoes 100, feitas 100`) → `margem ≈ 0`.
  - Estado sem contagem suficiente (usa 1º turno) → `margem === MARGEM_BASE`.
  - Mistura: estado X a 50% com projeção `a 120 / b 80` (peso 200) e estado Y pelo 1º turno com peso 100 → margem = `(200 * 5.657 + 100 * 8) / 300`.
  - Monotonia: com os mesmos votos, mais seções apuradas nunca aumenta a margem.
- [ ] **Passo 2:** `npx vitest run lib/projecao.test.ts` → FAIL nos novos.
- [ ] **Passo 3: implementar** acumulando `peso * m` e `peso` dentro do laço de `projetar`, e preenchendo `margem` e `empateTecnico` no retorno.
- [ ] **Passo 4:** testes → PASS (os antigos continuam passando).
- [ ] **Passo 5: cartão.** Em `CartaoProjecao`: quando `projecao.empateTecnico`, mostre um selo `Empate técnico` (mesmo estilo do selo âmbar "estimativa") e troque a frase "Projeção: X à frente por N pontos" por "Diferença dentro da margem de erro". Sempre abaixo da barra: `"Margem de erro estimada: ±{margem com 1 casa decimal} pontos na diferença"` (formate com `Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })`). Acrescente ao texto de rodapé uma frase explicando que a margem diminui conforme a apuração avança e não é um intervalo estatístico formal.
- [ ] **Passo 6: verificar.** `npm test && npm run lint`; no navegador, com `pctSecoes >= SECOES_MINIMAS_PAIS`, o cartão mostra margem e, na disputa apertada, o selo.
- [ ] **Passo 7: commit** (se autorizado): `git commit -m "Show margin of error and technical tie in the projection"`

---

## Tarefa 3: Ranking "O que mudou desde o 1º turno"

**Arquivos:**
- Criar: `lib/mudanca.ts`, `lib/mudanca.test.ts`, `components/MudancaPorEstado.tsx`
- Modificar: `components/SegundoTurno.tsx`

**Interfaces:**
- Consome: `variacao(l2, l1, finalistas): Variacao | null` de `lib/variacao.ts` (`deltas` por id, `ganhou` id ou null).
- Produz:
  ```ts
  export type MudancaUF = { uf: string; nome: string; delta: number }; // delta em pontos percentuais
  export function mudancaPorEstado(estados2: Local[], estados1: Local[], finalistas: VotoCand[]): Record<string, MudancaUF[]>;
  ```
  A chave do `Record` é o id do finalista. Cada estado entra na lista de quem **mais cresceu** nele (`ganhou`), com `delta = deltas[ganhou]`, só se `delta > 0`. Listas em ordem decrescente de `delta`, desempate por `nome`.

- [ ] **Passo 1: testes que falham** em `lib/mudanca.test.ts` (estados montados com `montar`): (a) dois estados, um onde A sobe mais e outro onde B sobe mais → cada um aparece só na lista de quem subiu; (b) ordenação decrescente e desempate por nome; (c) estado sem votos no 2º turno ou ausente do 1º turno fica de fora; (d) estado onde `ganhou === null` (empate nos deltas) fica de fora; (e) sem estados → `{}` sem erro.
- [ ] **Passo 2:** `npx vitest run lib/mudanca.test.ts` → FAIL.
- [ ] **Passo 3: implementar** `mudancaPorEstado` chamando `variacao` por estado (casando `estados1` por `chave`).
- [ ] **Passo 4:** → PASS.
- [ ] **Passo 5: componente.** `MudancaPorEstado({ mudanca, finalistas, cor, onUf })`: cartão "O que mudou desde o 1º turno" com subtítulo "Nas urnas já apuradas, em pontos". Para cada finalista (ordem fixa por número), um bloco "Onde {primeiro nome} cresceu" com as 8 primeiras linhas: sigla (`uf.toUpperCase()`), barra horizontal na cor do candidato com largura proporcional ao `delta` (máximo entre todas as linhas = 100%), valor `+{delta com 1 casa}`. Cada linha é um `<button>` que chama `onUf(uf)`. Bloco vazio mostra "Nenhum estado ainda". Antes de qualquer voto, o cartão inteiro mostra "Aparece quando os primeiros estados apurarem".
- [ ] **Passo 6: ligar.** Em `SegundoTurno.tsx`, só quando `!uf`: `const mudanca = mudancaPorEstado(presidente2.dados?.estados ?? [], presidente1.dados?.estados ?? [], finalistasFixos)` e o cartão na coluna central-esquerda, logo depois do `CartaoProjecao`. **Antes**, leia `components/AnaliseRegioes.tsx` (já mostra placar por região) para não duplicar a informação; os dois cartões convivem, este é por estado e mostra variação.
- [ ] **Passo 7: verificar.** `npm test && npm run lint`; no navegador, clicar numa linha abre o estado.
- [ ] **Passo 8: commit** (se autorizado): `git commit -m "Add ranking of states by change since the first round"`

---

## Tarefa 4: Modos Vantagem e Abstenção no mapa

**Arquivos:**
- Criar: `lib/vantagem.ts`, `lib/vantagem.test.ts`, `lib/abstencao.ts`, `lib/abstencao.test.ts`
- Modificar: `lib/mapas/agregar.ts` (+ `lib/mapas/agregar.test.ts`), `components/MapaBrasil.tsx`, `components/SegundoTurno.tsx`

**Interfaces:**
- Em `lib/mapas/agregar.ts`, `Local` ganha `pctAbstencao?: number`. `localDe` o preenche com `r.apuracao?.pctAbstencao`. `somar` **não** o preenche (soma de locais não tem esse percentual). Confirme no fixture `lib/tse/__fixtures__/br-c0001-e006257-u.json` que o campo `pa` do TSE (já lido em `lib/tse/normalize.ts`) é o % de abstenção das seções já apuradas; se não for, ajuste o rótulo e a dica do mapa.
- Produz, em `lib/vantagem.ts`:
  ```ts
  export type Vantagem = { chave: string; nome: string; lider: VotoCand; votos: number }; // votos = 1º menos 2º
  export function vantagens(locais: Local[]): Vantagem[]; // só locais com `lider`; ordem decrescente de votos, desempate por nome
  export function raioVantagem(votos: number, maximo: number, raioMax: number): number; // raioMax * sqrt(votos / maximo); 0 se maximo <= 0
  export function contarLideres(locais: Local[]): Record<string, number>; // id do líder → nº de locais
  ```
- Produz, em `lib/abstencao.ts`: `export const ABSTENCAO = '#a78bfa'`, `export const FAIXA_ABSTENCAO = [10, 40] as const`, `export function pinturaAbstencao(l: Local | undefined): Pintura` (`Pintura` de `lib/degrade.ts`; usa `intensidade`; sem `l` ou sem `pctAbstencao` finito → `{ fill: SEM_VOTOS, opacidade: 1 }`).
- `MapaBrasil` ganha a prop opcional `marcas?: (uf: string) => { raio: number; cor: string } | null`.

- [ ] **Passo 1: testes que falham.**
  `lib/vantagem.test.ts`: `vantagens` ignora locais sem líder (empate/sem votos), calcula `votos` como 1º menos 2º, ordena e desempata; `raioVantagem(100, 100, 30) === 30`, `raioVantagem(25, 100, 30) === 15`, `raioVantagem(5, 0, 30) === 0`; `contarLideres` conta por id e devolve `{}` para lista vazia.
  `lib/abstencao.test.ts`: `pctAbstencao` 10 → opacidade mínima (`0.12`), 40 → `1`; `undefined`, `NaN` e `l` indefinido → `SEM_VOTOS`.
  `lib/mapas/agregar.test.ts`: `localDe` com `apuracao.pctAbstencao = 23.4` devolve `pctAbstencao === 23.4`; `somar([...])` devolve `pctAbstencao === undefined`.
- [ ] **Passo 2:** `npx vitest run lib/vantagem.test.ts lib/abstencao.test.ts lib/mapas/agregar.test.ts` → FAIL.
- [ ] **Passo 3: implementar** os dois módulos novos e a mudança em `agregar.ts`.
- [ ] **Passo 4:** testes → PASS.
- [ ] **Passo 5: `MapaBrasil`.** Desenhe, depois das formas e antes dos textos de sigla, um `<circle>` por estado em que `marcas(uf)` devolver valor: centro `(cx, cy)` da forma, raio e cor da marca, `fillOpacity` 0.85, contorno `SUPERFICIE`, `pointerEvents="none"`. Sem a prop, nada muda.
- [ ] **Passo 6: modos em `SegundoTurno.tsx`.** Hoje `foco` é `null` (quem lidera), id de candidato ou `VARIACAO`. Acrescente as constantes `VANTAGEM = '__vantagem'` e `ABSTENCAO = '__abstencao'` e duas pílulas ("Vantagem" e "Abstenção") **só quando `!uf`** (no mapa de municípios elas não existem). Em `escolher`, se `foco` for um dos dois modos novos, volte para `null` ao abrir um estado.
  - **Vantagem:** `pintura` neutra (`{ fill: SEM_VOTOS, opacidade: 1 }`) e `marcas = uf => ({ raio: raioVantagem(votos, maximo, 28), cor: cor(lider) })` a partir de `vantagens(presidente2.dados.estados)`; estado sem líder devolve `null`.
  - **Abstenção:** `pintura = uf => pinturaAbstencao(por2.get(uf))`.
  - **Legenda:** no modo Vantagem, círculo de referência com `"{fmtVotosCurto(maximo)} votos de vantagem"`; no modo Abstenção, gradiente em `ABSTENCAO` de `10%` a `40%`. Atualize também o texto de "Como ler o mapa" para os dois modos.
  - **[decisão minha]** O modo "Estados" do site equivale ao mapa nacional que já existe aqui, então não foi criado. Abstenção cobre só as seções já apuradas (o TSE informa assim); a dica do estado deve dizer isso.
- [ ] **Passo 7: verificar.** `npm test && npm run lint`; no navegador, alternar entre os cinco modos no mapa do Brasil; abrir um estado e conferir que as pílulas novas somem e o mapa de municípios segue normal; abrir `/segundo-turno` sem votos e conferir que nada quebra.
- [ ] **Passo 8: commit** (se autorizado): `git commit -m "Add advantage bubbles and abstention modes to the runoff map"`

---

## Tarefa 5: Selos de % no mapa, contagem de estados e maiores vantagens

**Arquivos:**
- Criar: `components/MaioresVantagens.tsx`
- Modificar: `components/MapaBrasil.tsx`, `components/SegundoTurno.tsx`

**Interfaces:**
- Consome: `vantagens`, `contarLideres` (Tarefa 4), `fmtVotosCurto` (Tarefa 1).
- `MapaBrasil` ganha a prop opcional `selo?: (uf: string) => string | null`.

- [ ] **Passo 1: `MapaBrasil`.** Com `selo` informado e devolvendo texto para o estado: nas etiquetas laterais (estados de `PEQUENOS`) o texto passa a ser `"{SIGLA} {selo}"` (alargue o `rect` de `48` para `76` e ajuste `MARGEM_ETIQUETAS` de forma que nada seja cortado); nos estados grandes, uma segunda linha `{selo}` logo abaixo da sigla (`y = cy + 12`, `fontSize={10}`, mesmo traço de contorno do texto da sigla). Sem a prop, o desenho atual não muda.
- [ ] **Passo 2: `MaioresVantagens`.** `MaioresVantagens({ itens, onUf }: { itens: Vantagem[]; onUf: (uf: string) => void })`: cartão "Maiores vantagens por estado", as 8 primeiras linhas: sigla, barra na cor do líder com largura proporcional à vantagem (máximo = 100%), `+{fmtVotosCurto(votos)}`. Cada linha é um `<button>` que chama `onUf(chave)`. Lista vazia mostra "Aparece quando os primeiros estados apurarem".
- [ ] **Passo 3: ligar em `SegundoTurno.tsx`, só com `!uf`.**
  - `selo = uf => { const l = por2.get(uf); return apurado(l) && l.lider ? \`${Math.round(pct(l.votos[0], l))}%\` : null }`, passado ao `MapaBrasil`. Fora do modo Abstenção; no modo Abstenção o selo é `"{Math.round(pctAbstencao)}%"` do próprio estado, para casar com o que a cor mostra.
  - Na legenda do mapa, ao lado de cada candidato: `"{primeiro nome} · {N} estados"` a partir de `contarLideres([...por2.values()])` (singular "estado" quando `N === 1`).
  - `<MaioresVantagens itens={vantagens([...por2.values()])} onUf={escolher} />` na coluna esquerda, depois do cartão de mudança (Tarefa 3).
- [ ] **Passo 4: verificar.** `npm test && npm run lint`; no navegador, em 390 px e 1440 px: etiquetas laterais não cortadas, selos legíveis sobre as cores, clique na linha de vantagem abre o estado.
- [ ] **Passo 5: commit** (se autorizado): `git commit -m "Add state percentage badges and biggest-margin ranking"`

---

## Tarefa 6: Linha do tempo "Ao vivo" (replay do mapa)

**Escopo honesto [decisão minha]:** o histórico já é gravado em `localStorage` por estado (`2t:uf:<uf>`, a cada atualização com votos). Então o replay cobre **só o período em que a página esteve aberta naquele navegador**, e isso precisa estar escrito na tela. Guardar histórico no servidor para todos os visitantes está fora deste plano. O replay mexe **só no mapa do Brasil** (placar, projeção e cartões continuam ao vivo), e o modo Abstenção não tem replay (o `Ponto` não guarda abstenção), então o controle fica desativado nele.

**Arquivos:**
- Criar: `lib/replay.ts`, `lib/replay.test.ts`, `components/LinhaDoTempo.tsx`
- Modificar: `lib/useHistorico.ts`, `components/SegundoTurno.tsx`

**Interfaces:**
- Consome: `Ponto` de `lib/historico.ts` (`{ t, cargos: { presidente?: { p, c: Record<id, [votos, pct]> } } }`), `montar` e `Local` de `lib/mapas/agregar.ts`.
- Produz, em `lib/replay.ts`:
  ```ts
  export function instantes(historicos: Ponto[][]): number[];                 // timestamps únicos e ordenados de todos os pontos
  export function pontoEm(hist: Ponto[], t: number): Ponto | null;            // último ponto com ponto.t <= t
  export function localEm(base: Local | undefined, hist: Ponto[], t: number): Local | undefined; // undefined se não há ponto em t ou falta base
  ```
  `localEm` reconstrói o `Local` com `montar(base.chave, base.nome, base.secoes, Math.round((p / 100) * base.secoes), votos)`, onde `votos` são os candidatos de `base.votos` (mantém `nome`, `partido`, `numero`) com `votos` vindos de `ponto.cargos.presidente.c[id]?.[0] ?? 0`.
- Produz, em `lib/useHistorico.ts`: `export function useHistoricos(escopos: string[]): Map<string, Ponto[]>`. **[decisão minha]** Um contador de módulo `versao` incrementado dentro de `adicionar` quando o histórico muda; o hook usa `useSyncExternalStore(assinar, () => versao, () => 0)` e `useMemo` sobre `[versao, escopos.join()]` para montar o `Map` com `obter(escopo)`. Isso evita chamar `useHistoricoLido` num laço de 27 estados.

- [ ] **Passo 1: testes que falham** em `lib/replay.test.ts`: (a) `instantes` junta, remove duplicatas e ordena; lista vazia → `[]`; (b) `pontoEm` devolve o último ponto `<= t`, `null` antes do primeiro e o último ponto para `t` no futuro; (c) `localEm` com ponto `{ p: 50, c: { a: [600, 60], b: [400, 40] } }` e `base.secoes = 100` → `secoesTotalizadas === 50`, `votos` de `a` 600 e de `b` 400, `lider.id === 'a'`; (d) `localEm` sem ponto até `t` → `undefined`; (e) `localEm` com `base` indefinido → `undefined`; (f) candidato ausente em `c` conta 0 votos.
- [ ] **Passo 2:** `npx vitest run lib/replay.test.ts` → FAIL.
- [ ] **Passo 3: implementar** `lib/replay.ts` e `useHistoricos` em `lib/useHistorico.ts`.
- [ ] **Passo 4:** → PASS; `npm test` completo continua verde.
- [ ] **Passo 5: componente.** `LinhaDoTempo({ instantes, valor, onMudar, desativado }: { instantes: number[]; valor: number | null; onMudar: (t: number | null) => void; desativado?: string })`:
  - `<input type="range">` indexado em `instantes` (índice, não tempo, para espaçamento irregular), `aria-label="Voltar no tempo"`, valor do thumb = índice de `valor` (ou o último quando `null`).
  - Rótulos `HH:MM` (`toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })`) no início, no fim e o instante atual acima do thumb.
  - Botão "Ao vivo" (`aria-pressed={valor === null}`) que chama `onMudar(null)`; arrastar o slider chama `onMudar(instantes[i])`, e levá-lo ao último índice volta a `null`.
  - Com `instantes.length < 2` ou `desativado` informado: slider desabilitado e texto "O histórico é gravado neste navegador enquanto a página fica aberta; ainda não há o suficiente para voltar no tempo." (ou o texto de `desativado`).
- [ ] **Passo 6: ligar em `SegundoTurno.tsx`, só com `!uf`.**
  - `const hists = useHistoricos([...por2.keys()].map(k => \`2t:uf:${k}\`))`; `const momentos = instantes([...hists.values()])`; `const [instante, setInstante] = useState<number | null>(null)`.
  - Quando `instante !== null`, o `pintura` do mapa usa `localEm(por2.get(k), hists.get(\`2t:uf:${k}\`) ?? [], instante)` no lugar de `por2.get(k)` (também para `marcas` do modo Vantagem e para a variação).
  - Faixa acima do mapa durante o replay: `"Mapa de {HH:MM} · histórico gravado neste navegador"` com botão "Voltar ao vivo".
  - `desativado="Abstenção não tem histórico."` quando o modo for Abstenção; volte `instante` para `null` ao abrir um estado (`escolher`).
  - Renderize `<LinhaDoTempo>` abaixo do mapa, acima da legenda.
- [ ] **Passo 7: verificar de ponta a ponta.** `npm test && npm run lint && npm run build`. Depois `npm run dev`: deixe `/segundo-turno` aberto por alguns ciclos de 30 s para gravar pontos, arraste o slider e veja o mapa mudar; "Ao vivo" volta ao atual; recarregue a página e confira que o histórico persiste; apague a chave `eleicoes2026:historico:2t:uf:sp` no `localStorage` com o console e confira que nada quebra; repita em 390 px.
- [ ] **Passo 8: commit** (se autorizado): `git commit -m "Add time slider to replay the runoff map"`

---

## Autorrevisão

- **Cobertura:** placar (T1), projeção com margem e empate técnico (T2), ranking de mudança (T3), modos Vantagem e Abstenção (T4), selos de %, contagem de estados e maiores vantagens (T5), linha do tempo (T6). Chat e extras do item 7 ficam de fora, como pedido.
- **Consistência de tipos:** `finalistasFixos` (T1) é reaproveitado em T3; `vantagens`/`contarLideres`/`fmtVotosCurto` definidos em T4/T1 e consumidos em T5; `Pintura` vem de `lib/degrade.ts` em T4; `MapaBrasil` recebe `marcas` (T4) e `selo` (T5) como props opcionais independentes.
- **Fora do escopo (não-objetivos):** mapa de municípios do país inteiro, histórico no servidor, gráfico de convergência da projeção, replay de placar/projeção, abstenção por município.
