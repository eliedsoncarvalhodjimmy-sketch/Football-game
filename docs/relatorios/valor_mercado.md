# Valor de mercado: calibração da fórmula (Prompt 6B, Bloco 2)

> Referência: dataset público do Transfermarkt (CC0, até 6/7/2026), só para calibrar. Nada dele entra no jogo; aqui só há agregados.
> Jogo: mundo de teste (semente 2026), plantéis principais das ligas com correspondência na referência, no início do mundo.
> Amostra: 11450 jogadores do jogo e 13528 da referência (activos em 2025, com valor, nas mesmas ligas).

"Antes" são as hipóteses do Bloco 1; "depois" os parâmetros calibrados (secção 1).

## 1. Parâmetros calibrados

| Parâmetro | Hipótese (Bloco 1) | Calibrado |
|---|---|---|
| V_ref (Q 86) | 45 M€ | 29 M€ |
| β por ponto de Q | 0.17 (+19%) | 0.122 (+13%) |
| Convexidade do topo | +0.04 acima de 90 | +0 acima de 86 |

**F_liga** (Espanha = 1):

| Liga | Hipótese | Calibrado |
|---|---|---|
| Premier League | 1.25 | 2.347 |
| França | 0.92 | 2.186 |
| México | 0.7 | 2.134 |
| Bélgica | 0.7 | 2.124 |
| MLS | 0.75 | 1.51 |
| Dinamarca | — | 1.304 |
| Croácia | — | 1.292 |
| Noruega | — | 1.266 |
| Alemanha | 1 | 1.246 |
| Turquia | 0.75 | 1.195 |
| Países Baixos | 0.75 | 1.189 |
| Áustria | — | 1.151 |
| Itália | 1 | 1.142 |
| Suíça | — | 1.132 |
| Portugal | 0.75 | 1.008 |
| Espanha | 1 | 1 |
| Polónia | — | 0.953 |
| Chéquia | — | 0.833 |
| Colômbia | — | 0.816 |
| Arábia | 1.1 | 0.804 |
| Grécia | — | 0.754 |
| Escócia | — | 0.736 |
| Brasil | 0.7 | 0.698 |
| Japão | — | 0.558 |
| Coreia | — | 0.511 |
| Argentina | 0.6 | 0.465 |

**F_posição** (médio centro = 1):

| Grupo | Hipótese | Calibrado |
|---|---|---|
| GR | 0.75 | 0.332 |
| DC | 0.95 | 1.048 |
| LAT | 0.95 | 0.522 |
| MDC | 1 | 0.592 |
| MC | 1 | 1 |
| MO | 1.1 | 0.767 |
| EXT | 1.1 | 0.566 |
| PL | 1.1 | 0.859 |

**F_idade** (a qualidade constante; 24–26 = 1):

| Idade | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 | 34 | 36 |
|---|---|---|---|---|---|---|---|---|---|---|
| Campo | 0.437 | 0.471 | 0.856 | 0.956 | 1.052 | 1.011 | 1.011 | 0.664 | 0.743 | 0.597 |
| GR | 0.969 | 0.437 | 0.471 | 0.856 | 0.956 | 1.052 | 1.011 | 1.011 | 0.664 | 0.743 |

**F_contrato** (4+ anos = 1): < 6 meses 0.5; 6–12 meses 0.71; 1–2 anos 0.865; 2–3 anos 0.955; 3–4 anos 0.99.

**F_clube** (médio = 1): fica a hipótese do Prompt 6B (gigante 1.12; grande 1.05; pequeno 0.93), com o efeito mais forte em jovens e mais fraco em veteranos.
Resíduo por escalão, dentro de cada liga e depois do F_liga (diagnóstico): gigante 0.32; grande 0.544; pequeno 1.904. Sem medida de qualidade na referência, este resíduo mede sobretudo a diferença na distribuição da qualidade pelos clubes (no jogo, os gigantes concentram mais qualidade do que os valores reais indicam), não o efeito do clube; por isso não substitui a hipótese.
**F_contrato**: fica a hipótese do Prompt 6B pela mesma razão: na referência, os jogadores com contrato a acabar são sobretudo os mais fracos (selecção), e o resíduo mede isso, não o desconto do contrato. A tabela por anos de contrato (secção 2) é diagnóstico.
**Guarda-redes**: a curva de idade própria saía muito ruidosa (poucos GR por liga e idade); fica a curva dos jogadores de campo deslocada 2 anos (hipótese do Prompt 6B).

