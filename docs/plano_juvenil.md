# Plano — sistema juvenil (Intake → Sub-18 → Sub-21 → equipa principal)

Protótipo: Academia e Recrutamento › Academia (separadores **Percurso**, **Intake** e **Competições**) e Departamento de scouting › **Missões do olheiro de jovens**.

## O que muda no motor

### 1. Cadeia única, sem a camada de prospectos
- Saem de `src/academia/academia.ts`: a lista `prospectos`, o `agregado` (as faixas de qualidade), a shortlist, o "despontar" e o corte relativo (`PROSPECTOS` em `src/config/academia.ts`).
- Ficam os dois escalões, cada um com o máximo de 18 jogadores:
  - **Sub-18** (15–18 anos): recebe o intake.
  - **Sub-21** (19–21 anos): recebe quem sobe do Sub-18 e quem não tem lugar na equipa principal.
- Aos 22 anos, o jogador sobe à principal, é vendido ou é libertado. Isto mantém o que já existe em `PROMOCAO`.
- O contrato profissional aos 18 (`CONTRATO_JUNIOR`) não muda.

### 2. Intake anual de 3 a 5 jovens por clube
- Em Junho entram 3 a 5 jovens de 15–16 anos por clube, directamente no Sub-18. Hoje são 6 a 12, e vão para os prospectos.
- O volume dentro de 3–5 depende da academia, da reputação e da dimensão do país. Esta fórmula já existe.
- O potencial sobe para compensar o menor volume, e é recalibrado com uma corrida longa (ver ponto 6).
- O relatório do intake é simples: posição, idade, altura, peso, OVR e PT em intervalo, e uma palavra de personalidade.
  - A largura do intervalo depende da avaliação do Chefe de Desenvolvimento Juvenil (`avaliacao_potencial` e `avaliacao_habilidade`).
  - O intervalo estreita com os jogos.
- Se o Sub-18 estiver cheio, o gestor da academia propõe libertar os mais fracos. No caso da IA, isto é automático.

### 3. Ligas Sub-18 e Sub-21
- Há uma liga Sub-18 e uma liga Sub-21 para cada divisão principal simulada, com os mesmos clubes da 1.ª divisão.
  - Os clubes das divisões inferiores ficam numa liga juvenil regional agregada por país, sem tabela visível.
- Os jogos são simulados em segundo plano com o simulador rápido (`prepararLados` com o onze mais forte do escalão), sem tácticas.
  - O estilo do treinador Sub-18 e do treinador Sub-21 entra pelo efeito de estilo já existente.
- O jogo guarda a classificação, os resultados por jornada e, por jogador, jogos, golos, assistências e nota.
- Os minutos reais nestas ligas substituem os `MINUTOS_JUVENIS` fixos na fórmula de evolução.
  - O nível de competição é a força média da liga.
  - Quem não joga evolui menos, tal como na equipa principal.
- Custo de desempenho: com cerca de 2 × (n.º de 1.ªs divisões) ligas de 18 clubes, a semana fica perto de +30% de jogos rápidos. Vou medir isto. Se pesar demasiado, simulo só o resultado e distribuo os golos pelos jogadores, sem lances.

### 4. Missões do olheiro de jovens
- Escolhes o país, a posição (Todas, GR, Defesas, Médios ou Avançados) e a duração (2, 4 ou 8 semanas).
- O custo depende do país (deslocação) e da duração.
- No fim da missão chega um relatório com 2 a 10 nomes:
  - mais nomes com mais `scout_quantidade` e mais semanas;
  - intervalos mais estreitos com mais `avaliacao`;
  - menos perda de qualidade fora da região de origem com `adaptabilidade`.
- Cada nome mostra a posição, a data de nascimento, a altura, o peso, o OVR e o PT em intervalo, e o clube actual.
- Os nomes são jovens reais do mundo, dos Sub-18 e Sub-21 dos clubes desse país. O botão **Contratar** abre a negociação já existente, com compensação de formação.
- Cada olheiro de jovens faz uma missão de cada vez (0–3 olheiros, ou seja, 0–3 missões em simultâneo). Sem olheiros de jovens, não há missões.

### 5. O que se mantém
- O aliciamento (`ALICIAMENTO`): agora incide sobre jovens do Sub-18 com potencial alto.
- A compensação de formação (`COMPENSACAO`).
- A força juvenil por país (`FORCA_JUVENIL`).
- A tabela de talento do mundo (`TABELA_JOVENS`).

### 6. Recalibração
- Faço uma corrida de 20 épocas antes e depois da mudança e comparo:
  - a distribuição de OVR e PT dos jovens, contra a `TABELA_JOVENS`;
  - o OVR médio por liga ao longo das épocas;
  - o número de jogadores de 85+ e de 90+ no mundo;
  - as calibrações de jogo, que não devem mudar.
- Fica registado em `DECISIONS.md`.

### 7. Interface
- Na Academia, o separador **Percurso** mostra a cadeia, os jogadores "Prontos para subir" (sugestões do gestor com o botão Promover) e as decisões da época (contratos aos 18 e saídas aos 22).
- O separador **Intake** mostra a caixa de 3–5 jovens.
- O separador **Competições** mostra a Liga Sub-18 e a Liga Sub-21, cada uma com Classificação, Resultados e Estatísticas.
- No Scouting ficam as missões do olheiro de jovens.

## Perguntas (PARAGEM)
1. **Intake 3–5:** confirmas a descida de 6–12 para 3–5 por clube, com o potencial recalibrado para o mundo manter o mesmo número de craques?
2. **Ligas juvenis:** devem existir para todos os países com liga no jogo (só a 1.ª divisão, com as outras agregadas), ou só para o país do teu clube?
3. **Missões:** concordas com 2, 4 ou 8 semanas e com um custo de €1.500 a €4.500 por semana, conforme o país?
4. **Missões em simultâneo:** uma por cada olheiro de jovens (0–3)?
