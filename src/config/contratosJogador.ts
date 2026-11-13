// Contratos completos (Prompt 4, Bloco A).
export const ESTATUTOS = ['titular', 'rotacao', 'promessa', 'suplente'] as const;
export type Estatuto = (typeof ESTATUTOS)[number];

export const CONTRATO = {
  /** Duração (anos) por idade: até 23 → 3–5; 24–29 → 2–5; 30–32 → 1–3; 33+ → 1–2. */
  anos: (idade: number): [number, number] => (idade <= 23 ? [3, 5] : idade <= 29 ? [2, 5] : idade <= 32 ? [1, 3] : [1, 2]),
  /** Minutos prometidos por estatuto (fracção dos jogos). */
  minutos_prometidos: { titular: 0.7, rotacao: 0.4, promessa: 0.2, suplente: 0 } as Record<Estatuto, number>,
  /** Bónus (fracção do salário anual): assinatura; por jogo, golo e assistência (por unidade); título. */
  bonus_assinatura: 0.1,
  bonus_jogo: 0.002,
  bonus_golo: 0.006,
  bonus_assistencia: 0.004,
  bonus_titulo: 0.08,
  /** Renovação: o pedido sobe com o rendimento (nota média acima de 6,8 → +x por décima, até ao máximo). */
  renovacao_por_decima: 0.03,
  renovacao_maximo: 0.4,
  /** Estrutura salarial: um salário acima de x × o maior do plantel baixa a moral dos outros titulares. */
  estrutura_limite: 1.4,
  estrutura_moral: 2,
  /** Comissão fixa de agentes (sobre o valor da transferência e o salário do 1.º ano nos livres). */
  agentes: 0.05,
  /** Pré-contrato: nos últimos N meses o jogador pode acordar com outro clube. */
  pre_contrato_meses: 6,
  /** Livres: exigência salarial × (1 − x × meses sem clube), até ao mínimo. */
  livre_desconto_mes: 0.06,
  livre_minimo: 0.5,
  /** Primeiro contrato profissional de jovem: até x do salário de mercado do OVR; aumento após N jogos na equipa principal. */
  jovem_fraccao: 0.4,
  jovem_aumento_jogos: 25,
  jovem_aumento: 0.6,
  /** Parcelas: fracção paga à cabeça e anos das restantes (transferências acima de x € podem ir em parcelas). */
  parcelas_acima: 5_000_000,
  parcelas_cabeca: 0.4,
  parcelas_anos: [1, 3] as [number, number],
  /** Cláusulas raras (probabilidade por transferência): recompra (vendedor formador/vendedor, jovem), % de venda futura. */
  prob_recompra: 0.15,
  recompra_multiplo: 2.0,
  recompra_anos: 3,
  prob_venda_futura: 0.25,
  venda_futura: [0.1, 0.2] as [number, number],
  venda_futura_sobre_lucro: 0.5,
};

/** Empréstimos: minutos garantidos opcionais, limites por clube, opção e obrigação de compra. */
export const EMPRESTIMOS = {
  max_recebidos: 6,
  max_cedidos: 12,
  /** Fracção do salário paga pelo clube que recebe. */
  salario_receptor: [0.5, 1] as [number, number],
  prob_opcao: 0.3,
  prob_obrigacao: 0.1,
  opcao_multiplo: 1.1,
  /** Clubes grandes (reputação ≥ x) emprestam jovens (≤ 21) que não jogam. */
  emprestador_reputacao: 70,
  idade_maxima: 21,
};
