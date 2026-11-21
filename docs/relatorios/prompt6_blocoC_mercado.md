# Prompt 6, Bloco C — estrelas, veteranos e preços (calibração do mercado)

> DADOS DE TESTE. Mundo completo sem interface, semente 2026, 2 épocas (`npx tsx scripts/calibrar-mercado.ts 2 2026 <ficheiro>`), e regressão de 12 sementes × 10 épocas (`scripts/regressao-sementes.ts`). Inclui os valores realistas (pedido do utilizador) e a versão final do mercado (variante D com a Arábia até 31).

## 1. Antes e depois (2 épocas, semente 2026)

| Medida | Antes do Bloco C | Depois | Faixa proposta (a validar) |
|---|---|---|---|
| Transferências pagas de jogadores com 31+ anos | 0 de 1605 | 118 de 1719 (6,9%) | 5–10% das pagas |
| Arábia: compras ao estrangeiro de jogadores com 28–33 anos | 22 de 74 ⚠️ | 34 de 80 ✅ | ≥ 40% |
| MLS: entradas do estrangeiro com 30+ anos | 24 de 151 ⚠️ | 67 de 177 ✅ | ≥ 30% |
| Transferências de 60 M€ ou mais (2 épocas) | 2 | 4 | 1–4 por época |
| Transferências de 100 M€ ou mais (2 épocas) | 0 | 0 | 0–2 por época |
| Razão preço pago / valor: mediana (p5–p95) | 1,07 (0,82–1,69) | 1,05 (0,73–1,70) | p5 ≤ 0,8 e p95 ≥ 1,6; fora de 0,6–2,5 ≤ 3% |
| Negócios por janela de Inverno (2027 / 2028) | 518 / 787 | 476 / 884 | 25–45% do Verão |
| Gasto em transferências por época | 2803 M€ | 3060 M€ | — |
| Semana com janela aberta, média / máx. | 349 / 689 ms | 312 / 546 ms | tablet < 5 s |
| Semana sem janelas, média / máx. | 255 / 398 ms | 206 / 299 ms | tablet < 2 s |

## 2. Valores de mercado (pedido do utilizador: como no Transfermarkt)

No mundo de teste, no início, com as mesmas regras de valor:

| Medida | Antes | Depois |
|---|---|---|
| Jogador mais valioso | 487 M€ | 199 M€ |
| 2.º e 3.º | 395 e 368 M€ | 171 e 163 M€ |
| Jogadores com 200 M€ ou mais | 45 | 0 |
| Jogadores com 150 M€ ou mais | 79 | 7 |
| Jogadores com 100 M€ ou mais | 143 | 49 |
| Jogadores com 50 M€ ou mais | 371 | 216 |
| Jogadores com 20 M€ ou mais | 938 | 938 |

- Acima de 20 M€ o valor cresce como (v / 20 M€)^0,72. Abaixo de 20 M€ nada muda.
- Tecto de 200 M€; só os 3 mais valiosos do mundo (recalculados todos os meses) podem ir até 300 M€.
- O preço pedido nunca passa os 300 M€ (a cláusula de rescisão é à parte).
- **Poucos podem pagar:** num só negócio, nenhum clube paga mais de 40% da sua receita. Com receitas máximas de cerca de 550 M€, só os maiores clubes de Inglaterra chegam perto de 200 M€.

## 3. Regressão de 12 sementes (10 épocas cada; decisão do utilizador: médias de 12 sementes)

