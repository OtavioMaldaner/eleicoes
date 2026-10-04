# Painel de apuração das Eleições 2026 — design

Data: 2026-10-04 (dia do 1º turno; apuração começa por volta das 17h de Brasília)

## Objetivo

Um site de uso pessoal que mostra, numa única tela e ao vivo, a apuração de
Presidente, Governador do RS, Senador do RS, Deputado Federal do RS e Deputado
Estadual do RS, com os números globais de apuração, destaque para os candidatos
em que o usuário votou e uma visão detalhada dos candidatos que ele escolher
acompanhar.

Sucesso: o site está publicado na Vercel antes ou logo no início da apuração,
atualiza sozinho e permite marcar candidatos pela própria tela.

## Fonte de dados (verificada em 04/10/2026)

Base: `https://resultados.tse.jus.br/oficial/ele2026`

| Cargo | Eleição | Código do cargo | Arquivo | Vagas |
|---|---|---|---|---|
| Presidente | 6257 | 1 | `6257/dados/br/br-c0001-e006257-u.json` | 1 |
| Governador RS | 6259 | 3 | `6259/dados/rs/rs-c0003-e006259-u.json` | 1 |
| Senador RS | 6259 | 5 | `6259/dados/rs/rs-c0005-e006259-u.json` | 2 |
| Deputado Federal RS | 6259 | 6 | `6259/dados/rs/rs-c0006-e006259-u.json` | 31 |
| Deputado Estadual RS | 6259 | 7 | `6259/dados/rs/rs-c0007-e006259-u.json` | 55 |

- Fotos: `<base>/<eleicao>/fotos/<uf>/<sqcand>.jpeg` (`br` para presidente, `rs` para os demais).
- A API devolve `access-control-allow-origin` ecoando a origem, então o navegador pode consultá-la diretamente.
- Os arquivos têm `cache-control: max-age` de até 60s.
- Antes da apuração os arquivos existem com todos os valores zerados.
- Números vêm como string; percentuais usam vírgula decimal (`"12,34"`).

Campos usados de cada arquivo:

- Raiz: `dg`, `hg` (data e hora de geração), `dt`, `ht` (data e hora da totalização), `tf` (totalização final, `s`/`n`).
- `carg[0]`: `cd`, `nmn` (nome do cargo), `nv` (vagas).
- `carg[0].agr[].par[]`: `sg` (sigla do partido), `cand[]`.
- `cand`: `n` (número), `sqcand`, `nm`, `nmu` (nome de urna), `e` (eleito, `s`/`n`), `st` (situação em texto), `vap` (votos), `pvap` (percentual), `vs[]` (vices/suplentes, com `nmu`).
- `s`: `ts` (total de seções), `st` (seções totalizadas), `pst` (percentual).
- `e`: `te` (eleitorado), `c`/`pc` (comparecimento), `a`/`pa` (abstenção).
- `v`: `vv`/`pvv` (válidos), `vb`/`pvb` (brancos), `tvn`/`ptvn` (nulos).

## Arquitetura

Next.js (App Router), TypeScript, Tailwind. Uma página.

| Unidade | Responsabilidade |
|---|---|
| `lib/tse/config.ts` | Lista dos cinco cargos com eleição, código, UF e URL. Códigos do 2º turno (6258, 6260) ficam anotados em comentário. |
| `lib/tse/types.ts` | Tipos do formato normalizado. |
| `lib/tse/normalize.ts` | Função pura: JSON cru do TSE → `ResultadoCargo`. Sem I/O. |
| `lib/tse/fetch.ts` | `buscarResultados()`: busca os cinco arquivos em paralelo e normaliza. Usada pela rota e pelo fallback do cliente. |
| `app/api/resultados/route.ts` | Chama `buscarResultados()` com cache de 20s. Região `gru1`. |
| `lib/useResultados.ts` | Hook de polling a cada 30s na rota; se a rota falhar, chama `buscarResultados()` direto do navegador. Mantém o último resultado bom. |
| `lib/useMarcados.ts` | Marcações em `localStorage`. |
| `components/*` | `ApuracaoGlobal`, `MeusCandidatos`, `CartaoCandidato`, `PainelCargo`, `LinhaCandidato`. |

Formato normalizado:

