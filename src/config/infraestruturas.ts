// Infraestruturas do clube (Prompt 3, Bloco A): níveis 1 a 10.
//   custo da obra de n para n+1 = base × crescimento ^ n          (€)
//   prazo (semanas)             = prazo_base + prazo_por_nivel × n
//   manutenção anual            = fracção_manutenção × base × crescimento ^ nível
export const TIPOS_INFRA = ['estadio', 'treino', 'academia', 'medico', 'recrutamento'] as const;
export type TipoInfra = (typeof TIPOS_INFRA)[number];

export const INFRA: Record<TipoInfra, { nome: string; base: number; crescimento: number; prazo_base: number; prazo_por_nivel: number; manutencao: number }> = {
  estadio: { nome: 'Estádio', base: 600_000, crescimento: 1.6, prazo_base: 20, prazo_por_nivel: 4, manutencao: 0.06 },
  treino: { nome: 'Centro de treino', base: 250_000, crescimento: 1.6, prazo_base: 12, prazo_por_nivel: 3, manutencao: 0.1 },
  academia: { nome: 'Academia', base: 200_000, crescimento: 1.6, prazo_base: 12, prazo_por_nivel: 3, manutencao: 0.1 },
  medico: { nome: 'Instalações médicas', base: 150_000, crescimento: 1.55, prazo_base: 8, prazo_por_nivel: 2, manutencao: 0.1 },
  recrutamento: { nome: 'Recrutamento', base: 100_000, crescimento: 1.5, prazo_base: 6, prazo_por_nivel: 2, manutencao: 0.12 },
};

/** Custos (obras e manutenção) × max(mínimo, (índice de riqueza da liga / 100) ^ expoente): construir custa menos onde a liga é mais pobre. */
export const CUSTO_INFRA_RIQUEZA = { expoente: 0.5, minimo: 0.1 };

/** Efeitos (limitados; neutros no nível 5). */
export const EFEITOS_INFRA = {
  /** Estádio: preço do bilhete × (1 + x × (nível − 5)); cada obra concluída aumenta a capacidade. */
  estadio_preco: 0.03,
  estadio_capacidade_por_obra: 0.06,
  /** Centro de treino: soma ao "desenvolvimento" do treinador na evolução mensal (pontos por nível acima de 5). */
  treino_desenvolvimento: 0.4,
  /** Médico: dias de lesão × (1 − x × (nível − 5)). */
  medico_dias: 0.015,
  /** Academia e recrutamento: só o nível (efeitos no Prompt 4). */
};

/** Níveis iniciais: à volta de 1 + 9 × (reputação/100)^1,3 × (0,6 + 0,4 × índice/100)^0,3, com ruído ±1. */
export const NIVEIS_INICIAIS = { expoente_reputacao: 1.3, ruido: 1 };

/** IA das obras: no máximo N em simultâneo; só se a caixa depois da obra ficar acima da reserva. */
export const OBRAS_IA = {
  simultaneas: 2,
  /** Ganho esperado relativo de cada tipo (pesos da pontuação = ganho × ambição / custo). */
  ganho: { estadio: 1.0, treino: 1.2, academia: 0.7, medico: 0.8, recrutamento: 0.5 } as Record<TipoInfra, number>,
  /** Nível-alvo máximo face à reputação: não passa de 2 + 9 × reputação/100. */
  folga_reputacao: 2,
};
