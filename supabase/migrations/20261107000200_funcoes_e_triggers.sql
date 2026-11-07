-- =====================================================================
-- Funções auxiliares e automatismos (triggers)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quem é o utilizador actual?
-- (security definer: lêem "profiles" sem depender das regras RLS)
-- ---------------------------------------------------------------------
create or replace function public.current_profile_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active)
$$;

create or replace function public.is_ceo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'ceo')
$$;

-- CEO ou utilizador com permissão ADM (entradas e ajustes de stock)
create or replace function public.is_adm_or_ceo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and (role = 'ceo' or is_adm)
  )
$$;

-- O utilizador actual pode ver este cliente? (restrição por etiqueta)
create or replace function public.can_see_client(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_active_user() and (
    public.is_ceo()
    or not exists (
      select 1
      from public.client_tags ct
      join public.tag_restrictions tr on tr.tag_id = ct.tag_id
      where ct.client_id = p_client_id and tr.user_id = auth.uid()
    )
  )
$$;

-- A etiqueta está escondida para o utilizador actual?
create or replace function public.tag_hidden_for_me(p_tag_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.tag_restrictions where tag_id = p_tag_id and user_id = auth.uid())
$$;

create or replace function public.can_see_sale(p_sale_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.sales s where s.id = p_sale_id and public.can_see_client(s.client_id))
$$;

-- Lê uma definição (devolve null se estiver desactivada)
create or replace function public.setting(p_key text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select value from public.settings where key = p_key and active
$$;

-- Data de hoje em Luanda
create or replace function public.today_luanda()
returns date
language sql stable
as $$
  select (now() at time zone 'Africa/Luanda')::date
$$;

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'settings', 'tags', 'clients', 'products', 'product_variants',
    'product_variant_costs', 'sales', 'message_templates', 'goals', 'commission_rules', 'kb_documents'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Auditoria: cada alteração fica registada com quem a fez
-- ---------------------------------------------------------------------
create or replace function public.tg_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if; -- nada mudou
  v_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key',
                   v_new ->> 'variant_id', v_old ->> 'variant_id',
                   v_new ->> 'sale_item_id', v_old ->> 'sale_item_id',
                   concat_ws(':', coalesce(v_new ->> 'client_id', v_old ->> 'client_id', v_new ->> 'user_id', v_old ->> 'user_id'),
                                  coalesce(v_new ->> 'tag_id', v_old ->> 'tag_id')));
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_old, v_new);
  return coalesce(new, old);
end;
$$;

-- Regista uma excepção autorizada (ex.: desconto abaixo do custo)
create or replace function public.log_exception(p_table text, p_record_id text, p_note text, p_data jsonb default null)
returns void
language sql security definer set search_path = public
as $$
  insert into public.audit_log (actor_id, table_name, record_id, action, new_data, note)
  values (auth.uid(), p_table, p_record_id, 'EXCEPCAO', p_data, p_note)
$$;
revoke execute on function public.log_exception(text, text, text, jsonb) from public;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'settings', 'tags', 'client_tags', 'tag_restrictions', 'clients', 'client_notes',
    'products', 'product_variants', 'product_variant_costs', 'stock_movements',
    'sales', 'sale_items', 'sale_item_costs', 'payments', 'installments', 'discount_requests',
    'coupons', 'loyalty_ledger', 'referrals', 'message_templates', 'goals', 'commission_rules',
    'kb_documents'
  ] loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function public.tg_audit()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Registos "só de acrescentar": não se alteram nem apagam
