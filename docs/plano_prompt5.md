# Prompt 5 — plano de ficheiros e de ecrãs

## Arquitectura (a UI só lê e comanda)

```
Interface (main thread)          Web Worker (motor puro, determinístico)
  src/ui/app.ts       ──pedido──▶  src/worker/sim.worker.ts
  src/ui/estado.ts    ◀─vistas──   src/worker/vistas.ts   (monta os dados de cada ecrã)
  src/ui/ecras/*.ts                src/worker/comandos.ts (aplica decisões do utilizador)
  src/ui/componentes/*.ts          src/storage/saves.ts   (ranhuras, gravação incremental IndexedDB)
```

- O worker guarda o World; a UI pede **vistas** (objectos simples, já filtrados pelo nevoeiro do clube do utilizador) e envia **comandos** (fazer oferta, aceitar, sugerir ao treinador, promover júnior…). Nenhuma regra de jogo vive na UI.
- Avançar (dia/semana) corre no worker; a UI recebe progresso e paragens de decisão sem bloquear.
- Listas grandes (23 000 jogadores, mercado) são paginadas/virtualizadas: o worker devolve só as linhas visíveis + total.

## Ficheiros novos (Bloco A)

| Ficheiro | Para quê |
|---|---|
| `src/worker/protocolo.ts` (substitui o da Fase 1) | Tipos de pedidos, comandos, vistas e eventos |
| `src/worker/sim.worker.ts` (substitui) | Ciclo de mensagens, avanço, paragens |
| `src/worker/vistas.ts` | Vistas por ecrã (início, plantel, jogador, táctica, mercado, scouting, academia, finanças, infraestruturas, clube, mundo, calendário, armazenamento) |
| `src/worker/comandos.ts` | Comandos do utilizador → mercado, academia, controlador do clube |
| `src/club/controladorUtilizador.ts` | ClubController do utilizador (as decisões chegam por comandos; sem decisão, aplica o conselho por omissão) |
| `src/storage/saves.ts` | Ranhuras, gravação automática e incremental (IndexedDB), tamanho por ranhura, poda |
| `src/ui/app.ts`, `src/ui/estado.ts`, `src/ui/rotas.ts` | Casca, navegação (lateral no tablet, inferior no telemóvel), acento com as cores do clube |
| `src/ui/componentes/` | Tabela virtualizada, filtros e pesquisa, cartão, número grande, escudo gerado, intervalo (nevoeiro), estrelas, chips de estado |
| `src/ui/ecras/` | Um ficheiro por ecrã (lista abaixo) |
| `src/ui/estilo.css` (substitui) | Tema escuro e tokens |
| `src/data/historicoUefa.ts` + `packs/_continental/historico/*.csv` | Importação só de leitura do histórico real (1.5), palmarés por clube |
| `packs/_continental/historico/equivalencias.csv` | `clube_historico,clube_id` (editável); vazio com os clubes fictícios |
| `src/cli/historico-sem-correspondencia.ts` | Lista os nomes do histórico sem correspondência |
| `src/cli/validate-pack.ts` (estende) | Valida os CSV do histórico (colunas, épocas, formato_final) |
| `src/config/interface.ts` | Números da interface (tamanho de página das listas, gravação automática, …) |
| `tests/vistas.test.ts`, `tests/historico.test.ts`, `tests/saves.test.ts` | Testes |

- **Ecrã de carregamento** (pedido do utilizador): `docs/prototipo/intro.jpg` em ecrã inteiro, logótipo, barra com as etapas reais enviadas pelo worker (mundo, gravação, motor), uma dica ao acaso; fecha quando o jogo está pronto (sem tempo mínimo) ou ao tocar; a mesma imagem no ecrã de arranque da PWA (manifesto).

- **Entrada e perfil** (pedido do utilizador): depois do carregamento, ecrã com `docs/prototipo/perfil.jpg`: login (3 contas locais; só o SHA-256 das palavras-passe fica no código; separa perfis e gravações, não é segurança a sério) → perfil de jogo (nome, data de nascimento, nacionalidade e o perfil de partida do modo Dono, textos do utilizador) → foto (opcional, 256 px, só no aparelho) → clube (compra de qualquer clube: o património do perfil não limita a compra). Contas com perfil já criado: "Continuar carreira" ou "Criar um perfil novo". Efeitos dos perfis (propostos, a aprovar) em `src/config/perfis.ts`.

- **Avatares** (pedido do utilizador): rostos 2D por camadas para todos os jogadores, treinadores e staff, a partir de ~11 números por pessoa (pele, rosto, cabelo e cor, sobrancelhas, olhos e cor, nariz, boca, barba, óculos; entradas e cabelos brancos pela idade), derivados da nacionalidade, da idade e de uma semente: sempre a mesma cara. Corpo pela altura e pelo peso, com o equipamento do clube (cores, padrão, número) ou fato no staff. Gerados no worker com o mundo (`src/avatares/`), também para cada jovem da academia no intake; o desenho é feito na UI só quando aparece (e fica em cache). **Editor** antes de começar a carreira (jogadores, juniores, staff, outros clubes; setas por característica, Aleatório, Repor), guardado como sobreposição no pacote de dados. **Ficha do jogador** no estilo pedido: avatar de corpo inteiro, dados físicos, pé, moral, OVR, clube, agente, contrato, camisola, posições, estatísticas da época, potencial estimado e relatório do olheiro.

## Ecrãs (Bloco A)

