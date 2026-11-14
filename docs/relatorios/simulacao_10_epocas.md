# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.57 golos; casa 45.6%, empate 24.8%, fora 29.6%; 0-0 8.0%; 5+ 12.0%; 7+ 1.1% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.61 golos; casa 45.6%, empate 24.4%, fora 30.0%; 0-0 7.5%; 5+ 12.4%; 7+ 1.0% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.35; 91.7% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.58; 96.5% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.3; 0 ligas com sempre o mesmo; 0 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 49.0%; um dos 3 favoritos em 80.4% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 456 subidas, 456 descidas, 580 saídas para o exterior, 580 entradas; 37.6% dos que sobem descem logo; 132 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 1473d3c9 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 12017 ms / 15394 ms |
| Uma semana de calendário (média / p95 / máx.) | 234.3 ms / 490.6 ms / 713.5 ms |
| Memória (heap) no fim | 425 MB |
| Gravação por época (todos os jogos, gzip) | 76 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 4 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | ADE | ADE | ADE | ADE | ADE | GHA | GHA | ADE | 3 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | EIC | DOR | KIR | KIR | KIR | 3 |
| Bélgica — Pro League | HER | OOS | VER | BEA | BEA | BEA | BEA | BEA | HER | BEA | 4 |
| Bélgica — Challenger Pro League | BAU | MAA | HRE | HOG | BAU | HOG | HOO | ROK | HOG | VRS | 7 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | SLA | SLA | SLA | NOJ | NOJ | 3 |
| Chéquia — Chance Liga | LUH | POD | LUH | LUH | LUH | LUH | LUH | LHN | POD | SAV | 4 |
| Dinamarca — Superliga | VES | BRO | VES | BRO | SOL | BRO | HED | VES | STR | VES | 5 |
| Inglaterra — Premier League | BRA | BRA | DNC | BRA | BRA | BRA | CAR | STO | BRA | QUE | 5 |
| Inglaterra — Championship | FAL | NET | FAL | THO | CAL | EVE | DNC | MAR | ASH | STM | 9 |
| Inglaterra — League One | BRH | SHE | LAN | WIT | STE | BRH | PNB | PEN | ELD | DNM | 9 |
| Inglaterra — League Two | MOR | NST | ASR | ELT | CAK | BOM | MOR | CAE | NEY | DRA | 9 |
| Espanha — La Liga | RIB | OLM | RIB | HIN | ALC | ALC | ALC | MRA | MIR | MRA | 6 |
| Espanha — Segunda División | MNM | LOR | GUA | MNM | MIA | HNO | MNM | CAL | GUA | MNM | 6 |
| Europa (resto) — Liga Resto da Europa | AGB | FEH | AKE | FEH | FEH | FEH | FEH | FEH | AKE | FEH | 3 |
| França — Ligue 1 | FNT | FON | FON | FON | FON | FON | FON | BEL | FON | FON | 3 |
| França — Ligue 2 | PES | PLE | ROC | SAU | ROC | CLA | FOL | FOA | CHA | SAU | 8 |
| França — Ligue 3 | CAI | VID | VRB | MNT | SEU | VIT | VAL | VIT | CHE | CLA | 9 |
| Alemanha — Bundesliga | MUH | MUH | MUH | MUH | MUH | GRU | GRU | MUH | MUH | GRU | 2 |
| Alemanha — 2. Bundesliga | SEI | WES | GAL | SEI | HAS | SEI | BUC | TNN | NEU | GAL | 7 |
| Alemanha — 3. Liga | STN | WAL | HSE | STL | OER | STG | OER | HSE | WST | LIN | 8 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | ORI | ORI | KAL | ORI | PER | 4 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | CAS | CAS | CST | CAS | CAS | 2 |
| Itália — Serie B | TGO | BOR | CAO | TOO | PON | ROC | POO | PON | SER | TOO | 8 |
| Japão — J1 League | MAT | MAT | MAT | YAM | YAM | MAT | HOS | ISH | MAT | FUJ | 5 |
| Japão — J2 League | YAA | HAN | YAA | TKA | HOS | YAE | HAN | NAG | KIR | KII | 8 |
| Arábia Saudita — Saudi Pro League | SID | SID | RAY | SID | QAR | RAY | RAY | SID | SID | SID | 3 |
| Arábia Saudita — First Division League | SHI | BRQ | SHI | RYY | TUR | SQR | MAN | QAR | SAH | SHI | 8 |
| México — Liga MX | ESP | SOL | POR | POR | POR | POR | POR | PRT | POR | POR | 4 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | RIJ | RIJ | RIJ | RIJ | RIJ | ALD | MEE | 4 |
| Países Baixos — Eerste Divisie | EMD | BLT | DJK | LED | MER | LED | DJK | LDE | DIJ | EEM | 8 |
| Polónia — Ekstraklasa | GRO | PIA | STA | GRO | GRO | GRO | STA | GRO | GOS | GOS | 4 |
| Portugal — Liga Portugal | CAR | ALV | CAR | ALV | CAR | CAR | CAR | CAR | LAJ | CAR | 3 |
| Portugal — Liga Portugal 2 | VAE | PEN | MRV | PNE | LJE | PNE | MRV | PNE | PEN | LAS | 6 |
| Escócia — Premiership | ARD | ARD | DAL | KIN | ARD | ARD | ARD | ARD | ARD | ARD | 3 |
| Escócia — Championship | DAN | DLN | GLE | DAN | CRA | DLA | INV | DAN | CRA | BEN | 7 |
| Suíça — Super League | KIR | BER | KIR | BER | KIR | BER | MUH | KIR | KIR | KIR | 3 |
| Turquia — Süper Lig | KZL | KZL | DEM | KZL | KZL | DAG | KZL | KZL | KZL | DEM | 3 |
| Turquia — 1. Lig | DGT | CAM | YLY | KLT | DGT | KAR | YLG | DGY | YLY | KAR | 7 |
| Emirados Árabes Unidos — UAE Pro League | DHA | DHA | RIM | RIM | RIM | DHA | THU | QAM | THU | RIM | 4 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | ARR | CEI | ARR | CIB | ARR | CIB | CEI | QUI | MOR | CIB | 5 |
| Brasil — Brasileirão Série A | PDR | PED | PED | PED | PED | ANG | CED | ANG | PED | CAJ | 5 |
| Brasil — Brasileirão Série B | ANO | VEN | AGI | VES | VEN | PEQ | AGI | CAO | CSC | JAT | 8 |
| Colômbia — Categoría Primera A | LUC | TAB | TAB | QUE | TAB | CUM | ARE | QUE | QUE | QUE | 5 |
| Equador — LigaPro Serie A | COR | TAB | COR | TAB | TAB | COR | TAB | TAB | ALA | TAB | 3 |
| Coreia do Sul — K League 1 | NAM | HAD | HAD | MUN | NAM | NAM | MUN | MNC | MUN | HAD | 4 |
| Noruega — Eliteserien | LIE | LIL | LIE | ASV | NOR | SKO | ASV | BER | NOR | NOR | 6 |
| Uruguai — Primera División | PAL | COR | ROS | PAL | ROS | PAL | ROS | ROS | ROS | COR | 3 |
| EUA (MLS) — MLS | FAL | BAY | PIN | RED | REA | SIL | RDV | FAL | CER | SUM | 9 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 105.5 / 101 / 121 | 25.9 / 8 / 39 |
| Áustria — Bundesliga | 22 | 53.5 / 48 / 64 | 11.6 / 2 / 17 |
| Bélgica — Pro League | 30 | 72.2 / 63 / 88 | 15.9 / 9 / 26 |
| Bélgica — Challenger Pro League | 28 | 56.8 / 48 / 65 | 22.5 / 16 / 30 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 82.5 / 65 / 99 | 21.0 / 15 / 29 |
| Chéquia — Chance Liga | 30 | 70.8 / 61 / 83 | 14.4 / 7 / 21 |
| Dinamarca — Superliga | 22 | 50.5 / 43 / 59 | 11.2 / 6 / 16 |
| Inglaterra — Premier League | 38 | 96.6 / 90 / 110 | 17.0 / 3 / 30 |
| Inglaterra — Championship | 46 | 116.4 / 104 / 129 | 28.0 / 19 / 34 |
| Inglaterra — League One | 46 | 98.3 / 88 / 110 | 35.1 / 31 / 38 |
| Inglaterra — League Two | 46 | 93.7 / 85 / 100 | 32.6 / 27 / 39 |
| Espanha — La Liga | 38 | 98.8 / 84 / 112 | 15.3 / 5 / 23 |
| Espanha — Segunda División | 42 | 99.9 / 89 / 111 | 23.4 / 17 / 31 |
| Europa (resto) — Liga Resto da Europa | 38 | 96.0 / 82 / 110 | 24.3 / 19 / 30 |
| França — Ligue 1 | 34 | 88.9 / 78 / 98 | 16.6 / 7 / 25 |
| França — Ligue 2 | 34 | 78.5 / 70 / 95 | 21.4 / 15 / 25 |
| França — Ligue 3 | 38 | 78.0 / 71 / 92 | 27.8 / 23 / 40 |
| Alemanha — Bundesliga | 34 | 88.7 / 78 / 97 | 13.0 / 4 / 24 |
| Alemanha — 2. Bundesliga | 34 | 82.6 / 72 / 96 | 21.8 / 14 / 30 |
| Alemanha — 3. Liga | 38 | 80.3 / 70 / 89 | 23.6 / 11 / 30 |
| Grécia — Super League 1 | 26 | 64.7 / 54 / 75 | 13.4 / 9 / 19 |
| Itália — Serie A | 38 | 99.4 / 76 / 111 | 14.2 / 10 / 17 |
| Itália — Serie B | 38 | 92.2 / 77 / 101 | 22.5 / 16 / 31 |
| Japão — J1 League | 38 | 85.3 / 76 / 98 | 24.5 / 13 / 36 |
| Japão — J2 League | 38 | 87.0 / 69 / 107 | 24.2 / 12 / 36 |
| Arábia Saudita — Saudi Pro League | 34 | 84.4 / 63 / 97 | 17.5 / 12 / 21 |
| Arábia Saudita — First Division League | 34 | 78.2 / 64 / 92 | 25.2 / 19 / 32 |
| México — Liga MX | 34 | 77.4 / 65 / 93 | 24.1 / 15 / 33 |
| Países Baixos — Eredivisie | 34 | 85.6 / 73 / 100 | 17.5 / 11 / 24 |
| Países Baixos — Eerste Divisie | 38 | 79.0 / 73 / 86 | 29.7 / 22 / 34 |
| Polónia — Ekstraklasa | 34 | 77.8 / 73 / 82 | 19.9 / 5 / 29 |
| Portugal — Liga Portugal | 34 | 84.9 / 74 / 97 | 16.8 / 7 / 26 |
| Portugal — Liga Portugal 2 | 34 | 74.1 / 59 / 87 | 23.0 / 19 / 32 |
| Escócia — Premiership | 33 | 85.8 / 72 / 97 | 18.7 / 9 / 27 |
| Escócia — Championship | 36 | 77.3 / 65 / 94 | 25.0 / 17 / 35 |
| Suíça — Super League | 33 | 69.8 / 62 / 82 | 19.3 / 10 / 27 |
| Turquia — Süper Lig | 38 | 95.0 / 83 / 112 | 19.0 / 13 / 25 |
| Turquia — 1. Lig | 38 | 86.3 / 72 / 97 | 22.8 / 14 / 30 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 56.9 / 47 / 63 | 17.5 / 9 / 24 |
| Argentina — Liga Profesional | 29 | 73.8 / 66 / 82 | 8.9 / 1 / 19 |
| Brasil — Brasileirão Série A | 38 | 94.9 / 82 / 106 | 14.9 / 10 / 27 |
| Brasil — Brasileirão Série B | 38 | 96.4 / 90 / 105 | 18.7 / 12 / 24 |
| Colômbia — Categoría Primera A | 38 | 86.7 / 75 / 98 | 22.3 / 17 / 29 |
| Equador — LigaPro Serie A | 30 | 68.6 / 63 / 73 | 14.8 / 8 / 24 |
| Coreia do Sul — K League 1 | 33 | 70.2 / 55 / 84 | 24.6 / 19 / 33 |
| Noruega — Eliteserien | 30 | 63.9 / 57 / 71 | 14.2 / 5 / 26 |
| Uruguai — Primera División | 30 | 73.4 / 67 / 87 | 16.6 / 8 / 23 |
| EUA (MLS) — MLS | 29 | 65.7 / 56 / 73 | 16.9 / 2 / 28 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-1 |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | AS Torrefranco (ITA) | 5-0 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | CD Salatejo (ESP) | 1-0 |
| 2026/27 | Liga Europa | Kızılpınarspor (TUR) | Achilles Rijszand (NED) | 1-1 (a.p.) 5-3 g.p. |
| 2027 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 2-0 |
| 2027/28 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 2-0 |
| 2027/28 | Liga dos Campeões | Olmedosa CF (ESP) | FC Casteldorato (ITA) | 2-1 |
| 2027/28 | Liga Conferência | VV Alderveen (NED) | FC Fontefranco (ITA) | 2-1 |
| 2027/28 | Liga Europa | Dunbury Wanderers (ENG) | Fontemarino Calcio (ITA) | 2-1 |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 2-0 |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya Club (KSA) | 2-1 |
| 2028/29 | Liga dos Campeões | Eintracht Steiningen (GER) | FC Grüntal (GER) | 6-0 |
| 2028/29 | Liga Conferência | Carnley Albion (ENG) | Virtus Casteldorato (ITA) | 1-0 |
| 2028/29 | Liga Europa | Fontemarino Calcio (ITA) | AC Valfiore (ITA) | 3-1 |
| 2029 | Libertadores | Rio do Angico Futebol Clube (BRA) | Atlético Pouso das Pedras (BRA) | 0-0 (a.p.) 4-3 g.p. |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Umm Qamar FC (KSA) | 3-3 (a.p.) 5-4 g.p. |
| 2029/30 | Liga dos Campeões | CF Alcormonte (ESP) | FC Casteldorato (ITA) | 4-1 |
| 2029/30 | Liga Conferência | Olmevega CF (ESP) | FC Podín nad Lesem (CZE) | 1-0 (a.p.) |
| 2029/30 | Liga Europa | AS Fonteroc (FRA) | Monvega CF (ESP) | 1-0 |
| 2030 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2030/31 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Munrim Dragons (KOR) | 2-1 |
| 2030/31 | Liga dos Campeões | Brackcombe Town (ENG) | CF Alcormonte (ESP) | 4-1 |
| 2030/31 | Liga Conferência | SpVgg Mühlberg (GER) | US Marmont (FRA) | 1-0 |
| 2030/31 | Liga Europa | Torrefranco Calcio (ITA) | AJ Villegarde (FRA) | 1-0 |
| 2031 | Libertadores | Unión de Puerto Ceibos (ARG) | Grêmio Campo do Cajueiro (BRA) | 3-2 |
| 2031/32 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Ishioka SC (JPN) | 2-0 |
| 2031/32 | Liga dos Campeões | CF Alcormonte (ESP) | FC Casteldorato (ITA) | 2-1 |
| 2031/32 | Liga Conferência | Olmedosa CF (ESP) | KS Miszów (POL) | 3-0 |
| 2031/32 | Liga Europa | Real Riberrada (ESP) | SC Zelltal (GER) | 0-0 (a.p.) 4-3 g.p. |
| 2032 | Libertadores | Rio do Angico Futebol Clube (BRA) | Atlético Pouso das Pedras (BRA) | 2-1 |
| 2032/33 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Al Sidra Club (KSA) | 2-0 |
| 2032/33 | Liga dos Campeões | AS Fonteville (FRA) | AS Torrefranco (ITA) | 5-0 |
| 2032/33 | Liga Conferência | Kızılpınarspor (TUR) | Torrefranco Calcio (ITA) | 4-3 (a.p.) |
| 2032/33 | Liga Europa | SS Valfranco (ITA) | Atlético Hinovega (ESP) | 5-0 |
| 2033 | Libertadores | Atlético Pouso das Pedras (BRA) | Campo dos Ventos Futebol Clube (BRA) | 3-0 |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-0 |
| 2033/34 | Liga dos Campeões | AS Torrefranco (ITA) | Olmedosa CF (ESP) | 3-2 (a.p.) |
| 2033/34 | Liga Conferência | AS Montbrun (FRA) | Netherenwick Wanderers (ENG) | 2-1 |
| 2033/34 | Liga Europa | Netherenwick Athletic (ENG) | Stourby City (ENG) | 1-0 |
| 2034 | Libertadores | Rio do Angico Futebol Clube (BRA) | América de Campo do Cedro (BRA) | 2-1 |
| 2034/35 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Fujihara FC (JPN) | 4-0 |
| 2034/35 | Liga dos Campeões | Quendale Athletic (ENG) | Brackcombe Town (ENG) | 1-0 |
| 2034/35 | Liga Conferência | SC Buchstetten (GER) | Yarmerholt Borough (ENG) | 1-0 |
| 2034/35 | Liga Europa | FC Casteldorato (ITA) | União de Casal das Lajes (POR) | 3-0 |
| 2035 | Libertadores | Atlético Pouso das Pedras (BRA) | América de Campo do Cedro (BRA) | 2-0 |
| 2035/36 | Liga dos Campeões Asiática | Umm Qamar FC (KSA) | Al Sidra Club (KSA) | 2-1 |
| 2035/36 | Liga dos Campeões | Brackcombe Town (ENG) | Quendale Athletic (ENG) | 2-1 |
| 2035/36 | Liga Conferência | Caldale Albion (ENG) | US Ponterosso (ITA) | 1-0 (a.p.) |
| 2035/36 | Liga Europa | KSC Beausart (BEL) | AC Valfiore (ITA) | 4-0 |
| 2036 | Libertadores | Atlético Pouso das Pedras (BRA) | América de Campo do Cedro (BRA) | 4-4 (a.p.) 5-3 g.p. |

