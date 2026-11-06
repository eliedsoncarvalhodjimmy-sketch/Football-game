# CRM Smell — Especificação (Prompt-mestre + Fase 1)

> Documento fornecido pelo CEO (Eliedson). Guardado aqui tal como foi entregue, para servir de referência em todas as sessões.

---

# PARTE 0 — INSTRUÇÕES DE TRABALHO PARA O CLAUDE CODE

És um engenheiro de software sénior a construir um CRM chamado **Smell CRM** para a marca Smell (perfumes), em Angola. O dono é o Eliedson (CEO). Não é programador: explica tudo em português simples, sem jargão desnecessário.

Regras de trabalho:

1. **Antes de escrever código**, lê o documento todo e faz-me todas as perguntas que ainda tiveres (quanto mais, melhor). Só avanças quando eu responder. Se alguma resposta for "decide tu", decide e regista a decisão em `docs/decisoes.md`.
2. Trabalha **por fases**. Executa apenas a fase que eu pedir. Não implementes funcionalidades de fases futuras, mas **cria já as tabelas** previstas no modelo de dados (Parte C) para não haver migrações dolorosas depois.
3. Cada fase tem de ficar **operacional**: sem botões que não funcionam, sem dados falsos na versão final.
4. Divide a fase em passos pequenos (1A, 1B, ...). No fim de cada passo: corre testes, faz commit com mensagem em português clara e diz-me o que mudou numa frase.
5. Escreve testes automáticos para as **regras de negócio** (preços, margem, descontos, pontos, cupões, comissões, stock, dívidas). São as que não podem falhar.
6. Todo o texto visível ao utilizador está em **português de Angola**. Moeda **Kz**, datas `dd/mm/aaaa`, fuso `Africa/Luanda`, formato numérico com `Intl` e locale `pt-AO`.
7. Nunca guardes segredos no código. Usa variáveis de ambiente e entrega um `.env.example`.
8. Se encontrares uma contradição ou risco no que escrevi, **avisa-me com franqueza** antes de implementar.
9. No fim da Fase 1 entrega: `README.md` em português com passo a passo de instalação, configuração e publicação, e a lista das contas que preciso de criar.

---

# PARTE A — CONTEXTO DO NEGÓCIO

- **Smell**: marca de perfumes, no Cuito, Bié (Angola), a operar desde 2023. Lema: **"Cuidamos de si!"**. Hoje controla clientes numa folha de Google Sheets e vende muito por WhatsApp.
- **Objectivo do Smell CRM**: gerir clientes, produtos/stock, vendas, dívidas, funil comercial, metas e comissões, fidelização e (mais tarde) atendimento automático no WhatsApp com o assistente de IA **Cheirinho**.
- **Utilizadores**: o CEO e um vendedor (inicialmente só um vendedor com acesso; a app deve suportar mais).
- **Dispositivos**: Android, iPhone e computador, como **PWA instalável** (ícone no ecrã inicial).
- **Internet instável**: a app tem de funcionar **offline** e sincronizar quando houver ligação.
- **Só Smell**: não é multi-empresa. Catálogo **só perfumes**.
- **Orçamento**: o único custo planeado é a IA (Fase 4, máximo 100 USD/mês, ideal 60–70). Infraestrutura em planos gratuitos no início.

---

# PARTE B — STACK E ARQUITECTURA (recomendação; podes propor melhor com justificação)

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS. PWA com manifesto, service worker e ícones.
- **Offline**: IndexedDB (Dexie) com **fila de saída (outbox)**. Escritas offline guardam-se localmente e sincronizam ao voltar a ligação. Mostra sempre um indicador "Offline" e o número de alterações pendentes.
- **Backend e base de dados**: **Supabase** (PostgreSQL, Auth, Storage para fotos, Realtime, Row Level Security em todas as tabelas).
- **Publicação**: Vercel (plano gratuito). Nota: projectos gratuitos do Supabase podem **pausar por inactividade**; documenta isto e como evitar (uso diário ou plano pago quando a operação crescer).
- **Notificações**: Web Push (VAPID) + notificações dentro da app. No iPhone, só funcionam depois de instalar a PWA no ecrã inicial (iOS 16.4 ou superior): avisa o utilizador na app.
- **Fases futuras** (não implementar agora): WhatsApp Cloud API (Meta), API da Anthropic (Cheirinho), espelho para Google Sheets.
- **Regras técnicas**: valores monetários em `numeric(14,2)` (nunca float); datas em UTC na base e apresentadas em `Africa/Luanda`; IDs de registos em UUID; tudo o que o utilizador altera gera linha no `audit_log`.

