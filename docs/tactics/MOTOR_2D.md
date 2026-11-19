# FutCEO — Motor 2D táctico: especificação para o Claude Code

Coloca este ficheiro em `docs/tactics/MOTOR_2D.md`. Ele é a referência do motor de partida em 2D (estilo FM clássico). Quando houver dúvida sobre comportamento, este documento manda; o que interpretares regista em `DECISIONS.md`. Todos os números ficam em `src/config/match2d/` para eu afinar. Fala comigo em português de Portugal.

---

## 0. Diagnóstico: porque é que o motor actual parece caótico

Antes de escrever código, confirma quais destas causas existem hoje no motor e diz-me:

1. **Cada jogador decide sozinho, sem estrutura colectiva.** No futebol real, 80% do movimento de um jogador é "manter a posição certa dentro do bloco da equipa". Só uma minoria do tempo é decisão individual.
2. **As decisões são recalculadas a cada frame.** O alvo muda constantemente e as bolinhas tremem e ziguezagueiam. Decisões têm de ter compromisso (secção 7.3).
3. **Velocidades irreais por causa da compressão de tempo.** 90 min em 15 min = 6x. Se o motor desenhar jogadores a 6x da velocidade real, um sprint de 8 m/s aparece como 48 m/s no ecrã: isso parece caos mesmo com IA perfeita. Ver secção 2.
4. **A bola teletransporta-se ou é resolvida sem trajectória.** Um passe tem de viajar no espaço, com velocidade, e poder ser interceptado pelo caminho.
5. **Não há fases de jogo.** A equipa não sabe se está a construir, a defender em bloco ou em transição, e por isso não muda de forma.

---

## 1. Arquitectura em camadas

O motor tem 7 camadas, de cima para baixo. Cada uma só fala com a de baixo.

| # | Camada | Pergunta que responde | Frequência |
|---|--------|------------------------|------------|
| 1 | **Fase da equipa** | Estamos a atacar, a defender ou em transição? | por evento |
| 2 | **Bloco** | Onde está a equipa como um todo (altura, largura, compacidade)? | 5 Hz |
| 3 | **Âncoras** | Onde deve estar cada jogador dentro do bloco? | 5 Hz |
| 4 | **Papéis e acções sem bola** | Que tarefa tem este jogador agora (apoio, profundidade, cobertura, pressão)? | 1,5–3 Hz, com compromisso |
| 5 | **Decisão do portador** | Passo, conduzo, driblo, cruzo ou remato? | por posse de bola individual |
| 6 | **Movimento (steering)** | Como chego ao alvo de forma fisicamente realista? | 10 Hz |
| 7 | **Bola e resolução** | Para onde vai a bola, quem a apanha, o lance resulta? | 10 Hz |

Regra: **a posição final de um jogador sem bola = âncora (camadas 2–3) + desvio do papel (camada 4)**, com o desvio limitado. Um jogador nunca abandona a sua zona sem uma razão explícita (acção com nome, secção 6).

Integração com o que já existe:
- A simulação rápida (por ratings, Prompt 2 secção 2.2.1) mantém-se para todos os jogos que não são meus.
- Este motor 2D substitui o "modo detalhado" (secção 2.3 do Prompt 2) no jogo do utilizador. Os resultados dos dois motores têm de bater nas mesmas médias estatísticas (secção 12).
- Determinístico com semente, sem DOM, corre em Node nos testes. A renderização só lê o estado.

---

## 2. Tempo, campo e escala

### 2.1 Campo
- 105 × 68 m. Coordenadas internas sempre em **metros**, e cada equipa raciocina no seu referencial: `x` de 0 (a própria baliza) a 105 (baliza adversária), `y` de 0 (lado esquerdo) a 68 (lado direito). Converte para o referencial absoluto só na renderização.
- Nas tabelas abaixo uso coordenadas normalizadas `(x, y)` entre 0 e 1. Multiplica por 105 e 68.

### 2.2 Tempo de jogo vs tempo de apresentação
- O motor físico corre **sempre em tempo de jogo real**: um tick = 0,1 s de jogo, velocidades em m/s reais.
- A renderização interpola entre ticks a 60 fps.
- A compressão para caber em 15 min a 1x **não é constante**. Usa compressão variável, que é o que dá a sensação de jogo "lido" do FM:

| Situação | Compressão | Exemplo |
|----------|-----------|---------|
| Circulação na primeira fase, bola parada a ser preparada, guarda-redes com a bola | 10–14x | centrais a trocar a bola |
| Construção no meio-campo | 6–8x | |
| Último terço, transição rápida, bola na área | 2–3x | contra-ataque, cruzamento, remate |
| Golo, grande oportunidade | 1,5x e replay opcional | |
| Interrupções (lançamento, pontapé de baliza, substituição, falta) | saltadas ou 20x | |

- Um controlador ajusta os valores para que a média dê 90 min em 15 min (±1 min). Mostra-me um gráfico da compressão ao longo de um jogo.
- Velocidade 2x e 4x multiplicam estes valores. Velocidade 0,5x serve para eu ver o motor em detalhe.

---

## 3. Fases do jogo

Cada equipa está sempre numa fase. A fase muda os parâmetros do bloco e os pesos das acções.

| Fase | Entra quando | Sai quando |
|------|-------------|-----------|
| **ATQ_CONSTRUCAO** | tem a bola no seu terço defensivo, posse estabilizada | bola passa o meio-campo com controlo |
| **ATQ_CRIACAO** | posse controlada entre o meio-campo e a entrada da área | bola entra na zona de finalização |
| **ATQ_FINALIZACAO** | bola no último terço central ou na área, ou cruzamento em curso | perde a bola ou remata |
| **TRANS_ATQ_DEF** | acabou de perder a bola | 4–8 s (depende do estilo) ou recuperou a bola ou o bloco já está formado |
| **DEF_ORGANIZADA** | adversário tem posse estabilizada | recupera a bola |
| **TRANS_DEF_ATQ** | acabou de recuperar a bola | 3–6 s ou o ataque rápido terminou ou a equipa decide "segurar" e passa a construção |
| **BOLA_PARADA** | canto, livre, lançamento, penálti, pontapé de baliza | bola em jogo |

"Posse estabilizada" = a mesma equipa fez 2 passes seguidos ou conduziu 3 s sem pressão.

---

## 4. O bloco da equipa

