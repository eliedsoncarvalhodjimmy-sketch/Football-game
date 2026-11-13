// Dívida, sanções financeiras, recuperação judicial e administração (Prompt 3, Bloco B).
// Regime de sanções definido pelo utilizador (resposta à Paragem B, 4.2). Os rácios usam a dívida efectiva:
// dívida (banco + dono + parcelas) + caixa negativa (salários e fornecedores em atraso), sobre a receita prevista.

export const DIVIDA = {
  /** Banco: juro = base + prémio por saúde (saudável, apertado, crise); prazo em anos (amortização anual = dívida / prazo). */
  juro_base: 0.05,
  premio_saude: [0, 0.02, 0.05],
  prazo_anos: 6,
  /** O banco empresta até este múltiplo da receita (dívida total), e não empresta a clubes em crise acima de metade disso. */
  limite_banco: 1.2,
  /** Empréstimo do dono: juro anual. */
  juro_dono: 0.01,
  /** Aviso: dívida a partir de 1,2× a receita. */
  aviso: 1.2,
  /** Limite de dívida: acima de 1,5× a receita, proibição de contratar até a dívida voltar a 1× + multa anual de 2% da receita. */
  limite_sancao: 1.5,
  saida_proibicao: 1.0,
  multa_limite: 0.02,
  /** Reserva de caixa que a IA procura manter (meses de despesa). */
  reserva_meses: 2,
  /** Excedente de caixa acima de N meses de despesa: a IA amortiza dívida bancária (fracção do excedente). */
  amortizar_acima_meses: 6,
  amortizar_fraccao: 0.5,
};

/** Recuperação judicial (pode ser pedida pelo dono): dívida acima de 2,5× a receita. */
export const RECUPERACAO = {
  divida: 2.5,
  pontos: 6,
  /** Proibição de contratar durante uma janela (a próxima a fechar). */
  /** Dívida renegociada: juro e prazo novos. */
  juro: 0.02,
  prazo_anos: 12,
  /** Só pode voltar a pedir depois de N anos. */
  intervalo_anos: 3,
};

export const ADMINISTRACAO = {
  /** Administração: dívida acima de 3,5× a receita. */
  divida: 3.5,
  pontos: 12,
  /** Dívida perdoada (fracção da bancária e das parcelas; a do dono perde-se). */
  perdao: 0.5,
  /** Caixa reposta pelo administrador/novo dono (fracção da receita). */
  caixa_nova: 0.05,
  /** Regularizado (sai de administração e da proibição de contratar): dívida ≤ x × receita e caixa ≥ 0. */
  regularizado: 1.0,
  /** Venda forçada: saem os salários mais altos até a massa ficar abaixo de x × receita (sem baixar o plantel de 22). */
  massa_alvo: 0.55,
  /** Sem mercado (até ao Prompt 4) a venda forçada não toca nos N melhores do plantel (por OVR): sairiam de graça. */
  protegidos: 11,
  /** Preço do clube em administração (novo dono): fracção da receita. */
  preco: 0.25,
};

/** Perda de pontos: caixa abaixo de −15% da receita ou mais de 2 meses de salários em atraso conta um aviso por mês; no espaço de 12 meses, o 2.º aviso tira 3 pontos e o 3.º tira 9. */
export const PONTOS_CAIXA = {
  caixa_negativa: 0.15,
  atraso_meses: 2,
  pontos: [0, 3, 9],
  janela_dias: 365,
  /** Enquanto dura a infracção, um aviso por trimestre (dias entre avisos). */
  intervalo_dias: 90,
};

/** Cortes automáticos em crise (caixa negativa): obras suspensas, staff a x, ajuste salarial mais rápido, renova só os N melhores. */
export const CORTES_CRISE = { staff: 0.7, ajuste_min: 0.85, renovar_melhores: 11 };

/** Fair play salarial: a massa acima do balizador da liga (ou a menos de x p.p. dele) dá aviso. */
export const FAIR_PLAY_AVISO = { perto: 0.05 };

/** Injecção de capital do dono: no máximo 25% da receita por época (capital, sem os empréstimos). */
export const INJECCAO_MAXIMA = 0.25;
