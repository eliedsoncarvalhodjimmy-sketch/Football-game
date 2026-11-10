# Orçamento de memória

Alvo: tablet Android com 8 GB nominais (Atouch X19 Ultra). Não assumimos mais de **~300 MB** para a app.

| Componente | Orçamento | Medido (fase 1, v2.4) |
|---|---|---|
| Mundo em memória (213 países-clube, 17 553 jogadores) | 60 MB | **4,8 MB** (JS heap + ArrayBuffers) |
| Pico ao construir (registos brutos + store) | 100 MB | 8,6 MB |
| Arrays tipados dos jogadores | — | 1,3 MB (~75 B/jogador) |
| Gravação (IndexedDB) por ranhura | 50 MB | 1,9 MB |
| CSV de atributos exportado | — | 2,4 MB |
| Futuro: estatísticas, calendários, competições (fases 3, 8) | 60 MB | — |
| Futuro: finanças e histórico de 20 épocas (fases 4, 10) | 40 MB | — |
| Futuro: jogo detalhado + replay (fase 9) | 30 MB | — |

Por jogador (Uint8 salvo indicação): 30 atributos visíveis, 6 ocultos, 12 de familiaridade, posição, pé, altura, OVR,
potencial, escalão, flag "gerado"; país onde joga (Int32), país de formação (Uint16, dicionário), nascimento (Int32),
valor (Float32), semente (Uint32). Nomes em arrays de strings.

Medido com `npm run bench` (Node 22, `--expose-gc`); resultado completo em `out/bench-latest.json`.