### 4.1 Parâmetros do bloco
O bloco é descrito por 4 números, que variam por fase e por estilo:

- `linhaDefX`: altura da linha defensiva (em metros a partir da própria baliza).
- `comprimento`: distância entre a linha defensiva e o jogador mais adiantado (compacidade vertical). Real: 25–35 m em bloco compacto, 40–55 m em posse.
- `largura`: distância entre o jogador mais à esquerda e o mais à direita. Real: 30–40 m a defender, 55–65 m a atacar.
- `deslizeLateral`: quanto o bloco se desloca para o lado da bola (0 = nada, 1 = o centro do bloco vai para o `y` da bola). Real: 0,4–0,7 a defender.

### 4.2 Como o bloco segue a bola
A cada 0,2 s:
```
alvoLinhaDefX = clamp(f(fase, estilo, xBola), minLinha, maxLinha)
centroY      = 34 + (yBola - 34) * deslizeLateral
```
- A linha defensiva **sobe** quando a bola vai para a frente ou para trás em posse adversária com pressão ("bola coberta").
- A linha defensiva **baixa** quando o portador adversário está de frente para a baliza, sem pressão e com tempo ("bola descoberta"). Esta regra é das mais importantes para o realismo: sem ela a linha fica alta e leva bolas nas costas a toda a hora.
- A linha nunca fica a menos de 6 m da própria baliza, exceto em bola parada.
- O bloco desloca-se com atraso (filtro suave, constante de tempo 0,6–1,0 s), não instantaneamente.

### 4.3 Âncora de cada jogador
```
âncora.x = linhaDefX + (forma.x - forma.xDefesa) * comprimento / comprimentoForma
âncora.y = centroY  + (forma.y - 0.5) * largura
```
onde `forma` é a posição do jogador na formação (secção 5) para a fase actual.
O guarda-redes não segue esta regra: fica entre a bola e o centro da baliza, a 4–15 m da linha de golo conforme a altura da linha defensiva e o papel (líbero sai mais).

---

## 5. Formações

Cada formação tem duas formas: **sem bola** (defensiva) e **com bola** (ofensiva). A transição entre elas é gradual (1,5–3 s). As coordenadas são normalizadas no referencial da equipa, dentro do bloco: `x` 0 = guarda-redes, 0,20 ≈ linha defensiva, `y` 0 = esquerda, 1 = direita.

```json
{
  "4-3-3": {
    "semBola": {
      "GR": [0.04, 0.50], "DE": [0.20, 0.15], "DCE": [0.19, 0.38], "DCD": [0.19, 0.62], "DD": [0.20, 0.85],
      "MDC": [0.28, 0.50], "MCE": [0.36, 0.33], "MCD": [0.36, 0.67],
      "EE": [0.44, 0.12], "PL": [0.52, 0.50], "ED": [0.44, 0.88]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DE": [0.40, 0.05], "DCE": [0.20, 0.30], "DCD": [0.20, 0.70], "DD": [0.40, 0.95],
      "MDC": [0.30, 0.50], "MCE": [0.46, 0.35], "MCD": [0.46, 0.65],
      "EE": [0.62, 0.08], "PL": [0.68, 0.50], "ED": [0.62, 0.92]
    }
  },
  "4-2-3-1": {
    "semBola": {
      "GR": [0.04, 0.50], "DE": [0.20, 0.15], "DCE": [0.19, 0.38], "DCD": [0.19, 0.62], "DD": [0.20, 0.85],
      "MDCE": [0.29, 0.40], "MDCD": [0.29, 0.60],
      "EE": [0.40, 0.12], "MO": [0.42, 0.50], "ED": [0.40, 0.88], "PL": [0.52, 0.50]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DE": [0.38, 0.05], "DCE": [0.20, 0.32], "DCD": [0.20, 0.68], "DD": [0.38, 0.95],
      "MDCE": [0.32, 0.42], "MDCD": [0.34, 0.58],
      "EE": [0.60, 0.10], "MO": [0.56, 0.50], "ED": [0.60, 0.90], "PL": [0.68, 0.50]
    }
  },
  "3-4-3": {
    "semBola": {
      "GR": [0.04, 0.50], "DCE": [0.19, 0.28], "DC": [0.18, 0.50], "DCD": [0.19, 0.72],
      "AE": [0.24, 0.06], "MCE": [0.32, 0.38], "MCD": [0.32, 0.62], "AD": [0.24, 0.94],
      "EE": [0.44, 0.20], "PL": [0.52, 0.50], "ED": [0.44, 0.80]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DCE": [0.22, 0.22], "DC": [0.20, 0.50], "DCD": [0.22, 0.78],
      "AE": [0.50, 0.04], "MCE": [0.38, 0.38], "MCD": [0.38, 0.62], "AD": [0.50, 0.96],
      "EE": [0.64, 0.25], "PL": [0.68, 0.50], "ED": [0.64, 0.75]
    },
    "nota": "Variante Cruyff/Ajax: 3-4-3 losango (MDC, MCE, MCD, MO). Implementa como formação separada '3-4-3L'."
  },
  "4-4-2": {
    "semBola": {
      "GR": [0.04, 0.50], "DE": [0.20, 0.15], "DCE": [0.19, 0.38], "DCD": [0.19, 0.62], "DD": [0.20, 0.85],
      "ME": [0.33, 0.13], "MCE": [0.32, 0.38], "MCD": [0.32, 0.62], "MD": [0.33, 0.87],
      "PLE": [0.48, 0.40], "PLD": [0.48, 0.60]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DE": [0.36, 0.06], "DCE": [0.20, 0.32], "DCD": [0.20, 0.68], "DD": [0.36, 0.94],
      "ME": [0.56, 0.08], "MCE": [0.40, 0.40], "MCD": [0.42, 0.60], "MD": [0.56, 0.92],
      "PLE": [0.66, 0.42], "PLD": [0.68, 0.58]
    }
  },
  "5-3-2": {
    "semBola": {
      "GR": [0.04, 0.50], "AE": [0.21, 0.07], "DCE": [0.19, 0.30], "DC": [0.18, 0.50], "DCD": [0.19, 0.70], "AD": [0.21, 0.93],
      "MCE": [0.32, 0.32], "MC": [0.30, 0.50], "MCD": [0.32, 0.68],
      "PLE": [0.46, 0.42], "PLD": [0.46, 0.58]
    },
    "comBola": {
      "GR": [0.04, 0.50], "AE": [0.48, 0.05], "DCE": [0.22, 0.25], "DC": [0.20, 0.50], "DCD": [0.22, 0.75], "AD": [0.48, 0.95],
      "MCE": [0.42, 0.33], "MC": [0.36, 0.50], "MCD": [0.42, 0.67],
      "PLE": [0.66, 0.42], "PLD": [0.68, 0.58]
    }
  },
  "5-4-1": {
    "semBola": {
      "GR": [0.04, 0.50], "AE": [0.20, 0.07], "DCE": [0.19, 0.30], "DC": [0.18, 0.50], "DCD": [0.19, 0.70], "AD": [0.20, 0.93],
      "ME": [0.31, 0.14], "MCE": [0.30, 0.38], "MCD": [0.30, 0.62], "MD": [0.31, 0.86],
      "PL": [0.44, 0.50]
    },
    "comBola": {
      "GR": [0.04, 0.50], "AE": [0.38, 0.05], "DCE": [0.21, 0.27], "DC": [0.19, 0.50], "DCD": [0.21, 0.73], "AD": [0.38, 0.95],
      "ME": [0.52, 0.14], "MCE": [0.38, 0.40], "MCD": [0.38, 0.60], "MD": [0.52, 0.86],
      "PL": [0.64, 0.50]
    }
  },
  "3-5-2": {
    "semBola": {
      "GR": [0.04, 0.50], "DCE": [0.19, 0.30], "DC": [0.18, 0.50], "DCD": [0.19, 0.70],
      "AE": [0.26, 0.07], "MCE": [0.33, 0.33], "MDC": [0.28, 0.50], "MCD": [0.33, 0.67], "AD": [0.26, 0.93],
      "PLE": [0.47, 0.42], "PLD": [0.47, 0.58]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DCE": [0.22, 0.25], "DC": [0.20, 0.50], "DCD": [0.22, 0.75],
      "AE": [0.54, 0.05], "MCE": [0.44, 0.33], "MDC": [0.33, 0.50], "MCD": [0.44, 0.67], "AD": [0.54, 0.95],
      "PLE": [0.66, 0.42], "PLD": [0.68, 0.58]
    }
  },
  "4-1-4-1": {
    "semBola": {
      "GR": [0.04, 0.50], "DE": [0.20, 0.15], "DCE": [0.19, 0.38], "DCD": [0.19, 0.62], "DD": [0.20, 0.85],
      "MDC": [0.26, 0.50],
      "ME": [0.34, 0.13], "MCE": [0.34, 0.38], "MCD": [0.34, 0.62], "MD": [0.34, 0.87],
      "PL": [0.48, 0.50]
    },
    "comBola": {
      "GR": [0.04, 0.50], "DE": [0.36, 0.06], "DCE": [0.20, 0.32], "DCD": [0.20, 0.68], "DD": [0.36, 0.94],
      "MDC": [0.30, 0.50],
      "ME": [0.56, 0.10], "MCE": [0.46, 0.38], "MCD": [0.46, 0.62], "MD": [0.56, 0.90],
      "PL": [0.68, 0.50]
    }
  }
}
```

