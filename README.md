# Smell CRM

CRM da **Smell** (perfumes, Cuito, Bié, Angola). *Cuidamos de si!*

Aplicação instalável no telemóvel e no computador (PWA) para gerir clientes, produtos e stock,
vendas, pagamentos, dívidas, descontos, cupões e pontos de fidelidade, mesmo sem internet.

> **Estado:** Fase 1 em construção. Passos concluídos: **1A (fundações)**, **1B (base de dados)**, **1C (entrada e perfis)**, **1D (clientes)**, **1E (produtos e stock)** e **1F (vendas)**.
> A especificação está em [`docs/especificacao-smell-crm.md`](docs/especificacao-smell-crm.md)
> e as decisões em [`docs/decisoes.md`](docs/decisoes.md).

---

## 1. Contas que precisa de criar (todas gratuitas)

Faça por esta ordem. Use sempre o mesmo email (o do CEO).

### 1.1 GitHub: onde fica guardado o código
1. Já tem conta, porque o repositório deste projecto está na sua conta GitHub.
2. **Mudar o nome do repositório** de `Football-game` para `smell-crm`:
   - Abra o repositório no GitHub e vá a **Settings** (Definições).
   - No campo **Repository name**, escreva `smell-crm` e carregue em **Rename**.
   - O GitHub redirecciona automaticamente o endereço antigo, por isso nada se perde.
3. Dar acesso ao Claude: abra https://claude.ai/connect-github, ligue a sua conta e instale a
   app **Claude** no repositório. Sem isto, o Claude Code não consegue enviar o código.

### 1.2 Supabase: base de dados, contas de utilizador e fotos
1. Abra https://supabase.com e carregue em **Start your project**. Entre com a conta GitHub.
2. **New project**:
   - *Name*: `smell-crm`
   - *Database password*: carregue em **Generate a password** e **guarde-a num local seguro**.
   - *Region*: escolha a mais próxima, por exemplo **West EU (Ireland)** ou **Central EU (Frankfurt)**.
     Não há região em Angola; a Europa tem boa latência a partir de Luanda.
   - *Plan*: **Free**.
3. Espere 1 a 2 minutos enquanto o projecto é criado.
4. Vá a **Project Settings → API** e copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca a envie
     por WhatsApp nem a cole no chat. Vai apenas para a Vercel, no passo 1.3.)
5. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
   Assim ninguém cria conta sozinho: só o CEO cria contas, dentro da app.

> **Atenção:** no plano gratuito, o Supabase **pausa o projecto ao fim de cerca de 7 dias sem uso**.
> Com uso diário isso não acontece. Se acontecer, entre em https://supabase.com, abra o projecto
> e carregue em **Restore project**. Os dados não se perdem. Quando a operação crescer, o plano
> pago (cerca de 25 USD/mês) elimina as pausas e inclui cópias de segurança diárias.

6. **Preparar a base de dados** (criar as tabelas e as regras de segurança):
   - No Supabase, abra **SQL Editor → New query**.
   - Abra no GitHub a pasta [`supabase/migrations`](supabase/migrations). Copie o conteúdo de cada
     ficheiro, **pela ordem dos números**, cole no editor e carregue em **Run**. São 9 ficheiros.
     Cada um deve terminar com *Success*.
7. **Criar a sua conta de CEO** (antes de qualquer outra!):
   - **Authentication → Users → Add user → Create new user**.
   - Email: o seu; palavra-passe: uma forte; marque **Auto Confirm User**.
   - A **primeira conta** criada recebe automaticamente o perfil **CEO**. As contas dos vendedores
     são criadas depois, por si, dentro da app.

### 1.3 Vercel: põe a app na internet
1. Abra https://vercel.com/signup e escolha **Continue with GitHub**. Plano **Hobby** (gratuito).
2. **Add New… → Project** e escolha o repositório `smell-crm`.
3. Antes de carregar em **Deploy**, abra **Environment Variables** e adicione as 3 variáveis
   do ficheiro [`.env.example`](.env.example), com os valores do Supabase.
4. Carregue em **Deploy**. Ao fim de 1 a 2 minutos recebe um endereço do tipo
   `https://smell-crm.vercel.app`. É esse o endereço da app (não há domínio próprio por agora).

### 1.4 Primeiros passos na app (CEO)
1. Abra o endereço da Vercel e entre com o email e a palavra-passe da conta criada no passo 1.2.
2. **Mais → Definições**: preencha os dados da Smell para o recibo (NIF, morada, telefone, IBAN)
   e confirme as regras de pontos, cupões e prazos.
