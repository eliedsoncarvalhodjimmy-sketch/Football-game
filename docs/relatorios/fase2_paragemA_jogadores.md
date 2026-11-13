# Fase 2 — Paragem A: jogadores

> DADOS DE TESTE. Semente 2026. 21 800 jogadores gerados para 872 clubes (25 por clube).

## 1. Atributos (aprovados)

- **Técnicos:** Cruzamento (cru), Drible (dri), Finalização (fin), Primeiro toque (ptq), Cabeceamento (cab), Passe (pas), Passe longo (plo), Remate de longe (rld), Desarme (des), Marcação (mar), Técnica (tec), Bolas paradas (bpa)
- **Mentais:** Antecipação (ant), Compostura (cmp), Concentração (con), Decisões (dec), Determinação (det), Liderança (lid), Movimentação sem bola (msb), Posicionamento (pos), Trabalho de equipa (teq), Visão (vis), Agressividade (agr), Capacidade de trabalho (ctr)
- **Físicos:** Aceleração (ace), Agilidade (agi), Equilíbrio (equ), Impulsão (imp), Resistência (res), Velocidade (vel), Força (for)
- **Guarda-redes:** Reflexos (ref), Jogo aéreo (jae), Comando da área (cma), Pega (peg), Um-contra-um (uco), Jogo com os pés (jpe), Pontapé (pon), Comunicação (com)
- **Ocultos:** Profissionalismo (prof), Ambição (amb), Consistência (cst), Propensão a lesões (les), Adaptabilidade (adp), Pressão (pre)

## 2. Pesos dos papéis (aprovados; em `src/config/papeis.ts`)

| Papel | Posições | Pesos |
|---|---|---|
| Guarda-redes clássico | GR | ref 5, uco 4, peg 4, jae 4, cma 4, pos 4, com 3, con 3, cmp 3, agi 3, ant 2, dec 2, jpe 1, pon 1, imp 1 |
| Guarda-redes líbero | GR | uco 5, ref 4, jpe 4, cma 4, ant 4, pon 3, dec 3, cmp 3, ace 3, peg 3, jae 3, com 2, vel 2, agi 2 |
| Central defensivo | DC | mar 5, des 5, pos 5, cab 4, for 4, con 4, imp 3, ant 3, agr 2, cmp 2, dec 2, vel 2, equ 2, det 1 |
| Central construtor | DC | des 4, mar 4, pos 4, pas 4, cmp 4, plo 3, ptq 3, ant 3, dec 3, con 3, cab 3, vis 2, tec 2, for 2, vel 2 |
| Lateral defensivo | DD, DE | des 4, mar 4, pos 4, ant 3, con 3, vel 3, ace 3, res 3, teq 2, pas 2, cru 1, equ 1, for 1 |
| Lateral ofensivo | DD, DE | cru 4, res 4, vel 4, ace 3, dri 3, pas 3, ctr 3, des 3, teq 2, msb 2, mar 2, pos 2, ptq 2, tec 2 |
| Ala (linha de 3) | ALD, ALE | res 5, cru 4, ctr 4, vel 4, ace 3, dri 3, pas 3, msb 3, teq 3, des 2, mar 2, pos 2, ptq 2, agi 1 |
| Trinco | MDC | des 5, pos 5, mar 4, ant 4, con 3, ctr 3, agr 3, for 3, dec 3, teq 3, res 3, pas 2, cmp 2 |
| Médio construtor recuado | MDC | pas 5, plo 4, vis 4, dec 4, cmp 4, ptq 3, tec 3, pos 3, ant 3, des 2, teq 2, con 2 |
| Box-to-box | MC | res 5, ctr 5, pas 3, des 3, msb 3, ant 3, dec 3, teq 3, det 3, rld 2, fin 2, vel 2, ace 2, for 2, ptq 2 |
| Médio criativo | MC | pas 5, vis 5, tec 4, ptq 4, dec 4, cmp 3, dri 3, msb 3, plo 3, ant 2, rld 2, agi 2 |
| Médio de cobertura | MC | pos 4, des 4, teq 4, ctr 4, dec 3, pas 3, ant 3, con 3, res 3, mar 3, cmp 2, ptq 2 |
| 10 clássico | MO | vis 5, pas 5, tec 5, ptq 4, dec 4, cmp 4, dri 3, msb 3, agi 3, rld 3, fin 2, bpa 2 |
| Segundo médio que entra na área | MO | msb 5, fin 4, ant 4, cmp 3, ptq 3, rld 3, dri 3, ace 3, pas 3, ctr 3, dec 3, tec 2, res 2 |
| Extremo clássico | ED, EE | cru 5, vel 5, ace 5, dri 4, tec 3, ptq 3, agi 3, msb 3, res 2, pas 2, ctr 2 |
| Extremo invertido | ED, EE | dri 5, fin 4, rld 4, ace 4, vel 4, tec 4, agi 4, ptq 3, msb 3, cmp 3, pas 2, dec 2 |
| Finalizador | PL | fin 5, msb 5, cmp 4, ant 4, ptq 3, cab 3, ace 3, vel 3, equ 2, dec 2, tec 2, agi 2 |
| Falso 9 | PL | ptq 5, pas 4, vis 4, tec 4, dec 4, msb 4, cmp 4, dri 3, fin 3, agi 3, ant 3, teq 3 |
| Pivô | PL | for 5, cab 5, imp 4, equ 4, ptq 3, fin 3, teq 3, cmp 2, msb 2, pas 2, ant 2, agr 1 |
| Avançado de pressão | PL | ctr 5, res 5, agr 4, ace 4, teq 4, ant 3, vel 3, fin 3, msb 3, det 3, des 2, for 2 |

