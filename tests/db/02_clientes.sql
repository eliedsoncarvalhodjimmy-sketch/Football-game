-- =====================================================================
-- Clientes: exportar e apagar dados (Lei 22/11)
-- =====================================================================
\set ceo  '''11111111-1111-1111-1111-111111111111'''
\set vend '''22222222-2222-2222-2222-222222222222'''

-- Cliente com notas, etiqueta e sem vendas
set role authenticated;
select tests.entrar(:vend);
insert into clients (id, name, whatsapp, address) values ('dddddddd-0000-0000-0000-000000000010', 'Maria Privada', '+244923111222', 'Rua Secreta 1');
insert into client_notes (client_id, body) values ('dddddddd-0000-0000-0000-000000000010', 'Nota pessoal');
select tests.erro($q$select export_client_data('dddddddd-0000-0000-0000-000000000010')$q$, 'vendedor não exporta dados');
select tests.erro($q$select erase_client('dddddddd-0000-0000-0000-000000000010')$q$, 'vendedor não apaga dados');
reset role;
select tests.sair();

set role authenticated;
select tests.entrar(:ceo);
select tests.ok((select export_client_data('dddddddd-0000-0000-0000-000000000010') -> 'cliente' ->> 'name') = 'Maria Privada', 'CEO exporta os dados');
select tests.ok(jsonb_array_length(export_client_data('dddddddd-0000-0000-0000-000000000010') -> 'notas') = 1, 'exportação inclui notas');
select tests.ok(erase_client('dddddddd-0000-0000-0000-000000000010') = 'apagado', 'cliente sem vendas é apagado');
select tests.ok(not exists (select 1 from clients where id = 'dddddddd-0000-0000-0000-000000000010'), 'já não existe');
select tests.ok(not exists (select 1 from audit_log where (old_data::text || coalesce(new_data::text, '')) like '%Maria Privada%' or (coalesce(old_data::text, '') || coalesce(new_data::text, '')) like '%Rua Secreta%' or (coalesce(old_data::text, '') || coalesce(new_data::text, '')) like '%Nota pessoal%'), 'dados pessoais retirados do histórico');
select tests.ok(exists (select 1 from audit_log where action = 'EXCEPCAO' and note like '%apagado a pedido%'), 'apagamento registado (sem dados pessoais)');

-- Quem indicou um cliente que já comprou também pode pedir para apagar
insert into clients (id, name, whatsapp) values ('dddddddd-0000-0000-0000-000000000011', 'Padrinho', '+244923000011');
reset role;
select tests.sair();
insert into clients (id, name, whatsapp, referred_by) values ('dddddddd-0000-0000-0000-000000000012', 'Afilhado', '+244923000012', 'dddddddd-0000-0000-0000-000000000011');
update referrals set first_sale_id = 'eeeeeeee-0000-0000-0000-000000000001' where referred_id = 'dddddddd-0000-0000-0000-000000000012';
set role authenticated;
select tests.entrar(:ceo);
select tests.ok(erase_client('dddddddd-0000-0000-0000-000000000011') = 'apagado', 'padrinho sem vendas apagado');
select tests.ok((select referred_by from clients where id = 'dddddddd-0000-0000-0000-000000000012') is null, 'indicação retirada do afilhado');

-- Cliente com vendas: anonimizado, as vendas mantêm-se
select tests.ok(erase_client('dddddddd-0000-0000-0000-000000000001') = 'anonimizado', 'cliente com vendas é anonimizado');
select tests.ok((select name from clients where id = 'dddddddd-0000-0000-0000-000000000001') = 'Cliente apagado', 'nome apagado');
select tests.ok((select whatsapp from clients where id = 'dddddddd-0000-0000-0000-000000000001') = '', 'WhatsApp apagado');
select tests.ok(exists (select 1 from sales where client_id = 'dddddddd-0000-0000-0000-000000000001'), 'vendas mantêm-se');
select tests.ok(not exists (select 1 from audit_log where coalesce(old_data::text, '') || coalesce(new_data::text, '') like '%Cliente Aberto%'), 'nome antigo fora do histórico');
select tests.erro($q$select erase_client('dddddddd-0000-0000-0000-000000000001')$q$, 'não se apaga duas vezes');
reset role;
select tests.sair();

-- O histórico continua protegido fora do apagamento
select tests.erro($q$update audit_log set note = 'x'$q$, 'histórico não se altera');
