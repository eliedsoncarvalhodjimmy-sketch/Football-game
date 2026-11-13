# Benchmark — 20 épocas, semente 2026

> DADOS DE TESTE. Mundo fictício completo (48 ligas). Node v22.23.4, linux/x64. A simulação corre sem interface; no tablet espera-se um factor de 3 a 6 vezes mais lento.

| Medida | Valor | Alvo |
|---|---|---|
| Gerar o mundo | 526 ms | — |
| 20 épocas (total) | 13.3 s | — |
| Época completa (média / máx.) | 617 ms / 977 ms | — |
| Semana do mundo inteiro (média / p99 / máx.) | 11.86 ms / 70.6 ms / 125.9 ms | < 2 s no tablet |
| Memória (heap) no início / no fim | 32.1 MB / 59.2 MB | — |
| Gravação de uma época (gzip) | 45 KB | ≤ 20 MB |
| Histórico de 25 épocas, com poda (gzip) | 0.7 MB | < 500 MB (com jogadores, mais tarde) |
| Histórico de 20 épocas, com poda (gzip) | 0.7 MB | — |
| Clubes criados (inclui os que entraram do exterior) | 1974 (activos 872) | — |
| Problemas de integridade e vagas em 20 passagens de época | 0 | 0 |

Nota: a poda guarda o detalhe de todos os jogos nas últimas 3 épocas; nas anteriores só as ligas principais e as continentais. Classificações, campeões, movimentos, taças e continentais ficam para sempre.

## Por época

| Época | ms | Semana máx. (ms) | Heap (MB) | Clubes criados | Gravação (KB) | Histórico acumulado (KB) |
|---|---:|---:|---:|---:|---:|---:|
| 2026/27 | 476 | 103.4 | 32.1 | 915 | 109 |  |
| 2027/28 | 450 | 63.9 | 39.0 | 973 | 111 |  |
| 2028/29 | 439 | 50.2 | 36.5 | 1031 | 111 |  |
| 2029/30 | 449 | 70.6 | 46.2 | 1089 | 112 |  |
| 2030/31 | 430 | 42.0 | 55.6 | 1104 | 27 |  |
| 2030/31 | 466 | 44.7 | 29.9 | 1162 | 27 |  |
| 2031/32 | 531 | 56.0 | 44.2 | 1220 | 27 |  |
| 2032/33 | 504 | 52.7 | 36.0 | 1278 | 28 |  |
| 2033/34 | 543 | 54.3 | 44.2 | 1336 | 28 |  |
| 2034/35 | 655 | 56.7 | 52.2 | 1394 | 28 | 448 |
| 2035/36 | 586 | 54.9 | 60.0 | 1452 | 28 |  |
| 2036/37 | 606 | 70.1 | 62.4 | 1510 | 28 |  |
| 2037/38 | 648 | 54.5 | 74.4 | 1568 | 28 |  |
| 2038/39 | 666 | 68.8 | 73.3 | 1626 | 28 |  |
| 2039/40 | 676 | 69.1 | 88.7 | 1684 | 28 |  |
| 2040/41 | 757 | 103.2 | 92.5 | 1742 | 28 |  |
| 2041/42 | 938 | 103.9 | 99.6 | 1800 | 29 |  |
| 2042/43 | 977 | 125.9 | 45.1 | 1858 | 29 |  |
| 2043/44 | 785 | 91.5 | 50.7 | 1916 | 29 |  |
| 2044/45 | 757 | 71.0 | 59.2 | 1974 | 29 | 688 |
