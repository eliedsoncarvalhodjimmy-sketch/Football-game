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
  /** Pagamento entre clubes da IA: à vista, ou "parcelado" (o mesmo modo do utilizador, em NEG_CLUBE.parcelas) acima de
   *  x € e se o vendedor aceitar (saudável / apertado / crise ou administração: quer dinheiro já). */
  parcelas_acima: 20_000_000,
  parcelas_aceita: [0.7, 0.5, 0.15],
};

/**
 * Direitos futuros (Prompt 6, Bloco A): % de venda futura e recompra. Nascem numa transferência com preço, quando o
 * vendedor tem razões para os pedir; pagam-se (venda futura) ou exercem-se (recompra) uma só vez.
 *
 * Probabilidade de um direito = logística(soma dos factores − base). Factores (cada um entre 0 e 1, × o peso):
 *   reputação: (rep. vendedor − rep. comprador) / 20, limitada a [0, 1];
 *   idade: 1 até 21 anos, 0,4 aos 22–23, 0 depois;
 *   sem lugar: jogador listado, excedente ou com poucos minutos na época (< 30% dos jogos possíveis);
 *   potencial: (potencial − OVR) / 15, limitada a [0, 1];
 *   arquétipo: vendedor formador ou "vendedor";
 *   preço baixo: preço < valor de mercado futuro esperado (OVR = potencial): 1 − preço / valor futuro.
 */
export const DIREITOS = {
  venda_futura: {
    pesos: { reputacao: 1.4, idade: 1.6, sem_lugar: 0.8, potencial: 1.2, arquetipo: 1.0, preco_baixo: 0.8 },
    base: 3.2,
    /** Só para jogadores até esta idade (um veterano não tem venda futura). */
    idade_max: 25,
    /** Percentagem: entre min e max, mais alta com mais potencial e maior diferença de reputação (arredondada a 5%). */
    pct: [0.1, 0.25] as [number, number],
    /** Soma das percentagens activas sobre o mesmo jogador (decisão do utilizador). */
    limite: 0.5,
    validade_anos: 5,
  },
  recompra: {
    pesos: { reputacao: 1.2, idade: 1.8, sem_lugar: 0.6, potencial: 1.6, arquetipo: 1.2, preco_baixo: 0.6 },
    base: 4.6,
    /** Só para jovens (≤ idade) com margem de potencial (≥ pontos) vendidos por clubes formadores, vendedores ou grandes. */
    idade_max: 22, potencial_min: 6, reputacao_grande: 80,
    /** Preço fixo = múltiplo do preço pago (mais alto com mais potencial); validade de 1 ou 2 anos. */
    multiplo: [1.3, 2.0] as [number, number],
    validade_anos: [1, 2] as [number, number],
    /** Dias que o titular tem para decidir quando o vendedor aceita uma oferta de outro clube. */
    prazo_dias: [3, 5] as [number, number],
    /** IA: exerce se o preço fixo for inferior a x × o valor de mercado actual e o jogador melhorar o plantel. */
    abaixo_do_valor: 0.95,
  },
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
