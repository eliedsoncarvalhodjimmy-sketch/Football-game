# Fase 2 — Paragem B: motor de jogo

> DADOS DE TESTE. Mundo fictício, semente 2026. Node, esta máquina (no tablet, contar 3 a 6 vezes mais lento).

## 1. Calibração (10 000 jogos de liga, `scripts/calibrar-motor.ts`)

| Medida | Rápido | Detalhado | Alvo |
|---|---|---|---|
| Golos por jogo | 2.63 | 2.60 | ~2,6 (diferença < 0,1) |
| Casa / empate / fora | 45.5 / 25.0 / 29.5% | 44.7 / 26.2 / 29.2% | 45 / 25–27 / 28–30% |
| 0-0 | 7.0% | 7.2% | 7–8% |
| ≤ 3 golos | 72.3% | 73.0% | 70–75% |
| 5+ golos | 12.8% | 11.7% | 10–12% |
| 7+ golos | 0.9% | 0.8% | < 1,5% |
| 10+ golos | 0 | 1 | quase nunca |
| Remates por equipa | 12.5 | 12.2 | 12–13 |
| Conversão | 10.5% | 10.7% | ~11% |
| Muito mais fraca (≥ 12 pontos) ganha | 11.1% | 9.5% | 10–15% |
| Tempo por jogo | 3 µs | ~300 µs | — |

Duelo 19 contra 11: 70% (K = 0,025, diferença limitada a ±10). Limite total dos modificadores: ±15%. Nenhum dos dois foi alterado.

## 2. Falso 9 (4-3-3 com falso 9, 1500 jogos detalhados por linha, `src/match/falso9.ts`)

| Cenário | Plano jogado | Ocasiões | Grandes | Remates dos interiores | Bolas perdidas pelo 9 | Golos | Sofridos |
|---|---|---:|---:|---:|---:|---:|---:|
| A — falso 9 adequado, treinador teimoso | 4-3-3 F9 | 14.88 | 2.64 | 5.70 | 1.24 | 2.24 | 0.70 |
| B — só finalizadores, teimoso | 4-3-3 F9 (finalizador a falso 9) | 11.51 (−22.6%) | 2.03 | 3.82 | 2.83 | 1.79 | 0.77 |
| B — só finalizadores, adaptável | 4-3-3 com finalizador | 11.76 | 2.13 | 1.50 | 0.36 | 1.85 | 0.70 |

## 3. Tempo do modo rápido

Semana do mundo inteiro (todas as jornadas de 48 ligas, taças e continentais, ~17 200 jogos por época, com IA do onze, ratings, estado dos jogadores e evolução mensal): **81 ms em média, 205 ms no máximo**. Época completa: 4,2 s.

## 4. Dois jogos em modo detalhado (`npm run simulate-match -- --detailed --exemplo ...`)

### 4.1 Equilibrado (4.º contra 5.º da Premier League por reputação)

#### Stourmercombe City 2–0 Hathercombe United

**Stourmercombe City** — 4-3-3; força ataque 84.8, defesa 79.2; modificador -1.6%.

Onze: Felipe Camado (Guarda-redes clássico), Can Taşhan (Lateral ofensivo), Felix Schwarmann (Central defensivo), Petros Manoou (Central construtor), Callum Thornstone (Lateral defensivo), Nicolás Molón (Médio construtor recuado), Oliver Kemby (Box-to-box), Ante Jurašević (Médio criativo), Thomas Cartby (Extremo invertido), Andreas Stavpoulos (Finalizador), Ivan Petinić (Extremo invertido).

**Hathercombe United** — 4-3-3; força ataque 85.3, defesa 82.8; modificador -3.6%.

Onze: Arnaud Trabi (Guarda-redes clássico), Chukwuemeka Mbani (Lateral ofensivo), Thomas Holton (Central defensivo), Hakan Taşhan (Central construtor), Lewis Kemby (Lateral defensivo), Christos Georakis (Médio construtor recuado), Julian Mülke (Box-to-box), Thomas Cartson (Médio criativo), Daniel Penwell (Extremo invertido), Daniel Holley (Finalizador), Emiliano Benero (Extremo invertido).