Regras sobre as formações:
- As formas `comBola` acima são a referência de um estilo neutro. O estilo modifica-as (secção 8: subida dos laterais, largura dos extremos, liberdade posicional).
- O papel também as modifica: um lateral defensivo no `comBola` fica 0,12 mais atrás do que um lateral ofensivo; um extremo invertido fica 0,10 mais por dentro; um falso 9 baixa 0,10.
- Desenha-me cada formação nas duas formas num ecrã de teste antes de avançar (Fase 1 do plano, secção 13).

---

## 6. Papéis e acções sem bola

### 6.1 Acções sem bola (catálogo fechado)
Um jogador sem bola está sempre a executar **uma** destas acções. Cada uma tem um alvo calculado e uma intensidade (andar, trote, sprint).

**Com a equipa em posse:**
| Acção | Alvo | Quando faz sentido |
|-------|------|-------------------|
| `MANTER_POSICAO` | a própria âncora | por defeito |
| `OFERECER_APOIO` | ponto a 8–18 m do portador, com linha de passe livre e em ângulo (não na mesma linha que um defensor) | jogador próximo do portador, sobretudo atrás ou ao lado da bola |
| `DAR_LARGURA` | junto à linha lateral (y 3–6 m ou 62–65 m), à altura da âncora | extremos, laterais e alas, se o estilo pede largura |
| `ATACAR_PROFUNDIDADE` | espaço atrás da linha defensiva adversária, partindo em linha com o último defensor (respeita o fora-de-jogo) | portador tem tempo, está virado para a frente e tem Visão ≥ limiar; jogador rápido |
| `APOIO_FRONTAL` | entre linhas, nas costas dos médios adversários | MO, falso 9, extremo invertido, médio criativo |
| `SOBREPOSICAO` | corre por fora do colega que tem a bola na ala | lateral ofensivo, ala, médio box-to-box |
| `OCUPAR_AREA` | uma de 5 zonas: primeiro poste, segundo poste, marca de penálti, entrada da área, ressalto | bola em zona de cruzamento |
| `EQUILIBRIO_DEFENSIVO` | posição de segurança atrás da bola ("rest defense") | quem fica para trás: centrais, trinco e mais 0–2 conforme o estilo |

**Com a equipa sem posse:**
| Acção | Alvo | Quando faz sentido |
|-------|------|-------------------|
| `MANTER_POSICAO` | a própria âncora | por defeito |
| `PRESSIONAR` | o portador, aproximação em curva que fecha a linha de passe mais perigosa | o mais próximo, se o gatilho de pressão está activo (secção 9.2) |
| `COBRIR` | 5–8 m atrás e ao lado de quem pressiona | o segundo mais próximo |
| `FECHAR_LINHA_PASSE` | ponto entre o portador e o receptor mais perigoso | 2–3 jogadores perto da bola |
| `MARCAR` | 1–2 m do adversário, entre ele e a baliza | marcação individual (Catenaccio) ou adversário na área em cruzamento |
| `RECUPERAR` | sprint de volta à âncora | o jogador está fora da zona (distância à âncora > limite) em transição defensiva |

