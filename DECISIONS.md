# Decisões (FutCEO)

Registo das escolhas feitas perante ambiguidade, e das decisões do utilizador. Cada uma pode ser revista.

## Decisões do utilizador (validação da Paragem 1)

- **U1.** Tabela de 924 clubes aprovada **só para teste**.
- **U2.** Argentina e MLS: uma volta (29 jornadas) + **play-off de campeão com os 8 primeiros**.
- **U3.** Ligas pequenas (10–12 equipas): **duas voltas**.
- **U4.** Quotas europeias (grupos A/B/C) aprovadas **provisoriamente**, até chegarem os documentos de vagas.
- **U5.** Eerste Divisie: **sem descidas**, como na realidade.
- **U6.** MLS joga **Agosto–Maio já em 2026/27**.
- **U7.** **Todas as ligas** (incluindo as de calendário anual: Brasil, Argentina, Colômbia, Uruguai, Equador, Coreia, Noruega, Suécia, MLS) jogam **Agosto–Maio desde 2026/27**, no teste e no jogo real (resolve a pendência 4).
- **U8.** Índice de riqueza e reputações: virá um documento do utilizador. Até lá usam-se os valores provisórios do plano.

## Decisões tomadas por mim

1. **Sem pré-eliminatórias europeias.** Quem na UEFA real entraria numa pré-eliminatória passa para a competição seguinte. Mantém o total real de vagas dos 8 grandes e fecha as 104 vagas sem défice.
2. **Vagas de desempenho UEFA (EPS) desligadas.**
3. **Play-offs internos** a jogo único em casa do melhor classificado, final neutra; **barragens entre divisões** a duas mãos.
4. **Equipas B / "Jong" / U23** não existem nesta fase; todos os clubes podem subir.
5. **Motor determinístico por jogo**: cada stream de RNG deriva de hash(semente, etiquetas), não da ordem de simulação.
6. **Sem framework de UI** (TypeScript simples no ecrã "Mundo").
7. **"Ligue 3"** para o 3.º escalão francês (renomeado em 2026/27).
8. **Liga africana**: duas voltas (46 jornadas), sem play-off de campeão (a resposta 2 falava de "ambas", entendida como Argentina e MLS).
9. **Um só modelo de calendário** ("ago_mai") para todas as ligas, em `src/config/calendario.ts`. Semana 0 = semana de 1 de Julho. Janelas de selecções aproximadas (semanas 10, 14, 19, 38): por confirmar.
10. **Fim de época**: última jornada a 22–23 Mai; finais das taças no fim-de-semana seguinte (semana 47); finais continentais na semana 48; play-offs de subida, barragens e play-off de campeão nas semanas 49–51 (Junho), para nunca chocarem com finais.
11. **Jornadas a meio da semana** (ligas com > 38 jornadas: Championship, League One, League Two, Segunda, liga africana) só em semanas sem continentais, sem taça e sem selecções. Há 11 dessas semanas; o máximo usado é 8.
12. **Sequências casa/fora**: máximo de 2 seguidas dentro de cada volta e 3 na passagem de volta (tabela de Berger com segunda volta espelhada).
13. **Bandas de reputação por liga** guardadas no próprio ficheiro da liga (`geracao.rep_tecto/rep_piso`), para que um país novo não exija mexer em código; sem esses campos usa-se uma fórmula sobre o índice de riqueza.
14. **Nomes fictícios**: gerados por sílabas próprias de cada língua, com lista de bloqueio de cidades reais conhecidas. Pode haver coincidências com localidades pequenas; os clubes ficam todos marcados `teste`.
15. **Força (Fase 1)**: `reputação × (0,85 + 0,15 × índice_liga/100)` com ruído próprio em ataque e defesa (σ = 3). A calibração dos golos vem na Paragem 3.
16. **Taças**: com 3 ou mais níveis, os dois mais baixos entram na 1.ª ronda e cada nível acima entra uma ronda depois; com 2 níveis, o 2.º entra na 1.ª ronda e o 1.º na 2.ª. A taça é sempre a jogo único, com final neutra.

## Paragem 3 (simulação)

