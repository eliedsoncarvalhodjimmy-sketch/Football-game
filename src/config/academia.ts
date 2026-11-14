// Academia e juniores (Prompt 4, Bloco C). Todos os números do bloco; os valores por país estão marcados "gerado".

/** Dois escalões por clube (não há sub-17, sub-19 nem sub-23). */
export const ESCALOES = {
  sub18: { idade: [15, 18] as [number, number], maximo: 18 },
  sub21: { idade: [19, 21] as [number, number], maximo: 18 },
};

/** Prospectos: jovens de 15–17 da academia que ainda não estão nos escalões. */
export const PROSPECTOS = {
  idade: [15, 17] as [number, number],
  /** Shortlist (jogadores individuais): base + por nível da academia (1–10), até ao máximo. */
  shortlist_base: 7,
  shortlist_por_nivel: 0.5,
  shortlist_maximo: 12,
  /** Agregado: faixas de qualidade (potencial face ao nível do clube, em pontos de OVR). */
  faixas: [-18, -12, -6, 0, 6] as number[],
  /** Por ano, cada jovem do agregado pode "despontar" (passa a individual, com +x de potencial). */
  despontar: 0.04,
  despontar_bonus: 6,
  /** Saem da shortlist (e não passam ao sub-21) os que têm potencial abaixo de (potencial médio do intake do clube + x). */
  corte_relativo: -11,
};

/** Intake anual (15 e 16 anos). Substitui a reposição gerada do Prompt 2. */
export const INTAKE = {
  minimo: 6,
  maximo: 12,
  idade: [15, 16] as [number, number],
  /** Fracção vinda de países próximos (mesma confederação). */
  vizinhos: 0.1,
  /** Potencial médio = nível do clube + base + pesos × (factores normalizados −1…1); desvio. */
  potencial_base: -11,
  /** + x × (nível do clube − referência): os grandes formam relativamente melhor (contraria a compressão do mercado). */
  potencial_por_nivel: 0.15,
  nivel_referencia: 65,
  /** Âncora por liga (como a reposição ancorada do Prompt 2): se o OVR médio da liga derivou d pontos face ao início,
   *  o intake dos seus clubes tem potencial − ganho × d (d limitado a ±maximo). Mantém a qualidade das ligas em décadas. */
  ancora: { ganho: 3, maximo: 8 },
  /** uso: o uso da academia do arquétipo (formador 0,9 … comprador de estrelas 0,2): os formadores investem na prospecção de jovens. */
  pesos: { reputacao: 3, academia: 3, coordenador: 2, recrutamento: 1, pais: 3, uso: 3 },
  desvio: 7,
  /** Volume: mínimo + (máximo − mínimo) × (dimensão do país × a + academia/10 × b + reputação/100 × c). */
  volume: { dimensao: 0.4, academia: 0.3, reputacao: 0.3 },
};

/** Minutos e nível de competição dos juniores na fórmula de evolução (em vez de minutos reais). */
export const MINUTOS_JUVENIS = {
  sub18: 0.4,
  sub21: 0.45,
  prospecto: 0.3,
  /** + por nível da academia acima de 5; + pela força do campeonato do país (força desportiva/100 × x). */
  por_nivel_academia: 0.03,
  por_campeonato: 0.15,
};

/** Desenvolvimento (1–20) dos juniores: coordenador da academia e nível da academia, em vez do treinador principal. */
export const DESENVOLVIMENTO_JUVENIL = { por_nivel_academia: 0.8 };

