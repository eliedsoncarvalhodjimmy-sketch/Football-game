# Regressão: Prompt 3 (clube) lado a lado com o Prompt 2 e a Fase 1

> DADOS DE TESTE. Mundo fictício, 10 épocas por corrida, 6 sementes. "Prompt 3" = com a camada do clube (economia, dívida e sanções, donos, IA, treinadores e staff); "Prompt 2" = força pelos ratings do onze sem a camada do clube; "Fase 1" = força pela reputação.

## 1. Seis sementes

```
## Prompt 2 (onze)
semente | campeões distintos 8 ligas (média / mín) | ligas 10/10 | ENG % europeus | KSA asiáticos | BRA Libertadores | por liga
7 | 3.50 / 1 | 1 | 20% | 4/10 | 8/10 | [6, 4, 3, 4, 4, 1, 3, 3]
11 | 3.75 / 3 | 0 | 37% | 3/10 | 7/10 | [3, 3, 5, 4, 6, 3, 3, 3]
23 | 2.88 / 2 | 0 | 37% | 5/10 | 6/10 | [2, 3, 4, 3, 2, 2, 3, 4]
42 | 3.88 / 3 | 0 | 43% | 5/10 | 8/10 | [3, 4, 5, 5, 3, 4, 4, 3]
99 | 3.88 / 2 | 0 | 10% | 5/10 | 6/10 | [4, 5, 6, 4, 4, 3, 2, 3]
2026 | 3.00 / 2 | 0 | 27% | 5/10 | 9/10 | [3, 5, 2, 2, 3, 3, 4, 2]
média | 3.48 | 0.17 | 28.9% | 4.5 | 7.3 | todas as ligas 5.22

## Prompt 3 (clube, economia, IA)
semente | campeões distintos 8 ligas (média / mín) | ligas 10/10 | ENG % europeus | KSA asiáticos | BRA Libertadores | por liga
7 | 3.50 / 2 | 0 | 27% | 7/10 | 5/10 | [6, 3, 5, 4, 2, 3, 2, 3]
11 | 3.62 / 2 | 0 | 23% | 4/10 | 6/10 | [3, 3, 5, 4, 5, 2, 3, 4]
23 | 3.12 / 2 | 0 | 33% | 5/10 | 5/10 | [3, 2, 5, 3, 3, 3, 3, 3]
42 | 3.62 / 2 | 0 | 43% | 6/10 | 9/10 | [3, 4, 5, 3, 4, 5, 2, 3]
99 | 4.00 / 3 | 0 | 40% | 3/10 | 7/10 | [7, 3, 4, 4, 3, 3, 4, 4]
2026 | 3.62 / 2 | 0 | 37% | 4/10 | 6/10 | [3, 5, 3, 3, 3, 2, 5, 5]
média | 3.58 | 0.00 | 33.9% | 4.8 | 6.3 | todas as ligas 5.42

## Fase 1 (reputação)
semente | campeões distintos 8 ligas (média / mín) | ligas 10/10 | ENG % europeus | KSA asiáticos | BRA Libertadores | por liga
7 | 3.25 / 2 | 0 | 30% | 7/10 | 10/10 | [3, 4, 3, 4, 3, 2, 2, 5]
11 | 4.75 / 3 | 0 | 27% | 4/10 | 10/10 | [5, 6, 6, 3, 3, 4, 4, 7]
23 | 3.88 / 3 | 0 | 17% | 4/10 | 5/10 | [3, 5, 5, 4, 3, 4, 3, 4]
42 | 5.12 / 2 | 0 | 33% | 4/10 | 9/10 | [8, 6, 4, 2, 5, 5, 6, 5]
99 | 4.25 / 2 | 0 | 37% | 6/10 | 8/10 | [4, 6, 5, 2, 3, 5, 4, 5]
2026 | 3.75 / 3 | 0 | 13% | 5/10 | 10/10 | [5, 3, 3, 5, 5, 3, 3, 3]
média | 4.17 | 0.00 | 26.1% | 5.0 | 8.7 | todas as ligas 6.27


```

Alvos: campeões distintos nas 8 maiores ligas (UEFA: ENG, ESP, ITA, GER, FRA, POR, NED, BEL) em média ≥ 3 e nenhuma 10/10; Inglaterra 30–40% dos títulos europeus (UCL + UEL + UECL); Arábia 3–5 dos 10 títulos asiáticos.

## 2. Semente 2026 lado a lado: campeões das 8 maiores ligas

Cada clube aparece pelo número do seu id (o mesmo clube nos dois modos).