```ts
type Candidato = {
  id: string;            // sqcand
  numero: string;
  nome: string;          // nome de urna
  vice?: string;         // nomes de urna de vs[], unidos por " / "
  partido: string;
  votos: number;
  percentual: number;
  eleito: boolean;
  situacao: string;      // texto de `st`, pode ser vazio
  posicao: number;       // posição geral no cargo, 1 = mais votado
  posicaoPartido: number;
  fotoUrl: string;
};

type Apuracao = {
  secoesTotal: number; secoesTotalizadas: number; pctSecoes: number;
  eleitorado: number; comparecimento: number; pctComparecimento: number;
  abstencao: number; pctAbstencao: number;
  validos: number; brancos: number; pctBrancos: number; nulos: number; pctNulos: number;
  atualizadoEm: string;  // dt + ht quando preenchidos; senão dg + hg
  finalizada: boolean;
};

type ResultadoCargo = {
  chave: 'presidente' | 'governador' | 'senador' | 'depFederal' | 'depEstadual';
  nome: string; vagas: number; proporcional: boolean;
  apuracao: Apuracao; candidatos: Candidato[];  // ordenados por votos, desc
};
```

A rota responde `{ cargos: ResultadoCargo[], buscadoEm: string }`. Se um dos
cinco arquivos falhar, o cargo correspondente vem com `erro` e os demais são
entregues normalmente.

Ordenação: votos decrescentes; empate desfeito pelo número do candidato, para a
lista ficar estável enquanto tudo está zerado.

## Tela

1. **Apuração global** (topo): seções totalizadas do Brasil (arquivo de
   presidente) e do RS (arquivo de governador), cada uma com barra de progresso;
   comparecimento, abstenção, brancos e nulos; horário da última atualização do
   TSE e da última busca.
2. **Meus candidatos**: um cartão por candidato marcado, com foto, cargo,
   votos, percentual, posição geral, posição no partido, situação e diferença de
   votos para o candidato imediatamente acima e abaixo. Os marcados como
   "votei" vêm primeiro.
3. **Grade dos cinco cargos**, lado a lado em telas largas e empilhada no celular:
   - Presidente e Governador: todos os candidatos, com barra de percentual.
   - Senador: todos, com os 2 primeiros destacados.
   - Deputados: marcados fixos no topo, depois os 10 mais votados; botão para
     expandir a lista completa, com busca por nome ou número.
4. **Marcação**: cada linha tem os botões "votei" e "acompanhar". "Votei" dá o
   destaque mais forte. Os dois levam o candidato para "Meus candidatos".

`localStorage`, chave `eleicoes2026:marcados`:
`{ [sqcand]: 'votei' | 'acompanhar' }`.

Estados:

- **Apuração não iniciada**: nenhuma seção totalizada. Mostra aviso e mantém as listas, para já permitir marcar candidatos.
- **Desatualizado**: a última busca falhou. Mantém o último resultado e mostra aviso com o horário do dado exibido.
- **Erro sem dados**: nenhuma busca funcionou ainda. Mensagem e nova tentativa no próximo ciclo.

## Testes

Vitest em `normalize.ts`, com fixtures em `lib/tse/__fixtures__/`:

- arquivos reais de 2026 (zerados) dos cargos de presidente e deputado federal;
- cópia do de presidente e do de deputado federal com votos preenchidos à mão.

Casos: conversão de número e de percentual com vírgula; ordenação e desempate;
`posicao` e `posicaoPartido`; `eleito`; vice; apuração zerada; escolha entre
`dt/ht` e `dg/hg`.

Verificação final manual: página local e página publicada contra a API real.

## Deploy

`git init` local e publicação pela CLI da Vercel, com confirmação do usuário
antes de publicar. Região da função: `gru1`.

## Fora do escopo desta entrega

2º turno e resumo por partido.

## Evolução planejada (próximas entregas)

O usuário quer evoluir depois para:

- **Gráfico de evolução dos votos.** Exige guardar uma série temporal. O
  formato normalizado já traz `atualizadoEm` por cargo, que serve de eixo do
  tempo. Onde guardar a série (navegador ou um armazenamento no servidor) fica
  para a spec dessa entrega.
- **Resultados por município.** O TSE publica a apuração por município em
  `<eleicao>/dados/rs/rs-e<eleicao>-ab.json` e a lista de municípios em
  `<eleicao>/config/mun-e<eleicao>-cm.json` (ambos verificados). O caminho dos
  arquivos de votos por município ainda precisa ser confirmado.

Para não atrapalhar essas entregas, `normalize.ts` não assume abrangência
estadual e `config.ts` concentra a montagem das URLs.
