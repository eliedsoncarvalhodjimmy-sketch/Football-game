# Simulação de 10 épocas — semente 2026

> **DADOS DE TESTE.** Mundo fictício (51 ligas, 33 pacotes). Épocas 2026/27 a 2035/36. Uma página por época em [epocas/](epocas/), com todas as classificações finais.

## 1. Testes da secção 11

| Teste | Resultado | Valor | Alvo |
|---|:---:|---|---|
| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ✅ | 0 problemas em 10 passagens de época | 0 |
| Vagas continentais preenchidas, sem duplicados, só países com direito | ✅ | 0 problemas em 11 sorteios de vagas | 0 |
| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ✅ | 0 problemas em 174 340 jogos | 0 |
| Calibração, primeiros 10.000 jogos de liga | ✅ | 2.57 golos; casa 45.5%, empate 25.7%, fora 28.8%; 0-0 8.0%; 5+ 11.1%; 7+ 0.9% | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |
| Calibração, todos os jogos de liga (158 300) | ✅ | 2.59 golos; casa 45.1%, empate 26.0%, fora 29.0%; 0-0 7.7%; 5+ 11.7%; 7+ 0.8% | idem |
| Pontos do campeão (pontos por jogo) | ✅ | média 2.27; 92.5% dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |
| Pontos do último (pontos por jogo) | ✅ | média 0.64; 98.6% dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |
| Campeões diferentes por liga em 10 épocas | ✅ | média 4.6; 4 ligas com sempre o mesmo; 2 com sempre diferente | média 2,5–7; poucas nos extremos |
| Os mais fortes ganham mais, mas não sempre | ✅ | favorito (maior reputação no início) campeão em 58.2%; um dos 3 favoritos em 84.7% | 20–70%; top 3 ≥ 50% |
| Mobilidade entre divisões | ✅ | 488 subidas, 488 descidas, 670 saídas para o exterior, 670 entradas; 44.7% dos que sobem descem logo; 145 clubes subiram 2+ vezes | movimento em todos os sentidos |
| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ✅ | impressão digital ac01ab46 | iguais / diferentes |

### Desempenho (Node, esta máquina)

| Medida | Valor |
|---|---|
| Época completa do mundo (média / máx.) | 60 ms / 102 ms |
| Uma semana de calendário (média / p95 / máx.) | 1.2 ms / 2.0 ms / 42.3 ms |
| Memória (heap) no fim | 43 MB |
| Gravação por época (todos os jogos, gzip) | 139 KB (alvo ≤ 20 MB) |
| Jogos por época (todas as competições) | 17 434 |

Parâmetros do modo rápido: base 1.265, casa 1.17, gama 0.03, rho -0.05, empates ×1.13, goleadas ×0.6 acima de 5 golos.

## 2. Campeões por liga