| Liga | Época | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Distintos |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| ENG1 | Prompt 3 | 001 | 001 | 009 | 001 | 001 | 001 | 002 | 002 | 001 | 001 | 3 |
| ENG1 | Prompt 2 | 001 | 001 | 002 | 002 | 002 | 001 | 002 | 002 | 003 | 003 | 3 |
| ENG1 | Fase 1 | 003 | 002 | 002 | 004 | 001 | 008 | 003 | 001 | 004 | 001 | 5 |
| ESP1 | Prompt 3 | 004 | 001 | 004 | 006 | 002 | 002 | 002 | 002 | 003 | 002 | 5 |
| ESP1 | Prompt 2 | 004 | 001 | 004 | 011 | 002 | 002 | 002 | 002 | 003 | 011 | 5 |
| ESP1 | Fase 1 | 001 | 001 | 001 | 002 | 001 | 003 | 001 | 001 | 001 | 001 | 3 |
| ITA1 | Prompt 3 | 001 | 001 | 003 | 001 | 001 | 001 | 005 | 003 | 001 | 001 | 3 |
| ITA1 | Prompt 2 | 001 | 001 | 001 | 001 | 001 | 001 | 001 | 003 | 001 | 001 | 2 |
| ITA1 | Fase 1 | 001 | 001 | 001 | 002 | 009 | 001 | 001 | 001 | 002 | 001 | 3 |
| GER1 | Prompt 3 | 001 | 001 | 002 | 002 | 001 | 003 | 003 | 001 | 003 | 003 | 3 |
| GER1 | Prompt 2 | 001 | 001 | 001 | 001 | 001 | 003 | 003 | 001 | 003 | 003 | 2 |
| GER1 | Fase 1 | 003 | 008 | 014 | 009 | 001 | 003 | 008 | 014 | 003 | 008 | 5 |
| FRA1 | Prompt 3 | 002 | 001 | 001 | 001 | 005 | 001 | 001 | 001 | 001 | 001 | 3 |
| FRA1 | Prompt 2 | 002 | 001 | 001 | 001 | 005 | 001 | 001 | 002 | 001 | 002 | 3 |
| FRA1 | Fase 1 | 002 | 002 | 001 | 001 | 002 | 002 | 003 | 004 | 004 | 006 | 5 |
| POR1 | Prompt 3 | 001 | 001 | 001 | 001 | 001 | 003 | 001 | 001 | 001 | 001 | 2 |
| POR1 | Prompt 2 | 001 | 002 | 001 | 001 | 001 | 005 | 001 | 001 | 002 | 001 | 3 |
| POR1 | Fase 1 | 001 | 002 | 001 | 002 | 002 | 002 | 002 | 001 | 008 | 002 | 3 |
| NED1 | Prompt 3 | 001 | 001 | 004 | 002 | 002 | 001 | 006 | 001 | 001 | 005 | 5 |
| NED1 | Prompt 2 | 001 | 001 | 001 | 002 | 004 | 001 | 001 | 004 | 001 | 005 | 4 |
| NED1 | Fase 1 | 001 | 003 | 003 | 001 | 001 | 001 | 001 | 001 | 001 | 007 | 3 |
| BEL1 | Prompt 3 | 002 | 004 | 002 | 001 | 002 | 001 | 001 | 003 | 005 | 001 | 5 |
| BEL1 | Prompt 2 | 002 | 002 | 002 | 001 | 001 | 001 | 001 | 001 | 002 | 001 | 2 |
| BEL1 | Fase 1 | 003 | 001 | 001 | 001 | 002 | 001 | 001 | 001 | 003 | 001 | 3 |

## 3. Semente 2026 lado a lado: continentais (país do vencedor)

| Competição | Modo | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UCL | Prompt 3 | ESP | ENG | ENG | ITA | GER | ITA | ITA | FRA | ENG | ESP |
| UCL | Prompt 2 | ITA | ENG | FRA | FRA | ENG | ENG | ESP | ESP | ITA | ITA |
| UCL | Fase 1 | POR | ESP | GER | ITA | FRA | ENG | ENG | ESP | ESP | ESP |
| UEL | Prompt 3 | ESP | GER | ESP | ESP | ENG | ENG | ITA | ENG | ENG | ESP |
| UEL | Prompt 2 | ENG | CZE | ITA | ESP | ENG | ESP | ENG | ITA | GER | ESP |
| UEL | Fase 1 | GER | GER | GER | ITA | POR | ENG | ITA | FRA | ITA | ENG |
| UECL | Prompt 3 | ENG | GER | SCO | ENG | POR | FRA | ENG | ENG | FRA | ESP |
| UECL | Prompt 2 | ENG | BEL | ESP | ESP | GER | ENG | NED | ITA | ITA | ESP |
| UECL | Fase 1 | ITA | ESP | ITA | GER | ESP | TUR | ITA | GER | ITA | BEL |
| CLI | Prompt 3 | ARG | BRA | BRA | BRA | BRA | ARG | BRA | ARG | BRA | ARG |
| CLI | Prompt 2 | BRA | BRA | BRA | BRA | BRA | BRA | ARG | BRA | BRA | BRA |
| CLI | Fase 1 | BRA | BRA | BRA | BRA | BRA | BRA | BRA | BRA | BRA | BRA |
| ACLE | Prompt 3 | JPN | JPN | JPN | KSA | JPN | KSA | JPN | JPN | KSA | KSA |
| ACLE | Prompt 2 | KSA | JPN | JPN | KSA | JPN | KOR | KSA | KSA | JPN | KSA |
| ACLE | Fase 1 | JPN | UAE | JPN | KSA | KSA | JPN | KSA | KSA | UAE | KSA |
