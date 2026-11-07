-- =====================================================================
-- Vendas (passo 1F). Os preços, descontos, tecto de custo e margens são
-- calculados AQUI, no servidor. O aparelho envia apenas o que foi escolhido
-- (cliente, perfumes, quantidades, cupão, escalão de pontos, desconto pedido,
-- pagamentos). Repetir o envio da mesma venda (mesmo id) não a duplica.
-- =====================================================================

alter table public.sales add column request_payload jsonb;
alter table public.sales add column approval_reason text not null default '';

-- ---------------------------------------------------------------------
-- Cálculo da venda (em cêntimos, inteiros). Mesmo algoritmo que
-- src/lib/sales/pricing.ts (os testes usam os mesmos casos).
--   1) "paga 1, leva 2": 1 unidade grátis (a de menor ou maior valor)
--   2) percentagens (cupão + pontos, somadas), arredondadas por linha
--   3) desconto manual em Kz, repartido pelas linhas (o resto vai para a última)
--   4) tecto: nenhuma linha abaixo do custo (a unidade grátis é excepção, D2);
--      se passar, corta-se primeiro o desconto manual e depois as percentagens
-- Devolve também o custo: NUNCA expor esta função ao Vendedor.
-- ---------------------------------------------------------------------
create or replace function public.price_sale(
  p_items jsonb,               -- [{"variant_id": "...", "quantity": 2}, ...]
  p_client_type public.client_type,
  p_coupon_bp integer,         -- percentagem × 100 (5% = 500)
  p_points_bp integer,
  p_free_rule text,            -- null | 'menor_valor' | 'maior_valor'
  p_manual bigint,             -- cêntimos
  p_floor boolean,
  p_exception boolean
) returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  ids uuid[] := '{}';
  qty integer[] := '{}';
  unit bigint[] := '{}';
  cost bigint[] := '{}';
  free bigint[];
  base bigint[];
  pct bigint[];
  man bigint[];
  n integer;
  i integer;
  it jsonb;
  v_id uuid;
  v_q integer;
  pos integer;
  v_unit bigint;
  v_cost bigint;
  bp integer := coalesce(p_coupon_bp, 0) + coalesce(p_points_bp, 0);
  total_after bigint := 0;
  manual_left bigint;
  last_nonzero integer := 0;
  share bigint;
  maxd bigint;
  floor_i bigint;
  capped boolean := false;
  below boolean := false;
  free_idx integer := 0;
  total_units integer := 0;
  lines jsonb := '[]';
  subtotal bigint := 0;
  total bigint := 0;
  pct_sum bigint := 0;
  free_sum bigint := 0;
  man_sum bigint := 0;
  coupon_part bigint;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A venda não tem perfumes.' using errcode = 'P0001';
  end if;
  -- juntar linhas repetidas da mesma variação, pela ordem em que aparecem
  for it in select * from jsonb_array_elements(p_items) loop
    v_id := (it ->> 'variant_id')::uuid;
    v_q := (it ->> 'quantity')::integer;
    if v_q is null or v_q <= 0 then
      raise exception 'Quantidade inválida.' using errcode = 'P0001';
    end if;
    pos := array_position(ids, v_id);
    if pos is null then
      select case when p_client_type = 'revendedor' then round(v.price_reseller * 100) else round(v.price_retail * 100) end::bigint,
             round(c.cost_price * 100)::bigint
        into v_unit, v_cost
        from product_variants v
        join products p on p.id = v.product_id
        left join product_variant_costs c on c.variant_id = v.id
       where v.id = v_id and v.active and p.active;
      if not found then
        raise exception 'Um dos perfumes já não está disponível.' using errcode = 'P0001';
      end if;
      ids := ids || v_id;
      qty := qty || v_q;
      unit := unit || v_unit;
      cost := cost || v_cost;
    else
      qty[pos] := qty[pos] + v_q;
    end if;
  end loop;
  n := array_length(ids, 1);
  free := array_fill(0::bigint, array[n]);
  base := array_fill(0::bigint, array[n]);
  pct := array_fill(0::bigint, array[n]);
  man := array_fill(0::bigint, array[n]);

  -- 1) unidade grátis
  if p_free_rule is not null then
    for i in 1..n loop total_units := total_units + qty[i]; end loop;
    if total_units < 2 then
      raise exception '"Paga 1, leva 2" precisa de pelo menos 2 perfumes na venda.' using errcode = 'P0001';
    end if;
    for i in 1..n loop
      if free_idx = 0
         or (p_free_rule = 'maior_valor' and unit[i] > unit[free_idx])
         or (p_free_rule <> 'maior_valor' and unit[i] < unit[free_idx]) then
        free_idx := i;
      end if;
    end loop;
    free[free_idx] := unit[free_idx];
  end if;

  -- 2) percentagens
  for i in 1..n loop
    base[i] := unit[i] * qty[i] - free[i];
    pct[i] := (base[i] * bp + 5000) / 10000;
    total_after := total_after + (base[i] - pct[i]);
    if base[i] - pct[i] > 0 then last_nonzero := i; end if;
  end loop;

  -- 3) desconto manual
  manual_left := least(greatest(coalesce(p_manual, 0), 0), total_after);
  if manual_left > 0 then
    for i in 1..n loop
      if i = last_nonzero then
        man[i] := manual_left;
        exit;
      end if;
      share := (least(greatest(coalesce(p_manual, 0), 0), total_after) * (base[i] - pct[i])) / total_after;
      man[i] := share;
      manual_left := manual_left - share;
    end loop;
  end if;

  -- 4) tecto de custo
  for i in 1..n loop
    if cost[i] is not null then
      floor_i := cost[i] * (qty[i] - case when free[i] > 0 then 1 else 0 end);
      maxd := greatest(base[i] - floor_i, 0);
      if pct[i] + man[i] > maxd then
        if p_floor and not p_exception then
          capped := true;
          -- mantém o que o cliente ganhou (cupão/pontos) e corta o desconto manual
          pct[i] := least(pct[i], maxd);
          man[i] := least(man[i], maxd - pct[i]);
        else
          below := true;
        end if;
      end if;
    end if;
  end loop;

  for i in 1..n loop
    subtotal := subtotal + unit[i] * qty[i];
    total := total + unit[i] * qty[i] - free[i] - pct[i] - man[i];
    pct_sum := pct_sum + pct[i];
    free_sum := free_sum + free[i];
    man_sum := man_sum + man[i];
    lines := lines || jsonb_build_object(
      'variant_id', ids[i], 'quantity', qty[i], 'unit_cents', unit[i], 'cost_cents', cost[i],
      'discount_cents', free[i] + pct[i] + man[i], 'total_cents', unit[i] * qty[i] - free[i] - pct[i] - man[i],
      'is_free_item', free[i] > 0);
  end loop;
  coupon_part := case when bp = 0 then 0 else (pct_sum * coalesce(p_coupon_bp, 0) + bp / 2) / bp end;

  return jsonb_build_object(
    'lines', lines, 'subtotal_cents', subtotal, 'total_cents', total,
    'coupon_cents', coupon_part, 'points_cents', pct_sum - coupon_part + free_sum, 'manual_cents', man_sum,
    'capped', capped, 'below_cost', below);
