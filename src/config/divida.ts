// Dívida, administração e fair play financeiro (Prompt 3, Bloco B).
// Valores propostos a partir do teste de 5 épocas (pendência 4.2 do utilizador: a validar).

export const DIVIDA = {
  /** Banco: juro = base + prémio por saúde (saudável, apertado, crise); prazo em anos (amortização anual = dívida / prazo). */
  juro_base: 0.05,
  premio_saude: [0, 0.02, 0.05],
  prazo_anos: 6,
  /** O banco empresta até este múltiplo da receita prevista (dívida total), e nunca a clubes em crise acima de metade disso. */
  limite_banco: 1.0,
  /** Empréstimo do dono: juro anual. */
  juro_dono: 0.01,
  /** Acima de x × receita (dívida total) o clube fica proibido de contratar e paga uma multa anual de y × receita. */
  limite_sancao: 1.5,
  multa_limite: 0.02,
  /** Reserva de caixa que a IA procura manter (meses de despesa). */
  reserva_meses: 2,
  /** Excedente de caixa acima de N meses de despesa: a IA amortiza dívida bancária (fracção do excedente). */
  amortizar_acima_meses: 6,
  amortizar_fraccao: 0.5,
};

export const ADMINISTRACAO = {
  /** Insolvência: caixa abaixo de −x × receita prevista sem forma de se financiar, ou dívida acima de y × receita. */
  caixa_negativa: 0.15,
  divida_maxima: 2.5,
  /** Dedução de pontos (aplicada na época seguinte do clube). */
  pontos: 10,
  /** Dívida perdoada (fracção da bancária e das parcelas) e caixa reposta pelo novo dono (fracção da receita). */
  perdao: 0.6,
  caixa_nova: 0.05,
  /** Venda forçada: saem os salários mais altos até a massa ficar abaixo de x × receita (sem baixar o plantel de 22). */
  massa_alvo: 0.55,
  /** Sem mercado (até ao Prompt 4) a venda forçada não toca nos N melhores do plantel (por OVR): sairiam de graça. */
  protegidos: 11,
  /** Meses mínimos em administração (proibição de contratar). */
  meses: 12,
  /** Preço do clube em administração: fracção da receita. */
  preco: 0.25,
};

/**
 * Fair play financeiro: massa salarial acima do limite da liga (fracção da receita) gera sanções que escalam
 * com o excesso e com a reincidência (épocas seguidas em incumprimento). É uma regra com custo, não uma trava.
 */
export const SANCOES_FFP = {
  /** Excesso até isto, na primeira vez: só aviso. */
  aviso_ate: 0.05,
  /** Multa = fracção do excesso em euros (1.ª vez / reincidente). */
  multa: [0.25, 0.5],
  /** Proibição de contratar (1 época) a partir deste excesso, ou em qualquer reincidência. */
  proibicao_excesso: 0.1,
  /** Perda de pontos: a partir da 2.ª reincidência, ou já na 1.ª com excesso acima de x. Pontos = base + por cada 0,1 de excesso, até ao máximo. */
  pontos_reincidencia: 2,
  pontos_excesso: 0.15,
  pontos_base: 3,
  pontos_por_decimo: 3,
  pontos_maximo: 12,
};
