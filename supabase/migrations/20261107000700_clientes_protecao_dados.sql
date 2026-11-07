-- =====================================================================
-- Clientes: exportar e apagar dados pessoais a pedido (Lei n.º 22/11)
-- Só o CEO (D27). Se o cliente já tem vendas, os dados pessoais são
-- anonimizados (as vendas continuam a contar para as contas da Smell);
-- se não tem, o cliente é apagado. Em ambos os casos os dados pessoais
-- também são retirados do histórico de alterações (audit_log).
-- =====================================================================

alter table public.clients add column erased_at timestamptz;
alter table public.clients drop constraint clients_whatsapp_check;
alter table public.clients add constraint clients_whatsapp_check
  check (whatsapp ~ '^\+[1-9][0-9]{6,14}$' or (erased_at is not null and whatsapp = ''));

-- Os registos "só de acrescentar" ficam protegidos, excepto durante o
-- apagamento de dados pessoais feito pela função erase_client.
create or replace function public.tg_append_only()
returns trigger
language plpgsql
as $$
begin
  -- Só a função erase_client liga esta marca (os utilizadores não têm acesso directo
  -- a estas tabelas para alterar ou apagar: não há regras RLS que o permitam).
  if current_setting('smell.apagar_dados', true) = 'sim' then
    return coalesce(new, old);
  end if;
  raise exception 'Registo não pode ser alterado nem apagado (%).', tg_table_name
    using errcode = 'P0001';
end;
$$;

-- A indicação pode ser retirada quando quem indicou pede para apagar os seus dados.
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
      if current_setting('smell.apagar_dados', true) is distinct from 'sim'
         and exists (select 1 from public.referrals r where r.referred_id = new.id and r.first_sale_id is not null) then
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

-- Exporta tudo o que a Smell guarda sobre um cliente (JSON)
create or replace function public.export_client_data(p_client_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_ceo() then
    raise exception 'Só o CEO pode exportar dados de clientes.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'exportado_em', now(),
    'cliente', to_jsonb(c) - 'erased_at',
    'etiquetas', coalesce((select jsonb_agg(t.name) from client_tags ct join tags t on t.id = ct.tag_id where ct.client_id = c.id), '[]'),
    'notas', coalesce((select jsonb_agg(jsonb_build_object('data', n.created_at, 'texto', n.body) order by n.created_at) from client_notes n where n.client_id = c.id), '[]'),
    'historico_funil', coalesce((select jsonb_agg(jsonb_build_object('data', h.changed_at, 'de', h.from_stage, 'para', h.to_stage) order by h.changed_at) from funnel_stage_history h where h.client_id = c.id), '[]'),
    'compras', coalesce((select jsonb_agg(jsonb_build_object(
        'numero', s.number, 'data', s.created_at, 'estado', s.status, 'total', s.total, 'pagamento', s.payment_status,
        'itens', (select jsonb_agg(jsonb_build_object('produto', p.name, 'variacao', v.label, 'quantidade', i.quantity, 'total', i.line_total))
                  from sale_items i join product_variants v on v.id = i.variant_id join products p on p.id = v.product_id where i.sale_id = s.id),
        'pagamentos', (select jsonb_agg(jsonb_build_object('data', pm.paid_at, 'valor', pm.amount, 'forma', pm.method)) from payments pm where pm.sale_id = s.id)
      ) order by s.created_at) from sales s where s.client_id = c.id), '[]'),
    'pontos', coalesce((select jsonb_agg(jsonb_build_object('data', l.created_at, 'pontos', l.points, 'tipo', l.entry_type) order by l.created_at) from loyalty_ledger l where l.client_id = c.id), '[]'),
    'cupoes', coalesce((select jsonb_agg(jsonb_build_object('codigo', cp.code, 'percentagem', cp.percent, 'estado', cp.status, 'validade', cp.expires_at)) from coupons cp where cp.client_id = c.id), '[]'),
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object('data', m.created_at, 'direccao', m.direction, 'texto', m.body) order by m.created_at)
                           from conversations cv join messages m on m.conversation_id = cv.id where cv.client_id = c.id), '[]')
  ) into v
  from clients c where c.id = p_client_id;
  if v is null then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;
  perform public.log_exception('clients', p_client_id::text, 'Dados do cliente exportados a pedido (Lei 22/11).');
  return v;
end;
$$;

-- Apaga (ou anonimiza) os dados pessoais de um cliente
create or replace function public.erase_client(p_client_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code integer;
  v_has_sales boolean;
  v_note_ids text[];
  v_result text;
begin
  if not public.is_ceo() then
    raise exception 'Só o CEO pode apagar dados de clientes.' using errcode = '42501';
  end if;
  select code into v_code from clients where id = p_client_id and erased_at is null;
  if v_code is null then
    raise exception 'Cliente não encontrado ou já apagado.' using errcode = 'P0002';
  end if;
  v_has_sales := exists (select 1 from sales where client_id = p_client_id);
  select coalesce(array_agg(id::text), '{}') into v_note_ids from client_notes where client_id = p_client_id;

  -- Retira os dados pessoais do histórico de alterações
  perform set_config('smell.apagar_dados', 'sim', true);
  update audit_log set old_data = null, new_data = null, note = 'Dados pessoais apagados (Lei 22/11).'
   where (table_name = 'clients' and record_id = p_client_id::text)
      or (table_name = 'client_notes' and record_id = any (v_note_ids))
      or (table_name = 'client_tags' and record_id like p_client_id::text || ':%');
  perform set_config('smell.apagar_dados', 'nao', true);

  update messages set body = '', payload = '{}'::jsonb
   where conversation_id in (select id from conversations where client_id = p_client_id);

  if v_has_sales then
    delete from client_notes where client_id = p_client_id;
    delete from client_tags where client_id = p_client_id;
    update clients set
      name = 'Cliente apagado', whatsapp = '', address = '', birthday_day = null, birthday_month = null,
      occupation = '', notes = '', perfume_preferences = '', consent = false, opt_out = true,
      erased_at = now()
     where id = p_client_id;
    -- a actualização acima voltou a escrever no histórico: limpar também
    perform set_config('smell.apagar_dados', 'sim', true);
    update audit_log set old_data = null, new_data = null, note = 'Dados pessoais apagados (Lei 22/11).'
     where table_name = 'clients' and record_id = p_client_id::text and (old_data is not null or new_data is not null);
    perform set_config('smell.apagar_dados', 'nao', true);
    v_result := 'anonimizado';
  else
    perform set_config('smell.apagar_dados', 'sim', true);
    update clients set referred_by = null where referred_by = p_client_id;
    delete from clients where id = p_client_id;
    update audit_log set old_data = null, new_data = null, note = 'Dados pessoais apagados (Lei 22/11).'
     where table_name in ('clients', 'client_notes', 'client_tags', 'funnel_stage_history', 'referrals')
       and (record_id = p_client_id::text or record_id like p_client_id::text || ':%' or record_id = any (v_note_ids)
            or new_data ->> 'client_id' = p_client_id::text or old_data ->> 'client_id' = p_client_id::text
            or old_data ->> 'referred_id' = p_client_id::text);
    perform set_config('smell.apagar_dados', 'nao', true);
    v_result := 'apagado';
  end if;

  perform public.log_exception('clients', p_client_id::text,
    format('Cliente %s: dados pessoais %s a pedido (Lei 22/11).', lpad(v_code::text, 4, '0'), v_result));
  return v_result;
end;
$$;

revoke execute on function public.export_client_data(uuid) from anon;
revoke execute on function public.erase_client(uuid) from anon;