## 2. Jogo contra referência

### Por idade

| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |
|---|---|---|---|---|---|---|---|
| 16–19 | 682 / 838 | 500 mil € | 519 mil € | 517 mil € | +3% | 50 mil € / 112 mil € | 8.0 M€ / 4.1 M€ |
| 20–22 | 1579 / 2681 | 650 mil € | 332 mil € | 624 mil € | -4% | 75 mil € / 131 mil € | 10 M€ / 4.8 M€ |
| 23–25 | 2586 / 3121 | 1.0 M€ | 472 mil € | 1.1 M€ | +5% | 150 mil € / 206 mil € | 15 M€ / 9.9 M€ |
| 26–28 | 2916 / 2910 | 1.2 M€ | 414 mil € | 1.1 M€ | -11% | 250 mil € / 233 mil € | 12 M€ / 8.9 M€ |
| 29–30 | 1492 / 1467 | 1.0 M€ | 294 mil € | 992 mil € | -1% | 225 mil € / 208 mil € | 8.0 M€ / 8.2 M€ |
| 31–32 | 990 / 1084 | 675 mil € | 164 mil € | 672 mil € | 0% | 200 mil € / 146 mil € | 4.0 M€ / 5.7 M€ |
| 33–34 | 546 / 737 | 400 mil € | 58 mil € | 485 mil € | +21% ⚠️ | 100 mil € / 115 mil € | 3.0 M€ / 3.3 M€ |
| 35+ | 659 / 690 | 200 mil € | 19 mil € | 255 mil € | +27% ⚠️ | 50 mil € / 48 mil € | 1.0 M€ / 2.1 M€ |

Dentro de ±20%: 6 de 8.

### Por posição

| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |
|---|---|---|---|---|---|---|---|
| GR | 1374 / 1451 | 300 mil € | 229 mil € | 368 mil € | +23% ⚠️ | 50 mil € / 71 mil € | 3.8 M€ / 3.3 M€ |
| DC | 1832 / 2436 | 800 mil € | 183 mil € | 916 mil € | +14% | 150 mil € / 189 mil € | 10 M€ / 8.3 M€ |
| LAT | 1832 / 2020 | 800 mil € | 372 mil € | 769 mil € | -4% | 150 mil € / 170 mil € | 7.0 M€ / 6.4 M€ |
| MDC | 916 / 1144 | 800 mil € | 425 mil € | 871 mil € | +9% | 175 mil € / 179 mil € | 8.0 M€ / 7.1 M€ |
| MC | 1832 / 1759 | 900 mil € | 204 mil € | 855 mil € | -5% | 145 mil € / 161 mil € | 10 M€ / 7.9 M€ |
| MO | 916 / 1002 | 900 mil € | 391 mil € | 1.0 M€ | +16% | 150 mil € / 225 mil € | 10 M€ / 9.1 M€ |
| EXT | 1374 / 1931 | 1.0 M€ | 518 mil € | 915 mil € | -8% | 175 mil € / 187 mil € | 10 M€ / 7.2 M€ |
| PL | 1374 / 1785 | 900 mil € | 273 mil € | 947 mil € | +5% | 150 mil € / 192 mil € | 10 M€ / 7.5 M€ |

Dentro de ±20%: 7 de 8.

### Por liga

| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |
|---|---|---|---|---|---|---|---|
| Premier League | 500 / 692 | 12 M€ | 8.5 M€ | 12 M€ | -3% | 500 mil € / 3.1 M€ | 45 M€ / 59 M€ |
| Espanha | 500 / 595 | 3.0 M€ | 3.4 M€ | 3.0 M€ | -2% | 300 mil € / 843 mil € | 20 M€ / 14 M€ |
| Itália | 500 / 626 | 4.0 M€ | 4.1 M€ | 4.0 M€ | +0% | 600 mil € / 829 mil € | 23 M€ / 23 M€ |
| Alemanha | 450 / 562 | 4.0 M€ | 3.5 M€ | 4.1 M€ | +2% | 500 mil € / 989 mil € | 25 M€ / 22 M€ |
| França | 450 / 537 | 4.0 M€ | 1.6 M€ | 4.1 M€ | +2% | 300 mil € / 994 mil € | 20 M€ / 30 M€ |
| Portugal | 450 / 540 | 800 mil € | 320 mil € | 788 mil € | -1% | 200 mil € / 188 mil € | 9.0 M€ / 5.2 M€ |
| Países Baixos | 450 / 533 | 800 mil € | 294 mil € | 793 mil € | -1% | 100 mil € / 180 mil € | 7.0 M€ / 5.9 M€ |
| Bélgica | 400 / 506 | 1.2 M€ | 215 mil € | 1.2 M€ | -3% | 200 mil € / 327 mil € | 5.0 M€ / 5.7 M€ |
| Turquia | 500 / 546 | 900 mil € | 333 mil € | 862 mil € | -4% | 100 mil € / 196 mil € | 6.8 M€ / 4.5 M€ |
| Brasil | 500 / 637 | 1.5 M€ | 1.3 M€ | 1.4 M€ | -6% | 300 mil € / 411 mil € | 8.0 M€ / 6.6 M€ |
| Argentina | 750 / 895 | 450 mil € | 368 mil € | 425 mil € | -6% | 75 mil € / 111 mil € | 3.0 M€ / 1.9 M€ |
| MLS | 750 / 794 | 1.0 M€ | 304 mil € | 974 mil € | -3% | 125 mil € / 271 mil € | 4.0 M€ / 3.6 M€ |
| México | 450 / 495 | 1.5 M€ | 296 mil € | 1.5 M€ | +0% | 300 mil € / 401 mil € | 5.0 M€ / 6.0 M€ |
| Arábia | 450 / 510 | 350 mil € | 245 mil € | 358 mil € | +2% | 75 mil € / 91 mil € | 5.1 M€ / 1.5 M€ |
| Japão | 500 / 629 | 350 mil € | 177 mil € | 358 mil € | +2% | 75 mil € / 89 mil € | 1.0 M€ / 1.2 M€ |
| Coreia | 300 / 378 | 250 mil € | 102 mil € | 254 mil € | +1% | 75 mil € / 72 mil € | 650 mil € / 774 mil € |
| Escócia | 300 / 384 | 350 mil € | 105 mil € | 349 mil € | 0% | 75 mil € / 82 mil € | 2.5 M€ / 1.7 M€ |
| Áustria | 300 / 355 | 500 mil € | 88 mil € | 485 mil € | -3% | 100 mil € / 118 mil € | 3.0 M€ / 1.6 M€ |
| Suíça | 300 / 347 | 600 mil € | 124 mil € | 616 mil € | +3% | 100 mil € / 198 mil € | 3.0 M€ / 2.5 M€ |
| Dinamarca | 300 / 342 | 650 mil € | 100 mil € | 619 mil € | -5% | 50 mil € / 139 mil € | 3.5 M€ / 2.4 M€ |
| Croácia | 250 / 307 | 400 mil € | 53 mil € | 389 mil € | -3% | 50 mil € / 131 mil € | 1.8 M€ / 1.4 M€ |
| Chéquia | 400 / 473 | 375 mil € | 106 mil € | 391 mil € | +4% | 100 mil € / 90 mil € | 2.7 M€ / 1.7 M€ |
| Grécia | 350 / 449 | 450 mil € | 138 mil € | 445 mil € | -1% | 145 mil € / 101 mil € | 3.5 M€ / 1.9 M€ |
| Polónia | 450 / 507 | 400 mil € | 84 mil € | 398 mil € | 0% | 100 mil € / 117 mil € | 2.0 M€ / 1.3 M€ |
| Noruega | 400 / 387 | 500 mil € | 72 mil € | 485 mil € | -3% | 200 mil € / 131 mil € | 1.8 M€ / 1.9 M€ |
| Colômbia | 500 / 502 | 300 mil € | 70 mil € | 284 mil € | -5% | 50 mil € / 89 mil € | 800 mil € / 993 mil € |