17. **Golos esperados pela diferença de força**, não pela razão: `xG = base × exp(gama × (ataque − defesa adversária)) × casa`. Com a razão, as ligas de reputação baixa ficavam muito mais desiguais (últimos com 0 pontos). Valores calibrados em `config/simulacao.ts`: base 1,265; casa 1,17; gama 0,03; rho −0,05.
18. **Correcções ao Poisson**: os empates com golos têm peso ×1,13 (o Poisson independente dá poucos empates); os resultados com mais de 5 golos são amortecidos ×0,6 por golo a mais (o Poisson dá goleadas a mais).
19. **Força com ruído por época** (σ = 4 em ataque e defesa, nova sorte em cada época): representa as mudanças de plantel e dá variedade de campeões.
20. **1.ª época (2026/27)**: não há época anterior, por isso as vagas continentais vão para os clubes de maior reputação de cada 1.ª divisão (o "vencedor da taça" é o seguinte da lista). Da 2.ª época em diante usam-se as classificações e as taças.
21. **Eliminatórias continentais com cabeças-de-série** (em vez de quadro fixo ou sorteio): play-off 9.º–24.º emparelhado 9.º–24.º, 10.º–23.º, ...; nos oitavos o 1.º joga com o vencedor do play-off pior classificado; nos quartos e meias o melhor que resta joga com o pior. Libertadores e Ásia: 1.os de grupo cabeças-de-série contra 2.os (pode repetir-se um adversário do grupo).
22. **Calendário de fim de época**: finais das taças no sábado da semana 47; finais da Liga Europa e da Conferência a meio da semana 48, finais da Champions, Libertadores e Ásia no sábado da semana 48; play-offs nas semanas 49–51; barragens na semana 51 (1.ª mão na quarta, em casa do clube da divisão de baixo; 2.ª mão no domingo).
23. **Prolongamento** com ⅓ dos golos esperados; **penáltis** quase 50/50, com ligeira vantagem do clube de maior reputação (+2 pontos percentuais por cada 10 de diferença, máximo 65%).
24. **Taças**: enquanto ainda entram clubes, um número ímpar dá isenção ao mais forte; depois da última entrada, se o número não for potência de 2, joga-se uma pré-eliminatória só entre os mais fracos. Casa = primeiro sorteado. Final no sábado da semana 47, em campo neutro.
25. **Reputação**: alvo = banda da liga na posição final + bónus (campeão +2, subida +3, descida −3, taça +2/+1, continentais por fase × prestígio); `nova = antiga + limita(0,2 × (alvo − antiga), ±5)`.
26. **Clubes do exterior**: reputação = piso da liga − 4 (± 2). Quando as combinações simples de nomes se esgotam (ao fim de muitas épocas), acrescenta-se um qualificativo ("do Norte", "Al Jadida") ou uma sílaba extra.
27. **Histórico**: guarda-se para sempre classificações, campeões, movimentos, taças, continentais, estatísticas e reputações. O detalhe dos jogos fica completo nas últimas 3 épocas; nas anteriores só nas 8 ligas principais (1.ª divisão de ENG, ESP, GER, ITA, FRA, POR, NED, BEL) e nas continentais. Gravação binária (JSON + Int32) com gzip, uma entrada por época no IndexedDB.
28. **Domínio em Espanha e Itália** (o mesmo clube ganha quase sempre): resulta das bandas de reputação provisórias (Espanha 95→55; o 1.º fica muito acima do 2.º). A corrigir com o documento de reputações do utilizador.

## Folhas do utilizador (Prompt 1, revisão de 12/11/2026)

