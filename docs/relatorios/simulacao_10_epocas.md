# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.56 golos; casa 45.5%, empate 24.7%, fora 29.7%; 0-0 8.0%; 5+ 11.4%; 7+ 1.0% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.57 golos; casa 45.5%, empate 24.8%, fora 29.8%; 0-0 8.0%; 5+ 11.8%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.35; 93.8% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.59; 96.3% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.5; 0 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 46.9%; um dos 3 favoritos em 79.4% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 457 subidas, 457 descidas, 580 saídas para o exterior, 580 entradas; 39.7% dos que sobem descem logo; 133 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 64d66664 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 5909 ms / 6480 ms |
| Uma semana de calendário (média / p95 / máx.) | 112.7 ms / 235.3 ms / 665.9 ms |
| Memória (heap) no fim | 331 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 7 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | KEB | ADE | ADE | IKE | ADE | ADE | IKE | IKE | 3 |
| Áustria — Bundesliga | KIR | KIR | KIR | DOR | KIR | KIR | KIR | KIR | FAL | KIR | 3 |
| Bélgica — Pro League | VER | RON | VER | BEA | VER | BEA | BEA | OOS | HER | BEA | 5 |
| Bélgica — Challenger Pro League | BAU | MAA | ROK | HRE | ROK | BAU | MLM | ROK | BER | LER | 7 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | SLA | SLA | ZAZ | SLA | SLA | SLA | NOJ | SLA | 3 |
| Chéquia — Chance Liga | POD | RYC | KOS | LUH | LUH | LUH | LUH | LHN | POD | SAV | 6 |
| Dinamarca — Superliga | VES | LUN | SER | SOL | VES | BRO | VES | VES | BRO | BRO | 5 |
| Inglaterra — Premier League | BRA | BRA | DUN | BRA | BRA | BRA | CAR | CAR | BRA | BRA | 3 |
| Inglaterra — Championship | GIM | NET | DNW | YAR | CAL | OAK | GRM | MAR | CRN | EVE | 10 |
| Inglaterra — League One | BRH | TER | SHE | ELV | STT | FLW | PNB | TER | TOR | AHC | 9 |
| Inglaterra — League Two | LNG | SHE | NEY | MER | NEY | DRA | YRH | KEL | NED | NEH | 9 |
| Espanha — La Liga | RIB | OLM | RIB | HIN | ALC | ALC | ALC | ALC | MIR | ALC | 5 |
| Espanha — Segunda División | MNM | LOR | GUA | SLA | MIA | HNO | MNM | CAL | GUA | MRA | 8 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | AGB | FEH | FEH | FEH | FEH | FEH | AGB | FEH | 2 |
| França — Ligue 1 | FNT | FON | FON | FON | BEL | FON | FON | FON | FON | FON | 3 |
| França — Ligue 2 | PES | PLE | FDE | PES | ROC | FUN | PES | FOP | BAU | FOE | 8 |
| França — Ligue 3 | VLC | PIS | VAL | SAT | SUV | FDE | VAL | VIT | PLA | ROE | 9 |
| Alemanha — Bundesliga | MUH | MUH | STE | STE | MUH | GRU | GRU | MUH | GRU | GRU | 3 |
| Alemanha — 2. Bundesliga | SEI | MUD | BUC | WES | HAS | GAL | ZLL | WES | NEU | GAL | 8 |
| Alemanha — 3. Liga | STN | STL | GRG | ECH | HSE | WEN | ZED | ZEA | WEA | OBE | 10 |
| Grécia — Super League 1 | ORI | ORI | ORI | THA | ORI | THA | ORI | ORI | ORI | PER | 3 |
| Itália — Serie A | CAS | CAS | VAL | CAS | CAS | CAS | TRR | VAL | CAS | CAS | 3 |
| Itália — Serie B | TGO | VIL | POG | TOO | BOR | MON | FON | VLA | BOR | TOO | 8 |
| Japão — J1 League | MAT | MAT | MAT | MAT | HOS | MAT | MAT | MAT | MAT | HAN | 3 |
| Japão — J2 League | IHI | FJI | YNO | OKA | NAG | YAE | HAN | KRI | OKA | YAM | 9 |
| Arábia Saudita — Saudi Pro League | SID | SID | THU | SID | DHA | SID | SID | SID | SID | SID | 3 |
| Arábia Saudita — First Division League | FIS | FAI | SHI | THA | SAR | BAQ | SAB | SAR | FIS | QAR | 8 |
| México — Liga MX | ALA | ESP | POO | POR | POR | POR | POR | PRT | CEI | POR | 6 |
| Países Baixos — Eredivisie | GRO | GRO | ADE | RIJ | RIJ | GRO | BLO | GRO | GRO | MEE | 5 |
| Países Baixos — Eerste Divisie | EMD | DJK | LDE | LED | MER | LED | LDE | GOV | ALK | DJK | 7 |
| Polónia — Ekstraklasa | GRO | GRO | PIA | STA | GRO | MIS | STA | GRO | ZIE | GOS | 6 |
| Portugal — Liga Portugal | CAR | CAR | CAR | CAR | CAR | VAL | CAR | CAR | CAR | CAR | 2 |
| Portugal — Liga Portugal 2 | VAE | PEN | MRV | VAE | AVA | LES | LAS | FRO | VAE | MRV | 7 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | DLN | GLE | DAN | DLN | DAN | DLN | GLE | DAN | INV | 4 |
| Suíça — Super League | KIR | KIR | KIR | DRN | KIR | BER | MUH | KIR | KIR | KIR | 4 |
| Turquia — Süper Lig | KZL | DEM | DEM | DAG | KZL | DAG | KZL | KZL | AYA | DEM | 4 |
| Turquia — 1. Lig | KAR | CAM | GOK | YLY | YES | KLD | YES | KLT | AKY | AKT | 9 |
| Emirados Árabes Unidos — UAE Pro League | RIM | DHA | GHA | RIM | RIM | GHA | GHA | DHA | GHA | RIM | 3 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | CIB | CEI | ARR | CEI | CEI | CIB | CHA | QUI | ARR | ARR | 5 |
| Brasil — Brasileirão Série A | PDR | PED | PED | CAJ | PDR | ANG | CAJ | ANG | PDR | CAJ | 4 |
| Brasil — Brasileirão Série B | ANO | VEN | CAB | PAL | CSC | PLM | CAS | PAL | GAR | PAL | 8 |
| Colômbia — Categoría Primera A | LUC | TAB | TAB | ARE | TAB | FLO | ARE | AEN | ARE | LUC | 5 |
| Equador — LigaPro Serie A | COR | TAB | COR | TAB | SOL | ROS | TAB | TAB | ALA | TAB | 5 |
| Coreia do Sul — K League 1 | NAM | DAE | HWA | MUN | DAE | NAM | HWA | NAM | NMC | HAD | 6 |
| Noruega — Eliteserien | LIE | ASV | LIE | LIE | LIE | ELV | ASV | LIE | ASV | ASV | 3 |
| Uruguai — Primera División | ROS | COR | ROS | PAL | ROS | PAL | MIR | ROS | ROS | ROS | 4 |
| EUA (MLS) — MLS | FAL | BAY | PIN | RED | SUM | SIL | SUM | PIN | STO | IRO | 8 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 109.7 / 101 / 126 | 26.6 / 13 / 38 |
| Áustria — Bundesliga | 22 | 51.5 / 41 / 61 | 12.9 / 5 / 18 |
| Bélgica — Pro League | 30 | 71.3 / 62 / 78 | 13.3 / 3 / 19 |
| Bélgica — Challenger Pro League | 28 | 59.7 / 44 / 66 | 20.1 / 11 / 25 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 85.5 / 75 / 97 | 20.6 / 11 / 30 |
| Chéquia — Chance Liga | 30 | 70.8 / 63 / 82 | 14.6 / 5 / 21 |
| Dinamarca — Superliga | 22 | 52.7 / 46 / 60 | 12.5 / 2 / 18 |
| Inglaterra — Premier League | 38 | 96.2 / 80 / 110 | 17.6 / 11 / 26 |
| Inglaterra — Championship | 46 | 116.6 / 86 / 132 | 27.6 / 24 / 35 |
| Inglaterra — League One | 46 | 99.8 / 89 / 114 | 30.8 / 18 / 40 |
| Inglaterra — League Two | 46 | 89.2 / 79 / 96 | 33.7 / 24 / 39 |
| Espanha — La Liga | 38 | 97.5 / 81 / 110 | 13.2 / 7 / 24 |
| Espanha — Segunda División | 42 | 104.0 / 92 / 118 | 27.8 / 24 / 31 |
| Europa (resto) — Liga Resto da Europa | 38 | 92.3 / 74 / 106 | 24.8 / 14 / 32 |
| França — Ligue 1 | 34 | 87.5 / 82 / 96 | 12.0 / -8 / 24 |
| França — Ligue 2 | 34 | 79.4 / 67 / 94 | 22.7 / 12 / 32 |
| França — Ligue 3 | 38 | 80.3 / 75 / 91 | 30.0 / 23 / 34 |
| Alemanha — Bundesliga | 34 | 88.7 / 83 / 96 | 16.1 / -8 / 25 |
| Alemanha — 2. Bundesliga | 34 | 79.9 / 71 / 88 | 19.1 / 11 / 25 |
| Alemanha — 3. Liga | 38 | 82.3 / 70 / 88 | 27.1 / 19 / 33 |
| Grécia — Super League 1 | 26 | 62.1 / 52 / 75 | 13.3 / 5 / 23 |
| Itália — Serie A | 38 | 101.7 / 91 / 114 | 20.1 / 17 / 23 |
| Itália — Serie B | 38 | 92.2 / 81 / 109 | 23.6 / 18 / 32 |
| Japão — J1 League | 38 | 90.4 / 83 / 105 | 24.4 / 16 / 31 |
| Japão — J2 League | 38 | 81.5 / 67 / 98 | 27.0 / 18 / 35 |
| Arábia Saudita — Saudi Pro League | 34 | 84.3 / 73 / 96 | 20.0 / 11 / 29 |
| Arábia Saudita — First Division League | 34 | 73.6 / 63 / 91 | 23.3 / 17 / 32 |
| México — Liga MX | 34 | 81.0 / 74 / 92 | 22.2 / 17 / 29 |
| Países Baixos — Eredivisie | 34 | 85.0 / 69 / 95 | 17.5 / 12 / 24 |
| Países Baixos — Eerste Divisie | 38 | 79.7 / 69 / 91 | 26.5 / 19 / 34 |
| Polónia — Ekstraklasa | 34 | 74.8 / 66 / 85 | 20.5 / 12 / 28 |
| Portugal — Liga Portugal | 34 | 91.7 / 84 / 102 | 17.2 / 5 / 23 |
| Portugal — Liga Portugal 2 | 34 | 75.7 / 66 / 84 | 24.0 / 13 / 31 |
| Escócia — Premiership | 33 | 88.7 / 76 / 95 | 19.3 / 12 / 25 |
| Escócia — Championship | 36 | 72.8 / 65 / 84 | 27.8 / 22 / 34 |
| Suíça — Super League | 33 | 75.9 / 63 / 83 | 21.5 / 17 / 27 |
| Turquia — Süper Lig | 38 | 94.4 / 83 / 105 | 19.9 / 15 / 26 |
| Turquia — 1. Lig | 38 | 87.4 / 81 / 96 | 26.4 / 19 / 32 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 57.8 / 48 / 71 | 16.8 / 11 / 22 |
| Argentina — Liga Profesional | 29 | 74.6 / 68 / 82 | 8.6 / -9 / 16 |
| Brasil — Brasileirão Série A | 38 | 95.0 / 83 / 108 | 18.2 / 11 / 23 |
| Brasil — Brasileirão Série B | 38 | 94.0 / 82 / 107 | 21.3 / 9 / 28 |
| Colômbia — Categoría Primera A | 38 | 88.4 / 71 / 109 | 25.3 / 18 / 32 |
| Equador — LigaPro Serie A | 30 | 70.4 / 63 / 80 | 16.3 / 11 / 21 |
| Coreia do Sul — K League 1 | 33 | 68.0 / 55 / 74 | 25.5 / 16 / 32 |
| Noruega — Eliteserien | 30 | 67.2 / 62 / 74 | 16.3 / 3 / 22 |
| Uruguai — Primera División | 30 | 68.8 / 58 / 78 | 16.6 / 5 / 22 |
| EUA (MLS) — MLS | 29 | 65.9 / 57 / 74 | 17.3 / 13 / 26 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 2-1 |
| 2026/27 | Liga dos Campeões | Real Riberrada (ESP) | FC Casteldorato (ITA) | 2-1 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | CD Salatejo (ESP) | 1-0 |
| 2026/27 | Liga Europa | Olmedosa CF (ESP) | Caldale Albion (ENG) | 1-0 |
| 2027 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |
| 2027/28 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Matsuno FC (JPN) | 2-0 |
| 2027/28 | Liga dos Campeões | Brackcombe Town (ENG) | FC Casteldorato (ITA) | 4-2 (a.p.) |
| 2027/28 | Liga Conferência | SC Grüntal (GER) | Monvega CF (ESP) | 1-1 (a.p.) 5-3 g.p. |
| 2027/28 | Liga Europa | Eintracht Steiningen (GER) | FC Ronsebroek (BEL) | 2-1 |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Unión de Colonia Alamos (ARG) | 5-0 |
| 2028/29 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Stella Kirisaki (JPN) | 2-1 |
| 2028/29 | Liga dos Campeões | Duncester United (ENG) | Eintracht Steiningen (GER) | 3-1 |
| 2028/29 | Liga Conferência | Kilness (SCO) | FC Podín nad Lesem (CZE) | 2-0 |
| 2028/29 | Liga Europa | Real Riberrada (ESP) | AC Valfiore (ITA) | 2-1 |
| 2029 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-1 |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 1-0 |
| 2029/30 | Liga dos Campeões | FC Casteldorato (ITA) | Eintracht Steiningen (GER) | 5-3 |
| 2029/30 | Liga Conferência | Brackcombe Town (ENG) | UD Torreriza (ESP) | 4-0 |
| 2029/30 | Liga Europa | CF Alcormonte (ESP) | SpVgg Mühlberg (GER) | 3-0 |
| 2030 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Unión de Puerto Ceibos (ARG) | 0-0 (a.p.) 3-2 g.p. |
| 2030/31 | Liga dos Campeões Asiática | Stella Kirisaki (JPN) | Munrim Dragons (KOR) | 2-0 |
| 2030/31 | Liga dos Campeões | SV Mühlwangen (GER) | FC Casteldorato (ITA) | 2-0 |
| 2030/31 | Liga Conferência | União de Casal das Lajes (POR) | Dunbury Wanderers (ENG) | 1-0 |
| 2030/31 | Liga Europa | Carnley Albion (ENG) | Brackcombe Town (ENG) | 1-1 (a.p.) 5-4 g.p. |
| 2031 | Libertadores | Atlético Pouso das Pedras (BRA) | Unión de Puerto Ceibos (ARG) | 1-0 (a.p.) |
| 2031/32 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ras Rayyan Sharq FC (KSA) | 4-1 |
| 2031/32 | Liga dos Campeões | FC Casteldorato (ITA) | FC Grüntal (GER) | 2-0 |
| 2031/32 | Liga Conferência | SC Chantebrun (FRA) | Dağbağspor (TUR) | 1-0 |
| 2031/32 | Liga Europa | Yarmerholt Borough (ENG) | Dunbury Wanderers (ENG) | 3-0 |
| 2032 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Atlético Pouso das Pedras (BRA) | 2-1 |
| 2032/33 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Namgok Citizen (KOR) | 2-0 |
| 2032/33 | Liga dos Campeões | AS Torrefranco (ITA) | FC Grüntal (GER) | 3-2 (a.p.) |
| 2032/33 | Liga Conferência | Caldale Albion (ENG) | SC Bloemveen (NED) | 3-1 |
| 2032/33 | Liga Europa | AS Casteldorato (ITA) | VV Meervoort (NED) | 1-0 |
| 2033 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 2-0 |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya FC (KSA) | 5-1 |
| 2033/34 | Liga dos Campeões | AS Fonteville (FRA) | Ardmuir Academicals (SCO) | 3-1 |
| 2033/34 | Liga Conferência | Stourmerport City (ENG) | VV Alderveen (NED) | 2-0 |
| 2033/34 | Liga Europa | Quendale Athletic (ENG) | TSV Kirchbrück (SUI) | 1-0 |
| 2034 | Libertadores | Club Atlético Villa Quintana (ARG) | Rio do Angico Futebol Clube (BRA) | 2-1 (a.p.) |
| 2034/35 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-0 |
| 2034/35 | Liga dos Campeões | Quendale Athletic (ENG) | Brackcombe Town (ENG) | 1-0 |
| 2034/35 | Liga Conferência | US Fonteval (FRA) | Stourby City (ENG) | 1-0 |
| 2034/35 | Liga Europa | Stourmerport City (ENG) | FC Casteldorato (ITA) | 1-0 |
| 2035 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-1 (a.p.) |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 0-0 (a.p.) 4-3 g.p. |
| 2035/36 | Liga dos Campeões | Albarrada CF (ESP) | Brackcombe Town (ENG) | 1-0 |
| 2035/36 | Liga Conferência | Real Hinonueva (ESP) | Sutepe İdmanyurdu (TUR) | 2-0 |
| 2035/36 | Liga Europa | Real Riberrada (ESP) | Racing Club de Saint-Court (FRA) | 1-0 |
| 2036 | Libertadores | Club Atlético General Ceibos (ARG) | Club Atlético Coronel Arroyito (ARG) | 1-0 |