## 3. Dez jogadores de exemplo (ligas e níveis diferentes)

| # | Jogador | Nac. | Idade | Clube (liga) | Pos. | OVR | Pot. | Adequação aos papéis da posição (1–20) | OVR noutras posições |
|---:|---|---|---:|---|---|---:|---:|---|---|
| 1 | **Jack Fairstone** — Craque do campeão inglês (ENG1, topo) | ENG | 20 | Brackcombe Town (ENG1) | PL | **87** | 99 | Finalizador 18.2; Falso 9 17.1; Pivô 18.5*; Avançado de pressão 16.5 | MO 82 (fam. 8), DC 79 (fam. 6), MDC 79 (fam. 8) |
| 2 | **Víctor Palizo** — Guarda-redes de clube grande (ESP1, topo) | ESP | 24 | Olmedosa CF (ESP1) | GR | **89** | 96 | Guarda-redes clássico 18.0*; Guarda-redes líbero 17.6 | DC 60 (fam. 1), MDC 59 (fam. 1), ED 56 (fam. 1) |
| 3 | **Stijn DekDijk** — Central de meio da tabela (GER1) | NED | 29 | Eintracht Grünheim (GER1) | DC | **77** | 83 | Central defensivo 16.1*; Central construtor 15.0 | MDC 73 (fam. 10), DD 67 (fam. 8), DE 67 (fam. 11) |
| 4 | **Daniel Lingson** — Médio da Championship (ENG2, meio) | ENG | 32 | Grimbury United (ENG2) | MC | **65** | 65 | Box-to-box 12.9; Médio criativo 12.3; Médio de cobertura 14.6* | MDC 65 (fam. 13), DD 60 (fam. 8), DE 60 (fam. 6) |
| 5 | **Rodrigo Barelo** — Extremo do Brasileirão (BRA1, topo) | BRA | 24 | Atlético Pouso das Pedras (BRA1) | EE | **81** | 85 | Extremo clássico 16.2; Extremo invertido 16.5* | ED 81 (fam. 14), MO 76 (fam. 10), ALD 72 (fam. 8) |
| 6 | **Filipe Taveira** — Lateral da 1.ª Liga portuguesa (POR1, meio) | POR | 25 | Grupo Desportivo de Quinta do Vale (POR1) | DD | **66** | 69 | Lateral defensivo 13.1; Lateral ofensivo 13.9* | ALD 68 (fam. 18), ALE 68 (fam. 9), DE 66 (fam. 12) |
| 7 | **Thijs Smitsen** — Jovem promessa (NED1, topo, ≤ 20 anos) | NED | 18 | VV Oudveen (NED1) | MO | **42** | 65 | 10 clássico 9.6*; Segundo médio que entra na área 8.0 | ED 34 (fam. 7), EE 34 (fam. 11), MC 33 (fam. 14) |
| 8 | **Nasser El Qahtani** — Avançado da Saudi Pro League (KSA1, meio) | KSA | 26 | Ain Thuraya SC (KSA1) | PL | **60** | 62 | Finalizador 12.2; Falso 9 11.7; Pivô 14.1*; Avançado de pressão 11.1 | DC 55 (fam. 8), MDC 52 (fam. 5), MO 52 (fam. 10) |
| 9 | **Kasper Bergby** — Trinco da liga Resto da Europa (EUR1, meio) | SWE | 24 | Björkholms AIK (EUR1) | MDC | **60** | 66 | Trinco 12.4*; Médio construtor recuado 12.3 | DC 61 (fam. 9), DD 54 (fam. 1), DE 54 (fam. 1) |
| 10 | **Kyle Penley** — Defesa da League Two (ENG4, meio) | ENG | 25 | Shelham City (ENG4) | DC | **55** | 60 | Central defensivo 10.9; Central construtor 11.7* | MDC 56 (fam. 15), MC 51 (fam. 8), DD 48 (fam. 9) |

