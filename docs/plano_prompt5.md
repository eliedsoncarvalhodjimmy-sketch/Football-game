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

## Ecrãs (Bloco A)

| Ecrã | Conteúdo | Dados que já existem |
|---|---|---|
| Novo jogo | Pacotes, modo (Director / Dono), clube (pesquisa por país, liga, reputação, finanças), semente, ranhura | packs, World, Economia |
| Início | Próximo jogo, forma, classificação, finanças resumidas, notícias, tarefas pendentes | calendário, histórico, economia, eventos, mercado |
| Plantel | Lista com filtros; OVR + adequação ao papel; moral, forma, condição, lesões, contrato | PlayerStore, Contratos |
| Jogador | Atributos (intervalos se o conhecimento não for total), papéis 1–20, estado, contrato, cláusulas, época | Scouting.relatorio, PlayerStore |
| Táctica | Formação e papéis do treinador, instruções; sugestões limitadas pela autoridade | motor (treinadores, tácticas) |
| Treinador e staff | Perfil, contrato, pedidos; mercados de treinadores e staff | MercadoTreinadores, StaffMundo |
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
- **C — modos e carreira**: Director (avaliação, pressão, despedimento) e Dono (adeptos 0–100 e pressão em 4 níveis, compra e venda de clubes), objectivos por época, conquistas e Hall da Fama.
- **D — optimização, armazenamento, PWA e 50 épocas**: perfis no tablet, poda de detalhe, offline, exportar/importar saves e pacotes, teste de 50 épocas com 6 sementes.