```
3 | 3.25 / 2 | 0 | 17% | 3/10 | 4/10 | [4, 4, 3, 5, 2, 2, 3, 3]
5 | 4.25 / 3 | 0 | 30% | 2/10 | 6/10 | [4, 4, 5, 4, 4, 3, 5, 5]
7 | 3.38 / 2 | 0 | 17% | 7/10 | 8/10 | [3, 5, 4, 4, 4, 3, 2, 2]
11 | 4.00 / 2 | 0 | 33% | 6/10 | 7/10 | [6, 4, 4, 4, 4, 3, 2, 5]
13 | 3.88 / 2 | 0 | 20% | 7/10 | 6/10 | [5, 4, 4, 4, 2, 4, 4, 4]
23 | 3.12 / 2 | 0 | 43% | 9/10 | 4/10 | [3, 2, 4, 4, 3, 3, 4, 2]
31 | 4.12 / 2 | 0 | 30% | 5/10 | 9/10 | [6, 6, 6, 3, 4, 3, 3, 2]
42 | 3.88 / 2 | 0 | 30% | 4/10 | 8/10 | [6, 5, 3, 5, 3, 4, 3, 2]
77 | 3.50 / 2 | 0 | 33% | 6/10 | 6/10 | [6, 5, 4, 2, 3, 2, 2, 4]
99 | 3.75 / 3 | 0 | 43% | 3/10 | 5/10 | [5, 4, 3, 5, 4, 3, 3, 3]
123 | 4.25 / 2 | 0 | 40% | 3/10 | 8/10 | [5, 6, 5, 5, 2, 3, 3, 5]
2026 | 3.88 / 2 | 0 | 33% | 5/10 | 9/10 | [5, 5, 3, 5, 2, 4, 3, 4]
média | 3.77 | 0.00 | 30.8% | 5.0 | 6.7 | todas as ligas 5.54

```

Alvos: campeões distintos nas 8 maiores ligas em média ≥ 3 e nenhuma 10/10; Inglaterra 30–40% dos títulos europeus; Arábia 3–5 dos 10 títulos asiáticos.

| Variante (12 sementes, salvo indicação) | Arábia (asiáticos) | Inglaterra (europeus) |
|---|---|---|
| Bloco C inicial, valores antigos (6 sementes) | 6,2 | 38,9% |
| Valores novos (6 sementes) | 5,8 | 28,3% |
| D: estrela só em ligas com riqueza ≥ 40; Arábia até 32 | 5,6 | 31,1% |
| X: D + a idade da liga manda (sem bónus de candidato ao título); Arábia até 32 | 5,7 | 29,4% |
| Y: X com a Arábia e os Emirados até 31 | 5,1 | 33,3% |
| Y + o rho do motor −0,01 + quem luta pela permanência não vende titulares | 4,9 | 32,2% |
| Poder de compra solto (grandes ligas 0,25/0,6, escalão médio 0,15/0,45) | 5,5 | 27,2% |
| **Final: poder de compra por liga (Q, entrada 200 do DECISIONS)** | **5,0** | **30,8%** |

- A tabela de cima é a versão final. Mesmo com 12 sementes, a média da Arábia varia cerca de meio título só por acaso.
- Na versão final, nenhuma das 12 sementes tem uma liga com o mesmo campeão nas 10 épocas (antes do Prompt 6 acontecia em 2 das 6 sementes antigas).

## 4. Bandas antigas das 10 épocas (decisão do utilizador: 3 sementes, 2026 + 7 + 11)

| Medida | Antes do ajuste do motor | rho −0,01 | Final (+ permanência) | Faixa |
|---|---|---|---|---|
| Golos por jogo | 2,543 | 2,545 | 2,543 | 2,5–2,7 |
| Vitórias em casa | 45,2% | 45,2% | 45,3% | 43–47% |
| Empates | 25,0% | 24,8% | 24,8% | 24–28% |
| 0–0 | 8,51% | 8,35% | 8,39% | 6,5–8,5% |
| 5 ou mais golos | 11,8% | 11,9% | 11,8% | 9,5–12,5% |
| 7 ou mais golos | 1,0% | 1,0% | 1,0% | < 1,5% |
| Campeões com 1,9–2,85 pontos por jogo | — | 91,4% | 92,8% | ≥ 90% |
| Últimos com 0,25–1,15 pontos por jogo | — | 89,4% | 90,9% | ≥ 90% → ≥ 88% (decisão do utilizador) |

Com o poder de compra final (secção 4b), os últimos ficam em 88,9% dentro (mínimo novo de 88%).

## 4b. Negócios de elite por liga (pedido do utilizador; decisão: a meio caminho dos valores reais, sem crises)

