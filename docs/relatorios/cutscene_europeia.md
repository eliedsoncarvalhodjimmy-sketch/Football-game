# Prompt 11 — Cutscene europeia (Champions League e Liga Europa)

> Relatório final (Bloco 7). Cutscene animada em canvas 2D (sem vídeo), portada tal como estava do protótipo aprovado `cutscene-realista/index.html`, com os dados reais do jogo e integrada na transição para um dia europeu do clube do utilizador.

## Linhas de tempo finais (sem alterações ao protótipo aprovado)

### Champions League (38 s) — `src/cutscene/timelines/champions.ts`

| Acto | Início–fim (s) | O que mostra |
|---|---|---|
| `fundo` | 0 – 1,5 | Fotografia do estádio a aparecer, feixes de luz a oscilar |
| `marca` | 5 – 8,5 | A bola da Champions surge com brilho e partículas |
| `marcaSobe` | 10 – 13 | A bola sobe e transforma-se no logótipo, já no topo |
| `fase` | 12,5 – 15 | "Oitavos de final · 1.ª mão" (ou a fase real do jogo) |
| `painel` | 14 – 16 | Painel de resultados (gradiente azul/violeta, bola a repetir) |
| `home` | 16 – 19,5 | Escudo do clube do utilizador, a entrar pela esquerda |
| `away` | 21 – 24,5 | Escudo do adversário, a entrar pela direita |
| `vs` | 24 – 27 | "VS" ao centro |
| `estadio` / `trofeu` | 29 – 33 | Nome do estádio; troféu a emergir em modo "ecrã" |
| `climax` | 33 – 37 | Escudos e marca juntos, flash, abanão, partículas e feixes |
| `fade` | 37 – 38 | Fade para o dia de jogo |

### Liga Europa (38 s) — `src/cutscene/timelines/europa.ts`

| Acto | Início–fim (s) | O que mostra |
|---|---|---|
| `faixas` | 0 – 6 | Faixas laranja angulares a cruzar o ecrã |
| `fundo` | 0,5 – 3 | Troféu em fotografia (herói), escurecimento progressivo |
| `marca` | 9 – 12 | Logótipo com brilho e estalo de luz |
| `fase` | 12,5 – 15,5 | Fase e jogo (ex.: "Play-off · 2.ª mão") |
| `painel` | 18 – 20 | Painel preto com linhas laranja e chevrons |
| `home` / `away` | 20 – 23 | Os dois escudos a entrar em simultâneo |
| `vs` | 22,5 – 25 | "VS" ao centro |
| `estadio` | 27 – 30 | Faixa de multidão (estádio) |
| `climax` | 33 – 37 | Flash laranja, escudos e marca juntos |
| `fade` | 37,5 – 38 | Fade para o dia de jogo |

Confirmado por teste automático (`tests/cutscene.test.ts`): nenhum acto fora de 0–38 s em nenhuma das duas; os actos de conteúdo (fase → escudos → estádio) entram pela ordem de leitura, sem overlaps que os escondam.

## Desempenho (Bloco 6)

- **Alvo:** 60 fps; **modo leve automático** abaixo de 40 fps (média de 20 frames, ignora o 1.º segundo de arranque e soluços isolados de 1 frame), e fica assim até ao fim dessa cutscene. Desliga partículas, feixes/raios de luz e brilhos; mantém fotografias, logótipo, escudos, texto e painel.
- **fps real medido num dispositivo:** **não medido** — este ambiente não tem um tablet físico nem um browser com GPU real a sério. A lógica foi confirmada de duas formas: (1) testes automáticos do `MedidorDesempenho` (puro, `tests/cutscene.test.ts`); (2) verificação visual no Chromium headless (Playwright) forçando `limiteFps` muito alto para o modo leve activar ao fim de ~1 s — confirma-se por `console.info` e pelas capturas (feixes de luz desaparecem; o resto fica).
- **Peso:**
  - Código (Blocos 1–6, módulo `src/cutscene/` + invólucro): ≈ 25 KB por minificar/≈ 9 KB comprimido no bundle de produção (`dist/assets/europa-*.js`) — bem abaixo do limite de 100 KB.
  - Imagens: Champions ≈ 272 KB (`cl_estadio.jpg`, `cl_trofeu.jpg`, `cl_bola.png`, `cl_logo.png`); Liga Europa ≈ 120 KB (`el_trofeu.jpg`, `el_multidao.jpg`, `el_logo.png`) — ambas bem abaixo do limite de 600 KB por competição.
  - Carregamento: só ao abrir a cutscene ("na véspera do dia europeu"), nunca na instalação; liberta-se tudo (fotografias e escudo real) ao fechar.