| Rating | Stourmercombe City | Hathercombe United |
|---|---|---|
| Construção | 18.4 | 17.3 |
| Criação | 17.5 | 16.2 |
| Finalização | 19.7 | 18.8 |
| Pressão | 15.3 | 14.2 |
| Defesa da área | 15.4 | 16.4 |
| Transição defensiva | 13.2 | 15.3 |
| Jogo aéreo | 11.9 | 13.1 |
| Bolas paradas | 12.5 | 14.6 |
| Guarda-redes | 18.6 | 15.8 |

**Relato**

- 4' Ocasião do Stourmercombe City: Ivan Petinić (servido por Ante Jurašević), xG 0.07.
- 11' Grande ocasião do Hathercombe United: Thomas Cartson (servido por Daniel Penwell), xG 0.38.
- 13' Cartão amarelo para Callum Thornstone (Stourmercombe City).
- 18' Ocasião do Hathercombe United: Daniel Penwell (servido por Julian Mülke), xG 0.10.
- 19' Cabeceamento após canto do Stourmercombe City: Can Taşhan, xG 0.07.
- 23' Cabeceamento após canto do Stourmercombe City: Can Taşhan, xG 0.07.
- 28' Cartão amarelo para Can Taşhan (Stourmercombe City).
- **41' GOLO do Stourmercombe City!** Andreas Stavpoulos marca num remate de fora da área. Stourmercombe City 1–0 Hathercombe United. Assistência de Ivan Petinić.
- — Intervalo: Stourmercombe City 1–0 Hathercombe United —
- 62' Substituição no Hathercombe United: entra Daniel Fairham, sai Daniel Holley.
- 70' Ocasião do Hathercombe United: Daniel Fairham (servido por Emiliano Benero), xG 0.08.
- 76' Substituição no Hathercombe United: entra Oliver Bradby, sai Daniel Fairham.
- 79' Grande ocasião do Hathercombe United: Oliver Bradby (servido por Emiliano Benero), xG 0.41.
- 80' Substituição no Stourmercombe City: entra Ibrahima Kouoré, sai Petros Manoou.
- 81' Ocasião do Hathercombe United: Oliver Bradby (servido por Emiliano Benero), xG 0.10.
- **89' GOLO do Stourmercombe City!** Ivan Petinić marca num remate de fora da área. Stourmercombe City 2–0 Hathercombe United.
- — Fim do jogo: Stourmercombe City 2–0 Hathercombe United —

**Estatísticas finais**

| | Stourmercombe City | Hathercombe United |
|---|---|---|
| Golos | 2 | 0 |
| Posse de bola | 49% | 51% |
| Remates (à baliza) | 7 (3) | 9 (2) |
| xG | 0.38 | 1.22 |
| Grandes ocasiões | 0 | 2 |
| Ataques | 29 | 29 |
| Progressões ganhas / perdidas | 18 / 11 | 21 / 8 |
| Cantos | 3 | 0 |
| Faltas | 3 | 1 |
| Amarelos / vermelhos | 2 / 0 | 0 / 0 |

### 4.2 Muito desigual (1.º contra o último da Premier League por reputação)

#### Brackcombe Town 3–0 AFC Stouringham

**Brackcombe Town** — 4-4-2; força ataque 95.1, defesa 106.6; modificador -0.3%.

Onze: Callum Radham (Guarda-redes clássico), Ryan Penley (Lateral ofensivo), Moritz Bauz (Central defensivo), Callum Hartstone (Central construtor), Brayan Feroya (Lateral defensivo), Ryan Holley (Extremo clássico), Oliver Fairford (Box-to-box), Burak Kılılik (Médio de cobertura), Charlie Kemwell (Extremo clássico), Jack Fairstone (Finalizador), Lorenzo Dellone (Avançado de pressão).

