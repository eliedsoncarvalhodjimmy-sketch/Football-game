# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Dois calendários: Agosto–Maio (2026/27 a 2035/36) e ano civil, Fevereiro–Dezembro (2027 a 2036). Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 20 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 21 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 171 940 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.56 golos; casa 46.0%, empate 24.7%, fora 29.3%; 0-0 8.0%; 5+ 11.9%; 7+ 1.0% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.54 golos; casa 45.2%, empate 25.2%, fora 29.6%; 0-0 8.2%; 5+ 11.4%; 7+ 0.9% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.33; 93.8% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.60; 96.7% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 5.4; 1 ligas com sempre o mesmo; 4 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 50.6%; um dos 3 favoritos em 81.0% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 463 subidas, 463 descidas, 580 saídas para o exterior, 580 entradas; 43.8% dos que sobem descem logo; 133 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 9e917ffe | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 6587 ms / 8212 ms |
| Uma semana de calendário (média / p95 / máx.) | 125.6 ms / 259.8 ms / 629.8 ms |
| Memória (heap) no fim | 283 MB |
| Gravação por época (todos os jogos, gzip) | 75 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 194 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 6 de 51 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

### Calendário Agosto–Maio

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | IKE | IKE | KEB | ADE | ADE | ADE | ADE | KEB | ADE | IKE | 3 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KRC | 2 |
| Bélgica — Pro League | VER | VER | VER | BEA | BEA | BEA | MLM | RON | HER | BEA | 5 |
| Bélgica — Challenger Pro League | BAU | MAA | VRS | HOO | LER | HOG | BAU | HOG | VRS | OOS | 7 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | ZAZ | ZAZ | ZAZ | SLA | ZAZ | SLA | ZAZ | SLA | NOJ | BEP | 4 |
| Chéquia — Chance Liga | POD | POD | KOS | LUH | LUH | LUH | LUH | LES | LUH | LUH | 4 |
| Dinamarca — Superliga | VES | VES | BRO | BRO | VES | BRO | BRO | SOL | BRO | VES | 3 |
| Inglaterra — Premier League | BRA | BRA | BRO | STO | BRA | BRA | CAR | STO | BRA | BRA | 4 |
| Inglaterra — Championship | FAL | NET | ASH | EVE | CAL | EVE | DNC | FAL | HAT | STM | 8 |
| Inglaterra — League One | BRH | GRA | NED | BAC | GRY | FLW | PNB | PEN | NED | AHM | 9 |
| Inglaterra — League Two | MOR | SHE | ELT | MER | DUY | THR | SHM | KEL | ELA | THY | 10 |
| Espanha — La Liga | MIR | OLM | RIB | HIN | ALC | ALC | ALC | ALC | MIR | ALC | 5 |
| Espanha — Segunda División | MNM | CER | HNO | ALB | MIA | LOR | CLA | CAL | TOR | SAL | 10 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | FEH | FEH | FEH | FEH | FEH | FEH | FEH | FEH | 1 |
| França — Ligue 1 | FNT | FON | FON | FON | FON | FON | FON | FON | FON | FON | 2 |
| França — Ligue 2 | PES | FUN | ROC | VLC | BEA | ROC | PES | VLC | PES | CAN | 6 |
| França — Ligue 3 | CAI | PIS | VRB | PIS | VIT | CLA | CAM | PIS | PLA | VRB | 7 |
| Alemanha — Bundesliga | MUH | MUH | STE | GRU | MUH | GRU | GRU | MUH | MHL | GRU | 4 |
| Alemanha — 2. Bundesliga | SEI | MUD | GAL | SEI | HHE | SEI | BUC | WES | NEU | GRL | 8 |
| Alemanha — 3. Liga | STN | WST | BUK | FAL | ECH | WEN | ZED | STL | FLB | WEK | 10 |
| Grécia — Super League 1 | ORI | ORI | ORI | THS | ORI | ORI | ORI | ORI | ORI | PER | 3 |
| Itália — Serie A | CAS | CAS | CAS | CAS | CAS | TOR | TOR | VLC | CAS | CAS | 3 |
| Itália — Serie B | TGO | POO | ROC | MON | BOR | FCO | VLC | ROC | POO | TOO | 8 |
| Japão — J1 League | MAT | ISH | MAT | MAT | MAT | KIR | MAT | MAT | MAT | MAT | 3 |
| Japão — J2 League | YAA | FJI | KAW | HAI | TAK | YAE | TKA | KRI | TAK | YMA | 9 |
| Arábia Saudita — Saudi Pro League | RAY | SID | RAY | SID | THU | SID | SID | SID | DHA | SID | 4 |
| Arábia Saudita — First Division League | SAR | BRQ | QAR | SAH | SAA | BAA | TUR | SAA | SQR | SAH | 8 |
| México — Liga MX | PRT | ESP | POO | POR | POR | POR | PRT | CEI | CEI | POR | 5 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | RIJ | RIJ | GRO | BOE | ADE | GRO | MEE | 5 |
| Países Baixos — Eerste Divisie | EMD | BLT | LDE | LED | OUD | LED | ALK | VEL | ALK | OUD | 7 |
| Polónia — Ekstraklasa | GRO | GRO | JAG | GRO | MIS | GRO | RKO | GRO | GOS | GOS | 5 |
| Portugal — Liga Portugal | CAR | ALV | CAR | CAR | CAR | CAR | CAR | CAR | CAR | ALV | 2 |
| Portugal — Liga Portugal 2 | VAE | PEN | VAE | LAG | FNT | PEN | LAG | FRO | PEN | AVA | 6 |
| Escócia — Premiership | ARD | ARD | KIL | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 2 |
| Escócia — Championship | DAN | ADL | DAN | ADL | INV | DLI | INV | ADL | BAL | DLN | 6 |
| Suíça — Super League | KIR | MUH | KIR | MUH | BER | KIR | MUH | KIR | KIR | KIR | 3 |
| Turquia — Süper Lig | KZL | DEM | DEM | KZL | KZL | DEM | KZL | KZL | KZL | DEM | 2 |
| Turquia — 1. Lig | KAR | CAM | YOY | KZY | YES | KAR | DGY | YDZ | KLC | YOY | 8 |
| Emirados Árabes Unidos — UAE Pro League | DHA | THU | THU | QAM | DRA | THU | THU | QAM | DHA | THU | 4 |

