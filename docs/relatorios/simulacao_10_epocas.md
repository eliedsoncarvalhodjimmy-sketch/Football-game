# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.56 golos; casa 46.0%, empate 24.5%, fora 29.5%; 0-0 8.0%; 5+ 11.9%; 7+ 1.0% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.54 golos; casa 45.4%, empate 25.0%, fora 29.6%; 0-0 8.1%; 5+ 11.5%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.32; 92.9% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.60; 97.1% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.3; 0 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 46.5%; um dos 3 favoritos em 80.2% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 455 subidas, 455 descidas, 580 saídas para o exterior, 580 entradas; 48.2% dos que sobem descem logo; 140 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital d07fd044 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 5286 ms / 6151 ms |
| Uma semana de calendário (média / p95 / máx.) | 101.6 ms / 202.8 ms / 523.7 ms |
| Memória (heap) no fim | 374 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 6 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | NGO | ADE | ADE | IKE | ADE | NGO | ADE | MRA | 4 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | DOR | DOR | KIR | FAL | BUC | 4 |
| Bélgica — Pro League | VER | VER | VER | BEA | BEA | BEA | BEA | BEA | RON | RON | 3 |
| Bélgica — Challenger Pro League | BAU | MAA | ROK | HRE | LER | BAU | HRE | LER | ZAN | VRS | 7 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | SLA | ZAZ | SLA | SLA | SLA | NOJ | NOJ | 3 |
| Chéquia — Chance Liga | POD | POD | KOS | SLA | LUH | LUH | LUH | POD | POD | POD | 4 |
| Dinamarca — Superliga | VES | VES | SER | BRO | VES | BRO | VES | VES | BRO | BRO | 3 |
| Inglaterra — Premier League | BRA | BRA | CAR | STO | CAR | BRA | STY | CAR | BRA | SOU | 5 |
| Inglaterra — Championship | FAL | NET | YAR | DNW | CAL | OAK | DNC | PEN | HAT | EVE | 10 |
| Inglaterra — League One | BRH | TER | WHI | WIT | STE | GRY | GRE | TER | TOR | DNM | 9 |
| Inglaterra — League Two | LNG | FLH | NEH | DUY | CAK | SHE | OKP | QUT | NED | FLW | 10 |
| Espanha — La Liga | RIB | OLM | HIN | HIN | ALC | ALC | ALC | ALC | MIR | RIB | 5 |
| Espanha — Segunda División | MNM | LOR | GUA | SLA | MNM | LOR | PER | CAL | MNM | SAL | 7 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | AGB | FEH | FEH | FEH | FEH | FEH | FEH | FEH | 2 |
| França — Ligue 1 | FNT | FON | FON | FON | BEL | FON | FON | FON | FON | FON | 3 |
| França — Ligue 2 | PES | FUN | ROC | FUN | CLA | FUN | CLA | FOP | BAU | FUN | 6 |
| França — Ligue 3 | CAI | PIS | VAL | PIS | SEU | VLC | VLL | SUV | LIE | SUV | 8 |
| Alemanha — Bundesliga | MUH | MUH | STE | MUH | MUH | GRU | GRU | ZEL | MUH | GRU | 4 |
| Alemanha — 2. Bundesliga | SEI | MUD | ZLL | NEU | WES | SEI | HHE | GUN | SEI | GRL | 8 |
| Alemanha — 3. Liga | STN | STM | BUK | BCH | HHE | WEK | LIN | OBE | STN | WEK | 8 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | ORI | ORI | PER | ORI | ORI | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | CAS | CAS | VAL | CAS | CAS | 2 |
| Itália — Serie B | TGO | POO | ROC | PON | BOR | ROC | TOO | TGO | CAO | FCO | 8 |
| Japão — J1 League | FUJ | ISH | ISH | MAT | SAK | SAK | MAT | MAT | KIR | FUJ | 5 |
| Japão — J2 League | YAA | TAK | FUJ | YAM | NGA | SAA | NAG | SKU | NGA | YMA | 9 |
| Arábia Saudita — Saudi Pro League | RAY | SID | THU | SID | TUR | SID | RAY | SID | DHA | SID | 5 |
| Arábia Saudita — First Division League | SAR | QAR | FAI | SAR | QAR | FAI | ZAH | BAQ | SAH | THU | 7 |
| México — Liga MX | PRT | ESP | POO | CEI | POR | POR | PRT | CEI | CEI | POR | 5 |
| Países Baixos — Eredivisie | GRO | GRO | RIJ | RIJ | RIJ | GRO | BLO | RIJ | GRO | GRO | 3 |
| Países Baixos — Eerste Divisie | EMD | BLT | LDE | EEM | MER | LED | ALK | MER | EMS | MER | 8 |
| Polónia — Ekstraklasa | GRO | PIA | PIA | MIS | GRO | GRO | RAK | PIA | ZIE | STA | 6 |
| Portugal — Liga Portugal | CAR | ALV | CAR | CAR | CAR | CAR | CAR | CAR | ALV | LAJ | 3 |
| Portugal — Liga Portugal 2 | VAE | PEN | MRV | AVA | PEN | VAE | LAG | AVA | PEN | VAE | 5 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | BEN | DAN | DLN | CRA | DAN | DLN | TOR | DLN | BEN | 5 |
| Suíça — Super League | KIR | KIR | KIR | KIR | KIR | KIR | BRN | KIR | KIR | KRC | 3 |
| Turquia — Süper Lig | KZL | DEM | DEM | KZL | SUT | KLC | KZL | KZL | KZL | DEM | 4 |
| Turquia — 1. Lig | KAR | CAM | AKT | KLD | YES | KLD | KAR | YDZ | TAS | YOY | 8 |
| Emirados Árabes Unidos — UAE Pro League | RIM | MAN | THU | RIM | THU | THU | THU | MAN | THU | THU | 3 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | ARR | ALA | ARR | CIB | CEI | CIB | CEI | ARR | ARR | MOR | 5 |
| Brasil — Brasileirão Série A | PDR | PED | PED | CAS | PDR | PDR | CAJ | ANG | PDR | CAJ | 5 |
| Brasil — Brasileirão Série B | ANO | PAL | CTA | SEO | CAO | PLM | AGI | JAT | AGI | CTA | 8 |
| Colômbia — Categoría Primera A | LUC | TAB | TAB | POR | TAB | FLO | CMB | POR | POR | LUC | 5 |
| Equador — LigaPro Serie A | ROS | TAB | COR | TAB | ALA | ALA | TAB | TAB | ALA | ALA | 4 |
| Coreia do Sul — K League 1 | HAD | DAE | HWA | MUN | DAE | NAM | HWA | NAM | NMC | JIN | 7 |
| Noruega — Eliteserien | LIE | FJE | ASV | LIE | LIE | SKO | ASV | FJE | LIE | ASV | 4 |
| Uruguai — Primera División | PAL | COR | ROS | PAL | ROS | ROS | ROS | ROS | ROS | COR | 3 |
| EUA (MLS) — MLS | FAL | BAY | BAY | SUM | SUM | BAY | SMM | SUM | BAY | LAK | 5 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 104.9 / 97 / 116 | 29.2 / 20 / 35 |
| Áustria — Bundesliga | 22 | 50.8 / 43 / 66 | 12.1 / 5 / 17 |
| Bélgica — Pro League | 30 | 70.3 / 61 / 79 | 14.1 / 7 / 20 |
| Bélgica — Challenger Pro League | 28 | 54.9 / 48 / 65 | 23.0 / 20 / 31 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 86.1 / 71 / 101 | 23.0 / 14 / 31 |
| Chéquia — Chance Liga | 30 | 72.0 / 64 / 84 | 14.9 / 3 / 20 |
| Dinamarca — Superliga | 22 | 52.5 / 45 / 61 | 12.9 / 8 / 19 |
| Inglaterra — Premier League | 38 | 93.5 / 79 / 109 | 16.6 / 6 / 27 |
| Inglaterra — Championship | 46 | 116.6 / 106 / 130 | 31.2 / 25 / 39 |
| Inglaterra — League One | 46 | 98.2 / 84 / 122 | 33.8 / 20 / 43 |
| Inglaterra — League Two | 46 | 95.9 / 83 / 102 | 34.9 / 22 / 47 |
| Espanha — La Liga | 38 | 93.9 / 79 / 110 | 14.4 / 7 / 19 |
| Espanha — Segunda División | 42 | 102.6 / 91 / 113 | 25.8 / 22 / 31 |
| Europa (resto) — Liga Resto da Europa | 38 | 92.8 / 78 / 104 | 24.2 / 15 / 35 |
| França — Ligue 1 | 34 | 88.9 / 77 / 97 | 15.4 / 3 / 23 |
| França — Ligue 2 | 34 | 76.1 / 63 / 87 | 21.4 / 16 / 29 |
| França — Ligue 3 | 38 | 78.4 / 68 / 87 | 30.3 / 25 / 38 |
| Alemanha — Bundesliga | 34 | 88.2 / 82 / 95 | 17.3 / 11 / 22 |
| Alemanha — 2. Bundesliga | 34 | 79.1 / 72 / 96 | 21.3 / 11 / 30 |
| Alemanha — 3. Liga | 38 | 82.3 / 71 / 104 | 27.6 / 23 / 34 |
| Grécia — Super League 1 | 26 | 65.0 / 54 / 76 | 14.8 / 10 / 19 |
| Itália — Serie A | 38 | 99.6 / 89 / 114 | 17.8 / 14 / 23 |
| Itália — Serie B | 38 | 90.6 / 78 / 103 | 24.6 / 12 / 33 |
| Japão — J1 League | 38 | 89.3 / 72 / 101 | 20.5 / 16 / 31 |
| Japão — J2 League | 38 | 81.4 / 66 / 94 | 25.7 / 21 / 30 |
| Arábia Saudita — Saudi Pro League | 34 | 81.0 / 66 / 90 | 18.2 / 10 / 28 |
| Arábia Saudita — First Division League | 34 | 73.2 / 63 / 86 | 26.9 / 19 / 33 |
| México — Liga MX | 34 | 77.9 / 68 / 96 | 22.2 / 11 / 28 |
| Países Baixos — Eredivisie | 34 | 84.0 / 70 / 94 | 18.1 / 13 / 25 |
| Países Baixos — Eerste Divisie | 38 | 79.7 / 73 / 91 | 28.2 / 19 / 36 |
| Polónia — Ekstraklasa | 34 | 72.2 / 65 / 80 | 21.2 / 11 / 28 |
| Portugal — Liga Portugal | 34 | 88.4 / 82 / 99 | 16.2 / 11 / 23 |
| Portugal — Liga Portugal 2 | 34 | 78.2 / 68 / 87 | 25.2 / 16 / 33 |
| Escócia — Premiership | 33 | 84.8 / 74 / 93 | 15.3 / 9 / 25 |
| Escócia — Championship | 36 | 70.8 / 61 / 96 | 29.5 / 22 / 35 |
| Suíça — Super League | 33 | 75.9 / 59 / 86 | 19.2 / 11 / 29 |
| Turquia — Süper Lig | 38 | 94.4 / 80 / 102 | 21.1 / 15 / 28 |
| Turquia — 1. Lig | 38 | 84.6 / 74 / 96 | 26.9 / 21 / 37 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 56.7 / 48 / 63 | 15.4 / 7 / 21 |
| Argentina — Liga Profesional | 29 | 72.4 / 65 / 79 | 12.8 / 7 / 20 |
| Brasil — Brasileirão Série A | 38 | 91.5 / 78 / 109 | 12.9 / 6 / 21 |
| Brasil — Brasileirão Série B | 38 | 91.0 / 80 / 106 | 22.7 / 15 / 31 |
| Colômbia — Categoría Primera A | 38 | 83.3 / 74 / 95 | 22.3 / 18 / 31 |
| Equador — LigaPro Serie A | 30 | 69.1 / 60 / 81 | 19.1 / 12 / 24 |
| Coreia do Sul — K League 1 | 33 | 65.8 / 59 / 71 | 25.1 / 16 / 31 |
| Noruega — Eliteserien | 30 | 68.8 / 58 / 76 | 18.0 / 8 / 26 |
| Uruguai — Primera División | 30 | 73.3 / 68 / 81 | 16.2 / 6 / 21 |
| EUA (MLS) — MLS | 29 | 65.3 / 58 / 76 | 17.4 / 10 / 23 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ain Thuraya Club (KSA) | 3-0 |
| 2026/27 | Liga dos Campeões | AS Torrefranco (ITA) | Brackcombe Town (ENG) | 1-0 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | CD Salatejo (ESP) | 1-0 |
| 2026/27 | Liga Europa | AC Fontebello (ITA) | Achilles Rijszand (NED) | 2-0 |
| 2027 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 2-0 |
| 2027/28 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Hwadong Citizen (KOR) | 4-1 |
| 2027/28 | Liga dos Campeões | Brackcombe Town (ENG) | Olmedosa CF (ESP) | 2-0 |
| 2027/28 | Liga Conferência | Brombury United (ENG) | SS Valfranco (ITA) | 2-0 |
| 2027/28 | Liga Europa | CF Alcormonte (ESP) | Fontemarino Calcio (ITA) | 2-0 |
| 2028 | Libertadores | Rio do Angico Futebol Clube (BRA) | Club Atlético General Ceibos (ARG) | 4-1 |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Hwadong Citizen (KOR) | 1-0 |
| 2028/29 | Liga dos Campeões | AS Fonteville (FRA) | Real Riberrada (ESP) | 1-0 |
| 2028/29 | Liga Conferência | Racing Club de Bellegarde (FRA) | Cervevega CF (ESP) | 2-1 |
| 2028/29 | Liga Europa | FC Grüntal (GER) | UD Mirallosa (ESP) | 2-0 |
| 2029 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-2 |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 1-1 (a.p.) 4-3 g.p. |
| 2029/30 | Liga dos Campeões | AS Fonteville (FRA) | SV Mühlwangen (GER) | 2-0 |
| 2029/30 | Liga Conferência | AS Montbrun (FRA) | NK Slagrad (CRO) | 1-0 |
| 2029/30 | Liga Europa | CF Alcormonte (ESP) | Racing Club de Bellegarde (FRA) | 3-1 |
| 2030 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2030/31 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Fujihara FC (JPN) | 2-1 |
| 2030/31 | Liga dos Campeões | Brackcombe Town (ENG) | Carnley Albion (ENG) | 1-0 |
| 2030/31 | Liga Conferência | Brombury United (ENG) | CD Salatejo (ESP) | 0-0 (a.p.) 6-5 g.p. |
| 2030/31 | Liga Europa | Fehérfüred ETO (HUN) | TSV Tannau (GER) | 1-0 (a.p.) |
| 2031 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |
| 2031/32 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Fortuna Sakuhara (JPN) | 1-0 |
| 2031/32 | Liga dos Campeões | Brackcombe Town (ENG) | CF Alcormonte (ESP) | 0-0 (a.p.) 4-3 g.p. |
| 2031/32 | Liga Conferência | Real Riberrada (ESP) | Radton Borough (ENG) | 1-0 |
| 2031/32 | Liga Europa | Yarmerholt Borough (ENG) | AJ Villegarde (FRA) | 2-0 |
| 2032 | Libertadores | Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 3-2 (a.p.) |
| 2032/33 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Matsuno FC (JPN) | 1-1 (a.p.) 5-2 g.p. |
| 2032/33 | Liga dos Campeões | Carnley Albion (ENG) | CF Alcormonte (ESP) | 2-0 |
| 2032/33 | Liga Conferência | Stourby City (ENG) | CD Gualrejo (ESP) | 4-1 |
| 2032/33 | Liga Europa | Olmevega CF (ESP) | Dunbury Wanderers (ENG) | 1-0 |
| 2033 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Esporte Clube Campo do Angico (BRA) | 1-0 |
| 2033/34 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-0 |
| 2033/34 | Liga dos Campeões | SV Mühlwangen (GER) | Stourmercombe City (ENG) | 2-1 |
| 2033/34 | Liga Conferência | Fontemarino Calcio (ITA) | Netherenwick Athletic (ENG) | 3-1 |
| 2033/34 | Liga Europa | AS Montbrun (FRA) | Stourmerport City (ENG) | 1-0 |
| 2034 | Libertadores | Deportivo Río Rosario Alto (URU) | Clube Atlético Pouso das Pedras (BRA) | 3-0 |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya FC (KSA) | 4-1 |
| 2034/35 | Liga dos Campeões | Brackcombe Town (ENG) | FC Grüntal (GER) | 3-0 |
| 2034/35 | Liga Conferência | Quendale Athletic (ENG) | Torrefranco Calcio (ITA) | 1-0 |
| 2034/35 | Liga Europa | Dunbury Wanderers (ENG) | Netherenwick Athletic (ENG) | 2-0 |
| 2035 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 1-0 |
| 2035/36 | Liga dos Campeões Asiática | Wadi Thuraya Club (UAE) | Matsuno FC (JPN) | 1-1 (a.p.) 3-1 g.p. |
| 2035/36 | Liga dos Campeões | Carnley Albion (ENG) | FC Grüntal (GER) | 3-0 |
| 2035/36 | Liga Conferência | US Fonteval (FRA) | Demiryurtspor (TUR) | 1-0 |
| 2035/36 | Liga Europa | Quendale Athletic (ENG) | Eintracht Altenhausen (GER) | 1-0 |
| 2036 | Libertadores | Grêmio Campo do Cajueiro (BRA) | Atlético Pouso das Pedras (BRA) | 4-0 |