### Estratégia offline (importante)
- Vendas, pagamentos e movimentos de stock são **registos de acrescentar** (append-only) com UUID gerado no dispositivo, para evitar conflitos.
- Stock = soma dos movimentos (não um número editado à mão).
- Clientes criados offline recebem código temporário `TEMP-xxxx` e o código final sequencial (`0001`, `0002`, ...) é atribuído pelo servidor ao sincronizar.
- Edições simultâneas de outros campos: "a última alteração ganha", com registo no `audit_log`.
- **Aprovações de desconto exigem internet** (o vendedor guarda a venda como "aguarda aprovação").

---

# PARTE C — MARCA, REGRAS E MODELO DE DADOS

## C1. Identidade visual (manual da Smell, por Chicapa Design)
- Cores oficiais: **Bege claro cremoso `#F6F2D9`** (fundo principal), **Vermelho vinho intenso `#710014`** (cor de acção/primária), **Vinho escuro `#4C020B`** (títulos, texto forte, cabeçalhos).
- Dourado: aparece nos mockups, mas **não** está na paleta. Usar só em pequenos destaques (pontos, selo Embaixador, ícones): aprox. `#C9A961`, a confirmar com o utilizador.
- Tipos de letra: **Montserrat** em toda a interface. **Nakilla** só no logótipo (não a uses como fonte web, a licença é de design).
- Logótipos em PNG: o utilizador vai colocar em `public/brand/` (versões vertical e horizontal, símbolo "flor com S"). Gera os ícones da PWA (192, 512 e maskable) a partir do símbolo.
- Personalidade: refinada, suave, moderna, respeitadora, acessível, profissional. Interface limpa, muito espaço em branco, cantos arredondados, sem excesso de cor. Contraste mínimo WCAG AA.
- Navegação: no telemóvel, barra inferior (Início, Clientes, Vendas, Produtos, Mais); no computador, menu lateral. Botões grandes (mín. 44 px), formulários simples, poucos toques para registar uma venda.

## C2. Perfis e permissões

| Acção | CEO | Vendedor |
|---|---|---|
| Criar utilizadores e gerar palavra-passe | Sim | Não |
| Ver todos os clientes | Sim | Sim, excepto etiquetas restritas pelo CEO |
| Criar/editar clientes, registar conversas e consentimento | Sim | Sim |
| Registar vendas e pagamentos | Sim | Sim |
| Aplicar cupões e pontos automáticos a uma venda | Sim | Sim |
| Dar desconto manual | Sim | **Não** (pede aprovação do CEO) |
| Criar cupões, editar regras, pontos e preços | Sim | Não |
| Ver finanças, custos, margens e dashboard completo | Sim | Não |
| Ver a sua própria meta e comissão | Sim | Sim |
| Alimentar a base de conhecimento do Cheirinho | Sim | Não |
| Cancelar venda, apagar registos | Sim | Não |
| Ver histórico de alterações (`audit_log`) | Sim | Não |

- Login por **email e palavra-passe**. O CEO cria a conta do vendedor e define/gera a palavra-passe (com opção de forçar a troca no primeiro acesso). Sem registo público.
- A restrição de clientes é **por etiqueta**: o CEO escolhe que etiquetas cada vendedor não pode ver.

## C3. Interruptores de regras (feature flags)
O CEO deve poder **activar, desactivar e ajustar** a qualquer momento, em Definições: pontos de fidelidade, cupões de indicação, regras de comissão, metas, lembretes (cada tipo), limites e valores. Guardar em tabela `settings` com valores por defeito abaixo.

