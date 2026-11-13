// Estado dinâmico dos jogadores (Fase 2). Usado pelo motor no Bloco B.
export const ESTADO = {
  moral_inicial: 13,
  condicao_inicial: 100,
  ritmo_inicial: 70,
  /** Condição física (0–100): perda por 90 minutos e recuperação por dia de descanso. */
  perda_por_jogo: 22,
  recuperacao_por_dia: 6,
  /** Abaixo deste valor de condição o rendimento e o risco de lesão pioram. */
  limiar_condicao: 80,
  /** Lesões: probabilidade base por jogo; multiplicadores pela propensão e pela condição. */
  lesao_base_por_jogo: 0.012,
  lesao_por_propensao: (les: number) => 0.5 + les / 13,
  lesao_por_condicao: (cond: number) => (cond >= 80 ? 1 : 1 + (80 - cond) / 20),
  /** Gravidade (dias): ligeira, média, grave, com probabilidades. */
  gravidade: [
    { tipo: 'ligeira', p: 0.62, dias: [3, 14] },
    { tipo: 'média', p: 0.3, dias: [15, 45] },
    { tipo: 'grave', p: 0.08, dias: [60, 240] },
  ] as { tipo: string; p: number; dias: [number, number] }[],
  /** Cartões: amarelos para suspensão e jogos de castigo por vermelho. */
  amarelos_suspensao: 5,
  jogos_vermelho: 1,
};
