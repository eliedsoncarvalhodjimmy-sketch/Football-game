# Prompt 4 — Paragem B: calibração do mercado (2 épocas, semente 2026)

> DADOS DE TESTE. Mundo completo sem interface, IA de mercado com nevoeiro de informação e scouting.

## 1. Resumo

| Medida | Valor | Faixa proposta |
|---|---|---|
| Negócios por janela (média, todas as ligas) | 806 | 1 500–4 000 |
| Transferências pagas / livres / empréstimos / cláusulas | 2120 / 679 / 378 / 47 | — |
| % livres e % empréstimos | 21% / 12% | 25–45% / 15–30% |
| Idade média dos transferidos (pagos) | 25.5 | 24–27 |
| Razão preço/valor (mediana; p5–p95) | 1.09 (0.89–1.61) | 0,6–2,5, extremos raros |
| Cláusulas activadas por época | 23.5 | 5–30 |
| Gasto total em transferências por época | 3633 M€ | — |

## 2. Gasto e saldo por liga (por época)

| Liga | Gasto | Receita | Saldo líquido | Entradas (todas) |
|---|---:|---:|---:|---:|
| ENG1 | 809 M€ | 160 M€ | -649 M€ | 70 |
| GER1 | 403 M€ | 142 M€ | -261 M€ | 48 |
| ESP1 | 388 M€ | 211 M€ | -177 M€ | 60 |
| ITA1 | 334 M€ | 134 M€ | -199 M€ | 64 |
| BRA1 | 200 M€ | 163 M€ | -37 M€ | 59 |
| FRA1 | 175 M€ | 213 M€ | 38 M€ | 51 |
| KSA1 | 123 M€ | 68 M€ | -55 M€ | 74 |
| TUR1 | 120 M€ | 115 M€ | -5 M€ | 64 |
| USA1 | 105 M€ | 83 M€ | -22 M€ | 77 |
| ENG2 | 102 M€ | 75 M€ | -27 M€ | 57 |
| POR1 | 92 M€ | 195 M€ | 103 M€ | 49 |
| NED1 | 67 M€ | 209 M€ | 142 M€ | 48 |
| MEX1 | 60 M€ | 70 M€ | 9 M€ | 44 |
| ARG1 | 60 M€ | 113 M€ | 53 M€ | 50 |
| BEL1 | 50 M€ | 166 M€ | 116 M€ | 45 |
| JPN1 | 44 M€ | 80 M€ | 36 M€ | 42 |
| GRE1 | 43 M€ | 137 M€ | 94 M€ | 30 |
| CZE1 | 39 M€ | 143 M€ | 103 M€ | 38 |
| GER2 | 37 M€ | 52 M€ | 15 M€ | 32 |
| SCO1 | 32 M€ | 78 M€ | 46 M€ | 32 |
| DEN1 | 32 M€ | 88 M€ | 56 M€ | 34 |
| ESP2 | 31 M€ | 28 M€ | -3 M€ | 34 |
| SUI1 | 28 M€ | 85 M€ | 57 M€ | 28 |
| ITA2 | 27 M€ | 40 M€ | 13 M€ | 29 |
| EUR1 | 26 M€ | 45 M€ | 19 M€ | 30 |

## 3. Histogramas

**Razão preço pago / valor (transferências pagas)** (2167)

```
       < 0.60 |  6
    0.60–0.80 | █ 23
    0.80–1.00 | ██████████████████ 463
    1.00–1.25 | ████████████████████████████████████████ 1042
    1.25–1.50 | █████████████████ 441
    1.50–2.00 | ███████ 178
    2.00–2.50 |  13
    2.50–4.00 |  1
       ≥ 4.00 |  0
```

**Idade dos transferidos (pagos)** (2167)

```
         < 19 | █ 17
        19–21 | ████████ 95
        21–23 | ██████████████████████ 271
        23–25 | ███████████████████████████████████ 434
        25–27 | ██████████████████████████████████ 426
        27–29 | ████████████████████████████████████████ 494
        29–31 | ███████████████████████████████████ 428
        31–33 |  2
         ≥ 33 |  0
```