-- (o cancelamento cria movimentos inversos, não apaga os originais)
-- ---------------------------------------------------------------------
create or replace function public.tg_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registo não pode ser alterado nem apagado (%).', tg_table_name
    using errcode = 'P0001';
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['stock_movements', 'payments', 'loyalty_ledger', 'audit_log', 'funnel_stage_history'] loop
    execute format(
      'create trigger append_only before update or delete on public.%I for each row execute function public.tg_append_only()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Clientes: código sequencial, consentimento, opt-out, quem criou/alterou
-- ---------------------------------------------------------------------
create or replace function public.tg_clients_before()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- O código final é SEMPRE dado pelo servidor (o aparelho só envia TEMP-xxxx)
    new.code := nextval('public.client_code_seq');
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
    if new.consent then
      new.consent_at := now();
      new.consent_by := auth.uid();
    else
      new.consent_at := null;
      new.consent_by := null;
    end if;
    if new.opt_out then new.opt_out_at := now(); else new.opt_out_at := null; end if;
  else
    if new.code is distinct from old.code then
      raise exception 'O código do cliente não pode ser alterado.' using errcode = 'P0001';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.consent and not old.consent then
      new.consent_at := now();
      new.consent_by := auth.uid();
    elsif not new.consent then
      new.consent_at := null;
      new.consent_by := null;
    else
      new.consent_at := old.consent_at;
      new.consent_by := old.consent_by;
    end if;
    if new.opt_out and not old.opt_out then
      new.opt_out_at := now();
    elsif not new.opt_out then
      new.opt_out_at := null;
    else
      new.opt_out_at := old.opt_out_at;
    end if;
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger clients_before before insert or update on public.clients
  for each row execute function public.tg_clients_before();

-- Histórico do funil + registo da indicação
create or replace function public.tg_clients_after()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.funnel_stage_history (client_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.funnel_stage, auth.uid());
    if new.referred_by is not null then
      insert into public.referrals (referrer_id, referred_id) values (new.referred_by, new.id)
      on conflict (referred_id) do nothing;
    end if;
  else
    if new.funnel_stage is distinct from old.funnel_stage then
      insert into public.funnel_stage_history (client_id, from_stage, to_stage, changed_by)
      values (new.id, old.funnel_stage, new.funnel_stage, auth.uid());
    end if;
    if new.referred_by is distinct from old.referred_by then
      -- Só se pode mudar a indicação enquanto o indicado ainda não comprou
      if exists (select 1 from public.referrals r where r.referred_id = new.id and r.first_sale_id is not null) then
        raise exception 'A indicação já não pode ser alterada: o cliente já comprou.' using errcode = 'P0001';
      end if;
      delete from public.referrals where referred_id = new.id;
      if new.referred_by is not null then
        insert into public.referrals (referrer_id, referred_id) values (new.referred_by, new.id);
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger clients_after after insert or update on public.clients
  for each row execute function public.tg_clients_after();

create or replace function public.tg_set_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['client_notes', 'client_tags', 'stock_movements', 'payments', 'coupons', 'loyalty_ledger'] loop
    execute format(
      'create trigger set_created_by before insert on public.%I for each row execute function public.tg_set_created_by()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Perfis: criado automaticamente quando uma conta é criada.
-- A primeira conta do sistema torna-se CEO; as seguintes são Vendedor.
-- ---------------------------------------------------------------------
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.user_role := 'vendedor';
begin
  if not exists (select 1 from public.profiles where role = 'ceo') then
    v_role := 'ceo';
  end if;
  insert into public.profiles (id, email, full_name, role, must_change_password)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- Ninguém se promove a si próprio; o último CEO activo não pode ser despromovido.
create or replace function public.tg_profiles_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_ceo() then
    if new.role is distinct from old.role or new.is_adm is distinct from old.is_adm
       or new.active is distinct from old.active or new.email is distinct from old.email then
      raise exception 'Só o CEO pode alterar perfis e permissões.' using errcode = '42501';
    end if;
  end if;
  if old.role = 'ceo' and old.active and (new.role <> 'ceo' or not new.active)
     and not exists (select 1 from public.profiles where role = 'ceo' and active and id <> old.id) then
    raise exception 'Tem de existir pelo menos um CEO activo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- O próprio utilizador pode actualizar só o nome e marcar a palavra-passe como trocada.
create or replace function public.update_my_profile(p_full_name text default null, p_password_changed boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Sem sessão activa.' using errcode = '42501';
  end if;
  update public.profiles
     set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
         must_change_password = case when p_password_changed then false else must_change_password end
   where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- Etiquetas de sistema não se apagam nem mudam de nome
-- ---------------------------------------------------------------------
create or replace function public.tg_tags_guard()
returns trigger
language plpgsql
as $$
begin
  if old.is_system and (tg_op = 'DELETE' or new.name <> old.name or not new.is_system) then
    raise exception 'A etiqueta "%" é do sistema e não pode ser apagada nem renomeada.', old.name
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tags_guard before update or delete on public.tags
  for each row execute function public.tg_tags_guard();

-- ---------------------------------------------------------------------
-- Estado de pagamento da venda (paga / parcial / em dívida),
-- recalculado sempre que entra um pagamento.
-- ---------------------------------------------------------------------
create or replace function public.recompute_payment_status(p_sale_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  select total into v_total from public.sales where id = p_sale_id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where sale_id = p_sale_id;
  update public.sales
     set payment_status = case
           when v_paid >= v_total then 'paga'::public.payment_status
           when v_paid > 0 then 'parcial'::public.payment_status
           else 'em_divida'::public.payment_status
         end
   where id = p_sale_id;
end;
$$;
revoke execute on function public.recompute_payment_status(uuid) from public;

create or replace function public.tg_payments_after()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recompute_payment_status(new.sale_id);
  return new;
end;
$$;

create trigger payments_after after insert on public.payments
  for each row execute function public.tg_payments_after();
