-- =====================================================================
-- Vendas: preços, descontos, tecto de custo, cupões, pontos, aprovação,
-- idempotência (venda offline reenviada) e cancelamento.
-- Variação A (cccc…01): 30 000 / revendedor 25 000 / custo 15 000
-- Variação B (cccc…02): 45 000 / revendedor 38 000 / custo 20 000
-- =====================================================================
\set ceo  '''11111111-1111-1111-1111-111111111111'''
\set vend '''22222222-2222-2222-2222-222222222222'''
\set A    '''cccccccc-0000-0000-0000-000000000001'''
\set B    '''cccccccc-0000-0000-0000-000000000002'''

create function tests.stock(p uuid) returns integer language sql as $$ select quantity from public.variant_stock where variant_id = p $$;
grant execute on function tests.stock(uuid) to authenticated;
create temp table st as select tests.stock('cccccccc-0000-0000-0000-000000000001') a0, tests.stock('cccccccc-0000-0000-0000-000000000002') b0;
grant select on st to authenticated;

insert into clients (id, name, whatsapp) values ('dddddddd-0000-0000-0000-000000000020', 'Cliente Final', '+244923000020');
insert into clients (id, name, whatsapp, client_type) values ('dddddddd-0000-0000-0000-000000000021', 'Revendedora', '+244923000021', 'revendedor');
update stock_movements set quantity = quantity where false; -- (nada)

-- ---------------------------------------------------------------------
set role authenticated;
select tests.entrar(:vend);

-- 1) Venda simples com pagamento parcial
select submit_sale(jsonb_build_object(
  'id', 'aaaa0000-0000-0000-0000-000000000001', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('id', 'abab0000-0000-0000-0000-000000000001', 'amount', 10000, 'method', 'numerario'))));
select tests.ok((select status from sales where id = 'aaaa0000-0000-0000-0000-000000000001') = 'confirmada', 'venda confirmada');
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000001') = 30000, 'preço de cliente final');
select tests.ok((select payment_status from sales where id = 'aaaa0000-0000-0000-0000-000000000001') = 'parcial', 'pagamento parcial');
select tests.ok((select due_date from sales where id = 'aaaa0000-0000-0000-0000-000000000001') = today_luanda() + 35, 'data limite = hoje + 35 dias (D23)');
select tests.ok(tests.stock(:A) = (select a0 from st) - 1, 'stock desce 1');
select tests.ok((select count(*) from sale_item_costs) = 0, 'vendedor não vê a margem da venda');

-- 2) Reenvio da mesma venda (offline): não duplica
select tests.ok((submit_sale(jsonb_build_object(
  'id', 'aaaa0000-0000-0000-0000-000000000001', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('id', 'abab0000-0000-0000-0000-000000000001', 'amount', 10000, 'method', 'numerario')))) ->> 'repetida')::boolean,
  'reenvio reconhecido');
select tests.ok(tests.stock(:A) = (select a0 from st) - 1, 'stock desce uma só vez');
select tests.ok((select count(*) from payments where sale_id = 'aaaa0000-0000-0000-0000-000000000001') = 1, 'pagamento não duplicado');

-- 3) Revendedor paga preço de revendedor
select submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000003', 'client_id', 'dddddddd-0000-0000-0000-000000000021',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 2))));
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000003') = 50000, 'revendedor: 2 × 25 000');
select tests.ok((select payment_status from sales where id = 'aaaa0000-0000-0000-0000-000000000003') = 'em_divida', 'sem pagamento = em dívida');