\* papel preferido. Atributos dos 10 exemplos:

| # | cru | dri | fin | ptq | cab | pas | plo | rld | des | mar | tec | bpa | ant | cmp | con | dec | det | lid | msb | pos | teq | vis | agr | ctr | ace | agi | equ | imp | res | vel | for | ref | jae | cma | peg | uco | jpe | pon | com | prof | amb | cst | les | adp | pre |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 14 | 15 | 20 | 17 | 20 | 16 | 13 | 13 | 12 | 13 | 15 | 12 | 20 | 19 | 13 | 19 | 12 | 15 | 19 | 14 | 20 | 13 | 16 | 14 | 16 | 13 | 18 | 15 | 14 | 17 | 20 | 6 | 2 | 3 | 3 | 5 | 1 | 3 | 6 | 8 | 8 | 14 | 10 | 10 | 14 |
| 2 | 9 | 9 | 10 | 9 | 10 | 9 | 7 | 11 | 8 | 8 | 8 | 10 | 16 | 19 | 15 | 17 | 10 | 7 | 8 | 18 | 12 | 7 | 9 | 8 | 13 | 18 | 9 | 14 | 11 | 16 | 10 | 19 | 19 | 18 | 19 | 19 | 18 | 16 | 19 | 12 | 9 | 18 | 13 | 1 | 13 |
| 3 | 11 | 12 | 10 | 12 | 16 | 11 | 12 | 10 | 17 | 16 | 11 | 10 | 17 | 16 | 17 | 16 | 12 | 14 | 12 | 19 | 13 | 13 | 14 | 11 | 13 | 12 | 13 | 15 | 11 | 11 | 17 | 6 | 4 | 6 | 5 | 1 | 4 | 5 | 6 | 6 | 6 | 7 | 13 | 8 | 10 |
| 4 | 10 | 11 | 11 | 15 | 7 | 16 | 7 | 10 | 14 | 11 | 10 | 5 | 13 | 13 | 13 | 16 | 7 | 10 | 9 | 14 | 17 | 12 | 10 | 18 | 8 | 10 | 11 | 9 | 13 | 8 | 9 | 4 | 4 | 4 | 1 | 3 | 2 | 5 | 2 | 11 | 11 | 10 | 17 | 16 | 18 |
| 5 | 13 | 18 | 14 | 17 | 11 | 15 | 10 | 17 | 10 | 14 | 18 | 13 | 12 | 14 | 14 | 15 | 13 | 11 | 17 | 11 | 12 | 12 | 10 | 15 | 17 | 16 | 10 | 14 | 12 | 18 | 14 | 2 | 5 | 6 | 2 | 6 | 2 | 4 | 3 | 9 | 9 | 4 | 13 | 13 | 9 |
| 6 | 13 | 13 | 11 | 14 | 9 | 17 | 12 | 8 | 15 | 12 | 8 | 9 | 10 | 6 | 11 | 9 | 9 | 9 | 11 | 14 | 8 | 12 | 12 | 15 | 13 | 9 | 7 | 9 | 16 | 18 | 9 | 2 | 1 | 3 | 1 | 5 | 6 | 2 | 2 | 8 | 18 | 9 | 8 | 10 | 8 |
| 7 | 4 | 6 | 8 | 7 | 6 | 13 | 6 | 8 | 5 | 3 | 8 | 6 | 4 | 11 | 5 | 12 | 4 | 6 | 10 | 5 | 2 | 12 | 3 | 6 | 7 | 9 | 4 | 4 | 3 | 4 | 1 | 3 | 1 | 5 | 6 | 5 | 2 | 2 | 2 | 9 | 18 | 8 | 13 | 13 | 11 |
| 8 | 6 | 9 | 13 | 15 | 16 | 11 | 4 | 7 | 10 | 12 | 10 | 9 | 15 | 13 | 8 | 8 | 9 | 9 | 11 | 8 | 13 | 10 | 13 | 9 | 8 | 12 | 13 | 15 | 10 | 10 | 16 | 3 | 2 | 3 | 4 | 5 | 5 | 1 | 3 | 13 | 11 | 12 | 5 | 9 | 6 |
| 9 | 9 | 8 | 9 | 10 | 10 | 11 | 11 | 9 | 15 | 11 | 9 | 9 | 17 | 14 | 12 | 12 | 9 | 4 | 12 | 15 | 11 | 12 | 13 | 7 | 10 | 4 | 8 | 13 | 7 | 12 | 12 | 1 | 3 | 2 | 1 | 4 | 4 | 3 | 2 | 10 | 9 | 12 | 11 | 11 | 11 |
| 10 | 9 | 9 | 7 | 10 | 11 | 13 | 12 | 8 | 14 | 13 | 7 | 6 | 12 | 13 | 8 | 14 | 7 | 6 | 5 | 14 | 8 | 11 | 9 | 12 | 8 | 9 | 6 | 7 | 7 | 7 | 9 | 1 | 5 | 2 | 1 | 1 | 2 | 5 | 4 | 9 | 4 | 11 | 15 | 11 | 8 |

