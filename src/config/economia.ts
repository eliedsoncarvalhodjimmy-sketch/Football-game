// Economia do clube (Prompt 3, Bloco A). Valores em euros, escala real 1:1.
// A desigualdade entre ligas vem do índice de riqueza de cada liga (100 = Premier League).
//
//   factor de riqueza da liga = (índice / 100) ^ expoente  (cada rubrica tem o seu expoente)

/** Salário de mercado (€/ano) de um jogador, pelo OVR, idade, potencial e riqueza da liga do clube. */
export const SALARIO = {
  /** Salário de um jogador de OVR = ovr_referencia, 27 anos, numa liga de índice 100. */
  referencia: 16_000_000,
  ovr_referencia: 88,
  /** Cada ponto de OVR multiplica o salário por exp(isto). */
  por_ponto_ovr: 0.09,
  expoente_riqueza: 0.6,
  /** Escala salarial de cada liga, calibrada no arranque: massa salarial de mercado = alvo × receita prevista da liga.
   *  (O índice de riqueza dá a escala de partida; esta calibração corrige ligas com receitas fora da proporção.) */
  alvo_massa_receita: { nivel1: 0.58, inferiores: 0.58 },
  /** Capacidade salarial de cada clube no arranque: massa = alvo × e^N(0, desvio) × receita prevista; limites. */
  clube: { desvio: 0.12, min: 0.3, max: 3 },
  /** Ajuste anual da capacidade salarial de cada clube (mercado salarial): × (alvo × receita / massa) ^ expoente, limitado a [min, max] por época. */
  ajuste_anual: { expoente: 0.35, min: 0.92, max: 1.1 },
  /** Mínimo absoluto (€/ano). */
  minimo: 12_000,
  /** Factor por idade (pico entre 25 e 30). */
  idade: (idade: number) => (idade < 20 ? 0.45 : idade < 23 ? 0.65 : idade < 25 ? 0.85 : idade <= 30 ? 1 : idade <= 33 ? 0.85 : 0.65),
  /** Jovens (< 24) com potencial acima do OVR: +3% por ponto de diferença, até +40%. */
  potencial_por_ponto: 0.03,
  potencial_maximo: 0.4,
  /** Dispersão dos salários gerados à volta do de mercado (σ do logaritmo). */
  ruido_geracao: 0.2,
};

export const CONTRATOS = {
  /** Contratos gerados: anos restantes (inteiro uniforme). */
  anos_gerados: [1, 5] as [number, number],
  /** Renovação automática (até ao Prompt 4): anos do novo contrato. */
  anos_renovacao: [2, 4] as [number, number],
  /** Os jovens da reposição: contrato de 3 anos. */
  anos_jovens: 3,
  /** A IA renova sempre os N melhores do plantel (mesmo acima do orçamento) e nunca deixa o plantel abaixo do mínimo. */
  renovar_sempre_melhores: 16,
  plantel_minimo: 22,
  /** Acima desta idade não renova (o jogador sai). */
  idade_maxima_renovacao: 35,
  /** Cláusula de descida (prática comum): os salários do plantel descem esta fracção quando o clube desce. */
  corte_descida: 0.3,
  /** Comissão de agentes sobre transferências (Prompt 4). */
  comissao_agentes: 0.05,
};

/** Receita de TV: pela regra de cada liga (pacotes). Pagamentos de pára-quedas aos descidos (fracção da parte igual da liga de cima). */
export const TV = {
  /** Decisão do utilizador: Inglaterra 55% e 45%; Espanha e Alemanha metade (27,5% e 22,5%). Restantes: nenhum. */
  paraquedas: { ENG1: [0.55, 0.45], ESP1: [0.275, 0.225], GER1: [0.275, 0.225] } as Record<string, number[]>,
  /** Parte "comercial" da TV: repartida pela reputação ^ isto. */
  expoente_comercial: 2,
};