### Calendário ano civil (Fevereiro–Dezembro)

| Liga | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Argentina — Liga Profesional | ALA | ALA | ARR | QUI | ARR | ARR | CHA | CEI | ARR | ARR | 5 |
| Brasil — Brasileirão Série A | PDR | PED | PED | CAS | VEN | ANG | PDR | PED | PDR | CAJ | 6 |
| Brasil — Brasileirão Série B | ANO | PAL | AGI | CSC | CRO | PLM | ARA | VES | GAR | CAA | 10 |
| Colômbia — Categoría Primera A | LUC | MIR | TAB | QUE | TAB | ARE | ARE | POR | POR | QUE | 6 |
| Equador — LigaPro Serie A | TBL | TAB | COR | TAB | SOL | COR | ROS | TAB | ALA | ALA | 6 |
| Coreia do Sul — K League 1 | HAD | HAD | HWA | JIN | NAM | NAM | DAE | NAM | JIN | JIN | 5 |
| Noruega — Eliteserien | LIE | ASV | ASV | LIE | LIE | SKO | ASV | FJE | ASV | ASV | 4 |
| Uruguai — Primera División | PAL | COR | ROS | PAL | ROS | PAL | COR | ROS | ROS | ROS | 3 |
| EUA (MLS) — MLS | FAL | BAY | PIN | SMM | BAY | RED | IRO | CPP | BAY | SUM | 8 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 103.8 / 93 / 113 | 30.7 / 19 / 44 |
| Áustria — Bundesliga | 22 | 52.3 / 43 / 61 | 14.3 / 7 / 20 |
| Bélgica — Pro League | 30 | 70.4 / 65 / 76 | 16.7 / 9 / 27 |
| Bélgica — Challenger Pro League | 28 | 59.8 / 46 / 76 | 22.4 / 15 / 29 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 83.9 / 70 / 98 | 20.2 / 13 / 28 |
| Chéquia — Chance Liga | 30 | 70.6 / 56 / 84 | 15.9 / 11 / 22 |
| Dinamarca — Superliga | 22 | 51.5 / 46 / 61 | 11.1 / 4 / 18 |
| Inglaterra — Premier League | 38 | 94.4 / 78 / 112 | 15.9 / 8 / 31 |
| Inglaterra — Championship | 46 | 119.2 / 105 / 128 | 27.9 / 15 / 35 |
| Inglaterra — League One | 46 | 96.6 / 85 / 108 | 33.4 / 26 / 40 |
| Inglaterra — League Two | 46 | 90.5 / 78 / 99 | 34.1 / 23 / 43 |
| Espanha — La Liga | 38 | 99.5 / 87 / 107 | 12.8 / 2 / 20 |
| Espanha — Segunda División | 42 | 104.4 / 90 / 124 | 27.4 / 20 / 32 |
| Europa (resto) — Liga Resto da Europa | 38 | 93.3 / 76 / 103 | 21.4 / 13 / 34 |
| França — Ligue 1 | 34 | 90.8 / 78 / 102 | 15.4 / 3 / 23 |
| França — Ligue 2 | 34 | 74.3 / 68 / 80 | 24.7 / 18 / 31 |
| França — Ligue 3 | 38 | 76.3 / 71 / 82 | 29.6 / 22 / 38 |
| Alemanha — Bundesliga | 34 | 86.4 / 77 / 95 | 12.7 / 1 / 20 |
| Alemanha — 2. Bundesliga | 34 | 82.5 / 75 / 89 | 21.8 / 2 / 30 |
| Alemanha — 3. Liga | 38 | 79.7 / 70 / 87 | 24.1 / 13 / 31 |
| Grécia — Super League 1 | 26 | 62.7 / 47 / 71 | 13.7 / 7 / 19 |
| Itália — Serie A | 38 | 99.5 / 86 / 114 | 14.5 / 6 / 22 |
| Itália — Serie B | 38 | 91.3 / 77 / 108 | 23.8 / 18 / 33 |
| Japão — J1 League | 38 | 90.2 / 78 / 105 | 23.7 / 19 / 30 |
| Japão — J2 League | 38 | 80.7 / 66 / 90 | 26.8 / 21 / 33 |
| Arábia Saudita — Saudi Pro League | 34 | 81.4 / 65 / 93 | 18.3 / 2 / 26 |
| Arábia Saudita — First Division League | 34 | 73.1 / 67 / 90 | 25.5 / 20 / 31 |
| México — Liga MX | 34 | 79.4 / 71 / 96 | 23.7 / 11 / 31 |
| Países Baixos — Eredivisie | 34 | 83.9 / 76 / 93 | 17.2 / 8 / 28 |
| Países Baixos — Eerste Divisie | 38 | 78.8 / 64 / 93 | 31.3 / 22 / 37 |
| Polónia — Ekstraklasa | 34 | 75.2 / 69 / 86 | 22.2 / 12 / 29 |
| Portugal — Liga Portugal | 34 | 87.1 / 78 / 99 | 17.6 / 13 / 21 |
| Portugal — Liga Portugal 2 | 34 | 77.5 / 65 / 88 | 26.9 / 18 / 34 |
| Escócia — Premiership | 33 | 86.6 / 72 / 99 | 17.4 / 12 / 23 |
| Escócia — Championship | 36 | 69.8 / 63 / 80 | 27.6 / 19 / 34 |
| Suíça — Super League | 33 | 73.8 / 65 / 83 | 22.0 / 15 / 30 |
| Turquia — Süper Lig | 38 | 92.9 / 79 / 104 | 21.6 / 14 / 32 |
| Turquia — 1. Lig | 38 | 88.2 / 74 / 104 | 24.1 / 15 / 35 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 57.4 / 52 / 63 | 14.5 / 8 / 20 |
| Argentina — Liga Profesional | 29 | 70.3 / 59 / 77 | 13.2 / 8 / 18 |
| Brasil — Brasileirão Série A | 38 | 93.6 / 81 / 105 | 13.3 / -3 / 22 |
| Brasil — Brasileirão Série B | 38 | 91.8 / 81 / 106 | 23.9 / 19 / 30 |
| Colômbia — Categoría Primera A | 38 | 89.2 / 78 / 104 | 23.0 / 14 / 33 |
| Equador — LigaPro Serie A | 30 | 67.3 / 60 / 77 | 16.5 / 9 / 23 |
| Coreia do Sul — K League 1 | 33 | 65.6 / 59 / 82 | 23.8 / 15 / 28 |
| Noruega — Eliteserien | 30 | 70.4 / 64 / 78 | 19.4 / 11 / 25 |
| Uruguai — Primera División | 30 | 72.7 / 60 / 80 | 16.7 / 12 / 26 |
| EUA (MLS) — MLS | 29 | 64.1 / 59 / 76 | 16.2 / 9 / 22 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 1-0 (a.p.) |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | AS Torrefranco (ITA) | 4-0 |
| 2026/27 | Liga Conferência | Dunbury Wanderers (ENG) | Clube Desportivo de Serra do Freixo (POR) | 5-2 (a.p.) |
| 2026/27 | Liga Europa | Olmedosa CF (ESP) | Caldale Albion (ENG) | 1-1 (a.p.) 4-2 g.p. |
| 2027 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético General Ceibos (ARG) | 2-1 |
| 2027/28 | Liga dos Campeões Asiática | Ishioka SC (JPN) | Ras Rayyan Sharq FC (KSA) | 3-1 |
| 2027/28 | Liga dos Campeões | FC Casteldorato (ITA) | Olmedosa CF (ESP) | 2-0 |
| 2027/28 | Liga Conferência | Brombury United (ENG) | FC Ronsebroek (BEL) | 2-0 |
| 2027/28 | Liga Europa | Fontemarino Calcio (ITA) | Caldale Albion (ENG) | 3-1 |
| 2028 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-1 (a.p.) |
| 2028/29 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Ain Thuraya Club (KSA) | 3-1 |
| 2028/29 | Liga dos Campeões | Eintracht Steiningen (GER) | SV Mühlwangen (GER) | 2-1 |
| 2028/29 | Liga Conferência | Carnby Wanderers (ENG) | SS Valfranco (ITA) | 1-1 (a.p.) 5-4 g.p. |
| 2028/29 | Liga Europa | FC Grüntal (GER) | Brombury United (ENG) | 1-0 |
| 2029 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Unión de Puerto Ceibos (ARG) | 2-0 |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-0 |
| 2029/30 | Liga dos Campeões | AS Fonteville (FRA) | SV Mühlwangen (GER) | 2-0 (a.p.) |
| 2029/30 | Liga Conferência | Olmevega CF (ESP) | SV Haselbach (GER) | 1-0 (a.p.) |
| 2029/30 | Liga Europa | Stourmercombe City (ENG) | Achilles Rijszand (NED) | 1-0 |
| 2030 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2030/31 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Fortuna Kirisaki (JPN) | 4-1 |
| 2030/31 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 3-1 |
| 2030/31 | Liga Conferência | Carnby Wanderers (ENG) | SpVgg Mühlberg (GER) | 1-0 |
| 2030/31 | Liga Europa | Olmevega CF (ESP) | UD Mirallosa (ESP) | 1-1 (a.p.) 5-2 g.p. |
| 2031 | Libertadores | Atlético Pouso das Pedras (BRA) | Grêmio Campo do Cajueiro (BRA) | 1-0 |
| 2031/32 | Liga dos Campeões Asiática | Ras Rayyan Sharq FC (KSA) | Matsuno FC (JPN) | 2-0 |
| 2031/32 | Liga dos Campeões | CF Alcormonte (ESP) | AC Fontebello (ITA) | 2-1 |
| 2031/32 | Liga Conferência | Clube Desportivo de Vila do Vale (POR) | CD Salatejo (ESP) | 1-0 |
| 2031/32 | Liga Europa | Quendale Athletic (ENG) | Carnby Wanderers (ENG) | 2-0 |
| 2032 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 2-0 |
| 2032/33 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Daeju Hawks (KOR) | 2-1 (a.p.) |
| 2032/33 | Liga dos Campeões | AS Fonteville (FRA) | FC Casteldorato (ITA) | 3-0 |
| 2032/33 | Liga Conferência | Sutepe İdmanyurdu (TUR) | AC Pontemarino (ITA) | 1-0 |
| 2032/33 | Liga Europa | Racing Club de Bellegarde (FRA) | Brombury United (ENG) | 4-0 |
| 2033 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético General Ceibos (ARG) | 3-1 (a.p.) |
| 2033/34 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 1-0 |
| 2033/34 | Liga dos Campeões | CF Alcormonte (ESP) | Ardmuir Academicals (SCO) | 2-1 (a.p.) |
| 2033/34 | Liga Conferência | Netherenwick Athletic (ENG) | UD Mirallosa (ESP) | 4-1 |
| 2033/34 | Liga Europa | Olmedosa CF (ESP) | SV Mühlwangen (GER) | 2-1 |
| 2034 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 1-1 (a.p.) 7-6 g.p. |
| 2034/35 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Hwacheon United (KOR) | 5-0 |
| 2034/35 | Liga dos Campeões | Carnley Albion (ENG) | FC Grüntal (GER) | 2-0 |
| 2034/35 | Liga Conferência | FC Grokerk (NED) | SC Bloemveen (NED) | 2-1 (a.p.) |
| 2034/35 | Liga Europa | Brackcombe Town (ENG) | SpVgg Mühlberg (GER) | 2-0 |
| 2035 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Atlético Pouso das Pedras (BRA) | 2-0 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 2-1 |
| 2035/36 | Liga dos Campeões | SpVgg Mühlberg (GER) | AS Fonteville (FRA) | 3-0 |
| 2035/36 | Liga Conferência | Eintracht Altenhausen (GER) | Torrefranco Calcio (ITA) | 2-1 |
| 2035/36 | Liga Europa | Racing Club de Saint-Court (FRA) | Demiryurtspor (TUR) | 1-1 (a.p.) 6-5 g.p. |
| 2036 | Libertadores | Atlético Pouso das Pedras (BRA) | Clube Atlético Pouso das Pedras (BRA) | 1-0 |

