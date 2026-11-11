# FutCEO — Plano da Fase 1 (Paragem 1)

Estado: **proposta para validação**. Ainda não há código. Nada desta página foi implementado.

Legenda de confiança da tabela de ligas:
- ✅ confirmado em fonte aberta (Novembro de 2026)
- 🟡 provável, sem confirmação oficial encontrada
- ✏️ corrigido em relação ao prompt

---

## 1. Plano de ficheiros

```
Football-game/
├─ package.json            # vite, typescript, vitest, tsx (CLI); sem framework de UI
├─ tsconfig.json
├─ vite.config.ts          # PWA (manifest + service worker gerado à mão, sem plugin pesado)
├─ index.html
├─ DECISIONS.md            # todas as decisões tomadas por ambiguidade
├─ docs/
│  ├─ PLANO_FASE1.md       # este ficheiro
│  ├─ PACOTES.md           # especificação dos pacotes de dados
│  └─ relatorios/          # relatórios markdown gerados (10 épocas, benchmark)
├─ packs/                  # PACOTES DE DADOS (o motor não conhece nenhum clube/liga)
│  ├─ _schema/             # JSON Schema de cada ficheiro (validado pelo validate-pack)
│  ├─ _continental/        # uefa_cl.json, uefa_el.json, uefa_ecl.json, libertadores.json, afc_cl.json, vagas.json
│  ├─ eng/  esp/  ger/  fra/  por/  ned/  bel/  sco/  tur/  ita/
│  ├─ sui/  aut/  den/  nor/  swe/  gre/  cze/  cro/  pol/  hun/  ukr/
│  ├─ bra/  arg/  col/  uru/  ecu/
│  ├─ ksa/  jpn/  kor/  uae/  (qat/ alternativa, desactivado)
│  ├─ usa_mls/  mex/
│  └─ africa_unificada/
├─ assets/escudos/<pack>/<id_clube>.png   # opcional; senão escudo gerado com as cores
├─ src/
│  ├─ config/              # TODAS as fórmulas e constantes afináveis
│  │  ├─ simulacao.ts      # golos base, factor casa, expoentes, ajuste de empates
│  │  ├─ forca.ts          # reputação + índice da liga -> ataque/defesa
│  │  ├─ reputacao.ts      # inércia, limite anual, bónus continentais
│  │  ├─ riqueza.ts        # índice de riqueza por liga (sem uso nesta fase além da força)
│  │  ├─ calendario.ts     # semanas, ranhuras (fim-de-semana / meio da semana), épocas por região
│  │  ├─ geracao.ts        # desenho das reputações dos clubes fictícios
│  │  ├─ mundo.ts          # data de início (2026-07-01), packs activos
│  │  └─ retencao.ts       # poda de histórico (2-3 épocas), ligas "principais"
│  ├─ core/
│  │  ├─ rng.ts            # PRNG com semente (xoshiro128**) + streams derivados por hash
│  │  ├─ ids.ts            # ids numéricos compactos
│  │  └─ typed.ts          # utilitários de arrays tipados
│  ├─ data/
│  │  ├─ types.ts          # tipos dos registos (Clube, Competicao, RegrasLiga, ...)
│  │  ├─ DataSource.ts     # interface DataSource
│  │  ├─ LocalFileSource.ts# adaptador ficheiros locais (Node fs / fetch no browser)
│  │  ├─ csv.ts            # parser CSV mínimo
│  │  ├─ merge.ts          # prioridade: manual > real > gerado
│  │  └─ validate.ts       # validação de formato e contagens real/gerado
│  ├─ gen/
│  │  ├─ nomes.ts          # gerador de nomes fictícios por país (sílabas, não reais)
│  │  ├─ mundoFicticio.ts  # mundo completo marcado "teste"
│  │  └─ exteriores.ts     # clubes que sobem do "exterior"
│  ├─ engine/
│  │  ├─ world.ts          # WorldState em arrays tipados (reputação, ataque, defesa, divisão...)
│  │  ├─ match/quickSim.ts # modo rápido: xG -> Poisson
│  │  ├─ competitions/
│  │  │  ├─ roundRobin.ts  # tabela de Berger, n voltas, folgas rotativas
│  │  │  ├─ table.ts       # classificação e desempates configuráveis
│  │  │  ├─ playoffs.ts    # play-offs internos e barragens entre divisões
│  │  │  ├─ cup.ts         # taças com entrada escalonada
│  │  │  ├─ leaguePhase.ts # fase de liga estilo UEFA (8 jogos, potes, sem mesmo país)
│  │  │  ├─ groups.ts      # grupos + mata-mata (Libertadores, Ásia)
│  │  │  └─ knockout.ts    # eliminatórias 1 ou 2 mãos, final neutra
│  │  ├─ calendar/scheduler.ts  # atribui jogos a (semana, ranhura, dia) com as restrições
│  │  ├─ season/rollover.ts     # fim de época: subidas, descidas, exteriores, vagas, reputação
│  │  ├─ season/qualify.ts      # vagas continentais com "a vaga desce ao seguinte"
│  │  └─ history.ts        # resultados compactos (Uint32 empacotado), poda
│  ├─ worker/sim.worker.ts # protocolo de mensagens para a PWA
│  ├─ storage/             # IndexedDB, ranhuras de save, gravação incremental por época (gzip)
│  ├─ ui/                  # ecrã simples "Mundo" (tabelas), TS sem framework
│  └─ cli/
│     ├─ validate-pack.ts  # npm run validate-pack [pack]
│     ├─ gen-world.ts      # npm run gen-world -- --seed 42
│     ├─ simulate.ts       # npm run simulate -- --seasons 10 --seed 42 --report
│     └─ bench.ts          # npm run bench -- --seasons 50
└─ tests/
   ├─ integridade.test.ts  calibracao.test.ts  realismo.test.ts
   ├─ determinismo.test.ts calendario.test.ts  packs.test.ts
```