29. **Fonte de verdade**: `data/fontes/FutCEO_Ligas_central.xlsx` e `FutCEO_Vagas_europeias.xlsx`. O script `scripts/importar-fontes.ts` gera os pacotes a partir delas. Os valores que não vêm das folhas estão em `data/fontes/complementos.json`, cada um com a origem ("gerado", "proposta", "decisão do utilizador"). Cada liga guarda `origem_campos` e `a_obter`.
30. **Ids das ligas e competições** passam a ser os das folhas (ENG1, POR2, ENG-FAC, UCL, CLI, ACLE...).
31. **Calendário**: a folha marca 8 ligas como "ano civil"; mantém-se Agosto–Maio para todas (decisão U7) até nova indicação.
32. **Argentina e MLS**: mantêm 1 volta + play-off de campeão de 8 (decisão U2), apesar de a folha da ARG1 dizer "play-offs: não". **MEX1**: liguilla = play-off de campeão de 8 (gerado).
33. **Força desportiva** (0–100) por liga, separada do índice de riqueza (que passa a ser só económico). `força = reputação × (0,7 + 0,3 × fd/100) + choque de forma`.
34. **Choque de forma por época** (σ = 7, igual no ataque e na defesa) e **reversão à média** na reputação (40% do alvo puxa para a média da banda da liga): ajuste (a).
35. **ENG1 com força desportiva 90** (em vez de 100): ajuste (b). Com 6 sementes × 10 épocas, a Inglaterra fica com 34–35% dos títulos europeus.
36. **Divisões inferiores jogam nas paragens de selecções** (como na realidade). Assim cabem no calendário as segundas taças e as ligas de 46 jornadas.
37. **Taças**: rondas nas semanas de meio da semana livres do país (sem continentais, selecções nem jornadas de liga desse país); a principal escolhe primeiro e a secundária usa as restantes. A final de jogo único da principal é no sábado da semana 47; as finais a duas mãos e as das taças secundárias jogam-se a meio da semana.
38. **Play-offs de acesso UEFA**: uma eliminatória a duas mãos nas semanas 7 e 8, emparelhada por força (o melhor contra o pior); as fases de liga são sorteadas depois (semana 9).
39. **UECL com 6 jogos**: 4 potes de 8, 2 adversários de cada um dos outros 3 potes (1 em casa, 1 fora), nenhum do próprio pote.
40. **Sorteio das fases de liga**: procura com retrocesso; os potes são equilibrados para nenhum país ter mais de metade de um pote; se o limite de 2 adversários do mesmo país não for possível, alarga-se para 3 (aconteceu em 3 de 42 sorteios nas 10 épocas).
41. **Coeficiente UEFA no jogo**: vitória 2, empate 1 (metade no play-off de acesso), bónus por fase (oitavos 1 … vencedor 5), UECL a metade; coeficiente = pontos ÷ clubes da associação. Os 2 melhores ganham +1 vaga directa na UCL na época seguinte (`config/coeficiente.ts`).
42. **Campeões em título**: entram primeiro; se o clube já tinha vaga pela liga, a liga dele ganha uma vaga a mais na mesma competição e o resto desce em cascata. Na 1.ª época são gerados: os 3 clubes de maior reputação da Europa (UCL, UEL, UECL); o bónus do ranking vai para ENG1 e ITA1 (gerado).
43. **Colômbia**: desce pela média de pontos das últimas 3 épocas na liga.
44. **Splits e fases finais** (SCO1, AUT1, DEN1, SUI1, CZE1, GRE1, BEL1, KOR1) não estão implementados: as ligas jogam o número de voltas que a folha indica ("33 jogos" → 3 voltas; "4 voltas" → 4).
45. **Liga 3 portuguesa**, **SWE1**, **HUN1** e **UKR1** saem do jogo (não estão nas folhas). A EUR1 tem clubes desses e de outros países, com quotas geradas.

## Respostas do utilizador (13/11/2026) às 12 pendências