Títulos por país: Libertadores — BRA: 10; Liga dos Campeões Asiática — KSA: 5; Liga Conferência — ENG: 5; Liga dos Campeões Asiática — JPN: 5; Liga Europa — ESP: 3; Liga Europa — ENG: 3; Liga dos Campeões — ITA: 2; Liga dos Campeões — GER: 2; Liga dos Campeões — FRA: 2; Liga dos Campeões — ENG: 2; Liga dos Campeões — ESP: 2; Liga Europa — FRA: 2; Liga Europa — ITA: 1; Liga Europa — GER: 1; Liga Conferência — ESP: 1; Liga Conferência — POR: 1; Liga Conferência — TUR: 1; Liga Conferência — NED: 1; Liga Conferência — GER: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 18.89, ENG1 16.72, ESP1 14.13 | ITA1, ENG1 | FC Casteldorato (ITA) / Olmedosa CF (ESP) / Dunbury Wanderers (ENG) |
| 2027/28 | ITA1 15.67, NED1 14.70, ENG1 14.67 | ITA1, NED1 | FC Casteldorato (ITA) / Fontemarino Calcio (ITA) / Brombury United (ENG) |
| 2028/29 | GER1 19.07, ESP1 15.71, ENG1 13.88 | GER1, ESP1 | Eintracht Steiningen (GER) / FC Grüntal (GER) / Carnby Wanderers (ENG) |
| 2029/30 | ENG1 17.00, ESP1 16.38, ITA1 13.86 | ENG1, ESP1 | AS Fonteville (FRA) / Stourmercombe City (ENG) / Olmevega CF (ESP) |
| 2030/31 | ESP1 15.94, ITA1 14.79, ENG1 14.67 | ESP1, ITA1 | Carnley Albion (ENG) / Olmevega CF (ESP) / Carnby Wanderers (ENG) |
| 2031/32 | ENG1 16.67, ITA1 15.06, ESP1 15.00 | ENG1, ITA1 | CF Alcormonte (ESP) / Quendale Athletic (ENG) / Clube Desportivo de Vila do Vale (POR) |
| 2032/33 | ITA1 17.50, FRA1 16.29, ESP1 15.25 | ITA1, FRA1 | AS Fonteville (FRA) / Racing Club de Bellegarde (FRA) / Sutepe İdmanyurdu (TUR) |
| 2033/34 | GER1 16.00, ESP1 15.29, ENG1 14.14 | GER1, ESP1 | CF Alcormonte (ESP) / Olmedosa CF (ESP) / Netherenwick Athletic (ENG) |
| 2034/35 | ENG1 20.81, FRA1 14.71, GER1 14.50 | ENG1, FRA1 | Carnley Albion (ENG) / Brackcombe Town (ENG) / FC Grokerk (NED) |
| 2035/36 | GER1 18.57, ESP1 14.64, FRA1 13.31 | GER1, ESP1 | SpVgg Mühlberg (GER) / Racing Club de Saint-Court (FRA) / Eintracht Altenhausen (GER) |

