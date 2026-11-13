# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ❌ | 2.64 golos; casa 45.5%, empate 24.1%, fora 30.3%; 0-0 7.3%; 5+ 12.5%; 7+ 1.0% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.62 golos; casa 45.6%, empate 24.4%, fora 30.0%; 0-0 7.3%; 5+ 12.4%; 7+ 1.0% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.35; 95.6% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.60; 97.3% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.3; 1 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 48.5%; um dos 3 favoritos em 81.0% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 453 subidas, 453 descidas, 580 saídas para o exterior, 580 entradas; 42.1% dos que sobem descem logo; 131 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital badbd060 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 4642 ms / 5097 ms |
| Uma semana de calendário (média / p95 / máx.) | 89.2 ms / 170.1 ms / 304.8 ms |
| Memória (heap) no fim | 301 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 5 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | ADE | IKE | ADE | IKE | ADE | IKE | KEB | KEB | KEB | HAJ | 4 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KRC | KIR | DOR | KIR | FAL | BUC | 5 |
| Bélgica — Pro League | VER | VER | VER | BEA | VER | BEA | BEA | BEA | VER | BEA | 2 |
| Bélgica — Challenger Pro League | LIT | VRS | MAA | HRE | HOO | ROT | WES | HOO | MLM | MOL | 9 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | SLA | SLA | ZAZ | SLA | SLA | SLA | NOJ | NOJ | 3 |
| Chéquia — Chance Liga | POD | POD | LUH | LUH | LUH | LUH | LUH | LHN | LUH | LUH | 3 |
| Dinamarca — Superliga | VES | VES | SER | VES | VES | BRO | VES | VES | BRO | BRO | 3 |
| Inglaterra — Premier League | BRA | BRA | CAR | QUE | CAR | BRA | CAR | CAR | CAR | BRA | 3 |
| Inglaterra — Championship | FAL | NET | ASH | FAL | THO | GRI | DNC | YAR | STM | EVE | 9 |
| Inglaterra — League One | BRH | TER | DNB | DNM | TER | THR | PNB | STE | STT | HOL | 9 |
| Inglaterra — League Two | MOR | SHE | NEY | QEN | NED | SER | NED | ASR | NED | CAE | 8 |
| Espanha — La Liga | MIR | OLM | RIB | ALB | ALC | ALC | ALC | ALC | MIR | ALC | 5 |
| Espanha — Segunda División | MNM | LOR | HIA | SLA | CAL | HNO | TON | SLA | PRA | MIO | 9 |
| Europa (resto) — Liga Resto da Europa | AGB | FEH | KFA | FEH | FEH | FEH | FEH | FEH | FEH | FEH | 3 |
| França — Ligue 1 | FON | FON | FON | FON | FON | COU | FON | BEL | FON | FON | 3 |
| França — Ligue 2 | PES | FUN | FDE | FUN | BEA | PLE | MRF | BAU | PES | FDE | 7 |
| França — Ligue 3 | CAI | PLC | VLG | VIS | VIT | VLC | MRC | PIS | VID | VRB | 10 |
| Alemanha — Bundesliga | MUH | MUH | STE | GRU | MUH | GRU | GRU | BUC | MUH | GRU | 4 |
| Alemanha — 2. Bundesliga | ALT | MUD | NEU | SEI | STN | GAL | HHE | WES | FAL | GAL | 9 |
| Alemanha — 3. Liga | STN | STL | BUK | FAL | RHE | EIF | OER | WEK | EIF | WEK | 8 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | ORI | ORI | ORI | ORI | PER | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | TOR | CAS | VAL | CAS | CAS | 3 |
| Itália — Serie B | TGO | POO | VLC | CAA | ROC | FCO | TOO | VLA | SER | POG | 10 |
| Japão — J1 League | ISH | MAT | MAT | MAT | MAT | HOS | MAT | MAT | MAT | MAT | 3 |
| Japão — J2 League | YAA | OKA | FUJ | HAI | SAK | YAE | YMA | YNO | OKA | MTS | 9 |
| Arábia Saudita — Saudi Pro League | RAY | SID | THU | SID | DHA | SID | RAY | SID | SID | SID | 4 |
| Arábia Saudita — First Division League | DAF | BRQ | RIM | QAM | SAR | SQR | SAR | QAR | SAH | RYY | 9 |
| México — Liga MX | ALA | ESP | POR | POR | POR | POR | PRT | CEI | CEI | POR | 5 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | RIJ | RIJ | RIJ | BOE | RIJ | GRO | MEE | 4 |
| Países Baixos — Eerste Divisie | EMD | LDE | OUD | LED | GOD | LED | ALK | LED | LDE | VEL | 7 |
| Polónia — Ekstraklasa | JAG | PIA | MIS | JAG | MIS | MIS | STA | PIA | STA | STA | 4 |
| Portugal — Liga Portugal | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | 1 |
| Portugal — Liga Portugal 2 | VAE | MRV | PNE | LAG | VAE | FRO | PNE | LJE | LES | PNE | 7 |
| Escócia — Premiership | ARD | ARD | KIL | KIN | ARD | ARD | ARD | ARD | ARD | ARD | 3 |
| Escócia — Championship | DAN | DLN | GLE | KNL | DLN | KNL | INV | DAN | BEN | BAL | 7 |
| Suíça — Super League | KIR | KIR | KIR | KIR | KIR | BRN | BRN | KIR | KIR | KIR | 2 |
| Turquia — Süper Lig | DEM | DEM | DEM | SUT | KZL | SUT | KZL | KZL | KZL | DEM | 3 |
| Turquia — 1. Lig | KAR | CAM | GOK | YES | YDZ | AKP | KZY | YDZ | DGT | YES | 8 |
| Emirados Árabes Unidos — UAE Pro League | DHA | DHA | RIM | DHA | THU | DHA | THU | DHA | WAH | THU | 4 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | CHA | CEI | ARR | ARR | ARR | ARR | CEI | QUI | ARR | ARR | 4 |
| Brasil — Brasileirão Série A | PDR | PED | PED | CAS | PDR | PDR | PDR | ANG | PDR | AGI | 5 |
| Brasil — Brasileirão Série B | VOS | VEN | AGI | VES | VEN | PEQ | AGI | VES | GAR | JAT | 7 |
| Colômbia — Categoría Primera A | LUC | POR | TAB | POR | TAB | ARE | ARE | POR | QUE | QUE | 5 |
| Equador — LigaPro Serie A | TAB | TAB | COR | TAB | TAB | COR | TAB | TAB | COR | ROS | 3 |
| Coreia do Sul — K League 1 | HAD | DAE | HWA | JIN | NMC | NAM | HWA | MNC | NMC | JIN | 7 |
| Noruega — Eliteserien | LIE | FJE | FJE | LIE | LIE | ASV | LIE | LIE | FJE | ASV | 3 |
| Uruguai — Primera División | PAL | COR | ROS | COR | COR | PAL | COR | ROS | ROS | ROS | 3 |
| EUA (MLS) — MLS | FAL | BAY | BAY | SUM | BAY | CED | SUM | PRA | CED | RED | 6 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 105.6 / 88 / 116 | 29.8 / 23 / 38 |
| Áustria — Bundesliga | 22 | 51.1 / 44 / 62 | 11.6 / 6 / 15 |
| Bélgica — Pro League | 30 | 70.4 / 59 / 77 | 18.1 / 13 / 24 |
| Bélgica — Challenger Pro League | 28 | 54.1 / 48 / 63 | 21.9 / 15 / 28 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 84.4 / 72 / 98 | 18.8 / 9 / 26 |
| Chéquia — Chance Liga | 30 | 70.4 / 57 / 81 | 14.4 / 11 / 18 |
| Dinamarca — Superliga | 22 | 53.5 / 43 / 61 | 11.2 / 4 / 17 |
| Inglaterra — Premier League | 38 | 95.1 / 89 / 104 | 14.9 / 3 / 24 |
| Inglaterra — Championship | 46 | 113.2 / 92 / 127 | 31.1 / 23 / 39 |
| Inglaterra — League One | 46 | 105.4 / 93 / 117 | 33.3 / 22 / 42 |
| Inglaterra — League Two | 46 | 94.1 / 88 / 106 | 35.2 / 27 / 43 |
| Espanha — La Liga | 38 | 98.3 / 88 / 111 | 15.1 / 4 / 25 |
| Espanha — Segunda División | 42 | 97.6 / 88 / 107 | 28.1 / 24 / 35 |
| Europa (resto) — Liga Resto da Europa | 38 | 92.6 / 77 / 100 | 23.6 / 12 / 33 |
| França — Ligue 1 | 34 | 89.5 / 73 / 102 | 17.5 / 4 / 25 |
| França — Ligue 2 | 34 | 75.4 / 66 / 89 | 23.6 / 16 / 29 |
| França — Ligue 3 | 38 | 81.8 / 74 / 92 | 25.9 / 19 / 33 |
| Alemanha — Bundesliga | 34 | 86.5 / 77 / 100 | 15.9 / 7 / 29 |
| Alemanha — 2. Bundesliga | 34 | 80.3 / 71 / 89 | 20.3 / 14 / 25 |
| Alemanha — 3. Liga | 38 | 84.2 / 74 / 96 | 23.8 / 18 / 33 |
| Grécia — Super League 1 | 26 | 65.5 / 56 / 74 | 14.4 / 9 / 19 |
| Itália — Serie A | 38 | 100.5 / 89 / 109 | 12.3 / 8 / 17 |
| Itália — Serie B | 38 | 91.9 / 73 / 104 | 25.1 / 15 / 33 |
| Japão — J1 League | 38 | 91.9 / 76 / 106 | 22.5 / 9 / 29 |
| Japão — J2 League | 38 | 80.1 / 70 / 91 | 28.6 / 17 / 35 |
| Arábia Saudita — Saudi Pro League | 34 | 83.4 / 73 / 95 | 18.6 / 11 / 28 |
| Arábia Saudita — First Division League | 34 | 73.9 / 66 / 87 | 27.9 / 20 / 35 |
| México — Liga MX | 34 | 80.2 / 70 / 94 | 24.8 / 15 / 32 |
| Países Baixos — Eredivisie | 34 | 84.7 / 75 / 94 | 19.1 / 10 / 26 |
| Países Baixos — Eerste Divisie | 38 | 80.9 / 68 / 91 | 29.1 / 22 / 38 |
| Polónia — Ekstraklasa | 34 | 73.9 / 70 / 80 | 21.2 / 14 / 27 |
| Portugal — Liga Portugal | 34 | 88.6 / 81 / 97 | 15.1 / 7 / 25 |
| Portugal — Liga Portugal 2 | 34 | 72.7 / 64 / 81 | 27.7 / 21 / 38 |
| Escócia — Premiership | 33 | 85.9 / 78 / 93 | 16.0 / 9 / 26 |
| Escócia — Championship | 36 | 76.6 / 57 / 92 | 28.5 / 20 / 36 |
| Suíça — Super League | 33 | 78.1 / 69 / 88 | 21.2 / 12 / 29 |
| Turquia — Süper Lig | 38 | 96.0 / 83 / 102 | 21.5 / 13 / 30 |
| Turquia — 1. Lig | 38 | 86.0 / 78 / 99 | 25.7 / 17 / 33 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 59.0 / 50 / 68 | 16.9 / 12 / 24 |
| Argentina — Liga Profesional | 29 | 74.1 / 61 / 80 | 13.6 / 6 / 20 |
| Brasil — Brasileirão Série A | 38 | 88.3 / 76 / 101 | 15.1 / 6 / 24 |
| Brasil — Brasileirão Série B | 38 | 94.4 / 88 / 100 | 20.4 / 10 / 31 |
| Colômbia — Categoría Primera A | 38 | 88.8 / 77 / 103 | 24.2 / 18 / 28 |
| Equador — LigaPro Serie A | 30 | 70.0 / 61 / 78 | 16.8 / 11 / 23 |
| Coreia do Sul — K League 1 | 33 | 66.5 / 56 / 77 | 26.2 / 20 / 32 |
| Noruega — Eliteserien | 30 | 68.8 / 60 / 77 | 16.4 / 9 / 22 |
| Uruguai — Primera División | 30 | 72.9 / 69 / 79 | 16.1 / 13 / 21 |
| EUA (MLS) — MLS | 29 | 66.8 / 58 / 75 | 16.2 / 11 / 22 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 3-1 |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 1-0 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | US Fonteval (FRA) | 2-1 (a.p.) |
| 2026/27 | Liga Europa | Caldale Albion (ENG) | Olmedosa CF (ESP) | 2-0 |
| 2027 | Libertadores | Unión de Colonia Alamos (ARG) | Clube Atlético Pouso das Pedras (BRA) | 2-2 (a.p.) 4-3 g.p. |
| 2027/28 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ishioka SC (JPN) | 2-1 |
| 2027/28 | Liga dos Campeões | Olmedosa CF (ESP) | AS Torrefranco (ITA) | 3-0 |
| 2027/28 | Liga Conferência | Fontemarino Calcio (ITA) | Olmevega CF (ESP) | 2-2 (a.p.) 5-2 g.p. |
| 2027/28 | Liga Europa | FC Grüntal (GER) | Real Tarrariza (ESP) | 3-1 |
| 2028 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 2-0 |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya Club (KSA) | 2-1 |
| 2028/29 | Liga dos Campeões | Carnley Albion (ENG) | Eintracht Steiningen (GER) | 1-1 (a.p.) 3-2 g.p. |
| 2028/29 | Liga Conferência | Kilness (SCO) | SC Bloemveen (NED) | 1-0 |
| 2028/29 | Liga Europa | Virtus Casteldorato (ITA) | Duncester United (ENG) | 1-0 |
| 2029 | Libertadores | Atlético Pouso das Pedras (BRA) | Unión de Puerto Ceibos (ARG) | 1-0 (a.p.) |
| 2029/30 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-1 |
| 2029/30 | Liga dos Campeões | SV Mühlwangen (GER) | AS Fonteville (FRA) | 3-0 |
| 2029/30 | Liga Conferência | Brackcombe Town (ENG) | FC Ronsebroek (BEL) | 5-0 |
| 2029/30 | Liga Europa | Achilles Rijszand (NED) | Sutepe İdmanyurdu (TUR) | 4-2 (a.p.) |
| 2030 | Libertadores | América de Campo do Cedro (BRA) | Atlético Pouso das Pedras (BRA) | 1-1 (a.p.) 4-3 g.p. |
| 2030/31 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 3-1 |
| 2030/31 | Liga dos Campeões | Carnley Albion (ENG) | SV Mühlwangen (GER) | 1-0 |
| 2030/31 | Liga Conferência | Caldale Albion (ENG) | TSV Hohenau (GER) | 4-1 |
| 2030/31 | Liga Europa | Brackcombe Town (ENG) | SpVgg Mühlberg (GER) | 1-0 |
| 2031 | Libertadores | América de Campo do Cedro (BRA) | Unión de Puerto Ceibos (ARG) | 1-0 |
| 2031/32 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Stella Kirisaki (JPN) | 4-0 |
| 2031/32 | Liga dos Campeões | CF Alcormonte (ESP) | Stourmerport City (ENG) | 3-1 |
| 2031/32 | Liga Conferência | Eversbridge United (ENG) | Olmevega CF (ESP) | 1-0 |
| 2031/32 | Liga Europa | TSV Hohenau (GER) | Sutepe İdmanyurdu (TUR) | 2-2 (a.p.) 4-2 g.p. |
| 2032 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Clube Atlético Pouso das Pedras (BRA) | 2-1 |
| 2032/33 | Liga dos Campeões Asiática | Stella Hoshigawa (JPN) | Stella Kirisaki (JPN) | 2-1 |
| 2032/33 | Liga dos Campeões | AS Fonteville (FRA) | Racing Club de Bellegarde (FRA) | 4-0 |
| 2032/33 | Liga Conferência | CD Gualrejo (ESP) | AC Valfiore (ITA) | 0-0 (a.p.) 5-4 g.p. |
| 2032/33 | Liga Europa | Eversbridge United (ENG) | Fontemarino Calcio (ITA) | 5-3 |
| 2033 | Libertadores | América de Vila das Garças (BRA) | Club Atlético Puerto Chañares (ARG) | 1-1 (a.p.) 3-2 g.p. |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 1-0 |
| 2033/34 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 2-0 |
| 2033/34 | Liga Conferência | Real Riberrada (ESP) | Virtus Casteldorato (ITA) | 2-0 |
| 2033/34 | Liga Europa | Caldale Albion (ENG) | Stourmercombe City (ENG) | 1-1 (a.p.) 4-2 g.p. |
| 2034 | Libertadores | Rio do Angico Futebol Clube (BRA) | América de Campo do Cedro (BRA) | 4-1 |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 0-0 (a.p.) 5-4 g.p. |
| 2034/35 | Liga dos Campeões | AS Fonteville (FRA) | UD Mirallosa (ESP) | 4-2 (a.p.) |
| 2034/35 | Liga Conferência | Alderdrecht Boys (NED) | Stourmerport City (ENG) | 1-0 |
| 2034/35 | Liga Europa | FC Grokerk (NED) | Real Riberrada (ESP) | 1-0 |
| 2035 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 1-0 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Daeju Hawks (KOR) | 1-0 |
| 2035/36 | Liga dos Campeões | CF Alcormonte (ESP) | Brackcombe Town (ENG) | 3-0 |
| 2035/36 | Liga Conferência | Caldale Albion (ENG) | Olmedosa CF (ESP) | 2-1 |
| 2035/36 | Liga Europa | SV Eichdorf (GER) | Demiryurtspor (TUR) | 1-0 |
| 2036 | Libertadores | Grêmio Campo do Cajueiro (BRA) | América de Campo do Cedro (BRA) | 2-0 |

