-- =====================================================================
-- Testes de segurança (critério de aceitação 2) e automatismos da base
-- =====================================================================
\set ceo   '''11111111-1111-1111-1111-111111111111'''
\set vend  '''22222222-2222-2222-2222-222222222222'''
\set vend2 '''33333333-3333-3333-3333-333333333333'''

-- ---------- Contas: a 1.ª é CEO, as seguintes Vendedor ----------
insert into auth.users (id, email, raw_user_meta_data) values (:ceo, 'ceo@smell.ao', '{"full_name":"CEO"}');
insert into auth.users (id, email, raw_user_meta_data) values (:vend, 'v1@smell.ao', '{"full_name":"Vendedor 1","must_change_password":true}');
insert into auth.users (id, email) values (:vend2, 'v2@smell.ao');
select tests.ok((select role from profiles where id = :ceo) = 'ceo', 'primeira conta é CEO');
select tests.ok((select role from profiles where id = :vend) = 'vendedor', 'segunda conta é Vendedor');
select tests.ok((select must_change_password from profiles where id = :vend), 'forçar troca de palavra-passe');

-- ---------- Dados de teste (como administrador da base) ----------
insert into tags (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Restrita');
insert into tag_restrictions (tag_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', :vend);

insert into products (id, name, brand) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Perfume Teste', 'Marca');
insert into product_variants (id, product_id, sku, label, price_retail, price_reseller, min_stock)
values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'PT-50', '50 ml', 30000, 25000, 2);
insert into product_variant_costs (variant_id, cost_price) values ('cccccccc-0000-0000-0000-000000000001', 15000);
insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', 10, 'entrada', 'compra inicial');

insert into clients (id, name, whatsapp) values ('dddddddd-0000-0000-0000-000000000001', 'Cliente Aberto', '+244923000001');
insert into clients (id, name, whatsapp) values ('dddddddd-0000-0000-0000-000000000002', 'Cliente Restrito', '+244923000002');
insert into client_tags (client_id, tag_id) values ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
select tests.ok((select code from clients where id = 'dddddddd-0000-0000-0000-000000000001') = 1, 'primeiro cliente tem código 1 (0001)');

insert into sales (id, client_id, seller_id, status, subtotal, total, confirmed_at)
values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', :vend, 'confirmada', 30000, 30000, now());
insert into sale_items (id, sale_id, variant_id, quantity, unit_price, line_total)
values ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 1, 30000, 30000);
insert into sale_item_costs (sale_item_id, unit_cost, margin) values ('ffffffff-0000-0000-0000-000000000001', 15000, 15000);
insert into sales (id, client_id, seller_id, status, subtotal, total, confirmed_at)
values ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', :ceo, 'confirmada', 30000, 30000, now());

-- ---------- Pagamentos: estado da venda ----------
insert into payments (sale_id, amount, method) values ('eeeeeeee-0000-0000-0000-000000000001', 10000, 'numerario');
select tests.ok((select payment_status from sales where id = 'eeeeeeee-0000-0000-0000-000000000001') = 'parcial', 'pagamento parcial');
insert into payments (sale_id, amount, method) values ('eeeeeeee-0000-0000-0000-000000000001', 20000, 'transferencia');
select tests.ok((select payment_status from sales where id = 'eeeeeeee-0000-0000-0000-000000000001') = 'paga', 'segundo pagamento fecha a dívida');

-- =====================================================================
-- Visitante sem sessão: não vê nada
-- =====================================================================
set role anon;
select tests.erro('select * from public.clients', 'anon não lê clientes');
select tests.erro('select * from public.product_variants', 'anon não lê produtos');
reset role;
select tests.sair();

-- =====================================================================
-- VENDEDOR
-- =====================================================================
set role authenticated;
select tests.entrar(:vend);

-- Custos, margens, auditoria: invisíveis
select tests.ok((select count(*) from product_variant_costs) = 0, 'vendedor não vê preço de custo');
select tests.ok((select count(*) from sale_item_costs) = 0, 'vendedor não vê custo/margem das vendas');
select tests.ok((select count(*) from sale_margins) = 0, 'vendedor não vê margens agregadas');
select tests.ok((select count(*) from audit_log) = 0, 'vendedor não vê auditoria');
select tests.ok((select count(*) from tag_restrictions) = 0, 'vendedor não vê restrições');
select tests.ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'catalog' and column_name like '%cost%'), 'catálogo não tem coluna de custo');
select tests.ok((select count(*) from catalog) = 1, 'vendedor vê o catálogo');
select tests.ok((select stock from catalog) = 9 or (select stock from catalog) = 10, 'stock visível');

