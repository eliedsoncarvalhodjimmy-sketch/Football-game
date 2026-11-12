# Diferenças: folhas de cálculo do utilizador vs. mundo simulado na Fase 1

Fontes (agora fonte de verdade): `data/fontes/FutCEO_Ligas_central.xlsx` (folhas Ligas, Competências, Prémios, Vagas) e `data/fontes/FutCEO_Vagas_europeias.xlsx` (Europa, Fora_UEFA, Resumo). Lidas a 12/11/2026.

Legenda: **a obter** = campo vazio ou sem fonte na folha; **gerado** = valor que uso para o jogo correr, marcado como gerado nos pacotes, até tu decidires.

## 1. Total de clubes

| | Simulado (Fase 1) | Folhas |
|---|---:|---:|
| Clubes | 924 | **872** (848 com nº preenchido + AFR1 com 24 **gerado**) |
| Ligas | 51 | 48 |

## 2. Ligas e clubes por liga

Na folha, "sobem" conta só as subidas directas; o play-off é à parte. Os ids passam a ser os teus (ENG1, POR2, ...).

| Liga | Clubes | Movimentos | Formato | Diferença face ao simulado |
|---|---|---|---|---|
| ENG1–ENG4 | 20/24/24/24 | igual | 2 voltas | sem mudanças |
| GER1–GER3 | 18/18/20 | igual | 2 voltas | sem mudanças |
| ESP1–ESP2 | 20/22 | igual | 2 voltas | sem mudanças |
| ITA1 | 20 | ↓3 | 2 voltas | igual |
| ITA2 | 20 | ↑2 + PO 3.º–8.º; **↓3** (eram 4); play-out "confirmar" | 2 voltas | descidas 4 → 3 |
| FRA1 | 18 | ↓2 + 16.º vs vencedor do PO da FRA2 | | igual |
| FRA2 | 18 | ↑2 + PO; **↓3** (eram 2 + barragem) | | sem barragem com a FRA3 |
| FRA3 | **20** (eram 18) | ↑2; **↓ a obter** | | ver pendências (subidas ≠ descidas) |
| POR1 | 18 | ↓2 + barragem 16.º vs 3.º POR2 | | igual |
| POR2 | 18 | ↑2; ↓2 **para o exterior** | | a **Liga 3 sai do jogo**; já não há barragem POR2/POR3 |
| NED1 | 18 | **↓1 + barragem 17.º vs 3.º NED2** (era ↓2 + barragem 16.º) | | |
| NED2 | 20 | **↑1 + barragem** (era ↑2 + PO 3.º–6.º); ↓0 | | |
| BEL1 | **16** (eram 18) | **↓1 + barragem 15.º vs 3.º BEL2** | "+ fase final por grupos (confirmar)" | volta aos 16 |
| BEL2 | **8** (eram 16) | **↑1 + barragem**; **↓0** | "várias voltas (confirmar)" | |
| SCO1 | 12 | ↓1 + barragem **11.º vs 3.º SCO2** (era vs PO 2.º–4.º) | **3 voltas** + split (confirmar) | |
| SCO2 | 10 | ↑1 + barragem; ↓1 | **4 voltas (36 jogos)** | |
| TUR1 | **20** (eram 18) | ↓3 | | |
| TUR2 | 20 | ↑3; **↓4** (eram 3) | | sem play-off |
| AUT1, GRE1, DEN1, SUI1, POL1, CZE1, NOR1 | iguais | iguais | splits/fases finais "confirmar"; SUI1 **33 jogos** (3 voltas) | NOR1 marcada **ano civil** |
| CRO1 | 10 | ↓1 | **4 voltas (36 jogos)** | |
| **SWE1, HUN1, UKR1** | — | — | — | **saem como ligas próprias**; os seus clubes passam para a EUR1 |
| **EUR1** (nova) | 20 | liga fechada | 2 voltas | "Liga Resto da Europa": UKR, HUN, CYP, ISR, SWE, ROU, AZE; **clubes e quotas a obter** |
| BRA1–BRA2 | 20/20 | iguais | | marcadas **ano civil** |
| ARG1 | 30 | **↓ a obter**; play-offs "não" | formato a confirmar | tinhas decidido play-off de campeão de 8 |
| COL1 | 20 | ↓2 **por média de pontos das últimas 3 épocas** | 2 torneios (confirmar) | |
| URU1 | 16 | **↓3** (eram 2) | | |
| ECU1 | 16 | ↓2 | | |
| KSA1–KSA2 | 18/18 | iguais (PO pela 3.ª vaga: **posições a obter**) | | |
| JPN1–JPN2 | 20/20 | **JPN2 ↑3 directas** (era ↑2 + PO) | | |
| KOR1 | **12** (eram 14) | **↓0 (fechada)** | **3 voltas** + split (confirmar) | marcada **ano civil** |
| UAE1 | 14 | ↓2 | | |
| USA1 (MLS) | 30 | sem descidas; play-offs pelo título | conferências + play-offs | tecto salarial **200 000 000** |
| MEX1 | 18 | sem descidas; **liguilla pelo título** | Apertura+Clausura (confirmar) | antes não tinha play-off |
| AFR1 | **a obter** | a obter | a definir | uso 24 clubes e as quotas antigas (**gerado**) |

