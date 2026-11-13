# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.57 golos; casa 44.9%, empate 25.4%, fora 29.7%; 0-0 8.1%; 5+ 11.8%; 7+ 1.1% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.57 golos; casa 45.3%, empate 25.0%, fora 29.7%; 0-0 8.0%; 5+ 11.9%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.34; 92.7% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.60; 95.6% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.0; 1 ligas com sempre o mesmo; 1 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 48.1%; um dos 3 favoritos em 83.3% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 451 subidas, 451 descidas, 580 saídas para o exterior, 580 entradas; 39.8% dos que sobem descem logo; 144 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 227db86c | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 5334 ms / 5794 ms |
| Uma semana de calendário (média / p95 / máx.) | 102.0 ms / 202.5 ms / 445.9 ms |
| Memória (heap) no fim | 270 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 5 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | NGO | IKE | KEB | ADE | ADE | IKE | ADE | IKE | IKE | IKE | 4 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | DOR | KIR | KIR | KIR | KIR | KIR | 2 |
| Bélgica — Pro League | VER | VER | VER | BEA | VER | BEA | BEA | BEA | VER | BEA | 2 |
| Bélgica — Challenger Pro League | BAU | MAA | ZND | ROK | VRS | HOG | ZND | ROK | HOO | MOL | 8 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | SLA | ZAZ | SLA | SLA | SLA | NOJ | NOJ | 3 |
| Chéquia — Chance Liga | POD | POD | KOS | LUH | POD | LUH | LUH | LHN | POD | LUH | 4 |
| Dinamarca — Superliga | VES | LUN | VES | BRO | VES | BRO | SER | VES | BRO | BRO | 4 |
| Inglaterra — Premier League | BRA | BRA | BRO | BRA | CAR | BRA | QUE | CAR | CAR | QUE | 4 |
| Inglaterra — Championship | FAL | NET | YAR | STM | CAL | HAT | DNC | FAL | ASH | EVE | 9 |
| Inglaterra — League One | BRH | OKP | LAN | PEN | TER | STT | PNB | PEN | NED | DNM | 9 |
| Inglaterra — League Two | LNG | FLH | NEY | KEL | NST | DRA | NEY | MAK | BOM | DND | 9 |
| Espanha — La Liga | RIB | OLM | RIB | ALB | ALC | ALC | ALC | ALC | MIR | ALC | 5 |
| Espanha — Segunda División | MNM | LOR | HNO | SLA | CAL | MIO | CLA | TRR | CER | GUA | 10 |
| Europa (resto) — Liga Resto da Europa | AKE | FEH | AKE | FEH | FEH | FEH | AKE | AKE | FEH | FEH | 2 |
| França — Ligue 1 | FNT | FON | FON | FON | FON | FON | FON | FON | FON | FON | 2 |
| França — Ligue 2 | PES | FUN | ROC | VLC | PES | ROC | MRF | VLC | PES | SAU | 6 |
| França — Ligue 3 | CAI | VIS | VAL | CAI | PIS | VAL | SAT | SEU | CLA | BEE | 8 |
| Alemanha — Bundesliga | MUH | MUH | STE | STE | MUH | GRU | GRU | MUH | MUH | GRU | 3 |
| Alemanha — 2. Bundesliga | ALT | MUD | GAL | SEI | HAS | GAL | ZLL | BUC | ZLL | STE | 8 |
| Alemanha — 3. Liga | STN | STM | RHE | ZED | GRG | EIF | ZED | GRG | WST | ZEN | 8 |
| Grécia — Super League 1 | ORI | ORI | PER | THA | ORI | ORI | ORI | THA | ORI | ORI | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | CAS | CAS | CAS | CAS | CAS | 1 |
| Itália — Serie B | TGO | POO | PNT | VLC | BOR | FCO | VLC | TOO | VIL | FCO | 8 |
| Japão — J1 League | MAT | MAT | MAT | MAT | MAT | KIR | MAT | MAT | MAT | MAT | 2 |
| Japão — J2 League | IHI | YAE | YAA | TKA | NGA | YAE | HAN | FUA | OKA | HAA | 9 |
| Arábia Saudita — Saudi Pro League | RAY | SID | THU | SID | SID | SID | SID | SID | SID | SID | 3 |
| Arábia Saudita — First Division League | SAR | FAI | BRQ | RYY | QMA | SQR | BRQ | SQR | BRQ | BAA | 7 |
| México — Liga MX | PRT | ESP | POO | POR | POR | POR | POR | PRT | POR | POR | 4 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | RIJ | RIJ | GRO | RIJ | RIJ | ALD | BOE | 4 |
| Países Baixos — Eerste Divisie | EMD | BLT | EMS | MER | GOD | LDE | EMD | BLT | GRN | MER | 7 |
| Polónia — Ekstraklasa | MIS | PIA | MIS | STA | GRO | MIS | ZIE | PIA | ZIE | GOS | 6 |
| Portugal — Liga Portugal | CAR | ALV | CAR | CAR | CAR | VAL | CAR | CAR | CAR | VAL | 3 |
| Portugal — Liga Portugal 2 | VAE | PEN | LES | VAE | FNT | PEN | MRV | FNT | VAE | AVA | 6 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | GLE | DAN | DLN | GLE | DAN | GLE | DAN | DLN | CRA | 4 |
| Suíça — Super League | KIR | MUH | KIR | BER | BER | KIR | MUH | MUH | KIR | KIR | 3 |
| Turquia — Süper Lig | KZL | DEM | DEM | KZL | KZL | SUT | KZL | KZL | KZL | DEM | 3 |
| Turquia — 1. Lig | KAR | CAM | KAR | YLY | KLD | KLT | AKP | KAR | TAS | YLE | 8 |
| Emirados Árabes Unidos — UAE Pro League | RIM | THU | RIM | GHA | RIM | DHA | THU | GHA | THU | RIM | 4 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | ARR | CEI | CEI | CEI | ARR | CIB | CHA | ALA | ARR | CIB | 5 |
| Brasil — Brasileirão Série A | PDR | PED | PED | PED | PDR | ANG | CAJ | ANG | PDR | CED | 5 |
| Brasil — Brasileirão Série B | ANO | SER | CAO | CAS | CRO | PLM | VEN | CAO | SRT | CAA | 9 |
| Colômbia — Categoría Primera A | LUC | ARE | TAB | LUC | TAB | LUC | ARE | QUE | ESP | LUC | 5 |
| Equador — LigaPro Serie A | TAB | TAB | COR | TAB | TAB | ROS | TAB | TAB | ROS | ROS | 3 |
| Coreia do Sul — K League 1 | HAD | HAD | HAD | MUN | DAE | NAM | DAE | NAM | HWA | JIN | 6 |
| Noruega — Eliteserien | LIE | SKO | ASV | LIE | LIE | SKO | LIE | LIE | NOR | NOR | 4 |
| Uruguai — Primera División | COR | COR | ROS | COR | ROS | ROS | COR | ROS | ROS | ROS | 2 |
| EUA (MLS) — MLS | SUM | BAY | BAY | RED | RED | BAY | SUM | FAL | BAY | RED | 4 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 108.8 / 96 / 119 | 32.5 / 23 / 38 |
| Áustria — Bundesliga | 22 | 50.2 / 41 / 59 | 12.5 / 5 / 17 |
| Bélgica — Pro League | 30 | 71.5 / 63 / 77 | 16.6 / 8 / 24 |
| Bélgica — Challenger Pro League | 28 | 57.9 / 50 / 69 | 20.7 / 10 / 25 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 85.4 / 76 / 99 | 19.9 / 6 / 26 |
| Chéquia — Chance Liga | 30 | 71.1 / 61 / 80 | 15.6 / 6 / 20 |
| Dinamarca — Superliga | 22 | 53.8 / 45 / 64 | 13.2 / 3 / 18 |
| Inglaterra — Premier League | 38 | 94.2 / 80 / 110 | 16.8 / 6 / 25 |
| Inglaterra — Championship | 46 | 115.6 / 99 / 125 | 29.5 / 19 / 38 |
| Inglaterra — League One | 46 | 98.9 / 84 / 110 | 37.2 / 27 / 46 |
| Inglaterra — League Two | 46 | 88.3 / 82 / 96 | 35.3 / 27 / 45 |
| Espanha — La Liga | 38 | 96.9 / 84 / 110 | 15.3 / 9 / 22 |
| Espanha — Segunda División | 42 | 98.1 / 91 / 109 | 26.9 / 14 / 37 |
| Europa (resto) — Liga Resto da Europa | 38 | 92.1 / 82 / 104 | 25.2 / 17 / 31 |
| França — Ligue 1 | 34 | 87.6 / 79 / 100 | 14.7 / 5 / 24 |
| França — Ligue 2 | 34 | 74.4 / 65 / 88 | 19.1 / 11 / 26 |
| França — Ligue 3 | 38 | 77.2 / 68 / 90 | 28.0 / 23 / 34 |
| Alemanha — Bundesliga | 34 | 86.5 / 81 / 93 | 14.4 / 4 / 24 |
| Alemanha — 2. Bundesliga | 34 | 80.8 / 71 / 91 | 19.7 / 3 / 30 |
| Alemanha — 3. Liga | 38 | 80.4 / 72 / 88 | 27.7 / 23 / 37 |
| Grécia — Super League 1 | 26 | 65.3 / 56 / 78 | 15.4 / 9 / 20 |
| Itália — Serie A | 38 | 101.9 / 89 / 114 | 15.7 / 6 / 24 |
| Itália — Serie B | 38 | 93.6 / 81 / 104 | 24.2 / 18 / 35 |
| Japão — J1 League | 38 | 90.1 / 79 / 104 | 24.4 / 19 / 32 |
| Japão — J2 League | 38 | 80.3 / 69 / 91 | 24.4 / 16 / 32 |
| Arábia Saudita — Saudi Pro League | 34 | 85.3 / 66 / 100 | 18.0 / 11 / 24 |
| Arábia Saudita — First Division League | 34 | 76.6 / 64 / 97 | 25.4 / 13 / 31 |
| México — Liga MX | 34 | 80.7 / 71 / 96 | 21.9 / 11 / 30 |
| Países Baixos — Eredivisie | 34 | 82.8 / 70 / 94 | 18.6 / 14 / 27 |
| Países Baixos — Eerste Divisie | 38 | 79.8 / 70 / 97 | 27.1 / 21 / 34 |
| Polónia — Ekstraklasa | 34 | 75.6 / 68 / 85 | 21.6 / 16 / 33 |
| Portugal — Liga Portugal | 34 | 90.6 / 84 / 99 | 15.1 / 11 / 22 |
| Portugal — Liga Portugal 2 | 34 | 73.3 / 65 / 81 | 24.3 / 15 / 30 |
| Escócia — Premiership | 33 | 88.8 / 67 / 99 | 17.6 / 14 / 23 |
| Escócia — Championship | 36 | 74.2 / 62 / 84 | 28.0 / 16 / 40 |
| Suíça — Super League | 33 | 74.5 / 68 / 82 | 18.6 / 7 / 27 |
| Turquia — Süper Lig | 38 | 96.0 / 81 / 108 | 21.3 / 11 / 28 |
| Turquia — 1. Lig | 38 | 85.6 / 77 / 92 | 26.4 / 22 / 30 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 56.6 / 50 / 64 | 19.9 / 14 / 25 |
| Argentina — Liga Profesional | 29 | 76.1 / 67 / 82 | 7.4 / -17 / 15 |
| Brasil — Brasileirão Série A | 38 | 92.3 / 73 / 101 | 14.5 / 0 / 23 |
| Brasil — Brasileirão Série B | 38 | 93.7 / 83 / 103 | 20.0 / 13 / 29 |
| Colômbia — Categoría Primera A | 38 | 85.9 / 70 / 100 | 23.1 / 16 / 29 |
| Equador — LigaPro Serie A | 30 | 71.6 / 62 / 88 | 18.2 / 15 / 26 |
| Coreia do Sul — K League 1 | 33 | 69.1 / 56 / 78 | 23.5 / 13 / 30 |
| Noruega — Eliteserien | 30 | 68.5 / 59 / 77 | 16.3 / 4 / 25 |
| Uruguai — Primera División | 30 | 71.3 / 61 / 84 | 15.2 / 9 / 21 |
| EUA (MLS) — MLS | 29 | 66.1 / 58 / 73 | 17.9 / 13 / 26 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Jabal Rimal Club (UAE) | Matsuno FC (JPN) | 1-1 (a.p.) 3-2 g.p. |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | AS Torrefranco (ITA) | 5-0 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | SS Valfranco (ITA) | 3-2 |
| 2026/27 | Liga Europa | Olmedosa CF (ESP) | Caldale Albion (ENG) | 1-0 |
| 2027 | Libertadores | Rio do Angico Futebol Clube (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2027/28 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Matsuno FC (JPN) | 3-2 (a.p.) |
| 2027/28 | Liga dos Campeões | Brackcombe Town (ENG) | CF Alcormonte (ESP) | 0-0 (a.p.) 5-4 g.p. |
| 2027/28 | Liga Conferência | SC Grüntal (GER) | Brombury United (ENG) | 1-0 |
| 2027/28 | Liga Europa | SC Bloemdam (NED) | US Fonteval (FRA) | 2-1 |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-0 |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya Club (KSA) | 4-1 |
| 2028/29 | Liga dos Campeões | FC Grüntal (GER) | Eintracht Steiningen (GER) | 1-1 (a.p.) 5-1 g.p. |
| 2028/29 | Liga Conferência | UD Mirallosa (ESP) | Craiglochy Thistle (SCO) | 4-0 |
| 2028/29 | Liga Europa | Duncester United (ENG) | SpVgg Mühlberg (GER) | 2-1 (a.p.) |
| 2029 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Rio do Angico Futebol Clube (BRA) | 2-1 (a.p.) |
| 2029/30 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ras Rayyan Sharq FC (KSA) | 2-2 (a.p.) 6-5 g.p. |
| 2029/30 | Liga dos Campeões | SV Mühlwangen (GER) | Atlético de Torre de Carvide (POR) | 0-0 (a.p.) 5-3 g.p. |
| 2029/30 | Liga Conferência | Quendale Athletic (ENG) | Eintracht Grünheim (GER) | 2-0 |
| 2029/30 | Liga Europa | Ardmuir Academicals (SCO) | SC Zelltal (GER) | 2-1 |
| 2030 | Libertadores | América de Campo do Cedro (BRA) | Atlético Pouso das Pedras (BRA) | 1-1 (a.p.) 4-3 g.p. |
| 2030/31 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Stella Kirisaki (JPN) | 3-1 |
| 2030/31 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 5-1 |
| 2030/31 | Liga Conferência | AJ Villegarde (FRA) | Brombury United (ENG) | 1-0 |
| 2030/31 | Liga Europa | UD Mirallosa (ESP) | Quendale Athletic (ENG) | 1-0 |
| 2031 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Unión de Puerto Ceibos (ARG) | 2-0 |
| 2031/32 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Fortuna Sakuhara (JPN) | 1-0 |
| 2031/32 | Liga dos Campeões | CF Alcormonte (ESP) | FC Casteldorato (ITA) | 1-1 (a.p.) 4-3 g.p. |
| 2031/32 | Liga Conferência | Yarmerholt Borough (ENG) | Albarrada CF (ESP) | 5-2 |
| 2031/32 | Liga Europa | Poggiovecchio Calcio (ITA) | Olmevega CF (ESP) | 3-0 |
| 2032 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Club Atlético Puerto Chañares (ARG) | 4-1 |
| 2032/33 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ras Rayyan Sharq FC (KSA) | 2-1 |
| 2032/33 | Liga dos Campeões | SV Mühlwangen (GER) | CF Alcormonte (ESP) | 2-0 (a.p.) |
| 2032/33 | Liga Conferência | Kızılpınarspor (TUR) | SV Haselbach (GER) | 3-2 |
| 2032/33 | Liga Europa | FC Podín nad Lesem (CZE) | Racing Club de Saint-Court (FRA) | 0-0 (a.p.) 4-2 g.p. |
| 2033 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 2-0 |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ishioka SC (JPN) | 5-1 |
| 2033/34 | Liga dos Campeões | Carnley Albion (ENG) | Quendale Athletic (ENG) | 1-0 |
| 2033/34 | Liga Conferência | Stourmercombe City (ENG) | SC Zelltal (GER) | 3-2 (a.p.) |
| 2033/34 | Liga Europa | Dunbury Wanderers (ENG) | US Montechiaro (ITA) | 5-0 |
| 2034 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 1-0 |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 1-0 |
| 2034/35 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 4-1 |
| 2034/35 | Liga Conferência | Netherenwick Wanderers (ENG) | Virtus Casteldorato (ITA) | 1-0 |
| 2034/35 | Liga Europa | Caldale Albion (ENG) | Yarmerholt Borough (ENG) | 1-0 |
| 2035 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 1-0 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-0 |
| 2035/36 | Liga dos Campeões | FC Grüntal (GER) | UD Mirallosa (ESP) | 1-0 |
| 2035/36 | Liga Conferência | CF Alcormonte (ESP) | SpVgg Mühlberg (GER) | 1-0 |
| 2035/36 | Liga Europa | Real Riberrada (ESP) | Eintracht Altenhausen (GER) | 2-1 |
| 2036 | Libertadores | Rio do Angico Futebol Clube (BRA) | Club Atlético General Ceibos (ARG) | 2-1 |

Títulos por país: Libertadores — BRA: 7; Liga dos Campeões Asiática — JPN: 6; Liga Conferência — ENG: 5; Liga dos Campeões — GER: 4; Liga Europa — ESP: 3; Liga dos Campeões Asiática — KSA: 3; Liga dos Campeões — ENG: 3; Liga Europa — ENG: 3; Libertadores — ARG: 3; Liga dos Campeões — ITA: 2; Liga Conferência — ESP: 2; Liga dos Campeões Asiática — UAE: 1; Liga Conferência — GER: 1; Liga Europa — NED: 1; Liga Europa — SCO: 1; Liga Conferência — FRA: 1; Liga dos Campeões — ESP: 1; Liga Europa — ITA: 1; Liga Conferência — TUR: 1; Liga Europa — CZE: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 17.72, ENG1 16.67, ESP1 15.81 | ITA1, ENG1 | FC Casteldorato (ITA) / Olmedosa CF (ESP) / Dunbury Wanderers (ENG) |
| 2027/28 | NED1 18.30, ENG1 15.89, ITA1 14.72 | NED1, ENG1 | Brackcombe Town (ENG) / SC Bloemdam (NED) / SC Grüntal (GER) |
| 2028/29 | GER1 18.25, ENG1 15.39, ESP1 13.86 | GER1, ENG1 | FC Grüntal (GER) / Duncester United (ENG) / UD Mirallosa (ESP) |
| 2029/30 | GER1 16.50, ESP1 14.75, ITA1 14.07 | GER1, ESP1 | SV Mühlwangen (GER) / Ardmuir Academicals (SCO) / Quendale Athletic (ENG) |
| 2030/31 | ENG1 19.25, ESP1 14.75, ITA1 14.07 | ENG1, ESP1 | Carnley Albion (ENG) / UD Mirallosa (ESP) / AJ Villegarde (FRA) |
| 2031/32 | ESP1 17.83, ITA1 15.14, ENG1 14.50 | ESP1, ITA1 | CF Alcormonte (ESP) / Poggiovecchio Calcio (ITA) / Yarmerholt Borough (ENG) |
| 2032/33 | ENG1 16.00, ESP1 14.17, FRA1 14.14 | ENG1, ESP1 | SV Mühlwangen (GER) / FC Podín nad Lesem (CZE) / Kızılpınarspor (TUR) |
| 2033/34 | ENG1 21.00, ITA1 16.64, FRA1 12.86 | ENG1, ITA1 | Carnley Albion (ENG) / Dunbury Wanderers (ENG) / Stourmercombe City (ENG) |
| 2034/35 | ENG1 18.32, ITA1 16.44, FRA1 13.79 | ENG1, ITA1 | FC Casteldorato (ITA) / Caldale Albion (ENG) / Netherenwick Wanderers (ENG) |
| 2035/36 | GER1 19.93, ESP1 18.57, ENG1 12.95 | GER1, ESP1 | FC Grüntal (GER) / Real Riberrada (ESP) / CF Alcormonte (ESP) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | KIR | KIR | KIR | HAS | GRU | RHE | EIC | KIR | KIR |
| Taça da Bélgica (Bélgica) | VER | VER | MOL | LIE | VER | VER | BEA | ROM | WES | ROM |
| Taça da Croácia (Croácia) | ZAZ | SLA | VIK | ZAZ | SLA | SLA | VIK | NOJ | SLA | BRE |
| Taça da Chéquia (Chéquia) | RYC | OST | LUH | SLA | POD | POD | LUH | POD | LUH | LUH |
| Taça da Dinamarca (Dinamarca) | VES | BRO | VES | SER | VES | BRO | BRO | STE | BRO | VES |
| FA Cup (Inglaterra) | BRA | STO | CAR | DNC | CAR | CAR | CAR | CAL | CAR | BRA |
| EFL Cup (Carabao Cup) (Inglaterra) | HAT | BRA | HAT | CAR | CAR | BRA | CAR | CAR | BRA | BRO |
| Copa del Rey (Espanha) | ALC | OLM | MON | RIB | TAR | ALC | RIB | TAR | MIR | MRA |
| Coupe de France (França) | MAR | FON | FON | FON | FON | COU | FON | FON | FON | MON |
| DFB-Pokal (Alemanha) | MUH | MUH | STE | STE | GRU | MUD | GRU | ZEL | MUH | MUH |
| Taça da Grécia (Grécia) | KAL | KAL | PER | THS | PER | THA | PAL | ORI | THA | ORI |
| Coppa Italia (Itália) | CAS | CAS | TRR | CAS | CST | CAS | FNT | CAS | CAS | FOO |
| Emperor's Cup (Japão) | YMA | MAT | ISH | MAT | OKA | MAT | ISH | MAT | MAT | SAK |
| J.League Cup (Japão) | MAT | MAT | SAK | MAT | MAT | HOS | SAK | MAT | FUJ | FUJ |
| King's Cup (Arábia Saudita) | THU | RAY | THU | SID | DHA | SID | RAY | SID | SID | THU |
| KNVB Beker (Países Baixos) | RIJ | ADE | GRO | RIJ | ALD | ADE | BOE | BLO | VLD | BOE |
| Taça da Polónia (Polónia) | MIS | PIA | GRO | STA | MIS | PIA | PAR | STA | STA | STA |
| Taça de Portugal (Portugal) | ALV | CAR | ALV | CAR | LAJ | CAR | FON | CAR | ALV | CAR |
| Taça da Liga (Portugal) | CAR | CAR | CAR | ALV | VAL | FEI | CAR | FON | ALV | ALV |
| Scottish Cup (Escócia) | ARD | ARD | DAL | ARD | ARD | ARD | KIL | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | ARD | CRA | KNC | ARD | LOC | KIL | ARD | ARD | ARD |
| Taça da Suíça (Suíça) | MHL | KIR | BER | MHL | DOR | KIR | BER | KIR | KIR | DRN |
| Taça da Turquia (Turquia) | KZL | KZL | SUT | KZL | YDZ | SUT | KZL | AYA | KZL | YDZ |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | DAF | THU | THU | THU | RIM | THU | GHA | THU | RIM |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CHA | CIB | CEI | CIB | CEI | CIB | CIB | QUI | ARR | CIB |
| Copa do Brasil (Brasil) | ANG | ANG | PED | PDR | CAJ | PED | AGI | PED | PDR | VEN |
| Copa Colombia (Colômbia) | TAB | POR | TAB | ARE | POR | ALA | LUC | QUE | ESP | QUE |
| Copa Equador (Equador) | TBL | TAB | TAB | TAB | ROS | TAB | CUM | ROS | ROS | AAM |
| Korean FA Cup (Coreia do Sul) | NAM | HWA | NAM | HAN | HWA | NAM | MUN | NAM | JIN | JIN |
| Taça da Noruega (Noruega) | SKO | SOG | SOG | LIE | ASV | LIE | STR | LIE | SOG | NOR |
| Copa Uruguai (Uruguai) | PAL | COR | PAL | COR | CRR | MIR | ROS | COR | CRR | COR |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 42 | 42 | 3 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 42 | 42 | 3 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 40 | 40 | 1 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 41 | 41 | 2 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 41 | 41 | 2 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 41 | 41 | 2 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 41 | 41 | 2 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 43 | 43 | 4 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 40 | 40 | 1 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 40 | 40 | 1 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
