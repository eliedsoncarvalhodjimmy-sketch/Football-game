// Nevoeiro de informação e scouting (Prompt 4, Bloco B). O motor usa os valores reais; o utilizador e a IA vêem estimativas.
export const CONHECIMENTO = {
  /** Jogadores conhecidos guardados por clube (os de menor conhecimento saem primeiro); o plantel próprio não conta. */
  maximo_por_clube: 300,
  /** Decaimento: −1 ponto de conhecimento por N dias sem observação. */
  decaimento_dias: 10,
  /** Erro da estimativa do OVR: σ = base × (1 − conhecimento/100) + mínimo; intervalo = ±1,5σ. */
  erro_ovr: 9,
  erro_minimo: 0.6,
  /** Potencial: σ = base × (1 − conhecimento/100)^0,7 + mínimo (o último e o mais impreciso). */
  erro_potencial: 14,
  erro_potencial_minimo: 1.5,
  /** Atributos ocultos só aparecem acima deste conhecimento (e com o dobro do erro). */
  ocultos_a_partir: 60,
  /** Jogadores do próprio plantel: conhecimento total ao fim de N dias no clube. */
  plantel_dias: 28,
  /** Ganhos de conhecimento: jogo contra o clube (titulares do adversário), proposta de um agente, relatório pedido. */
  ganho_jogo: 6,
  ganho_proposta: 25,
  /** Conhecimento inicial dos titulares prováveis dos adversários da própria liga (anos de jogos): uniforme no intervalo. */
  inicial_liga: [30, 55] as [number, number],
  /** ... e dos melhores de cada clube das ligas que os scouts já cobriam. N por clube. */
  inicial_scouts: [25, 45] as [number, number],
  inicial_por_clube: 8,
  /** Rendimentos decrescentes acima deste nível: ganho × ((100 − n)/(100 − x))^0,7. */
  decrescente_a_partir: 50,
  /** Abaixo disto a IA não considera o jogador como alvo. */
  minimo_alvo: 35,
};

export const SCOUTS = {
  /** Observações por scout por semana = base × (1 + nível do recrutamento / 10). */
  observacoes: 3,
  /** Ganho por observação = base + por_nivel × nível do scout, × familiaridade com a liga (0,5–1,2); o chefe de scouts soma. */
  ganho_base: 16,
  ganho_por_nivel: 1.6,
  chefe: 0.02,
  /** Familiaridade (0–1) por liga: +x por semana com scouts lá, −y por semana sem; ligas pouco conhecidas: erro × (1,6 − 0,6 × fam). */
  familiaridade_sobe: 0.03,
  familiaridade_desce: 0.004,
  /** Viés de cada scout (pontos de OVR) sobre um grupo de posições: σ. */
  vies_desvio: 2,
  /** Ligas a cobrir por scout (reatribuídas no início de cada época e em Janeiro). */
  ligas_por_scout: 1,
};

/** Atracção dos jogadores: os mais velhos pesam mais o salário e menos o prestígio (fluxos emergentes: veteranos para ligas que pagam bem). */
export const IDADE_DECISAO = { salario_por_ano: 0.07, prestigio_por_ano: 0.06, referencia: 24 };

/** Prémio salarial dos donos ricos e ambiciosos (estado, bilionário) para reforços: × (1 + x × ambição/20), pago com as injecções. */
export const PREMIO_SALARIAL_DONO = { estado: 1.0, bilionario: 0.6 } as Record<string, number>;
