-- =====================================================================
-- Vistas (consultas prontas). Todas com security_invoker: respeitam as
-- regras RLS de quem consulta. As vistas de margem só devolvem dados ao CEO.
-- =====================================================================

-- Stock actual = soma dos movimentos
create view public.variant_stock with (security_invoker = true) as
select v.id as variant_id,
       coalesce(sum(m.quantity), 0)::integer as quantity
from public.product_variants v
left join public.stock_movements m on m.variant_id = v.id
group by v.id;

-- Catálogo para a venda (sem custo)
create view public.catalog with (security_invoker = true) as
select v.id as variant_id,
       v.sku,
       p.id as product_id,
       p.name as product_name,
       p.brand,
       p.category,
       v.label,
       coalesce(v.photo_path, p.photo_paths[1]) as photo_path,
       v.price_retail,
       v.price_reseller,
       v.min_stock,
       v.replenish_days,
       s.quantity as stock,
       (s.quantity <= v.min_stock) as low_stock,
       (p.active and v.active) as active
from public.product_variants v
join public.products p on p.id = v.product_id
join public.variant_stock s on s.variant_id = v.id;

-- Saldo de cada venda
create view public.sale_balances with (security_invoker = true) as
select s.id as sale_id,
       s.client_id,
       s.total,
       coalesce(p.paid, 0)::numeric(14,2) as paid,
       greatest(s.total - coalesce(p.paid, 0), 0)::numeric(14,2) as balance,
       s.payment_status,
       s.due_date
from public.sales s
left join (select sale_id, sum(amount) as paid from public.payments group by sale_id) p on p.sale_id = s.id
where s.status = 'confirmada';

-- Resumo do cliente (campos calculados da ficha)
create view public.client_summary with (security_invoker = true) as
select c.id as client_id,
       sa.last_purchase_at,
       case when sa.last_purchase_at is null then null
            else public.today_luanda() - (sa.last_purchase_at at time zone 'Africa/Luanda')::date
       end as days_without_purchase,
       coalesce(sa.total_spent, 0)::numeric(14,2) as total_spent,
       coalesce(db.open_debt, 0)::numeric(14,2) as open_debt,
       coalesce(lp.points, 0)::integer as points,
       coalesce(cp.active_coupons, 0)::integer as active_coupons,
       coalesce(rf.referrals_who_bought, 0)::integer as referrals_who_bought
from public.clients c
left join (
  select client_id, max(coalesce(confirmed_at, created_at)) as last_purchase_at, sum(total) as total_spent
  from public.sales where status = 'confirmada' group by client_id
) sa on sa.client_id = c.id
left join (
  select client_id, sum(balance) as open_debt from public.sale_balances group by client_id
) db on db.client_id = c.id
left join (
  select client_id, sum(points) as points from public.loyalty_ledger group by client_id
) lp on lp.client_id = c.id
left join (
  select client_id, count(*) as active_coupons from public.coupons
  where status = 'activo' and expires_at > now() group by client_id
) cp on cp.client_id = c.id
left join (
  select referrer_id, count(*) as referrals_who_bought from public.referrals
  where first_sale_id is not null group by referrer_id
) rf on rf.referrer_id = c.id;

-- Margem por venda (só o CEO recebe linhas: depende de sale_item_costs)
create view public.sale_margins with (security_invoker = true) as
select si.sale_id,
       sum(sic.margin)::numeric(14,2) as margin,
       sum(sic.unit_cost * si.quantity)::numeric(14,2) as cost_total
from public.sale_items si
join public.sale_item_costs sic on sic.sale_item_id = si.id
group by si.sale_id;

revoke all on public.variant_stock, public.catalog, public.sale_balances, public.client_summary, public.sale_margins from anon;