export const BILHETEIRA = {
  /** Preço médio (€) numa liga de índice 100, para um clube de reputação 100. */
  preco_base: 55,
  expoente_riqueza: 0.35,
  /** Preço × (piso + (1 − piso) × reputação / 100). */
  piso_preco_reputacao: 0.45,
  /** Ocupação base = a + b × reputação/100 + fidelidade; limitada a [min, 1]. */
  ocupacao: { a: 0.42, b: 0.45, fidelidade: 0.012, min: 0.2 },
  /** Forma: ± por ponto de diferença entre os pontos por jogo recentes e 1,4. */
  forma: 0.06,
  /** Rivalidade: + ocupação por nível de intensidade (1–3). */
  rival: 0.04,
  /** Adversário com mais 10+ de reputação: + ocupação. */
  jogo_grande: 0.08,
  /** Multiplicadores do preço por tipo de jogo. */
  preco_continental: 1.5,
  preco_taca: 0.7,
  preco_playoff: 1.2,
  /** Ocupação extra em jogos continentais e play-offs. */
  ocupacao_continental: 0.12,
};

export const COMERCIAL = {
  /** Patrocínios e comercial (€/ano) de um clube de reputação 100 numa liga de índice 100. */
  referencia: 320_000_000,
  expoente_riqueza: 0.7,
  expoente_reputacao: 4,
  /** Adeptos: factor = 0,75 + 0,25 × min(1, adeptos / referência). */
  adeptos_referencia: 2000,
  /** Mínimo (€/ano) por clube profissional. */
  minimo: 150_000,
  /** Contratos de vários anos; na renovação o valor é recalculado com a reputação actual e ruído. */
  anos: [3, 5] as [number, number],
  ruido_renovacao: 0.12,
  /** Bónus/malus de resultados por época (fracção do contrato): título, subida, descida. */
  bonus_titulo: 0.1,
  malus_descida: 0.15,
};

export const ADEPTOS = {
  /** Dimensão (milhares): base + referência × (reputação/100)^expoente × (índice/100)^expoente_riqueza. */
  base: 3,
  referencia: 4000,
  expoente: 4,
  expoente_riqueza: 0.25,
  /** Fidelidade 1–20 gerada à volta de 10 + 4 × (reputação − 50) / 50. */
  fidelidade_desvio: 3,
};

export const DESPESAS = {
  /** Staff (até ao Bloco C, onde passa a ser o salário real do staff): fracção da receita prevista. */
  staff_fraccao_receita: 0.06,
  /** Manutenção do estádio por lugar e por ano (€), × factor de riqueza (expoente 0,3). */
  manutencao_por_lugar: 40,
  /** Impostos e outros custos (fracção da receita), por país. */
  outros_por_pais: { ENG: 0.2, ESP: 0.21, GER: 0.2, ITA: 0.22, FRA: 0.24, POR: 0.2, NED: 0.2, BRA: 0.23, ARG: 0.24 } as Record<string, number>,
  outros_padrao: 0.2,
};

export const FINANCAS_INICIAIS = {
  /** Caixa inicial: fracção da receita prevista (à volta de, com ruído). */
  caixa_fraccao: 0.18,
  caixa_ruido: 0.5,
  /** Dívida bancária inicial: fracção da receita prevista, uniforme [0, max] (com probabilidade p de não ter). */
  divida_max_fraccao: 0.6,
  divida_prob_zero: 0.3,
  /** Juro anual do banco. */
  juro_banco: 0.05,
  /** Orçamentos (fracção da receita prevista). */
  orcamento_infra: 0.04,
  /** Massa salarial alvo da IA (fracção da receita prevista), abaixo do limite do fair play. */
  massa_salarial_alvo: 0.65,
  /** Orçamento de transferências: fracção da caixa acima da reserva (só o valor; usado no Prompt 4). */
  transferencias_fraccao_caixa: 0.5,
  /** Reserva de caixa: meses de despesas. */
  reserva_meses: 2,
};

/** Saúde financeira (verificada todos os meses). */
export const SAUDE = {
  /** Apertado: caixa abaixo de N meses de despesas ou dívida acima de x × receita anual. */
  apertado_meses: 1,
  apertado_divida: 0.8,
  /** Crise: caixa negativa ou dívida acima de x × receita anual. */
  crise_divida: 1.5,
};

/** Fair play da liga: massa salarial até x da receita. Se a folha da liga indicar uma percentagem ("85% da receita"), é esse o balizador. */
export const FAIR_PLAY = { padrao: 0.8 };

/** Reputação: histórico guardado (épocas). */
export const HISTORICO_CLUBE = { anos: 10 };