Dentro de ±20%: 26 de 26.

### Por anos de contrato

| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |
|---|---|---|---|---|---|---|---|
| 6–12 meses | 1711 / 2669 | 700 mil € | 307 mil € | 818 mil € | +17% | 100 mil € / 141 mil € | 5.0 M€ / 7.9 M€ |
| 1–2 anos | 2274 / 3181 | 1.0 M€ | 257 mil € | 714 mil € | -29% ⚠️ | 175 mil € / 138 mil € | 8.0 M€ / 6.4 M€ |
| 2–3 anos | 2340 / 2154 | 2.0 M€ | 294 mil € | 785 mil € | -61% ⚠️ | 300 mil € / 157 mil € | 15 M€ / 6.9 M€ |
| 3–4 anos | 2229 / 1114 | 4.3 M€ | 315 mil € | 898 mil € | -79% ⚠️ | 500 mil € / 177 mil € | 30 M€ / 7.1 M€ |
| 4+ anos | 2896 / 266 | 8.0 M€ | 306 mil € | 813 mil € | -90% ⚠️ | 750 mil € / 158 mil € | 50 M€ / 7.3 M€ |

Dentro de ±20%: 1 de 5.

### Por escalão do clube

| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |
|---|---|---|---|---|---|---|---|
| gigante | 175 / 364 | 6.0 M€ | 74 M€ | 40 M€ | +572% ⚠️ | 500 mil € / 12 M€ | 35 M€ / 105 M€ |
| grande | 500 / 800 | 3.5 M€ | 15 M€ | 11 M€ | +212% ⚠️ | 300 mil € / 2.2 M€ | 28 M€ / 50 M€ |
| medio | 2075 / 2898 | 2.0 M€ | 2.6 M€ | 3.5 M€ | +77% ⚠️ | 200 mil € / 816 mil € | 20 M€ / 13 M€ |
| pequeno | 8700 / 9466 | 600 mil € | 170 mil € | 539 mil € | -10% | 100 mil € / 128 mil € | 4.0 M€ / 2.5 M€ |

Dentro de ±20%: 1 de 4.

## 3. Topo do mundo

| Posição no ranking | 1 | 5 | 10 | 20 | 30 | 50 | 100 |
|---|---|---|---|---|---|---|---|
| Referência | 200 M€ | 150 M€ | 130 M€ | 100 M€ | 85 M€ | 75 M€ | 50 M€ |
| Jogo (calibrado) | 250 M€ | 206 M€ | 148 M€ | 112 M€ | 103 M€ | 86 M€ | 59 M€ |

Top 50 dentro de ±25% da referência (posições 1, 10, 20, 30 e 50) e nenhum acima do tecto (250 M€): ✅

## 4. Critérios de aceitação

| Critério | Resultado |
|---|---|
| Mediana por (idade, posição, liga) a ±20% da referência | 141 de 464 células (30%) |
| Por idade / posição / liga / contrato / escalão a ±20% | 6/8; 7/8; 26/26; 1/5; 1/4 |
| Top 50 a ±25% e nenhum acima do tecto | sim |
| Spearman ≥ 0,90 nos jogadores ligados | não aplicável: os jogadores do jogo são fictícios (sem ligação um a um) |

