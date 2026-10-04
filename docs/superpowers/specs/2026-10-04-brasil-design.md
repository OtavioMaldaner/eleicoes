# Página "Brasil" (fase 1) — design e plano

Data: 2026-10-04. Referência visual: https://seuimposto.com/ (tela única com
mapa central e painéis laterais). Fase 1: tudo que não depende de servidor.

## Comportamento

- Página `/brasil`, no menu entre Painel e Mapas. O painel atual continua sendo
  a página inicial.
- **Abas de cargo:** Presidente, Governadores, Senado. Um arquivo do TSE por
  estado (27) e, para presidente, o arquivo nacional.
- **Mapa por estado** com sigla em cada estado e etiquetas laterais para RN, PB,
  PE, AL, SE, ES, RJ e DF. Modos de cor:
  - *Líder*: cor de quem lidera.
  - *Vantagem*: a mesma cor, mais forte quanto maior a distância para o segundo.
  - *Candidato* (só presidente): intensidade pelo percentual de um candidato.
- **Cor por entidade:** candidato na aba Presidente; partido nas outras abas
  (os candidatos mudam de estado para estado). Paleta de 8 posições; a cor não
  é devolvida depois de atribuída; além de 8, cinza "Outros".
- **Painel esquerdo:** Brasil (presidente) ou o estado clicado. Candidatos com
  foto, votos, percentual e barra. Nas abas Governadores e Senado começa no RS.
  Antes da apuração, contagem regressiva até as 17h de Brasília.
- **Evolução:** o gráfico existente, para presidente no Brasil, com o mesmo
  histórico do painel.
- **Por região** (presidente): Norte, Nordeste, Centro-Oeste, Sudeste, Sul, com
  percentual de seções, líder e divisão dos votos. Nas outras abas, lista de
  quem lidera em cada estado.
- **Últimas atualizações:** geradas no navegador ao comparar duas atualizações
  seguidas: primeiros votos num estado, troca de líder, e o estado passar de
  50%, 90% e 100% das seções. Guardadas só na sessão, as 30 mais recentes.
- **Tela cheia.**
- Estado sem resposta mantém o último dado.

Fora da fase 1: busca, compartilhar, mapa por município, linha do tempo,
contagem de pessoas.

## Unidades

| Unidade | Responsabilidade |
|---|---|
| `lib/brasil/fetch.ts` | `buscarBrasil(cargo, init?)`, `mesclarBrasil`. |
| `lib/brasil/analise.ts` | Puro: `REGIOES`, `porRegiao`, `vantagem`, `eventos`, `entidadeDe`. |
| `app/api/brasil/route.ts` | `?cargo=`, cache de 15s. |
| `lib/useBrasil.ts` | Polling de 30s por cargo; acumula as atualizações. |
| `components/MapaBrasil.tsx` | Mapa com siglas e etiquetas. |
| `components/Brasil.tsx`, `app/brasil/page.tsx` | Página. |

## Plano

1. Testes e implementação de `analise.ts` e `fetch.ts` (TDD).
2. Rota e hook.
3. Mapa e página; item no menu.
4. Conferir por screenshot com votos simulados; só então juntar ao `main`.
