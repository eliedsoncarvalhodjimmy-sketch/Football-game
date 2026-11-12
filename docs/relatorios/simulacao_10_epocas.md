# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (48 ligas, 31 pacotes). Épocas 2026/27 a 2035/36. Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 10 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 11 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 172 080 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.62 golos; casa 44.7%, empate 25.9%, fora 29.4%; 0-0 7.3%; 5+ 12.1%; 7+ 0.9% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (155 000) | ✅ | 2.62 golos; casa 44.5%, empate 26.3%, fora 29.2%; 0-0 7.3%; 5+ 11.9%; 7+ 0.8% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.29; 96.5% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.51; 91.5% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 6.2; 0 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 34.4%; um dos 3 favoritos em 64.0% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 461 subidas, 461 descidas, 580 saídas para o exterior, 580 entradas; 46.2% dos que sobem descem logo; 126 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital 887c95f4 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 65 ms / 114 ms |
| Uma semana de calendário (média / p95 / máx.) | 1.3 ms / 2.5 ms / 45.3 ms |
| Memória (heap) no fim | 49 MB |
| Gravação por época (todos os jogos, gzip) | 137 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 208 |
| Sorteios das fases de liga UEFA que alargaram o limite de 2 adversários do mesmo país | 3 de 42 (potes refeitos: 0) |