## C4. Clientes
Campos: **código sequencial** (`0001`, `0002`...; aparece antes do nome em todo o lado), nome, WhatsApp (formato internacional `+244...`, validado), morada, aniversário (**dia e mês**, sem ano), profissão/ocupação, tipo (`cliente_final`, `revendedor`, `empresa`), etiquetas (**VIP**, **Embaixador**; o CEO pode criar outras), vendedor responsável, etapa do funil, **indicado por** (código de outro cliente), consentimento de mensagens (**o vendedor marca "consentiu"**, guardando quem marcou e quando), opção de recusa (`opt_out`), notas, preferências de perfume e histórico de conversas (notas datadas).
Campos calculados e visíveis: data da última compra, **dias sem comprar**, total gasto, dívida em aberto, pontos de fidelidade, cupões activos, nº de indicações que compraram.
Os dados são inseridos **manualmente** (sem importação de ficheiros).
Pesquisa rápida por código, nome e WhatsApp. Filtros por tipo, etiqueta, etapa, dias sem comprar e dívida.

## C5. Produtos e stock (só perfumes)
- Produto: nome, marca, descrição, categoria (ex.: feminino, masculino, unissexo), foto(s), activo/inactivo.
- **Variações** (ex.: 30 ml, 50 ml, 100 ml, fragrância): cada uma com **código/ID único**, foto, **preço de venda cliente final**, **preço revendedor**, **preço de custo** (invisível ao Vendedor), stock mínimo para alerta, duração estimada em dias para lembrete de reposição (**por defeito 60**).
- Um único ponto de stock. O stock **desce automaticamente** ao confirmar venda; há registo de **entrada de mercadoria** e de **ajustes** (com motivo). Alerta de stock baixo.
- Preço usado na venda depende do tipo do cliente (revendedor tem preço próprio).

## C6. Vendas, pagamentos e dívidas
- Venda: cliente, vendedor, itens (variação, quantidade, preço), desconto, forma de pagamento (**numerário, transferência, Multicaixa Express**, crédito/prestações), estado (`rascunho`, `aguarda_aprovacao`, `confirmada`, `cancelada`), data.
- **Margem da venda** = (preço líquido − custo) × quantidade, calculada pelo servidor.
- **Pagamentos parciais**: cada pagamento é um registo próprio; venda fica `paga`, `parcial` ou `em_divida`; data limite e (opcional) prestações.
- **Dívidas**: lista por cliente com saldo, data limite e histórico de pagamentos.
- **Descontos**:
  - O Vendedor **não** dá desconto manual. Pode pedir; a venda fica `aguarda_aprovacao` e o CEO aprova ou recusa (notificação).
  - **Teto**: o preço final de nenhum item pode ficar abaixo do **custo**. Se cupões + pontos + desconto o ultrapassarem, o sistema limita ao teto e avisa. O CEO pode corrigir ou autorizar excepção (fica no `audit_log`).
  - **Um cupão por compra.** Cupões e pontos **podem acumular** na mesma compra (respeitando o teto).
- Recibo simples em PDF (nome Smell, itens, total, pagamentos, saldo). Não é factura certificada pela AGT: avisa isso no rodapé do recibo ("Documento sem valor fiscal") e documenta no README.
- Só o CEO cancela vendas; o cancelamento devolve stock, anula pontos e cupões associados e fica registado.

## C7. Fidelização (activável/desactivável)
- **Pontos**: 1 ponto por cada **10.000 Kz** de compras pagas (valor líquido). Não expiram por defeito (configurável).
- **Só se trocam pontos a partir de 50**:
  - 50 pontos = **15%** de desconto
  - 100 pontos = **30%** de desconto
  - 150 pontos = **paga 1, leva 2** (o perfume de menor valor sai grátis, por defeito; configurável)