Princípios do motor:
- Puro, sem DOM, determinístico. Cada jogo usa um stream de RNG derivado de `hash(semente, id_competição, época, id_jogo)`: o resultado não depende da ordem de simulação (útil para o Worker e para testes).
- Estado do mundo em arrays tipados indexados por id numérico do clube; objectos só na fronteira (UI, relatórios).
- Estimativa de carga: ~19.000 jogos por época (~17.500 de liga, ~900 de taça, ~600 continentais). No modo rápido isto deve ficar bem abaixo de 1 s por época em Node; o benchmark confirmará.

## 2. Arquitectura dos pacotes de dados

Uma pasta por pacote. Nada de código; só JSON e CSV.

```
packs/por/
├─ manifest.json
├─ competicoes/
│  ├─ por_1.json          # regras da 1.ª Liga
│  ├─ por_2.json
│  ├─ por_3.json
│  └─ por_taca.json
├─ clubes.csv             # vazio ou parcial -> o gerador completa
├─ jogadores.csv  treinadores.csv  staff.csv  donos.csv   # cabeçalhos já definidos, sem uso na Fase 1
├─ estadios.csv
├─ rivalidades.csv
└─ overrides.json         # edições manuais: prioridade máxima
```

`manifest.json` (exemplo):
```json
{
  "id": "por", "nome": "Portugal", "tipo": "pais", "pais": "PT",
  "versao": "0.1.0", "piramide": ["por_1", "por_2", "por_3"],
  "taca": "por_taca", "confederacao": "UEFA",
  "exterior": { "desce_de": "por_3", "nome_generico": "Clube Exterior" }
}
```