## 5. Taças nacionais (vencedores)

| Taça (Agosto–Maio) | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| ÖFB-Cup (Áustria) | KIR | KIR | KIR | KIR | HAS | KRC | RHE | KIR | BUC | KIR |
| Taça da Bélgica (Bélgica) | VER | VER | RON | MAA | RNS | BEA | BEA | RON | RON | WES |
| Taça da Croácia (Croácia) | ZAZ | SLA | SLA | BRE | ZAZ | SLA | ZAZ | BRE | BEP | NOV |
| Taça da Chéquia (Chéquia) | RYC | OST | POD | KST | POD | LUH | KLA | RYC | POD | KOS |
| Taça da Dinamarca (Dinamarca) | VES | HED | LUN | BRO | BRO | BRO | HEM | STE | BRO | VES |
| FA Cup (Inglaterra) | CAL | BRA | DNC | HAT | CAR | YAR | CAR | DUN | BRA | HAT |
| EFL Cup (Carabao Cup) (Inglaterra) | BRA | BRA | BRO | BRA | CAR | YAR | STO | CAR | CAR | BRA |
| Copa del Rey (Espanha) | ALC | ALC | OLM | OME | LOR | ALC | GUA | MON | MIR | ALC |
| Coupe de France (França) | FNT | FON | FON | FON | VIL | FON | FON | FON | FON | FON |
| DFB-Pokal (Alemanha) | GRU | GRU | STE | GRU | GRU | GRU | GRU | GRU | STE | ZEL |
| Taça da Grécia (Grécia) | ORI | ORI | ORI | PER | ORI | ORI | ORI | PER | ORI | ORI |
| Coppa Italia (Itália) | CAS | CAS | CST | CAS | CAS | CAS | CAO | TOR | CAS | VLC |
| Emperor's Cup (Japão) | MAT | ISH | MAT | ISH | MAT | KIR | FUJ | MAT | MAT | MAT |
| J.League Cup (Japão) | MAT | MAT | MAT | MAT | MAT | SAK | MAT | MAT | MAT | FUJ |
| King's Cup (Arábia Saudita) | DHA | RAY | SID | SID | THU | THU | THU | MAN | SID | SID |
| KNVB Beker (Países Baixos) | RIJ | ADE | GRO | ADE | BLO | RIJ | MEE | ALD | GRO | MEE |
| Taça da Polónia (Polónia) | MIS | PIA | KRA | GRO | PIA | DEN | ZIE | GRO | GOS | GRO |
| Taça de Portugal (Portugal) | ALV | RBO | CAR | ALV | RBO | VAL | ALV | CAR | CAR | ALV |
| Taça da Liga (Portugal) | CAR | CAR | ALV | ALV | CAR | FRE | CAR | CAR | LAJ | CAR |
| Scottish Cup (Escócia) | ARD | INV | DAL | LOC | CRA | DAL | ARD | ARD | ARD | ARD |
| Scottish League Cup (Escócia) | ARD | BAL | CRA | ARD | ARD | ARD | KIL | ARD | ARD | KIN |
| Taça da Suíça (Suíça) | KIR | KIR | BER | KIR | BER | MUH | BRN | KIR | KIR | KIR |
| Taça da Turquia (Turquia) | KZL | YLD | KZL | DAG | KZL | DGT | DAG | DMI | KZL | DEM |
| UAE President's Cup (Emirados Árabes Unidos) | DHA | THU | DAF | QAM | MAN | GHA | GHA | THU | THU | THU |