### 6.2 Escolha da acção
A cada 0,33–0,66 s (desfasado entre jogadores, não todos no mesmo tick), cada jogador calcula uma pontuação por acção permitida ao seu papel:
```
pontuação(acção) = pesoPapel[papel][acção] * pesoEstilo[estilo][acção] * pesoFase[fase][acção]
                 * utilidade(acção, situação) * atributoFactor(acção, jogador)
```
- `utilidade` vem da situação: distância à bola, espaço livre no alvo, ângulo de passe, posição dos colegas (evitar dois jogadores na mesma zona: penaliza se um colega já está a < 10 m do mesmo alvo).
- `atributoFactor` = 0,7 + 0,03 × atributo relevante (ex.: `ATACAR_PROFUNDIDADE` usa movimentação sem bola e antecipação; `OFERECER_APOIO` usa trabalho de equipa e posicionamento).
- Coordenação: no máximo 1 jogador em `PRESSIONAR` por portador (2 se o estilo é Gegenpressen ou se é gatilho forte), no máximo 2 em `ATACAR_PROFUNDIDADE` ao mesmo tempo, no mínimo N em `EQUILIBRIO_DEFENSIVO` (secção 8).

### 6.3 Compromisso (anti-tremor)
- Uma acção escolhida dura pelo menos `tempoMinimoAcao` (0,8–1,5 s), excepto se a posse mudar.
- Só se troca de acção se a nova pontuação for ≥ 1,25 × a actual.
- O alvo dentro da mesma acção só é recalculado se mudar mais de 2 m.
- O desvio em relação à âncora é limitado por papel (ex.: central ≤ 12 m, extremo ≤ 20 m, liberdade posicional alta +50%).

### 6.4 Comportamento por papel (resumo)
Os papéis são os do Prompt 2. Aqui fica o que cada um faz no campo.

| Papel | Com bola na equipa | Sem bola na equipa |
|-------|-------------------|-------------------|
| GR clássico | apoio curto atrás dos centrais, joga longo se pressionado | fica perto da linha |
| GR líbero | sobe até 15–20 m, recebe e distribui | sai às bolas nas costas da linha |
| Central defensivo | fica em equilíbrio, passe seguro | marca a zona, ganha o duelo aéreo, cobre o lateral |
| Central construtor | abre-se para receber, conduz até ao meio-campo se tem espaço | igual ao defensivo, mas sobe mais com a linha |
| Lateral defensivo | dá apoio por trás, raramente passa do meio-campo | fecha o extremo adversário |
| Lateral ofensivo | dá largura e sobreposição | recupera em sprint na transição |
| Ala (linha de 3) | toda a largura, chega à linha de fundo | baixa e forma linha de 5 |
| Trinco | à frente dos centrais, equilíbrio defensivo | pressiona e fecha linhas no meio |
| Médio construtor recuado (regista) | baixa entre os centrais para receber, passe longo e mudanças de flanco | fecha o meio, não pressiona longe |
| Box-to-box | apoio e chegada à área | pressiona e recupera |
| Médio criativo | apoio frontal entre linhas, último passe | posição, pouca pressão |
| Médio de cobertura | equilíbrio no lado da bola | cobre a subida do lateral |
| 10 clássico | entre linhas, livre | fica à frente, pouco recuo |
| Segundo médio (entra na área) | chega à área atrás do avançado | recua até à linha de médios |
| Extremo clássico | largura, 1x1, cruzamento | acompanha o lateral adversário |
| Extremo invertido | parte da ala para dentro, remate e tabela | fecha por dentro |
| Finalizador | ataca a profundidade e a área | pressão leve aos centrais |
| Falso 9 | baixa para receber, abre espaço para os extremos | fecha o médio defensivo adversário |
| Pivô (homem-alvo) | referência para o passe longo, segura e entrega | pouca pressão |
| Avançado de pressão | ataca a profundidade | pressiona os centrais e o guarda-redes |

---

## 7. Decisão do portador da bola

### 7.1 Opções
`PASSE_CURTO` (< 20 m), `PASSE_PROGRESSIVO` (entre linhas ou para a frente), `PASSE_LONGO` (> 30 m, pelo ar ou rasteiro), `MUDANCA_FLANCO`, `CRUZAMENTO`, `CONDUZIR`, `DRIBLAR`, `REMATAR`, `PROTEGER` (segurar e esperar apoio), `ALIVIAR` (chutão quando pressionado na própria área).

### 7.2 Pontuação
Para cada opção (e, nos passes, para cada colega candidato):
```
valor     = V(destino) - V(origem)                  // ganho de ameaça
sucesso   = P(sucesso | distância, pressão, linhas de passe, atributos)
custo     = V_adversário(local da perda)            // o que acontece se perder
pontuação = pesoEstilo[opção] * (sucesso * valor - (1 - sucesso) * custo * aversãoRisco)
          + ruído(decisões)
```
- `V(x, y)` é um mapa de ameaça (tipo xT) em grelha 12 × 8. Fórmula de partida, afina depois com dados do próprio motor:
  `V = 0.005 + 0.30 * (x/105)^3 * (1 - 0.8 * |y - 34| / 34)`, com um reforço de +0,15 na área e +0,25 na pequena área.
- `ruído` tem desvio padrão = 0,25 × (21 − Decisões) / 20 (decisões fracas fazem escolhas piores, não aleatórias).
- `aversãoRisco` depende do estilo e do sítio: alta no próprio terço, baixa no último terço.
- Escolhe a melhor opção. Escolha aleatória ponderada (softmax com temperatura baixa) só entre as 2–3 melhores, para não haver robôs previsíveis.

### 7.3 Tempo com a bola
- O portador não decide no tick em que recebe. Tempo de decisão = `tempoBaseEstilo` (secção 8) × (1,3 − 0,02 × Decisões) × pressão. Sob pressão forte decide mais depressa e pior.
- Primeiro toque: a qualidade depende de primeiro toque, técnica e velocidade da bola. Um mau toque afasta a bola 1–3 m e dá uma janela ao defensor.
- Os jogadores com bola movem-se a 70–85% da velocidade máxima; a condução tem toques visíveis (a bola afasta-se 1–2 m e volta).

### 7.4 Probabilidade de sucesso do passe
Não sorteies o sucesso no início: simula a bola. O passe tem velocidade e trajectória; em cada tick verifica se algum adversário consegue chegar ao ponto da bola antes dela (tempo de chegada do defensor < tempo da bola + margem de antecipação). A estimativa `sucesso` da secção 7.2 é só a previsão que o portador usa para decidir (e erra conforme Visão e Decisões).
A precisão da execução aplica um erro ao destino: desvio = f(passe ou passe longo, técnica, distância, pressão, pé fraco).