Regras de liga (`competicoes/por_1.json`), campos usados já na Fase 1 marcados com ★:
```json
{
  "id": "por_1", "nome": "1.ª Liga", "nivel": 1,
  "formato": { "tipo": "liga", "equipas": 18, "voltas": 2 },               // ★
  "subidas": { "directas": 0 }, "descidas": { "directas": 2 },             // ★
  "playoffs": [{ "tipo": "barragem", "posicao": 16, "contra": "por_2:3", "maos": 2 }], // ★
  "desempates": ["pontos", "confronto_directo", "diferenca_golos", "golos_marcados", "sorteio"], // ★
  "epoca": { "regiao": "europa", "inicio_semana": "2026-W32", "fim_semana": "2027-W21" },     // ★
  "janelas_transferencias": [],
  "plantel": { "max": 25, "minimo_nacionais": null, "maximo_estrangeiros": null, "minimo_formados_no_clube": 8 },
  "tv": { "distribuicao_por_posicao": [], "paraquedas": [] },
  "premios": [], "fair_play": { "massa_salarial_max_receita": 0.8, "sancoes": [] },
  "licenciamento": null, "indice_riqueza": 28
}
```

Cada registo de clube/jogador/etc. tem `origem`: `real` | `gerado` | `teste` | `manual`. A fusão é feita campo a campo: `manual` > `real` > `gerado`.

`validate-pack` dá, por pacote: nº de clubes, jogadores, treinadores e donos por origem; erros de formato (schema); erros de coerência (nº de clubes ≠ equipas da competição, subidas ≠ descidas entre divisões vizinhas, ids duplicados, cores inválidas, escudos em falta → aviso).

Os dados continentais vivem em `packs/_continental/` porque não pertencem a nenhum país.

## 3. Tabela de ligas confirmada (época 2026/27 ou primeira época completa depois de 1/7/2026)

| País | Divisão | Equipas | Sobem | Descem | Notas |
|---|---|---:|---|---|---|
| Inglaterra | Premier League | 20 | — | 3 | ✅ |
| | Championship | 24 | 2 + PO 3.º–6.º | 3 | ✅ |
| | League One | 24 | 2 + PO 3.º–6.º | 4 | ✅ |
| | League Two | 24 | 3 + PO 4.º–7.º | 2 (exterior) | ✅ |
| Espanha | Primera | 20 | — | 3 | ✅ |
| | Segunda | 22 | 2 + PO 3.º–6.º | 4 (exterior) | ✅ |
| Alemanha | Bundesliga | 18 | — | 2 + barragem 16.º | ✅ |
| | 2. Bundesliga | 18 | 2 + barragem 3.º | 2 + barragem 16.º | ✅ |
| | 3. Liga | 20 | 2 + barragem 3.º | 4 (exterior) | ✅ |
| França | Ligue 1 | 18 | — | 2 + barragem 16.º | ✅ |
| | Ligue 2 | 18 | 2 + PO 3.º–5.º → barragem | 2 + barragem 16.º | 🟡 |
| | Ligue 3 (ex-National, profissional desde 2026/27) | 18 | 2 + barragem 3.º | 3 (exterior) | ✏️ nome; 🟡 nº |
| Portugal | 1.ª Liga | 18 | — | 2 + barragem 16.º | ✅ |
| | 2.ª Liga | 18 | 2 + barragem 3.º | 2 + barragem 16.º | ✏️ (eram 3) |
| | Liga 3 | 20 | 2 + barragem | 4 (exterior) | 🟡 (2025/26 tinha 20, em séries) |
| Países Baixos | Eredivisie | 18 | — | 2 + barragem 16.º | ✅ |
| | Eerste Divisie | 20 | 2 + PO | **0** | ✏️ KNVB suspendeu descidas para a Tweede Divisie; 4 equipas "Jong" não podem subir |
| Bélgica | Pro League | **18** | — | **2** | ✏️ ✅ alargada a 18, sem play-offs, desde 2026/27 |
| | Challenger Pro League | 16 | **2** | 1 (exterior) | ✏️ 🟡 |
| Escócia | Premiership | 12 | — | 1 + barragem 11.º | ✅ (real: 33 jogos + divisão em 2 grupos) |
| | Championship | 10 | 1 + PO | 1 (exterior) | ✅ |
| Turquia | Süper Lig | **18** | — | 3 | ✏️ ✅ reduzida a 18 |
| | 1. Lig | 20 | 3 | 3 (exterior) | 🟡 |
| Itália | Serie A | 20 | — | 3 | ✅ |
| | Serie B | 20 | 2 + PO 3.º–8.º | 4 (exterior) | ✅ |
| Suíça | Super League | 12 | — | 1 (exterior) | ✅ (real: 33 + split) |
| Áustria | Bundesliga | 12 | — | 1 | ✅ (real: 22 + split) |
| Dinamarca | Superliga | 12 | — | 2 | ✅ (real: 22 + split) |
| Noruega | Eliteserien | 16 | — | 2 | ✅ **calendário anual (Mar–Nov)** |
| Suécia | Allsvenskan | 16 | — | 2 | ✅ **calendário anual (Mar–Nov)** |
| Grécia | Super League | 14 | — | 2 | ✅ |
| Chéquia | 1. liga | 16 | — | 2 | ✅ |
| Croácia | HNL | 10 | — | 1 | ✅ (real: 4 voltas) |
| Polónia | Ekstraklasa | 18 | — | 3 | ✅ |
| Hungria | NB I | 12 | — | 2 | ✅ (real: 3 voltas) |
| Ucrânia | Premier Liha | 16 | — | 2 | ✅ |
| Brasil | Série A (2027) | 20 | — | 4 | ✅ |
| | Série B (2027) | 20 | 4 | 4 (exterior) | ✅ |
| Argentina | Liga Profesional (2027) | 30 | — | 2 (exterior) | ✅ 30; ✏️ em 2027 passa a "todos contra todos" uma vez + play-offs; descidas de 2026 suspensas (a confirmar para 2027) |
| Colômbia | Liga BetPlay (2027) | 20 | — | 2 | ✅ |
| Uruguai | Primera (2027) | 16 | — | 2 | 🟡 |
| Equador | LigaPro (2027) | 16 | — | 2 | ✅ |
| Arábia Saudita | Saudi Pro League | 18 | — | 3 | ✅ |
| | First Division | 18 | 3 | 3 (exterior) | ✅ |
| Japão | J1 2026/27 | 20 | — | 3 | ✅ **já passou a Agosto–Maio** |
| | J2 2026/27 | 20 | 3 (2 + PO) | 3 (exterior) | ✅ |
| Coreia do Sul | K League 1 (2027) | **14** | — | 1 + barragem | ✏️ ✅ passa de 12 para 14 em 2027 |
| Emirados | Pro League | 14 | — | 2 | ✅ |
| EUA/Canadá | MLS | 30 | — | — | ✅ **muda para Julho–Maio em 2027/28**; 2027 tem época de transição (Fev–Mai, 14 jogos) |
| México | Liga MX | 18 | — | — | ✅ |
| África | Liga africana unificada | 24 | — | — | gerada |