Dados reais do Verão de 2026 (utilizador): Premier League 4 112 M€; Itália 1 163; Alemanha 784; Espanha 755; França 607; 35 transferências de 50 M€ ou mais (29 inglesas); 6 acima de 100 M€; o maior gasto de um clube numa janela foi 526 M€. Mundo de teste, versão final (2 épocas, semente 2026):


| Medida | Valor | Faixa proposta |
|---|---|---|
| Negócios por janela (média, todas as ligas) | 1718 | emergente (necessidade, vontade do jogador, dinheiro) |
| Transferências pagas / livres / empréstimos / cláusulas | 1324 / 4361 / 1157 / 30 | — |
| % livres e % empréstimos | 63% / 17% | emergente |
| Idade média dos transferidos (pagos) | 25.1 | 24–27 |
| Razão preço/valor (mediana; p5–p95) | 1.07 (0.75–1.65) | 0,6–2,5, extremos raros |
| Cláusulas activadas por época | 15.0 | 5–30 |
| Gasto total em transferências por época | 3470 M€ | — |
| Transferências ≥ 50 / ≥ 60 / ≥ 100 M€ por época | 9.0 / 4.5 / 0.0 | 25–45 / — / 3–8 |
| Parte das ≥ 50 M€ compradas por clubes da ENG1 | 72% | ≥ 70% |
| Maior transferência | 89 M€ | ≤ 200 M€ |
| Maior gasto de um clube numa janela | Stourby City 122 M€; Hathercombe United 119 M€; Brombury United 108 M€ | 300–550 M€ |
| Clubes em crise ou administração (início → fim) | ENG1 0/20 → 0/20; ESP1 0/20 → 0/20; ITA1 0/20 → 0/20; GER1 0/18 → 1/18; FRA1 0/18 → 0/18; POR1 0/18 → 0/18; KSA1 0/18 → 0/18; BRA1 0/20 → 0/20 | sem subida grande |
| Dívida (banco + parcelas) por liga (início → fim) | ENG1 1018 M€ → 1690 M€; ESP1 686 M€ → 476 M€; ITA1 449 M€ → 379 M€; GER1 597 M€ → 532 M€; FRA1 413 M€ → 118 M€ | — |


Gasto por liga (por época):


| Liga | Gasto | Receita | Saldo líquido | Entradas (todas) |
|---|---:|---:|---:|---:|
| ENG1 | 1275 M€ | 257 M€ | -1017 M€ | 80 |
| ESP1 | 429 M€ | 263 M€ | -166 M€ | 66 |
| ITA1 | 383 M€ | 258 M€ | -126 M€ | 71 |
| GER1 | 332 M€ | 186 M€ | -147 M€ | 64 |
| FRA1 | 139 M€ | 365 M€ | 225 M€ | 68 |
| KSA1 | 107 M€ | 42 M€ | -65 M€ | 63 |
| TUR1 | 74 M€ | 71 M€ | -3 M€ | 97 |
| POR1 | 71 M€ | 171 M€ | 100 M€ | 80 |
| USA1 | 62 M€ | 51 M€ | -10 M€ | 85 |
| BRA1 | 52 M€ | 157 M€ | 105 M€ | 41 |
| NED1 | 49 M€ | 143 M€ | 94 M€ | 77 |
| ENG2 | 47 M€ | 83 M€ | 37 M€ | 122 |
| SCO1 | 42 M€ | 97 M€ | 55 M€ | 50 |
| MEX1 | 42 M€ | 52 M€ | 10 M€ | 64 |
| ESP2 | 33 M€ | 45 M€ | 12 M€ | 97 |
| BEL1 | 30 M€ | 147 M€ | 116 M€ | 83 |
| ARG1 | 29 M€ | 127 M€ | 98 M€ | 61 |
| JPN1 | 28 M€ | 54 M€ | 26 M€ | 74 |
| DEN1 | 22 M€ | 67 M€ | 45 M€ | 56 |
| GRE1 | 21 M€ | 109 M€ | 88 M€ | 49 |
| SUI1 | 21 M€ | 85 M€ | 64 M€ | 42 |
| GER2 | 18 M€ | 22 M€ | 4 M€ | 83 |
| ITA2 | 17 M€ | 12 M€ | -5 M€ | 80 |
| POL1 | 16 M€ | 69 M€ | 53 M€ | 70 |
| EUR1 | 15 M€ | 43 M€ | 28 M€ | 67 |