**AFC Stouringham** — 4-3-3; força ataque 66.4, defesa 60.1; modificador -3.1%.

Onze: Emmanuel Mbani (Guarda-redes clássico), Iván Ferudo (Lateral ofensivo), Hassan El Qahtani (Central defensivo), Mathis Marand (Central construtor), Iván Cedados (Lateral defensivo), Yao Koné (Médio construtor recuado), Callum Whitford (Box-to-box), Charlie Bradby (Médio criativo), Mathis Dubard (Extremo invertido), Ryan Radwell (Finalizador), Romain Vinière (Extremo invertido).

| Rating | Brackcombe Town | AFC Stouringham |
|---|---|---|
| Construção | 12.5 | 15.4 |
| Criação | 17.8 | 14.3 |
| Finalização | 19.7 | 16.8 |
| Pressão | 21.0 | 11.7 |
| Defesa da área | 17.6 | 12.9 |
| Transição defensiva | 18.2 | 11.6 |
| Jogo aéreo | 15.1 | 10.4 |
| Bolas paradas | 16.2 | 12.2 |
| Guarda-redes | 19.5 | 16.0 |

**Relato**

- 2' Grande ocasião do Brackcombe Town: Lorenzo Dellone (servido por Burak Kılılik), xG 0.41.
- 5' Ocasião do Brackcombe Town: Charlie Kemwell (servido por Ryan Holley), xG 0.10.
- **8' GOLO do Brackcombe Town!** Oliver Fairford marca num remate de fora da área. Brackcombe Town 1–0 AFC Stouringham. Assistência de Ryan Holley.
- 11' Ocasião do Brackcombe Town: Charlie Kemwell (servido por Oliver Fairford), xG 0.07.
- 12' Ocasião do Brackcombe Town: Jack Fairstone (servido por Oliver Fairford), xG 0.12.
- 14' Ocasião do Brackcombe Town: Jack Fairstone (servido por Ryan Penley), xG 0.13.
- 21' Cartão amarelo para Iván Ferudo (AFC Stouringham).
- 29' Grande ocasião do Brackcombe Town: Ryan Holley (servido por Burak Kılılik), xG 0.46.
- **29' GOLO do Brackcombe Town!** Ryan Holley marca. Brackcombe Town 2–0 AFC Stouringham. Assistência de Burak Kılılik.
- 37' Ocasião do Brackcombe Town: Jack Fairstone (servido por Charlie Kemwell), xG 0.08.
- 40' Ocasião do Brackcombe Town: Jack Fairstone (servido por Charlie Kemwell), xG 0.12.
- **40' GOLO do Brackcombe Town!** Jack Fairstone marca. Brackcombe Town 3–0 AFC Stouringham. Assistência de Charlie Kemwell.
- — Intervalo: Brackcombe Town 3–0 AFC Stouringham —
- 54' Ocasião do AFC Stouringham: Ryan Radwell (servido por Yao Koné), xG 0.10.
- 57' Cartão amarelo para Ryan Holley (Brackcombe Town).
- 67' Cartão amarelo para Lorenzo Dellone (Brackcombe Town).
- 80' Substituição no Brackcombe Town: entra Didier Mbeki, sai Ryan Holley.
- — Fim do jogo: Brackcombe Town 3–0 AFC Stouringham —

**Estatísticas finais**

| | Brackcombe Town | AFC Stouringham |
|---|---|---|
| Golos | 3 | 0 |
| Posse de bola | 72% | 28% |
| Remates (à baliza) | 13 (8) | 5 (2) |
| xG | 1.67 | 0.26 |
| Grandes ocasiões | 2 | 0 |
| Ataques | 28 | 38 |
| Progressões ganhas / perdidas | 24 / 4 | 15 / 23 |
| Cantos | 0 | 0 |
| Faltas | 5 | 2 |
| Amarelos / vermelhos | 2 / 0 | 1 / 0 |
