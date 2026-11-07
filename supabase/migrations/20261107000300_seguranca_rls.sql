-- =====================================================================
-- Segurança: Row Level Security (RLS) em TODAS as tabelas.
-- Regra de ouro: o Vendedor nunca lê custos, margens, comissões de outros,
-- auditoria nem finanças. Isto é garantido AQUI, não só no ecrã.
-- Escritas sensíveis (vendas, pagamentos, pontos, cupões) só por funções
-- do servidor (passos 1F a 1H), nunca por escrita directa nas tabelas.
-- =====================================================================

-- Visitantes sem sessão (anon) não têm acesso a nada.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- Funções internas não podem ser chamadas directamente pelos utilizadores
revoke execute on function public.log_exception(text, text, text, jsonb) from authenticated;
revoke execute on function public.recompute_payment_status(uuid) from authenticated;
revoke execute on function public.tg_set_updated_at() from authenticated;
revoke execute on function public.tg_audit() from authenticated;
revoke execute on function public.tg_append_only() from authenticated;
revoke execute on function public.tg_clients_before() from authenticated;
revoke execute on function public.tg_clients_after() from authenticated;
revoke execute on function public.tg_set_created_by() from authenticated;
revoke execute on function public.tg_handle_new_user() from authenticated;
revoke execute on function public.tg_profiles_guard() from authenticated;
revoke execute on function public.tg_tags_guard() from authenticated;
revoke execute on function public.tg_payments_after() from authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user());                 -- nomes da equipa (para "vendedor responsável")
create policy profiles_update_ceo on public.profiles for update to authenticated
  using (public.is_ceo()) with check (public.is_ceo());
-- Criação de contas: só pelo servidor (service_role), a pedido do CEO.

-- ---------------------------------------------------------------------
-- settings: todos lêem (a app precisa de saber que regras estão ligadas); só o CEO altera
-- ---------------------------------------------------------------------
create policy settings_select on public.settings for select to authenticated
  using (public.is_active_user());
create policy settings_write_ceo on public.settings for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- ---------------------------------------------------------------------
-- Etiquetas
-- ---------------------------------------------------------------------
create policy tags_select on public.tags for select to authenticated
  using (
    public.is_ceo()
    or (public.is_active_user() and not public.tag_hidden_for_me(id))
  );
create policy tags_write_ceo on public.tags for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy tag_restrictions_ceo on public.tag_restrictions for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy client_tags_select on public.client_tags for select to authenticated
  using (public.can_see_client(client_id));
create policy client_tags_insert on public.client_tags for insert to authenticated
  with check (
    public.can_see_client(client_id)
    and (public.is_ceo() or not public.tag_hidden_for_me(tag_id))
  );
create policy client_tags_delete on public.client_tags for delete to authenticated
  using (public.can_see_client(client_id));

-- ---------------------------------------------------------------------
-- Clientes (D25: o Vendedor vê e edita todos, excepto etiquetas restritas)
-- ---------------------------------------------------------------------
create policy clients_select on public.clients for select to authenticated
  using (public.can_see_client(id));
create policy clients_insert on public.clients for insert to authenticated
  with check (public.is_active_user());
create policy clients_update on public.clients for update to authenticated
  using (public.can_see_client(id)) with check (public.is_active_user());
create policy clients_delete_ceo on public.clients for delete to authenticated
  using (public.is_ceo());                         -- D27: só o CEO apaga

create policy client_notes_select on public.client_notes for select to authenticated
  using (public.can_see_client(client_id));
create policy client_notes_insert on public.client_notes for insert to authenticated
  with check (public.can_see_client(client_id));
create policy client_notes_delete_ceo on public.client_notes for delete to authenticated
  using (public.is_ceo());

create policy funnel_history_select on public.funnel_stage_history for select to authenticated
  using (public.can_see_client(client_id));

-- ---------------------------------------------------------------------
-- Produtos (todos vêem preços de venda; só o CEO altera)
-- ---------------------------------------------------------------------
create policy products_select on public.products for select to authenticated
  using (public.is_active_user());