Títulos por país: Liga dos Campeões Asiática — JPN: 8; Libertadores — BRA: 8; Liga Conferência — ENG: 5; Liga Europa — ENG: 4; Liga dos Campeões — ESP: 3; Liga Europa — GER: 3; Liga dos Campeões — ENG: 3; Liga dos Campeões Asiática — KSA: 2; Libertadores — ARG: 2; Liga Europa — NED: 2; Liga dos Campeões — FRA: 2; Liga Conferência — ESP: 2; Liga dos Campeões — ITA: 1; Liga Conferência — ITA: 1; Liga Conferência — SCO: 1; Liga Europa — ITA: 1; Liga dos Campeões — GER: 1; Liga Conferência — NED: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ENG1 17.56, ESP1 16.56, ITA1 15.28 | ENG1, ESP1 | FC Casteldorato (ITA) / Caldale Albion (ENG) / Dunbury Wanderers (ENG) |
| 2027/28 | NED1 16.50, ITA1 16.06, ESP1 15.88 | NED1, ITA1 | Olmedosa CF (ESP) / FC Grüntal (GER) / Fontemarino Calcio (ITA) |
| 2028/29 | GER1 16.44, ESP1 14.69, ENG1 14.57 | GER1, ESP1 | Carnley Albion (ENG) / Virtus Casteldorato (ITA) / Kilness (SCO) |
| 2029/30 | ENG1 15.81, GER1 14.88, FRA1 14.64 | ENG1, GER1 | SV Mühlwangen (GER) / Achilles Rijszand (NED) / Brackcombe Town (ENG) |
| 2030/31 | ENG1 19.72, GER1 15.44, ITA1 15.36 | ENG1, GER1 | Carnley Albion (ENG) / Brackcombe Town (ENG) / Caldale Albion (ENG) |
| 2031/32 | ESP1 17.71, ENG1 16.36, ITA1 13.57 | ESP1, ENG1 | CF Alcormonte (ESP) / TSV Hohenau (GER) / Eversbridge United (ENG) |
| 2032/33 | FRA1 17.00, ENG1 15.39, ITA1 15.29 | FRA1, ENG1 | AS Fonteville (FRA) / Eversbridge United (ENG) / CD Gualrejo (ESP) |
| 2033/34 | ENG1 21.00, GER1 14.79, ESP1 12.94 | ENG1, GER1 | Carnley Albion (ENG) / Caldale Albion (ENG) / Real Riberrada (ESP) |
| 2034/35 | FRA1 15.43, NED1 14.70, ENG1 14.35 | FRA1, NED1 | AS Fonteville (FRA) / FC Grokerk (NED) / Alderdrecht Boys (NED) |
| 2035/36 | ENG1 20.43, GER1 16.57, ESP1 14.79 | ENG1, GER1 | CF Alcormonte (ESP) / SV Eichdorf (GER) / Caldale Albion (ENG) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | RHE | KIR | KIR | HAS | KIR | DOR | BUC | HAS | DOR |
| Taça da Bélgica (Bélgica) | HER | RON | ROM | BEA | BEA | VER | BEA | BEA | VER | LIE |
| Taça da Croácia (Croácia) | ZAZ | SLA | SLA | ZAZ | SLA | SLA | ZAZ | NOJ | NOJ | SLA |
| Taça da Chéquia (Chéquia) | RYC | RYC | OST | SLA | RYC | LUH | LUH | LHN | LUH | LUH |
| Taça da Dinamarca (Dinamarca) | VES | BRO | HED | STR | VES | STE | VES | VES | BRO | BRO |
| FA Cup (Inglaterra) | CAR | STO | DNC | STO | CAR | CAR | CAR | STO | DUN | EVE |
| EFL Cup (Carabao Cup) (Inglaterra) | CAR | BRA | CAR | NTH | BRA | CAL | QUE | CAR | BRA | CAR |
| Copa del Rey (Espanha) | RIB | OLM | RIB | ALC | ALC | ALC | GUA | ALC | ALC | ALC |
| Coupe de France (França) | FNT | FON | BEL | FON | FON | FOE | FON | FON | BEL | FNT |
| DFB-Pokal (Alemanha) | MUH | GRU | MHL | MUH | GRU | ZEL | BUC | BUC | NEU | BUC |
| Taça da Grécia (Grécia) | THA | ORI | ORI | THA | THS | ORI | ORI | THA | ORI | PER |
| Coppa Italia (Itália) | CAS | CAS | CST | CAS | CAS | VLF | CAS | CAS | CAS | VAL |
| Emperor's Cup (Japão) | ISH | ISH | MAT | KIR | HNA | MAT | MAT | MAT | MAT | HOS |
| J.League Cup (Japão) | MAT | MAT | MAT | HAN | YAO | KIR | HOS | TAK | MAT | FUJ |
| King's Cup (Arábia Saudita) | THU | RAY | THU | DHA | DHA | SID | RAY | SID | SID | SID |
| KNVB Beker (Países Baixos) | BLO | RIJ | BLK | RIJ | BOE | ADE | RIJ | ADE | ALD | BOE |
| Taça da Polónia (Polónia) | PIA | KAB | GRO | KRA | PIA | PIA | MIS | ZIE | RAK | JAG |
| Taça de Portugal (Portugal) | CAR | FRE | ALV | ALV | CAR | LAJ | CAR | CAR | LAJ | ALV |
| Taça da Liga (Portugal) | CAR | CAR | CAR | ALV | CAR | LAJ | CAR | CAR | LAJ | ALV |
| Scottish Cup (Escócia) | ARD | ARD | DAL | ARD | ARD | LOC | KIL | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | ARD | KNC | LOC | KIL | ARD | INV | KIL | ARD | ARD |
| Taça da Suíça (Suíça) | KIR | MUH | KIR | KRC | LIN | KIR | BRN | KIR | KIR | KIR |
| Taça da Turquia (Turquia) | DEM | KZL | DEM | KZL | DEM | DAG | KZL | KZL | KZL | DAG |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | GHA | THU | GHA | RIM | DHA | THU | DHA | THU | THU |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CHA | CES | COS | QUI | CEI | ARR | CAN | MOR | ARR | BLL |
| Copa do Brasil (Brasil) | PDR | PED | PDR | PED | PDR | ANG | CAJ | VNT | PDR | PDR |
| Copa Colombia (Colômbia) | QUE | ARE | TAB | LUC | TAB | ARE | ARE | ARE | ALA | LUC |
| Copa Equador (Equador) | ROS | TAB | COR | TAB | ROS | ALA | ROS | TAB | COR | ROS |
| Korean FA Cup (Coreia do Sul) | NAM | DAE | HAD | JIN | MNC | DAE | JIN | NMC | MUN | MNC |
| Taça da Noruega (Noruega) | LIE | LIE | ASV | LIE | LIE | SKO | LIE | ASV | FJE | SKO |
| Copa Uruguai (Uruguai) | SOL | COR | ROS | MRA | ROS | MIR | PAL | ROS | COR | CRR |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 41 | 41 | 2 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 43 | 43 | 4 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 41 | 41 | 2 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 40 | 40 | 1 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 42 | 42 | 3 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 41 | 41 | 2 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 40 | 40 | 1 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 41 | 41 | 2 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 41 | 41 | 2 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 43 | 43 | 4 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