-- 4) Vendedor pede desconto: fica à espera; nada sai do stock
select tests.ok((submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000004', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'manual_discount', 5000, 'discount_reason', 'Cliente fiel',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))))) ->> 'status' = 'aguarda_aprovacao',
  'pedido de desconto aguarda aprovação');
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000004') = 30000, 'sem desconto até o CEO decidir');
select tests.ok(tests.stock(:A) = (select a0 from st) - 3, 'stock não mexe enquanto aguarda');
select tests.erro($q$select decide_sale('aaaa0000-0000-0000-0000-000000000004', 'aprovar', 5000)$q$, 'vendedor não aprova');
select tests.erro($q$select price_sale('[]', 'cliente_final', 0, 0, null, 0, true, false)$q$, 'vendedor não chama o cálculo com custos');
select tests.erro($q$select cancel_sale('aaaa0000-0000-0000-0000-000000000001', 'x')$q$, 'vendedor não cancela vendas');
reset role;
select tests.sair();

-- ---------------------------------------------------------------------
set role authenticated;
select tests.entrar(:ceo);
select tests.ok(exists (select 1 from notifications where user_id = auth.uid() and kind = 'aprovacao_venda'), 'CEO recebe a notificação');
select tests.ok((select status from discount_requests where sale_id = 'aaaa0000-0000-0000-0000-000000000004') = 'pendente', 'pedido registado');
select decide_sale('aaaa0000-0000-0000-0000-000000000004', 'aprovar', 5000, 'Ok');
select tests.ok((select status from sales where id = 'aaaa0000-0000-0000-0000-000000000004') = 'confirmada', 'CEO aprova e a venda confirma');
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000004') = 25000, 'desconto aprovado aplicado');
select tests.ok(tests.stock(:A) = (select a0 from st) - 4, 'stock sai ao confirmar');
select tests.ok((select margin from sale_margins where sale_id = 'aaaa0000-0000-0000-0000-000000000004') = 10000, 'margem = (25 000 − 15 000)');

-- 5) Tecto: desconto que passaria o custo é limitado
select tests.ok((submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000005', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'manual_discount', 20000, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))))) ->> 'capped' = 'true',
  'tecto aplicado e avisado');
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000005') = 15000, 'total limitado ao custo (15 000)');

-- 6) Excepção autorizada pelo CEO: fica no histórico
select submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000006', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'manual_discount', 20000, 'cost_floor_exception', true, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))));
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000006') = 10000, 'excepção permite abaixo do custo');
select tests.ok(exists (select 1 from audit_log where action = 'EXCEPCAO' and record_id = 'aaaa0000-0000-0000-0000-000000000006'), 'excepção registada na auditoria');
reset role;
select tests.sair();

-- 6b) Tecto com pontos e desconto manual: mantém os pontos, corta o manual
insert into loyalty_ledger (client_id, points, entry_type, note) values ('dddddddd-0000-0000-0000-000000000020', 50, 'ajuste', 'teste tecto');
set role authenticated;
select tests.entrar(:ceo);
select submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000066', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'points_tier', 50, 'manual_discount', 12000, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))));
select tests.ok((select (total, points_discount, manual_discount) = (15000::numeric, 4500::numeric, 10500::numeric) from sales where id = 'aaaa0000-0000-0000-0000-000000000066'),
  'pontos 15% (4 500) mantidos, manual cortado para 10 500');
reset role;
select tests.sair();

-- 7) Cupão (5%) + pontos (100 = 30%) acumulam
insert into coupons (id, code, client_id, kind, percent, expires_at) values ('c0c00000-0000-0000-0000-000000000001', 'IND-TESTE', 'dddddddd-0000-0000-0000-000000000020', 'indicacao', 5, now() + interval '30 days');
insert into loyalty_ledger (client_id, points, entry_type, note) values ('dddddddd-0000-0000-0000-000000000020', 120, 'ajuste', 'teste');
set role authenticated;
select tests.entrar(:vend);
select submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000007', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'coupon_id', 'c0c00000-0000-0000-0000-000000000001', 'points_tier', 100,
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 2), jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000002', 'quantity', 1))));
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000007') = 68250, '105 000 − 35% = 68 250');
select tests.ok((select coupon_discount from sales where id = 'aaaa0000-0000-0000-0000-000000000007') = 5250, 'parte do cupão: 5 250');
select tests.ok((select points_discount from sales where id = 'aaaa0000-0000-0000-0000-000000000007') = 31500, 'parte dos pontos: 31 500');
select tests.ok((select sum(points) from loyalty_ledger where client_id = 'dddddddd-0000-0000-0000-000000000020') = 20, 'gasta só os 100 do escalão: ficam 20 (D15)');
select tests.ok((select status from coupons where id = 'c0c00000-0000-0000-0000-000000000001') = 'usado', 'cupão usado');

-- 8) O mesmo cupão noutra venda (ex.: outro aparelho offline): fica à espera do CEO
select tests.ok((submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000008', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'coupon_id', 'c0c00000-0000-0000-0000-000000000001',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))))) ->> 'status' = 'aguarda_aprovacao',
  'cupão já usado: venda aguarda aprovação (D4)');
select tests.ok((select approval_reason from sales where id = 'aaaa0000-0000-0000-0000-000000000008') like '%cupão%', 'motivo explicado');
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000008') = 30000, 'sem o cupão inválido');

-- 9) Pontos insuficientes (ficaram 20)
select tests.ok((submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000009', 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'points_tier', 50, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))))) ->> 'status' = 'aguarda_aprovacao',
  'pontos insuficientes: aguarda aprovação');

-- 10) Pagamento acima do total é recusado; quantidade inválida também
select tests.erro($q$select submit_sale(jsonb_build_object('id', gen_random_uuid(), 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1)),
  'payments', jsonb_build_array(jsonb_build_object('amount', 40000, 'method', 'numerario'))))$q$, 'pagamento acima do total recusado');
