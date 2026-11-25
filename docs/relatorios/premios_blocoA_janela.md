# Prompt 8, Bloco A — janela dos prémios (PARAGEM A)

> Mundo de teste, semente 2026, uma janela completa (1/8/2026 a 28/7/2027). Gerado por `npx tsx scripts/relatorio-premios-janela.ts`.

## 1. Dados guardados e custo

| Campos por jogador | Bytes por jogador | Memória (capacidade) | Exportação binária (n jogadores) |
|---|---|---|---|
| internacionalizacoes, intEstimada, wJogos, wTitular, wMinutos, wGolos, wAssist, wAmarelos, wVermelhos, wNotas, wClube, wMinCat, wRematesSofridos, wDefesas, wPenaltisDefendidos, wSemSofrer, wXgSofrido, wErros, wGrandes, wNotasGrandes, hEpoca, hClube, hJogos, hMinutos, hGolos, hAssist, hNota | 123 | 11.2 MB | 8.7 MB |

Mais, no `World`: os jogos de cada clube por categoria (0 entradas). O save é a repetição dos comandos: não cresce.

## 2. Jogadores transferidos a meio da época (números repartidos)

145 jogadores com duas passagens e 20+ jogos na janela. Os três com mais minutos:

**Tunde Mensankwo** (PL): 53 jogos, 4535 minutos, 26 golos, 4 assistências na janela.

| Passagem | Clube | liga | taca | supertaca | continental_1 | continental_2 | continental_3 | outra |
|---|---|---|---|---|---|---|---|---|
| 1 | Adenyi Stars | 2983 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | América de Vila das Garças | 1372 | 180 | 0 | 0 | 0 | 0 | 0 |

Movimentos: 2027-03-21 transferencia Adenyi Stars → América de Vila das Garças.

**Caio Arainho** (PL): 51 jogos, 4363 minutos, 20 golos, 8 assistências na janela.

| Passagem | Clube | liga | taca | supertaca | continental_1 | continental_2 | continental_3 | outra |
|---|---|---|---|---|---|---|---|---|
| 1 | IK Åkerby | 3106 | 0 | 0 | 687 | 0 | 0 | 180 |
| 2 | Atlético Pouso das Pedras | 180 | 210 | 0 | 0 | 0 | 0 | 0 |

Movimentos: 2026-07-08 emprestimo Atlético Pouso das Pedras → IK Åkerby.

**Jelle Bakser** (MC): 51 jogos, 4340 minutos, 9 golos, 11 assistências na janela.

| Passagem | Clube | liga | taca | supertaca | continental_1 | continental_2 | continental_3 | outra |
|---|---|---|---|---|---|---|---|---|
| 1 | VV Alderveen | 2107 | 193 | 0 | 0 | 0 | 419 | 505 |
| 2 | Real Summit Rock | 1116 | 0 | 0 | 0 | 0 | 0 | 0 |

Movimentos: 2027-03-26 transferencia VV Alderveen → Real Summit Rock.

## 3. Guarda-redes (estatísticas novas)

| GR | Jogos | Remates à baliza sofridos | Defesas | Golos sofridos | xG sofrido | Golos evitados (xG − golos) | Sem sofrer | Penáltis defendidos | Erros |
|---|---|---|---|---|---|---|---|---|---|
| Callum Radham | 59 | 90 | 64 | 26 | 31.6 | 5.6 | 37 | 0 | 0 |
| Kawaguchi Yuto | 58 | 176 | 128 | 48 | 52.7 | 4.7 | 19 | 1 | 0 |
| Arnaud Trabi | 57 | 190 | 132 | 58 | 50.5 | -7.5 | 25 | 1 | 1 |
| Jonas Nielsen | 57 | 255 | 196 | 59 | 79.9 | 20.9 | 24 | 1 | 0 |
| Lorenzo Marardi | 56 | 78 | 64 | 14 | 22.3 | 8.3 | 44 | 0 | 0 |

Erros que levam a golo na janela: 2513 (2079 jogadores).

## 4. Prémios desta janela (cálculo a 29 de Julho; pontuação ainda a do Prompt 4, o Bloco B muda-a)

- **melhor_do_mundo** 2027: Stefano Galato (FC Casteldorato); top 3: Stefano Galato 344.1, Stefano Sarani 335.3, Lorenzo Marardi 322.7
- **golden_boy** 2027: Jack Fairstone (Brackcombe Town); top 3: Jack Fairstone 300.1, Serge Sangaroré 280.1, Ryan Penley 247.7
- **guarda_redes** 2027: Lorenzo Marardi (FC Casteldorato); top 3: Lorenzo Marardi 322.7, Ivan Perašević 262, Bruno Valinho 255.3

## 5. Benchmark (Node; tablet × 3 a 6)

Semana mundial: média 356 ms, máximo 813 ms (57 semanas).