Parâmetros do modo rápido: base 1.24, casa 1.17, gama 0.03, rho -0.05, empates ×1.25, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | LUM | IKE | IKE | IKE | ADE | NGO | IKE | ADE | ADE | LAH | 5 |
| Argentina — Liga Profesional | ARR | ARR | ARR | CEI | ARR | ARR | MOR | ARR | PIN | TOS | 5 |
| Áustria — Bundesliga | HAS | FAL | DOR | BUC | DOR | KIR | DOR | DOR | BER | KIR | 6 |
| Bélgica — Pro League | OOS | LIE | VER | OOS | VER | BEA | BEA | LER | ROM | VER | 6 |
| Bélgica — Challenger Pro League | HRE | MAA | HRE | ROT | ROK | ROT | ZAN | WES | MLM | HRE | 7 |
| Brasil — Brasileirão Série A | PED | CAS | SER | JAT | PED | ANG | CAJ | CAJ | CAS | CAS | 6 |
| Brasil — Brasileirão Série B | VOS | PLM | SEO | CAA | CAO | PEQ | SEO | SER | GAR | AGI | 9 |
| Colômbia — Categoría Primera A | ROS | LUC | TBL | LUC | ARE | SOL | RSA | ESP | LUC | ROS | 7 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | VIK | ZAZ | BRE | BRE | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | BRE | 3 |
| Chéquia — Chance Liga | POD | POD | KOS | LUH | POD | POD | OST | KOS | LUH | RYC | 5 |
| Dinamarca — Superliga | BRO | SER | SER | SOL | SOL | VES | FJN | BRO | VES | NRL | 6 |
| Equador — LigaPro Serie A | TAB | TAB | ROS | TAB | LUC | COR | ROS | COR | MRA | COR | 5 |
| Inglaterra — Premier League | BRA | BRA | CAR | BRA | BRA | BRA | BRA | BRA | GRI | BRA | 3 |
| Inglaterra — Championship | ASH | DNW | NTH | CRN | THO | DUN | BRO | DUN | SOU | STY | 9 |
| Inglaterra — League One | MRL | WHI | THR | CAE | KEL | STT | DUE | WIT | STT | WIT | 8 |
| Inglaterra — League Two | MOR | MAK | ASR | THM | BOM | ELT | AHH | MOR | THR | MRL | 9 |
| Espanha — La Liga | OLM | ALC | OLM | OME | ALC | OLM | OLM | OLM | OLM | OLM | 3 |
| Espanha — Segunda División | ACO | LOR | MIA | SLA | TRR | HIA | TAR | SAN | TON | LOR | 9 |
| Europa (resto) — Liga Resto da Europa | FEH | FEH | FEH | AGB | AKE | VAL | FEH | AKE | TUR | KFA | 6 |
| França — Ligue 1 | FON | FON | FON | FON | FON | FON | FON | FUN | CLA | FNT | 4 |
| França — Ligue 2 | ROC | FDE | BAU | MRC | FDE | CHA | ROC | CHA | VIS | ROC | 6 |
| França — Ligue 3 | PLC | VLG | VIS | SAT | VAL | SNT | LIE | VLL | SNT | VLL | 8 |
| Alemanha — Bundesliga | MUH | STE | MHL | ZEL | STE | MHL | MHL | STE | STE | MHL | 4 |
| Alemanha — 2. Bundesliga | MUD | GAL | SEI | WES | GAL | MUD | EIC | SEI | HOH | TNN | 7 |
| Alemanha — 3. Liga | STN | BUK | ZED | WEA | WST | STL | ZEN | KIR | ZED | ZEU | 9 |
| Grécia — Super League 1 | ORI | ORI | ORI | ORI | KAL | ORI | ORI | ORI | ORI | KAL | 2 |
| Itália — Serie A | CAS | CAS | CAS | VAL | FON | CAS | CAS | TRR | TOR | CAS | 5 |
| Itália — Serie B | TCO | PNT | TGO | VLC | POO | VLC | BDE | VIL | CRO | POO | 8 |
| Japão — J1 League | HOS | HOS | SAK | KII | HAI | HOS | MAT | YAO | SAK | FUJ | 7 |
| Japão — J2 League | YAA | TAA | KIR | HAA | YNO | HNA | TAI | HAI | YMA | HOA | 10 |
| Coreia do Sul — K League 1 | NMC | HWA | DAE | HWA | DAE | HND | NAM | MNC | JIN | HAD | 8 |
| Arábia Saudita — Saudi Pro League | THU | THU | THU | THU | THU | THU | SAQ | SID | QAR | DHA | 5 |
| Arábia Saudita — First Division League | RIM | FAI | ZAH | QAR | BRQ | MNA | THA | QAM | SHI | QAM | 9 |
| México — Liga MX | POR | ESP | ESP | POO | TAB | CEI | AGU | ESP | AGU | CEI | 6 |
| Países Baixos — Eredivisie | RIJ | GRO | ALD | GRO | ALD | RIJ | RIJ | ALD | GRO | ALD | 3 |
| Países Baixos — Eerste Divisie | BLK | BEE | MER | VEL | BEE | LDE | ARK | BEE | OUD | LET | 8 |
| Noruega — Eliteserien | ELV | LIE | LIE | ASV | ASV | LIE | LIS | BJR | ASV | NOR | 6 |
| Polónia — Ekstraklasa | SAW | ZIE | PIA | PIA | MIS | RAK | RAK | PIA | DEB | RAK | 6 |
| Portugal — Liga Portugal | CAR | ALV | ALV | CAR | CAR | ALV | ALV | FEI | CAR | FEI | 3 |
| Portugal — Liga Portugal 2 | LGO | LJE | FRO | LGO | MRV | MAA | MAR | LES | MAA | AVA | 8 |
| Escócia — Premiership | ARD | KIL | ARD | ARD | ARD | BAL | ARD | ARD | ARD | ARD | 3 |
| Escócia — Championship | BLM | DAN | DLN | GLE | DAN | INV | DLA | DLN | DLA | DLI | 7 |
| Suíça — Super League | KIR | KIR | KIR | KIR | BRN | NEU | KIR | KIR | BER | DOR | 5 |
| Turquia — Süper Lig | DEM | SUT | KLC | YLD | DMI | YLD | KZL | KZL | DMI | AYA | 7 |
| Turquia — 1. Lig | YES | YOY | AKY | TAS | DGT | CAM | KAR | YLG | DGY | AKP | 10 |
| Emirados Árabes Unidos — UAE Pro League | DAF | BST | WAH | THU | DHA | DHA | DHA | DHA | WHA | DHA | 6 |
| Uruguai — Primera División | PAL | ROS | ROS | ROS | ROS | PAL | COL | PAL | PAL | PAL | 3 |
| EUA (MLS) — MLS | BAY | SMM | CPP | SUM | STO | RDV | RDV | IRO | FAL | SLV | 9 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina, MLS): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 105.8 / 92 / 117 | 25.5 / 17 / 30 |
| Argentina — Liga Profesional | 29 | 72.5 / 62 / 79 | 11.0 / 7 / 16 |
| Áustria — Bundesliga | 22 | 49.1 / 42 / 58 | 12.3 / 3 / 21 |
| Bélgica — Pro League | 30 | 71.1 / 64 / 79 | 12.8 / 5 / 20 |
| Bélgica — Challenger Pro League | 28 | 57.5 / 48 / 68 | 18.1 / 12 / 28 |
| Brasil — Brasileirão Série A | 38 | 84.8 / 70 / 94 | 16.7 / 4 / 30 |
| Brasil — Brasileirão Série B | 38 | 89.0 / 82 / 97 | 18.6 / 11 / 25 |
| Colômbia — Categoría Primera A | 38 | 84.3 / 68 / 101 | 19.4 / 4 / 30 |
| Croácia — HNL (SuperSport Hrvatska nogometna liga) | 36 | 79.7 / 71 / 94 | 21.3 / 8 / 33 |
| Chéquia — Chance Liga | 30 | 71.2 / 62 / 84 | 13.6 / 4 / 21 |
| Dinamarca — Superliga | 22 | 50.8 / 44 / 59 | 10.5 / 6 / 16 |
| Equador — LigaPro Serie A | 30 | 68.8 / 55 / 83 | 14.1 / 4 / 24 |
| Inglaterra — Premier League | 38 | 89.3 / 81 / 98 | 18.0 / 4 / 27 |
| Inglaterra — Championship | 46 | 108.0 / 93 / 122 | 22.1 / 12 / 34 |
| Inglaterra — League One | 46 | 100.9 / 91 / 112 | 26.7 / 20 / 34 |
| Inglaterra — League Two | 46 | 101.7 / 89 / 111 | 27.5 / 17 / 37 |
| Espanha — La Liga | 38 | 91.7 / 78 / 105 | 12.9 / 6 / 22 |
| Espanha — Segunda División | 42 | 98.8 / 91 / 111 | 22.0 / 14 / 32 |
| Europa (resto) — Liga Resto da Europa | 38 | 86.0 / 72 / 98 | 21.7 / 18 / 31 |
| França — Ligue 1 | 34 | 84.5 / 71 / 91 | 11.7 / 3 / 22 |
| França — Ligue 2 | 34 | 78.6 / 71 / 87 | 18.8 / 13 / 27 |
| França — Ligue 3 | 38 | 86.1 / 80 / 92 | 21.9 / 14 / 29 |
| Alemanha — Bundesliga | 34 | 82.0 / 74 / 91 | 13.0 / 2 / 24 |
| Alemanha — 2. Bundesliga | 34 | 75.3 / 67 / 97 | 16.5 / 8 / 23 |
| Alemanha — 3. Liga | 38 | 84.9 / 73 / 95 | 24.5 / 12 / 36 |
| Grécia — Super League 1 | 26 | 62.3 / 51 / 71 | 13.1 / 9 / 18 |
| Itália — Serie A | 38 | 93.2 / 82 / 102 | 13.8 / 4 / 27 |
| Itália — Serie B | 38 | 88.7 / 76 / 98 | 18.8 / 7 / 28 |
| Japão — J1 League | 38 | 85.1 / 75 / 103 | 21.5 / 10 / 34 |
| Japão — J2 League | 38 | 82.0 / 72 / 95 | 24.8 / 20 / 29 |
| Coreia do Sul — K League 1 | 33 | 69.0 / 62 / 83 | 21.0 / 8 / 29 |
| Arábia Saudita — Saudi Pro League | 34 | 84.5 / 73 / 95 | 12.9 / 6 / 22 |
| Arábia Saudita — First Division League | 34 | 73.1 / 66 / 79 | 19.7 / 10 / 30 |
| México — Liga MX | 34 | 74.1 / 65 / 90 | 16.5 / 6 / 25 |
| Países Baixos — Eredivisie | 34 | 83.1 / 70 / 93 | 12.9 / 6 / 19 |
| Países Baixos — Eerste Divisie | 38 | 79.5 / 73 / 93 | 26.3 / 18 / 29 |
| Noruega — Eliteserien | 30 | 65.0 / 56 / 76 | 17.0 / 8 / 23 |
| Polónia — Ekstraklasa | 34 | 76.2 / 62 / 91 | 18.1 / 9 / 28 |
| Portugal — Liga Portugal | 34 | 83.9 / 72 / 95 | 14.0 / 6 / 20 |
| Portugal — Liga Portugal 2 | 34 | 76.5 / 69 / 87 | 17.4 / 11 / 23 |
| Escócia — Premiership | 33 | 79.5 / 69 / 90 | 14.6 / 6 / 24 |
| Escócia — Championship | 36 | 75.0 / 65 / 84 | 21.6 / 13 / 28 |
| Suíça — Super League | 33 | 74.7 / 65 / 92 | 17.7 / 7 / 27 |
| Turquia — Süper Lig | 38 | 88.1 / 85 / 93 | 18.4 / 6 / 28 |
| Turquia — 1. Lig | 38 | 85.5 / 71 / 96 | 18.9 / 3 / 28 |
| Emirados Árabes Unidos — UAE Pro League | 26 | 58.2 / 55 / 63 | 13.9 / 7 / 19 |
| Uruguai — Primera División | 30 | 72.1 / 67 / 80 | 13.6 / 8 / 18 |
| EUA (MLS) — MLS | 29 | 66.4 / 59 / 77 | 16.1 / 11 / 21 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Stella Hoshigawa (JPN) | Al Sidra Club (KSA) | 1-0 |
| 2026/27 | Libertadores | Atlético Pouso das Pedras (BRA) | Rio do Angico Futebol Clube (BRA) | 3-0 |
| 2026/27 | Liga dos Campeões | FC Casteldorato (ITA) | AS Fonteville (FRA) | 1-0 (a.p.) |
| 2026/27 | Liga Conferência | Ironi Kfar Shaked (ISR) | Dunbury Wanderers (ENG) | 3-2 (a.p.) |
| 2026/27 | Liga Europa | SC Zelltal (GER) | Fontemarino Calcio (ITA) | 2-1 (a.p.) |
| 2027/28 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Stella Yamasaki (JPN) | 2-0 |
| 2027/28 | Libertadores | Rio do Angico Futebol Clube (BRA) | Sportivo Villa Chañares (ARG) | 1-1 (a.p.) 5-3 g.p. |
| 2027/28 | Liga dos Campeões | SV Mühlwangen (GER) | FC Casteldorato (ITA) | 0-0 (a.p.) 4-2 g.p. |
| 2027/28 | Liga Conferência | Monvega CF (ESP) | Alderdrecht Boys (NED) | 2-1 (a.p.) |
| 2027/28 | Liga Europa | SC Fonteville (FRA) | Atlético Hinovega (ESP) | 3-1 |
| 2028/29 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Al Sidra Club (KSA) | 2-0 |
| 2028/29 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Grêmio Campo do Cajueiro (BRA) | 2-0 |
| 2028/29 | Liga dos Campeões | Stourmercombe City (ENG) | AS Fonteville (FRA) | 2-0 |
| 2028/29 | Liga Conferência | IK Åkerby (SWE) | Eintracht Grüntal (GER) | 1-1 (a.p.) 5-3 g.p. |
| 2028/29 | Liga Europa | Demiryurtspor (TUR) | Clube Desportivo de Serra do Freixo (POR) | 1-0 |
| 2029/30 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Al Sidra Club (KSA) | 3-0 |
| 2029/30 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Atlético Pouso das Pedras (BRA) | 3-0 |
| 2029/30 | Liga dos Campeões | Carnley Albion (ENG) | Asteras Oristathmos (GRE) | 2-1 |
| 2029/30 | Liga Conferência | FC Grüntal (GER) | FC Clairmont (FRA) | 2-1 |
| 2029/30 | Liga Europa | CD Mirallosa (ESP) | Achilles Rijszand (NED) | 2-1 |
| 2030/31 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Al Sidra Club (KSA) | 1-0 |
| 2030/31 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Atlético Pouso das Pedras (BRA) | 3-1 (a.p.) |
| 2030/31 | Liga dos Campeões | Atlético de Torre de Carvide (POR) | Brackcombe Town (ENG) | 3-1 (a.p.) |
| 2030/31 | Liga Conferência | Atlético Hinovega (ESP) | SC Fonteville (FRA) | 2-1 |
| 2030/31 | Liga Europa | Demiryurtspor (TUR) | Achilles Rijszand (NED) | 3-2 |
| 2031/32 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Jabal Dhafra FC (UAE) | 3-3 (a.p.) 5-4 g.p. |
| 2031/32 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-2 (a.p.) |
| 2031/32 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 3-2 |
| 2031/32 | Liga Conferência | AC Fontebello (ITA) | Asteras Oristathmos (GRE) | 3-1 |
| 2031/32 | Liga Europa | SC Zelltal (GER) | UD Mirallosa (ESP) | 2-1 |
| 2032/33 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ain Thuraya FC (KSA) | 3-1 |
| 2032/33 | Libertadores | Rio do Angico Futebol Clube (BRA) | Campo dos Ventos Futebol Clube (BRA) | 3-0 |
| 2032/33 | Liga dos Campeões | AS Fonteville (FRA) | Olmedosa CF (ESP) | 2-0 |
| 2032/33 | Liga Conferência | CD Mirallosa (ESP) | Dunworth City (ENG) | 3-0 |
| 2032/33 | Liga Europa | FC Grüntal (GER) | CD Salatejo (ESP) | 4-1 |
| 2033/34 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Jabal Dhafra FC (UAE) | 2-1 |
| 2033/34 | Libertadores | Club Atlético Coronel Arroyito (ARG) | Grêmio Campo do Cajueiro (BRA) | 4-1 |
| 2033/34 | Liga dos Campeões | Brackcombe Town (ENG) | TSV Tannau (GER) | 3-1 |
| 2033/34 | Liga Conferência | Real Riberrada (ESP) | Yıldızderespor (TUR) | 1-0 |
| 2033/34 | Liga Europa | Alderdrecht Boys (NED) | Quendale Athletic (ENG) | 1-0 (a.p.) |
| 2034/35 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Daeju Hawks (KOR) | 2-1 |
| 2034/35 | Libertadores | Atlético Pouso das Pedras (BRA) | Unión de Villa Bellavista (ARG) | 1-1 (a.p.) 3-2 g.p. |
| 2034/35 | Liga dos Campeões | Eintracht Steiningen (GER) | Brackcombe Town (ENG) | 2-1 |
| 2034/35 | Liga Conferência | FC Grüntal (GER) | Caldale Albion (ENG) | 1-0 (a.p.) |
| 2034/35 | Liga Europa | AS Torrefranco (ITA) | Eintracht Grüntal (GER) | 3-1 |
| 2035/36 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Takamine FC (JPN) | 1-1 (a.p.) 3-2 g.p. |
| 2035/36 | Libertadores | Real Cerro Corral (ECU) | Atlético Pouso das Pedras (BRA) | 2-1 (a.p.) |
| 2035/36 | Liga dos Campeões | Brackcombe Town (ENG) | Eintracht Steiningen (GER) | 3-2 |
| 2035/36 | Liga Conferência | Dunbury Wanderers (ENG) | Fontemarino Calcio (ITA) | 2-2 (a.p.) 5-4 g.p. |
| 2035/36 | Liga Europa | Eintracht Grünheim (GER) | CF Alcormonte (ESP) | 2-1 |