---

## 8. Os 8 estilos como parâmetros

Os estilos não são código diferente: são conjuntos de pesos. O mesmo motor, com números diferentes, tem de produzir jogos visivelmente diferentes.

### 8.1 Tabela de parâmetros

| Parâmetro | Tiki-Taka | Gegenpressen | Contra-ataque | Catenaccio | Jogo Direto | Pelas Alas | Futebol Total | Bloco Médio-Baixo |
|---|---|---|---|---|---|---|---|---|
| Linha defensiva sem bola (m da baliza) | 42 | 48 | 28 | 16 | 34 | 36 | 44 | 26 |
| Linha defensiva com bola (m) | 55 | 52 | 38 | 28 | 40 | 48 | 56 | 36 |
| Comprimento do bloco sem bola (m) | 30 | 28 | 26 | 22 | 34 | 32 | 30 | 24 |
| Largura sem bola (m) | 38 | 40 | 34 | 30 | 40 | 40 | 40 | 32 |
| Largura com bola (m) | 62 | 56 | 54 | 48 | 52 | 66 | 62 | 54 |
| Deslize lateral | 0,55 | 0,65 | 0,55 | 0,45 | 0,50 | 0,55 | 0,60 | 0,60 |
| Pressão: distância de activação (m) | 14 | 22 | 8 | 6 | 12 | 12 | 16 | 9 |
| Contrapressão após perda (s) | 5 | 7 | 0 | 0 | 2 | 3 | 5 | 0 |
| Pressionantes em simultâneo | 1–2 | 2–3 | 1 | 1 | 1 | 1 | 2 | 1 |
| Tempo base com a bola (s) | 1,0 | 1,4 | 1,6 | 2,0 | 1,4 | 1,8 | 1,2 | 1,8 |
| Peso passe curto | 1,6 | 1,1 | 0,9 | 0,8 | 0,6 | 1,0 | 1,4 | 0,9 |
| Peso passe longo / directo | 0,3 | 0,8 | 1,5 | 1,3 | 2,2 | 0,9 | 0,6 | 1,2 |
| Peso cruzamento | 0,4 | 0,8 | 0,8 | 0,9 | 1,3 | 2,0 | 0,7 | 1,0 |
| Peso drible | 1,0 | 1,0 | 1,1 | 0,6 | 0,7 | 1,4 | 1,2 | 0,8 |
| Peso remate de longe | 0,5 | 0,9 | 0,9 | 0,8 | 1,1 | 0,8 | 0,8 | 1,0 |
| Aversão ao risco no próprio terço | 0,6 | 0,8 | 1,2 | 1,6 | 1,4 | 1,0 | 0,6 | 1,3 |
| Jogadores no ataque (média) | 6 | 6 | 3–4 | 2–3 | 4 | 6 | 7 | 3–4 |
| Equilíbrio defensivo mínimo | 3 | 3 | 5 | 7 | 4 | 3 | 2 | 5 |
| Marcação | zona | zona | zona | individual | zona | zona | zona | zona |
| Liberdade posicional (0–1) | 0,4 | 0,3 | 0,2 | 0,1 | 0,2 | 0,3 | 0,9 | 0,15 |
| Prefere corredor | centro | centro | alas | indiferente | centro (no ar) | alas | indiferente | alas |
| Transição def→atq: "atacar já" | 0,3 | 0,9 | 1,0 | 0,5 | 0,8 | 0,6 | 0,6 | 0,8 |

Valores de partida, tudo em config. Os atributos também mudam a execução: o mesmo estilo com jogadores fracos tem de parecer pior, não diferente.

### 8.2 Notas por estilo (o que tem de se VER no ecrã)

**1. Tiki-Taka**
- Triângulos constantes à volta da bola: sempre 2–3 colegas em `OFERECER_APOIO` a 8–15 m.
- Os centrais abrem-se e o médio organizador baixa entre eles na construção (saída a 3).
- Laterais altos e largos; extremos às vezes por dentro.
- Paciência: se não há passe progressivo bom, recicla para trás ou para o lado (o peso de reciclar é alto).
- Perde a bola → os 3–4 mais próximos fecham o portador durante 5 s.
- Fraqueza a emergir: contra um bloco baixo, muita posse lateral sem entrar na área.

**2. Gegenpressen**
- Na perda, sprint imediato de 2–3 jogadores para o portador e quem está perto fecha as linhas de passe. A linha defensiva sobe em vez de recuar.
- Se recupera, ataca a baliza em ≤ 3 passes (verticalidade alta na transição).
- Gatilhos de pressão fortes: passe para trás, receção de costas, mau primeiro toque, bola junto à linha lateral.
- Desgaste: a resistência desce 30–40% mais depressa; a partir dos 65–70 min a pressão fica atrasada e menos coordenada (atributo resistência e condição física).
- Fraqueza a emergir: bola longa por cima da pressão encontra espaço nas costas.

**3. Contra-ataque**
- Sem bola: bloco médio-baixo compacto, convida o adversário a vir.
- Ao recuperar: o primeiro passe procura a profundidade (passe longo ou progressivo para o avançado ou extremo em `ATACAR_PROFUNDIDADE`). 3–4 jogadores sobem em sprint, os outros ficam.
- Se o primeiro passe vertical não é possível em 2 s, segura e reorganiza (passa a construção com pouca gente).
- Fraqueza a emergir: em desvantagem no marcador, dificuldade em criar contra um adversário que fica atrás.

**4. Catenaccio**
- 9–10 jogadores atrás da linha da bola. Linha de 5 muito baixa, pouco espaço entre linhas.
- Marcação individual: cada defensor tem um adversário atribuído no início da fase defensiva e segue-o até um limite de zona; um líbero (central livre) cobre.
- Saída: alívio ou bola longa para 1–2 avançados. Pouca circulação.
- Fraqueza a emergir: muitos cantos, cruzamentos e remates de fora da área concedidos.

