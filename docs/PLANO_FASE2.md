# FutCEO — Plano da Fase 2 (jogador, motor de jogo, treinador)

Estado: **proposta para validação**. Ainda não há código da Fase 2. A Fase 1 não muda; tudo o que se segue é acrescentado por cima.

## 1. Plano de ficheiros (novos ou alterados)

```
src/config/
  atributos.ts        # lista de atributos (ids, nomes, grupos), escalas 1–20, ocultos
  papeis.ts           # papéis por posição e pesos por atributo; posições; familiaridade
  geracaoJogadores.ts # composição do plantel, idades, distribuição de qualidade, potencial, nomes
  evolucao.ts         # curvas por idade, ganhos mensais, declínio, guarda-redes, aposentação
  estado.ts           # moral, forma, condição, cansaço, lesões, cartões, suspensões
  tacticas.ts         # formações, instruções de equipa e efeitos nos ratings
  ratings.ts          # fórmulas dos 9 ratings de equipa e modificadores (limite total ±15%)
  motor.ts            # modo detalhado: posses, duelos (K), tipos de ocasião e xG
  simulacao.ts        # (existente) + modo_forca: 'onze' | 'reputacao' (o da Fase 1 fica como alternativa)
  treinadores.ts      # atributos, perfis, geração, efeitos, autoridade e interferência
src/players/
  store.ts            # PlayerStore: arrays tipados (atributos, idade, potencial, estado, estatísticas)
  posicoes.ts         # adequação a papéis (1–20), OVR por posição (1–100), familiaridade
  gerador.ts          # plantéis fictícios por clube (determinísticos, "gerado"), nomes por país
  evolucao.ts         # evolução mensal, envelhecimento, aposentação e reposição
  csv.ts              # exportar/importar players.csv por pacote (manual > real > gerado)
src/coaches/
  store.ts            # treinadores (um por clube nesta fase)
  gerador.ts          # perfis coerentes com a reputação do clube
  escolha.ts          # IA: formação, papéis, onze, rotação, plano B (adaptabilidade)
  autoridade.ts       # sugestões do utilizador: aceita / parcial / ignora, contador de autoridade
src/match/
  ratings.ts          # ratings de equipa a partir do onze + táctica, com cache
  rapido.ts           # modo rápido: ratings → xG → Poisson (+ Dixon-Coles) → marcadores, cartões, notas
  detalhado.ts        # modo detalhado: posses e duelos encadeados → lista de eventos
  eventos.ts          # tipos de evento (minuto, jogador, posição no campo)
  estatisticas.ts     # estatísticas por jogador e por equipa (todas as competições)
src/engine/
  world.ts            # + jogadores e treinadores (referências para os stores)
  season/temporada.ts # simular(j) passa a pedir ao modo rápido (ou ao detalhado, no jogo do utilizador)
  simulador.ts        # + evolução no 1.º dia de cada mês; recuperação física semanal
src/cli/
  simulate-match.ts   # npm run simulate-match -- --detailed --casa X --fora Y
  players.ts          # exemplos de jogadores, curvas de evolução, benchmark de memória
packs/<pais>/players.csv   # substitui jogadores.csv (mesmo princípio: manual > real > gerado)
tests/  jogadores, papeis, evolucao, ratings, motor-detalhado, motor-rapido, falso9, treinador, regressao-fase1, estabilidade
```

## 2. Como a nova simulação liga à da Fase 1

- **O que fica igual:** calendários, competições, qualificações, passagem de época, reputação, pacotes e relatórios. O motor da Fase 1 chama `simular(jogo)` para cada jogo, e esse ponto de entrada mantém-se.
- **O que muda:** hoje `simular(jogo)` usa o ataque e a defesa derivados da reputação. Passa a usar os **ratings do onze** de cada equipa (escolhido pelo treinador), calculados uma vez e guardados em cache. No modo rápido, os golos esperados continuam a ter a forma da Fase 1, `xG = base × exp(gama × (ataque − defesa)) × casa`; só que o ataque e a defesa passam a vir dos ratings. A Poisson com Dixon-Coles mantém-se. O cálculo por reputação fica em config como alternativa (`modo_forca: 'reputacao'`), para comparar.
- **Hierarquia preservada:** a qualidade dos plantéis gerados sai da mesma força que a Fase 1 já usa (`reputação × (0,7 + 0,3 × força desportiva)`). Calibro a geração para que o rating médio de cada onze reproduza a força da Fase 1. Assim mantêm-se as bandas das ligas, a diversidade de campeões, a Inglaterra em 30–40% dos títulos europeus e a Arábia em 3–5 dos 10 asiáticos. Se uma liga sair da sua banda, pergunto antes de mexer (pendência 3).
- **Reputação:** continua a existir. Serve para os potes, as qualificações da 1.ª época e o prestígio, e evolui como na Fase 1. A força em campo passa a ser a do plantel.
- **Ritmo:** a evolução dos jogadores corre no 1.º dia de cada mês; a condição física recupera todas as semanas; as lesões e suspensões contam-se por jogos e dias. As estatísticas de cada jogo vão para arrays por jogador e por época, guardados como na Fase 1 (gravação incremental por época).
- **Detalhado e rápido:** os dois modos usam os mesmos ratings e modificadores. O detalhado (só no jogo do utilizador) resolve posses e duelos e emite eventos; o rápido sorteia golos com Poisson e depois distribui marcadores, assistências, cartões, lesões e notas.