## 5. Calibração completa (versão final, 2 épocas)

> DADOS DE TESTE. Mundo completo sem interface, IA de mercado com nevoeiro de informação e scouting.

### 5.1. Resumo

| Medida | Valor | Faixa proposta |
|---|---|---|
| Negócios por janela (média, todas as ligas) | 1815 | emergente (necessidade, vontade do jogador, dinheiro) |
| Transferências pagas / livres / empréstimos / cláusulas | 1689 / 4388 / 1151 / 30 | — |
| % livres e % empréstimos | 60% / 16% | emergente |
| Idade média dos transferidos (pagos) | 25.1 | 24–27 |
| Razão preço/valor (mediana; p5–p95) | 1.05 (0.73–1.70) | 0,6–2,5, extremos raros |
| Cláusulas activadas por época | 15.0 | 5–30 |
| Gasto total em transferências por época | 3060 M€ | — |

### 5.2. Gasto e saldo por liga (por época)

| Liga | Gasto | Receita | Saldo líquido | Entradas (todas) |
|---|---:|---:|---:|---:|
| ENG1 | 944 M€ | 252 M€ | -692 M€ | 83 |
| ESP1 | 340 M€ | 278 M€ | -61 M€ | 66 |
| GER1 | 252 M€ | 111 M€ | -141 M€ | 70 |
| ITA1 | 222 M€ | 172 M€ | -49 M€ | 65 |
| ENG2 | 132 M€ | 72 M€ | -60 M€ | 145 |
| USA1 | 116 M€ | 87 M€ | -29 M€ | 110 |
| KSA1 | 110 M€ | 38 M€ | -72 M€ | 70 |
| BRA1 | 110 M€ | 133 M€ | 24 M€ | 57 |
| FRA1 | 89 M€ | 92 M€ | 3 M€ | 69 |
| POR1 | 78 M€ | 217 M€ | 139 M€ | 94 |
| TUR1 | 73 M€ | 43 M€ | -30 M€ | 104 |
| MEX1 | 68 M€ | 74 M€ | 6 M€ | 70 |
| NED1 | 67 M€ | 171 M€ | 104 M€ | 81 |
| JPN1 | 46 M€ | 49 M€ | 2 M€ | 82 |
| BEL1 | 34 M€ | 149 M€ | 115 M€ | 77 |
| GER2 | 34 M€ | 32 M€ | -2 M€ | 80 |
| ARG1 | 34 M€ | 102 M€ | 68 M€ | 68 |
| SCO1 | 33 M€ | 89 M€ | 56 M€ | 53 |
| ESP2 | 32 M€ | 19 M€ | -13 M€ | 114 |
| GRE1 | 23 M€ | 101 M€ | 77 M€ | 52 |
| SUI1 | 23 M€ | 47 M€ | 24 M€ | 49 |
| DEN1 | 21 M€ | 99 M€ | 78 M€ | 55 |
| POL1 | 19 M€ | 90 M€ | 71 M€ | 71 |
| CZE1 | 15 M€ | 77 M€ | 62 M€ | 72 |
| KOR1 | 15 M€ | 32 M€ | 17 M€ | 37 |

### 5.3. Histogramas

**Razão preço pago / valor (transferências pagas)** (1719)

```
       < 0.60 | ██ 30
    0.60–0.80 | ████████ 131
    0.80–1.00 | ██████████████████████████████ 466
    1.00–1.25 | ████████████████████████████████████████ 624
    1.25–1.50 | ██████████████████ 273
    1.50–2.00 | ████████████ 180
    2.00–2.50 | █ 12
    2.50–4.00 |  3
       ≥ 4.00 |  0
```

**Idade dos transferidos (pagos)** (1719)

```
         < 19 | ███████████ 93
        19–21 | ███████████ 92
        21–23 | ████████████████████████████████ 261
        23–25 | ████████████████████████████████████ 292
        25–27 | ████████████████████████████████████████ 329
        27–29 | █████████████████████████████████ 268
        29–31 | ████████████████████████████████ 266
        31–33 | █████████████ 108
         ≥ 33 | █ 10
```

