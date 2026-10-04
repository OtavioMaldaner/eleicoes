# Resultados por município e gráfico de evolução — design

Data: 2026-10-04. Segunda rodada do painel descrito em
`2026-10-04-painel-eleicoes-design.md`. Apuração começa por volta das 17h.

## Objetivo

1. Permitir trocar o painel inteiro entre a visão geral e um município do RS.
2. Mostrar um gráfico de linhas com a evolução dos votos ao longo da apuração.

## Resultados por município

Fonte (verificada em 04/10/2026 com Porto Alegre, código 88013): o TSE publica,
para cada município e cargo, um arquivo com o mesmo formato dos estaduais.

- Cargos estaduais: `<base>/6259/dados/rs/rs<cdmun>-c<cargo 4 dígitos>-e006259-u.json`
- Presidente: `<base>/6257/dados/rs/rs<cdmun>-c0001-e006257-u.json`
- Lista de municípios: `<base>/6259/config/mun-e006259-cm.json`, em
  `abr[cd=rs].mu[]`, com `cd` (código TSE de 5 dígitos) e `nm`.

Comportamento:

- **Lista fixa.** Os 497 municípios do RS (`cd`, `nm`) ficam em
  `lib/tse/municipios-rs.json`, gerado uma vez a partir do arquivo do TSE.
- **Seletor.** No topo: campo de busca por nome com a lista de municípios e um
  botão "Geral". A escolha fica em `localStorage`, chave
  `eleicoes2026:municipio` (código do município; ausente = geral).
- **Abrangência.** Com um município escolhido, os cinco cargos, "Meus
  candidatos" e a apuração mostram só aquele município. A apuração vira um
  bloco único com o nome do município.
- **Marcações.** São por candidato (`sqcand`) e valem nas duas visões.
- **Destaque de vaga.** Na visão municipal o destaque verde de "está na vaga"
  fica desligado para quem só lidera no município. O selo de situação que o TSE
  publica (eleito etc.) continua aparecendo.
- **Rota.** `/api/resultados?mun=<cd>`. Código fora da lista responde 400. Mesmo
  cache (10s) e mesmo fallback pelo navegador da visão geral.
- **Troca de abrangência.** Ao trocar, os dados da abrangência anterior saem da
  tela; nunca se misturam dados de abrangências diferentes.

## Gráfico de evolução

O TSE não publica histórico; o navegador monta a série.

Coleta:

- A cada atualização bem-sucedida, cria-se um ponto. Ele é guardado se o
  conteúdo for diferente do último ponto e se já passaram 60s desde o último.
- Histórico separado por abrangência: `geral` e um por município aberto.
  `localStorage`, chave `eleicoes2026:historico:<geral|cdmun>`.
- Cada ponto guarda o horário e, por cargo, o percentual de seções totalizadas
  e `[votos, percentual]` por candidato. Entram todos os candidatos dos cargos
  majoritários; nos proporcionais, os 40 mais votados e os marcados.
- Cargo com erro naquele ciclo fica fora do ponto.
- Limite de 400 pontos por abrangência. Ao passar, a metade mais antiga é
  rareada (um ponto sim, um não), mantendo o primeiro e os mais recentes.
- Se o `localStorage` recusar a gravação (cota), o histórico segue só em memória.

Tela — seção "Evolução", abaixo de "Meus candidatos":

- Gráfico de linhas, tempo no eixo horizontal, um eixo vertical só.
- Controles numa linha acima do gráfico: cargo e métrica (percentual ou votos).
- Linhas: os candidatos marcados do cargo e, em seguida, os mais votados, até
  completar 8. Nunca mais de 8 linhas.
- Cores: paleta categórica de 8 posições validada para fundo escuro
  (`#3987e5 #d95926 #199e70 #c98500 #d55181 #008300 #9085e9 #e66767`), atribuída
  em ordem fixa. A cor acompanha o candidato: quem continua no gráfico mantém a
  cor quando outro entra ou sai.
- Legenda sempre presente, com nome e partido; textos em cor de texto, não na
  cor da série.
- Ao passar o mouse ou tocar: linha vertical no ponto mais próximo e uma caixa
  com horário, percentual de seções e o valor de cada série.
- "Ver como tabela": os mesmos dados do último ponto em tabela.
- Com menos de dois pontos, mostra um aviso no lugar do gráfico.

Limitações aceitas: só há pontos enquanto a aba está aberta; cada aparelho tem
o seu histórico; um deputado marcado tarde e fora dos 40 primeiros só tem curva
a partir da marcação.

## Arquitetura

| Unidade | Mudança |
|---|---|
| `lib/tse/municipios-rs.json` | Novo. Lista fixa. |
| `lib/tse/config.ts` | `urlDados(cfg, municipio?)`, `MUNICIPIOS`, `municipioValido(cd)`. |
| `lib/tse/fetch.ts` | `buscarResultados(init?, municipio?)`. |
| `app/api/resultados/route.ts` | Lê e valida `mun`. |
| `lib/historico.ts` | Novo. Funções puras: `criarPonto`, `registrar`, `lerHistorico`, `idsDoGrafico`, `series`, `atribuirSlots`. |
| `lib/useValorLocal.ts` | Novo. Leitura e escrita de uma chave de `localStorage` com `useSyncExternalStore`. |
| `lib/useHistorico.ts` | Novo. Guarda pontos por abrangência. |
| `lib/useResultados.ts` | Recebe o município; estado atrelado à abrangência. |
| `components/SeletorMunicipio.tsx` | Novo. |
| `components/GraficoEvolucao.tsx` | Novo. SVG próprio, sem biblioteca de gráficos. |
| `components/Painel.tsx`, `ApuracaoGlobal.tsx`, `PainelCargo.tsx` | Passam a conhecer a abrangência. |

## Testes

Vitest nas funções puras: URL municipal, validação do código, `buscarResultados`
com município, criação e registro de pontos (repetido, intervalo, limite),
leitura de histórico corrompido, escolha das linhas, séries e atribuição de cores.
A parte visual é conferida pelo usuário no navegador.

## Fora do escopo

Coleta no servidor, ranking de municípios por candidato, mapa, 2º turno.
