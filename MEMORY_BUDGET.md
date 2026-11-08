# Orçamento de memória

Alvo: tablet Android com 8 GB nominais. Sem assumir mais de **~300 MB** para a app (o browser e o SO ficam com o resto).

| Componente | Orçamento | Medido (fase 1) |
|---|---|---|
| Mundo em memória (1 120 clubes, 29 520 jogadores) | 60 MB | **7,8 MB** (JS heap + ArrayBuffers) |
| Pico ao construir (registos brutos + store) | 100 MB | 13,6 MB |
| Arrays tipados dos jogadores | — | 2,0 MB (~68 B/jogador) |
| Gravação (IndexedDB) por ranhura | 50 MB | 3,4 MB |
| CSV de atributos exportado | — | 4,2 MB |
| Futuro: academias (formato compacto, fase 6) | 40 MB | — |
| Futuro: estatísticas e calendários (fase 3) | 60 MB | — |
| Futuro: jogo detalhado + replay (fase 8) | 30 MB | — |

Por jogador: 30 atributos visíveis + 6 ocultos + 12 de familiaridade (Uint8), clube (Int32), nacionalidade (Uint16, por dicionário), data de nascimento (Int32 AAAAMMDD), posição, pé, altura, OVR, potencial (Uint8) e semente (Uint32). Os nomes ficam em arrays de strings.

Medido com `npm run bench` (Node 22, `--expose-gc`). O resultado completo fica em `out/bench-latest.json`.