**Preço das transferências pagas** (1719)

```
  < 250 mil € | ██████████ 146
250 mil €–1 M€ | ███████████████████████████████████████ 552
    1 M€–3 M€ | ████████████████████████████████████████ 565
   3 M€–10 M€ | ███████████████████████ 321
  10 M€–30 M€ | ███████ 105
  30 M€–60 M€ | ██ 26
 60 M€–100 M€ |  4
     ≥ 100 M€ |  0
```

Negócios por janela: 2026-Verão 1634, 2027-Inverno 476, 2027-Verão 2009, 2028-Inverno 884, 2028-Verão 2255.

### 5.4. Fluxos entre países (pagas + livres, por época)

| Origem \ destino | ENG | FRA | GER | TUR | ESP | POR | ITA | NED | JPN | KSA | BRA | USA | BEL | SCO |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ENG | 23 | 2 | 4 | 3 | 5 | 3 | 3 | 2 | · | 1 | · | · | 1 | 1 |
| FRA | 5 | 4 | 2 | 1 | 3 | 2 | 4 | 2 | · | 1 | 1 | 4 | 1 | · |
| GER | 6 | 3 | 6 | · | 2 | · | 2 | 4 | 2 | 1 | 2 | 2 | 1 | 1 |
| TUR | · | 2 | 4 | 4 | · | · | · | 1 | · | · | · | · | · | · |
| ESP | 5 | 2 | 5 | · | 11 | · | 3 | · | · | · | 2 | 1 | · | · |
| POR | 6 | 4 | 2 | 1 | 2 | 4 | 3 | · | 1 | 1 | 2 | 1 | 2 | · |
| ITA | 8 | · | 3 | 1 | 2 | 2 | 2 | 2 | · | · | 2 | · | · | · |
| NED | 10 | 2 | 2 | 3 | 3 | · | · | 3 | 2 | 3 | 3 | 3 | 2 | · |
| JPN | 1 | 2 | 2 | 1 | 1 | 2 | · | 3 | 4 | 3 | 2 | 2 | · | 1 |
| KSA | · | · | 2 | · | 1 | · | · | · | · | 13 | · | · | · | · |
| BRA | 4 | 3 | 3 | 1 | · | · | 2 | · | · | 3 | 1 | 2 | · | 2 |
| USA | 2 | · | 3 | 2 | 2 | · | 2 | · | 2 | 1 | · | 14 | · | · |
| BEL | 5 | 2 | 3 | 1 | 2 | 2 | 5 | 2 | · | 4 | · | 3 | 2 | 2 |
| SCO | 4 | · | 3 | 2 | 1 | · | 2 | 2 | 2 | · | · | 2 | 1 | 3 |

### 5.5. Comportamentos esperados (teste, não regra)

| Comportamento | Medida | Resultado |
|---|---|---|
| Brasil e Argentina exportam para a Europa | 64 de 120 saídas para a UEFA; vendas à Europa 188 M€/época | ✅ |
| Arábia compra estrelas de 28–33 | 34 de 80 compras ao estrangeiro com 28–33 anos; OVR médio 59 | ✅ |
| MLS compra veteranos | 67 de 177 entradas do estrangeiro com 30+ | ✅ |
| POR vende para ligas mais ricas | saldo com o estrangeiro 144 M€/época | ✅ |
| NED vende para ligas mais ricas | saldo com o estrangeiro 110 M€/época | ✅ |
| BEL vende para ligas mais ricas | saldo com o estrangeiro 122 M€/época | ✅ |

### 5.6. Nevoeiro: o que o Netherenwick Athletic vê dos seus possíveis alvos (300 jogadores conhecidos; mostram-se os 12 de melhor OVR estimado entre os que a IA pode alvejar, com conhecimento ≥ 35%)