46. **AFR1** 24 clubes, fechada, quotas antigas. **EUR1** UKR 3, ISR 3, CYP 3, SWE 3, ROU 3, HUN 3, AZE 2. **ARG1** desce 2 e mantém o play-off de campeão de 8. **FRA3** sobe 3 e **FRA2** desce 3.
47. **SUI1, POL1, CZE1, CRO1, EUR1**: TV gerada pelo índice de riqueza (9 M€ × índice; 50/30/20), plantel máximo 29; marcados "gerado".
48. **MLS** sem tecto salarial. **Mínimo de nacionais**: 0 em todas, excepto Alemanha 12, Inglaterra 8 e Itália 8 (nacional = formado no país); o valor da folha fica guardado em `minimo_nacionais_folha`, sem uso.
49. **Ano civil** (substitui U7): NOR1, BRA1/2, ARG1, COL1, URU1, ECU1, KOR1 e USA1 jogam Fevereiro–Novembro (play-offs em Dezembro) e começam na época de 2027; a Libertadores acompanha esse calendário. O mundo avança por datas reais com duas épocas em paralelo (`Simulador`), cada uma com a sua passagem de época. As vagas usam a última classificação conhecida de cada liga (ex.: a Noruega para a UEFA usa a tabela de Dezembro anterior).
50. **Choques entre calendários**: as taças de pacotes com vagas em continentais do outro calendário (Noruega na UEFA, Coreia na Ásia) evitam essas semanas, e as jornadas de liga evitam os fins-de-semana das finais desse calendário. A verificação de calendário passa a fazer-se também por data absoluta entre calendários. Um clube de ano civil pode descer para fora do jogo a meio da campanha europeia (qualificou-se antes): é aceite.
51. **Formatos**: sem splits nem play-outs (opções em `config/formatos.ts`, desligadas; textos em `split_folha`). BEL2 com 4 voltas. **MEX1 e USA1 sem play-offs**, tabela única (USA1 com 1 volta, 30 equipas).
52. **KSA1**: força desportiva 50 (decisão do utilizador). Mesmo assim, a Arábia ganhava ~6,8 de 10 títulos asiáticos; baixei o tecto da banda de reputação provisória de 78 para 72. Com 6 sementes, a Arábia fica com ~4,7 de 10.

## Fase 2 — Bloco A (jogador)

53. **Atributos, posições, papéis e pesos** aprovados pelo utilizador (`config/atributos.ts`, `config/papeis.ts`): 39 visíveis + 6 ocultos; 12 posições (com ALD/ALE); 20 papéis. Familiaridade: natural 18–20 (sem penalização), competente 10–17 (−3% a −8%), desconfortável < 10 (−15% a −25%).
54. **OVR-alvo dos plantéis** = 35 + 0,6 × força da Fase 1 (`reputação × (0,7 + 0,3 × força desportiva / 100)`): força 90 → 89, 60 → 71, 25 → 50. No Bloco B o rating do onze converte-se de volta na escala da força para os golos esperados.
55. **Composição do plantel** (25): 3 GR, 4 DC, 2 DD, 2 DE, 2 MDC, 4 MC, 2 MO, 3 PL, 1 ED, 1 EE e 1 extremo de um dos lados. Os titulares ficam no nível do clube (+2), os seguintes abaixo (−3, −7, −10), com ruído σ = 3,5 e 3% de "craques" (+7).
56. **Atributos gerados**: os relevantes para a posição ficam à volta do nível (os de peso maior acima); os irrelevantes ficam 1,3 dispersões abaixo; os de guarda-redes dos jogadores de campo ficam entre 1 e 6. Um ajuste iterativo garante que o OVR na posição natural bate no alvo.
57. **Idade na geração**: os jovens estão abaixo do nível (−2,2 de OVR por ano antes dos 24); os veteranos também (−1,5 por ano depois dos 31). O potencial dos jovens fica à volta do nível do clube.
58. **Evolução mensal** no 1.º dia de cada mês, aplicada por arredondamento estocástico (cada atributo relevante sobe 1 ponto com probabilidade igual à fracção). Até ao Bloco B, os minutos estimam-se pela ordem no plantel (14 primeiros: 0,85; restantes: 0,3); até ao Bloco C, o treinador é neutro (desenvolvimento 10). O declínio afecta sobretudo os físicos; os mentais ainda podem subir depois dos 30.
59. **Aposentação** por época (probabilidade por idade; os GR 2 anos mais tarde) e **reposição** por jovens gerados (18–23 anos), para manter a composição. A academia real chega no Prompt 4.
60. **players.csv** substitui jogadores.csv em cada pacote. `npm run players -- --export` escreve-os em out/players/ (ou em packs/ com `--para-pacotes`). Ao reimportar, uma linha com origem "manual"/"real", ou que difira do gerado, sobrepõe-se e fica "manual".
61. **Dados reais** (nota do utilizador, aprovação da Paragem A): o utilizador vai enviar folhas xlsx com todos os clubes, staff e jogadores. O importador `scripts/importar-fontes.ts` será alargado para os passar para os pacotes (clubes.csv, players.csv, staff.csv), com prioridade real/manual > gerado.