**Total: 924 clubes** (Europa 626, América do Sul 122, Ásia 104, América do Norte 48, África 24).

Simplificações propostas para todos os play-offs: play-off interno (ex.: 3.º–6.º) = meias-finais a jogo único em casa do melhor classificado + final em campo neutro; barragem entre divisões = duas mãos. Eerste Divisie e Challenger Pro League: equipas B/"Jong" não existem no jogo nesta fase (todos os clubes podem subir).

## 4. Propostas (secções 5–8)

### 4.1 Ligas grandes (pendência 2)
- **Argentina (30)** e **MLS (30)**: uma volta, 29 jornadas, tabela de Berger com alternância casa/fora (14 ou 15 jogos em casa). É exactamente o que a Argentina adopta em 2027 (sem os play-offs). Opção B: 29 jornadas + play-off dos 8 primeiros a jogo único (só Argentina).
- **Liga africana (24)**: duas voltas, 46 jornadas, Agosto–Maio (cabe: ~42 semanas, ~4–6 semanas com duas jornadas; estes clubes não têm taça nem continental).
- **Ligas de 10–12 equipas**: o formato por defeito (duas voltas) dá só 18–22 jogos. Proposta: campo `voltas` com o valor real sem "split": Escócia/Suíça/Hungria 3 voltas (33), Croácia 4 (36), Áustria/Dinamarca 2 (22). Por defeito fico com 2 voltas se preferires simplicidade.

