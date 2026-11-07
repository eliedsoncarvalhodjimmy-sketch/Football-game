# Decisões do projecto Smell CRM

Registo das decisões tomadas com o CEO (Eliedson). Quando uma regra da especificação
(`docs/especificacao-smell-crm.md`) e este ficheiro discordarem, **vale este ficheiro**.

## 07/11/2026 — Respostas do CEO às perguntas iniciais

### Riscos e contradições
| # | Tema | Decisão |
|---|------|---------|
| D1 | Repositório "Football-game" | Mudar o nome do repositório existente (o CEO faz isto no GitHub; ver README). |
| D2 | "Paga 1, leva 2" vs. tecto de custo | O tecto "nunca abaixo do custo" continua a ser **por item**. O escalão de 150 pontos ("paga 1, leva 2") é uma **excepção autorizada**: o perfume oferecido pode ficar a 0 Kz. A excepção fica registada no `audit_log`. |
| D3 | Aviso do tecto | O Vendedor vê apenas "Desconto limitado pelas regras da Smell", **sem valores**, para não deduzir o custo. |
| D4 | Cupões e pontos offline | A venda pode ser feita offline; cupão e pontos ficam **"por validar"** e são confirmados pelo servidor ao sincronizar. Se já tiverem sido usados, a venda passa a `aguarda_aprovacao` do CEO. |
| D5 | Stock offline | O stock **pode ficar negativo** (não se bloqueia a venda); o CEO é avisado. |
| D6 | Pontos em vendas a crédito | Os pontos são atribuídos **à medida que os pagamentos entram**, não no momento da venda. |
| D7 | Comissão | **3% sobre a margem que passar da meta** (ex.: meta 500.000 Kz, margem 600.000 Kz → 3.000 Kz). Percentagem e meta editáveis pelo CEO a qualquer momento. |
| D8 | Supabase gratuito pausa | Aceite; o README explica como reactivar. |

### Contas e acesso
| # | Tema | Decisão |
|---|------|---------|
| D9 | Contas GitHub/Supabase/Vercel | O CEO ainda não as tem: o README traz o guia passo a passo. |
| D10 | Domínio | Sem domínio próprio: usar o endereço gratuito da Vercel (`*.vercel.app`). |
| D11 | Email do CEO | Indicado pelo CEO (não fica escrito no repositório, que pode ser público). **A primeira conta criada no Supabase torna-se CEO automaticamente**; as seguintes são Vendedor. Por isso o CEO cria a sua conta primeiro (ver README). Vendedores são adicionados depois pelo CEO, dentro da app. |

### Marca
| # | Tema | Decisão |
|---|------|---------|
| D12 | Logótipos | Recebidos (vertical, horizontal, só texto e símbolo, em várias cores). Guardados em `public/brand/`, recortados e reduzidos a 1200 px. |
| D13 | Dourado | O CEO tem o manual de marca. Até lá usa-se **`#C4AA6F`** (tom médio medido no símbolo dourado, que é um degradé de `#DCC380` a `#AC905E`). Trocar em `src/app/globals.css` quando o manual indicar o código oficial. |
| D14 | Ícone da app | Símbolo vinho `#710014` sobre fundo bege `#F6F2D9`. |

### Fidelização
| # | Tema | Decisão |
|---|------|---------|
| D15 | Troca de pontos | Gastam-se **só os pontos do escalão usado** (120 pontos → usa 100 → ficam 20). |
| D16 | "Paga 1, leva 2" | Sai grátis o perfume de **menor valor** (configurável). |
| D17 | Base de cálculo dos pontos | Valor **depois de todos os descontos**. |
| D18 | Revendedores e empresas | **Também** ganham pontos e cupões. |
| D19 | Cancelamento com pontos gastos | Os pontos gastos **voltam** ao cliente; os pontos ganhos com a venda são anulados. |
| D20 | Cupão de indicação | Só é gerado quando a primeira compra do indicado estiver **totalmente paga**. |

### Vendas e recibo
| # | Tema | Decisão |
|---|------|---------|
| D21 | Recibo | Mostra **NIF, morada, telefone e IBAN** da Smell (configuráveis em Definições) + "Documento sem valor fiscal". |
| D22 | Várias formas de pagamento | **Sim**: cada pagamento regista a sua forma (numerário, transferência, Multicaixa Express). |
| D23 | Prazo de dívida por defeito | **35 dias** (configurável). |
| D24 | Entradas e ajustes de stock | Só o CEO e utilizadores com a permissão **ADM**, atribuída pelo CEO. Implementado como permissão do utilizador (`profiles.is_adm`), não como etiqueta de cliente. |