-- Clientes com etiqueta restrita: invisíveis em todo o lado
select tests.ok((select count(*) from clients) = 1, 'vendedor só vê o cliente não restrito');
select tests.ok(not exists (select 1 from clients where id = 'dddddddd-0000-0000-0000-000000000002'), 'cliente restrito invisível');
select tests.ok((select count(*) from client_summary) = 1, 'resumo só do cliente visível');
select tests.ok((select count(*) from sales) = 1, 'vendas do cliente restrito invisíveis');
select tests.ok((select count(*) from tags where name = 'Restrita') = 0, 'etiqueta restrita invisível');
select tests.ok(tests.linhas('update clients set notes = ''x'' where id = ''dddddddd-0000-0000-0000-000000000002''') = 0, 'não edita cliente restrito');

-- Resumo do cliente visível
select tests.ok((select total_spent from client_summary where client_id = 'dddddddd-0000-0000-0000-000000000001') = 30000, 'total gasto');
select tests.ok((select open_debt from client_summary where client_id = 'dddddddd-0000-0000-0000-000000000001') = 0, 'dívida zero após pagar');
select tests.ok((select days_without_purchase from client_summary where client_id = 'dddddddd-0000-0000-0000-000000000001') = 0, 'dias sem comprar');

-- Escritas proibidas
select tests.ok(tests.linhas('update settings set value = ''{}'' where key = ''comissoes''') = 0, 'vendedor não altera definições');
select tests.erro('insert into products (name) values (''X'')', 'vendedor não cria produtos');
select tests.ok(tests.linhas('update product_variants set price_retail = 1') = 0, 'vendedor não altera preços');
select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', 5, 'entrada', '')$q$, 'vendedor sem ADM não regista entradas');
select tests.erro($q$insert into sales (client_id, seller_id) values ('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222')$q$, 'vendas só por funções do servidor');
select tests.erro($q$insert into payments (sale_id, amount, method) values ('eeeeeeee-0000-0000-0000-000000000001', 1, 'numerario')$q$, 'pagamentos só por funções do servidor');
select tests.erro($q$insert into loyalty_ledger (client_id, points, entry_type) values ('dddddddd-0000-0000-0000-000000000001', 100, 'ajuste')$q$, 'vendedor não dá pontos');
select tests.ok(tests.linhas($q$update profiles set role = 'ceo', is_adm = true where id = '22222222-2222-2222-2222-222222222222'$q$) = 0, 'vendedor não se promove');
select tests.ok((select role from profiles where id = auth.uid()) = 'vendedor', 'continua vendedor');
select tests.ok(tests.linhas('delete from clients') = 0, 'vendedor não apaga clientes');

-- O próprio perfil: nome e "palavra-passe trocada"
select update_my_profile('Vendedor Um', true);
select tests.ok((select full_name from profiles where id = auth.uid()) = 'Vendedor Um', 'vendedor muda o seu nome');
select tests.ok(not (select must_change_password from profiles where id = auth.uid()), 'troca de palavra-passe registada');

-- Criar cliente: código do servidor, consentimento com quem e quando, indicação
insert into clients (id, temp_code, name, whatsapp, consent, referred_by, code)
values ('dddddddd-0000-0000-0000-000000000003', 'TEMP-ab12', 'Cliente Novo', '+351912345678', true, 'dddddddd-0000-0000-0000-000000000001', 999);
select tests.ok((select code from clients where id = 'dddddddd-0000-0000-0000-000000000003') = 3, 'código dado pelo servidor (ignora o do aparelho)');
select tests.ok((select consent_by from clients where id = 'dddddddd-0000-0000-0000-000000000003') = :vend, 'consentimento guarda quem marcou');
select tests.ok((select consent_at from clients where id = 'dddddddd-0000-0000-0000-000000000003') is not null, 'consentimento guarda quando');
select tests.ok((select created_by from clients where id = 'dddddddd-0000-0000-0000-000000000003') = :vend, 'quem criou');
select tests.ok(exists (select 1 from referrals where referred_id = 'dddddddd-0000-0000-0000-000000000003' and referrer_id = 'dddddddd-0000-0000-0000-000000000001'), 'indicação registada');
select tests.ok(exists (select 1 from funnel_stage_history where client_id = 'dddddddd-0000-0000-0000-000000000003' and to_stage = 'contacto'), 'histórico do funil');
select tests.erro($q$update clients set code = 50 where id = 'dddddddd-0000-0000-0000-000000000003'$q$, 'código não muda');
select tests.erro($q$insert into clients (name, whatsapp) values ('Sem formato', '923000000')$q$, 'WhatsApp tem de ser internacional');

