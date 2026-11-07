-- =====================================================================
-- Produtos e stock
-- =====================================================================
\set ceo  '''11111111-1111-1111-1111-111111111111'''
\set vend '''22222222-2222-2222-2222-222222222222'''

select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', -3, 'entrada', 'x')$q$, 'entrada não pode ser negativa');
select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type) values ('cccccccc-0000-0000-0000-000000000001', 3, 'venda')$q$, 'venda não pode aumentar o stock');

set role authenticated;
select tests.entrar(:ceo);
insert into products (id, name, brand, category) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Oud Real', 'Smell', 'masculino');
insert into product_variants (id, product_id, sku, label, price_retail, price_reseller)
values ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', ' oud-100 ', '100 ml', 45000, 38000);
insert into product_variant_costs (variant_id, cost_price) values ('cccccccc-0000-0000-0000-000000000002', 20000);
select tests.ok((select sku from product_variants where id = 'cccccccc-0000-0000-0000-000000000002') = 'OUD-100', 'SKU normalizado');
select tests.erro($q$insert into product_variants (product_id, sku, label, price_retail, price_reseller) values ('bbbbbbbb-0000-0000-0000-000000000002', 'oud-100', 'x', 1, 1)$q$, 'SKU repetido recusado');
insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000002', 6, 'entrada', 'Fornecedor');
update product_variants set min_stock = 6 where id = 'cccccccc-0000-0000-0000-000000000002';
select tests.ok((select low_stock from catalog where variant_id = 'cccccccc-0000-0000-0000-000000000002'), 'alerta de stock baixo (6 ≤ mínimo 6)');
reset role;
select tests.sair();

-- Vendedor (sem ADM): vê o produto e o stock, nunca o custo; não regista entradas
update profiles set is_adm = false where id = :vend;
set role authenticated;
select tests.entrar(:vend);
select tests.ok((select stock from catalog where variant_id = 'cccccccc-0000-0000-0000-000000000002') = 6, 'vendedor vê o stock');
select tests.ok(not exists (select 1 from product_variant_costs where variant_id = 'cccccccc-0000-0000-0000-000000000002'), 'vendedor não vê o custo do produto novo');
select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000002', 1, 'entrada', 'x')$q$, 'vendedor sem ADM não regista entradas');
select tests.ok(tests.linhas($q$update products set name = 'X' where id = 'bbbbbbbb-0000-0000-0000-000000000002'$q$) = 0, 'vendedor não altera produtos');
reset role;
select tests.sair();