### 4.2 Taças nacionais (secção 7)
- Todos os clubes do país, jogo único, final em campo neutro, empate → prolongamento simplificado + penáltis.
- Entrada escalonada: em config, `entrada_por_nivel` (ex. Inglaterra: nível 4 e 3 na 1.ª ronda, nível 2 na 2.ª, nível 1 na 3.ª). Se o nº de equipas de uma ronda não for potência de 2, joga-se uma pré-eliminatória entre os clubes de nível mais baixo e os restantes ficam isentos. Sorteio livre em cada ronda.
- Datas: semanas de meio da semana fixas por região em config (ex. Europa: Set, Out, Nov, Jan, Fev, Mar, final no fim de semana a seguir à última jornada).
- Liga africana: sem taça. MLS e Liga MX: com taça (todos os clubes do pacote).

### 4.3 Vagas europeias — 104 vagas (pendência 3)
Distribuição UEFA 2026/27 baseada no coeficiente de 2024/25: 1 Inglaterra, 2 Itália, 3 Espanha, 4 Alemanha, 5 França, 6 Países Baixos, 7 Portugal, 8 Bélgica (🟡 ordem 6–8 sem confirmação oficial encontrada).

Regra para o jogo (sem pré-eliminatórias): **quem na UEFA real entra numa pré-eliminatória desce para a competição seguinte**. Assim os 8 grandes mantêm o total real de vagas.

| País | Champions | Liga Europa | Conferência | Total |
|---|---|---|---|---:|
| ENG, ITA, ESP, GER (cada) | 1.º–4.º | 5.º + Taça | 6.º | 7 |
| FRA | 1.º–3.º | 4.º + Taça | 5.º, 6.º | 7 |
| NED | 1.º–2.º | 3.º + Taça | 4.º, 5.º | 6 |
| POR | 1.º | 2.º, 3.º + Taça | 4.º | 5 |
| BEL | 1.º | 2.º, 3.º + Taça | 4.º | 5 |
| Grupo A (5): TUR, CZE, GRE, POL, NOR | 1.º | Taça + 2.º | 3.º, 4.º | 5 |
| Grupo B (4): DEN, SUI, AUT, SCO | 1.º | Taça | 2.º, 3.º | 4 |
| Grupo C (4): SWE, CRO, HUN, UKR | 1.º | Taça | 2.º | 3 |
| **Totais** | **36** | **36** | **32** | **104** |

- Fecha exactamente sem défice. Ordem dos grupos A/B/C é aproximada (coeficiente) e fica em config.
- Vencedor da taça já qualificado → a vaga desce ao melhor classificado ainda sem vaga. Uma equipa nunca ocupa duas vagas.
- As 2 vagas extra da UEFA ("European Performance Spots") ficam **desligadas** por defeito (em config); se ligadas, retiram-se 2 vagas de campeões do Grupo C para a Liga Europa.
- Noruega e Suécia têm calendário anual: classificam-se pela época civil terminada antes do início da competição.
- Fase de liga: 4 potes de 9 (8 na Conferência) por reputação, 2 adversários por pote, 4 casa / 4 fora, sem clubes do mesmo país, máximo 2 do mesmo país por adversário.

### 4.4 Libertadores e Ásia
- Libertadores (16): BRA 5, ARG 4, COL 3, URU 2, EQU 2 (como pediste; na realidade o Brasil tem 7 e a Argentina 6). 4 grupos de 4, duas voltas, 1.º e 2.º aos quartos; quartos e meias a duas mãos; final única neutra. Fevereiro–Novembro. Grupos sorteados sem dois clubes do mesmo país (quando possível).
- Champions asiática (16): KSA 4, JPN 4, KOR 4, UAE 4. Mesmo formato, Setembro–Maio. A Coreia (anual) classifica-se pela época civil anterior.

