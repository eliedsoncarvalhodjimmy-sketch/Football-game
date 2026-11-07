-- =====================================================================
-- Smell CRM — esquema inicial (todas as tabelas previstas, Fases 1 a 4)
-- Dinheiro: numeric(14,2). Datas: timestamptz (UTC). IDs: UUID.
-- Vendas, pagamentos, movimentos de stock e pontos são "append-only".
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('ceo', 'vendedor');
create type public.client_type as enum ('cliente_final', 'revendedor', 'empresa');
create type public.funnel_stage as enum ('contacto', 'follow_up', 'proposta', 'fechamento', 'pos_venda');
create type public.sale_status as enum ('rascunho', 'aguarda_aprovacao', 'confirmada', 'cancelada');
create type public.payment_status as enum ('em_divida', 'parcial', 'paga');
create type public.payment_method as enum ('numerario', 'transferencia', 'multicaixa_express');
create type public.stock_movement_type as enum ('entrada', 'venda', 'ajuste', 'cancelamento');
create type public.request_status as enum ('pendente', 'aprovado', 'recusado');
create type public.validation_status as enum ('nao_aplicavel', 'por_validar', 'validado', 'rejeitado');
create type public.coupon_kind as enum ('indicacao', 'manual');
create type public.coupon_status as enum ('activo', 'usado', 'expirado', 'anulado');
create type public.loyalty_entry_type as enum ('ganho', 'troca', 'anulacao', 'devolucao', 'ajuste');
create type public.goal_period as enum ('semana', 'mes');

-- ---------------------------------------------------------------------
-- Utilizadores e definições
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null default 'vendedor',
  is_adm boolean not null default false,          -- permissão ADM: entradas e ajustes de stock (D24)
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.profiles.is_adm is 'Permissão ADM dada pelo CEO: pode registar entradas e ajustes de stock.';

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------
-- Etiquetas e clientes
-- ---------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 40),
  color text not null default '#710014',
  is_system boolean not null default false,       -- VIP e Embaixador não se apagam
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.client_code_seq as integer start 1;

create table public.clients (
  id uuid primary key default gen_random_uuid(),   -- gerado no aparelho (offline)
  code integer unique,                             -- sequencial atribuído pelo servidor (0001...)
  temp_code text unique,                           -- TEMP-xxxx criado offline
  name text not null check (length(trim(name)) > 0),
  whatsapp text not null check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  address text not null default '',
  birthday_day smallint check (birthday_day between 1 and 31),
  birthday_month smallint check (birthday_month between 1 and 12),
  occupation text not null default '',
  client_type public.client_type not null default 'cliente_final',
  seller_id uuid references public.profiles (id),
  funnel_stage public.funnel_stage not null default 'contacto',
  referred_by uuid references public.clients (id),
  consent boolean not null default false,
  consent_at timestamptz,
  consent_by uuid references public.profiles (id),
  opt_out boolean not null default false,
  opt_out_at timestamptz,
  notes text not null default '',
  perfume_preferences text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint clients_birthday_both check ((birthday_day is null) = (birthday_month is null)),
  constraint clients_not_self_referred check (referred_by is null or referred_by <> id)
);
create index clients_name_idx on public.clients (lower(name));
create index clients_whatsapp_idx on public.clients (whatsapp);
create index clients_referred_by_idx on public.clients (referred_by);
create index clients_seller_idx on public.clients (seller_id);

create table public.client_tags (
  client_id uuid not null references public.clients (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (client_id, tag_id)
);
create index client_tags_tag_idx on public.client_tags (tag_id);

-- Etiquetas que um utilizador NÃO pode ver (definidas pelo CEO)
create table public.tag_restrictions (
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tag_id, user_id)
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

create table public.funnel_stage_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  from_stage public.funnel_stage,
  to_stage public.funnel_stage not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id)
);
create index funnel_stage_history_client_idx on public.funnel_stage_history (client_id, changed_at);

-- ---------------------------------------------------------------------
-- Produtos e stock
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  brand text not null default '',
  description text not null default '',
  category text not null default 'unissexo',
  photo_paths text[] not null default '{}',       -- caminhos no Storage (bucket "produtos")
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  sku text not null unique check (length(trim(sku)) > 0),   -- código/ID único da variação
  label text not null default '',                           -- ex.: "50 ml"
  photo_path text,
  price_retail numeric(14,2) not null check (price_retail >= 0),    -- cliente final
  price_reseller numeric(14,2) not null check (price_reseller >= 0),-- revendedor
  min_stock integer not null default 0 check (min_stock >= 0),
  replenish_days integer not null default 60 check (replenish_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);

-- Preço de custo numa tabela à parte: só o CEO a lê (garantido pela base de dados).
create table public.product_variant_costs (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  cost_price numeric(14,2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),   -- gerado no aparelho: evita duplicados
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity <> 0), -- positivo entra, negativo sai
  movement_type public.stock_movement_type not null,
  reason text not null default '',
  sale_id uuid,                                    -- ligação à venda (FK abaixo)
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint stock_adjust_has_reason check (movement_type <> 'ajuste' or length(trim(reason)) > 0)
);
create index stock_movements_variant_idx on public.stock_movements (variant_id);

-- ---------------------------------------------------------------------
-- Vendas, pagamentos, dívidas, descontos
-- ---------------------------------------------------------------------
create sequence public.sale_number_seq as integer start 1;