3. **Mais → Etiquetas**: crie as etiquetas de que precisa (VIP e Embaixador já existem).
4. **Mais → Utilizadores → Novo utilizador**: crie a conta do vendedor. A app gera uma palavra-passe,
   que é mostrada **uma só vez**: passe-a ao vendedor em privado. No primeiro acesso ele escolhe outra.
   Aqui também dá a permissão **ADM** (entradas e ajustes de stock) e escolhe as etiquetas de clientes
   que ele **não** pode ver.
5. **Produtos → Novo produto**: registe cada perfume com as suas variações (30 ml, 50 ml…),
   preços de cliente final e de revendedor, preço de custo (só o CEO vê), stock mínimo e,
   se quiser, o stock inicial. O botão **Sugerir** cria o código (SKU) automaticamente.
6. Na ficha do produto, **Entrada** regista mercadoria que chegou e **Ajuste** corrige o stock
   (sempre com motivo). Quem tiver a permissão ADM também o pode fazer.
7. Se um vendedor sair da empresa, desligue **Conta activa**: deixa de conseguir entrar de imediato.

---

## 2. Instalar a app no aparelho

*(Instruções completas no fim da Fase 1, passo 1J.)*

- **Android (Chrome):** abra o endereço → menu ⋮ → **Instalar aplicação**.
- **iPhone (Safari):** abra o endereço → botão Partilhar → **Adicionar ao ecrã principal**.
  As notificações (Fase 2) só funcionam assim instalada, com iOS 16.4 ou superior.
- **Computador (Chrome/Edge):** ícone de instalar ⊕ na barra de endereço.

---

## 3. Para programadores

```bash
cp .env.example .env.local   # preencher com os valores do Supabase
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes automáticos (regras de negócio)
npm run test:db              # migrações + regras de segurança num Postgres temporário (precisa do PostgreSQL)
npm run test:e2e             # testes de ecrã com Supabase simulado (precisa do Playwright; ver tests/e2e)
npm run lint && npm run typecheck
npm run build && npm start   # versão de produção (o service worker só corre aqui)
```

| Pasta | Conteúdo |
|---|---|
| `src/app/(app)/` | Ecrãs: Início, Clientes, Vendas, Produtos, Mais |
| `src/components/` | Layout (barra inferior / menu lateral), indicador offline |
| `src/lib/` | Formatação (Kz, datas de Luanda), ligação ao Supabase |
| `public/brand/` | Logótipos oficiais (PNG transparentes) |
| `public/icons/` | Ícones da app instalável |
| `public/sw.js` | Service worker (funcionamento offline) |
| `supabase/migrations/` | Base de dados: tabelas, segurança (RLS), auditoria, dados iniciais |
| `tests/db/` | Testes da base de dados (o que cada perfil pode ver e fazer) |
| `docs/` | Especificação e decisões |

**Regras:** texto em português de Angola; dinheiro em Kz com `numeric(14,2)`; datas guardadas em UTC
e mostradas no fuso `Africa/Luanda`; nenhum segredo no código (só em `.env.local` / Vercel).

---

## 4. Protecção de dados (Lei n.º 22/11)

O que a app faz (não substitui a validação por um advogado):
- **Consentimento registado**: o vendedor marca "consentiu" e fica guardado quem marcou e quando.
  A recusa ("não quero mensagens") também fica registada.
- **Acesso restrito**: cada utilizador só vê o que pode (regras na própria base de dados);
  clientes com etiquetas restritas ficam invisíveis para quem não os pode ver.
- **Histórico de alterações**: cada alteração fica registada com quem a fez.
- **Direitos do cliente** (só o CEO, na ficha do cliente → *Protecção de dados*):
  - **Exportar dados**: descarrega um ficheiro com tudo o que a Smell guarda sobre o cliente.
  - **Apagar dados**: apaga o cliente. Se já tiver compras, os dados pessoais são apagados e as
    compras ficam como "Cliente apagado" (as contas da Smell continuam certas). Os dados pessoais
    também são retirados do histórico de alterações.
- **Cópia de segurança**: ver o guia no fim da Fase 1 (passo 1J).

## 5. Recibos

Os recibos em PDF gerados pela app **não são facturas certificadas pela AGT**. Levam no rodapé a
indicação "Documento sem valor fiscal".