- Ao trocar, gastam-se os pontos do escalão usado; os restantes ficam. (Assumido: confirmar com o utilizador no início.)
- Cada troca respeita o teto "nunca abaixo do custo".
- **Cupões de indicação**: cada cliente trazido que fizer a primeira compra gera **1 cupão de 5%** para quem o indicou, **válido 30 dias**, utilizável na compra seguinte. Um cupão por compra.
- **Embaixador**: etiqueta atribuída automaticamente a quem tenha **pelo menos 5 indicados que compraram** (o CEO também a pode atribuir à mão). Mostrar selo dourado.
- Indicações: no registo de cliente novo, campo "indicado por" (pesquisa por código/nome).

## C8. Funil (Fase 2)
Etapas fixas: **Contacto → Follow-up → Proposta → Fechamento → Pós-venda**.
Na aba **Clientes**: alternar entre **Lista** e **Quadro**; no quadro, arrastar o cliente entre colunas (também por menu, para acessibilidade em telemóvel). Cada mudança fica registada com data e quem fez.
**Taxa de conversão de leads** = leads criados no período que chegaram a **Fechamento** ÷ leads criados no período.

## C9. Lembretes e notificações (Fase 2; cada um activável)
28 dias sem comprar · 48 h após proposta sem resposta · aniversário (3 dias antes e no dia) · pós-venda 3 dias após a compra · reposição (duração do produto, **60 dias por defeito**) · dívida (3 dias antes, no dia, 3 dias depois do prazo) · lead parado em Contacto há mais de 24 h · meta semanal/mensal em risco · stock baixo · Embaixador atingido · cupão a expirar (5 dias antes).
**Silêncio**: nenhuma notificação automática nem mensagem automática entre **22:30 e 07:00** (Africa/Luanda). Usar fila e enviar às 07:00.

## C10. Metas e comissões (Fase 2; ajustáveis pelo CEO)
- Meta pré-estabelecida pelo CEO por vendedor, **por semana e por mês**, em **margem bruta** (ex.: 500.000 Kz).
- Comissão por defeito: por cada **1.000 Kz de margem acima da meta**, o vendedor recebe **3%** (ou seja, 3% sobre o excesso); abaixo da meta, 0. Percentagem e meta editáveis.
- O vendedor vê a sua meta, progresso e comissão estimada; nunca a margem global nem finanças da empresa.

## C11. Dashboard e relatórios (Fase 2)
**Dashboard do CEO** (simples e extensível, cada cartão é um módulo independente):
1. Vendas do mês (quantidade) vs meta e **gap**
2. Faturamento do mês vs meta e **gap**
3. Clientes por etapa do funil
4. Taxa de conversão de leads
**Dashboard do Vendedor**: a sua meta/comissão, lembretes do dia, clientes a contactar.
**Relatórios** (exportar **Excel e PDF**): vendas do mês, dívidas, clientes inactivos, comissões.

## C12. Mensagens e WhatsApp
- **Fases 1 e 2**: botão **"Abrir WhatsApp"** (link `wa.me`) com **modelo de mensagem** preenchido (variáveis `{nome}`, `{perfume}`, `{saldo}`, `{validade_cupao}`...). Modelos por etapa do funil, aniversário, cobrança e pós-venda; o CEO edita.
- **Fase 3**: WhatsApp Cloud API oficial (Meta), com o número Business da Smell. Envio em massa só para clientes com **consentimento**, respeitando as regras do WhatsApp (modelos aprovados, janela de 24 h). Resposta **"SAIR"** marca `opt_out`.

## C13. Protecção de dados (Angola)
Tratar dados pessoais conforme a **Lei de Protecção de Dados Pessoais de Angola (Lei n.º 22/11)**: finalidade clara, consentimento registado, acesso restrito (RLS), `audit_log`, possibilidade de **exportar e apagar** os dados de um cliente a pedido, cópia de segurança. Não afirmes conformidade legal total: documenta o que foi feito e recomenda validação com um advogado.

