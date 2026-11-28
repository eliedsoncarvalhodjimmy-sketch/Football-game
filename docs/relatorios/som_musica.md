# Prompt 10 — Som e música (relatório final)

> Blocos 2–6. Bloco 0/1 (diagnóstico e núcleo do `AudioManager`) já estavam feitos e aprovados (`DECISIONS.md` 212).

## Sons presentes vs. em falta

**Presentes** (`public/audio/audio.json`, gerados por `scripts/audio/preparar.ts` a partir de `assets/audio-fonte/`):

| Id | Categoria | Duração | Peso |
|---|---|---|---|
| `amb_estadio_cheio` | ambiente | 25,7 s | 401 KB |
| `amb_imprensa` | ambiente | 59,0 s | 692 KB |
| `cut_champions` | cutscene | 38,5 s | 602 KB |
| `cut_europa` | cutscene | 37,8 s | 591 KB |
| `mus_menu` | música | 234,6 s | 3 666 KB |
| `mus_gestao_1` | música | 189,9 s | 2 967 KB |
| `mus_gestao_2` | música | 207,3 s | 3 239 KB |
| `mus_gestao_3` | música | 214,6 s | 3 354 KB |
| `mus_gestao_4` | música | 197,3 s | 3 084 KB |

**Peso total: 18,16 MB** (orçamento: ambientes ≤ 800 KB cada ✓; cutscenes ≤ 1 MB cada ✓; músicas ≤ 5 MB cada ✓; pacote ≤ 30 MB ✓).

**Em falta do catálogo fixo** (silêncio nesses ids, por ordem de impacto no que se perde):
1. **`mus_gestao_5`** — a playlist de gestão fica com 4 faixas em vez de 5; impacto baixo (ainda varia).
2. **`amb_estadio_tensao`** — sem crossfade de tensão nas ocasiões de golo; o estádio fica sempre no ambiente normal (cheio/vazio). O código já está pronto (`src/ui/jogo2d.ts`), só falta o ficheiro.
3. **`amb_estadio_vazio`** — jogos de pouca gente soam como `amb_estadio_cheio`, só mais baixo (fallback já implementado, Bloco 3).
4. **`mus_partida`** — contexto "partida" nunca usado (a spec marca-o como opcional); durante o jogo 2D não há música de fundo própria, só o ambiente do estádio (como pedido).

**Fora do catálogo, de propósito** (`assets/audio-fonte/extras/`): `extra_torcida_festa.mp3` — avisado pelo script, nunca processado nem usado.

## Eventos ligados (Bloco 3)

| Evento | Som | Onde |
|---|---|---|
| Início do jogo do utilizador no motor 2D | `amb_estadio_cheio` (volume mais baixo se lotação < 25%; +12,5% se jogo europeu) | `src/ui/jogo2d.ts` |
| Golo | `amb_estadio_tensao` por 6 s, depois volta ao normal | `src/ui/jogo2d.ts` (sem ficheiro ainda: sem efeito audível, mas ligado) |
| Fim do jogo | ambiente desvanece; música de gestão volta a subir | `src/ui/jogo2d.ts` |
| Transição para dia europeu (Champions/Liga Europa) | `cut_champions`/`cut_europa`, música e ambiente baixam e voltam a subir no fim | `src/ui/app.ts` (Prompt 11, já existia) |
| Entrar/sair do menu vs. da carreira | `mus_menu` vs. a playlist de gestão | `src/ui/app.ts` (`entrarMenu`/`entrarGestao`) |

**Por ligar (sem ecrã no jogo para o evento acontecer)**: a conferência de imprensa (`amb_imprensa`, com a música a baixar para 20%) — só existe o validador de guiões (`src/imprensa/guioes.ts`), não um ecrã; fica pronto a ligar (`AUDIO.fade.imprensa_*` já configurado) assim que esse ecrã existir.

## Música (Bloco 4)

Playlist de gestão (`src/audio/playlist.ts`, `PlaylistGestao`): ordem aleatória sem repetir até todas tocarem, pausa de 5–15 s entre faixas, reembaralha ao fim de uma volta; uma só faixa nunca pára (toca, acaba, volta a tocar); sem faixas, silêncio. Ao voltar ao ecrã de gestão (depois de partida ou cutscene), a mesma faixa continua — a música só é *baixada* (duck), nunca parada, durante a partida/cutscene.

## Créditos (Bloco 4)

`docs/audio_creditos.md` + ecrã "Créditos de áudio" nas Definições (`src/ui/ecraCreditosAudio.ts`). **Em falta nos créditos**: autor e link exactos de cada ficheiro (o utilizador não os forneceu) — ficam como "desconhecido"/"—"; a licença está marcada corretamente como "sem licença — uso privado" com o aviso de substituição antes de publicar.

## PWA e desempenho (Bloco 5)

- Service worker (`public/sw.js`): cache própria para áudio, **cache-first** (um som já guardado nunca volta a pedir à rede); só pré-cacheia `mus_menu` + o manifesto na instalação, nunca o pacote todo; limpa as entradas mais antigas acima de 30 MB.
- `AudioManager.preDecodificar(id)`: pré-decodifica a cutscene "na véspera" (quando `resumo.proximo` já é um jogo europeu); nunca decodifica com tudo silenciado.
- `AudioManager.libertarBuffers(ids)`: liberta os buffers decodificados da cutscene ao fechá-la.

## O que não foi testado num dispositivo real

- **Desbloqueio de áudio em iOS/Android** (toque inicial) e **pausa/retoma em segundo plano** — só a lógica de estado foi testada em Node; o comportamento real do `AudioContext` num telemóvel a sério não foi verificado (sem dispositivo físico neste ambiente).
- **Qualidade audível** da normalização de volume (loudnorm), do corte de silêncio e do fade dos loops — feito por `ffmpeg`, nunca ouvido por uma pessoa (sem forma de reproduzir áudio neste ambiente).
- **Crossfades e duck de volume** (música↔ambiente, música↔cutscene) — confirmados por código e por não lançarem erro, nunca ouvidos a sério.
- **A ambiência de tensão no golo** — o código está ligado, mas sem `amb_estadio_tensao` não há nada para ouvir; por confirmar quando o ficheiro chegar.
- **Tempo real de descarregamento/cache** em rede lenta ou offline — a lógica do service worker foi só lida/testada por conteúdo do ficheiro, não executada num browser a sério.

## Testes automáticos

`tests/audio.test.ts` (29 testes) + `tests/motor2d-fase6.test.ts` (lotação/jogo importante) + `tests/economia.test.ts` (sem regressão em `receitaJogo`/`ocupacaoJogo`). Cobre: pasta vazia sem erro; ficheiro em falta = silêncio; volumes/silenciar persistem fora do save; a cutscene corta o áudio e a música volta a subir; a playlist (sem repetir, reembaralha, nunca pára de vez, respeita `parar()`); o catálogo real (manifesto válido, em falta, ou a rede a falhar); o service worker (cache-first, limite, só `mus_menu` pré-cacheado); `preDecodificar`/`libertarBuffers`; e as duas regras de ouro (só `AudioManager.ts` toca em `AudioContext`/`GainNode`; o motor de simulação/2D nunca importa de `src/audio/`).

**Suite completa do projecto: 378 testes, todos a passar** (44 ficheiros). Tempo de simulação semanal sem alteração perceptível (as mudanças em `Sessao.vistaJogo2D()` e `MotorEconomico.ocupacaoJogo()` são cálculos simples sobre dados já carregados).
