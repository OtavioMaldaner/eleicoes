# Mapas do Brasil e do exterior — design

Data: 2026-10-04. Terceira rodada do painel. Referência visual:
https://contagemdevotos.com.br/urnas/ (dois mapas coloridos por quem lidera).

## Objetivo

Uma página `/mapas` com dois mapas da eleição presidencial: Brasil por estado e
exterior por país, cada local pintado com a cor de quem lidera ali.

## Fonte de dados (verificada em 04/10/2026)

Base: `https://resultados.tse.jus.br/oficial/ele2026/6257`

- Por estado: `dados/<uf>/<uf>-c0001-e006257-u.json` (27 arquivos).
- Exterior: uma cidade por arquivo, `dados/zz/zz<cd>-c0001-e006257-u.json`
  (186 cidades listadas em `config/mun-e006257-cm.json`, `abr[cd=zz]`).
  O TSE não informa o país; a tabela cidade → país é fixa no projeto.
- Mesmo formato dos demais arquivos; o `normalizar` existente serve.
- Contornos: estados do IBGE (`public/geo/ufs.geojson`, chave `codarea`);
  países do Natural Earth 1:50m via world-atlas (`public/geo/paises-50m.json`,
  TopoJSON, chave `properties.name`).

## Comportamento

- **Brasil por estado.** Cor do líder. Neutro sem votos. Cinza de empate quando
  os dois primeiros têm o mesmo número de votos.
- **Exterior por país.** Votos das cidades somados por país. Países sem seção
  brasileira ficam neutros. Caiena e Saint-Georges contam para a França.
- **Cores.** Paleta categórica do gráfico de evolução, uma por candidato que
  lidera em algum lugar; o candidato mantém a cor enquanto liderar em algum
  lugar. A partir do nono líder, cinza "Outros". Legenda sempre visível.
- **Detalhe.** Ao tocar ou passar o mouse: nome do local, percentual de seções
  e candidatos com votos e percentual; no exterior, as cidades somadas.
- **Tabela.** Abaixo de cada mapa, todos os locais com líder, votos e seções;
  tocar numa linha seleciona o local.
- **Atualização.** Rota `/api/mapas`, cache de 60s; a tela consulta a cada 60s
  e, se a rota falhar, busca direto no TSE. Arquivos que falharem são contados
  e a tela avisa quantos locais ficaram sem dado.
- Link para `/mapas` no topo do painel e link de volta.

## Arquitetura

| Unidade | Responsabilidade |
|---|---|
| `lib/mapas/ufs.ts` | 27 UFs: sigla, nome, código IBGE. |
| `lib/mapas/cidades-exterior.json` | 186 cidades: código, nome, país (nome no Natural Earth), país em português. |
| `lib/mapas/agregar.ts` | Puro: `localDe`, `somar`, `liderDe`. |
| `lib/mapas/fetch.ts` | `buscarMapas(init?)`. |
| `app/api/mapas/route.ts` | Rota com cache de 60s. |
| `lib/useMapas.ts` | Polling de 60s com fallback. |
| `components/MapaCoropletico.tsx` | SVG com `d3-geo`. |
| `components/Mapas.tsx`, `app/mapas/page.tsx` | Página. |

## Testes

`liderDe` (zero, empate, líder), `somar`, `localDe`, cobertura da tabela de
cidades (186, sem repetição, todo país existe nos contornos), UFs (27, códigos
presentes nos contornos), `buscarMapas` com falha parcial.

## Fora do escopo

Município, zoom, outros cargos, histórico dos mapas.