| Liga | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 | Diferentes |
|---|---|---|---|---|---|---|---|---|---|---|---:|
| Liga Africana Unificada — Liga Africana | ADE | NGO | IKE | IKE | ADE | IKE | IKE | IKE | ADE | IKE | 3 |
| Argentina — Liga Profesional | CEI | CEI | CHA | CEI | CEI | CEI | CEI | CIB | MOR | ALA | 5 |
| Áustria — Bundesliga | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KIR | KRC | KIR | 2 |
| Bélgica — Pro League | BER | BER | BER | BER | MOL | MOL | BER | BER | BER | BER | 2 |
| Bélgica — Challenger Pro League | HRE | VRD | TRV | OOK | HRE | OOK | BRG | HOE | BRG | VRD | 6 |
| Brasil — Série A | PED | CAS | PDR | PDR | ANG | PED | PDR | PDR | CAS | ANG | 4 |
| Brasil — Série B | ANO | PAL | CSC | VNT | VES | PAL | CAO | PAL | BUR | PAL | 7 |
| Colômbia — Primera A | QUE | TAB | TAB | QUE | TAB | TAB | QUE | TAB | TAB | TAB | 2 |
| Croácia — HNL | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | ZAZ | 1 |
| Chéquia — 1. liga | LHN | POD | LHN | LUH | POD | POD | OST | OST | OST | POD | 4 |
| Dinamarca — Superliga | BRO | BRO | BRO | VES | BRO | BRO | BRO | BRO | BRO | BRO | 2 |
| Equador — LigaPro Serie A | ROS | TAB | TAB | TAB | TAB | TAB | ROS | TAB | TAB | TAB | 2 |
| Inglaterra — Premier League | BRA | CAR | CAR | BRA | CAR | BRA | QUE | CAR | CAR | CAR | 3 |
| Inglaterra — Championship | FAL | STM | MAR | DNC | TER | RAD | YAR | GRI | TER | NET | 9 |
| Inglaterra — League One | DUY | GIM | TOR | LAN | KEL | STT | DUY | LAN | THR | WIT | 8 |
| Inglaterra — League Two | MOR | DUE | MAK | CAE | NED | LNG | AHH | CAK | SEL | MRL | 10 |
| Espanha — Primera División | OLM | OLM | OLM | OLM | OLM | OLM | OLM | OLM | OLM | OLM | 1 |
| Espanha — Segunda División | HIA | SLA | HNO | MNM | TRR | HNO | GUA | PRA | TAR | ACO | 9 |
| França — Ligue 1 | FNT | FON | FON | FNT | FON | FON | FON | FON | FON | FON | 2 |
| França — Ligue 2 | PES | PIS | MRF | PES | FDE | BAU | PES | FUN | MRF | BAU | 6 |
| França — Ligue 3 | MOE | SAT | PLA | SRT | VAL | VID | VIS | SRT | PLB | PIS | 9 |
| Alemanha — Bundesliga | MUH | STE | STE | STE | MUH | MHL | MUH | STE | STE | MHL | 3 |
| Alemanha — 2. Bundesliga | MUD | NEU | MUD | HAS | HHE | ALT | ZLL | GAL | HHE | EIC | 8 |
| Alemanha — 3. Liga | BUK | STN | RHE | ZED | HAG | NUB | GRG | WEN | ZED | BUK | 8 |
| Grécia — Super League | KAL | ORI | ORI | ORI | ORI | ORI | ORI | ORI | ORI | ORI | 2 |
| Hungria — NB I | HEG | SZE | SZE | SZE | SZE | SZE | HEG | TIS | HEG | SZE | 3 |
| Itália — Serie A | CAS | CAS | CAS | TOR | CAS | CAS | CAS | CAS | TOR | CAS | 2 |
| Itália — Serie B | PGG | FOO | VLC | FCO | PON | BOR | TOO | BOR | VEC | TOA | 9 |
| Japão — J1 League | HOS | HOS | SAK | HOS | MAT | MAT | MAT | MAT | MAT | MAT | 3 |
| Japão — J2 League | TKA | HAN | NAO | HAA | HAI | KII | YNO | NAG | NGA | KNI | 10 |
| Coreia do Sul — K League 1 | DAE | DEC | JIN | GYE | JIN | DAE | DAE | NAM | DAE | DAE | 5 |
| Arábia Saudita — Pro League | SID | SID | SID | SID | THU | SID | SID | SID | SID | SID | 2 |
| Arábia Saudita — First Division | SHI | MAN | SAR | FAI | MAN | BRQ | DAF | MAN | BAA | RYY | 8 |
| México — Liga MX | POR | POR | PRT | POR | POR | SOL | POR | POR | POR | POR | 3 |
| Países Baixos — Eredivisie | GRO | GRO | GRO | GRO | GRO | GRO | GRO | GRO | GRO | GRO | 1 |
| Países Baixos — Eerste Divisie | LDE | RJS | GRN | GOD | GRN | EEM | EMD | OUD | GRN | ALK | 8 |
| Noruega — Eliteserien | ASV | LIE | LIE | ASV | ASV | LIE | ASV | ASV | ASV | LIE | 2 |
| Polónia — Ekstraklasa | GRO | MIS | MIS | SAW | MIS | STA | GRO | PIA | GRO | RAK | 6 |
| Portugal — 1.ª Liga | CAR | CAR | CAR | ALV | CAR | CAR | CAR | CAR | CAR | CAR | 2 |
| Portugal — 2.ª Liga | VAE | LES | VLE | PEN | MAA | FRO | AVA | OTE | MRV | FRO | 9 |
| Portugal — Liga 3 | RLO | COR | COA | REO | FNT | LOA | COA | LOA | CAA | LGO | 8 |
| Escócia — Premiership | ARD | ARD | ARD | ARD | ARD | ARD | ARD | ARD | ARD | ARD | 1 |
| Escócia — Championship | DAN | BLM | DLN | GLE | DAN | DLA | TOR | BAL | DLA | INV | 8 |
| Suíça — Super League | KIR | KIR | BER | KIR | KIR | KIR | KIR | KIR | BER | KIR | 2 |
| Suécia — Allsvenskan | HOL | LIN | HOL | LIN | LIN | LIN | LIN | ALS | ALS | AKE | 4 |
| Turquia — Süper Lig | CAM | CAM | CAM | CAM | TAS | TAS | TAS | TAS | CAM | CAM | 2 |
| Turquia — 1. Lig | APN | SDE | KLY | GKB | GLH | KLY | TSD | YLR | APN | TSB | 8 |
| Emirados Árabes Unidos — Pro League | DHA | DHA | DHA | THU | DHA | DHA | DHA | DHA | DHA | DHA | 2 |
| Ucrânia — Premier Liha | KAM | KAM | KRA | LYS | KAM | KRA | KRA | KRA | LYS | LYS | 3 |
| Uruguai — Primera División | ROS | ROS | ROS | ROS | ROS | PAL | ROS | PAL | PAL | PAL | 2 |
| MLS (EUA/Canadá) — MLS | SIL | FAL | SIL | MAP | SIL | BAY | FAL | CED | BAY | BAY | 5 |

Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina, MLS): campeão = vencedor do play-off.