**Calendário:** a folha marca NOR1, BRA1/2, ARG1, COL1, URU1, ECU1, KOR1 e USA1 como "ano civil". Tinhas decidido que todas jogam Agosto–Maio (decisão U7). Mantenho Agosto–Maio até me dizeres o contrário.

**Novos campos por liga:** TV (total, % igual/desempenho/comercial, regra), tecto salarial, mínimo de nacionais, máximo do plantel, fonte. Ficam nos pacotes, ainda sem uso (finanças e plantéis vêm nos prompts 3 e 4).

**Índice de riqueza:** quase todos os valores mudaram e são muito mais baixos fora das 5 grandes (ex.: POR1 28 → 13, UAE1 24 → 3, NED1 27 → 12). Passa a ser só económico (ver secção 6).

## 3. Taças

| | Simulado | Folhas |
|---|---|---|
| Nº de taças | 1 por país (32) | **31**, incluindo **4 segundas taças**: EFL Cup (ENG), Taça da Liga (POR), Scottish League Cup (SCO), J.League Cup (JPN) |
| Sem taça | liga africana | **EUR1, USA1, MEX1, AFR1** (deixam de ter a Taça MLS e a Copa MX que eu tinha criado) |
| Formato | jogo único em todas | **Copa do Brasil e Copa Colombia a duas mãos em todas as rondas, final a duas mãos e não neutra**; Copa del Rey, Coppa Italia e EFL Cup com **meias a duas mãos** |
| Entrada | os 2 níveis de baixo na 1.ª ronda | FA Cup: ENG3/ENG4 na 1.ª ronda, **ENG1/ENG2 na 3.ª**; nas outras, "a 1.ª divisão entra mais tarde" sem ronda indicada (**gerado**: 1.ª divisão na 2.ª ronda) |
| Vaga do vencedor | UEL | UEL, excepto **CZE e CRO → UECL**; sem vaga na América do Sul, Ásia e segundas taças |

Os prémios das taças estão na folha Prémios ("proposta Claude 11/2026"). Ficam guardados, sem uso nesta fase.

## 4. Vagas continentais

| | Simulado | Folhas |
|---|---|---|
| UCL | 36 directas pela liga | 28 directas + **2 campeões em título (UCL e UEL)** + **2 bónus do ranking UEFA** + **4 vencedores do play-off de acesso** (8 clubes) |
| UEL | 36 directas (liga + taça) | 21 directas + **campeão em título da UECL** + **10 vencedores do play-off de acesso UEL** (20 clubes) + **4 perdedores do play-off UCL** |
| UECL | 32 directas | 22 directas + **10 perdedores do play-off UEL** |
| UECL, formato | 8 jogos | **6 jogos por equipa** |
| Libertadores | BRA 5, ARG 4, COL 3, URU 2, ECU 2 | **BRA 6**, ARG 4, **COL 2**, URU 2, ECU 2 ("rascunho: a definir") |
| Ásia | 4 por país | **KSA 5**, JPN 4, KOR 4, **UAE 3** ("rascunho") |

As contas fecham: UCL 36, UEL 36, UECL 32, Libertadores 16, Ásia 16.

Mudanças por país na Europa (fase de liga directa / play-off de acesso):