create table public.sales (
  id uuid primary key default gen_random_uuid(),   -- gerado no aparelho
  number integer unique default nextval('public.sale_number_seq'),
  client_id uuid not null references public.clients (id) on delete restrict,
  seller_id uuid not null references public.profiles (id),
  status public.sale_status not null default 'rascunho',
  payment_status public.payment_status not null default 'em_divida',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  coupon_discount numeric(14,2) not null default 0 check (coupon_discount >= 0),
  points_discount numeric(14,2) not null default 0 check (points_discount >= 0),
  manual_discount numeric(14,2) not null default 0 check (manual_discount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  coupon_id uuid,
  coupon_validation public.validation_status not null default 'nao_aplicavel',
  points_redeemed integer not null default 0 check (points_redeemed >= 0),
  points_tier integer,                             -- escalão usado: 50, 100 ou 150
  points_validation public.validation_status not null default 'nao_aplicavel',
  cost_floor_exception boolean not null default false,  -- excepção autorizada (ex.: paga 1 leva 2)
  due_date date,                                   -- data limite da dívida
  notes text not null default '',
  device_created_at timestamptz,                   -- hora no aparelho (venda offline)
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id),
  cancel_reason text,
  updated_at timestamptz not null default now()
);
create index sales_client_idx on public.sales (client_id, created_at desc);
create index sales_seller_idx on public.sales (seller_id, created_at desc);
create index sales_status_idx on public.sales (status, payment_status);

alter table public.stock_movements
  add constraint stock_movements_sale_fk foreign key (sale_id) references public.sales (id);
create index stock_movements_sale_idx on public.stock_movements (sale_id);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),         -- preço de tabela usado
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0), -- desconto total da linha
  line_total numeric(14,2) not null check (line_total >= 0),         -- (preço × qtd) − desconto
  is_free_item boolean not null default false                         -- oferta "paga 1, leva 2"
);
create index sale_items_sale_idx on public.sale_items (sale_id);

-- Custo e margem de cada linha: só o CEO lê.
create table public.sale_item_costs (
  sale_item_id uuid primary key references public.sale_items (id) on delete cascade,
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  margin numeric(14,2) not null                    -- (preço líquido − custo) × quantidade
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),   -- gerado no aparelho
  sale_id uuid not null references public.sales (id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
create index payments_sale_idx on public.payments (sale_id);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  seq integer not null check (seq > 0),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (sale_id, seq)
);

create table public.discount_requests (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  reason text not null default '',
  status public.request_status not null default 'pendente',
  approved_amount numeric(14,2) check (approved_amount >= 0),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_note text not null default '',
  created_at timestamptz not null default now()
);
create index discount_requests_status_idx on public.discount_requests (status, created_at);

-- ---------------------------------------------------------------------
-- Fidelização
-- ---------------------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.clients (id) on delete cascade,
  referred_id uuid not null unique references public.clients (id) on delete cascade,
  first_sale_id uuid references public.sales (id),
  qualified_at timestamptz,                         -- 1.ª compra do indicado totalmente paga
  coupon_id uuid,
  created_at timestamptz not null default now(),
  constraint referrals_not_self check (referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  client_id uuid not null references public.clients (id) on delete cascade,
  kind public.coupon_kind not null,
  percent numeric(5,2) not null check (percent > 0 and percent <= 100),
  status public.coupon_status not null default 'activo',
  valid_from timestamptz not null default now(),
  expires_at timestamptz not null,
  referral_id uuid references public.referrals (id),
  used_in_sale_id uuid references public.sales (id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
create index coupons_client_idx on public.coupons (client_id, status);

alter table public.sales
  add constraint sales_coupon_fk foreign key (coupon_id) references public.coupons (id);
alter table public.referrals
  add constraint referrals_coupon_fk foreign key (coupon_id) references public.coupons (id);

create table public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  points integer not null check (points <> 0),     -- positivo ganha, negativo gasta/anula
  entry_type public.loyalty_entry_type not null,
  sale_id uuid references public.sales (id),
  payment_id uuid references public.payments (id),
  note text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);
create index loyalty_ledger_client_idx on public.loyalty_ledger (client_id);

-- ---------------------------------------------------------------------
-- Fase 2: lembretes, modelos de mensagem, metas, comissões, notificações
-- ---------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  client_id uuid references public.clients (id) on delete cascade,
  sale_id uuid references public.sales (id) on delete cascade,
  assigned_to uuid references public.profiles (id),
  due_at timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'feito', 'ignorado')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index reminders_due_idx on public.reminders (status, due_at);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,                          -- etapa do funil, aniversario, cobranca, pos_venda...
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  period public.goal_period not null,
  period_start date not null,
  target_margin numeric(14,2) not null default 0 check (target_margin >= 0),
  target_revenue numeric(14,2) not null default 0 check (target_revenue >= 0),
  target_sales_count integer not null default 0 check (target_sales_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, period, period_start)
);

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles (id) on delete cascade, -- null = regra geral
  percent numeric(5,2) not null default 3 check (percent >= 0 and percent <= 100),
  valid_from date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(), -- respeita o silêncio 22:30–07:00
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, scheduled_for desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,                                   -- quem fez (null = sistema)
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'EXCEPCAO')),
  old_data jsonb,
  new_data jsonb,
  note text not null default ''
);
create index audit_log_table_idx on public.audit_log (table_name, record_id);
create index audit_log_time_idx on public.audit_log (occurred_at desc);

-- ---------------------------------------------------------------------
-- Fases 3 e 4: Cheirinho e WhatsApp
-- ---------------------------------------------------------------------
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'faq',                -- playbook, catalogo, script, faq
  content text not null default '',
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  channel text not null default 'whatsapp',
  wa_contact text,
  status text not null default 'aberta' check (status in ('aberta', 'humano', 'fechada')),
  assigned_to uuid references public.profiles (id),
  handled_by_ai boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction text not null check (direction in ('entrada', 'saida')),
  sender text not null check (sender in ('cliente', 'humano', 'cheirinho', 'sistema')),
  body text not null default '',
  wa_message_id text unique,
  status text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