## 3. Pontos do campeão e do último

| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |
|---|---:|---|---|
| Liga Africana Unificada — Liga Africana | 46 | 108.0 / 97 / 119 | 30.0 / 15 / 43 |
| Argentina — Liga Profesional | 29 | 73.7 / 67 / 84 | 14.5 / 4 / 22 |
| Áustria — Bundesliga | 22 | 52.9 / 46 / 58 | 13.5 / 7 / 21 |
| Bélgica — Pro League | 34 | 82.2 / 73 / 92 | 22.6 / 18 / 30 |
| Bélgica — Challenger Pro League | 30 | 63.3 / 55 / 72 | 20.4 / 12 / 29 |
| Brasil — Série A | 38 | 85.9 / 79 / 99 | 20.5 / 6 / 32 |
| Brasil — Série B | 38 | 85.1 / 72 / 93 | 27.0 / 23 / 33 |
| Colômbia — Primera A | 38 | 85.4 / 81 / 94 | 25.8 / 21 / 31 |
| Croácia — HNL | 18 | 45.0 / 41 / 52 | 7.7 / 3 / 12 |
| Chéquia — 1. liga | 30 | 63.0 / 56 / 70 | 15.8 / 9 / 22 |
| Dinamarca — Superliga | 22 | 50.6 / 41 / 57 | 14.0 / 6 / 19 |
| Equador — LigaPro Serie A | 30 | 68.3 / 62 / 75 | 19.8 / 15 / 25 |
| Inglaterra — Premier League | 38 | 93.0 / 79 / 106 | 18.9 / 10 / 29 |
| Inglaterra — Championship | 46 | 96.0 / 84 / 101 | 33.2 / 21 / 40 |
| Inglaterra — League One | 46 | 92.8 / 80 / 106 | 35.4 / 28 / 41 |
| Inglaterra — League Two | 46 | 88.5 / 84 / 98 | 35.1 / 20 / 46 |
| Espanha — Primera División | 38 | 96.2 / 88 / 108 | 23.5 / 15 / 27 |
| Espanha — Segunda División | 42 | 91.0 / 77 / 104 | 30.8 / 24 / 40 |
| França — Ligue 1 | 34 | 87.2 / 82 / 95 | 17.7 / 5 / 27 |
| França — Ligue 2 | 34 | 69.8 / 65 / 74 | 23.2 / 17 / 31 |
| França — Ligue 3 | 34 | 67.7 / 63 / 73 | 25.4 / 14 / 34 |
| Alemanha — Bundesliga | 34 | 80.4 / 71 / 93 | 19.6 / 11 / 28 |
| Alemanha — 2. Bundesliga | 34 | 72.2 / 65 / 84 | 24.7 / 18 / 31 |
| Alemanha — 3. Liga | 38 | 77.1 / 73 / 87 | 27.8 / 22 / 33 |
| Grécia — Super League | 26 | 64.1 / 61 / 69 | 15.8 / 8 / 25 |
| Hungria — NB I | 22 | 51.7 / 44 / 57 | 12.6 / 9 / 17 |
| Itália — Serie A | 38 | 98.9 / 89 / 107 | 19.8 / 11 / 27 |
| Itália — Serie B | 38 | 84.9 / 72 / 97 | 25.7 / 19 / 33 |
| Japão — J1 League | 38 | 79.6 / 68 / 86 | 28.3 / 17 / 33 |
| Japão — J2 League | 38 | 79.2 / 65 / 92 | 26.8 / 20 / 33 |
| Coreia do Sul — K League 1 | 26 | 55.0 / 47 / 61 | 17.3 / 11 / 26 |
| Arábia Saudita — Pro League | 34 | 88.1 / 78 / 94 | 19.7 / 8 / 27 |
| Arábia Saudita — First Division | 34 | 75.4 / 57 / 89 | 24.9 / 18 / 34 |
| México — Liga MX | 34 | 78.7 / 64 / 86 | 24.3 / 18 / 33 |
| Países Baixos — Eredivisie | 34 | 86.7 / 78 / 96 | 21.1 / 16 / 26 |
| Países Baixos — Eerste Divisie | 38 | 77.7 / 70 / 85 | 30.0 / 25 / 37 |
| Noruega — Eliteserien | 30 | 69.6 / 61 / 81 | 19.7 / 16 / 24 |
| Polónia — Ekstraklasa | 34 | 70.1 / 61 / 78 | 20.2 / 14 / 28 |
| Portugal — 1.ª Liga | 34 | 87.6 / 79 / 96 | 21.9 / 16 / 27 |
| Portugal — 2.ª Liga | 34 | 68.2 / 60 / 77 | 27.0 / 23 / 32 |
| Portugal — Liga 3 | 38 | 79.4 / 75 / 85 | 26.8 / 19 / 33 |
| Escócia — Premiership | 22 | 55.9 / 50 / 63 | 12.2 / 9 / 17 |
| Escócia — Championship | 18 | 36.9 / 29 / 44 | 12.9 / 8 / 18 |
| Suíça — Super League | 22 | 51.8 / 45 / 61 | 15.9 / 11 / 21 |
| Suécia — Allsvenskan | 30 | 66.3 / 58 / 78 | 16.7 / 11 / 27 |
| Turquia — Süper Lig | 34 | 84.6 / 80 / 94 | 21.9 / 15 / 26 |
| Turquia — 1. Lig | 38 | 80.4 / 71 / 90 | 24.7 / 16 / 31 |
| Emirados Árabes Unidos — Pro League | 26 | 57.4 / 48 / 65 | 15.2 / 10 / 23 |
| Ucrânia — Premier Liha | 30 | 71.7 / 63 / 82 | 15.7 / 8 / 26 |
| Uruguai — Primera División | 30 | 74.1 / 68 / 83 | 16.8 / 7 / 23 |
| MLS (EUA/Canadá) — MLS | 29 | 63.5 / 55 / 73 | 19.2 / 13 / 23 |