| Taça (ano civil (Fevereiro–Dezembro)) | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | ALA | CHA | CES | ARR | ARR | MOR | CEI | PRA | ARR | CIB |
| Copa do Brasil (Brasil) | PDR | VEN | ANG | PDR | CAJ | ANG | CAJ | ANG | PDR | CED |
| Copa Colombia (Colômbia) | QUE | TAB | TAB | LUC | AEN | FLO | QUE | LUC | ARE | LUC |
| Copa Equador (Equador) | COR | ALA | MIR | TBL | ROS | COR | TAB | TBL | LUC | ALA |
| Korean FA Cup (Coreia do Sul) | NAM | NAM | HAD | HAN | NAM | NAM | NAM | HAD | NMC | JIN |
| Taça da Noruega (Noruega) | FJE | STR | ASV | BER | FJE | LIE | BER | LIE | ASV | LIE |
| Copa Uruguai (Uruguai) | PAL | COR | COL | PAL | ROS | PAL | COR | ROS | ROS | COL |

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
| 2030/31 | 43 | 43 | 4 | 43 | 43 |
| 2031 | 4 | 4 | 0 | 15 | 15 |
| 2031/32 | 44 | 44 | 5 | 43 | 43 |
| 2032 | 4 | 4 | 0 | 15 | 15 |
| 2032/33 | 44 | 44 | 5 | 43 | 43 |
| 2033 | 4 | 4 | 0 | 15 | 15 |
| 2033/34 | 41 | 41 | 2 | 43 | 43 |
| 2034 | 4 | 4 | 0 | 15 | 15 |
| 2034/35 | 42 | 42 | 3 | 43 | 43 |
| 2035 | 4 | 4 | 0 | 15 | 15 |
| 2035/36 | 41 | 41 | 2 | 43 | 43 |
| 2036 | 4 | 4 | 0 | 15 | 15 |

Detalhe (clube a clube) em cada página de época.
