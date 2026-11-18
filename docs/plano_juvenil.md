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

### 2. Intake anual de 6 a 12 jovens por clube (resposta: mantém)
- Em Junho entram 6 a 12 jovens de 15–16 anos por clube, directamente no Sub-18.
  - O volume depende do nível da academia e do Recrutamento, como hoje.
  - O potencial médio não muda.
- O relatório do intake é simples: posição, idade, altura, peso, OVR e PT em intervalo, e uma palavra de personalidade.
  - A largura do intervalo depende do Chefe de Desenvolvimento Juvenil.
  - O intervalo estreita com os jogos.
- Sem a camada de prospectos, o Sub-18 (15–18 anos) recebe cerca de 9 jovens por ano, ao longo de 4 idades. Ver a pergunta 1.

### 3. Ligas Sub-18 e Sub-21 em todos os países do mundo (resposta)
- **1.ª e 2.ª divisão juntas** numa só liga por escalão (ex.: Portugal tem 18 + 18 = 36 clubes).
  - Todos contra todos a uma volta: n − 1 jornadas, 35 em Portugal e 43 em Inglaterra.
  - Os **8 primeiros vão ao playoff**: quartos de final (1–8, 4–5, 2–7, 3–6) e meias-finais a uma mão em casa do melhor classificado, final em campo neutro.
  - As jornadas encaixam nas semanas de Agosto a Abril; o playoff joga-se em Maio. Com 43 jornadas, há semanas com duas jornadas.
- **3.ª e 4.ª divisão:** amigáveis semanais entre clubes do mesmo país, sem tabela. Dão minutos e entram na evolução.
- Países com uma só divisão no jogo: liga só com essa divisão, com a mesma regra do playoff.
- Os jogos são simulados com o simulador rápido, sem tácticas.
  - O onze é escolhido automaticamente entre os jogadores do escalão.
  - Entram o estilo do treinador do escalão e o "trabalho com jovens".
- O jogo guarda a classificação, os resultados, o playoff e, por jogador, jogos, golos, assistências e nota. O histórico guarda os campeões.
- Os minutos reais substituem os `MINUTOS_JUVENIS` fixos na evolução.
- Desempenho: meço o custo semanal. Se passar de +30%, simulo só o resultado, sem lances, e distribuo golos e notas pelos jogadores.

### 4. Missões do olheiro de jovens
- **Mapa-mundo interactivo.** São elegíveis os países do mapa enviado, mais Angola, Senegal, Camarões e Costa do Marfim (73 países; a lista está em `ELEGIVEIS` no protótipo).
  - Os outros países aparecem a cinzento, sem rede de scouting.
  - Há zoom por região (Europa, Américas, África, Ásia e Oceânia) e uma lista equivalente para teclado e acessibilidade.
- Escolhes a posição (Todas, GR, Defesas, Médios ou Avançados) e a duração: **2, 4, 8 ou 12 semanas**.
- **Custo por semana (clube na Europa):**

  | Zona | Custo por semana |
  | --- | --- |
  | Próprio país | €1.500 |
  | África | €2.000 |
  | Américas | €2.500 |
  | Europa | €3.000 |
  | Médio Oriente | €3.500 |
  | Ásia e Oceânia | €4.500 |

  - Para clubes de outros continentes, a tabela é relativa: o próprio continente é a zona barata seguinte ao próprio país.
- O relatório traz 2 a 10 nomes, com mais nomes para mais `scout_quantidade` e mais semanas.
  - Os intervalos são mais estreitos com mais `avaliacao`.
  - A `adaptabilidade` reduz a perda de precisão fora da região do olheiro.
- Cada nome mostra a posição, a data de nascimento, a altura, o peso, OVR e PT em intervalo, o clube e, se houver, a qualidade típica em que se destaca.
- Os nomes são jovens reais do mundo, dos escalões dos clubes desse país. Contratar abre a negociação com compensação de formação.
- Há 1 missão por olheiro de jovens, ou seja, 0 a 3 em simultâneo (resposta: concordo).

### 4b. Perfil típico de cada país (tendência, não regra)
- **Atributos.** Cada país tem 3 qualidades típicas. Um jovem gerado nesse país recebe +1 a +3 nos atributos ligados a essas qualidades, com probabilidade de cerca de 60%.
  - O OVR médio não sobe: a soma é compensada nos outros atributos.
  - Cerca de 40% dos jovens não seguem o perfil.
- **Rostos.** Cada país aponta para uma região de rosto (tom de pele, cabelo, traços): europa_sul, europa_norte, africa, lusofonia_africa, america_sul, america_central, norte_africa, asia_leste, asia_sul e mundo.
  - Sempre com variação: o tom de pele é uma distribuição, não um valor fixo.
- **Nomes.** Os nomes vêm da língua do país.
- A proposta de perfis está em `PERFIS_PAIS` no protótipo. Exemplos:
  - Brasil: Técnica, Drible e Criatividade;
  - Espanha: Passe, Visão e Técnica;
  - Itália: Posicionamento, Marcação e Decisões;
  - África Ocidental: Força, Velocidade e Explosão;
  - nórdicos: Força, Cabeceamento e Trabalho;
  - Japão: Técnica, Trabalho e Disciplina.
- Vai para `src/config/paises.ts` (perfil, região do rosto e língua por país) e é aplicado em `src/players/` na geração dos jovens.

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

## Respostas (Paragem 1)
- O intake mantém-se em 6 a 12 por clube, conforme a academia e o Recrutamento.
- Ligas em todos os países: 1.ª e 2.ª divisão juntas a uma volta e playoff dos 8 primeiros; 3.ª e 4.ª divisão com amigáveis semanais.
- Missões de 2, 4, 8 ou 12 semanas. Os custos são aceites; África e Américas mais baratas a partir da Europa.
- 1 missão por olheiro de jovens.
- Mapa interactivo com os países elegíveis e perfil típico por país (atributos e rostos).

## Respostas (Paragem 2)
- Sub-18 com máximo 30; o gestor da academia propõe libertar o excedente na passagem de época (opção a).
- Perfis por país: sem correcções.
- Elegíveis: retirar Guatemala, Honduras e El Salvador; não acrescentar ilhas pequenas.

## Estado: implementado no motor
- Bloco 1 (cadeia, intake, excedente, relatório do intake): `src/academia/academia.ts`, `src/config/academia.ts` — DECISIONS 168.
- Bloco 2 (ligas Sub-18 e Sub-21, playoff, amigáveis, minutos reais): `src/academia/ligasJuvenis.ts` — DECISIONS 169.
- Bloco 3 (missões, elegíveis, perfis por país): `src/scouting/missoesJovens.ts`, `src/config/scoutingJovem.ts` — DECISIONS 170.
- Testes: `tests/academia.test.ts`, `tests/ligasJuvenis.test.ts`, `tests/missoesJovens.test.ts`.
- Falta a ligação à interface real (Prompt 5): os ecrãs do protótipo já mostram o que o motor fornece.