**5. Jogo Direto**
- Na construção, passe longo cedo para o pivô (homem-alvo) ou para o espaço do avançado rápido.
- Médios e o segundo avançado em `OCUPAR_AREA` versão "segunda bola": colocam-se à volta da zona onde a bola vai cair (8–12 m do pivô).
- Duelo aéreo: cabeceamento, impulsão e força contra o central. Ganho → desvio de cabeça para um colega ou para o espaço.
- Fraqueza a emergir: perde muita posse; contra centrais fortes no ar, o ataque morre.

**6. Pelas Alas**
- Largura máxima com bola. A circulação é desenhada para chegar às alas: passe interior → ala, depois 1x1 ou sobreposição do lateral.
- Cruzamentos frequentes; 3–4 jogadores em `OCUPAR_AREA` (primeiro poste, segundo poste, penálti, entrada da área).
- O meio-campo fica mais compacto e o médio de cobertura protege o lado do lateral que subiu.
- Fraqueza a emergir: contra-ataques no corredor deixado pelo lateral.

**7. Futebol Total**
- Trocas de posição: quando um jogador sai da sua zona para atacar, o colega mais próximo **ocupa a âncora dele** (troca de âncoras, não buracos). Ex.: o central conduz até ao meio-campo e o trinco baixa para a linha.
- Implementação: as âncoras são "posições" que a equipa tem de ocupar, e não propriedade fixa de cada jogador. A cada 2–3 s, a equipa reatribui jogadores às posições (problema de afectação: minimiza a distância total, com penalização para quem tem pouca adequação ao papel). A liberdade posicional controla quanto se troca.
- Exige atributos: com Decisões, Posicionamento e adequação baixos, as trocas deixam buracos (a afectação atrasa). É assim que "o sistema colapsa em caos" de forma realista.
- Fraqueza a emergir: espaço nas costas das trocas, explorado por contrapressão adversária.

**8. Bloco Médio-Baixo**
- Duas linhas de 4 juntas (ou 5-4) entre os 20 e os 45 m da própria baliza. Defesa à zona, não individual.
- Não pressiona fora do bloco: só pressiona quando a bola entra na sua zona (distância de activação curta).
- Protege a área: concede remates de fora e cruzamentos laterais, mas não o meio.
- Ao recuperar: 2–3 passes rápidos para as alas.
- Fraqueza a emergir: remates de longe e cruzamentos para avançados fortes.

---

## 9. Defesa

### 9.1 Linha defensiva
- Os 4 (ou 3/5) defensores são uma unidade: o `x` da linha é calculado uma vez e cada defensor desvia no máximo 3–4 m (excepto quem sai para pressionar ou cobrir).
- Fora-de-jogo: os avançados adversários respeitam a linha; a linha pode "subir em bloco" quando o adversário passa para trás (concentração e trabalho de equipa determinam se todos sobem a tempo).
- Bola descoberta (portador sem pressão, de frente, com espaço) → a linha recua 5–10 m.

### 9.2 Pressão
- Gatilhos (aumentam a vontade de pressionar): passe lento ou para trás, receção de costas para a baliza, primeiro toque mau, bola junto à linha lateral, adversário fraco tecnicamente.
- Estrutura: 1 pressiona (fecha a linha de passe mais perigosa com a curva de aproximação), 1 cobre, os outros fecham linhas e deslizam.
- Desarme: só quando o defensor está a < 1,5 m. Probabilidade usa desarme, agressividade e posicionamento contra drible, técnica e força, com o duelo do Prompt 2 (`0,5 + K × diferença`). Falha → o defensor perde 0,5–1 s (fica ultrapassado), a falta tem uma probabilidade ligada à agressividade.

### 9.3 Defesa da área
- Num cruzamento, cada atacante na área tem um marcador (zona ou individual, conforme o estilo). Duelo aéreo: cabeceamento, impulsão, força, posicionamento.
- O guarda-redes decide sair ou ficar (comando da área).

---

## 10. Movimento e física

### 10.1 Jogadores
- Velocidade máxima de sprint: 6,0 + 0,15 × Velocidade m/s (Velocidade 20 → 9,0 m/s).
- Aceleração: 2,5 + 0,18 × Aceleração m/s² (Aceleração 20 → 6,1 m/s²).
- Desaceleração máxima 1,5× a aceleração.
- Velocidades por intensidade: andar 1,5–2 m/s, trote 3–4,5 m/s, corrida 5–6 m/s, sprint = máximo. A maior parte do tempo os jogadores andam e trotam; o sprint é reservado a: pressionar, atacar a profundidade, recuperar em transição, perseguir uma bola solta, sobreposição.
- Viragem: a velocidade angular máxima desce com a velocidade (um jogador em sprint não muda 90° de direcção instantaneamente). Agilidade e equilíbrio melhoram isto.
- Chegada ao alvo: abranda nos últimos 2–3 m (comportamento "arrive") e não oscila à volta do ponto.
- Separação: dois colegas não ficam a menos de 3 m um do outro, excepto em duelos ou na área.
- Orientação corporal: cada jogador tem uma direcção; receber de costas é pior do que de frente.

### 10.2 Cansaço
- A condição física baixa com a distância percorrida e sobretudo com os sprints. A resistência define o ritmo da queda.
- Abaixo de 80% a velocidade máxima e a aceleração descem até 10%, e o tempo de reacção piora. Substituições automáticas usam isto.
- Valores realistas por jogo: 9–12 km por jogador de campo, 25–45 sprints.

### 10.3 Bola
- Passe rasteiro: velocidade inicial 10–25 m/s, atrito que a faz perder ~10% de velocidade por segundo (afina para que um passe de 20 m demore cerca de 1,3 s).
- Passe pelo ar e cruzamento: trajectória parabólica com altura (z). Só pode ser jogada por um jogador quando z < 2,5 m (cabeça) ou z < 1 m (pé).
- Remate: velocidade 18–32 m/s conforme finalização ou remate de longe e técnica; direcção com erro.
- A bola nunca muda de dono sem um contacto físico possível (o receptor tem de estar no ponto da bola).
- Bola solta: os jogadores mais próximos de cada equipa correm para ela; quem chega primeiro (com antecipação como bónus) ganha.

---

## 11. Jogadas-padrão por estilo

As jogadas-padrão **não são guiões**. São "intenções" que, quando o gatilho existe, sobem durante N segundos os pesos das acções de certos papéis. Se a situação deixar de servir (passe cortado, espaço fechado), a jogada é abandonada sem drama. Cada uma tem probabilidade de ser activada em config.