Títulos por país: Liga dos Campeões Asiática — KSA: 9; Libertadores — BRA: 5; Liga Europa — GER: 4; Liga Conferência — ESP: 4; Libertadores — ARG: 4; Liga dos Campeões — ENG: 4; Liga dos Campeões — ITA: 2; Liga dos Campeões — GER: 2; Liga Europa — TUR: 2; Liga Conferência — GER: 2; Liga dos Campeões Asiática — JPN: 1; Liga Conferência — ISR: 1; Liga Europa — FRA: 1; Liga Conferência — SWE: 1; Liga Europa — ESP: 1; Liga dos Campeões — POR: 1; Liga Conferência — ITA: 1; Liga dos Campeões — FRA: 1; Liga Europa — NED: 1; Liga Europa — ITA: 1; Libertadores — ECU: 1; Liga Conferência — ENG: 1.

## 4b. Coeficiente UEFA da época, bónus do ranking e campeões em título

| Época | 3 melhores associações (coeficiente) | Bónus na época seguinte | Campeões em título na época seguinte (UCL / UEL / UECL) |
|---|---|---|---|
| 2026/27 | ITA1 17.06, ENG1 15.00, GER1 14.36 | ITA1, ENG1 | FC Casteldorato (ITA) / SC Zelltal (GER) / Ironi Kfar Shaked (ISR) |
| 2027/28 | FRA1 18.14, ESP1 14.50, ITA1 13.61 | FRA1, ESP1 | SV Mühlwangen (GER) / SC Fonteville (FRA) / Monvega CF (ESP) |
| 2028/29 | ENG1 16.36, FRA1 14.78, GER1 13.56 | ENG1, FRA1 | Stourmercombe City (ENG) / Demiryurtspor (TUR) / IK Åkerby (SWE) |
| 2029/30 | ESP1 16.79, ENG1 15.39, FRA1 12.88 | ESP1, ENG1 | Carnley Albion (ENG) / CD Mirallosa (ESP) / FC Grüntal (GER) |
| 2030/31 | ENG1 16.50, ESP1 13.28, NED1 13.20 | ENG1, ESP1 | Atlético de Torre de Carvide (POR) / Demiryurtspor (TUR) / Atlético Hinovega (ESP) |
| 2031/32 | ENG1 16.44, ESP1 15.89, ITA1 14.07 | ENG1, ESP1 | FC Casteldorato (ITA) / SC Zelltal (GER) / AC Fontebello (ITA) |
| 2032/33 | ESP1 16.19, FRA1 15.50, ENG1 14.38 | ESP1, FRA1 | AS Fonteville (FRA) / FC Grüntal (GER) / CD Mirallosa (ESP) |
| 2033/34 | ENG1 18.86, ESP1 16.22, GER1 12.75 | ENG1, ESP1 | Brackcombe Town (ENG) / Alderdrecht Boys (NED) / Real Riberrada (ESP) |
| 2034/35 | GER1 18.71, ENG1 16.67, ITA1 16.00 | GER1, ENG1 | Eintracht Steiningen (GER) / AS Torrefranco (ITA) / FC Grüntal (GER) |
| 2035/36 | GER1 15.75, ENG1 15.06, ESP1 14.86 | GER1, ENG1 | Brackcombe Town (ENG) / Eintracht Grünheim (GER) / Dunbury Wanderers (ENG) |