## C14. Modelo de dados (criar tudo na Fase 1, em migrações Supabase)
`profiles` (utilizador, perfil CEO/Vendedor, activo) · `settings` (chave, valor, activo) · `tags` · `client_tags` · `tag_restrictions` (etiqueta, utilizador) · `clients` · `client_notes` · `funnel_stage_history` · `products` · `product_variants` · `stock_movements` · `sales` · `sale_items` · `payments` · `installments` · `discount_requests` · `coupons` · `loyalty_ledger` · `referrals` · `reminders` · `message_templates` · `goals` · `commission_rules` · `notifications` · `push_subscriptions` · `audit_log` · `kb_documents` (para o Cheirinho, Fase 4) · `conversations` e `messages` (Fase 3/4).
- Código de cliente sequencial gerado pelo servidor (sequência Postgres, formatado `0001`).
- RLS: o Vendedor nunca lê `cost_price`, margens agregadas, `commission_rules` de outros, `audit_log`, `kb_documents` (escrita) nem finanças. Implementa isto **na base de dados** (vistas/políticas), não só no ecrã.

---

# PARTE D — ROTEIRO DE FASES

| Fase | Conteúdo |
|---|---|
| **1** | Base: PWA, marca, login/perfis, definições, clientes, produtos/stock, vendas, pagamentos, dívidas, descontos com aprovação, cupões e pontos, `audit_log`, offline |
| **2** | Funil (quadro), lembretes, notificações push, metas e comissões, dashboard, relatórios Excel/PDF, modelos de mensagem com botão WhatsApp |
| **3** | WhatsApp Cloud API: receber/enviar, envio em massa com consentimento, opt-out |
| **4** | Cheirinho (IA) e espelho Google Sheets |

---

# PARTE E — FASE 1

## Objectivo
Entregar uma PWA **já utilizável no dia-a-dia** para clientes, produtos/stock, vendas, pagamentos, dívidas, descontos, cupões e pontos, com login seguro, offline e a marca Smell.

## Passos sugeridos
- **1A. Fundações**: projecto Next.js + TypeScript + Tailwind, tema Smell (cores, Montserrat), layout responsivo (barra inferior / menu lateral), PWA (manifesto, ícones a partir do símbolo, service worker), Supabase ligado, `.env.example`, `README` inicial, `docs/decisoes.md`.
- **1B. Base de dados**: migrações de todas as tabelas (C14), sequência de códigos de cliente, RLS, vistas seguras para o Vendedor, `audit_log` automático por triggers, dados iniciais (etiquetas VIP e Embaixador, definições por defeito de C3, C7, C9, C10).
- **1C. Autenticação e perfis**: login por email/palavra-passe; CEO cria utilizadores, gera palavra-passe e pode forçar troca; restrição por etiqueta; ecrã de Definições do CEO (interruptores e valores).
- **1D. Clientes**: criar/editar/pesquisar, tipos, etiquetas, consentimento, indicado por, notas/conversas, campos calculados, restrição por etiqueta.
- **1E. Produtos e stock**: produtos, variações, fotos (Supabase Storage com compressão no cliente), preços (cliente final / revendedor / custo oculto ao Vendedor), entradas e ajustes, alerta de stock baixo.
- **1F. Vendas**: ecrã rápido de nova venda, itens, cupão e pontos, pedido de desconto com aprovação do CEO, teto de custo, margem, formas de pagamento, estados, cancelamento (CEO), recibo PDF.
- **1G. Pagamentos e dívidas**: pagamentos parciais, prestações opcionais, lista de dívidas por cliente, data limite.
- **1H. Fidelização**: pontos por compra, troca a partir de 50, cupões de indicação (30 dias), Embaixador automático, tudo com interruptores.
- **1I. Offline e sincronização**: Dexie + outbox, UUIDs no dispositivo, código `TEMP-`, indicador de estado, resolução de conflitos conforme Parte B, testes de cenário (vender offline, sincronizar).
- **1J. Qualidade e entrega**: testes das regras de negócio, auditoria de segurança de RLS (vendedor não vê custos nem finanças), Lighthouse PWA, `README` completo (como criar contas, variáveis de ambiente, publicar na Vercel, instalar no Android/iPhone/computador, como fazer cópia de segurança).