## Fase 2 — Bloco B (motor de jogo)

62. **Tácticas** (`config/tacticas.ts`): 9 formações (4-4-2, 4-3-3, 4-3-3 com falso 9, 4-2-3-1, 4-1-4-1, 3-5-2, 3-4-3, 5-3-2, 4-4-2 losango) e 5 instruções de equipa (mentalidade −2…+2; pressão, linha, largura, ritmo −1…+1) com efeitos medidos em percentagem dos ratings; pressão alta e ritmo rápido cansam mais.
63. **Ratings de equipa** (`config/ratings.ts`): 9 ratings (1–20) = Σ contribuição do papel × pontuação do jogador × factor do lugar ÷ referência. As contribuições de cada papel de campo são normalizadas para a mesma soma (o papel distribui a influência, não a aumenta). Factor do lugar = familiaridade × penalização por papel desajustado (8% por ponto abaixo do seu melhor papel na posição, até 40%). Ficam em cache por clube (formação + papéis + jogadores + instruções); a evolução mensal limpa a cache.
64. **Ratings → golos**: índices de ataque (construção 0,18, criação 0,27, finalização 0,45, bolas paradas 0,05, aéreo 0,05) e de defesa (pressão 0,2, defesa da área 0,35, transição 0,2, GR 0,2, aéreo 0,05) convertidos na escala de força da Fase 1 por uma recta que conserva a média e o desvio-padrão (`scripts/calibrar-ratings.ts`, sobre os plantéis antes da afinação). A assimetria ataque/defesa fica a 50% (sem isso o modo detalhado tinha caudas de 10+ golos). O modo rápido usa a fórmula da Fase 1 com parâmetros próprios (`SIMULACAO_ONZE`: base 1,245, casa 1,17, ρ −0,02, empates ×1,12). O modo antigo por reputação continua disponível (`MOTOR.modo_forca = 'reputacao'`).
65. **Modificadores** (cada um com limite, total ±15%): moral ±5%, forma ±4%, cansaço (condição média < 80%) até −8%, entrosamento ±5%, treinador ±5% (táctica, motivação, adequação do plano ao plantel). À parte, fora do limite (é o nível do clube na época, não um modificador do jogo): forma da época σ 10% (limite ±20%), o equivalente do choque de forma da Fase 1 (σ 7 pontos). Dentro do limite cortava os choques positivos das equipas fortes e os domínios fixavam-se. Rivalidade: mais variância nos golos esperados e cartões ×1,3, sem mudar a média. A moral (1–20) muda ±1 pelo resultado e regressa 25% por jogo à referência 13, para uma série de vitórias não ficar presa no máximo.
66. **Modo detalhado**: 150 posses; cada ataque = progressão → penetração → criação → remate, com duelos P = 0,5 + K × diferença (K = 0,025, diferença ±10; 19 contra 11 → 70%). Às acções individuais junta-se um termo de equipa (0,6 × diferença de força ataque/defesa ÷ 10), que alinha a sensibilidade à qualidade com o modo rápido. xG por tipo (grande 0,35–0,45, normal 0,065–0,125, longe 0,03–0,05, penálti 0,76), duelo com o GR ±30%, golo = Bernoulli(xG). Estado do jogo: quem ganha ataca menos, quem perde arrisca; empatados depois dos 58' ambos mais cautelosos; amortecimento acima de 3 golos; ritmo do jogo partilhado (lognormal). Com falso 9 adequado, uma criação falhada pode ser repetida numa tabelinha.
67. **IA do onze**: o treinador avalia cada plano (as suas formações e uma variante do preferido com os papéis ajustados aos jogadores) pela força do onze nos ratings; troca de plano se o melhor for > 1,5% superior, com probabilidade (adaptabilidade/20)². Rotação: jogador com condição < 75 vale −12% na escolha. Um jogador numa posição desconfortável (familiaridade < 10) vale metade: só como último recurso.
68. **Falso 9 (cenário de teste)**: o clube fica só com PL do perfil pedido e nenhum médio ou extremo com familiaridade a PL (≤ 3), para isolar o efeito. Sem falso 9 adequado não há sinergia com os interiores e o 9 perde mais bolas na progressão.
69. **Afinação dos plantéis gerados**: depois de gerado, o plantel de cada clube é deslocado (arredondamento estocástico nos atributos, sem tocar nos de GR dos jogadores de campo) até a força do onze ficar a ±1 da força-alvo da Fase 1. Só jogadores "gerado"; os reais e manuais nunca mudam.
70. **Correcção provisória da deriva** (até haver mercado no Prompt 3): sem transferências, os plantéis afastam-se da força-alvo e os domínios fixam-se (uma liga chegava a 10 títulos em 10). No início de cada época cada clube recebe uma correcção de uma fracção da distância entre a força-alvo e a força do onze, limitada a ±8 pontos, com 70% da distância (`DERIVA_PLANTEL`; desliga-se com `reversao: 0`).