Formato:
```
JOGADA: nome
ESTILOS: ...
GATILHO: condição
SEQUÊNCIA: passo 1 → passo 2 → ...
DURAÇÃO: s
```

### Tiki-Taka
1. **Saída a 3** — Gatilho: GR ou central com a bola e pressão adversária com 2 avançados. Sequência: MDC baixa entre os centrais → centrais abrem para os lados da área → laterais sobem para a altura dos médios → passe para o central livre → passe ao médio que aparece entre linhas. 8 s.
2. **Terceiro homem** — Gatilho: médio com a bola, avançado de costas para a baliza pressionado. Sequência: passe vertical ao avançado → avançado devolve de primeira a um médio de frente → médio passa a um extremo ou lateral que já está em profundidade. 4 s.
3. **Atrair e mudar** — Gatilho: 3+ adversários do lado da bola. Sequência: 4–6 passes curtos do mesmo lado → passe de mudança para o lado fraco (lateral ou extremo aberto) → 1x1 ou cruzamento atrasado. 10 s.
4. **Tabela à entrada da área** — Gatilho: MO ou extremo invertido com a bola na entrada da área. Sequência: passe ao avançado → desmarcação para a área → devolução de primeira → remate. 3 s.

### Gegenpressen
1. **Recuperar e atacar** — Gatilho: recuperação a menos de 40 m da baliza adversária. Sequência: passe vertical imediato → avançado e extremos atacam a área → remate em ≤ 3 passes. 6 s.
2. **Armadilha na linha** — Gatilho: passe adversário para o lateral junto à linha. Sequência: extremo pressiona de dentro para fora → médio fecha a linha de passe interior → lateral fecha a linha de passe vertical → desarme ou bola fora. 5 s.
3. **Pressão ao passe para trás** — Gatilho: adversário passa ao central ou ao GR. Sequência: avançado sprinta curvando para cortar o passe ao outro central → médios saltam para os médios adversários → passe longo forçado. 5 s.

### Contra-ataque
1. **Profundidade imediata** — Gatilho: recuperação no próprio meio-campo com o avançado em linha com o último defensor. Sequência: primeiro passe longo para o espaço do avançado ou extremo → condução em velocidade → remate ou cruzamento atrasado ao segundo que chega. 8 s.
2. **Saída pelo extremo** — Gatilho: recuperação no corredor lateral. Sequência: passe ao extremo aberto → extremo conduz → avançado ataca o primeiro poste, médio a entrada da área → cruzamento rasteiro. 8 s.
3. **Isca e explosão** — Gatilho: adversário com 7+ jogadores no meio-campo ofensivo. Sequência: o bloco recua ainda mais 3–5 m (convida) → recuperação → passe longo directo nas costas da linha adversária. 10 s.

### Catenaccio
1. **Alívio orientado** — Gatilho: bola recuperada no próprio terço. Sequência: chutão ou passe longo para o avançado → avançado segura e protege à espera do 2.º avançado → remate isolado ou falta ganha. 6 s.
2. **Marcar e libertar** — Gatilho: cruzamento adversário. Sequência: cada defensor marca o seu homem → o líbero ataca a primeira bola → alívio para longe e a linha sobe 10 m. 4 s.
3. **Bola parada ofensiva** — Gatilho: canto ou livre lateral a favor. Sequência: 4 jogadores na área (centrais incluídos) → cruzamento ao segundo poste → cabeceamento. Os restantes ficam para trás. Bola parada.

### Jogo Direto
1. **Bola no pivô** — Gatilho: posse na própria metade. Sequência: passe longo ao pivô → pivô cabeceia ou amortece para o segundo avançado ou médio → remate ou passe de rutura. 6 s.
2. **Segunda bola** — Gatilho: duelo aéreo do pivô. Sequência: 2–3 médios cercam a zona de queda → quem ganha a segunda bola remata de longe ou lança o avançado rápido. 4 s.
3. **Nas costas da linha** — Gatilho: linha defensiva adversária alta (> 40 m). Sequência: avançado rápido em linha com o último defensor → passe longo por cima → corrida de 1x1 com o GR. 6 s.

### Pelas Alas
1. **Sobreposição** — Gatilho: extremo com a bola na ala, lateral atrás e livre. Sequência: extremo conduz para dentro → lateral passa por fora em sprint → passe ao lateral → cruzamento. 6 s.
2. **Cruzamento ao segundo poste** — Gatilho: bola na ala no último terço. Sequência: avançado ataca o primeiro poste (arrasta o central) → extremo do lado oposto ataca o segundo poste → médio na entrada da área → cruzamento tenso. 4 s.
3. **Linha de fundo e atrasar** — Gatilho: extremo ultrapassa o lateral no 1x1. Sequência: conduz até à linha de fundo → passe rasteiro atrasado para a marca de penálti → médio que chega remata. 4 s.
4. **Mudança de flanco** — Gatilho: bloco adversário deslocado para um lado. Sequência: médio recebe ao centro → passe longo diagonal para o lado oposto → 1x1 do extremo. 6 s.

### Futebol Total
1. **Central que sobe** — Gatilho: central com a bola e espaço à frente. Sequência: central conduz até ao meio-campo → trinco ocupa a posição do central → médio ocupa a do trinco → central passa e fica como médio até à próxima reatribuição. 10 s.
2. **Rotação na ala** — Gatilho: extremo com a bola marcado de perto. Sequência: extremo vem para dentro → lateral ocupa a ala → médio do mesmo lado entra na zona do extremo → passe ao jogador que ficou livre. 6 s.
3. **Falso 9 e invasão** — Gatilho: falso 9 baixa com o central adversário atrás dele. Sequência: falso 9 recebe entre linhas → os dois extremos atacam por dentro o espaço que o central deixou → passe de rutura. 5 s.

### Bloco Médio-Baixo
1. **Fechar o meio e saltar** — Gatilho: passe adversário para o médio central entre as linhas. Sequência: o médio mais próximo salta da linha → os outros 3 fecham o espaço → recuperação → passe rápido para a ala. 5 s.
2. **Saída em 3 passes** — Gatilho: recuperação no próprio terço. Sequência: passe curto ao médio → passe ao extremo aberto → condução em velocidade ou passe ao avançado. 8 s.
3. **Empurrar para fora** — Gatilho: adversário com a bola no corredor central do meio-campo. Sequência: o bloco desliza de modo a deixar só o passe para a ala livre → pressão na ala com a linha lateral como "defensor extra". 6 s.