## 4. Competições continentais

| Época | Competição | Vencedor | Finalista | Final |
|---|---|---|---|---|
| 2026/27 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ain Thuraya Club (KSA) | 5-0 |
| 2026/27 | Libertadores | Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 3-2 |
| 2026/27 | Liga dos Campeões | AS Fonteville (FRA) | FC Casteldorato (ITA) | 0-1 |
| 2026/27 | Liga Conferência | Fontemarino Calcio (ITA) | Caldale Albion (ENG) | 1-0 |
| 2026/27 | Liga Europa | Brombury United (ENG) | Poggiovecchio Calcio (ITA) | 1-0 |
| 2027/28 | Liga dos Campeões Asiática | Daecheon Hawks (KOR) | Al Sidra Club (KSA) | 1-2 |
| 2027/28 | Libertadores | Rio do Angico Futebol Clube (BRA) | Unión de Puerto Ceibos (ARG) | 0-1 |
| 2027/28 | Liga dos Campeões | FC Casteldorato (ITA) | Brackcombe Town (ENG) | 0-2 |
| 2027/28 | Liga Conferência | Virtus Casteldorato (ITA) | FC Tannfeld (GER) | 0-1 |
| 2027/28 | Liga Europa | TSV Tannau (GER) | Olmevega CF (ESP) | 1-2 |
| 2028/29 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Al Sidra Club (KSA) | 1-2 |
| 2028/29 | Libertadores | Deportivo Río Rosario Alto (URU) | Esporte Clube Ribeirão da Cascata (BRA) | 1-2 |
| 2028/29 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 3-2 |
| 2028/29 | Liga Conferência | Grupo Desportivo de Azenha de Rebordelo (POR) | Brombury United (ENG) | 0-1 |
| 2028/29 | Liga Europa | Hathercombe United (ENG) | SC Zelltal (GER) | 0-1 |
| 2029/30 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Ain Thuraya FC (KSA) | 4-0 |
| 2029/30 | Libertadores | Unión de Colonia Alamos (ARG) | Atlético Pouso das Pedras (BRA) | 1-3 (a.p.) |
| 2029/30 | Liga dos Campeões | Carnley Albion (ENG) | Brackcombe Town (ENG) | 2-0 (a.p.) |
| 2029/30 | Liga Conferência | Brombury United (ENG) | Alderdrecht Boys (NED) | 4-1 |
| 2029/30 | Liga Europa | Quendale Athletic (ENG) | SC Zelltal (GER) | 0-1 |
| 2030/31 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 4-2 |
| 2030/31 | Libertadores | Esporte Clube Ribeirão da Cascata (BRA) | Unión de Puerto Ceibos (ARG) | 1-1 (a.p.) 4-2 g.p. |
| 2030/31 | Liga dos Campeões | CF Alcormonte (ESP) | Brackcombe Town (ENG) | 2-3 (a.p.) |
| 2030/31 | Liga Conferência | Alderdrecht Boys (NED) | AC Fontebello (ITA) | 2-0 |
| 2030/31 | Liga Europa | SV Mühlwangen (GER) | Brombury United (ENG) | 2-1 |
| 2031/32 | Liga dos Campeões Asiática | Daesan Dragons (KOR) | Ras Rayyan Sharq FC (KSA) | 0-1 |
| 2031/32 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Grêmio Campo do Cajueiro (BRA) | 2-1 |
| 2031/32 | Liga dos Campeões | Brackcombe Town (ENG) | AS Fonteville (FRA) | 1-5 |
| 2031/32 | Liga Conferência | Eintracht Grüntal (GER) | Monvega CF (ESP) | 2-1 |
| 2031/32 | Liga Europa | FC Bergville (BEL) | AC Valfiore (ITA) | 0-2 |
| 2032/33 | Liga dos Campeões Asiática | Al Sidra Club (KSA) | Matsuno FC (JPN) | 3-0 |
| 2032/33 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Club Atlético Coronel Arroyito (ARG) | 1-0 |
| 2032/33 | Liga dos Campeões | Brackcombe Town (ENG) | Carnley Albion (ENG) | 1-2 |
| 2032/33 | Liga Conferência | Hathercombe United (ENG) | Fontemarino Calcio (ITA) | 1-0 |
| 2032/33 | Liga Europa | CF Alcormonte (ESP) | FC Bergville (BEL) | 2-1 |
| 2033/34 | Liga dos Campeões Asiática | Matsuno FC (JPN) | Al Sidra Club (KSA) | 1-2 (a.p.) |
| 2033/34 | Libertadores | Clube Atlético Pouso das Pedras (BRA) | Grêmio Campo do Cajueiro (BRA) | 0-2 |
| 2033/34 | Liga dos Campeões | Carnley Albion (ENG) | Quendale Athletic (ENG) | 2-0 |
| 2033/34 | Liga Conferência | Netherenwick Athletic (ENG) | Alderdrecht Boys (NED) | 0-2 |
| 2033/34 | Liga Europa | Torrefranco Calcio (ITA) | Real Riberrada (ESP) | 2-2 (a.p.) 4-5 g.p. |
| 2034/35 | Liga dos Campeões Asiática | Ain Thuraya Club (KSA) | Al Sidra Club (KSA) | 2-0 |
| 2034/35 | Libertadores | Ferro Paso Moreira (ARG) | Juventud Cerro Tablada (COL) | 1-0 |
| 2034/35 | Liga dos Campeões | Quendale Athletic (ENG) | FC Casteldorato (ITA) | 3-2 |
| 2034/35 | Liga Conferência | Stourmercombe City (ENG) | Atlético Hinovega (ESP) | 2-0 |
| 2034/35 | Liga Europa | Brombury United (ENG) | AC Valfiore (ITA) | 5-2 (a.p.) |
| 2035/36 | Liga dos Campeões Asiática | Wadi Dhafra Club (KSA) | Daepyeong FC (KOR) | 4-0 |
| 2035/36 | Libertadores | Rio do Angico Futebol Clube (BRA) | Serra do Sertão Futebol Clube (BRA) | 2-1 |
| 2035/36 | Liga dos Campeões | Carnley Albion (ENG) | Olmedosa CF (ESP) | 1-0 (a.p.) |
| 2035/36 | Liga Conferência | Hathercombe United (ENG) | Eintracht Altenhausen (GER) | 0-1 (a.p.) |
| 2035/36 | Liga Europa | Clube Desportivo de Serra do Freixo (POR) | Dunbury Wanderers (ENG) | 0-2 |

