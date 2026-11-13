# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.62 golos; casa 45.2%, empate 25.5%, fora 29.3%; 0-0 7.1%; 5+ 12.0%; 7+ 0.8% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.63 golos; casa 44.6%, empate 26.2%, fora 29.2%; 0-0 7.2%; 5+ 12.2%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.30; 96.9% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.54; 96.3% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 6.2; 0 ligas com sempre o mesmo; 4 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 38.1%; um dos 3 favoritos em 65.0% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 463 subidas, 463 descidas, 580 saídas para o exterior, 580 entradas; 39.7% dos que sobem descem logo; 125 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital d0850613 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 572 ms / 722 ms |
| Uma semana de calendário (média / p95 / máx.) | 11.0 ms / 42.0 ms / 145.7 ms |
| Memória (heap) no fim | 161 MB |
| Gravação por época (todos os jogos, gzip) | 69 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 4 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | IKE | IKE | LUM | NGO | NGO | IKE | IKE | IKE | 3 |
| Áustria — Bundesliga | KIR | DOR | DOR | RHE | KRC | EIC | KIR | KIR | KIR | KRC | 5 |
| Bélgica — Pro League | OOS | BEA | BEA | BEA | VER | BEA | BEA | BEA | OOS | BEA | 3 |
| Bélgica — Challenger Pro League | BAU | MAA | VRS | MAA | VRS | MLM | ZND | ROT | BER | MOL | 8 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | NOV | SLA | ZAZ | BRE | ZAZ | 4 |
| Chéquia — Chance Liga | POD | POD | RYC | POD | POD | OST | RYC | POD | POD | POD | 3 |
| Dinamarca — Superliga | BRO | BRO | MOS | BRO | BRO | BRO | STR | BRO | BRO | STR | 3 |
| Inglaterra — Premier League | QUE | CAR | CAR | STO | BRA | SOU | QUE | BRA | STO | BRA | 5 |
| Inglaterra — Championship | PEN | STE | STM | FAL | ASH | STM | EVE | BRO | STM | DNW | 8 |
| Inglaterra — League One | THR | WIT | CAE | AHC | THM | DNM | SHE | PNB | BAC | GIM | 10 |
| Inglaterra — League Two | YRH | SHE | MOR | DNM | CAK | HTH | PNE | FLH | CAE | DNM | 9 |
| Espanha — La Liga | OLM | OLM | OLM | ALC | OLM | MIR | OLM | OLM | OLM | OLM | 3 |
| Espanha — Segunda División | MGA | CER | PRA | CER | SLA | CER | CAL | MIO | CLA | TOR | 8 |
| Europa (resto) — Liga Resto da Europa | FEH | AKE | AKE | KFA | ORI | FEH | FEH | FEH | VAL | KOV | 6 |
| França — Ligue 1 | FNT | FNT | FON | FON | FNT | FNT | MON | COU | COU | FOE | 5 |
| França — Ligue 2 | ROC | FUN | BEA | PES | FOP | SUV | MRF | PES | MRC | BAU | 9 |
| França — Ligue 3 | VLG | PLS | VID | CHE | SEU | CAI | SAT | VIS | BLL | SAU | 10 |
| Alemanha — Bundesliga | GRU | TAN | EIC | TNN | MUH | GRU | TAN | EIC | GRU | TAN | 5 |
| Alemanha — 2. Bundesliga | MUD | GAL | NEU | ZEN | HHE | GUN | BUK | FAL | BUC | HHE | 9 |
| Alemanha — 3. Liga | OBN | WEA | NUB | EIF | OBE | BUK | RHE | WST | ZEA | GRG | 10 |
| Grécia — Super League 1 | ORI | ORI | ORI | ORI | ORI | ORI | ORI | KLA | ORI | ORI | 2 |
| Itália — Serie A | CAS | CAS | CAS | TOR | VLF | CAS | CAS | CAS | TOR | CAS | 3 |
| Itália — Serie B | VLA | PON | PGG | TGO | SRR | PON | BOR | PNT | VIL | PNT | 8 |
| Japão — J1 League | MAT | SAK | MAT | HOS | HAN | HOS | HOS | NGA | FUJ | HAN | 6 |
| Japão — J2 League | TKA | OKA | NGA | YAO | ISO | AKI | OKA | YAO | HAA | YAA | 8 |
| Arábia Saudita — Saudi Pro League | RAY | SID | SID | SID | SID | SID | RAY | SID | SID | SID | 2 |
| Arábia Saudita — First Division League | DAF | FAI | MAN | SHI | RAN | SAA | SAR | SHI | SDR | FAI | 8 |
| México — Liga MX | PRT | ARE | ESP | POR | CIB | POR | TAB | POO | TAB | CEI | 8 |
| Países Baixos — Eredivisie | GRO | ALD | ALD | GRO | GRO | GRO | GRO | GRO | GRO | BOE | 3 |
| Países Baixos — Eerste Divisie | LDE | MEN | RJS | DJK | MER | EEM | EMD | BRE | HOO | DIJ | 10 |
| Polónia — Ekstraklasa | ZIE | STA | MIN | ZIE | RAK | GRO | ZIE | PIA | JAG | ZIE | 7 |
| Portugal — Liga Portugal | CAR | ALV | CAR | ALV | ALV | ALV | ALV | CAR | MAR | ALV | 3 |
| Portugal — Liga Portugal 2 | PNE | MAA | LJE | LAS | PNE | LAS | CDE | LES | MRV | FEI | 8 |
| Escócia — Premiership | ARD | ARD | DAL | DAL | KIL | ARD | ARD | ARD | KIL | CRA | 4 |
| Escócia — Championship | DAN | BEN | DLA | DAN | KNC | INV | BLM | DLA | DLN | BLM | 7 |
| Suíça — Super League | KIR | KIR | BRN | BED | KIR | KIR | KIR | MHL | LIN | KRC | 6 |
| Turquia — Süper Lig | YLD | SUT | YLD | SUT | DMI | YLD | KZL | KZL | SUT | KZL | 4 |
| Turquia — 1. Lig | YOY | DEL | KZY | KAT | DEL | YES | YDZ | YLE | YES | AYA | 8 |
| Emirados Árabes Unidos — UAE Pro League | THU | WHA | THU | NOU | QAM | THU | THU | THU | BUA | THU | 5 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | CEI | CAN | CEI | ALA | CIB | CEI | ARR | MOR | CEI | CIB | 6 |
| Brasil — Brasileirão Série A | PDR | CAS | CAS | PDR | CAS | CAJ | PDR | ANG | ANG | ANG | 4 |
| Brasil — Brasileirão Série B | CAA | PEQ | PAL | BUR | CSC | CDR | GAR | PEQ | JAT | CDR | 8 |
| Colômbia — Categoría Primera A | ARE | FLO | QUE | FLO | CMB | CUE | ALA | CMB | TAB | ARL | 8 |
| Equador — LigaPro Serie A | ALA | TBL | LUC | CUM | LUC | TAB | TAB | ROS | ALA | ALA | 6 |
| Coreia do Sul — K League 1 | NAM | NAM | HWA | MUN | NAM | DAE | DAE | DEJ | NAM | HWA | 5 |
| Noruega — Eliteserien | ASV | ASV | SKO | FJE | ELV | NOR | BJR | BER | LIL | LIE | 9 |
| Uruguai — Primera División | ROS | ROS | ROS | CRR | PAL | MIR | CRR | ROS | SOD | SOL | 6 |
| EUA (MLS) — MLS | SIL | REA | IRO | SMM | RED | SIL | SUN | SUM | FLC | PIN | 9 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 108.7 / 95 / 128 | 29.5 / 16 / 42 |
| Áustria — Bundesliga | 22 | 49.7 / 43 / 58 | 12.7 / 7 / 19 |
| Bélgica — Pro League | 30 | 70.1 / 60 / 77 | 16.6 / 12 / 21 |
| Bélgica — Challenger Pro League | 28 | 60.0 / 49 / 70 | 19.9 / 15 / 24 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 85.2 / 69 / 97 | 20.2 / 6 / 32 |
| Chéquia — Chance Liga | 30 | 69.2 / 57 / 81 | 16.1 / 6 / 25 |
| Dinamarca — Superliga | 22 | 48.4 / 42 / 54 | 14.1 / 8 / 20 |
| Inglaterra — Premier League | 38 | 92.5 / 80 / 104 | 17.8 / 10 / 27 |
| Inglaterra — Championship | 46 | 104.4 / 89 / 121 | 25.0 / 12 / 37 |
| Inglaterra — League One | 46 | 101.0 / 89 / 113 | 25.4 / 20 / 36 |
| Inglaterra — League Two | 46 | 99.6 / 89 / 111 | 29.8 / 22 / 41 |
| Espanha — La Liga | 38 | 95.0 / 85 / 106 | 18.9 / 2 / 29 |
| Espanha — Segunda División | 42 | 104.7 / 93 / 111 | 23.9 / 17 / 29 |
| Europa (resto) — Liga Resto da Europa | 38 | 84.4 / 78 / 94 | 23.5 / 15 / 32 |
| França — Ligue 1 | 34 | 86.0 / 74 / 100 | 14.7 / 7 / 20 |
| França — Ligue 2 | 34 | 76.8 / 72 / 85 | 22.5 / 19 / 28 |
| França — Ligue 3 | 38 | 86.0 / 75 / 97 | 22.1 / 13 / 28 |
| Alemanha — Bundesliga | 34 | 79.4 / 74 / 84 | 17.6 / 9 / 23 |
| Alemanha — 2. Bundesliga | 34 | 74.9 / 61 / 86 | 22.2 / 16 / 27 |
| Alemanha — 3. Liga | 38 | 85.1 / 73 / 100 | 21.0 / 13 / 27 |
| Grécia — Super League 1 | 26 | 61.9 / 49 / 71 | 14.2 / 11 / 17 |
| Itália — Serie A | 38 | 92.9 / 86 / 106 | 16.5 / 7 / 26 |
| Itália — Serie B | 38 | 90.8 / 79 / 107 | 19.1 / 10 / 24 |
| Japão — J1 League | 38 | 82.0 / 73 / 95 | 23.0 / 20 / 28 |
| Japão — J2 League | 38 | 81.4 / 72 / 96 | 21.0 / 13 / 27 |
| Arábia Saudita — Saudi Pro League | 34 | 81.5 / 70 / 91 | 14.6 / 8 / 25 |
| Arábia Saudita — First Division League | 34 | 79.4 / 71 / 88 | 15.7 / 7 / 24 |
| México — Liga MX | 34 | 70.4 / 62 / 87 | 19.2 / 10 / 28 |
| Países Baixos — Eredivisie | 34 | 84.5 / 69 / 95 | 17.4 / 13 / 26 |
| Países Baixos — Eerste Divisie | 38 | 85.0 / 76 / 94 | 22.3 / 16 / 29 |
| Polónia — Ekstraklasa | 34 | 72.2 / 61 / 81 | 18.6 / 8 / 30 |
| Portugal — Liga Portugal | 34 | 86.5 / 73 / 94 | 9.6 / 5 / 15 |
| Portugal — Liga Portugal 2 | 34 | 79.2 / 71 / 82 | 18.8 / 11 / 29 |
| Escócia — Premiership | 33 | 77.4 / 66 / 89 | 15.4 / 5 / 25 |
| Escócia — Championship | 36 | 78.8 / 72 / 91 | 23.1 / 13 / 30 |
| Suíça — Super League | 33 | 77.0 / 66 / 85 | 20.0 / 11 / 26 |
| Turquia — Süper Lig | 38 | 94.0 / 84 / 110 | 15.1 / 5 / 26 |
| Turquia — 1. Lig | 38 | 91.4 / 75 / 103 | 22.8 / 14 / 33 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 58.1 / 51 / 67 | 13.4 / 1 / 19 |
| Argentina — Liga Profesional | 29 | 69.9 / 62 / 78 | 13.7 / 9 / 21 |
| Brasil — Brasileirão Série A | 38 | 85.2 / 77 / 94 | 19.3 / 13 / 30 |
| Brasil — Brasileirão Série B | 38 | 89.4 / 82 / 101 | 21.7 / 13 / 29 |
| Colômbia — Categoría Primera A | 38 | 84.6 / 76 / 92 | 20.6 / 10 / 27 |
| Equador — LigaPro Serie A | 30 | 67.8 / 55 / 77 | 13.2 / 3 / 19 |
| Coreia do Sul — K League 1 | 33 | 68.8 / 59 / 79 | 23.3 / 19 / 28 |
| Noruega — Eliteserien | 30 | 64.5 / 53 / 78 | 14.3 / 9 / 21 |
| Uruguai — Primera División | 30 | 69.7 / 57 / 88 | 16.6 / 10 / 25 |
| EUA (MLS) — MLS | 29 | 64.0 / 57 / 69 | 15.0 / 11 / 22 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 3-1 |
| 2026/27 | Liga dos Campeões | Atlético de Torre de Carvide (POR) | SV Mühlwangen (GER) | 1-0 |
| 2026/27 | Liga Conferência | SS Valfranco (ITA) | CD Salatejo (ESP) | 2-0 |
| 2026/27 | Liga Europa | Eintracht Grüntal (GER) | Olmedosa CF (ESP) | 2-1 |
| 2027 | Libertadores | Rio do Angico Futebol Clube (BRA) | Atlético Pouso das Pedras (BRA) | 3-0 |
| 2027/28 | Liga dos Campeões Asiática | Wadi Thuraya Club (UAE) | Namgok Citizen (KOR) | 2-1 (a.p.) |
| 2027/28 | Liga dos Campeões | Olmedosa CF (ESP) | SV Mühlwangen (GER) | 1-0 |
| 2027/28 | Liga Conferência | Real Calamonte (ESP) | Stourby City (ENG) | 6-0 |
| 2027/28 | Liga Europa | Eintracht Steiningen (GER) | Carnley Albion (ENG) | 3-2 (a.p.) |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Unión de Colonia Alamos (ARG) | 2-1 (a.p.) |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Stella Hoshigawa (JPN) | 2-1 (a.p.) |
| 2028/29 | Liga dos Campeões | Eintracht Steiningen (GER) | Olmedosa CF (ESP) | 2-1 |
| 2028/29 | Liga Conferência | Virtus Casteldorato (ITA) | Kızılpınarspor (TUR) | 3-0 |
| 2028/29 | Liga Europa | SC Zelltal (GER) | Brackcombe Town (ENG) | 2-1 |
| 2029 | Libertadores | Atlético Pouso das Pedras (BRA) | Esporte Clube Ribeirão da Cascata (BRA) | 1-1 (a.p.) 5-3 g.p. |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 2-1 |
| 2029/30 | Liga dos Campeões | FC Casteldorato (ITA) | Quendale Athletic (ENG) | 1-0 |
| 2029/30 | Liga Conferência | Eintracht Grünheim (GER) | Ironi Kfar Shaked (ISR) | 3-1 (a.p.) |
| 2029/30 | Liga Europa | AS Torrefranco (ITA) | Stourmercombe City (ENG) | 3-1 |
| 2030 | Libertadores | Atlético Pouso das Pedras (BRA) | Campo dos Ventos Futebol Clube (BRA) | 2-0 |
| 2030/31 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 2-0 |
| 2030/31 | Liga dos Campeões | AS Fonteroc (FRA) | Stourmercombe City (ENG) | 4-1 (a.p.) |
| 2030/31 | Liga Conferência | Olmevega CF (ESP) | Demiryurt FK (TUR) | 1-0 (a.p.) |
| 2030/31 | Liga Europa | Clube Desportivo de Serra de Marvila (POR) | Brackcombe Town (ENG) | 2-1 |
| 2031 | Libertadores | Esporte Clube Ribeirão da Cascata (BRA) | Clube Atlético Pouso das Pedras (BRA) | 3-0 |
| 2031/32 | Liga dos Campeões Asiática | Azul Hanazawa (JPN) | Al Sidra Club (KSA) | 2-1 (a.p.) |
| 2031/32 | Liga dos Campeões | Brackcombe Town (ENG) | Olmedosa CF (ESP) | 2-1 |
| 2031/32 | Liga Conferência | Yıldızderespor (TUR) | Stourby City (ENG) | 0-0 (a.p.) 4-2 g.p. |
| 2031/32 | Liga Europa | Eversbridge United (ENG) | AS Torrefranco (ITA) | 3-1 |
| 2032 | Libertadores | Esporte Clube Ribeirão da Cascata (BRA) | Unión de Puerto Ceibos (ARG) | 1-0 |
| 2032/33 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Ain Thuraya FC (KSA) | 1-0 |
| 2032/33 | Liga dos Campeões | Quendale Athletic (ENG) | Virtus Casteldorato (ITA) | 1-0 (a.p.) |
| 2032/33 | Liga Conferência | Fontemarino Calcio (ITA) | CD Tarrariza (ESP) | 2-1 (a.p.) |
| 2032/33 | Liga Europa | SS Valfranco (ITA) | Kızılpınarspor (TUR) | 2-0 |
| 2033 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 3-0 |
| 2033/34 | Liga dos Campeões Asiática | Ras Saqr FC (KSA) | Stella Hoshigawa (JPN) | 2-1 (a.p.) |
| 2033/34 | Liga dos Campeões | UD Mirallosa (ESP) | Brackcombe Town (ENG) | 0-0 (a.p.) 4-2 g.p. |
| 2033/34 | Liga Conferência | SC Zelltal (GER) | Stourby City (ENG) | 2-1 (a.p.) |
| 2033/34 | Liga Europa | Racing Club de Saint-Court (FRA) | Stourmercombe City (ENG) | 2-0 |
| 2034 | Libertadores | Rio do Angico Futebol Clube (BRA) | Ferro Paso Moreira (ARG) | 3-0 |
| 2034/35 | Liga dos Campeões Asiática | Wadi Bustan Club (UAE) | Munrim Dragons (KOR) | 2-1 |
| 2034/35 | Liga dos Campeões | Albarrada CF (ESP) | FC Grüntal (GER) | 2-0 |
| 2034/35 | Liga Conferência | SS Valchiaro (ITA) | Eintracht Steiningen (GER) | 2-2 (a.p.) 5-4 g.p. |
| 2034/35 | Liga Europa | US Rocnuovo (ITA) | Stourmerport City (ENG) | 5-0 |
| 2035 | Libertadores | Rio do Angico Futebol Clube (BRA) | Esporte Clube Ribeirão da Cascata (BRA) | 2-1 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Wadi Dhafra Club (KSA) | 2-0 |
| 2035/36 | Liga dos Campeões | Olmedosa CF (ESP) | SC Fonteville (FRA) | 1-0 |
| 2035/36 | Liga Conferência | Sporting Beausart (BEL) | Grüntaler SV (GER) | 3-1 |
| 2035/36 | Liga Europa | Quendale Athletic (ENG) | CD Salatejo (ESP) | 1-0 |
| 2036 | Libertadores | Rio do Angico Futebol Clube (BRA) | Grêmio Campo do Cajueiro (BRA) | 2-1 |