## Escudos dos clubes

- **Clubes com escudo próprio (imagem real): 0.** Nenhum ficheiro foi ainda colocado em `assets/escudos-fonte/` (pasta do utilizador, fora do git) — `public/escudos/escudos.json` está vazio (`{}`). Todos os clubes usam o escudo genérico (cor principal + sigla), desenhado tal como no protótipo aprovado.
- Nota à parte (não é um problema desta cutscene): neste ramo, `packs/*/clubes.csv` tem só o cabeçalho, sem clubes reais ainda (pendência conhecida de prompts anteriores — Prompt 6B). Quando os pacotes reais entrarem e o utilizador fornecer imagens em `assets/escudos-fonte/`, basta correr `npx tsx scripts/cutscene/gerar-escudos.ts` para gerar `public/escudos/escudos.json` e os `.webp` comprimidos; o script já reporta quantos clubes ficaram sem imagem e quais ficheiros fornecidos não combinaram com nenhum clube.

## O que não foi testado num dispositivo real

- **fps real** num telemóvel/tablet a sério (só medido em Chromium headless, sem GPU dedicada).
- **Desbloqueio de áudio em iOS/Android** e pausa/retoma em segundo plano (herdado do Prompt 10 — mesma limitação já registada em `DECISIONS.md`).
- **Uma noite europeia a sério, jogada manualmente** por uma pessoa num browser (com um save real, tocando no ecrã, saltando a meio): a verificação feita foi com dados de exemplo (`test-cutscene/`) e por automação (Playwright, 6 instantes fixos por competição); nunca à mão, num dispositivo físico.
- **`src/cutscene/motor.ts` (a classe `Cutscene`) em testes automáticos**: precisa de um `<canvas>` a sério (sem jsdom nem Playwright neste projecto como dependência) — só verificado manualmente em `test-cutscene/`.

## Testes automáticos (`tests/cutscene.test.ts`, 37 testes)

- dados puros da chave do motor (fase, mão, "champions"≠"europa"); integridade das duas linhas de tempo; ordem dos actos de conteúdo;
- relógio mestre (áudio quando toca, `performance.now()` sem som — mesma duração em ambos os casos);
- ligação de escudos reais a clubes por nome normalizado (`combinarEscudos`), com e sem ficheiros;
- geometria do ecrã (Champions com lockup maior do que a Liga Europa; cresce com o ecrã);
- `chaveFaseCutscene`/`primeiraDaFase`: ida e volta da mesma eliminatória contam como a mesma fase; jornadas da fase de liga idem; Champions ≠ Liga Europa; competições sem cutscene dão `null`;
- frequência (`lerFrequenciaCutscene`/`gravarFrequenciaCutscene`/`deveMostrarCutscene`/`devoAbrirCutscene`): por defeito, inválida, armazenamento bloqueado, as 3 políticas, e nunca abre sem dados completos (estádio/escudos/fase em falta);
- modo leve (`MedidorDesempenho`): 60 fps nunca activa; 25 fps sustentados activa e fica; um soluço isolado não activa; arranque ignorado;
- saltar corta a cutscene e o áudio (o `aoAcabar` do `AudioManager.tocarCutscene` é chamado, mesmo sem o áudio ter acabado sozinho);
- regras de ouro: o motor de simulação, o motor 2D, o mercado, os prémios e os jogadores nunca importam de `src/cutscene/`; os ficheiros de dados/linha de tempo/elementos comuns são puros (nunca tocam em `<canvas>` nem em `document`).

Suite completa do projecto: **354 testes, todos a passar** (tempo de simulação semanal continua dentro do orçamento conhecido — as mudanças de desempenho adicionadas em `Sessao.resumo()`/`vistaJogo2D()` são apenas alguns `parseChave`/comparações de texto sobre um dicionário pequeno, sem impacto mensurável).

## Verificação visual

Capturas feitas em Chromium headless (Playwright) com dados de exemplo em `test-cutscene/`, nos 6 instantes pedidos (0 s, 7 s, 12 s, 18 s, 24 s, 35 s), para Champions e Liga Europa, incluindo o modo leve forçado. Enviadas ao utilizador durante os Blocos 3/4; nada mudou visualmente desde então, excepto o pedido explícito de tirar a cidade e a hora do rodapé (fica só o nome do estádio).
