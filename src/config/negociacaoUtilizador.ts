// Negociações do utilizador (Prompt 5, A3): as regras do protótipo aprovado (ecrã de negociação do Mercado),
// agora no motor. O clube vendedor e o jogador/agente respondem na hora, ronda a ronda, com uma "tensão" que acumula.

/** Fase com o clube vendedor. */
export const NEG_CLUBE = {
  /** Piso do vendedor: nunca baixa o pedido abaixo de x × o preço pedido inicial. */
  piso: 0.92,
  /** Venda futura: cada ponto percentual oferecido ao vendedor desce o que ele exige x (10% → −4%). */
  venda_futura_por_ponto: 0.004,
  /** Opções de venda futura numa oferta (%); a soma por jogador nunca passa o limite dos direitos (50%). */
  venda_futura_opcoes: [0, 10, 15, 20, 25],
  /** Pagamento (Prompt 6, Bloco D): só dois modos, os mesmos para o utilizador e para a IA. Parcelado: 30% à vista e o
   *  resto em 3 parcelas anuais (como as grandes transferências reais); o vendedor exige +x por esperar. */
  parcelas: [
    { id: 'vista', nome: 'À vista', extra: 0, n: 0, dias: 0, vista: 1 },
    { id: 'parcelado', nome: 'Parcelado (30% à vista, 3 parcelas anuais)', extra: 0.05, n: 3, dias: 365, vista: 0.3 },
  ],
  /** Jogador do plantel dado em troca: conta x × o valor de mercado. */
  troca_valor: 0.8,
  /** Tensão: começa em x; cada recusa soma base + falta × factor; a 100 o vendedor rompe. */
  tensao_inicial: 35,
  tensao_base: 8,
  tensao_por_falta: 120,
  /** Abaixo disto (falta relativa) a resposta é dura ("isso não é sério"). */
  falta_dura: 0.15,
};

/** Empréstimos pedidos pelo utilizador: o clube dono exige uma parte do salário e, com opção de compra, um valor mínimo. */
export const NEG_EMPRESTIMO = {
  /** Fracção do salário que o dono exige que o clube receptor pague: base + extra se o jogador for do onze dele. */
  salario_base: 0.5,
  salario_titular: 0.3,
  /** Opção de compra aceite a partir de x × o valor de mercado. */
  opcao_minima: 1.2,
  opcoes_salario: [0.3, 0.5, 0.75, 1],
};

/** Fase com o jogador e o agente. */
export const NEG_JOGADOR = {
  /** Papéis no plantel (prometidos no contrato), do mais ao menos importante, e o estatuto do motor de cada um. */
  papeis: ['Estrela', 'Importante', 'Rotação', 'Promessa', 'Reserva'] as const,
  estatuto: { Estrela: 'titular', Importante: 'titular', Rotação: 'rotacao', Promessa: 'promessa', Reserva: 'suplente' } as const,
  /** Papel pedido pela ordem (OVR) no plantel do comprador: < 3 Estrela, < 11 Importante, < 18 Rotação; ≤ 21 anos Promessa; senão Reserva. */
  ordem_estrela: 3, ordem_importante: 11, ordem_rotacao: 18, idade_promessa: 21,
  /** Pedidos além do salário: prémio de assinatura (× salário anual) e taxa do agente (× valor da transferência, mínimo × salário). */
  premio: 0.25,
  agente_fee: 0.065,
  agente_salario: 0.3,
  /** Pontuação (1 = aceita): pesos de salário, prémio e agente; constante; tecto dos rácios de prémio e agente. */
  peso_salario: 0.6, peso_premio: 0.15, peso_agente: 0.15, constante: 0.1, tecto_extra: 1.3,
  /** Papel abaixo do pedido custa x por degrau; acima soma y. */
  papel_abaixo: 0.06, papel_acima: 0.02,
  /** Contratos acima de N anos custam x por ano a mais. */
  anos_livres: 4, anos_custo: 0.02,
  anos_opcoes: [1, 2, 3, 4, 5],
  /** Cláusula de rescisão: até x × o valor de mercado agrada (+a); acima desagrada (−b). */
  clausula_multiplo: 6, clausula_agrada: 0.03, clausula_desagrada: 0.01,
  /** Bónus por objectivos: soma até x (difíceis de cumprir). */
  bonus_max: 0.04, bonus_por_cada: 0.02, bonus_ao_chegar: 0.04,
  bonus_tipos: ['Golos', 'Jogos', 'Assistências', 'Jogos sem sofrer golos'] as const,
  bonus_modos: ['Por cada', 'Ao chegar a'] as const,
  bonus_n: [10, 15, 20, 25, 50],
  /** O agente bloqueia abaixo de x × a taxa pedida. */
  agente_minimo: 0.8,
  /** Tensão: começa em x; cada recusa soma base + (1 − pontuação) × factor. */
  tensao_inicial: 20, tensao_base: 10, tensao_por_falta: 120,
  /** Depois de uma recusa o agente cede: novo pedido = a × pedido + (1 − a) × proposta (salário) e b para o agente; nunca abaixo de x × o pedido inicial. */
  cede_salario: 0.7, cede_agente: 0.8, minimo_salario: 0.85, minimo_agente: 0.85,
};

/** Ofertas recebidas pelos jogadores do utilizador: o comprador espera a resposta até N dias; depois desiste. */
export const OFERTAS_RECEBIDAS = { espera_dias: 14 };

/** Shortlist do utilizador: máximo de jogadores e observações extra por semana (cada olheiro observa x da shortlist). */
export const SHORTLIST = { maximo: 30, observacoes_por_olheiro: 2 };

/** A4 — decisões do utilizador fora do mercado. */
export const RENOVACAO = {
  /** Só se renova quem tem até N anos de contrato. */
  anos_maximos: 2,
};
export const STAFF_UTILIZADOR = {
  /** Despedir um membro do staff: indemnização = x × o salário que faltava pagar. */
  indemnizacao: 0.5,
};
/** Preço dos bilhetes (multiplicador do preço base do clube): a ocupação desce com (1/preço)^elasticidade. */
export const BILHETE_UTILIZADOR = { minimo: 0.6, maximo: 1.6, passo: 0.05, elasticidade: 0.55 };
/** Obras: a caixa tem de cobrir pelo menos x do custo total para arrancar. */
export const OBRAS_UTILIZADOR = { caixa_minima: 0.25 };