create policy products_write_ceo on public.products for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy variants_select on public.product_variants for select to authenticated
  using (public.is_active_user());
create policy variants_write_ceo on public.product_variants for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- Custo: SÓ o CEO
create policy variant_costs_ceo on public.product_variant_costs for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

-- Movimentos de stock: todos vêem; entradas e ajustes só CEO/ADM (D24).
-- Saídas por venda e devoluções por cancelamento são criadas pelas funções de venda.
create policy stock_select on public.stock_movements for select to authenticated
  using (public.is_active_user());
create policy stock_insert_adm on public.stock_movements for insert to authenticated
  with check (public.is_adm_or_ceo() and movement_type in ('entrada', 'ajuste') and sale_id is null);

-- ---------------------------------------------------------------------
-- Vendas e afins: leitura conforme o cliente; escrita só por funções do servidor
-- ---------------------------------------------------------------------
create policy sales_select on public.sales for select to authenticated
  using (public.can_see_client(client_id));
create policy sale_items_select on public.sale_items for select to authenticated
  using (public.can_see_sale(sale_id));
create policy sale_item_costs_ceo on public.sale_item_costs for select to authenticated
  using (public.is_ceo());                         -- margens: SÓ o CEO
create policy payments_select on public.payments for select to authenticated
  using (public.can_see_sale(sale_id));
create policy installments_select on public.installments for select to authenticated
  using (public.can_see_sale(sale_id));
create policy discount_requests_select on public.discount_requests for select to authenticated
  using (public.is_ceo() or requested_by = auth.uid());

-- ---------------------------------------------------------------------
-- Fidelização: leitura conforme o cliente; escrita por funções (cupões manuais: CEO)
-- ---------------------------------------------------------------------
create policy coupons_select on public.coupons for select to authenticated
  using (public.can_see_client(client_id));
create policy coupons_write_ceo on public.coupons for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo() and kind = 'manual');
create policy loyalty_select on public.loyalty_ledger for select to authenticated
  using (public.can_see_client(client_id));
create policy referrals_select on public.referrals for select to authenticated
  using (public.can_see_client(referred_id) and public.can_see_client(referrer_id));

-- ---------------------------------------------------------------------
-- Fase 2
-- ---------------------------------------------------------------------
create policy reminders_select on public.reminders for select to authenticated
  using (public.is_ceo() or (assigned_to = auth.uid() and (client_id is null or public.can_see_client(client_id))));
create policy reminders_update on public.reminders for update to authenticated
  using (public.is_ceo() or assigned_to = auth.uid())
  with check (public.is_ceo() or assigned_to = auth.uid());

create policy templates_select on public.message_templates for select to authenticated
  using (public.is_active_user());
create policy templates_write_ceo on public.message_templates for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy goals_select on public.goals for select to authenticated
  using (public.is_ceo() or seller_id = auth.uid());
create policy goals_write_ceo on public.goals for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy commission_select on public.commission_rules for select to authenticated
  using (public.is_ceo() or seller_id = auth.uid() or (seller_id is null and public.is_active_user()));
create policy commission_write_ceo on public.commission_rules for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Auditoria: SÓ o CEO lê; ninguém escreve directamente
-- ---------------------------------------------------------------------
create policy audit_select_ceo on public.audit_log for select to authenticated
  using (public.is_ceo());

-- ---------------------------------------------------------------------
-- Fases 3 e 4
-- ---------------------------------------------------------------------
create policy kb_select on public.kb_documents for select to authenticated
  using (public.is_active_user());
create policy kb_write_ceo on public.kb_documents for all to authenticated
  using (public.is_ceo()) with check (public.is_ceo());

create policy conversations_select on public.conversations for select to authenticated
  using (public.is_ceo() or (client_id is not null and public.can_see_client(client_id)));
create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and (public.is_ceo() or (c.client_id is not null and public.can_see_client(c.client_id)))));
