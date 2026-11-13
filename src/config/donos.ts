// Donos dos clubes (Prompt 3, Bloco B). Atributos 1–20. Os donos reais virão em donos.csv; os outros são gerados.
export const TIPOS_DONO = ['familia', 'bilionario', 'estado', 'adeptos', 'investimento', 'multiclube'] as const;
export type TipoDono = (typeof TIPOS_DONO)[number];
export const ATRIBUTOS_DONO = ['riqueza', 'ambicao', 'paciencia', 'interferencia', 'gasto', 'risco', 'lealdade'] as const;
export type AtributoDono = (typeof ATRIBUTOS_DONO)[number];

export const NOME_TIPO_DONO: Record<TipoDono, string> = {
  familia: 'Família local', bilionario: 'Bilionário', estado: 'Fundo estatal', adeptos: 'Adeptos (sócios)', investimento: 'Grupo de investimento', multiclube: 'Grupo multi-clube',
};

/** Médias dos atributos por tipo (σ 2,5 à volta). */
export const PERFIL_TIPO: Record<TipoDono, Record<AtributoDono, number>> = {
  familia: { riqueza: 7, ambicao: 9, paciencia: 13, interferencia: 11, gasto: 8, risco: 8, lealdade: 16 },
  bilionario: { riqueza: 17, ambicao: 15, paciencia: 7, interferencia: 13, gasto: 14, risco: 14, lealdade: 9 },
  estado: { riqueza: 19, ambicao: 17, paciencia: 9, interferencia: 10, gasto: 16, risco: 12, lealdade: 14 },
  adeptos: { riqueza: 4, ambicao: 10, paciencia: 14, interferencia: 8, gasto: 7, risco: 4, lealdade: 20 },
  investimento: { riqueza: 13, ambicao: 11, paciencia: 9, interferencia: 9, gasto: 10, risco: 10, lealdade: 6 },
  multiclube: { riqueza: 14, ambicao: 10, paciencia: 10, interferencia: 12, gasto: 9, risco: 9, lealdade: 5 },
};

/** Pesos de cada tipo por país (o resto usa o padrão). Ex.: modelo de adeptos (50+1) na Alemanha, sócios em Espanha e Portugal. */
export const PESOS_TIPO_PAIS: Record<string, Partial<Record<TipoDono, number>>> = {
  padrao: { familia: 4, bilionario: 1.5, estado: 0.2, adeptos: 1, investimento: 1.5, multiclube: 0.8 },
  GER: { familia: 1, bilionario: 0.2, adeptos: 8, investimento: 0.8, multiclube: 0.2 },
  ESP: { familia: 3, bilionario: 1.5, adeptos: 2, investimento: 1.2, multiclube: 0.8 },
  POR: { familia: 2, bilionario: 1, adeptos: 3, investimento: 1.5, multiclube: 1 },
  ENG: { familia: 2, bilionario: 3, estado: 0.5, adeptos: 0.2, investimento: 3, multiclube: 1.5 },
  ITA: { familia: 3, bilionario: 2, adeptos: 0.2, investimento: 3, multiclube: 1 },
  FRA: { familia: 2, bilionario: 2, estado: 0.4, adeptos: 0.3, investimento: 2.5, multiclube: 2 },
  KSA: { estado: 6, familia: 1, adeptos: 0.5, investimento: 0.5 },
  UAE: { estado: 4, familia: 2 },
  BRA: { adeptos: 6, familia: 1, investimento: 1.5, multiclube: 0.5 },
  ARG: { adeptos: 10, familia: 0.5 },
  URU: { adeptos: 6, familia: 1 },
  ECU: { adeptos: 3, familia: 2 },
  COL: { familia: 3, adeptos: 2, investimento: 1 },
  MEX: { familia: 4, bilionario: 2, investimento: 1.5 },
  USA: { familia: 1, bilionario: 3, investimento: 3, multiclube: 1.5, adeptos: 0.1 },
  JPN: { familia: 3, investimento: 3, adeptos: 0.5 },
  KOR: { familia: 1, investimento: 3, estado: 1 },
  NOR: { adeptos: 4, familia: 2 },
  SWE: { adeptos: 6, familia: 1 },
};