Títulos por país: Libertadores — BRA: 10; Liga dos Campeões Asiática — KSA: 5; Liga Conferência — ITA: 4; Liga dos Campeões — ESP: 4; Liga dos Campeões Asiática — JPN: 3; Liga Europa — GER: 3; Liga Europa — ITA: 3; Liga dos Campeões Asiática — UAE: 2; Liga Conferência — ESP: 2; Liga Conferência — GER: 2; Liga dos Campeões — ENG: 2; Liga Europa — ENG: 2; Liga dos Campeões — POR: 1; Liga dos Campeões — GER: 1; Liga dos Campeões — ITA: 1; Liga dos Campeões — FRA: 1; Liga Europa — POR: 1; Liga Conferência — TUR: 1; Liga Europa — FRA: 1; Liga Conferência — BEL: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | GER1 16.29, POR1 15.08, FRA1 14.43 | GER1, POR1 | Atlético de Torre de Carvide (POR) / Eintracht Grüntal (GER) / SS Valfranco (ITA) |
| 2027/28 | ESP1 16.43, ENG1 16.21, GER1 15.72 | ESP1, ENG1 | Olmedosa CF (ESP) / Eintracht Steiningen (GER) / Real Calamonte (ESP) |
| 2028/29 | ENG1 16.63, GER1 15.56, ITA1 14.29 | ENG1, GER1 | Eintracht Steiningen (GER) / SC Zelltal (GER) / Virtus Casteldorato (ITA) |
| 2029/30 | ITA1 18.25, ENG1 17.06, ESP1 13.57 | ITA1, ENG1 | FC Casteldorato (ITA) / AS Torrefranco (ITA) / Eintracht Grünheim (GER) |
| 2030/31 | ENG1 18.25, FRA1 16.86, ESP1 13.79 | ENG1, FRA1 | AS Fonteroc (FRA) / Clube Desportivo de Serra de Marvila (POR) / Olmevega CF (ESP) |
| 2031/32 | ENG1 17.56, ESP1 14.38, GER1 13.71 | ENG1, ESP1 | Brackcombe Town (ENG) / Eversbridge United (ENG) / Yıldızderespor (TUR) |
| 2032/33 | ITA1 18.50, ESP1 14.56, POR1 14.33 | ITA1, ESP1 | Quendale Athletic (ENG) / SS Valfranco (ITA) / Fontemarino Calcio (ITA) |
| 2033/34 | ENG1 17.19, ESP1 16.25, GER1 13.07 | ENG1, ESP1 | UD Mirallosa (ESP) / Racing Club de Saint-Court (FRA) / SC Zelltal (GER) |
| 2034/35 | ESP1 17.28, GER1 16.63, ITA1 15.50 | ESP1, GER1 | Albarrada CF (ESP) / US Rocnuovo (ITA) / SS Valchiaro (ITA) |
| 2035/36 | ENG1 18.93, ESP1 15.78, GER1 13.56 | ENG1, ESP1 | Olmedosa CF (ESP) / Quendale Athletic (ENG) / Sporting Beausart (BEL) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | BUC | DOR | DOR | FAL | KIR | DOR | REI | DOR | DRN |
| Taça da Bélgica (Bélgica) | VER | VER | WES | BEA | BEA | BEA | HOO | BEA | OOS | HOO |
| Taça da Croácia (Croácia) | NOV | ZAZ | ZAZ | VIK | ZAZ | ZAZ | VIK | ZAZ | ZAZ | ZAZ |
| Taça da Chéquia (Chéquia) | SLA | OST | POD | POD | POD | LHN | RYC | LHN | POD | POD |
| Taça da Dinamarca (Dinamarca) | VES | SOL | MOS | HED | BRO | BRO | SOL | BRO | HED | STR |
| FA Cup (Inglaterra) | CAR | NET | CAR | QUE | STO | SOU | CAR | STY | QUE | SOU |
| EFL Cup (Carabao Cup) (Inglaterra) | QUE | HAT | BRO | QUE | CAR | CAR | QUE | BRA | STO | BRA |
| Copa del Rey (Espanha) | OLM | OLM | MIR | OLM | SLA | ALC | OLM | ALB | ALC | OLM |
| Coupe de France (França) | PLE | PLE | MON | FON | MON | FOE | FOE | COU | COU | VIL |
| DFB-Pokal (Alemanha) | STE | GRU | GRL | STE | GRU | MHL | TNN | EIC | ZEL | HOH |
| Taça da Grécia (Grécia) | CHO | ORI | ORI | ORI | ORI | ORI | STA | ORI | PER | KAL |
| Coppa Italia (Itália) | FON | VAL | VAL | TOR | FOO | CAS | TOR | FON | VLF | CAS |
| Emperor's Cup (Japão) | KIR | MAT | SAA | MAT | FUJ | NAG | HOS | OKA | SAK | HOS |
| J.League Cup (Japão) | SAK | MAT | SAK | OKA | HOS | TKA | MAT | MAT | YAM | HAA |
| King's Cup (Arábia Saudita) | RAY | SID | DHA | SID | SID | SID | RYY | SAQ | BAR | SID |
| KNVB Beker (Países Baixos) | GRO | GRO | GRO | ALD | RIJ | ALD | GRO | GRO | GRO | RIJ |
| Taça da Polónia (Polónia) | RKO | MIS | MIS | PIA | STA | JAG | PIA | PIA | WON | RAK |
| Taça de Portugal (Portugal) | CAR | CAR | FRE | CAR | ALV | ALV | CAR | ALV | ALV | VLE |
| Taça da Liga (Portugal) | CAR | CAR | ALV | FON | CAR | ALV | CAR | ALV | ALV | ALV |
| Scottish Cup (Escócia) | CRA | DAL | DAL | KNL | ARD | KNC | ARD | ARD | DAL | KIL |
| Scottish League Cup (Escócia) | ARD | ARD | DAL | LOC | ARD | ARD | ARD | KNC | ARD | CRA |
| Taça da Suíça (Suíça) | KIR | KIR | BRN | KIR | DOR | KIR | KIR | KIR | WLD | KIR |
| Taça da Turquia (Turquia) | YLD | DAG | KZL | SUT | DEM | YLD | GOK | KZL | KZL | DMI |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | DHA | BUS | RIM | RIM | DHA | BST | SID | SID | THU |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CEI | PIN | ARR | ALA | ALA | MOR | CAN | CEI | CEI | ARR |
| Copa do Brasil (Brasil) | PED | PED | PDR | PDR | CAS | JAT | PDR | ANG | ANG | PED |
| Copa Colombia (Colômbia) | FLO | ALA | ARE | FLO | LUC | QUE | CMB | TAB | POR | AEN |
| Copa Equador (Equador) | COR | SOL | ARE | LUC | LUC | TAB | ALA | TBL | ALA | AUA |
| Korean FA Cup (Coreia do Sul) | NAM | HWA | HWA | MUN | JIN | NMC | NAM | MNC | HAD | NAM |
| Taça da Noruega (Noruega) | LIE | SKO | BER | FJE | BED | LIE | FJE | FJE | STA | ASV |
| Copa Uruguai (Uruguai) | CRR | PAL | SOL | SOL | PAL | CUM | MIR | COL | SOL | CRR |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 41 | 41 | 2 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 42 | 42 | 3 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 43 | 43 | 4 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 42 | 42 | 3 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 42 | 42 | 3 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 44 | 44 | 5 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 41 | 41 | 2 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 43 | 43 | 4 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 44 | 44 | 5 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 41 | 41 | 2 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