## 4. Qualidade dos plantéis por liga (média do melhor onze por OVR)

| Liga | Força desp. | Melhor clube | Média | Pior clube | Melhor jogador |
|---|---:|---:|---:|---:|---:|
| ITA1 Serie A | 88 | 92.5 | 77.0 | 66.3 | 96 |
| ESP1 La Liga | 88 | 92.0 | 75.9 | 66.9 | 95 |
| GER1 Bundesliga | 85 | 90.3 | 75.6 | 66.3 | 95 |
| ENG1 Premier League | 90 | 88.7 | 78.7 | 70.9 | 95 |
| FRA1 Ligue 1 | 76 | 85.9 | 72.5 | 63.9 | 91 |
| POR1 Liga Portugal | 68 | 81.9 | 65.7 | 57.2 | 87 |
| ARG1 Liga Profesional | 58 | 81.0 | 67.1 | 57.8 | 87 |
| BRA1 Brasileirão Série A | 68 | 80.9 | 72.8 | 66.7 | 88 |
| NED1 Eredivisie | 69 | 80.0 | 65.9 | 58.5 | 88 |
| KSA1 Saudi Pro League | 50 | 77.0 | 62.7 | 55.8 | 87 |
| TUR1 Süper Lig | 57 | 76.5 | 65.7 | 56.3 | 84 |
| BEL1 Pro League | 61 | 76.1 | 64.3 | 56.5 | 85 |
| MEX1 Liga MX | 52 | 75.8 | 65.8 | 59.7 | 81 |
| ENG2 Championship | 72 | 73.6 | 65.1 | 61.3 | 80 |
| EUR1 Liga Resto da Europa | 46 | 73.4 | 61.7 | 54.2 | 77 |
| CZE1 Chance Liga | 54 | 73.0 | 62.8 | 56.2 | 79 |
| USA1 MLS | 52 | 73.1 | 64.9 | 57.6 | 81 |
| GRE1 Super League 1 | 54 | 72.5 | 63.8 | 58.0 | 79 |
| AUT1 Bundesliga | 50 | 72.2 | 61.7 | 56.0 | 76 |
| GER2 2. Bundesliga | 62 | 72.2 | 62.3 | 56.9 | 78 |
| AFR1 Liga Africana | 45 | 71.8 | 60.1 | 53.2 | 77 |
| NOR1 Eliteserien | 51 | 70.8 | 60.4 | 54.2 | 76 |
| SCO1 Premiership | 50 | 70.6 | 61.2 | 51.8 | 80 |
| JPN1 J1 League | 49 | 70.1 | 63.7 | 57.9 | 76 |
| CRO1 HNL (SuperSport Hrvatska nogometna liga) | 44 | 69.9 | 59.4 | 50.9 | 75 |
| SUI1 Super League | 50 | 69.9 | 62.7 | 56.8 | 78 |
| COL1 Categoría Primera A | 45 | 69.5 | 61.1 | 55.9 | 81 |
| URU1 Primera División | 44 | 68.6 | 58.0 | 50.0 | 75 |
| ECU1 LigaPro Serie A | 47 | 68.5 | 59.6 | 53.4 | 79 |
| POL1 Ekstraklasa | 51 | 68.0 | 60.8 | 54.8 | 78 |
| DEN1 Superliga | 51 | 68.2 | 61.4 | 54.5 | 73 |
| KOR1 K League 1 | 45 | 67.1 | 61.5 | 56.7 | 73 |
| UAE1 UAE Pro League | 42 | 66.3 | 59.9 | 55.5 | 72 |
| ESP2 Segunda División | 60 | 65.9 | 60.5 | 55.3 | 73 |
| ITA2 Serie B | 58 | 65.6 | 59.3 | 52.9 | 71 |
| BRA2 Brasileirão Série B | 48 | 64.6 | 59.4 | 54.7 | 72 |
| ENG3 League One | 54 | 63.5 | 55.9 | 50.4 | 71 |
| FRA2 Ligue 2 | 52 | 63.4 | 56.5 | 50.8 | 71 |
| GER3 3. Liga | 46 | 61.1 | 54.1 | 49.5 | 70 |
| JPN2 J2 League | 36 | 60.6 | 55.7 | 50.5 | 66 |
| NED2 Eerste Divisie | 38 | 59.4 | 51.4 | 46.1 | 69 |
| POR2 Liga Portugal 2 | 42 | 59.3 | 52.5 | 48.7 | 67 |
| BEL2 Challenger Pro League | 36 | 58.7 | 52.0 | 46.0 | 65 |
| TUR2 1. Lig | 38 | 60.5 | 53.3 | 47.1 | 70 |
| FRA3 Ligue 3 | 36 | 56.1 | 50.6 | 47.8 | 68 |
| SCO2 Championship | 30 | 56.0 | 48.7 | 43.6 | 63 |
| KSA2 First Division League | 30 | 55.4 | 50.1 | 44.2 | 65 |
| ENG4 League Two | 44 | 55.3 | 51.4 | 46.4 | 62 |

