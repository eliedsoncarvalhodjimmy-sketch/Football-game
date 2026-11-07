-- =====================================================================
-- Dados iniciais: etiquetas do sistema e definições por defeito
-- (Partes C3, C7, C9, C10 e decisões D1–D29). Sem dados fictícios.
-- =====================================================================

insert into public.tags (name, color, is_system) values
  ('VIP', '#710014', true),
  ('Embaixador', '#C4AA6F', true)
on conflict (name) do nothing;

insert into public.settings (key, value, active, description) values
  ('fidelidade.pontos', jsonb_build_object(
      'kz_por_ponto', 10000,
      'expiram', false,
      'validade_dias', null,
      'minimo_troca', 50,
      'escaloes', jsonb_build_array(
        jsonb_build_object('pontos', 50, 'tipo', 'percentagem', 'valor', 15),
        jsonb_build_object('pontos', 100, 'tipo', 'percentagem', 'valor', 30),
        jsonb_build_object('pontos', 150, 'tipo', 'paga1leva2', 'item_gratis', 'menor_valor')
      )), true,
   'Pontos de fidelidade: 1 ponto por cada 10.000 Kz pagos (valor líquido). Troca a partir de 50 pontos.'),
  ('fidelidade.cupao_indicacao', jsonb_build_object('percentagem', 5, 'validade_dias', 30), true,
   'Cupão de indicação: 5% para quem indicou, quando a 1.ª compra do indicado estiver paga. Válido 30 dias.'),
  ('fidelidade.embaixador', jsonb_build_object('minimo_indicados_que_compraram', 5), true,
   'Etiqueta Embaixador automática a partir de 5 indicados que compraram.'),
  ('vendas.tecto_custo', jsonb_build_object('por_item', true), true,
   'Nenhum item pode ficar abaixo do custo (excepto excepções autorizadas pelo CEO).'),
  ('vendas.prazo_divida_dias', jsonb_build_object('dias', 35), true,
   'Prazo de pagamento por defeito para vendas a crédito.'),
  ('metas', jsonb_build_object('base', 'margem_bruta'), true,
   'Metas semanais e mensais por vendedor, em margem bruta.'),
  ('comissoes', jsonb_build_object('percentagem', 3, 'base', 'margem_acima_da_meta'), true,
   'Comissão: 3% sobre a margem que passar da meta; abaixo da meta, 0.'),
  ('lembretes.sem_compra', jsonb_build_object('dias', 28), true, 'Cliente sem comprar há 28 dias.'),
  ('lembretes.proposta_sem_resposta', jsonb_build_object('horas', 48), true, 'Proposta sem resposta há 48 horas.'),
  ('lembretes.aniversario', jsonb_build_object('dias_antes', 3, 'no_dia', true), true, 'Aniversário: 3 dias antes e no dia.'),
  ('lembretes.pos_venda', jsonb_build_object('dias', 3), true, 'Pós-venda 3 dias após a compra.'),
  ('lembretes.reposicao', jsonb_build_object('dias_defeito', 60), true, 'Reposição: duração do produto (60 dias por defeito).'),
  ('lembretes.divida', jsonb_build_object('dias_antes', 3, 'no_dia', true, 'dias_depois', 3), true, 'Dívida: 3 dias antes, no dia e 3 dias depois do prazo.'),
  ('lembretes.lead_parado', jsonb_build_object('horas', 24), true, 'Lead parado em Contacto há mais de 24 horas.'),
  ('lembretes.meta_em_risco', '{}'::jsonb, true, 'Meta semanal/mensal em risco.'),
  ('lembretes.stock_baixo', '{}'::jsonb, true, 'Stock abaixo do mínimo.'),
  ('lembretes.embaixador', '{}'::jsonb, true, 'Cliente atingiu o estatuto de Embaixador.'),
  ('lembretes.cupao_a_expirar', jsonb_build_object('dias_antes', 5), true, 'Cupão a expirar dentro de 5 dias.'),
  ('notificacoes.silencio', jsonb_build_object('inicio', '22:30', 'fim', '07:00'), true,
   'Sem notificações nem mensagens automáticas entre as 22:30 e as 07:00 (Luanda).'),
  ('empresa', jsonb_build_object(
      'nome', 'Smell', 'lema', 'Cuidamos de si!',
      'nif', '', 'morada', '', 'telefone', '', 'iban', ''), true,
   'Dados da Smell que aparecem no recibo (preencher em Definições).')
on conflict (key) do nothing;
