# Fase 2 — estabilidade de 20 épocas e benchmark (semente 2026)

> DADOS DE TESTE. Mundo fictício completo, sem interface. Node v22.23.4. Para o tablet alvo conta-se um factor de 3 a 6 (estimativa).

## 1. Estabilidade

| Medida | Valor | Alvo |
|---|---|---|
| Maior deriva do OVR médio de uma 1.ª liga em 20 anos (em qualquer época) | 2.99 | ≤ 3 |
| Clubes com um grupo de posições abaixo do mínimo (GR 2, DEF 6, MED 6, AVA 4), pior época | 0 | 0 |
| Plantel mais curto, pior época | 25 | ≥ 22 |
| Idade média dos jogadores (início → fim) | 27.3 → 28.1 | estável |
| Jogadores nos plantéis dos clubes em jogo (1.ª → última época) | 21800 → 21800 | estável |

OVR médio das 10 primeiras ligas com maior deriva (início → fim):

| Liga | Início | Fim | Δ |
|---|---:|---:|---:|
| URU1 | 51.8 | 49.6 | -2.16 |
| CZE1 | 56.0 | 54.1 | -1.82 |
| DEN1 | 55.5 | 53.8 | -1.76 |
| KOR1 | 54.6 | 56.2 | +1.58 |
| POL1 | 54.6 | 53.2 | -1.38 |
| GRE1 | 57.1 | 55.7 | -1.34 |
| ARG1 | 61.6 | 60.3 | -1.32 |
| ITA1 | 72.2 | 70.9 | -1.31 |
| GER1 | 72.4 | 71.2 | -1.24 |
| AFR1 | 53.2 | 54.4 | +1.18 |

OVR médio por época (ligas principais):

| Época | ENG1 | ESP1 | ITA1 | GER1 | FRA1 | POR1 | BRA1 | KSA1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| início | 75.2 | 71.8 | 72.2 | 72.4 | 67.5 | 61.3 | 68.3 | 56.1 |
| 2026/27 | 74.0 | 71.2 | 71.1 | 72.2 | 67.6 | 60.9 | 68.3 | 55.5 |
| 2027/28 | 74.4 | 70.9 | 71.7 | 71.3 | 67.1 | 61.5 | 66.6 | 56.2 |
| 2028/29 | 74.5 | 71.9 | 71.3 | 71.8 | 67.4 | 60.8 | 67.8 | 55.9 |
| 2029/30 | 74.5 | 71.3 | 71.9 | 70.6 | 67.0 | 61.2 | 66.9 | 56.8 |
| 2030/31 | 74.5 | 71.1 | 70.5 | 71.2 | 67.3 | 60.6 | 68.1 | 56.3 |
| 2031/32 | 74.3 | 71.5 | 71.2 | 71.3 | 67.0 | 60.8 | 66.7 | 56.3 |
| 2032/33 | 74.0 | 70.1 | 70.1 | 71.0 | 66.5 | 61.2 | 68.1 | 55.5 |
| 2033/34 | 73.6 | 70.0 | 70.2 | 71.1 | 65.9 | 60.9 | 66.4 | 54.8 |
| 2034/35 | 73.6 | 70.5 | 70.3 | 70.6 | 66.3 | 59.9 | 67.2 | 55.1 |
| 2035/36 | 73.2 | 69.8 | 70.0 | 70.5 | 66.4 | 60.3 | 66.2 | 55.0 |
| 2036/37 | 72.9 | 70.3 | 69.9 | 70.9 | 66.5 | 60.6 | 65.8 | 55.4 |
| 2037/38 | 73.3 | 70.7 | 69.8 | 70.7 | 66.2 | 60.6 | 65.6 | 54.7 |
| 2038/39 | 73.0 | 70.7 | 69.5 | 70.9 | 67.1 | 61.0 | 66.0 | 55.3 |
| 2039/40 | 74.3 | 71.1 | 70.6 | 70.7 | 66.7 | 60.6 | 66.5 | 55.5 |
| 2040/41 | 73.8 | 70.9 | 70.5 | 71.0 | 67.2 | 61.1 | 66.5 | 55.4 |
| 2041/42 | 74.4 | 71.2 | 70.6 | 71.8 | 67.0 | 61.2 | 67.0 | 56.3 |
| 2042/43 | 73.4 | 71.6 | 70.7 | 71.8 | 66.4 | 61.7 | 66.7 | 55.4 |
| 2043/44 | 73.6 | 71.6 | 70.0 | 70.7 | 68.1 | 59.9 | 67.3 | 56.4 |
| 2044/45 | 73.3 | 71.1 | 71.2 | 71.8 | 67.6 | 61.6 | 67.2 | 55.3 |
| 2045/46 | 74.1 | 71.7 | 70.9 | 71.2 | 68.3 | 60.8 | 67.6 | 56.3 |

## 2. Benchmark

| Medida | Node (esta máquina) | Tablet (estimativa ×3 a ×6) | Alvo |
|---|---|---|---|
| Gerar o mundo (clubes, 21800 jogadores, treinadores, afinação) | 641 ms | 1.9–3.8 s | — |
| Evolução mensal de todos os jogadores (medida à parte) | 32 ms | 95–190 ms | — |
| Semana mundial completa (média) | 91 ms | 274–548 ms | < 2 s |
| Semana mundial (p99 / máx.) | 213 / 314 ms | 1885 ms no pior caso | < 2 s |
| 20 épocas | 98 s | — | — |
| Memória (heap): só dados → mundo gerado → fim | 12.2 → 22.6 → 69.1 MB | — | — |
| Arrays dos jogadores (75208 jogadores, com os já retirados) | 13.6 MB | — | — |
| Gravação: estado dos jogadores (gzip) | 3693 KB | — | — |
| Gravação: uma época de jogos (gzip) | 31 KB | — | — |
| Gravação: histórico de 20 épocas (gzip, com poda) | 1012 KB | — | ≤ 20 MB por época |