Títulos por país: Liga dos Campeões Asiática — KSA: 7; Libertadores — BRA: 7; Liga dos Campeões — ENG: 7; Liga Conferência — ENG: 5; Liga Europa — ENG: 4; Liga Conferência — ITA: 2; Liga dos Campeões Asiática — KOR: 2; Liga Europa — GER: 2; Libertadores — ARG: 2; Liga dos Campeões — FRA: 1; Liga dos Campeões — ITA: 1; Libertadores — URU: 1; Liga Conferência — POR: 1; Liga dos Campeões — ESP: 1; Liga Conferência — NED: 1; Liga Conferência — GER: 1; Liga Europa — BEL: 1; Liga Europa — ESP: 1; Liga dos Campeões Asiática — JPN: 1; Liga Europa — ITA: 1; Liga Europa — POR: 1.

## 5. Taças nacionais (vencedores)

| País | 2026/27 | 2027/28 | 2028/29 | 2029/30 | 2030/31 | 2031/32 | 2032/33 | 2033/34 | 2034/35 | 2035/36 |
|---|---|---|---|---|---|---|---|---|---|---|
| Argentina | CHA | CEI | CEI | BEL | CAN | ALA | QUI | MOR | CEI | MRE |
| Áustria | KIR | KIR | KIR | HAS | DOR | DOR | HAS | KRC | KIR | KIR |
| Bélgica | BER | OOE | BER | BER | MOL | WES | BER | BER | HER | BER |
| Brasil | ANG | PED | ANG | VEN | PED | ANG | ANG | CAS | ANG | PDR |
| Colômbia | TAB | QUE | TAB | LUC | QUE | TAB | QUE | QUE | ESP | TAB |
| Croácia | ZAZ | SLA | VIK | SLA | ZAZ | BRE | BEP | VIK | ZAZ | VIK |
| Chéquia | LUH | LUH | POD | LHN | SLA | LUH | LHN | RYC | STR | PDS |
| Dinamarca | VES | HED | BRO | BRO | LUN | BRO | VES | BRO | LUN | BRO |
| Equador | TAB | TAB | COR | ROS | ROS | TAB | ROS | TAB | MIB | CUM |
| Inglaterra | HAT | BRA | BRA | DUN | BRA | CAR | BRA | STY | STO | CAR |
| Espanha | RIB | MIR | OLM | OLM | OLM | OLM | MIR | OME | OLM | ALC |
| França | FNT | FNT | MON | FON | FNT | FNT | FON | FON | FON | FNT |
| Alemanha | MUH | MUH | MHL | MUH | MUH | GRU | MHL | MHL | MHL | STE |
| Grécia | THA | KAS | ORI | KAL | ORI | ORI | KAL | KAL | KAL | KAL |
| Hungria | HEG | SZE | HEG | SZE | BAL | SZE | SZE | HEG | HEG | HGY |
| Itália | CAS | CAS | TOR | CAS | CAS | CAS | FON | CAS | TOR | TOR |
| Japão | ISH | MAT | SAK | HAI | KII | ISH | MAT | KII | MAT | SAK |
| Coreia do Sul | DAE | JNW | JIN | DAE | GEO | GYE | NAM | DAE | DAE | GEO |
| Arábia Saudita | RAY | THU | THU | SID | SID | SID | THU | SID | RAY | TUR |
| México | AGU | POR | ALA | POR | TAB | SOL | POR | ALA | PRT | FLO |
| Países Baixos | GRO | GRO | GRO | ADE | GRO | RIJ | GRO | GRO | ADE | GRO |
| Noruega | STR | ASV | NOR | FJE | LIE | LIE | ASV | LIE | STD | LIE |
| Polónia | PIA | PIA | STA | STA | GRO | RAK | MIS | RKO | PAR | MIS |
| Portugal | CAR | ALV | CAR | ALV | CAR | ALV | ALV | CAR | CAR | ALV |
| Escócia | CRA | ARD | ARD | ARD | ARD | ARD | ARD | DAL | ARD | DAL |
| Suíça | KIR | KIR | BED | DOR | KIR | BRN | KIR | KIR | BER | NEU |
| Suécia | AKE | LIN | GRA | LIN | ASU | AKE | BJO | LIN | LIN | BJO |
| Turquia | CAM | CAM | DEM | TAS | GOL | YDZ | TAS | TAS | TAS | GOL |
| Emirados Árabes Unidos | QAM | DHA | THU | THU | THU | RIM | DHA | RIM | WHA | DHA |
| Ucrânia | KRA | LSY | KAM | LYL | KAM | KRA | KAM | KAM | KRA | LYS |
| Uruguai | ROS | ROS | ROS | ROS | CMB | ROS | COL | PAL | ROS | PAL |
| MLS (EUA/Canadá) | BAY | FAL | BAY | COP | CED | FAL | PIN | FAN | FLC | FAN |

## 6. Subidas, descidas e exterior por época

| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |
|---|---:|---:|---:|---:|---:|
| 2026/27 | 47 | 47 | 1 | 67 | 67 |
| 2027/28 | 48 | 48 | 2 | 67 | 67 |
| 2028/29 | 51 | 51 | 5 | 67 | 67 |
| 2029/30 | 49 | 49 | 3 | 67 | 67 |
| 2030/31 | 49 | 49 | 3 | 67 | 67 |
| 2031/32 | 47 | 47 | 1 | 67 | 67 |
| 2032/33 | 49 | 49 | 3 | 67 | 67 |
| 2033/34 | 49 | 49 | 3 | 67 | 67 |
| 2034/35 | 49 | 49 | 3 | 67 | 67 |
| 2035/36 | 50 | 50 | 4 | 67 | 67 |

Detalhe (clube a clube) em cada página de época.