### 4.5 Calendário (secção 9)
- Grelha de 52 semanas × 2 ranhuras (fim de semana, meio da semana) × dia. Liga só no fim de semana excepto quando for preciso (ligas de 46 jornadas, Inglaterra 2.ª–4.ª divisão com 46 jornadas → meio da semana obrigatório em ~8 semanas).
- Continentais só no meio da semana. Ligas com nº ímpar de equipas: folga rotativa da tabela de Berger.
- Teste do calendário: nenhum clube duas vezes no mesmo dia, ≤ 2 jogos/semana, ≤ 3 jogos seguidos em casa ou fora (excepto troca de volta), continentais no meio da semana.
- MLS no teste (pendência 4 só para o jogo real): **saltar a época de transição 2027** e entrar em 2027/28 (Julho–Maio). No ano 1 do teste a MLS não joga. Alternativa: tratá-la logo como Agosto–Maio desde 2026/27.
- Ligas anuais no teste: Brasil, Argentina, Colômbia, Uruguai, Equador, Coreia, Noruega e Suécia começam em Fevereiro/Março de 2027.

### 4.6 Reputação e força (pendência 5)
Desenho proposto para os clubes fictícios: dentro de cada liga, reputações ordenadas seguem uma curva côncava
`rep_i = piso + (tecto − piso) · (1 − i/(n−1))^k`, com `k = 1,6` e ruído ±3, de forma a dar 2–4 clubes fortes, muitos médios e alguns fracos. Tecto e piso por liga derivam do índice de riqueza.

Exemplo Premier League (tecto 93, piso 62): 93, 90, 87, 85, 82, 80, 78, 76, 74, 73, 71, 70, 68, 67, 66, 65, 64, 63, 62, 62.

Força: `ataque = defesa = rep · (0,7 + 0,3 · índice_liga/100)` com ruído próprio de ataque/defesa (±5), para que clubes de ligas fracas com reputação alta não batam de igual para igual os grandes nas continentais.

Reputação anual: `alvo` = função da posição final (percentil) e do nível da liga; `nova = antiga + clamp(0,15·(alvo − antiga) + bónus_continental, −5, +5)`.

Índice de riqueza (proposta inicial, 0–100): Premier League 100; La Liga 72; Bundesliga 70; Serie A 62; Ligue 1 50; Saudi Pro League 45; MLS 38; Série A Brasil 35; Championship 30; Süper Lig 30; Liga Portugal 28; Liga MX 28; Eredivisie 27; Pro League BEL 24; UAE 24; J1 22; 2. Bundesliga 18; Premiership SCO 18; Suíça 18; Áustria 16; LaLiga 2 15; Grécia 15; Dinamarca 15; K League 1 15; Serie B 14; Noruega 14; Argentina 14; Polónia 13; Suécia 13; Ligue 2 12; Chéquia 11; League One 10; Série B BRA 10; Colômbia 9; Hungria 9; Croácia 8; 3. Liga 8; Liga 2 POR 7; Ucrânia 7; Equador 7; 1. Lig TUR 7; Eerste Divisie 7; Liga africana 6; Uruguai 6; J2 6; Saudi FD 5; Challenger BEL 5; Championship SCO 4; League Two 5; Ligue 3 4; Liga 3 POR 3.

### 4.7 Calibração (secção 10)
`xG_casa = base · (ataque_c / defesa_f)^β · casa`, `xG_fora = base · (ataque_f / defesa_c)^β / casa`. `base` e `casa` calibrados para 2,6 golos e 45/26/29. O Poisson independente costuma dar ~24% de empates; se faltar, aplico uma correcção de Dixon-Coles (inflaciona 0-0 e 1-1), com o parâmetro em `config/simulacao.ts`.

## 5. O que não foi possível confirmar
- A Wikipédia está bloqueada na rede desta sessão; usei imprensa, sites das ligas e espelhos.
- Ordem exacta do coeficiente UEFA 6.º–8.º e grupos A/B/C; as 2 vagas de desempenho de 2026/27.
- Liga 3 portuguesa (nº e formato 2026/27), Ligue 3 (18 é o mais provável), 1. Lig turca (descidas), Challenger Pro League (nº), Uruguai 2027.
- Descidas na Argentina em 2027 (as de 2026 foram suspensas).