update clients set funnel_stage = 'proposta' where id = 'dddddddd-0000-0000-0000-000000000003';
select tests.ok((select count(*) from funnel_stage_history where client_id = 'dddddddd-0000-0000-0000-000000000003') = 2, 'mudança de etapa registada');
insert into client_notes (client_id, body) values ('dddddddd-0000-0000-0000-000000000003', 'Gosta de amadeirados');
select tests.ok((select created_by from client_notes limit 1) = :vend, 'nota guarda autor');
reset role;
select tests.sair();

-- =====================================================================
-- Vendedor com permissão ADM: regista entradas e ajustes, nunca saídas de venda
-- =====================================================================
update profiles set is_adm = true where id = :vend;
set role authenticated;
select tests.entrar(:vend);
insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', 5, 'entrada', 'reposição');
insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', -1, 'ajuste', 'frasco partido');
select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type, reason) values ('cccccccc-0000-0000-0000-000000000001', -1, 'ajuste', '')$q$, 'ajuste exige motivo');
select tests.erro($q$insert into stock_movements (variant_id, quantity, movement_type) values ('cccccccc-0000-0000-0000-000000000001', -1, 'venda')$q$, 'saídas de venda só por funções');
select tests.ok((select stock from catalog) = 14, 'stock = soma dos movimentos (10 + 5 − 1)');
select tests.ok(tests.linhas($q$update stock_movements set quantity = 100$q$) = 0, 'vendedor não altera movimentos');
reset role;
select tests.sair();
select tests.erro($q$delete from stock_movements$q$, 'movimentos não se apagam (nem pelo administrador)');
select tests.erro($q$delete from payments$q$, 'pagamentos não se apagam');
select tests.erro($q$update stock_movements set quantity = 100$q$, 'movimentos não se alteram (nem pelo administrador)');

-- =====================================================================
-- CEO
-- =====================================================================
set role authenticated;
select tests.entrar(:ceo);
select tests.ok((select count(*) from clients) = 3, 'CEO vê todos os clientes');
select tests.ok((select cost_price from product_variant_costs) = 15000, 'CEO vê custo');
select tests.ok((select margin from sale_margins where sale_id = 'eeeeeeee-0000-0000-0000-000000000001') = 15000, 'CEO vê margem');
select tests.ok(exists (select 1 from audit_log where table_name = 'clients' and actor_id = :vend and action = 'INSERT'), 'auditoria mostra quem criou o cliente');
select tests.ok(exists (select 1 from audit_log where table_name = 'stock_movements' and actor_id = :vend), 'auditoria mostra quem mexeu no stock');
update settings set value = jsonb_set(value, '{percentagem}', '4') where key = 'comissoes';
select tests.ok((select (value ->> 'percentagem')::int from settings where key = 'comissoes') = 4, 'CEO altera definições');
select tests.ok(exists (select 1 from audit_log where table_name = 'settings' and actor_id = :ceo and action = 'UPDATE'), 'alteração de definição auditada');
select tests.erro($q$delete from tags where name = 'VIP'$q$, 'etiqueta VIP não se apaga');
select tests.erro($q$update profiles set role = 'vendedor' where id = '11111111-1111-1111-1111-111111111111'$q$, 'tem de existir um CEO activo');
update profiles set active = false where id = :vend2;
reset role;
select tests.sair();

-- Utilizador desactivado perde o acesso
set role authenticated;
select tests.entrar(:vend2);
select tests.ok((select count(*) from clients) = 0, 'utilizador desactivado não vê clientes');
select tests.ok((select count(*) from products) = 0, 'utilizador desactivado não vê produtos');
reset role;
select tests.sair();

-- Dados iniciais
select tests.ok((select count(*) from tags where is_system) = 2, 'etiquetas VIP e Embaixador');
select tests.ok((select (value ->> 'dias')::int from settings where key = 'vendas.prazo_divida_dias') = 35, 'prazo de dívida 35 dias (D23)');
select tests.ok((select (value ->> 'kz_por_ponto')::int from settings where key = 'fidelidade.pontos') = 10000, '1 ponto por 10.000 Kz');

-- Todas as tabelas públicas têm RLS ligado
select tests.ok(not exists (select 1 from pg_tables where schemaname = 'public' and not rowsecurity), 'RLS em todas as tabelas');
