// Modo rápido de jogo (Fase 1): golos esperados a partir de ataque, defesa e
// factor casa; golos sorteados com Poisson, com correcção de Dixon-Coles para
// os resultados baixos (0-0, 1-0, 0-1, 1-1).
// Alvos de calibração: 2,6 golos/jogo; casa 45%, empate 26%, fora 29%;
// 0-0 7–8%; 5+ golos 10–12%; 7+ golos < 1,5%.
export const SIMULACAO = {
  /** Golos esperados de cada equipa entre forças iguais em campo neutro. */
  base: 1.24,
  /** Multiplicador dos golos esperados da equipa da casa (e divisor da visitante). */
  casa: 1.17,
  /** Efeito de cada ponto de diferença (ataque - defesa adversária) nos golos esperados:
   *  xG = base * exp(gama * (ataque - defesa)) * casa. Usa a diferença (e não a razão) para
   *  que uma liga fraca não seja mais desigual do que uma forte com a mesma dispersão. */
  gama: 0.03,
  /** Parâmetro de Dixon-Coles (negativo aumenta 0-0 e 1-1). */
  rho: -0.05,
  /** Peso extra dos empates com golos (1-1, 2-2, ...): o Poisson independente dá poucos empates. */
  empate_fator: 1.25,
  /** Amortecimento de goleadas: um resultado com T > limiar golos é aceite com probabilidade fator^(T - limiar). */
  goleada_limiar: 5,
  goleada_fator: 0.6,
  /** Limites de segurança dos golos esperados. */
  xg_min: 0.15,
  xg_max: 5,
  /** Prolongamento: fracção dos golos esperados de 90 minutos. */
  prolongamento: 1 / 3,
  /** Penáltis: probabilidade base de vitória da equipa mais forte (0,5 = moeda ao ar), por cada 10 pontos de diferença. */
  penaltis_vantagem_por_10: 0.02,
};

/**
 * Parâmetros do modo rápido com jogadores (Fase 2). Partem dos da Fase 1 e são afinados à parte, para o
 * modo 'reputacao' (alternativa da Fase 1) manter a sua calibração.
 */
export const SIMULACAO_ONZE = { ...SIMULACAO, base: 1.245, casa: 1.17, rho: -0.02, empate_fator: 1.12 };