## 5. Taças nacionais (vencedores)

| País | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| Copa Argentina (Argentina) | CAN | ARR | CES | ARR | ARR | QUI | QUI | TSC | PIN | ALA |
| ÖFB-Cup (Áustria) | KRC | BUC | KIR | BUC | EIC | FAL | KIR | FAL | RHE | KIR |
| Taça da Bélgica (Bélgica) | OOS | BEA | ROK | OOS | VER | LIE | BEA | BEA | RON | HER |
| Copa do Brasil (Brasil) | ANG | CAJ | JAT | CED | JAT | PED | CAJ | CAJ | SER | ANG |
| Copa Colombia (Colômbia) | TAB | TBL | CMB | LUC | QUE | SOL | QUE | TAB | ESP | TAB |
| Taça da Croácia (Croácia) | BRE | ZAZ | ZAN | BRE | VIK | ZAZ | BRE | SLA | ZAZ | BRE |
| Taça da Chéquia (Chéquia) | LHN | SLA | LUH | POD | POD | OST | KOS | LHN | POD | RYC |
| Taça da Dinamarca (Dinamarca) | BRO | BRO | BRO | VEG | SOV | VES | VES | BRO | BRO | BRO |
| Copa Equador (Equador) | COR | COR | TAB | CUM | COR | ROS | SOL | SOL | PAL | COR |
| FA Cup (Inglaterra) | CAR | STO | CAR | CAR | BRA | CAR | BRA | YAR | BRA | BRO |
| EFL Cup (Carabao Cup) (Inglaterra) | BRA | BRA | QUE | YAR | CAR | BRA | HAT | BRA | HAT | BRA |
| Copa del Rey (Espanha) | OLM | RIB | OLM | SAL | RIB | SAL | OLM | OME | ALC | MRA |
| Coupe de France (França) | FNT | FON | COU | FON | FON | COU | FON | MON | FON | MAR |
| DFB-Pokal (Alemanha) | MUH | STE | MHL | ZEL | GRU | ALT | STE | GUN | STE | STE |
| Taça da Grécia (Grécia) | CHO | THA | TAL | ORI | KAL | ORI | KAL | ORI | ORI | CHO |
| Coppa Italia (Itália) | FON | CAS | CAS | FON | CST | CST | CAO | TRR | TOR | CAS |
| Emperor's Cup (Japão) | YAM | FUJ | SAK | FUJ | KRI | ISH | TAA | YAO | HNA | SAK |
| J.League Cup (Japão) | HOS | HOS | SAK | MAT | KII | ISH | MAT | MAT | SAK | FUJ |
| Korean FA Cup (Coreia do Sul) | HAN | NAM | HWA | HWA | HAN | NMC | NAM | HND | NAM | HAD |
| King's Cup (Arábia Saudita) | THU | THU | DHA | TUR | SID | SID | SAQ | SID | DHA | DHA |
| KNVB Beker (Países Baixos) | RIJ | MEE | ADE | RIJ | BOE | RIJ | ALD | ALD | BLO | ALD |
| Taça da Noruega (Noruega) | LIE | SOG | LIE | STR | LIE | LIE | ASV | BJR | ELV | LIS |
| Taça da Polónia (Polónia) | MIS | GOS | RAK | RAK | SAW | MIS | RAK | ZIE | DEB | MIS |
| Taça de Portugal (Portugal) | ALV | CAR | VAL | CAR | ALV | VAL | FEI | FEI | FEI | FEI |
| Taça da Liga (Portugal) | CAR | VAE | FEI | REB | CAR | ALV | FEI | ALV | FEI | ALV |
| Scottish Cup (Escócia) | KIL | KIL | KNL | CRA | ARD | KIL | ARD | CRA | KIN | DAL |
| Scottish League Cup (Escócia) | KIL | ARD | KNL | CRA | KIN | BAL | CRA | ARD | CRA | ARD |
| Taça da Suíça (Suíça) | KIR | KIR | LIN | LIN | BRN | BER | BED | KIR | BER | DOR |
| Taça da Turquia (Turquia) | DMI | SUT | DEM | DEM | DEM | YLD | KLC | KZL | DMI | AYA |
| UAE President's Cup (Emirados Árabes Unidos) | DAF | DHA | DHA | DAF | WHA | DAF | WHA | DAF | WHA | DHA |
| Copa Uruguai (Uruguai) | ARE | PLM | COR | SOL | ROS | ROS | COL | ROS | ROS | PAL |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 47 | 47 | 4 | 58 | 58 |
| 2027/28 | 45 | 45 | 2 | 58 | 58 |
| 2028/29 | 45 | 45 | 2 | 58 | 58 |
| 2029/30 | 47 | 47 | 4 | 58 | 58 |
| 2030/31 | 46 | 46 | 3 | 58 | 58 |
| 2031/32 | 48 | 48 | 5 | 58 | 58 |
| 2032/33 | 43 | 43 | 0 | 58 | 58 |
| 2033/34 | 47 | 47 | 4 | 58 | 58 |
| 2034/35 | 45 | 45 | 2 | 58 | 58 |
| 2035/36 | 48 | 48 | 5 | 58 | 58 |

Detalhe (clube a clube) em cada página de época.