select tests.erro($q$select submit_sale(jsonb_build_object('id', gen_random_uuid(), 'client_id', 'dddddddd-0000-0000-0000-000000000020',
  'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 0))))$q$, 'quantidade zero recusada');
reset role;
select tests.sair();

-- 11) "Paga 1, leva 2" (150 pontos): o de menor valor sai grátis, mesmo abaixo do custo (D2)
insert into loyalty_ledger (client_id, points, entry_type, note) values ('dddddddd-0000-0000-0000-000000000021', 150, 'ajuste', 'teste');
set role authenticated;
select tests.entrar(:vend);
select tests.erro($q$select submit_sale(jsonb_build_object('id', gen_random_uuid(), 'client_id', 'dddddddd-0000-0000-0000-000000000021',
  'points_tier', 150, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000002', 'quantity', 1))))$q$, 'paga 1 leva 2 precisa de 2 perfumes');
select submit_sale(jsonb_build_object('id', 'aaaa0000-0000-0000-0000-000000000011', 'client_id', 'dddddddd-0000-0000-0000-000000000021',
  'points_tier', 150, 'items', jsonb_build_array(jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000002', 'quantity', 1), jsonb_build_object('variant_id', 'cccccccc-0000-0000-0000-000000000001', 'quantity', 1))));
select tests.ok((select total from sales where id = 'aaaa0000-0000-0000-0000-000000000011') = 38000, 'revendedor: B 38 000 + A grátis');
select tests.ok((select is_free_item from sale_items where sale_id = 'aaaa0000-0000-0000-0000-000000000011' and variant_id = :A), 'A marcado como oferta');
reset role;
select tests.sair();

-- ---------------------------------------------------------------------
-- 12) Cancelamento pelo CEO: devolve stock, cupão e pontos
set role authenticated;
select tests.entrar(:ceo);
create temp table antes as select tests.stock('cccccccc-0000-0000-0000-000000000001') a, tests.stock('cccccccc-0000-0000-0000-000000000002') b;
select tests.erro($q$select cancel_sale('aaaa0000-0000-0000-0000-000000000007', '  ')$q$, 'cancelar exige motivo');
select cancel_sale('aaaa0000-0000-0000-0000-000000000007', 'Cliente desistiu');
select tests.ok((select status from sales where id = 'aaaa0000-0000-0000-0000-000000000007') = 'cancelada', 'venda cancelada');
select tests.ok(tests.stock(:A) = (select a from antes) + 2 and tests.stock(:B) = (select b from antes) + 1, 'stock devolvido');
select tests.ok((select status from coupons where id = 'c0c00000-0000-0000-0000-000000000001') = 'activo', 'cupão volta a estar activo');
select tests.ok((select sum(points) from loyalty_ledger where client_id = 'dddddddd-0000-0000-0000-000000000020') = 120, 'pontos gastos devolvidos (D19)');
select tests.erro($q$select cancel_sale('aaaa0000-0000-0000-0000-000000000007', 'de novo')$q$, 'não se cancela duas vezes');

-- 13) Venda à espera: CEO confirma sem o benefício inválido, ou anula
select decide_sale('aaaa0000-0000-0000-0000-000000000009', 'sem_desconto');
select tests.ok((select status from sales where id = 'aaaa0000-0000-0000-0000-000000000009') = 'confirmada', 'CEO confirma a venda pendente');
-- Os benefícios são validados de novo no momento da decisão: com o cancelamento da venda 7
-- o cliente voltou a ter 120 pontos, por isso o escalão de 50 já é válido.
select tests.ok((select points_redeemed from sales where id = 'aaaa0000-0000-0000-0000-000000000009') = 50, 'benefícios revalidados na decisão');
create temp table antes2 as select tests.stock('cccccccc-0000-0000-0000-000000000001') a;
select decide_sale('aaaa0000-0000-0000-0000-000000000008', 'anular', 0, 'Cupão já usado');
select tests.ok((select status from sales where id = 'aaaa0000-0000-0000-0000-000000000008') = 'cancelada', 'anulada');
select tests.ok(tests.stock(:A) = (select a from antes2), 'anular não mexe no stock');

-- 14) Dívida aparece no resumo do cliente
select tests.ok((select open_debt from client_summary where client_id = 'dddddddd-0000-0000-0000-000000000021') = 50000 + 38000, 'dívida do cliente = soma dos saldos');
reset role;
select tests.sair();