## Fase 2 — Bloco C (treinador e integração)

71. **Treinadores**: 7 atributos (táctica, motivação, desenvolvimento, disciplina, adaptabilidade, gestão de grupo, autoridade) e 6 perfis, cada um com formações, instruções e papéis preferidos (ex.: pressão alta com GR líbero e avançado de pressão). Um treinador "gerado" por clube, determinístico; nível = 6 + 9 × reputação/100 (σ 2,5), +3 nos atributos fortes do perfil; clubes grandes com mais perfis ofensivos e de pressão, pequenos com mais pragmáticos e de contra-ataque; a adaptabilidade não depende da reputação. Fixo até ao Prompt 3.
72. **Efeitos**: táctica, motivação e adequação do plano nos modificadores (±5%); desenvolvimento na evolução mensal (±25%); disciplina nos cartões (× 1 + (10 − disciplina) × 0,02, nos dois modos); gestão de grupo na moral (referência 13 + (gestão − 10) × 0,2; derrotas custam menos moral com gestão alta) e no conflito com o utilizador.
73. **Interferência do utilizador** (`coaches/interferencia.ts`, `config/treinadores.ts` → `INTERFERENCIA`): o utilizador sugere formação, instruções e onze. O treinador decide: s = abertura (capital do utilizador) − resistência (autoridade, autoridade no balneário, conflito, tamanho do pedido, pedidos recentes) + adaptabilidade; P(aceita) = σ(2s − 0,5), P(ignora) = σ(−2s − 0,5), o resto é "em parte" (aplica as alterações por ordem até metade do pedido). Custos: capital 3 por alteração (formação conta 2; ×0,5 em parte, ×0,34 se ignora), autoridade do treinador 2 por alteração aplicada; conflito +1/+2/+3 por alteração (aceita/parcial/ignora), a dobrar com mais de 3 pedidos recentes, amortecido pela gestão. Recuperação semanal. Conflito ≥ 40 tenso, ≥ 70 crise (a consequência chega no Prompt 3).
74. **Reposição ancorada**: sem âncora, as ligas mais fracas subiam ~3,5–4 de OVR médio em 20 anos. A reposição anual compensa a deriva da média do plantel face à da geração, relativa ao nível do clube (alvo dos novos −= 2 × deriva, até ±8).
75. **Gravação dos jogadores**: `PlayerStore.exportar/importar` (arrays binários cortados a n + textos; os derivados recalculam-se ao carregar).
76. **Regressão** com 6 sementes (2026, 7, 11, 23, 42, 99) nos dois modos (`scripts/regressao-sementes.ts`, `scripts/analisar-regressao.py`, `scripts/relatorio-regressao.py`). As 8 maiores ligas são as 8 primeiras do ranking UEFA (ENG, ESP, ITA, GER, FRA, POR, NED, BEL).