## 3. Atributos (proposta: a tua lista, sem acrescentos)

Escala 1–20. Todos os jogadores têm os 39 atributos visíveis guardados (um jogador de campo tem atributos de guarda-redes baixos, e vice-versa).

| Grupo | Atributos (id) |
|---|---|
| Técnicos (12) | cruzamento `cru`, drible `dri`, finalização `fin`, primeiro toque `ptq`, cabeceamento `cab`, passe `pas`, passe longo `plo`, remate de longe `rld`, desarme `des`, marcação `mar`, técnica `tec`, bolas paradas `bpa` |
| Mentais (12) | antecipação `ant`, compostura `cmp`, concentração `con`, decisões `dec`, determinação `det`, liderança `lid`, movimentação sem bola `msb`, posicionamento `pos`, trabalho de equipa `teq`, visão `vis`, agressividade `agr`, capacidade de trabalho `ctr` |
| Físicos (7) | aceleração `ace`, agilidade `agi`, equilíbrio `equ`, impulsão `imp`, resistência `res`, velocidade `vel`, força `for` |
| Guarda-redes (8) | reflexos `ref`, jogo aéreo `jae`, comando da área `cma`, pega `peg`, um-contra-um `uco`, jogo com os pés `jpe`, pontapé `pon`, comunicação `com` |
| Ocultos (6) | profissionalismo `prof`, ambição `amb`, consistência `cst`, propensão a lesões `les`, adaptabilidade `adp`, pressão `pre` |

- Os penáltis não têm atributo próprio: usam finalização, compostura e bolas paradas.
- O potencial é um tecto escondido, guardado como o OVR máximo atingível (1–100) na posição natural.

## 4. Posições, papéis e pesos (proposta para validares)

**Posições (12):** GR, DC, DD, DE, ALD, ALE (alas na linha de 3), MDC, MC, MO, ED, EE, PL.

**Familiaridade (1–20 por posição):**

| Nível | Valor | Efeito no rendimento |
|---|---|---|
| Natural | 18–20 | sem penalização |
| Competente | 10–17 | −3% a −8% |
| Desconfortável | < 10 | −15% a −25% |

**Adequação ao papel (1–20)** = média ponderada dos atributos do jogador com os pesos do papel. **OVR da posição (1–100)** = 1 + 99 × (adequação média aos papéis da posição − 1) / 19. Por exemplo, um jogador de 16–17 nos atributos-chave dá OVR ≈ 80–85.

Pesos: 5 = essencial, 4 = muito importante, 3 = importante, 2 = útil, 1 = marginal; atributos não listados = 0.

| Papel | Pesos |
|---|---|
| **GR clássico** | ref 5, uco 4, peg 4, jae 4, cma 4, pos 4, com 3, con 3, cmp 3, agi 3, ant 2, dec 2, jpe 1, pon 1, imp 1 |
| **GR líbero** | uco 5, ref 4, jpe 4, cma 4, ant 4, pon 3, dec 3, cmp 3, ace 3, peg 3, jae 3, com 2, vel 2, agi 2 |
| **DC central defensivo** | mar 5, des 5, pos 5, cab 4, for 4, con 4, imp 3, ant 3, agr 2, cmp 2, dec 2, vel 2, equ 2, det 1 |
| **DC central construtor** | des 4, mar 4, pos 4, pas 4, cmp 4, plo 3, ptq 3, ant 3, dec 3, con 3, cab 3, vis 2, tec 2, for 2, vel 2 |
| **DD/DE lateral defensivo** | des 4, mar 4, pos 4, ant 3, con 3, vel 3, ace 3, res 3, teq 2, pas 2, cru 1, equ 1, for 1 |
| **DD/DE lateral ofensivo** | cru 4, res 4, vel 4, ace 3, dri 3, pas 3, ctr 3, des 3, teq 2, msb 2, mar 2, pos 2, ptq 2, tec 2 |
| **ALD/ALE ala** | res 5, cru 4, ctr 4, vel 4, ace 3, dri 3, pas 3, msb 3, teq 3, des 2, mar 2, pos 2, ptq 2, agi 1 |
| **MDC trinco** | des 5, pos 5, mar 4, ant 4, con 3, ctr 3, agr 3, for 3, dec 3, teq 3, res 3, pas 2, cmp 2 |
| **MDC construtor recuado** | pas 5, plo 4, vis 4, dec 4, cmp 4, ptq 3, tec 3, pos 3, ant 3, des 2, teq 2, con 2 |
| **MC box-to-box** | res 5, ctr 5, pas 3, des 3, msb 3, ant 3, dec 3, teq 3, det 3, rld 2, fin 2, vel 2, ace 2, for 2, ptq 2 |
| **MC criativo** | pas 5, vis 5, tec 4, ptq 4, dec 4, cmp 3, dri 3, msb 3, plo 3, ant 2, rld 2, agi 2 |
| **MC de cobertura** | pos 4, des 4, teq 4, ctr 4, dec 3, pas 3, ant 3, con 3, res 3, mar 3, cmp 2, ptq 2 |
| **MO 10 clássico** | vis 5, pas 5, tec 5, ptq 4, dec 4, cmp 4, dri 3, msb 3, agi 3, rld 3, fin 2, bpa 2 |
| **MO segundo médio que entra na área** | msb 5, fin 4, ant 4, cmp 3, ptq 3, rld 3, dri 3, ace 3, pas 3, ctr 3, dec 3, tec 2, res 2 |
| **ED/EE extremo clássico** | cru 5, vel 5, ace 5, dri 4, tec 3, ptq 3, agi 3, msb 3, res 2, pas 2, ctr 2 |
| **ED/EE extremo invertido** | dri 5, fin 4, rld 4, ace 4, vel 4, tec 4, agi 4, ptq 3, msb 3, cmp 3, pas 2, dec 2 |
| **PL finalizador** | fin 5, msb 5, cmp 4, ant 4, ptq 3, cab 3, ace 3, vel 3, equ 2, dec 2, tec 2, agi 2 |
| **PL falso 9** | ptq 5, pas 4, vis 4, tec 4, dec 4, msb 4, cmp 4, dri 3, fin 3, agi 3, ant 3, teq 3 |
| **PL pivô** | for 5, cab 5, imp 4, equ 4, ptq 3, fin 3, teq 3, cmp 2, msb 2, pas 2, ant 2, agr 1 |
| **PL avançado de pressão** | ctr 5, res 5, agr 4, ace 4, teq 4, ant 3, vel 3, fin 3, msb 3, det 3, des 2, for 2 |