**Preço das transferências pagas** (2167)

```
  < 250 mil € | ████ 81
250 mil €–1 M€ | ████████████████████████████████ 647
    1 M€–3 M€ | ████████████████████████████████████████ 816
   3 M€–10 M€ | ███████████████████████ 467
  10 M€–30 M€ | ███████ 142
  30 M€–60 M€ | █ 12
 60 M€–100 M€ |  1
     ≥ 100 M€ |  1
```

Negócios por janela: 2026-Verão 589, 2027-Inverno 319, 2027-Verão 839, 2028-Inverno 510, 2028-Verão 967.

## 4. Fluxos entre países (pagas + livres, por época)

| Origem \ destino | ENG | ITA | KSA | GER | ESP | FRA | BRA | TUR | USA | POR | JPN | NED | ARG | MEX |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ENG | 26 | 5 | 2 | 5 | 3 | 3 | 2 | 3 | 2 | 3 | 1 | · | · | · |
| ITA | 5 | 6 | 1 | 2 | 4 | 2 | 1 | · | · | 2 | 1 | · | 2 | · |
| KSA | 3 | 1 | 21 | 2 | · | · | 2 | · | · | 1 | · | · | · | 2 |
| GER | 5 | · | 2 | 11 | 5 | 3 | 3 | · | 2 | 2 | · | 4 | 1 | · |
| ESP | 7 | 3 | · | 4 | 7 | 3 | 2 | 2 | 1 | · | 1 | · | · | · |
| FRA | 8 | 6 | · | 4 | 6 | 9 | 2 | 2 | 3 | · | · | 2 | 1 | 2 |
| BRA | 5 | 4 | 2 | 1 | 3 | 2 | 3 | 2 | 2 | · | 1 | 1 | 2 | · |
| TUR | 2 | · | 2 | 5 | 2 | 2 | 3 | 5 | 3 | 3 | · | 2 | · | 1 |
| USA | 2 | 2 | 2 | 2 | 2 | · | 3 | · | 8 | · | · | · | 1 | 1 |
| POR | 6 | 2 | 2 | 2 | 5 | 6 | 2 | 8 | 2 | 8 | · | 2 | 2 | 2 |
| JPN | 3 | 2 | 3 | 1 | 2 | 3 | 1 | 2 | 3 | 1 | 5 | 2 | · | 1 |
| NED | 4 | 5 | 6 | 2 | 3 | 4 | 3 | 4 | 2 | 2 | 3 | 4 | · | · |
| ARG | 3 | 3 | · | 2 | 2 | 2 | 2 | · | 2 | · | · | · | 3 | · |
| MEX | 3 | 2 | 4 | 2 | · | · | 2 | 2 | · | · | 2 | · | 1 | 5 |

## 5. Comportamentos esperados (teste, não regra)

| Comportamento | Medida | Resultado |
|---|---|---|
| Brasil e Argentina exportam para a Europa | 79 de 123 saídas para a UEFA; vendas à Europa 228 M€/época | ✅ |
| Arábia compra estrelas de 28–33 | 51 de 110 compras ao estrangeiro com 28–33 anos; OVR médio 58 | ✅ |
| MLS compra veteranos | 20 de 125 entradas do estrangeiro com 30+ | ⚠️ |
| POR vende para ligas mais ricas | saldo com o estrangeiro 112 M€/época | ✅ |
| NED vende para ligas mais ricas | saldo com o estrangeiro 151 M€/época | ✅ |
| BEL vende para ligas mais ricas | saldo com o estrangeiro 121 M€/época | ✅ |

## 6. Nevoeiro: o que o Stourby City vê dos seus possíveis alvos (300 jogadores conhecidos; mostram-se os 12 de melhor OVR estimado entre os que a IA pode alvejar, com conhecimento ≥ 35%)