Títulos por país: Libertadores — BRA: 8; Liga dos Campeões Asiática — KSA: 7; Liga dos Campeões — ENG: 6; Liga Conferência — ENG: 5; Liga Europa — ESP: 3; Liga Conferência — FRA: 3; Liga Europa — ENG: 3; Liga dos Campeões Asiática — JPN: 2; Liga dos Campeões — FRA: 2; Liga dos Campeões — ITA: 1; Liga Europa — ITA: 1; Liga Europa — GER: 1; Liga Europa — HUN: 1; Liga Conferência — ESP: 1; Libertadores — ARG: 1; Liga dos Campeões — GER: 1; Liga Conferência — ITA: 1; Liga Europa — FRA: 1; Libertadores — URU: 1; Liga dos Campeões Asiática — UAE: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 17.50, ENG1 17.17, ESP1 14.44 | ITA1, ENG1 | AS Torrefranco (ITA) / AC Fontebello (ITA) / Dunbury Wanderers (ENG) |
| 2027/28 | ENG1 15.67, ITA1 15.15, GER1 14.36 | ENG1, ITA1 | Brackcombe Town (ENG) / CF Alcormonte (ESP) / Brombury United (ENG) |
| 2028/29 | ESP1 16.88, ENG1 15.05, ITA1 14.63 | ESP1, ENG1 | AS Fonteville (FRA) / FC Grüntal (GER) / Racing Club de Bellegarde (FRA) |
| 2029/30 | GER1 17.38, FRA1 15.94, ESP1 15.63 | GER1, FRA1 | AS Fonteville (FRA) / CF Alcormonte (ESP) / AS Montbrun (FRA) |
| 2030/31 | ENG1 20.50, GER1 14.69, ITA1 13.71 | ENG1, GER1 | Brackcombe Town (ENG) / Fehérfüred ETO (HUN) / Brombury United (ENG) |
| 2031/32 | ENG1 18.40, ESP1 16.43, GER1 13.13 | ENG1, ESP1 | Brackcombe Town (ENG) / Yarmerholt Borough (ENG) / Real Riberrada (ESP) |
| 2032/33 | ESP1 15.17, ITA1 15.07, GER1 14.07 | ESP1, ITA1 | Carnley Albion (ENG) / Olmevega CF (ESP) / Stourby City (ENG) |
| 2033/34 | ENG1 18.56, GER1 15.00, ITA1 13.38 | ENG1, GER1 | SV Mühlwangen (GER) / AS Montbrun (FRA) / Fontemarino Calcio (ITA) |
| 2034/35 | ENG1 19.50, ITA1 14.50, ESP1 13.93 | ENG1, ITA1 | Brackcombe Town (ENG) / Dunbury Wanderers (ENG) / Quendale Athletic (ENG) |
| 2035/36 | ENG1 16.64, GER1 16.36, ITA1 13.63 | ENG1, GER1 | Carnley Albion (ENG) / Quendale Athletic (ENG) / US Fonteval (FRA) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | KIR | KIR | RHE | DOR | KIR | BUC | KRC | DOR | REI |
| Taça da Bélgica (Bélgica) | VER | OOS | MOL | LIE | RNS | VER | BEA | MOL | VER | BEA |
| Taça da Croácia (Croácia) | NOV | SLA | SLA | SLA | SLA | SLA | VIK | NOV | BEP | BRE |
| Taça da Chéquia (Chéquia) | RYC | LUH | SLA | POD | POD | POD | POD | POD | POD | OST |
| Taça da Dinamarca (Dinamarca) | VES | BRO | VES | STR | VES | HDE | VES | VES | HED | BRO |
| FA Cup (Inglaterra) | STY | BRA | DNC | BRA | CAR | CAR | CAR | NET | CAR | CAR |
| EFL Cup (Carabao Cup) (Inglaterra) | SOU | BRA | NTH | CAR | CAR | BRA | DUN | CAR | NET | BRA |
| Copa del Rey (Espanha) | ALC | ALC | HIN | ALC | MIR | ALC | ALC | TAR | MIR | TAR |
| Coupe de France (França) | FNT | FON | BEL | BEL | BEL | BEL | COU | FNT | FON | COU |
| DFB-Pokal (Alemanha) | GRU | GRL | MHL | MUH | GRU | MUD | GRU | MHL | MUH | MHL |
| Taça da Grécia (Grécia) | KAL | ORI | ORI | OIS | ORI | ORI | ORI | PER | CHO | STA |
| Coppa Italia (Itália) | CAS | CAS | CAS | CAS | CST | TOR | CAS | VLF | CAS | CST |
| Emperor's Cup (Japão) | MAT | ISH | MAT | KIR | KRI | SAK | HAN | HOS | NAG | MAT |
| J.League Cup (Japão) | MAT | MAT | MAT | ISH | SAK | SAK | HOS | ISH | MAT | SAK |
| King's Cup (Arábia Saudita) | DHA | DHA | SID | SID | SID | SID | SID | THA | SID | SID |
| KNVB Beker (Países Baixos) | RIJ | ADE | GRO | RIJ | MEE | GRO | BLO | BLO | GRO | DIJ |
| Taça da Polónia (Polónia) | PIA | PIA | RAK | PAR | SAW | GRO | PIA | GRO | ZIE | SAW |
| Taça de Portugal (Portugal) | CAR | CAR | ALV | CAR | CAR | FEI | CAR | CAR | LAJ | ALV |
| Taça da Liga (Portugal) | CAR | CAR | CAR | CAR | VAL | VAL | CAR | FON | VAL | CAR |
| Scottish Cup (Escócia) | ARD | KIN | ARD | ARD | ARD | LOC | KIL | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | ARD | ARD | KIN | ARD | ARD | CRA | DAL | ARD | ARD |
| Taça da Suíça (Suíça) | KIR | KIR | KIR | WAL | BED | KIR | BER | KIR | WAL | MHL |
| Taça da Turquia (Turquia) | DEM | KZL | DMI | DMI | KZL | CAM | DAG | DMI | KZL | DMI |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | RIM | DRA | RIM | MAN | GHA | GHA | THU | MAN | BUS |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CHA | ALA | ARR | CIB | MRE | ARR | CIB | ARR | MOR | ARR |
| Copa do Brasil (Brasil) | CED | PED | PED | ANG | PED | ANG | CAJ | ANG | PDR | PDR |
| Copa Colombia (Colômbia) | QUE | POR | TAB | POR | TAB | ARE | ARE | LUC | QUE | QUE |
| Copa Equador (Equador) | TBL | COR | AGU | AAM | ALA | TAB | ROS | TBL | ROS | AAM |
| Korean FA Cup (Coreia do Sul) | NAM | HAD | HND | HAN | JIN | NAM | HAD | DAE | NMC | MUN |
| Taça da Noruega (Noruega) | FJE | ASV | SOG | LIE | SKO | SKO | SKO | LIL | ASV | ASV |
| Copa Uruguai (Uruguai) | PAL | COR | CMB | PAL | ROS | CUM | ROS | ROS | FLA | PAL |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 42 | 42 | 3 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 40 | 40 | 1 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 42 | 42 | 3 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 42 | 42 | 3 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 41 | 41 | 2 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 44 | 44 | 5 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 41 | 41 | 2 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 40 | 40 | 1 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 41 | 41 | 2 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 42 | 42 | 3 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
