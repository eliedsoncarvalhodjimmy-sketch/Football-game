# Smell CRM — memória do projecto para o Claude Code

A especificação completa (Partes 0, A–F e Fase 1) está em
[`docs/especificacao-smell-crm.md`](docs/especificacao-smell-crm.md). **Lê-a no início de cada sessão.**
As decisões tomadas ficam em `docs/decisoes.md`.

## Regras de trabalho (resumo da Parte 0)
- O dono (Eliedson, CEO) não é programador: explicar tudo em português simples.
- Trabalhar **por fases**; executar só a fase pedida. Criar já todas as tabelas do modelo de dados (C14).
- Cada fase fica operacional: nada de botões que não funcionam nem dados fictícios.
- Passos pequenos (1A, 1B…): no fim de cada um, testes + commit em português + resumo numa frase.
- Testes automáticos obrigatórios para regras de negócio (preços, margem, descontos, pontos, cupões, comissões, stock, dívidas).
- Interface em português de Angola; moeda Kz; datas `dd/mm/aaaa`; fuso `Africa/Luanda`; `Intl` com `pt-AO`.
- Sem segredos no código: variáveis de ambiente + `.env.example`.
- Avisar com franqueza sobre contradições ou riscos antes de implementar.

## Essencial técnico
- Next.js (App Router) + TypeScript + Tailwind, PWA, offline com Dexie + outbox.
- Supabase (Postgres, Auth, Storage, RLS em todas as tabelas); publicação na Vercel.
- Dinheiro em `numeric(14,2)`; datas em UTC; IDs UUID; tudo o que o utilizador altera vai para `audit_log`.
- Vendas, pagamentos e movimentos de stock são append-only; stock = soma de movimentos.
- O Vendedor nunca lê custos, margens nem finanças — imposto **na base de dados** (RLS/vistas).
- Cores: `#F6F2D9` (fundo), `#710014` (acção), `#4C020B` (títulos). Fonte Montserrat.