/** Promoções e saídas. */
export const PROMOCAO = {
  /** Equipa principal: tamanho a repor e mínimo absoluto. */
  plantel_alvo: 25,
  plantel_minimo: 22,
  /** Alvo da equipa principal com juniores = mínimo + (alvo − mínimo) × min(1, uso da academia do arquétipo × x). */
  alvo_por_academia: 1.25,
  /** Promove um sub-21 (até ao plantel-alvo) se o OVR ≥ (OVR do n.º do plantel) − x; o formador cede mais (× uso da academia do arquétipo). */
  ordem_referencia: 16,
  margem_promocao: 1,
  /** Mínimos absolutos por grupo de posições: abaixo disto sobe o melhor júnior (17+) do grupo (o resto é com o mercado). */
  minimos_posicao: { GR: 2, DEF: 6, MED: 6, AVA: 4 } as Record<string, number>,
  margem_por_academia: 10,
  /** Fora da curva: um sub-18 sobe ao sub-21 se o potencial ≥ este percentil do sub-18 ... */
  fora_da_curva_percentil: 0.9,
  /** ... e OVR ≥ este percentil do sub-21 (só com menos de 18 anos). */
  fora_da_curva_sub21: 0.75,
  /** Aos 22 anos, quem não sobe: vende-se (vai para o plantel e é listado) se o OVR ≥ nível da liga − x; senão é libertado. */
  vender_margem: 12,
  /** Lugares acima do plantel-alvo para os que sobem já listados para venda. */
  vender_lugares: 0,
  /** Libertados: ficam livres se o OVR ≥ x; senão deixam o futebol. */
  livre_minimo: 40,
  /** Probabilidade de um júnior libertado ficar livre no mundo simulado (os outros vão para divisões abaixo das simuladas). */
  prob_livre: 0.5,
};

/** Aliciamento de jovens (16–18) por clubes maiores, com compensação de formação. */
export const ALICIAMENTO = {
  idade: [16, 18] as [number, number],
  /** O comprador tem de ter reputação ≥ vendedor + x. */
  diferenca_reputacao: 15,
  /** Por ano, probabilidade de um clube grande tentar aliciar um prospecto conhecido. */
  prob_clube: 0.25,
  /** Só jovens com potencial estimado ≥ nível do comprador − x. */
  margem_potencial: 4,
  /** Aceita se a reputação do comprador superar a do clube actual (com ruído). */
  ruido: 8,
};

/** Compensação de formação (ao estilo da FIFA): € por ano de formação dos 12 aos 21, pela categoria do clube comprador. */
export const COMPENSACAO = {
  idade_inicio: 12,
  idade_fim: 21,
  categorias: [
    { reputacao: 75, por_ano: 90_000 },
    { reputacao: 60, por_ano: 60_000 },
    { reputacao: 40, por_ano: 30_000 },
    { reputacao: 0, por_ano: 10_000 },
  ],
};

/** Estatísticas leves dos jovens (só no clube do utilizador): jogos por mês por escalão. */
export const ESTATISTICAS_JUVENIS = { jogos_mes: { sub18: 3, sub21: 3, prospecto: 2 } as Record<string, number> };

/** Força juvenil (0–1) e dimensão (0–1) dos países. "gerado": estimativas, editáveis. Sem entrada: 0,5 / 0,4. */
export const FORCA_JUVENIL_PAIS: Record<string, number> = {
  BRA: 1.0, ARG: 0.95, FRA: 0.95, ESP: 0.9, POR: 0.85, NED: 0.85, GER: 0.85, ENG: 0.85, ITA: 0.8, BEL: 0.8, CRO: 0.8, URU: 0.8,
  SRB: 0.7, COL: 0.7, SEN: 0.7, NGA: 0.7, CIV: 0.7, DEN: 0.65, SUI: 0.6, AUT: 0.6, CZE: 0.6, MAR: 0.65, GHA: 0.6, JPN: 0.6,
  KOR: 0.6, USA: 0.55, MEX: 0.6, ECU: 0.6, SWE: 0.6, NOR: 0.55, POL: 0.55, TUR: 0.55, SCO: 0.5, GRE: 0.5, UKR: 0.6,
  KSA: 0.35, UAE: 0.3, QAT: 0.3, CHN: 0.35, AUS: 0.45,
};
export const DIMENSAO_PAIS: Record<string, number> = {
  BRA: 1.0, USA: 0.9, ENG: 0.9, GER: 0.9, FRA: 0.85, ESP: 0.85, ITA: 0.85, ARG: 0.8, MEX: 0.8, JPN: 0.75, TUR: 0.7, CHN: 0.8,
  NGA: 0.7, COL: 0.65, KOR: 0.6, POL: 0.6, UKR: 0.6, KSA: 0.5, NED: 0.5, POR: 0.5, BEL: 0.45, EGY: 0.6, MAR: 0.5,
  URU: 0.3, CRO: 0.3, DEN: 0.35, SCO: 0.35, SUI: 0.35, AUT: 0.35, NOR: 0.35, GRE: 0.4, CZE: 0.4, SRB: 0.35, UAE: 0.3,
};