Títulos por país: Libertadores — BRA: 9; Liga dos Campeões Asiática — KSA: 7; Liga Europa — ITA: 4; Liga dos Campeões Asiática — JPN: 3; Liga Conferência — ENG: 3; Liga dos Campeões — ESP: 3; Liga dos Campeões — ENG: 3; Liga dos Campeões — ITA: 2; Liga Europa — ENG: 2; Liga Conferência — ESP: 2; Liga Conferência — GER: 2; Liga Europa — TUR: 1; Liga Conferência — NED: 1; Liga dos Campeões — GER: 1; Liga Europa — FRA: 1; Libertadores — ARG: 1; Liga Europa — ESP: 1; Liga dos Campeões — FRA: 1; Liga Conferência — TUR: 1; Liga Conferência — FRA: 1; Liga Europa — BEL: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 18.39, ESP1 15.38, ENG1 14.28 | ITA1, ESP1 | FC Casteldorato (ITA) / Kızılpınarspor (TUR) / Dunbury Wanderers (ENG) |
| 2027/28 | ENG1 16.88, ITA1 15.83, NED1 14.70 | ENG1, ITA1 | Olmedosa CF (ESP) / Dunbury Wanderers (ENG) / VV Alderveen (NED) |
| 2028/29 | GER1 18.71, ITA1 15.75, ESP1 14.75 | GER1, ITA1 | Eintracht Steiningen (GER) / Fontemarino Calcio (ITA) / Carnley Albion (ENG) |
| 2029/30 | GER1 16.17, ESP1 16.14, ENG1 13.94 | GER1, ESP1 | CF Alcormonte (ESP) / AS Fonteroc (FRA) / Olmevega CF (ESP) |
| 2030/31 | ITA1 18.50, ENG1 18.00, ESP1 12.80 | ITA1, ENG1 | Brackcombe Town (ENG) / Torrefranco Calcio (ITA) / SpVgg Mühlberg (GER) |
| 2031/32 | ESP1 19.00, ENG1 15.28, ITA1 13.94 | ESP1, ENG1 | CF Alcormonte (ESP) / Real Riberrada (ESP) / Olmedosa CF (ESP) |
| 2032/33 | ITA1 16.71, ESP1 15.77, FRA1 13.64 | ITA1, ESP1 | AS Fonteville (FRA) / SS Valfranco (ITA) / Kızılpınarspor (TUR) |
| 2033/34 | ENG1 16.79, ESP1 14.63, ITA1 14.44 | ENG1, ESP1 | AS Torrefranco (ITA) / Netherenwick Athletic (ENG) / AS Montbrun (FRA) |
| 2034/35 | ENG1 19.94, ITA1 14.63, GER1 14.00 | ENG1, ITA1 | Quendale Athletic (ENG) / FC Casteldorato (ITA) / SC Buchstetten (GER) |
| 2035/36 | ENG1 17.56, ESP1 15.64, ITA1 12.28 | ENG1, ESP1 | Brackcombe Town (ENG) / KSC Beausart (BEL) / Caldale Albion (ENG) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | KIR | KIR | KIR | KIR | DOR | HAS | RHE | KIR | KIR |
| Taça da Bélgica (Bélgica) | HER | VER | MOL | BEA | RON | BEA | HER | BEA | RON | BEA |
| Taça da Croácia (Croácia) | ZAZ | SLA | SLA | VIK | ZAZ | SLA | ZAZ | ZAZ | BRE | SLA |
| Taça da Chéquia (Chéquia) | LUH | RYC | SLA | SLA | LUH | LUH | LUH | PDS | LUH | LUH |
| Taça da Dinamarca (Dinamarca) | VES | SOL | VES | VES | VES | BRO | HED | VES | SOL | SER |
| FA Cup (Inglaterra) | BRA | STY | DNC | STO | STO | DUN | NET | STY | BRA | QUE |
| EFL Cup (Carabao Cup) (Inglaterra) | BRA | BRA | BRO | BRA | STO | NTH | DNC | BRA | QUE | QUE |
| Copa del Rey (Espanha) | MIR | OLM | OLM | ALC | ALC | HIN | OLM | MIR | MIR | MRA |
| Coupe de France (França) | FNT | FOL | FON | FON | FON | FON | FON | FON | FON | COU |
| DFB-Pokal (Alemanha) | MUH | MUH | MUH | SEI | GRU | ZEL | HOH | MHL | MHL | GRU |
| Taça da Grécia (Grécia) | ORI | ORI | ORI | PER | ORI | THA | ORI | ORI | ORI | ORI |
| Coppa Italia (Itália) | CAS | CAS | CST | CAS | CAS | CAS | TOR | CST | CAS | CAS |
| Emperor's Cup (Japão) | YAA | MAT | HOS | KIR | MAT | SAK | HOS | YAM | TKA | ISH |
| J.League Cup (Japão) | ISH | MAT | KAW | KIR | HAI | SAK | HOS | YAE | TKA | YAA |
| King's Cup (Arábia Saudita) | SID | RAY | SID | BAR | FAI | SID | RAY | SID | SID | SID |
| KNVB Beker (Países Baixos) | RIJ | RIJ | RIJ | ALD | RIJ | RIJ | MEE | RIJ | ALD | MEE |
| Taça da Polónia (Polónia) | MIS | ZIE | DEN | GRO | PAR | PIA | RKO | MIS | GOS | RKO |
| Taça de Portugal (Portugal) | CAR | CAR | CAR | ALV | VAL | VAL | CAR | CAR | CRV | LAJ |
| Taça da Liga (Portugal) | CAR | CAR | CAR | CAR | CAR | FRE | FON | FON | CAR | VAL |
| Scottish Cup (Escócia) | ARD | ARD | DAL | ARD | ARD | ARD | ARD | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | KNL | ARD | LOC | ARD | LOC | DAL | DAL | DAL | BAL |
| Taça da Suíça (Suíça) | KIR | BER | KIR | MHL | KIR | KIR | BRN | KIR | KRC | KIR |
| Taça da Turquia (Turquia) | DEM | YLD | KZL | AKY | KZL | DAG | KLC | KZL | KZL | SUT |
| UAE President's Cup (Emirados Árabes Unidos) | RIM | RIM | GHA | RIM | RIM | THU | SID | THU | THU | MAN |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CHA | CEI | MOR | CIB | ARR | CIB | CEI | QUI | QUI | ARR |
| Copa do Brasil (Brasil) | ANG | PED | PED | CJU | CAJ | CJU | CAJ | PED | PED | CED |
| Copa Colombia (Colômbia) | CUE | FLO | TAB | QUE | MIR | MIR | MIR | QUE | LUC | QUE |
| Copa Equador (Equador) | COR | LUC | TAB | AAM | SOL | TAB | ALA | TAB | ALA | CMB |
| Korean FA Cup (Coreia do Sul) | NAM | MUN | MUN | NAM | DAE | NAM | NAM | NMC | JIN | NAM |
| Taça da Noruega (Noruega) | SKO | ASV | ASV | ELV | NOR | SKO | ASV | LIL | NOR | NOR |
| Copa Uruguai (Uruguai) | PAL | COR | ROS | COL | CRR | SOL | ROS | ROS | ROS | PAA |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 43 | 43 | 4 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 41 | 41 | 2 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 43 | 43 | 4 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 42 | 42 | 3 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 42 | 42 | 3 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 41 | 41 | 2 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 43 | 43 | 4 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 42 | 42 | 3 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 39 | 39 | 0 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 40 | 40 | 1 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
