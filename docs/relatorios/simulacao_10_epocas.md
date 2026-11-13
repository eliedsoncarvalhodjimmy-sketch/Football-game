# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.56 golos; casa 45.7%, empate 24.9%, fora 29.4%; 0-0 8.1%; 5+ 11.8%; 7+ 0.9% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.53 golos; casa 45.2%, empate 25.2%, fora 29.6%; 0-0 8.2%; 5+ 11.4%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.34; 93.1% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.60; 95.6% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.3; 2 ligas com sempre o mesmo; 1 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 46.3%; um dos 3 favoritos em 81.0% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 453 subidas, 453 descidas, 580 saídas para o exterior, 580 entradas; 44.5% dos que sobem descem logo; 139 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 57fac145 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 6891 ms / 8202 ms |
| Uma semana de calendário (média / p95 / máx.) | 130.7 ms / 281.6 ms / 751.4 ms |
| Memória (heap) no fim | 312 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 6 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | IKE | ADE | ADE | ADE | ADE | NGO | ADE | IKE | 3 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KRC | 2 |
| Bélgica — Pro League | VER | OOS | VER | BEA | BEA | BEA | BEA | BEA | HER | BEA | 4 |
| Bélgica — Challenger Pro League | BAU | HOO | HRE | ROK | VRS | ROM | HRE | HOG | ROK | MAA | 8 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | SLA | SLA | ZAZ | SLA | SLA | SLA | NOJ | NOJ | 3 |
| Chéquia — Chance Liga | POD | POD | RYC | LUH | POD | LUH | LUH | LHN | POD | POD | 4 |
| Dinamarca — Superliga | VES | VES | BRO | BRO | VES | BRO | VES | VES | BRO | BRO | 2 |
| Inglaterra — Premier League | BRA | BRA | CAR | BRA | CAR | BRA | CAR | DUN | BRA | BRA | 3 |
| Inglaterra — Championship | FAL | NET | ASH | MAR | DNW | OAK | STM | FAL | STM | EVE | 8 |
| Inglaterra — League One | BRH | TER | LAN | ELV | GRA | THR | MAR | PEN | WIT | DNB | 10 |
| Inglaterra — League Two | MOR | STD | KEL | MAK | AHM | CAK | ELT | LNG | BOM | MAK | 9 |
| Espanha — La Liga | RIB | OLM | RIB | HIN | ALC | ALC | ALC | ALC | MIR | ALC | 5 |
| Espanha — Segunda División | MNM | LOR | TOR | SLA | CLA | TOR | MNM | CAL | HNO | MRA | 8 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | AGB | FEH | FEH | FEH | AGB | FEH | FEH | FEH | 2 |
| França — Ligue 1 | FNT | FON | FON | FON | BEL | FON | FON | BEL | FON | FON | 3 |
| França — Ligue 2 | PES | FUN | FDE | VLC | ROC | FUN | FOE | FUN | CHA | CAN | 8 |
| França — Ligue 3 | CAI | BEE | VRB | PLA | CAI | CLA | VID | VLG | VID | BEA | 8 |
| Alemanha — Bundesliga | MUH | MUH | STE | GRU | MUH | GRU | GRU | ZEL | MHL | MHL | 5 |
| Alemanha — 2. Bundesliga | SEI | ZLL | NEU | ZLL | ALT | MUD | EIC | GRL | ZLL | GAL | 8 |
| Alemanha — 3. Liga | ZED | WAL | BUK | WEA | ZEU | WEN | WEA | GRG | WEN | STL | 8 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | ORI | ORI | KAL | ORI | ORI | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | TOR | TOR | VAL | CAS | CAS | 3 |
| Itália — Serie B | TGO | POO | PNT | TGO | BOR | FCO | BOR | PGG | CAO | FOO | 8 |
| Japão — J1 League | MAT | MAT | MAT | MAT | MAT | MAT | MAT | MAT | MAT | MAT | 1 |
| Japão — J2 League | YAA | NGA | YMA | HAI | SAK | MTS | HAI | YNO | TAK | KII | 9 |
| Arábia Saudita — Saudi Pro League | SID | SID | THU | SID | SID | SID | RAY | SID | SID | SID | 3 |
| Arábia Saudita — First Division League | SAR | FAI | BRQ | RYY | QAR | SQR | BAB | QMA | BAA | QAR | 9 |
| México — Liga MX | ALA | ESP | ALA | CEI | POR | POR | PRT | PRT | POR | POR | 5 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | GRO | RIJ | GRO | BOE | RIJ | GRO | MEE | 4 |
| Países Baixos — Eerste Divisie | EMD | DJK | LDE | SLO | GRN | LED | LDE | BLT | DIJ | LED | 8 |
| Polónia — Ekstraklasa | GRO | GRO | STA | PIA | GRO | PIA | STA | PIA | ZIE | STA | 4 |
| Portugal — Liga Portugal | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | CAR | 1 |
| Portugal — Liga Portugal 2 | VAE | PEN | MRV | PNE | LJE | FRO | MRV | FRO | PNE | REB | 7 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | ADL | GLE | ADL | GLE | INV | DLN | KIN | GLE | BEN | 7 |
| Suíça — Super League | KIR | BER | KIR | BER | KIR | BER | MUH | MUH | BRN | KRC | 5 |
| Turquia — Süper Lig | KZL | KZL | DEM | DAG | KZL | DAG | KZL | KZL | KZL | DEM | 3 |
| Turquia — 1. Lig | KAR | CAM | YLY | KZY | AKP | YES | KLD | YDZ | KLC | KZY | 9 |
| Emirados Árabes Unidos — UAE Pro League | RIM | DHA | BUS | RIM | DAF | DHA | THU | QAM | GHA | QAM | 7 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | CIB | CEI | ARR | CEI | CEI | CIB | CHA | CEI | ARR | CIB | 4 |
| Brasil — Brasileirão Série A | PDR | PED | PED | CAJ | PDR | PDR | CAJ | ANG | PED | CAJ | 4 |
| Brasil — Brasileirão Série B | ANO | VEN | CTA | PAL | VEN | CJU | BUR | VEN | CSC | CAO | 8 |
| Colômbia — Categoría Primera A | LUC | TAB | TAB | LUC | TAB | FLO | ARE | QUE | POR | LUC | 6 |
| Equador — LigaPro Serie A | ALA | TAB | COR | ROS | TAB | ROS | TAB | TAB | ALA | ALA | 4 |
| Coreia do Sul — K League 1 | HAD | DAE | HWA | JIN | NAM | NAM | HAD | NAM | JIN | JIN | 5 |
| Noruega — Eliteserien | LIE | ASV | ASV | LIE | LIE | SKO | LIE | FJE | FJE | ASV | 4 |
| Uruguai — Primera División | COR | COR | ROS | PAL | ROS | PAL | COR | PAL | COR | PAL | 3 |
| EUA (MLS) — MLS | FAL | BAY | BAY | SMM | REA | BAY | SUM | IRN | CED | SUM | 7 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 103.1 / 97 / 112 | 29.8 / 11 / 43 |
| Áustria — Bundesliga | 22 | 51.3 / 42 / 61 | 10.1 / 5 / 15 |
| Bélgica — Pro League | 30 | 74.3 / 66 / 78 | 17.2 / 10 / 24 |
| Bélgica — Challenger Pro League | 28 | 58.3 / 49 / 71 | 21.6 / 14 / 27 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 83.3 / 73 / 98 | 23.6 / 14 / 34 |
| Chéquia — Chance Liga | 30 | 71.0 / 58 / 80 | 14.0 / 9 / 18 |
| Dinamarca — Superliga | 22 | 54.1 / 47 / 61 | 11.6 / 5 / 16 |
| Inglaterra — Premier League | 38 | 93.2 / 79 / 112 | 14.2 / 4 / 20 |
| Inglaterra — Championship | 46 | 112.6 / 98 / 130 | 31.0 / 17 / 40 |
| Inglaterra — League One | 46 | 99.2 / 85 / 113 | 33.6 / 28 / 40 |
| Inglaterra — League Two | 46 | 93.4 / 86 / 101 | 36.7 / 27 / 44 |
| Espanha — La Liga | 38 | 97.6 / 92 / 109 | 11.9 / 3 / 24 |
| Espanha — Segunda División | 42 | 102.1 / 90 / 120 | 26.6 / 21 / 32 |
| Europa (resto) — Liga Resto da Europa | 38 | 92.4 / 71 / 107 | 27.2 / 21 / 33 |
| França — Ligue 1 | 34 | 87.7 / 74 / 102 | 17.3 / 11 / 22 |
| França — Ligue 2 | 34 | 77.4 / 63 / 96 | 14.9 / -4 / 24 |
| França — Ligue 3 | 38 | 76.9 / 69 / 86 | 28.7 / 20 / 37 |
| Alemanha — Bundesliga | 34 | 82.3 / 70 / 92 | 12.4 / 4 / 20 |
| Alemanha — 2. Bundesliga | 34 | 81.3 / 72 / 91 | 21.8 / 14 / 26 |
| Alemanha — 3. Liga | 38 | 80.3 / 68 / 87 | 28.5 / 19 / 38 |
| Grécia — Super League 1 | 26 | 65.6 / 55 / 73 | 14.2 / 6 / 21 |
| Itália — Serie A | 38 | 97.4 / 80 / 112 | 18.4 / 10 / 29 |
| Itália — Serie B | 38 | 88.4 / 77 / 101 | 21.6 / 5 / 34 |
| Japão — J1 League | 38 | 95.3 / 82 / 109 | 22.9 / 15 / 32 |
| Japão — J2 League | 38 | 82.8 / 70 / 90 | 26.7 / 16 / 34 |
| Arábia Saudita — Saudi Pro League | 34 | 85.0 / 74 / 95 | 18.6 / 12 / 26 |
| Arábia Saudita — First Division League | 34 | 80.6 / 64 / 96 | 25.9 / 19 / 33 |
| México — Liga MX | 34 | 79.1 / 69 / 94 | 21.5 / 14 / 29 |
| Países Baixos — Eredivisie | 34 | 82.5 / 71 / 93 | 17.3 / 11 / 24 |
| Países Baixos — Eerste Divisie | 38 | 79.3 / 70 / 86 | 32.7 / 30 / 36 |
| Polónia — Ekstraklasa | 34 | 74.2 / 67 / 83 | 20.0 / 14 / 32 |
| Portugal — Liga Portugal | 34 | 90.4 / 83 / 98 | 15.1 / 10 / 24 |
| Portugal — Liga Portugal 2 | 34 | 77.9 / 71 / 89 | 25.0 / 13 / 34 |
| Escócia — Premiership | 33 | 85.0 / 72 / 95 | 20.9 / 15 / 26 |
| Escócia — Championship | 36 | 71.4 / 61 / 82 | 27.7 / 18 / 34 |
| Suíça — Super League | 33 | 74.1 / 66 / 82 | 20.3 / 13 / 25 |
| Turquia — Süper Lig | 38 | 93.7 / 77 / 103 | 22.4 / 11 / 31 |
| Turquia — 1. Lig | 38 | 89.5 / 78 / 99 | 26.4 / 18 / 38 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 57.2 / 50 / 65 | 16.6 / 13 / 20 |
| Argentina — Liga Profesional | 29 | 74.2 / 66 / 80 | 9.8 / 4 / 18 |
| Brasil — Brasileirão Série A | 38 | 92.3 / 86 / 100 | 15.2 / -1 / 21 |
| Brasil — Brasileirão Série B | 38 | 93.7 / 75 / 110 | 21.6 / 17 / 27 |
| Colômbia — Categoría Primera A | 38 | 86.9 / 75 / 105 | 21.9 / 15 / 28 |
| Equador — LigaPro Serie A | 30 | 69.2 / 61 / 79 | 17.3 / 13 / 22 |
| Coreia do Sul — K League 1 | 33 | 66.1 / 60 / 79 | 24.7 / 15 / 30 |
| Noruega — Eliteserien | 30 | 65.6 / 55 / 77 | 18.3 / 7 / 23 |
| Uruguai — Primera División | 30 | 72.8 / 66 / 80 | 17.0 / 13 / 21 |
| EUA (MLS) — MLS | 29 | 65.0 / 57 / 73 | 18.3 / 13 / 27 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-1 |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 2-1 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | CD Salatejo (ESP) | 1-0 |
| 2026/27 | Liga Europa | Caldale Albion (ENG) | Olmedosa CF (ESP) | 1-0 |
| 2027 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |
| 2027/28 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Matsuno FC (JPN) | 2-0 |
| 2027/28 | Liga dos Campeões | Brackcombe Town (ENG) | AS Torrefranco (ITA) | 2-0 |
| 2027/28 | Liga Conferência | Brombury United (ENG) | Asteras Thalassopyrgos (GRE) | 4-0 |
| 2027/28 | Liga Europa | CF Alcormonte (ESP) | Dunbury Wanderers (ENG) | 1-0 |
| 2028 | Libertadores | Club Atlético General Ceibos (ARG) | Club Atlético Coronel Arroyito (ARG) | 2-0 |
| 2028/29 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Matsuno FC (JPN) | 1-0 |
| 2028/29 | Liga dos Campeões | SV Mühlwangen (GER) | AS Torrefranco (ITA) | 1-0 (a.p.) |
| 2028/29 | Liga Conferência | Duncester United (ENG) | Fontemarino Calcio (ITA) | 4-3 (a.p.) |
| 2028/29 | Liga Europa | FC Grüntal (GER) | Eintracht Steiningen (GER) | 3-2 |
| 2029 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-2 |
| 2029/30 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-1 (a.p.) |
| 2029/30 | Liga dos Campeões | AS Fonteville (FRA) | SV Mühlwangen (GER) | 1-0 (a.p.) |
| 2029/30 | Liga Conferência | FC Fontefranco (ITA) | Achilles Rijszand (NED) | 2-0 (a.p.) |
| 2029/30 | Liga Europa | Monvega CF (ESP) | Duncester United (ENG) | 2-0 |
| 2030 | Libertadores | Unión de Puerto Ceibos (ARG) | América de Campo do Cedro (BRA) | 3-1 |
| 2030/31 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 3-1 |
| 2030/31 | Liga dos Campeões | Brackcombe Town (ENG) | Carnley Albion (ENG) | 1-0 |
| 2030/31 | Liga Conferência | TSV Tannau (GER) | Olmedosa CF (ESP) | 1-0 |
| 2030/31 | Liga Europa | UD Mirallosa (ESP) | AC Fontebello (ITA) | 3-0 |
| 2031 | Libertadores | Unión de Puerto Ceibos (ARG) | Atlético Pouso das Pedras (BRA) | 2-0 |
| 2031/32 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 3-2 (a.p.) |
| 2031/32 | Liga dos Campeões | CF Alcormonte (ESP) | UD Mirallosa (ESP) | 2-0 |
| 2031/32 | Liga Conferência | Poggiovecchio Calcio (ITA) | TSV Hohenau (GER) | 4-1 |
| 2031/32 | Liga Europa | Olmedosa CF (ESP) | Yarmerholt Borough (ENG) | 2-1 (a.p.) |
| 2032 | Libertadores | Rio do Angico Futebol Clube (BRA) | Club Atlético Coronel Arroyito (ARG) | 2-1 |
| 2032/33 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Stella Kirisaki (JPN) | 1-0 |
| 2032/33 | Liga dos Campeões | AS Fonteville (FRA) | Carnley Albion (ENG) | 1-0 |
| 2032/33 | Liga Conferência | CD Gualrejo (ESP) | Dunbury Wanderers (ENG) | 2-0 |
| 2032/33 | Liga Europa | SV Mühlwangen (GER) | TSV Hohenau (GER) | 1-0 (a.p.) |
| 2033 | Libertadores | Grêmio Campo do Cajueiro (BRA) | Rio do Angico Futebol Clube (BRA) | 2-1 (a.p.) |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-0 |
| 2033/34 | Liga dos Campeões | Racing Club de Bellegarde (FRA) | Dunbury Wanderers (ENG) | 3-2 |
| 2033/34 | Liga Conferência | AS Fonteroc (FRA) | SC Buchstetten (GER) | 5-1 |
| 2033/34 | Liga Europa | UD Mirallosa (ESP) | US Montechiaro (ITA) | 3-1 (a.p.) |
| 2034 | Libertadores | Rio do Angico Futebol Clube (BRA) | Clube Atlético Pouso das Pedras (BRA) | 3-0 |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 1-0 |
| 2034/35 | Liga dos Campeões | Brackcombe Town (ENG) | FC Casteldorato (ITA) | 1-0 |
| 2034/35 | Liga Conferência | Caldale Albion (ENG) | Dağbağspor (TUR) | 3-1 (a.p.) |
| 2034/35 | Liga Europa | Quendale Athletic (ENG) | Real Tarrariza (ESP) | 2-1 |
| 2035 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 1-0 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 1-1 (a.p.) 4-3 g.p. |
| 2035/36 | Liga dos Campeões | Brackcombe Town (ENG) | SpVgg Mühlberg (GER) | 2-0 |
| 2035/36 | Liga Conferência | Olmedosa CF (ESP) | AS Torrefranco (ITA) | 3-1 (a.p.) |
| 2035/36 | Liga Europa | Stourmercombe City (ENG) | Albarrada CF (ESP) | 1-0 |
| 2036 | Libertadores | Grêmio Campo do Cajueiro (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-1 |

Títulos por país: Liga dos Campeões Asiática — JPN: 8; Libertadores — BRA: 6; Liga Europa — ESP: 5; Liga Conferência — ENG: 4; Libertadores — ARG: 4; Liga dos Campeões — ENG: 4; Liga Europa — ENG: 3; Liga dos Campeões — FRA: 3; Liga Europa — GER: 2; Liga Conferência — ITA: 2; Liga dos Campeões Asiática — KSA: 2; Liga Conferência — ESP: 2; Liga dos Campeões — ITA: 1; Liga dos Campeões — GER: 1; Liga Conferência — GER: 1; Liga dos Campeões — ESP: 1; Liga Conferência — FRA: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ENG1 16.39, ITA1 15.50, NED1 14.50 | ENG1, ITA1 | FC Casteldorato (ITA) / Caldale Albion (ENG) / Dunbury Wanderers (ENG) |
| 2027/28 | ENG1 17.50, NED1 14.30, ITA1 14.11 | ENG1, NED1 | Brackcombe Town (ENG) / CF Alcormonte (ESP) / Brombury United (ENG) |
| 2028/29 | GER1 18.43, ENG1 15.45, ITA1 14.64 | GER1, ENG1 | SV Mühlwangen (GER) / FC Grüntal (GER) / Duncester United (ENG) |
| 2029/30 | ENG1 17.83, ITA1 15.71, ESP1 14.64 | ENG1, ITA1 | AS Fonteville (FRA) / Monvega CF (ESP) / FC Fontefranco (ITA) |
| 2030/31 | ENG1 17.94, GER1 17.71, ESP1 14.94 | ENG1, GER1 | Brackcombe Town (ENG) / UD Mirallosa (ESP) / TSV Tannau (GER) |
| 2031/32 | ESP1 19.81, ENG1 16.44, ITA1 12.86 | ESP1, ENG1 | CF Alcormonte (ESP) / Olmedosa CF (ESP) / Poggiovecchio Calcio (ITA) |
| 2032/33 | GER1 16.79, ESP1 15.80, ENG1 14.75 | GER1, ESP1 | AS Fonteville (FRA) / SV Mühlwangen (GER) / CD Gualrejo (ESP) |
| 2033/34 | ITA1 16.21, ENG1 16.00, ESP1 16.00 | ITA1, ENG1 | Racing Club de Bellegarde (FRA) / UD Mirallosa (ESP) / AS Fonteroc (FRA) |
| 2034/35 | ENG1 21.06, ITA1 13.81, GER1 13.14 | ENG1, ITA1 | Brackcombe Town (ENG) / Quendale Athletic (ENG) / Caldale Albion (ENG) |
| 2035/36 | GER1 20.00, ENG1 16.14, ESP1 13.93 | GER1, ENG1 | Brackcombe Town (ENG) / Stourmercombe City (ENG) / Olmedosa CF (ESP) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | RHE | KIR | KIR | HAS | KIR | RHE | KIR | KIR | KIR |
| Taça da Bélgica (Bélgica) | HER | RON | RON | BEA | RON | BEA | VER | BEA | RON | VRS |
| Taça da Croácia (Croácia) | ZAZ | ZAZ | SLA | ZAZ | SLA | SLA | ZAZ | SLA | SLA | NOV |
| Taça da Chéquia (Chéquia) | LUH | OST | SLA | SLA | RYC | POD | SLA | LES | POD | POD |
| Taça da Dinamarca (Dinamarca) | VES | BRO | VES | HED | VES | HED | VES | VES | BRO | VES |
| FA Cup (Inglaterra) | CAL | BRA | BRA | BRA | YAR | BRA | CAR | DUN | QUE | EVE |
| EFL Cup (Carabao Cup) (Inglaterra) | BRA | BRA | BRA | BRA | BRA | QUE | CAR | BRA | BRA | EVE |
| Copa del Rey (Espanha) | MIR | OLM | OLM | OME | OME | ALC | ALC | MRA | MIR | ALC |
| Coupe de France (França) | COU | FOL | VER | FON | FNT | BEL | FON | VIL | FON | VER |
| DFB-Pokal (Alemanha) | MUH | GRU | MUH | MUH | GRU | HOH | GRU | MHL | MUH | MHL |
| Taça da Grécia (Grécia) | ORI | ORI | ORI | THA | ORI | ORI | ORI | PER | ORI | PER |
| Coppa Italia (Itália) | CAS | CAS | VLF | CAS | CST | TOR | TOR | TOR | CAS | TGO |
| Emperor's Cup (Japão) | HOS | ISH | KIR | FUJ | MAT | MAT | KAW | MAT | MAT | SAK |
| J.League Cup (Japão) | MAT | MAT | MAT | OKA | FUJ | SAK | MAT | MAT | MAT | MAT |
| King's Cup (Arábia Saudita) | DHA | SID | THU | SQR | DHA | THU | SID | THA | SID | SID |
| KNVB Beker (Países Baixos) | RIJ | GRO | GRO | ADE | RIJ | GRO | BLO | BOE | EEM | GOV |
| Taça da Polónia (Polónia) | PIA | PIA | MIS | STA | JAG | DEB | RKO | STA | WOD | GRO |
| Taça de Portugal (Portugal) | CAR | ALV | CAR | ALV | CAR | VAL | FRE | CAR | LAJ | ALV |
| Taça da Liga (Portugal) | CAR | CAR | VAL | CAR | CAR | FRE | CAR | CAR | VAL | CAR |
| Scottish Cup (Escócia) | ARD | ARD | CRA | ARD | ARD | DAL | ARD | ARD | ARD | LOC |
| Scottish League Cup (Escócia) | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | LOC |
| Taça da Suíça (Suíça) | MUH | KIR | KIR | BER | KIR | MUH | MUH | KIR | BER | KIR |
| Taça da Turquia (Turquia) | KZL | KZL | DAG | KZL | KZL | DGT | KZL | KZL | KZL | DEM |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | GHA | THU | SID | MAN | MAN | GHA | THU | RIM | THU |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CHA | CEI | CEI | CIB | ARR | ARR | ARO | CEI | TOS | CIB |
| Copa do Brasil (Brasil) | ANG | PED | PED | PDR | PDR | ANG | PDR | ANG | PDR | JAT |
| Copa Colombia (Colômbia) | TAB | TAB | TAB | QUE | TAB | QUE | LUC | CUM | LUC | LUC |
| Copa Equador (Equador) | TBL | COR | LUC | AAM | ALA | TAB | ARE | TBL | COR | ARE |
| Korean FA Cup (Coreia do Sul) | NAM | NAM | NMC | HAN | NAM | NAM | HAN | SEO | HAD | NAM |
| Taça da Noruega (Noruega) | SKO | ASV | SOG | NOR | FJE | SKO | SKO | BER | FJE | LIE |
| Copa Uruguai (Uruguai) | PAL | COR | ROS | PAL | PAL | SOL | MIR | COR | COR | ALA |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 41 | 41 | 2 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 42 | 42 | 3 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 42 | 42 | 3 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 41 | 41 | 2 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 42 | 42 | 3 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 40 | 40 | 1 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 40 | 40 | 1 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 42 | 42 | 3 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 41 | 41 | 2 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 42 | 42 | 3 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