/** Clubes grandes atraem mais bilionários e fundos: peso × (1 + x × (reputação − 50) / 50) para esses tipos. */
export const ATRACCAO_REPUTACAO = { bilionario: 1.2, estado: 1.5, investimento: 0.6, multiclube: 0.3 } as Partial<Record<TipoDono, number>>;

/** Fortuna do dono (€) = 10 ^ (expoente_base + riqueza × expoente_por_ponto). Riqueza 4 → 1 M€; 12 → 100 M€; 20 → 10 mil M€. */
export const FORTUNA = { expoente_base: 5, expoente_por_ponto: 0.25 };

export const DONOS = {
  /** Injecção anual de capital (início de época): só com ambição > limiar; valor = (ambição − limiar)/10 × fracção × receita, até à capacidade anual. */
  injeccao_limiar_ambicao: 11,
  injeccao_fraccao_receita: 0.25,
  /** Capacidade anual de pôr dinheiro = fortuna × x × gasto / 10. */
  capacidade_fortuna: 0.03,
  /** Em crise o dono cobre o défice com probabilidade (lealdade + riqueza)/40, até à capacidade anual. */
  socorro_minimo: 0.1,
  /** Política de dívida: dívida máxima aceite pelo dono = (0,4 + risco/20) × receita. */
  divida_base: 0.4,
  /** Massa salarial alvo do dono: 0,62 + 0,04 × (ambição − 10)/10 + 0,04 × (risco − 10)/10; os de risco ≥ 16 aceitam passar o limite do fair play. */
  massa_base: 0.62,
  massa_ambicao: 0.04,
  massa_risco: 0.04,
  risco_ffp: 16,
};

/** Venda do clube (pendência 4.4 do utilizador: múltiplo e lua de mel a validar). */
export const VENDA = {
  /** Preço = múltiplo × receita + valor das instalações (metade do custo acumulado) + caixa − dívida (mínimo: fracção da receita). */
  multiplo_receita: 2.5,
  minimo_receita: 0.3,
  /** Lua de mel (meses): sem venda, sem despedir o treinador por resultados, paciência máxima. */
  lua_de_mel_meses: 12,
  /** Probabilidade anual de venda: base + maus resultados + dívida + perda de riqueza, × (1,5 − lealdade/20), até ao máximo. */
  base: 0.015,
  maus_resultados: 0.08,
  divida: 0.08,
  perda_riqueza: 0.25,
  maximo: 0.35,
  /** Maus resultados: reputação a cair mais de x em 3 épocas, ou objectivo falhado em 2 épocas seguidas. */
  queda_reputacao: 6,
  /** O comprador precisa de fortuna ≥ x × preço. */
  fortuna_preco: 3,
  /** Novo dono: injecção inicial (fracção da receita × ambição/20) e fracção da dívida bancária que paga. */
  injeccao_inicial: 0.3,
  paga_divida: 0.5,
};

/** Eventos raros (probabilidade anual por clube). */
export const EVENTOS_RAROS = {
  /** Dono retira-se (a partir dos 75 anos): família passa a herdeiro; outros vendem. */
  retira_idade: 75,
  retira: 0.15,
  escandalo: 0.004,
  /** Um magnata ou fundo compra um clube com reputação ≥ x (não de adeptos). */
  magnata: 0.003,
  magnata_reputacao_min: 40,
  /** Dono perde riqueza (crise do grupo): riqueza −3 a −6. */
  perda_riqueza: 0.01,
};

/** Objectivo da época que o dono define, pela posição esperada (ordem de reputação) e pela ambição. */
export const OBJECTIVOS = ['título', 'competições europeias', 'metade de cima', 'manutenção', 'subida'] as const;