Títulos por país: Liga dos Campeões Asiática — JPN: 6; Libertadores — BRA: 6; Liga Conferência — ENG: 4; Liga Europa — ESP: 4; Libertadores — ARG: 4; Liga dos Campeões Asiática — KSA: 4; Liga Europa — ENG: 4; Liga dos Campeões — ENG: 3; Liga dos Campeões — ITA: 3; Liga dos Campeões — ESP: 2; Liga Conferência — FRA: 2; Liga Conferência — GER: 1; Liga Europa — GER: 1; Liga Conferência — SCO: 1; Liga dos Campeões — GER: 1; Liga Conferência — POR: 1; Liga Europa — ITA: 1; Liga dos Campeões — FRA: 1; Liga Conferência — ESP: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 16.67, ESP1 16.44, ENG1 16.28 | ITA1, ESP1 | Real Riberrada (ESP) / Olmedosa CF (ESP) / Dunbury Wanderers (ENG) |
| 2027/28 | ENG1 17.00, NED1 15.40, ITA1 15.06 | ENG1, NED1 | Brackcombe Town (ENG) / Eintracht Steiningen (GER) / SC Grüntal (GER) |
| 2028/29 | ESP1 14.64, ITA1 14.64, GER1 14.56 | ESP1, ITA1 | Duncester United (ENG) / Real Riberrada (ESP) / Kilness (SCO) |
| 2029/30 | GER1 16.93, ENG1 15.06, FRA1 14.50 | GER1, ENG1 | FC Casteldorato (ITA) / CF Alcormonte (ESP) / Brackcombe Town (ENG) |
| 2030/31 | ENG1 16.00, GER1 15.44, ITA1 14.94 | ENG1, GER1 | SV Mühlwangen (GER) / Carnley Albion (ENG) / União de Casal das Lajes (POR) |
| 2031/32 | ENG1 18.06, ESP1 16.64, ITA1 13.71 | ENG1, ESP1 | FC Casteldorato (ITA) / Yarmerholt Borough (ENG) / SC Chantebrun (FRA) |
| 2032/33 | ENG1 15.67, NED1 15.10, ITA1 13.75 | ENG1, NED1 | AS Torrefranco (ITA) / AS Casteldorato (ITA) / Caldale Albion (ENG) |
| 2033/34 | ENG1 18.61, FRA1 14.14, GER1 12.29 | ENG1, FRA1 | AS Fonteville (FRA) / Quendale Athletic (ENG) / Stourmerport City (ENG) |
| 2034/35 | ENG1 19.85, FRA1 15.72, ESP1 14.00 | ENG1, FRA1 | Quendale Athletic (ENG) / Stourmerport City (ENG) / US Fonteval (FRA) |
| 2035/36 | ENG1 18.00, ESP1 18.00, GER1 13.71 | ENG1, ESP1 | Albarrada CF (ESP) / Real Riberrada (ESP) / Real Hinonueva (ESP) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | RHE | KIR | KIR | DOR | KIR | DOR | FAL | KIR | KIR |
| Taça da Bélgica (Bélgica) | VER | RON | OOS | MAA | VER | VER | BEA | BEA | BEA | RNS |
| Taça da Croácia (Croácia) | SLA | SLA | ZAZ | SLA | SLA | SLA | ZAZ | BRE | NOJ | SLA |
| Taça da Chéquia (Chéquia) | RYC | OST | LUH | SLA | LUH | LUH | KOS | KST | SAV | KOS |
| Taça da Dinamarca (Dinamarca) | VES | BRO | BRO | BRO | VES | BRO | BRO | VES | BRO | BRO |
| FA Cup (Inglaterra) | BRA | BRO | HAT | CAR | CAR | BRA | NET | DUN | SOU | SOU |
| EFL Cup (Carabao Cup) (Inglaterra) | BRA | BRA | CAR | YAR | BRA | BRA | CAR | BRA | CAR | BRO |
| Copa del Rey (Espanha) | RIB | ALC | RIB | ALC | ALC | ALC | GUA | ALC | MIR | ALC |
| Coupe de France (França) | FNT | FON | BEL | FON | VIL | COU | FON | FON | COU | BEL |
| DFB-Pokal (Alemanha) | MUH | GRU | GRU | ZEL | GRU | MUD | GRU | GRU | GRU | GRL |
| Taça da Grécia (Grécia) | ORI | ORI | ORI | OIS | ORI | THA | ORI | THA | ORI | ORI |
| Coppa Italia (Itália) | CAS | CAS | TRR | CAS | CAS | TOR | TRR | CAS | CAS | CAS |
| Emperor's Cup (Japão) | MAT | NAG | NGA | MAT | SAK | YAA | AKI | HOS | MAT | KIR |
| J.League Cup (Japão) | MAT | MAT | SAK | MAT | MAT | MAT | FUJ | MAT | MAT | HAN |
| King's Cup (Arábia Saudita) | DHA | DHA | SID | SID | RAY | SID | RAY | SID | SID | SID |
| KNVB Beker (Países Baixos) | RIJ | RIJ | MEE | RIJ | BOE | GRO | GRO | RIJ | EEM | MEE |
| Taça da Polónia (Polónia) | DEB | PIA | GRO | PAR | GRO | MIS | ZIE | DEB | PIA | PIA |
| Taça de Portugal (Portugal) | CAR | CAR | ALV | CAR | RBO | VAL | ALV | CAR | ALV | LAJ |
| Taça da Liga (Portugal) | CAR | CAR | CAR | VAL | VAL | VAL | CAR | VAL | CAR | CAR |
| Scottish Cup (Escócia) | ARD | ARD | CRA | ARD | ARD | ARD | ARD | DAL | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | ARD | DAL | ARD | ARD | ARD | ARD | DAL | ARD | ARD |
| Taça da Suíça (Suíça) | MUH | KIR | KIR | BER | KIR | KIR | KIR | MUH | RHE | KIR |
| Taça da Turquia (Turquia) | KZL | SUT | KZL | DAG | KZL | YLD | AYA | KZL | KZL | DEM |
| UAE President's Cup (Emirados Árabes Unidos) | RIM | DHA | DHA | RIM | GHA | DHA | DHA | DHA | GHA | FAI |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | QUI | QIN | ARR | CEI | CEI | CHA | ARR | ARR | CEI | ARR |
| Copa do Brasil (Brasil) | ANG | VEN | CAJ | CAS | PDR | CAA | CAJ | PED | PED | PDR |
| Copa Colombia (Colômbia) | ARE | POR | TAB | QUE | AEN | TBL | ARE | ARE | TAA | ARE |
| Copa Equador (Equador) | COR | COR | COR | AAM | SOL | ALA | ALA | TAB | ROS | ROS |
| Korean FA Cup (Coreia do Sul) | NAM | HWA | NMC | HAN | HWA | DAE | MUN | MUN | DAE | MNC |
| Taça da Noruega (Noruega) | ASN | SKO | ASV | LIE | ELV | STR | LIE | SOG | ASV | LEN |
| Copa Uruguai (Uruguai) | PAL | COR | TAB | PAL | ROS | CEL | ROS | ROS | SOL | ALA |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 42 | 42 | 3 | 43 | 43 |
| 2027 | 4 | 4 | 0 | 15 | 15 |
| 2027/28 | 42 | 42 | 3 | 43 | 43 |
| 2028 | 4 | 4 | 0 | 15 | 15 |
| 2028/29 | 42 | 42 | 3 | 43 | 43 |
| 2029 | 4 | 4 | 0 | 15 | 15 |
| 2029/30 | 41 | 41 | 2 | 43 | 43 |
| 2030 | 4 | 4 | 0 | 15 | 15 |
| 2030/31 | 41 | 41 | 2 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 43 | 43 | 4 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 43 | 43 | 4 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 41 | 41 | 2 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 40 | 40 | 1 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 42 | 42 | 3 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