### Clientes
| # | Tema | Decisão |
|---|------|---------|
| D25 | Visibilidade | O Vendedor **vê e edita todos** os clientes, excepto os das etiquetas restritas pelo CEO. |
| D26 | WhatsApp | **Obrigatório**; aceita números estrangeiros (formato internacional `+código...`). |
| D27 | Exportar/apagar dados de cliente (Lei 22/11) | **Só o CEO**. |

### Volume
| # | Tema | Decisão |
|---|------|---------|
| D28 | Dimensão inicial | ~24 perfumes, 44 clientes + ~100 leads. Volume pequeno: tudo cabe no plano gratuito do Supabase. |
| D29 | Importação | **Sem importação**: os clientes da folha actual serão introduzidos à mão. |

## Decisões técnicas (tomadas pelo Claude Code)
| # | Tema | Decisão e porquê |
|---|------|------------------|
| T1 | Versões | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript 5, Vitest 5. |
| T2 | Fonte | Montserrat servida a partir da própria app (`@fontsource-variable/montserrat`), para funcionar offline. Nakilla não é usada como fonte web (só existe nos logótipos em imagem). |
| T3 | Service worker | Escrito à mão (`public/sw.js`), simples e previsível: páginas com "rede primeiro", ficheiros estáticos com "cache primeiro". Os dados nunca passam por esta cache: vivem no IndexedDB (Dexie). |
| T5 | Preço de custo | Guardado numa tabela à parte (`product_variant_costs`), tal como o custo/margem de cada venda (`sale_item_costs`). Só o CEO tem acesso a estas tabelas; o Vendedor não as consegue ler nem pela API. |
| T6 | Escritas sensíveis | Vendas, pagamentos, pontos e cupões de indicação só são escritos por funções do servidor (passos 1F–1H), que calculam preços, tectos e margens. O aparelho nunca envia preços finais "à confiança". |
| T7 | Primeira conta = CEO | Mais simples e seguro do que guardar o email numa variável: o registo público está desligado e o CEO cria a sua conta antes de qualquer outra. |
| T8 | Permissão ADM | Coluna `profiles.is_adm` (D24). |
| T9 | Testes da base de dados | `npm run test:db` cria um Postgres temporário, aplica todas as migrações e testa as regras de segurança (o que o Vendedor vê e não vê). |
| T10 | Gestão de contas | Criar contas, gerar palavras-passe e bloquear contas usa a chave secreta só no servidor (`/api/utilizadores`), depois de confirmar que o pedido vem de um CEO activo. Os perfis são alterados "em nome do CEO", para a auditoria mostrar quem fez. A palavra-passe gerada é mostrada uma única vez. |
| T11 | Sessão offline | A sessão e o perfil ficam guardados no aparelho: sem internet a app abre na mesma. Entrar pela primeira vez e trocar a palavra-passe exigem rede. Uma conta desactivada é posta fora na próxima vez que a app tiver rede. |
| T12 | Definições visíveis | Só aparecem as regras que já têm efeito (Fase 1). As da Fase 2 já existem na base de dados e aparecem quando funcionarem, para não haver interruptores "mortos". |
| T13 | Ficha do cliente | Endereço `/clientes/ficha?id=…` (e não `/clientes/<id>`), para a página ser a mesma para todos os clientes e abrir sem internet. |
| T14 | Apagar dados (D27) | Cliente sem compras: apagado. Com compras: nome, WhatsApp, morada, aniversário, notas e etiquetas apagados; as vendas ficam ligadas a "Cliente apagado". Os dados pessoais são também retirados do `audit_log`; fica só o registo de que houve apagamento. Confirmação escrevendo o código do cliente. |
| T15 | WhatsApp | Guardado sempre em formato internacional (`+244923456789`). Números de Angola podem ser escritos sem indicativo e têm de ter 9 algarismos começados por 9. Número repetido gera aviso, mas não bloqueia (pode ser a mesma família). |
| T16 | Botão "Abrir WhatsApp" | Já existe na ficha (abre a conversa sem texto). Os modelos de mensagem com `{nome}`, `{saldo}`… chegam na Fase 2. |
| T4 | Páginas | As páginas são geradas como estáticas e os dados são lidos no aparelho (IndexedDB + Supabase), para a app abrir mesmo sem rede. |