| Jogador | Clube (liga) | Idade | Conhecimento | OVR estimado (intervalo) | OVR real | Potencial estimado (intervalo) | Potencial real |
|---|---|---:|---:|---|---:|---|---:|
| Oliver Thornby | Ardmuir Academicals (SCO1) | 29 | 39% | 89 (78–99) | 87 | 87 (87–99) | 87 |
| Gonçalo Pinado | Atlético de Torre de Carvide (POR1) | 23 | 81% | 84 (80–88) | 86 | 89 (86–98) | 89 |
| Ozan Yıltekin | Yıldızderespor (TUR1) | 32 | 59% | 80 (74–86) | 75 | 78 (75–92) | 77 |
| Emre Özsoy | Demiryurtspor (TUR1) | 32 | 60% | 78 (72–84) | 75 | 77 (75–90) | 77 |
| Mert Özsoy | Yıldızderespor (TUR1) | 23 | 60% | 77 (71–83) | 72 | 81 (72–94) | 76 |
| Kyle Radson | Dalmore (SCO1) | 28 | 78% | 77 (72–82) | 73 | 78 (73–89) | 75 |
| Adam Novera | Ardmuir Academicals (SCO1) | 32 | 39% | 77 (66–88) | 77 | 77 (77–98) | 77 |
| Serkan Yılbaş | Kızılpınarspor (TUR1) | 29 | 62% | 76 (70–82) | 76 | 76 (76–89) | 77 |
| Marco Galone | Kinlin United (SCO1) | 21 | 36% | 75 (64–86) | 65 | 65 (65–86) | 80 |
| Can Taşbaş | Demiryurtspor (TUR1) | 23 | 64% | 74 (68–80) | 70 | 70 (70–83) | 77 |
| Filip Pederqvist | Kızılpınarspor (TUR1) | 29 | 60% | 73 (67–79) | 77 | 77 (77–90) | 77 |
| Anders Dahlson | Hedested IF (DEN1) | 29 | 36% | 73 (62–84) | 67 | 72 (67–93) | 67 |

## 7. Evolução do conhecimento de Gustavo Rosilho (20 anos, Atlético Pouso das Pedras) pelo Quendale Athletic em 10 semanas

Valores reais: OVR 74, potencial 99. Os scouts do clube passam a cobrir o Brasileirão; na semana 4 o clube pede um relatório (observação dedicada).

| Semana | Conhecimento | OVR (intervalo) | Potencial (intervalo) | Estrelas | Ocultos visíveis | Familiaridade com a liga |
|---:|---:|---|---|---|---|---:|
| 0 | 0% | 92 (69–99) | 86 (74–99) | 3.5–5 | não | 0.00 |
| 1 | 4% | 91 (70–99) | 87 (74–99) | 3.5–5 | não | 0.15 |
| 2 | 8% | 89 (70–99) | 88 (74–99) | 3.5–5 | não | 0.30 |
| 3 | 12% | 88 (71–99) | 89 (74–99) | 3.5–5 | não | 0.43 |
| 4 | 32% | 84 (71–97) | 91 (74–99) | 3.5–5 | não | 0.58 |
| 5 | 80% | 77 (73–81) | 95 (84–99) | 4–5 | sim | 0.73 |
| 6 | 82% | 77 (73–81) | 96 (87–99) | 4.5–5 | sim | 0.88 |
| 7 | 84% | 76 (73–79) | 96 (88–99) | 4.5–5 | sim | 1.00 |
| 8 | 86% | 76 (73–79) | 96 (88–99) | 4.5–5 | sim | 1.00 |
| 9 | 88% | 76 (73–79) | 97 (90–99) | 4.5–5 | sim | 1.00 |
| 10 | 89% | 76 (74–78) | 97 (90–99) | 4.5–5 | sim | 1.00 |

## 8. Benchmark (Node; tablet × 3 a 6)

| Medida | Valor | Alvo |
|---|---|---|
| Semana com alguma janela aberta (média / máx.) | 213 / 493 ms → tablet pior 2.96 s | < 5 s |
| Semana sem janelas abertas (média / máx.) | 141 / 316 ms → tablet pior 1.89 s | < 2 s |
| Semana de fecho de época (rollover; 4) (máx.) | 408 ms → tablet 2.45 s | ecrã de fim de época |
| Conhecimento guardado (scouting) | 11.3 MB | — |