## Critérios de aceitação (a Fase 1 só termina quando tudo isto passar)
1. Instalo a app no Android, no iPhone e no computador, com o ícone da Smell.
2. O CEO cria um vendedor com palavra-passe; o vendedor entra e **não** vê custos, margens, finanças, dashboard completo nem clientes das etiquetas restritas (testado ao nível da base de dados).
3. Registo um cliente novo (código `0001`), com indicação de outro cliente, e vejo o consentimento guardado com quem marcou e quando.
4. Registo uma venda **offline**, volto a ter internet e ela sincroniza sem duplicar; o stock desce uma só vez.
5. O Vendedor pede desconto; o CEO recebe, aprova, e a venda confirma. Nenhum item fica abaixo do custo.
6. Venda com pagamento parcial cria dívida; um segundo pagamento a fecha.
7. Pontos acumulam (1 por 10.000 Kz); só consigo trocar a partir de 50; cupão de indicação de 5% gera-se, expira em 30 dias e só se usa um por compra; cupões e pontos acumulam na mesma compra.
8. Cada regra da Parte C3 pode ser desligada em Definições e o comportamento muda de imediato.
9. `audit_log` mostra quem fez cada alteração importante.
10. Todos os textos em português de Angola; valores em Kz; interface na paleta Smell.

## O que NÃO fazer na Fase 1
Não implementar funil em quadro, lembretes, push, metas/comissões, dashboard, relatórios, WhatsApp API, Cheirinho nem Google Sheets (só prepara as tabelas). Não usar dados fictícios na versão final. Não guardar segredos no repositório.

---

# PARTE F — ESBOÇO DA FASE 4 (não implementar agora)

**Cheirinho** (sem emoji nem foto de perfil; atendente no WhatsApp e assistente virtual no CRM):
- Tom: profissional, amigável, nunca infantil; **não responde a provocações** nem a perguntas confidenciais (finanças, dados de outros clientes, funcionamento interno).
- Apresenta-se no início e **pergunta sempre** se o cliente prefere falar com um humano ou continuar com ele.
- Pode: responder sobre catálogo, preços, perguntas frequentes e método de vendas; registar cliente, criar venda e marcar follow-up (via ferramentas do CRM).
- **Não dá descontos.** Só informa cupões e pontos que o cliente já tem; se o cliente pedir desconto, passa a um humano.
- **Passa a conversa a um humano** quando: o cliente pede; falha 2 vezes seguidas em entender; reclamação, troca, devolução ou reembolso; cliente irritado, ameaças ou linguagem abusiva; reacção alérgica ou saúde/pele; pedido de desconto ou negociação de dívida; encomenda grande, empresa ou revendedor novo; produto/preço fora do catálogo; perguntas confidenciais; comprovativo de pagamento duvidoso.
- Conhecimento: playbook, catálogo, script de vendas, FAQ (só o CEO edita).
- Custos: modelo pequeno e rápido por defeito e modelo maior só em casos complexos; cache de prompt para o playbook/catálogo; **tecto mensal** com alertas a 70% e 90% e, ao atingir o tecto, passagem automática a humano. Alvo 60–70 USD, máximo 100 USD/mês.
- Segurança: resistir a injecção de comandos nas mensagens dos clientes; registar todas as conversas; respeitar silêncio 22:30–07:00 e `opt_out`.

**Google Sheets**: o Supabase é a fonte principal; o Sheets é **espelho automático** (clientes, vendas, stock, dívidas) via conta de serviço, com sincronização num só sentido (CRM → Sheets) e como cópia de segurança.

---

# PERGUNTAS INICIAIS (do CEO)
1. Já tenho conta GitHub, Supabase e Vercel? Ajuda-me a criá-las passo a passo.
2. Qual o domínio ou subdomínio? (Se não houver, uso o endereço gratuito da Vercel por agora.)
3. Como se chama o vendedor e qual o email? Qual o email do CEO?
4. Já enviei os logótipos PNG? (vertical, horizontal e símbolo, com fundo transparente)
5. Posso confirmar as decisões assumidas em C7 (troca de pontos gasta só os pontos do escalão; "paga 1 leva 2" dá o de menor valor)?
6. Quantos perfumes e variações tenho para o início, para dimensionar a entrada de produtos?
