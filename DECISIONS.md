# Decisões (registo)

Decisões tomadas perante ambiguidade, sempre pela opção mais simples. Corrige o que não te servir.

## Fase 1

| # | Decisão | Porquê / alternativa |
|---|---------|----------------------|
| 1 | **Formato dos dados:** CSV para clubes, jogadores e atributos; JSON (`world.json`, opcional) para nome/semente/data de referência e ajustes às ligas e países. | CSV edita-se numa folha de cálculo; a configuração de ligas tem estrutura aninhada. |
| 2 | **Separador CSV:** detectado automaticamente (`,` ou `;`). Exportação com `,` por omissão, opção `;` para Excel em pt-PT. Listas dentro de uma célula (rivais, outras posições) separadas por `|`. Exportações levam BOM UTF-8. | Excel em pt-PT grava com `;`; o BOM garante os acentos. |
| 3 | **Emblemas em `public/crests/`** (e não `crests/` na raiz, como no plano). | Assim a Vite serve-os e ficam na cache offline da PWA sem configuração extra. |
| 4 | **Mundo fictício:** 1 120 clubes (contagens por liga em `world.config.ts`), 26 jogadores seniores por clube + 400 livres = 29 520 jogadores. Jovens só na fase 6. | Escala completa da secção 4. |
| 5 | **Valores de afinação por liga** (`quality`, `qualitySpread`, `tvRevenuePool`, `youthStrength`) são números de jogo, aproximados, não dados reais. Os nomes das ligas são genéricos. | Nunca inventar dados reais. |
| 6 | **Ligas com nº ímpar de clubes** (EUA 29, Coreia 2.ª 13) são permitidas; a fase 3 trata as folgas no calendário. | |
| 7 | **EUA sem subida/descida** por omissão (`promotionRelegation: false`), configurável em `world.config.ts` ou `world.json`. | Pedido na secção 4. |
| 8 | **Escala do OVR:** OVR ≈ média ponderada dos atributos relevantes da posição × 5 (atributo 20 → OVR 100). Os pesos estão em `attributes.config.ts`. O gerador acerta a média ponderada no OVR de entrada (erro ≤ 1). | Simples e transparente. A fórmula final, com a penalização por familiaridade, é da fase 2. |
| 9 | **30 atributos visíveis** (10 técnicos, 9 mentais, 6 físicos, 5 de GR) e **12 posições** (GR, DD, DC, DE, MDC, MD, MC, ME, MO, ED, EE, PL). Lista e nomes próprios. | |
| 10 | **Merge na reimportação de atributos:** a comparação é feita célula a célula contra o valor que o gerador produz. Um valor diferente fica como edição manual e tem sempre prioridade, mesmo que o gerador seja re-afinado. Um valor igual ao gerado, ou uma célula vazia, deixa de ter edição manual. A coluna `manual_cells` (só leitura) mostra o que está editado. | Melhor do que "célula preenchida = manual": a exportação traz todas as células preenchidas. |
| 11 | O CSV de atributos inclui os **ocultos e o potencial**, porque é uma ferramenta de edição para ti. A interface do jogo nunca os mostra (há um teste a garantir isso). | |
| 12 | **Semente por jogador** = hash(id do jogador, semente do mundo). Os mesmos ficheiros com a mesma semente dão os mesmos atributos, e alterar um jogador não mexe nos outros. | Determinismo estável. |
| 13 | **Gravações:** IndexedDB com metadados por ranhura e o mundo dividido em 18 blocos (arrays tipados guardados directamente). Cada gravação só escreve os blocos cujo hash mudou. A gravação corre no Worker. | Gravação incremental sem complicar. |
| 14 | **Interface sem framework** (TypeScript + DOM). Lista virtualizada própria. Tema escuro neutro; as cores do clube são as variáveis `--club-primary` e `--club-secondary` em `theme.css`. | Bundle pequeno (cerca de 15 KB de JS na UI). |
| 15 | Foi acrescentado um separador **"Dados"** (gerar mundo, importar, exportar/importar atributos, gravações). | Faltava um sítio para estas ferramentas. |
| 16 | `clubGenerator`/`playerGenerator` previstos no plano ficaram dentro de `worldGenerator.ts`. | Pouco código; separa-se quando crescer. |
| 17 | **Avisos do `npm audit`** (deepmerge/glob) vêm apenas da cadeia de build do `vite-plugin-pwa` (workbox-build) e não chegam à app. | Rever quando sair versão corrigida. |