## 5. Distribuição de OVR por idade (mundo gerado)

| Idade | Jogadores | OVR médio | Potencial médio | OVR ≥ 80 |
|---|---:|---:|---:|---:|
| 17–19 | 1325 | 46.6 | 67.0 | 5 |
| 20–22 | 3021 | 52.9 | 63.9 | 27 |
| 23–25 | 4906 | 58.2 | 61.9 | 146 |
| 26–28 | 5617 | 58.2 | 60.1 | 156 |
| 29–31 | 3787 | 58.2 | 60.2 | 104 |
| 32–34 | 1890 | 54.9 | 59.2 | 33 |
| 35–38 | 1254 | 49.2 | 58.6 | 9 |

## 6. Curvas de evolução (coortes de 400 jogadores dos 17 aos 38 anos)

Simulação mensal com o módulo de evolução: titulares (parte dos minutos 0.85), treinador neutro (desenvolvimento 10), ocultos gerados. Valor = OVR médio na posição natural.

| Coorte | 17 | 19 | 21 | 23 | 25 | 27 | 29 | 31 | 33 | 35 | 37 | Pico (idade) | Ultrapassou o potencial |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Potencial 90 (campo) | 63.9 | 73.9 | 79.7 | 83.6 | 85.7 | 86.9 | 87.4 | 87.0 | 85.6 | 81.9 | 76.0 | 87.4 (30) | 0 |
| Potencial 75 (campo) | 49.2 | 59.1 | 65.3 | 69.5 | 71.8 | 73.2 | 73.7 | 73.5 | 72.3 | 68.7 | 62.9 | 73.9 (30) | 0 |
| Potencial 60 (campo) | 34.0 | 44.2 | 50.4 | 54.7 | 57.1 | 58.5 | 59.1 | 58.8 | 57.6 | 54.1 | 48.5 | 59.1 (30) | 0 |
| Potencial 80, profissionalismo 18 | 53.7 | 64.5 | 70.7 | 74.9 | 77.0 | 78.3 | 78.8 | 78.6 | 77.7 | 75.0 | 70.6 | 78.9 (30) | 0 |
| Potencial 80, profissionalismo 4 | 54.1 | 63.5 | 69.4 | 73.6 | 76.0 | 77.5 | 78.1 | 77.8 | 76.2 | 71.6 | 64.1 | 78.2 (30) | 0 |
| Guarda-redes potencial 80 | 53.7 | 63.8 | 70.0 | 74.3 | 76.6 | 78.0 | 78.5 | 78.7 | 78.7 | 77.9 | 74.9 | 78.7 (33) | 0 |

## 7. Benchmark de memória e tempo

| Medida | Valor |
|---|---|
| Jogadores | 21 800 |
| Arrays tipados (capacidade alocada 22 672) | 2.55 MB (118 bytes por jogador) |
| Heap total com jogadores, nomes e ids (estimativa por diferença) | 6.2 MB |
| Estimativa para 23 000 jogadores | 2.59 MB em arrays + ~1.3 MB em textos |
| Gerar o mundo sem jogadores / com jogadores | 32 ms / 421 ms |
| Evolução mensal de todos os jogadores | 26 ms |

Nota: a estimativa de heap por diferença inclui o segundo mundo construído; os arrays tipados são a parte que escala.