| Jogador | Clube (liga) | Idade | Conhecimento | OVR estimado (intervalo) | OVR real | Potencial estimado (intervalo) | Potencial real |
|---|---|---:|---:|---|---:|---|---:|
| Gabriel Gouedo | Associação Porto do Angico (BRA2) | 24 | 45% | 97 (84–99) | 86 | 99 (86–99) | 94 |
| Jack Radton | Rio do Angico Futebol Clube (BRA1) | 29 | 47% | 88 (78–98) | 80 | 80 (80–99) | 80 |
| Wesley Naselo | América de Campo do Cedro (BRA1) | 24 | 45% | 85 (75–95) | 79 | 99 (80–99) | 87 |
| Diogo Loureeira | Atlético de Torre de Carvide (POR1) | 25 | 50% | 85 (77–93) | 83 | 83 (83–98) | 87 |
| Vasco Salinho | Atlético de Torre de Carvide (POR1) | 30 | 49% | 84 (76–92) | 88 | 88 (88–99) | 89 |
| Caio Maredo | Associação Porto do Angico (BRA2) | 27 | 50% | 84 (72–96) | 79 | 79 (79–99) | 79 |
| Brayan Garales | Associação Porto do Angico (BRA2) | 22 | 53% | 82 (70–94) | 85 | 90 (85–99) | 93 |
| Pedro Valota | Clube Desportivo de Vila do Vale (POR1) | 32 | 48% | 80 (72–88) | 78 | 82 (78–98) | 78 |
| Lucas Morujo | Esporte Clube Ribeirão da Cascata (BRA1) | 25 | 47% | 80 (70–90) | 77 | 99 (80–99) | 79 |
| Gabriel Morares | Real Pine Falls (USA1) | 24 | 47% | 79 (66–92) | 68 | 83 (68–99) | 80 |
| Thomas Bradton | Rio do Angico Futebol Clube (BRA1) | 25 | 49% | 79 (70–88) | 77 | 77 (77–95) | 82 |
| Wesley Maredo | Clube Atlético Pouso das Pedras (BRA1) | 22 | 45% | 78 (68–88) | 78 | 82 (78–99) | 87 |

### 5.7. Evolução do conhecimento de Gustavo Rosilho (20 anos, Atlético Pouso das Pedras) pelo Quendale Athletic em 10 semanas

Valores reais: OVR 65, potencial 99. Os scouts do clube passam a cobrir o Brasileirão; na semana 4 o clube pede um relatório (observação dedicada).

| Semana | Conhecimento | OVR (intervalo) | Potencial (intervalo) | Estrelas | Ocultos visíveis | Familiaridade com a liga |
|---:|---:|---|---|---|---|---:|
| 0 | 0% | 83 (60–99) | 86 (65–99) | 3.5–5 | não | 0.00 |
| 1 | 4% | 81 (61–99) | 87 (65–99) | 3.5–5 | não | 0.28 |
| 2 | 8% | 78 (61–95) | 89 (65–99) | 3.5–5 | não | 0.55 |
| 3 | 12% | 76 (62–90) | 91 (67–99) | 3.5–5 | não | 0.81 |
| 4 | 32% | 73 (63–83) | 93 (75–99) | 4–5 | não | 1.00 |
| 5 | 36% | 72 (62–82) | 93 (75–99) | 4–5 | não | 1.00 |
| 6 | 40% | 72 (63–81) | 93 (76–99) | 4–5 | não | 1.00 |
| 7 | 44% | 71 (63–79) | 93 (77–99) | 4–5 | não | 1.00 |
| 8 | 61% | 70 (64–76) | 94 (81–99) | 4–5 | sim | 1.00 |
| 9 | 100% | 65 (65–65) | 98 (96–99) | 5–5 | sim | 1.00 |
| 10 | 100% | 65 (65–65) | 98 (96–99) | 5–5 | sim | 1.00 |

### 5.8. Benchmark (Node; tablet × 3 a 6)

| Medida | Valor | Alvo |
|---|---|---|
| Semana com alguma janela aberta (média / máx.) | 312 / 546 ms → tablet pior 3.27 s | < 5 s |
| Semana sem janelas abertas (média / máx.) | 206 / 299 ms → tablet pior 1.79 s | < 2 s |
| Semana de fecho de época (rollover; 4) (máx.) | 508 ms → tablet 3.05 s | ecrã de fim de época |
| Conhecimento guardado (scouting) | 11.3 MB | — |