| País | UCL | PO UCL | UEL | PO UEL | UECL | Total | Antes |
|---|---:|---:|---:|---:|---:|---:|---:|
| ENG, GER, ESP, ITA | 4 | 0 | 2 | 0 | 1 | 7 | 7 |
| FRA | 3 | 1 (4.º) | 1 (taça) | 1 (5.º) | 1 | 7 | 7 |
| POR | 2 | 1 (3.º) | 1 (taça) | 1 (4.º) | 1 | 6 | 5 |
| NED | 1 | 0 | 2 | 1 | 1 | 5 | 6 |
| BEL, SCO | 1 | 0 | 1 | 2 | 1 | 5 | 5 / 4 |
| TUR | 1 | 0 | 1 | 1 | 2 | 5 | 5 |
| AUT, NOR | 1 | 0 | 1 | 1 | 1 | 4 | 4 / 5 |
| SUI | 1 | 0 | 1 | 2 | 1 | 5 | 4 |
| GRE | 0 | 1 | 1 | 1 | 1 | 4 | 5 |
| DEN | 0 | 1 | 1 | 2 | 1 | 5 | 4 |
| POL | 0 | 1 | 1 | 1 | 2 | 5 | 5 |
| CZE | 0 | 1 | 0 | 2 | 1 (taça) | 4 | 5 |
| CRO | 0 | 1 | 0 | 1 | 1 (taça) | 3 | 3 |
| EUR1 | 0 | 1 | 0 | 1 | 2 | 4 | — (SWE, HUN e UKR tinham 3 cada) |

**Play-offs de acesso (novos):** uma eliminatória a duas mãos em Agosto, antes da fase de liga. No da UCL, os vencedores entram na UCL e os perdedores na UEL. No da UEL, os vencedores entram na UEL e os perdedores na UECL.

**Bónus do ranking UEFA (novo):** os 2 melhores países da época anterior ganham +1 vaga directa na UCL. Calculo um coeficiente UEFA dentro do jogo (pontos dos clubes de cada país nas 3 competições ÷ nº de clubes). Na 1.ª época não há época anterior: **a obter** (uso **gerado**).

**Campeões em título (novos):** se o campeão em título já tiver vaga pela liga, a vaga extra vai para o seguinte da tabela da liga dele, em cascata. Na 1.ª época não há campeões em título no mundo fictício: **gerado**.

## 5. Prémios

São novos: os prémios de UCL, UEL, UECL, Libertadores e Ásia (dados teus, UEFA 2026/27), e das taças (proposta). Ficam no pacote continental e nos pacotes de cada país, sem uso até ao prompt 3 (finanças). Três prémios do play-off de acesso estão vazios ou sem fonte: **a obter** (UCL, UEL "1.º/36.º" e UECL "1.º/32.º" sem fonte).

## 6. Força desportiva (novo parâmetro, separado do índice de riqueza)

Na Fase 1, a força dos clubes usava o índice de riqueza. Passa a usar um parâmetro novo, `forca_desportiva` (0–100) por liga, guardado em `data/fontes/complementos.json` (proposta, a validar). É uma escala aproximada ao ranking UEFA de 5 épocas; fora da Europa, uma estimativa minha (resultados no Mundial de Clubes 2025 e nas continentais).

`força do clube = reputação × (0,7 + 0,3 × força_desportiva / 100) + choque de forma da época`

| Liga | Força | Liga | Força | Liga | Força |
|---|---:|---|---:|---|---:|
| ENG1 | 90 | ENG2 | 72 | ENG3 / ENG4 | 54 / 44 |
| ESP1 | 88 | ESP2 | 60 | | |
| ITA1 | 88 | ITA2 | 58 | | |
| GER1 | 85 | GER2 / GER3 | 62 / 46 | | |
| FRA1 | 76 | FRA2 / FRA3 | 52 / 36 | | |
| NED1 | 69 | NED2 | 38 | | |
| POR1 | 68 | POR2 | 42 | | |
| BEL1 | 61 | BEL2 | 36 | | |
| TUR1 | 57 | TUR2 | 38 | | |
| GRE1, CZE1 | 54 | NOR1, DEN1, POL1 | 51 | SCO1, AUT1, SUI1 | 50 |
| EUR1 | 46 | CRO1 | 44 | SCO2 | 30 |
| BRA1 | 68 | BRA2 | 48 | ARG1 | 58 |
| ECU1 | 47 | COL1 | 45 | URU1 | 44 |
| KSA1 | 56 | KSA2 | 30 | JPN1 / JPN2 | 49 / 36 |
| KOR1 | 45 | UAE1 | 42 | USA1, MEX1 | 52 |
| AFR1 | 45 | | | | |

A ENG1 começou em 100 e desceu para 90 no ajuste (b), para a Inglaterra não passar de cerca de 40% dos títulos europeus.