end;
$$;
revoke execute on function public.price_sale(jsonb, public.client_type, integer, integer, text, bigint, boolean, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Resumo de uma venda (o que o aparelho recebe de volta)
-- ---------------------------------------------------------------------
create or replace function public.sale_result(p_sale_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id, 'number', s.number, 'status', s.status, 'payment_status', s.payment_status,
    'total', s.total, 'paid', coalesce((select sum(amount) from payments where sale_id = s.id), 0),
    'approval_reason', s.approval_reason)
  from sales s where s.id = p_sale_id
$$;
revoke execute on function public.sale_result(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Calcula e grava itens/totais de uma venda a partir do pedido do aparelho.
-- Valida cupão e pontos (D4). Devolve o que precisa de aprovação.
-- ---------------------------------------------------------------------
create or replace function public.apply_sale_pricing(p_sale_id uuid, p jsonb, p_manual bigint, p_exception boolean, p_drop_invalid boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_client public.clients;
  pts jsonb := public.setting('fidelidade.pontos');
  coup_on boolean := public.setting('fidelidade.cupao_indicacao') is not null;
  floor_on boolean := public.setting('vendas.tecto_custo') is not null;
  v_coupon public.coupons;
  v_coupon_id uuid := nullif(p ->> 'coupon_id', '')::uuid;
  v_tier integer := nullif(p ->> 'points_tier', '')::integer;
  tier jsonb;
  balance integer;
  coupon_bp integer := 0;
  points_bp integer := 0;
  free_rule text;
  coupon_val public.validation_status := 'nao_aplicavel';
  points_val public.validation_status := 'nao_aplicavel';
  reasons text[] := '{}';
  pr jsonb;
  l jsonb;
  v_item uuid;
begin
  select * into v_client from clients where id = (p ->> 'client_id')::uuid;

  if v_coupon_id is not null then
    select * into v_coupon from coupons
     where id = v_coupon_id and client_id = v_client.id and status = 'activo' and expires_at > now()
       and (kind = 'manual' or coup_on)
       and (used_in_sale_id is null or used_in_sale_id = p_sale_id);
    if found then
      coupon_bp := round(v_coupon.percent * 100);
      coupon_val := 'validado';
    else
      coupon_val := 'rejeitado';
      reasons := array_append(reasons, 'O cupão já não é válido (usado noutra venda, expirado ou desligado).');
    end if;
  end if;

  if v_tier is not null then
    select coalesce(sum(points), 0) into balance from loyalty_ledger where client_id = v_client.id;
    -- numa venda já gravada à espera de aprovação, os pontos ainda não foram gastos
    select e into tier from jsonb_array_elements(coalesce(pts -> 'escaloes', '[]')) e where (e ->> 'pontos')::integer = v_tier;
    if pts is null or tier is null or v_tier < coalesce((pts ->> 'minimo_troca')::integer, 50) or balance < v_tier then
      points_val := 'rejeitado';
      reasons := array_append(reasons, 'O cliente já não tem pontos suficientes para este escalão (ou os pontos estão desligados).');
    else
      points_val := 'validado';
      if tier ->> 'tipo' = 'percentagem' then
        points_bp := round((tier ->> 'valor')::numeric * 100);
      else
        free_rule := coalesce(tier ->> 'item_gratis', 'menor_valor');
      end if;
    end if;
  end if;

  pr := public.price_sale(p -> 'items', v_client.client_type, coupon_bp, points_bp, free_rule, p_manual, floor_on, p_exception);

  delete from sale_items where sale_id = p_sale_id;
  for l in select * from jsonb_array_elements(pr -> 'lines') loop
    v_item := gen_random_uuid();
    insert into sale_items (id, sale_id, variant_id, quantity, unit_price, discount_amount, line_total, is_free_item)
    values (v_item, p_sale_id, (l ->> 'variant_id')::uuid, (l ->> 'quantity')::integer,
            (l ->> 'unit_cents')::numeric / 100, (l ->> 'discount_cents')::numeric / 100,
            (l ->> 'total_cents')::numeric / 100, (l ->> 'is_free_item')::boolean);
    if l ->> 'cost_cents' is not null then
      insert into sale_item_costs (sale_item_id, unit_cost, margin)
      values (v_item, (l ->> 'cost_cents')::numeric / 100,
              ((l ->> 'total_cents')::bigint - (l ->> 'cost_cents')::bigint * (l ->> 'quantity')::bigint)::numeric / 100);
    end if;
  end loop;

  update sales set
    subtotal = (pr ->> 'subtotal_cents')::numeric / 100,
    coupon_discount = (pr ->> 'coupon_cents')::numeric / 100,
    points_discount = (pr ->> 'points_cents')::numeric / 100,
    manual_discount = (pr ->> 'manual_cents')::numeric / 100,
    total = (pr ->> 'total_cents')::numeric / 100,
    coupon_id = case when coupon_val = 'validado' then v_coupon_id else null end,
    coupon_validation = coupon_val,
    points_redeemed = case when points_val = 'validado' then v_tier else 0 end,
    points_tier = case when points_val = 'validado' then v_tier else null end,
    points_validation = points_val,
    cost_floor_exception = p_exception and (pr ->> 'below_cost')::boolean
  where id = p_sale_id;

  return jsonb_build_object('reasons', to_jsonb(reasons), 'capped', pr -> 'capped', 'below_cost', pr -> 'below_cost',
                            'total_cents', pr -> 'total_cents');
end;
$$;
revoke execute on function public.apply_sale_pricing(uuid, jsonb, bigint, boolean, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Confirmar: stock sai, cupão e pontos são gastos, pagamentos entram.
-- ---------------------------------------------------------------------
create or replace function public.finalize_sale(p_sale_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s public.sales;
  pay jsonb;
  v_paid numeric(14,2);
  v_days integer := coalesce((public.setting('vendas.prazo_divida_dias') ->> 'dias')::integer, 35);
begin
  select * into s from sales where id = p_sale_id for update;

  select coalesce(sum((x ->> 'amount')::numeric), 0) into v_paid
    from jsonb_array_elements(coalesce(s.request_payload -> 'payments', '[]')) x;
  if v_paid > s.total then
    raise exception 'Os pagamentos (%) ultrapassam o total da venda (%).', v_paid, s.total using errcode = 'P0001';
  end if;

  insert into stock_movements (variant_id, quantity, movement_type, reason, sale_id, created_by)
  select variant_id, -quantity, 'venda', 'Venda n.º ' || s.number, s.id, s.seller_id from sale_items where sale_id = s.id;

  if s.coupon_id is not null then
    update coupons set status = 'usado', used_in_sale_id = s.id, used_at = now() where id = s.coupon_id;
  end if;
  if s.points_redeemed > 0 then
    insert into loyalty_ledger (client_id, points, entry_type, sale_id, note, created_by)
    values (s.client_id, -s.points_redeemed, 'troca', s.id, 'Troca de ' || s.points_redeemed || ' pontos na venda n.º ' || s.number, s.seller_id);
  end if;

  update sales set status = 'confirmada', confirmed_at = now(),
    due_date = case when v_paid < s.total then coalesce(nullif(s.request_payload ->> 'due_date', '')::date, public.today_luanda() + v_days) else null end
  where id = s.id;

  for pay in select * from jsonb_array_elements(coalesce(s.request_payload -> 'payments', '[]')) loop
    insert into payments (id, sale_id, amount, method, paid_at, created_by)
    values (coalesce(nullif(pay ->> 'id', '')::uuid, gen_random_uuid()), s.id, (pay ->> 'amount')::numeric,
            (pay ->> 'method')::public.payment_method, coalesce(nullif(s.request_payload ->> 'device_created_at', '')::timestamptz, now()), s.seller_id)
    on conflict (id) do nothing;
  end loop;
  perform public.recompute_payment_status(s.id);
end;
$$;
revoke execute on function public.finalize_sale(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Registar uma venda (chamado pelo aparelho; idempotente)
-- ---------------------------------------------------------------------
create or replace function public.submit_sale(p jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
  v_role public.user_role := public.current_profile_role();
  v_client uuid := (p ->> 'client_id')::uuid;
  v_manual bigint := coalesce(round(nullif(p ->> 'manual_discount', '')::numeric * 100), 0)::bigint;
  v_request boolean;
  v_exception boolean;
  r jsonb;
  v_pay numeric(14,2);
  v_needs boolean;
  v_reasons text;
  v_number integer;
begin
  if v_role is null then raise exception 'Sem sessão activa.' using errcode = '42501'; end if;
  if v_id is null then raise exception 'Venda sem identificador.' using errcode = 'P0001'; end if;
  -- Já recebida (ex.: reenvio depois de falha de rede): devolve a mesma, sem duplicar
  if exists (select 1 from sales where id = v_id) then
    return public.sale_result(v_id) || '{"repetida": true}';
  end if;
  if not exists (select 1 from clients where id = v_client and erased_at is null) or not public.can_see_client(v_client) then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;
  if v_manual < 0 then raise exception 'Desconto inválido.' using errcode = 'P0001'; end if;
  select coalesce(sum((x ->> 'amount')::numeric), 0) into v_pay from jsonb_array_elements(coalesce(p -> 'payments', '[]')) x;
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'payments', '[]')) x
             where (x ->> 'amount')::numeric <= 0 or (x ->> 'method') not in ('numerario', 'transferencia', 'multicaixa_express')) then
    raise exception 'Pagamento inválido.' using errcode = 'P0001';
  end if;

  v_request := v_manual > 0 and v_role <> 'ceo';                 -- o Vendedor só pode PEDIR desconto
  v_exception := coalesce((p ->> 'cost_floor_exception')::boolean, false) and v_role = 'ceo';

  insert into sales (id, client_id, seller_id, status, notes, device_created_at, created_by, request_payload)
  values (v_id, v_client, auth.uid(), 'rascunho', coalesce(p ->> 'notes', ''),
          nullif(p ->> 'device_created_at', '')::timestamptz, auth.uid(), p)
  returning number into v_number;

  r := public.apply_sale_pricing(v_id, p, case when v_request then 0 else v_manual end, v_exception, false);
  v_needs := v_request or jsonb_array_length(r -> 'reasons') > 0;
  select string_agg(x, ' ') into v_reasons from jsonb_array_elements_text(r -> 'reasons') x;
  if v_request then
    v_reasons := trim(concat_ws(' ', 'Pedido de desconto de ' || to_char(v_manual::numeric / 100, 'FM999G999G990D00') || ' Kz.', v_reasons));
    insert into discount_requests (sale_id, requested_by, requested_amount, reason)
    values (v_id, auth.uid(), v_manual::numeric / 100, coalesce(p ->> 'discount_reason', ''));
  end if;

  if v_needs then
    update sales set status = 'aguarda_aprovacao', approval_reason = coalesce(v_reasons, '') where id = v_id;
    -- avisar os CEO (notificação dentro da app; push na Fase 2)
    insert into notifications (user_id, kind, title, body, link)
    select id, 'aprovacao_venda', 'Venda n.º ' || v_number || ' aguarda aprovação', coalesce(v_reasons, ''), '/vendas/ficha?id=' || v_id
      from profiles where role = 'ceo' and active;
  else
    if v_pay > (r ->> 'total_cents')::numeric / 100 then
      raise exception 'Os pagamentos ultrapassam o total da venda.' using errcode = 'P0001';
    end if;
    perform public.finalize_sale(v_id);
  end if;
  if (r ->> 'below_cost')::boolean and v_exception then
    perform public.log_exception('sales', v_id::text, 'CEO autorizou venda abaixo do custo (n.º ' || v_number || ').', r);
  end if;
  return public.sale_result(v_id) || jsonb_build_object('capped', r -> 'capped');
end;
$$;

-- ---------------------------------------------------------------------
-- Decisão do CEO sobre uma venda à espera de aprovação
--   'aprovar'      -> confirma com o desconto indicado (p_amount, Kz)
--   'sem_desconto' -> confirma sem desconto manual
--   'anular'       -> a venda não se faz (nada sai do stock)
-- ---------------------------------------------------------------------
create or replace function public.decide_sale(p_sale_id uuid, p_decision text, p_amount numeric default 0, p_note text default '', p_exception boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  s public.sales;
  r jsonb;
  v_manual bigint := 0;
begin
  if not public.is_ceo() then raise exception 'Só o CEO decide aprovações.' using errcode = '42501'; end if;
  select * into s from sales where id = p_sale_id for update;
  if not found or s.status <> 'aguarda_aprovacao' then
    raise exception 'Esta venda já não está à espera de aprovação.' using errcode = 'P0001';
  end if;
  if p_decision not in ('aprovar', 'sem_desconto', 'anular') then raise exception 'Decisão inválida.'; end if;

  if p_decision = 'anular' then
    update sales set status = 'cancelada', cancelled_at = now(), cancelled_by = auth.uid(),
      cancel_reason = coalesce(nullif(trim(p_note), ''), 'Não aprovada pelo CEO') where id = s.id;
    update discount_requests set status = 'recusado', decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(p_note, '')
     where sale_id = s.id and status = 'pendente';
    return public.sale_result(s.id);
  end if;

  if p_decision = 'aprovar' then
    if coalesce(p_amount, 0) < 0 then raise exception 'Desconto inválido.'; end if;
    v_manual := round(coalesce(p_amount, 0) * 100);
  end if;
  r := public.apply_sale_pricing(s.id, s.request_payload, v_manual, coalesce(p_exception, false), true);
  update discount_requests set
    status = case when p_decision = 'aprovar' then 'aprovado'::public.request_status else 'recusado'::public.request_status end,
    approved_amount = case when p_decision = 'aprovar' then (select manual_discount from sales where id = s.id) else null end,
    decided_by = auth.uid(), decided_at = now(), decision_note = coalesce(p_note, '')
   where sale_id = s.id and status = 'pendente';
  perform public.finalize_sale(s.id);
  if (r ->> 'below_cost')::boolean and p_exception then
    perform public.log_exception('sales', s.id::text, 'CEO autorizou venda abaixo do custo (n.º ' || s.number || ').', r);
  end if;
  insert into notifications (user_id, kind, title, body, link)
  values (s.seller_id, 'decisao_venda', 'Venda n.º ' || s.number || ' confirmada',
          case when p_decision = 'aprovar' then 'O desconto foi aprovado.' else 'Confirmada sem o desconto pedido.' end,
          '/vendas/ficha?id=' || s.id);
  return public.sale_result(s.id) || jsonb_build_object('capped', r -> 'capped');
end;
$$;

-- ---------------------------------------------------------------------
-- Cancelar uma venda confirmada (só CEO): devolve stock, cupão e pontos.
-- ---------------------------------------------------------------------
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  s public.sales;
  v_troca integer;
  v_ganho integer;
begin
  if not public.is_ceo() then raise exception 'Só o CEO pode cancelar vendas.' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Indique o motivo do cancelamento.' using errcode = 'P0001'; end if;
  select * into s from sales where id = p_sale_id for update;
  if not found or s.status <> 'confirmada' then
    raise exception 'Só vendas confirmadas podem ser canceladas.' using errcode = 'P0001';
  end if;

  insert into stock_movements (variant_id, quantity, movement_type, reason, sale_id)
  select variant_id, quantity, 'cancelamento', 'Cancelamento da venda n.º ' || s.number, s.id from sale_items where sale_id = s.id;

  if s.coupon_id is not null then
    update coupons set status = case when expires_at > now() then 'activo'::public.coupon_status else 'expirado'::public.coupon_status end,
                       used_in_sale_id = null, used_at = null
     where id = s.coupon_id and used_in_sale_id = s.id;
  end if;

  select coalesce(-sum(points) filter (where entry_type = 'troca'), 0),
         coalesce(sum(points) filter (where entry_type = 'ganho'), 0)
    into v_troca, v_ganho
    from loyalty_ledger where sale_id = s.id;
  if v_troca > 0 then  -- D19: os pontos gastos voltam ao cliente
    insert into loyalty_ledger (client_id, points, entry_type, sale_id, note)
    values (s.client_id, v_troca, 'devolucao', s.id, 'Devolução de pontos: venda n.º ' || s.number || ' cancelada');
  end if;
  if v_ganho > 0 then  -- os pontos ganhos com a venda são anulados
    insert into loyalty_ledger (client_id, points, entry_type, sale_id, note)
    values (s.client_id, -v_ganho, 'anulacao', s.id, 'Anulação de pontos: venda n.º ' || s.number || ' cancelada');
  end if;

  update sales set status = 'cancelada', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = trim(p_reason)
   where id = s.id;
  return public.sale_result(s.id);
end;
$$;

revoke execute on function public.submit_sale(jsonb) from anon;
revoke execute on function public.decide_sale(uuid, text, numeric, text, boolean) from anon;
revoke execute on function public.cancel_sale(uuid, text) from anon;