### Bolas paradas (todos os estilos)
- Cantos: 4 variantes (primeiro poste, segundo poste, curto, à entrada da área), escolhidas pelos atributos dos jogadores (quem cabeceia melhor vai à zona de maior perigo).
- Livres directos a < 28 m: remate (bolas paradas, remate de longe) ou cruzamento.
- Lançamentos laterais: curtos na maioria; longo para a área só se houver um jogador com essa característica.
- Defesa de cantos: mista (zona com 3–4 + individual nos melhores cabeceadores) por defeito; Catenaccio usa individual pura.

---

## 12. Validação: estatísticas-alvo

Cria um teste headless que simula 200 jogos entre duas equipas iguais (força média) e jogos estilo vs estilo, e compara com estas faixas (valores reais aproximados de ligas de topo, por equipa e por jogo, salvo indicação):

| Métrica | Alvo |
|---|---|
| Golos (total do jogo) | 2,5–3,0 |
| Remates | 10–15 |
| Remates enquadrados | 3,5–5,5 |
| Passes | 350–650 |
| Precisão de passe | 75–89% |
| Cruzamentos | 12–22 |
| Cantos | 4–6 |
| Faltas | 10–14 |
| Foras-de-jogo | 1–3 |
| Distância por jogador de campo | 9–12 km |
| Posse com bola por sequência (mediana) | 3–5 passes |

Faixas por estilo (contra um adversário neutro de força igual):

| Estilo | Posse | Passes | Particularidade |
|---|---|---|---|
| Tiki-Taka | 60–70% | 600–800 | precisão > 87%, poucos passes longos (< 7%) |
| Gegenpressen | 52–58% | 450–600 | recuperações no terço ofensivo 2x a média; quebra física depois dos 70 min |
| Contra-ataque | 35–42% | 280–400 | maior % de remates após transição (> 35%) |
| Catenaccio | 30–38% | 250–350 | golos sofridos baixos, muitos cantos concedidos |
| Jogo Direto | 40–48% | 300–420 | passes longos > 18%, duelos aéreos 2x a média |
| Pelas Alas | 50–56% | 450–550 | cruzamentos 25+ |
| Futebol Total | 58–66% | 550–700 | maior variância de resultados com plantel fraco |
| Bloco Médio-Baixo | 38–45% | 300–420 | muitos remates sofridos de fora da área |

As vantagens entre estilos ("contra") **não se codificam como bónus**. Têm de emergir do comportamento. Usa a tabela de "contras" dos estilos só como teste: por exemplo, Jogo Direto contra Gegenpressen deve gerar mais oportunidades por bola longa do que Jogo Direto contra Catenaccio. Se um confronto não mostrar o efeito esperado, diz-me qual é e porquê antes de forçar.

Testes visuais (para eu aprovar a olho, com gravação ou modo replay):
- Em 2 min de jogo em velocidade 0,5x, nenhum jogador treme, ziguezagueia ou atravessa colegas.
- Em DEF_ORGANIZADA, o bloco desliza com a bola como uma unidade e as linhas mantêm-se paralelas.
- Consigo reconhecer o estilo de cada equipa sem olhar para os nomes.

---

## 13. Plano de implementação por fases

Cada fase acaba com uma PARAGEM: mostras-me o resultado (ecrã de teste e números) e esperas a minha aprovação.

**Fase 1 — Formações e bloco (sem bola real).** A bola é um ponto que eu arrasto com o rato ou que se move num caminho pré-definido. As duas equipas assumem a forma certa, deslizam com a bola, mudam entre formas `semBola` e `comBola` quando eu troco a posse com um botão. Física dos jogadores (secção 10.1) já completa.
*Critério:* parece uma equipa organizada, sem tremores.

**Fase 2 — Bola e passes simples.** Bola com física (10.3). O portador só faz passes curtos para o colega com melhor linha de passe. Os outros só fazem `MANTER_POSICAO` e `OFERECER_APOIO`. Intercepções pela trajectória.
*Critério:* a bola circula em triângulos de forma credível.

**Fase 3 — Decisão completa e acções sem bola.** Todas as opções do portador (secção 7) e todas as acções sem bola (secção 6), com compromisso. Fases do jogo e transições. Pressão e desarmes.
*Critério:* dá para ver construção, ataque, perda, transição e defesa organizada.

**Fase 4 — Estilos.** Os 8 estilos como parâmetros (secção 8). Futebol Total com reatribuição de posições.
*Critério:* reconheço os 8 estilos num jogo; os testes estatísticos por estilo estão dentro das faixas.

**Fase 5 — Remates, bolas paradas, jogadas-padrão, cansaço e compressão de tempo.** Secções 2.2, 10.2, 11. Relatos e estatísticas ao vivo.
*Critério:* o teste de 200 jogos passa e um jogo dura 15 min (±1) a 1x.

**Fase 6 — Integração e calibração.** Liga o motor 2D ao modo detalhado do jogo do utilizador. Confirma que os resultados batem com a simulação rápida (médias de golos e distribuição de resultados por diferença de força). Os testes antigos continuam verdes.

---

## 14. Desempenho

- 22 jogadores + bola a 10 Hz é barato. O caro é a avaliação de passes (cada portador × 10 colegas × verificação de intercepção). Limita: só avalia os 6 colegas mais promissores por distância e ângulo.
- Os pedidos de decisão sem bola são desfasados (cada jogador num tick diferente).
- Alvo: um jogo completo em headless em < 1,5 s em Node (para os testes de 200 jogos serem rápidos), e renderização estável a 60 fps num iPhone médio.

---

## 15. Glossário rápido

- **Âncora**: posição que um jogador deve ocupar dentro do bloco da equipa.
- **Bloco**: a forma colectiva da equipa (altura, largura, comprimento).
- **Bola coberta / descoberta**: portador sob pressão / livre e de frente; define se a linha sobe ou baixa.
- **Equilíbrio defensivo (rest defense)**: jogadores que ficam atrás da bola enquanto a equipa ataca.
- **Contrapressão**: pressão imediata depois de perder a bola.
- **Terceiro homem**: passe a um colega que devolve de primeira a um terceiro jogador, que está de frente.
- **xT / mapa de ameaça**: valor de cada zona do campo como probabilidade de levar a golo.