| Ecrã | Conteúdo | Dados que já existem |
|---|---|---|
| Novo jogo | Pacotes, perfil (só modo Dono), clube (pesquisa por país, liga, reputação, finanças), semente, ranhura | packs, World, Economia |
| Início | Próximo jogo, forma, classificação, finanças resumidas, notícias, tarefas pendentes | calendário, histórico, economia, eventos, mercado |
| Plantel | Lista com filtros; OVR + adequação ao papel; moral, forma, condição, lesões, contrato | PlayerStore, Contratos |
| Jogador | Atributos (intervalos se o conhecimento não for total), papéis 1–20, estado, contrato, cláusulas, época | Scouting.relatorio, PlayerStore |
| Táctica | Formação e papéis do treinador, instruções; sugestões limitadas pela autoridade | motor (treinadores, tácticas) |
| Treinador e staff | Três grupos: principal, juvenil, directivo (Director Financeiro e Comercial); perfil, contrato, pedidos; mercados de treinadores e staff | MercadoTreinadores, StaffMundo |
| Mercado | Pesquisa/filtros, shortlists, relatórios com confiança, ofertas feitas e recebidas, negociação por rondas, leilões, empréstimos, contagem da janela | Mercado, Scouting |
| Scouting | Atribuição de scouts por região, escalão e posição; conhecimento; pedidos de relatório | Scouting |
| Academia | Sub-18, sub-21, shortlist de prospectos com o conselho automático | Academia.resumoProspectos |
| Finanças | Receitas, despesas, caixa, dívida, orçamentos, fair play e sanções, estado | ClubStore |
| Infraestruturas | Níveis, obras, custos, efeitos | Economia |
| Clube e dono | Dono, ambição, objectivos, história de donos e treinadores, rivais | donos, eventos |
| Mundo | Ligas e taças, classificações, artilheiros, continentais, histórico de campeões (real e do jogo, separados) | histórico, historicoUefa |
| Calendário | Jogos, janelas, pausas, eventos | calendários |
| Armazenamento | Tamanho por ranhura, poda | saves |

## Blocos seguintes (resumo)

- **B — jogo em campo**: pré-jogo (onzes, conversa de equipa, sugestões), replay 2D em Canvas (campo vertical, nomes nas bolinhas, cronologia de eventos, velocidades), resumo, jornada com paragens de decisão e notícias.
  - **Cut-scene de entrada** (pedido do utilizador): transição do pré-jogo para a simulação com uma das imagens de `docs/prototipo/cutscenes/` (`entrada-1.jpg` túnel nocturno, `entrada-2.jpg` subida para o relvado de dia), **alternadas** de jogo para jogo; ecrã inteiro, curta (≈2–3 s, com opção de saltar), sem bloquear o worker, que já simula enquanto ela corre. As imagens são usadas tal como foram enviadas.
- **Imprensa (simplificada)** (pedido do utilizador; Bloco C, com as notícias do Bloco B; botão do microfone no topo): **feed de notícias** gerado a cada jogo do clube e a cada segunda-feira, em blocos de 5–8 (2 do clube, 2 da liga, 2 de outras ligas, 1–2 de mercado/bastidores), com peso por relevância (alto sempre; médio e baixo preenchem), filtrado (clube, liga, ligas seguidas, jogadores do clube e da shortlist), cada notícia com "Ver mais" (classificação, perfil, transferências, mensagem) e, nalgumas, **consequência real** (proposta nas mensagens, moral, pressão sobre o treinador, oportunidades de mercado). Tipos e regras em `src/config/noticias.ts`. As conferências de imprensa (70 guiões) mantêm-se a partir do feed; saem opinião, relação com os meios, "Reagir" e o medidor de pressão mediática. Destaques semanais na passagem para segunda-feira. **Mensagens** simplificadas: "A decidir" e "Para ler", uma linha por mensagem. **Escritório**: resumo da carreira (jogos, vitórias, empates, derrotas, títulos, maior contratação e venda, totais, total aportado, melhor marcador numa época, maior assistência em casa).
- **Prémios anuais** (pedido do utilizador; Bloco C): Golden Boy (sub-21), Melhor guarda-redes e Melhor do Mundo (Bola de Ouro), sobre a época de 1 de Agosto a 15 de Julho. **16 de Julho**: anúncio dos finalistas (30 Golden Boy, 5 guarda-redes, 30 Melhor do Mundo). **30 de Julho**: cena da cerimónia, por esta ordem: Golden Boy, guarda-redes, Melhor do Mundo; cada lista do último ao 1.º (nome, posição, equipa, idade; em segundo plano jogos, golos, assistências, títulos), o top 3 com suspense, botão de saltar em cada etapa. Pontuação (nota média, golos e assistências por posição, jogos sem sofrer, títulos, reputação, força da liga, ruído de votação) em `src/config/premios.ts`. Imagens em `docs/prototipo/premios/` (finalistas, troféu, cerimónia, vencedor). Os vencedores ficam no palmarés do jogador e no Hall da Fama.
- **C — modo Dono e carreira** (o modo Director foi retirado do projecto): Dono/Presidente (adeptos 0–100 e pressão em 4 níveis, conselho e accionistas, compra e venda de clubes sem limite pelo património), objectivos por época, conquistas e Hall da Fama.
- **D — optimização, armazenamento, PWA e 50 épocas**: perfis no tablet, poda de detalhe, offline, exportar/importar saves e pacotes, teste de 50 épocas com 6 sementes.