Os ocultos não entram nos pesos. Actuam assim:

| Oculto | Onde actua |
|---|---|
| Consistência | variância da nota em cada jogo |
| Pressão | jogos grandes e penáltis |
| Propensão a lesões | lesões |
| Profissionalismo e ambição | evolução |
| Adaptabilidade | entrosamento com táctica nova ou clube novo |

## 5. Memória (orçamento)

| Item | Bytes por jogador | 23 000 jogadores |
|---|---:|---:|
| 39 atributos + 6 ocultos (Uint8) | 45 | 1,0 MB |
| Familiaridade em 12 posições (Uint8) | 12 | 0,3 MB |
| Idade/nascimento, pé, potencial, clube, posição natural, papel | ~12 | 0,3 MB |
| Estado: moral, condição, ritmo, entrosamento, forma (5 notas), lesão, suspensão, cartões | ~16 | 0,4 MB |
| Adequação aos 20 papéis + OVR por posição (cache Uint8) | 32 | 0,7 MB |
| Estatísticas da época (12 contadores Uint16) | 24 | 0,6 MB |
| Nomes (texto, tabela à parte) | ~30 | 0,7 MB |
| **Total** | **~170** | **≈ 4 MB** |

Com 30 000 a 40 000 juniores (Prompt 4) ficaria em ≈ 10 MB, dentro do alvo do tablet. O benchmark da Paragem A vai medir o valor real.

## 6. Resumo dos blocos B e C (para alinharmos já)

- **9 ratings de equipa**, com cache por equipa: construção, criação, finalização, pressão, defesa da área, transição defensiva, jogo aéreo, bolas paradas e guarda-redes. Cada rating é uma média ponderada das adequações e atributos dos jogadores nas zonas que contam, ajustada pela táctica.
- **Modificadores** (casa, moral, forma, cansaço, entrosamento, adequação, treinador, rivalidade): cada um tem o seu limite, e o total fica limitado a ±15%.
- **Modo detalhado:**
  - A posse divide-se pela construção contra a pressão.
  - Cada ataque é uma cadeia de duelos: progressão, criação e remate.
  - Probabilidade de cada duelo = 0,5 + K × diferença, com a diferença limitada a ±10 e K = 0,025 (ajustável entre 0,02 e 0,03).
  - O xG vem do tipo de ocasião (grande, normal, de longe, penálti), e o duelo com o guarda-redes ajusta-o no máximo ±30%.
  - Cada remate é golo com probabilidade igual ao xG, sem Poisson por cima.
- **Modo rápido:** ratings → xG → Poisson com Dixon-Coles, como hoje; depois distribui marcadores, assistências, cartões, lesões e notas.
- **Treinador:**
  - Atributos 1–20, 6 perfis e formação e papéis preferidos.
  - Escolhe a táctica e o onze pesando o seu estilo, o plantel e a adaptabilidade: o adaptável muda de plano; o teimoso insiste e é penalizado (teste do falso 9).
  - Contador de autoridade para as sugestões do utilizador (aceita, aceita em parte ou ignora).

## 7. Commits e paragens

Um commit por bloco. A Paragem A mostra os atributos e pesos finais, 10 jogadores de exemplo, as curvas de evolução e a memória. A B mostra os relatos, a calibração dos dois modos, o falso 9 e o tempo por jornada. A C mostra a regressão em 6 sementes, a estabilidade em 20 épocas, o benchmark e as pendências.
