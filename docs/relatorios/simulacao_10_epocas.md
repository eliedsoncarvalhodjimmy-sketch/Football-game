# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.55 golos; casa 45.4%, empate 24.6%, fora 30.0%; 0-0 8.0%; 5+ 11.7%; 7+ 0.9% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.53 golos; casa 45.2%, empate 25.1%, fora 29.7%; 0-0 8.2%; 5+ 11.3%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.34; 94.0% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.62; 98.3% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.0; 0 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 48.8%; um dos 3 favoritos em 83.1% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 456 subidas, 456 descidas, 580 saídas para o exterior, 580 entradas; 42.3% dos que sobem descem logo; 136 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 82dee03 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 4785 ms / 5831 ms |
| Uma semana de calendário (média / p95 / máx.) | 92.1 ms / 180.6 ms / 306.5 ms |
| Memória (heap) no fim | 298 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 5 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | IKE | ADE | ADE | ADE | KEB | ADE | KEB | HAJ | 4 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | DOR | DOR | KIR | BUC | BUC | 3 |
| Bélgica — Pro League | VER | VER | VER | BEA | BEA | BEA | BEA | BEA | VER | BEA | 2 |
| Bélgica — Challenger Pro League | BAU | VRS | MAA | BAU | LER | BAU | MLM | BAU | HER | LER | 6 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | SLA | ZAZ | SLA | ZAZ | BRE | NOJ | NOJ | 4 |
| Chéquia — Chance Liga | LUH | POD | LUH | LUH | POD | POD | LUH | LHN | POD | LUH | 3 |
| Dinamarca — Superliga | VES | VES | BRO | BRO | VES | BRO | SER | STE | BRO | BRO | 4 |
| Inglaterra — Premier League | BRA | BRA | CAR | CAR | CAR | BRA | CAR | CAR | QUE | QUE | 3 |
| Inglaterra — Championship | FAL | RAD | ASH | STM | STY | OAK | DNC | FAL | ASH | EVE | 8 |
| Inglaterra — League One | BRH | GRM | THR | ELV | AHC | FLW | DNW | PEN | TOR | HOL | 10 |
| Inglaterra — League Two | LNG | FLH | KEL | DUY | PNC | MER | OKP | KEL | FLH | QUT | 8 |
| Espanha — La Liga | RIB | OLM | RIB | ALB | ALC | ALC | ALC | ALC | MIR | ALB | 5 |
| Espanha — Segunda División | MNM | LOR | HNO | TRR | CER | HNO | MNM | TON | CER | MIA | 7 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | AKE | FEH | FEH | FEH | FEH | FEH | FEH | FEH | 2 |
| França — Ligue 1 | FNT | FON | FON | FON | BEL | FON | FON | FNT | FON | FNT | 3 |
| França — Ligue 2 | PES | SAU | CLA | CHA | MRF | CLA | MAR | BEA | CHA | SAU | 7 |
| França — Ligue 3 | CAI | VLG | VIS | SAT | CHE | VLG | BEE | CAI | VID | VRB | 8 |
| Alemanha — Bundesliga | MUH | MUH | MUH | MUH | MUH | GRU | GRU | MUH | GRU | GRU | 2 |
| Alemanha — 2. Bundesliga | SEI | WES | NEU | ZLL | GUN | NEU | HHE | GRL | SEI | GAL | 8 |
| Alemanha — 3. Liga | STN | WST | BUK | FAL | STM | FAL | WST | GRG | STM | RHE | 7 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | ORI | ORI | PER | ORI | PER | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | CAS | CAS | VAL | CAS | CAS | 2 |
| Itália — Serie B | TGO | POO | PNT | VLC | ROC | FON | TOO | PNT | TGO | TOO | 7 |
| Japão — J1 League | MAT | MAT | MAT | MAT | MAT | MAT | MAT | MAT | MAT | HAN | 2 |
| Japão — J2 League | SAA | HNA | YAA | YAM | SAK | YAE | TKA | YNO | NGA | KII | 10 |
| Arábia Saudita — Saudi Pro League | RAY | SID | THU | SID | SID | SID | RAY | SID | SID | SID | 3 |
| Arábia Saudita — First Division League | SAR | SHI | BRQ | QMA | DAF | THA | BRQ | BAQ | SQR | BAQ | 8 |
| México — Liga MX | PRT | ESP | POO | CEI | POR | POR | POR | CEI | POR | POR | 5 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | RIJ | ADE | GRO | GRO | ADE | GRO | MEE | 4 |
| Países Baixos — Eerste Divisie | EMD | MER | LDE | SLO | GRN | LED | LDE | GOV | DJK | LDE | 8 |
| Polónia — Ekstraklasa | MIS | PIA | MIS | GOS | MIS | MIS | ZIE | PIA | ZIE | STA | 5 |
| Portugal — Liga Portugal | CAR | ALV | CAR | CAR | CAR | FEI | CAR | CAR | ALV | CAR | 3 |
| Portugal — Liga Portugal 2 | VAE | PEN | CRV | AVA | CRV | VAE | LAG | FRO | LAG | MAR | 7 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | KIL | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | ADL | BEN | ADL | BEN | INV | KNC | ADL | BAL | KNL | 7 |
| Suíça — Super League | KIR | BER | KIR | BER | KIR | KIR | MUH | KIR | KIR | KIR | 3 |
| Turquia — Süper Lig | KZL | KZL | DEM | KZL | SUT | DAG | KZL | KZL | KZL | DEM | 4 |
| Turquia — 1. Lig | KAR | CAM | KAR | DGT | KLC | GOK | KLD | YDZ | DEL | YOY | 9 |
| Emirados Árabes Unidos — UAE Pro League | RIM | THU | THU | RIM | RIM | THU | MAN | THU | THU | THU | 3 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | CHA | CEI | CEI | CIB | CEI | QUI | QUI | QUI | CHA | CEI | 4 |
| Brasil — Brasileirão Série A | PDR | PED | PED | PED | SER | PDR | CAJ | ANG | PDR | CAJ | 5 |
| Brasil — Brasileirão Série B | ANO | VEN | AGI | ANO | JAT | PEQ | AGI | JAT | PEQ | VEN | 5 |
| Colômbia — Categoría Primera A | LUC | TAB | TAB | QUE | TAB | FLO | ARE | ALA | QUE | QUE | 6 |
| Equador — LigaPro Serie A | COR | TAB | COR | ALA | ROS | ALA | ROS | TAB | ROS | TAB | 4 |
| Coreia do Sul — K League 1 | HAD | DAE | HAD | JIN | DAE | NAM | HAD | DAE | DAE | HAD | 4 |
| Noruega — Eliteserien | LIE | ASV | ASV | LIE | LIE | SKO | LIE | LIL | LIE | SKO | 4 |
| Uruguai — Primera División | PAL | COR | ROS | PAL | ROS | PAL | COR | ROS | ROS | ROS | 3 |
| EUA (MLS) — MLS | SUM | BAY | PIN | SUM | SUM | BAY | SUM | FAL | IRO | SUM | 5 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 102.9 / 92 / 114 | 30.6 / 21 / 39 |
| Áustria — Bundesliga | 22 | 49.2 / 40 / 57 | 14.1 / 6 / 20 |
| Bélgica — Pro League | 30 | 69.6 / 64 / 77 | 20.3 / 14 / 24 |
| Bélgica — Challenger Pro League | 28 | 59.7 / 52 / 72 | 20.5 / 15 / 29 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 86.2 / 75 / 99 | 21.0 / 13 / 27 |
| Chéquia — Chance Liga | 30 | 69.6 / 58 / 84 | 14.9 / 11 / 25 |
| Dinamarca — Superliga | 22 | 50.9 / 45 / 61 | 12.4 / 6 / 18 |
| Inglaterra — Premier League | 38 | 97.8 / 86 / 112 | 16.5 / 9 / 25 |
| Inglaterra — Championship | 46 | 113.3 / 93 / 133 | 33.1 / 26 / 43 |
| Inglaterra — League One | 46 | 105.0 / 92 / 116 | 31.5 / 20 / 42 |
| Inglaterra — League Two | 46 | 92.9 / 84 / 105 | 37.3 / 29 / 42 |
| Espanha — La Liga | 38 | 99.0 / 87 / 114 | 15.3 / 5 / 25 |
| Espanha — Segunda División | 42 | 100.0 / 87 / 114 | 30.4 / 28 / 34 |
| Europa (resto) — Liga Resto da Europa | 38 | 91.8 / 77 / 103 | 25.8 / 19 / 31 |
| França — Ligue 1 | 34 | 85.4 / 76 / 93 | 17.4 / 10 / 23 |
| França — Ligue 2 | 34 | 76.9 / 66 / 86 | 22.3 / 14 / 28 |
| França — Ligue 3 | 38 | 77.6 / 66 / 91 | 28.0 / 23 / 39 |
| Alemanha — Bundesliga | 34 | 87.7 / 79 / 98 | 18.3 / 11 / 26 |
| Alemanha — 2. Bundesliga | 34 | 80.4 / 72 / 95 | 21.6 / 15 / 27 |
| Alemanha — 3. Liga | 38 | 83.0 / 69 / 93 | 24.7 / 11 / 30 |
| Grécia — Super League 1 | 26 | 61.5 / 53 / 69 | 12.5 / 1 / 20 |
| Itália — Serie A | 38 | 101.4 / 86 / 112 | 17.2 / 6 / 27 |
| Itália — Serie B | 38 | 92.4 / 85 / 101 | 27.6 / 24 / 36 |
| Japão — J1 League | 38 | 91.4 / 79 / 114 | 26.2 / 22 / 33 |
| Japão — J2 League | 38 | 84.6 / 68 / 95 | 26.8 / 23 / 32 |
| Arábia Saudita — Saudi Pro League | 34 | 82.9 / 67 / 93 | 20.1 / 15 / 24 |
| Arábia Saudita — First Division League | 34 | 75.8 / 66 / 88 | 23.8 / 18 / 29 |
| México — Liga MX | 34 | 79.5 / 71 / 92 | 21.9 / 15 / 29 |
| Países Baixos — Eredivisie | 34 | 82.3 / 75 / 90 | 18.9 / 10 / 26 |
| Países Baixos — Eerste Divisie | 38 | 77.2 / 70 / 84 | 30.5 / 21 / 36 |
| Polónia — Ekstraklasa | 34 | 75.0 / 67 / 85 | 21.4 / 14 / 29 |
| Portugal — Liga Portugal | 34 | 89.2 / 73 / 99 | 14.0 / 7 / 22 |
| Portugal — Liga Portugal 2 | 34 | 75.7 / 66 / 86 | 27.2 / 20 / 35 |
| Escócia — Premiership | 33 | 85.2 / 71 / 93 | 19.9 / 11 / 29 |
| Escócia — Championship | 36 | 77.1 / 66 / 103 | 28.4 / 23 / 34 |
| Suíça — Super League | 33 | 75.5 / 68 / 81 | 21.7 / 17 / 29 |
| Turquia — Süper Lig | 38 | 97.4 / 87 / 107 | 23.9 / 18 / 31 |
| Turquia — 1. Lig | 38 | 89.2 / 79 / 100 | 27.3 / 18 / 40 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 57.9 / 51 / 69 | 18.6 / 12 / 24 |
| Argentina — Liga Profesional | 29 | 73.2 / 66 / 80 | 13.8 / 6 / 20 |
| Brasil — Brasileirão Série A | 38 | 91.8 / 84 / 101 | 17.0 / 10 / 26 |
| Brasil — Brasileirão Série B | 38 | 94.8 / 87 / 102 | 22.6 / 13 / 31 |
| Colômbia — Categoría Primera A | 38 | 87.1 / 76 / 101 | 23.4 / 14 / 29 |
| Equador — LigaPro Serie A | 30 | 67.1 / 62 / 76 | 14.9 / 8 / 19 |
| Coreia do Sul — K League 1 | 33 | 67.7 / 55 / 77 | 24.9 / 20 / 36 |
| Noruega — Eliteserien | 30 | 68.1 / 61 / 74 | 16.8 / 6 / 23 |
| Uruguai — Primera División | 30 | 74.4 / 67 / 80 | 15.2 / 8 / 23 |
| EUA (MLS) — MLS | 29 | 68.1 / 59 / 78 | 17.6 / 8 / 26 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Al Sidra Club (KSA) | 1-0 (a.p.) |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 2-1 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | SC Grüntal (GER) | 3-0 |
| 2026/27 | Liga Europa | Caldale Albion (ENG) | Olmedosa CF (ESP) | 2-0 (a.p.) |
| 2027 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |
| 2027/28 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Jabal Rimal Club (UAE) | 5-0 |
| 2027/28 | Liga dos Campeões | Brackcombe Town (ENG) | AS Torrefranco (ITA) | 2-0 |
| 2027/28 | Liga Conferência | KV Herengem (BEL) | Kızılçay Belediyespor (TUR) | 2-0 |
| 2027/28 | Liga Europa | FC Podín nad Lesem (CZE) | Dunbury Wanderers (ENG) | 1-0 |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 4-1 |
| 2028/29 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Al Sidra Club (KSA) | 2-1 |
| 2028/29 | Liga dos Campeões | AS Fonteville (FRA) | Eintracht Steiningen (GER) | 2-0 |
| 2028/29 | Liga Conferência | UD Mirallosa (ESP) | AJ Villegarde (FRA) | 3-0 |
| 2028/29 | Liga Europa | Fontemarino Calcio (ITA) | Demiryurtspor (TUR) | 1-1 (a.p.) 4-2 g.p. |
| 2029 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 2-1 (a.p.) |
| 2029/30 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Ain Thuraya Club (KSA) | 2-0 |
| 2029/30 | Liga dos Campeões | AS Fonteville (FRA) | FC Casteldorato (ITA) | 2-0 |
| 2029/30 | Liga Conferência | CD Salatejo (ESP) | AS Montbrun (FRA) | 2-0 |
| 2029/30 | Liga Europa | UD Mirallosa (ESP) | AS Torrefranco (ITA) | 2-1 |
| 2030 | Libertadores | Grêmio Campo do Cajueiro (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 (a.p.) |
| 2030/31 | Liga dos Campeões Asiática | Fortuna Kirisaki (JPN) | Azul Hanazawa (JPN) | 3-0 |
| 2030/31 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 4-1 |
| 2030/31 | Liga Conferência | TSV Tannau (GER) | União de Casal das Lajes (POR) | 0-0 (a.p.) 3-2 g.p. |
| 2030/31 | Liga Europa | Yarmerholt Borough (ENG) | SpVgg Mühlberg (GER) | 3-1 |
| 2031 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-0 (a.p.) |
| 2031/32 | Liga dos Campeões Asiática | Daeju Hawks (KOR) | Al Sidra Club (KSA) | 2-1 |
| 2031/32 | Liga dos Campeões | Brackcombe Town (ENG) | FC Casteldorato (ITA) | 3-2 |
| 2031/32 | Liga Conferência | Netherenwick Wanderers (ENG) | SC Zelltal (GER) | 4-0 |
| 2031/32 | Liga Europa | Olmedosa CF (ESP) | Baník Luhov (CZE) | 2-0 |
| 2032 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 (a.p.) |
| 2032/33 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Matsuno FC (JPN) | 2-2 (a.p.) 5-4 g.p. |
| 2032/33 | Liga dos Campeões | CF Alcormonte (ESP) | AS Torrefranco (ITA) | 4-2 |
| 2032/33 | Liga Conferência | SC Bloemveen (NED) | SC Zelltal (GER) | 2-2 (a.p.) 4-3 g.p. |
| 2032/33 | Liga Europa | Netherenwick Wanderers (ENG) | SS Valfranco (ITA) | 1-0 |
| 2033 | Libertadores | Club Atlético Puerto Chañares (ARG) | Grêmio Campo do Cajueiro (BRA) | 3-0 |
| 2033/34 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-0 |
| 2033/34 | Liga dos Campeões | Olmedosa CF (ESP) | Carnley Albion (ENG) | 0-0 (a.p.) 5-4 g.p. |
| 2033/34 | Liga Conferência | US Montechiaro (ITA) | Eintracht Grünheim (GER) | 2-1 |
| 2033/34 | Liga Europa | SS Valchiaro (ITA) | Achilles Rijszand (NED) | 2-0 |
| 2034 | Libertadores | Rio do Angico Futebol Clube (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 0-0 (a.p.) 5-4 g.p. |
| 2034/35 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 3-0 |
| 2034/35 | Liga Conferência | AC Fontebello (ITA) | Stourby City (ENG) | 2-2 (a.p.) 5-4 g.p. |
| 2034/35 | Liga Europa | SpVgg Mühlberg (GER) | Futebol Clube de Azenha de Alvarim (POR) | 0-0 (a.p.) 5-4 g.p. |
| 2035 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Daeju Hawks (KOR) | 2-1 |
| 2035/36 | Liga dos Campeões | FC Casteldorato (ITA) | FC Grüntal (GER) | 2-1 (a.p.) |
| 2035/36 | Liga Conferência | Real Riberrada (ESP) | TSV Tannau (GER) | 1-0 (a.p.) |
| 2035/36 | Liga Europa | CF Alcormonte (ESP) | Netherenwick Wanderers (ENG) | 3-0 |
| 2036 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Villa Quintana (ARG) | 2-1 |

Títulos por país: Libertadores — BRA: 9; Liga dos Campeões Asiática — KSA: 5; Liga dos Campeões Asiática — JPN: 4; Liga dos Campeões — ITA: 3; Liga Europa — ENG: 3; Liga dos Campeões — ENG: 3; Liga Conferência — ESP: 3; Liga Europa — ESP: 3; Liga Conferência — ENG: 2; Liga dos Campeões — FRA: 2; Liga Europa — ITA: 2; Liga dos Campeões — ESP: 2; Liga Conferência — ITA: 2; Liga Conferência — BEL: 1; Liga Europa — CZE: 1; Liga Conferência — GER: 1; Liga dos Campeões Asiática — KOR: 1; Liga Conferência — NED: 1; Libertadores — ARG: 1; Liga Europa — GER: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ENG1 17.11, ITA1 15.39, ESP1 15.38 | ENG1, ITA1 | FC Casteldorato (ITA) / Caldale Albion (ENG) / Dunbury Wanderers (ENG) |
| 2027/28 | ESP1 15.00, GER1 14.79, ENG1 14.35 | ESP1, GER1 | Brackcombe Town (ENG) / FC Podín nad Lesem (CZE) / KV Herengem (BEL) |
| 2028/29 | ITA1 16.71, GER1 14.44, ESP1 14.31 | ITA1, GER1 | AS Fonteville (FRA) / Fontemarino Calcio (ITA) / UD Mirallosa (ESP) |
| 2029/30 | ESP1 15.81, ITA1 14.89, GER1 14.75 | ESP1, ITA1 | AS Fonteville (FRA) / UD Mirallosa (ESP) / CD Salatejo (ESP) |
| 2030/31 | ENG1 20.50, GER1 17.64, POR1 13.25 | ENG1, GER1 | Carnley Albion (ENG) / Yarmerholt Borough (ENG) / TSV Tannau (GER) |
| 2031/32 | ESP1 17.07, ENG1 16.20, ITA1 15.79 | ESP1, ENG1 | Brackcombe Town (ENG) / Olmedosa CF (ESP) / Netherenwick Wanderers (ENG) |
| 2032/33 | ESP1 16.28, ITA1 15.79, ENG1 14.75 | ESP1, ITA1 | CF Alcormonte (ESP) / Netherenwick Wanderers (ENG) / SC Bloemveen (NED) |
| 2033/34 | ENG1 15.44, ITA1 15.19, ESP1 14.06 | ENG1, ITA1 | Olmedosa CF (ESP) / SS Valchiaro (ITA) / US Montechiaro (ITA) |
| 2034/35 | ENG1 18.94, GER1 14.36, FRA1 13.21 | ENG1, GER1 | FC Casteldorato (ITA) / SpVgg Mühlberg (GER) / AC Fontebello (ITA) |
| 2035/36 | ENG1 15.94, ESP1 15.50, ITA1 13.94 | ENG1, ESP1 | FC Casteldorato (ITA) / CF Alcormonte (ESP) / Real Riberrada (ESP) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | KIR | KIR | RHE | HAS | KIR | BUC | GRU | BUC | KIR |
| Taça da Bélgica (Bélgica) | VER | VER | OOS | BEA | VER | BEA | MLM | BEA | BEA | LIE |
| Taça da Croácia (Croácia) | ZAZ | SLA | BEP | ZAZ | SLA | NOJ | BEP | NOV | ZAZ | SLA |
| Taça da Chéquia (Chéquia) | LUH | LUH | LUH | POD | POD | LES | KOS | POD | POD | PDS |
| Taça da Dinamarca (Dinamarca) | VES | STE | STR | BRO | STE | BRO | BRO | STE | BRO | BRO |
| FA Cup (Inglaterra) | CAL | BRA | CAR | STO | CAR | QUE | CAR | CAL | CAR | QUE |
| EFL Cup (Carabao Cup) (Inglaterra) | HAT | BRA | NTH | BRA | BRA | CAR | CAR | BRA | CAR | BRO |
| Copa del Rey (Espanha) | ALC | OLM | OLM | RIB | MIR | OLM | OME | SAL | MIR | RIB |
| Coupe de France (França) | BEA | FON | FON | BEL | COU | FOL | FON | FNT | FNT | FON |
| DFB-Pokal (Alemanha) | MUH | MUH | GRU | MUH | GRU | GRL | MUH | MHL | MHL | BUC |
| Taça da Grécia (Grécia) | ORI | THA | ORI | TAL | ORI | PER | ORI | THA | ORI | ORI |
| Coppa Italia (Itália) | CAS | CAS | CAS | CAS | TOR | CAS | VLC | CAS | CAS | POG |
| Emperor's Cup (Japão) | YMA | MAT | HAN | KRI | TAK | OKA | MAT | KRI | HOS | NAG |
| J.League Cup (Japão) | MAT | MAT | MAT | HAN | HOS | SAK | HAN | MAT | MAT | HAN |
| King's Cup (Arábia Saudita) | THU | RAY | THU | SID | DHA | BAR | SID | SID | SID | QAM |
| KNVB Beker (Países Baixos) | RIJ | ADE | BLO | GRO | BLO | ADE | EMD | VEL | GRO | MEE |
| Taça da Polónia (Polónia) | MIS | PIA | MIS | GRO | STA | ZIE | GOS | GRO | MIS | STA |
| Taça de Portugal (Portugal) | CAR | CAR | CAR | ALV | RBO | VAL | FEI | CAR | ALV | ALV |
| Taça da Liga (Portugal) | CAR | CAR | VAL | ALV | CAR | VAL | CAR | CAR | CAR | ALV |
| Scottish Cup (Escócia) | ARD | ARD | DAL | ARD | DAL | ARD | ARD | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | ARD | CRA | LOC | ARD | KNL | KIL | ARD | KIL | ARD |
| Taça da Suíça (Suíça) | MUH | KIR | MHL | MHL | KIR | KIR | KIR | MHL | BER | KIR |
| Taça da Turquia (Turquia) | KZL | KZL | DEM | DEM | KZL | YDZ | KZL | SUT | KZL | DAG |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | THU | DAF | RIM | DRA | MAN | MAN | THU | RIM | DHA |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | ARR | ALA | CEI | COS | ARR | ARR | CES | QUI | AOS | ARR |
| Copa do Brasil (Brasil) | PDR | CAJ | CED | ANG | PDR | PED | CAJ | PED | PDR | VES |
| Copa Colombia (Colômbia) | QUE | TAB | ESP | QUE | ARE | CUM | TAB | RSA | LUO | QUE |
| Copa Equador (Equador) | TBL | COR | CUE | TAB | ROS | COR | AAM | ROS | ROS | ROS |
| Korean FA Cup (Coreia do Sul) | HAD | HWA | DAE | DAE | HWA | SEO | DAE | MNC | DAE | HAD |
| Taça da Noruega (Noruega) | ASV | EVE | BRG | ASV | LIE | LIL | LIE | LIE | ASV | ASV |
| Copa Uruguai (Uruguai) | PAL | COR | ROS | COR | PAL | COL | COR | ROS | ROS | PAA |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 42 | 42 | 3 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 41 | 41 | 2 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 43 | 43 | 4 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 41 | 41 | 2 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 41 | 41 | 2 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 42 | 42 | 3 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 42 | 42 | 3 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 41 | 41 | 2 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 42 | 42 | 3 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 41 | 41 | 2 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
