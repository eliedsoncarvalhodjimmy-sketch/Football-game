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

/** Força juvenil dos países (0–1), simplificada (resposta à Paragem C): deriva da força desportiva da 1.ª liga do país,
 *  com um bónus para os grandes exportadores de talento; sem liga no jogo: valor por omissão. A dimensão do país vem do
 *  número de clubes que tem no mundo (a maior = 1). */
export const FORCA_JUVENIL = {
  base: 0.2,
  por_forca_desportiva: 0.8,
  exportadores: ['BRA', 'ARG', 'FRA', 'POR', 'NED', 'BEL', 'CRO', 'URU', 'SEN', 'NGA', 'CIV', 'SRB', 'COL'],
  bonus_exportador: 0.15,
  sem_liga: 0.5,
  dimensao_sem_liga: 0.4,
};

/** Jovens gerados por ano no mundo (resposta do utilizador à Paragem C), na escala dele: probabilidade, OVR aos 17–18 e potencial.
 *  Não são regras inquebráveis: os clubes melhores (nível, academia, coordenador, recrutamento, país, arquétipo) puxam a
 *  distribuição para os escalões de cima, e a distribuição do mundo é recalibrada para bater com a tabela. */
export const TABELA_JOVENS: { p: number; ovr: [number, number]; pot: [number, number] }[] = [
  { p: 0.325, ovr: [50, 65], pot: [65, 75] },
  { p: 0.225, ovr: [55, 65], pot: [70, 79] },
  { p: 0.10, ovr: [55, 65], pot: [75, 84] },
  { p: 0.10, ovr: [55, 65], pot: [76, 86] },
  { p: 0.10, ovr: [58, 69], pot: [76, 90] },
  { p: 0.05, ovr: [58, 69], pot: [80, 92] },
  { p: 0.03, ovr: [60, 72], pot: [82, 95] },
  { p: 0.01, ovr: [65, 74], pot: [85, 95] },
  { p: 0.005, ovr: [68, 75], pot: [88, 97] },
  { p: 0.005, ovr: [75, 82], pot: [96, 99] },
];

/** Conversão da escala da tabela para a do mundo (a do Prompt 2): mundo = topo − (topo − tabela) × factor (99 fica 99). */
export const ESCALA_TABELA = { topo: 99, factor: 2.0 };
export const daTabela = (u: number) => ESCALA_TABELA.topo - (ESCALA_TABELA.topo - u) * ESCALA_TABELA.factor;

/** Distribuição por clube: p(escalão k) ∝ p_tabela × calibração × e^(inclinação × q × x_k), q = qualidade do clube (z),
 *  x_k de −1 (escalão mais baixo) a +1 (mais alto). */
export const INCLINACAO_TABELA = 3;

/** Clubes abaixo da qualidade média do mundo: potencial e OVR do intake − x × (média − qualidade do clube) (a tabela não tem chão
 *  abaixo de 65; as ligas mais fracas do jogo estão abaixo disso). */
export const DESLOCAMENTO_FRACOS = 0.7;

/** Nenhum jovem dos 15 aos 18 passa de 82 de OVR (escala da tabela). */
export const TETO_JUNIOR = { idade: 19, ovr_tabela: 82 };

/** OVR na entrada: a distância ao potencial encolhe ~e^(−k) por ano até aos 18 (k ≈ ritmo da evolução dos juniores). */
export const CRESCIMENTO_ATE_18 = { k: 0.2 };

/** Um jovem titular evolui mais depressa: crescimento × (1 + bónus × minutos × força do campeonato/100 × (0,8 + 0,4 × moral/20)). */
export const JOVEM_TITULAR = { idade_maxima: 21, bonus: 0.5, minutos_minimos: 0.5 };

/** Potencial dinâmico (fim de época, até aos 24): Δ ~ N(μ, σ), μ = minutos × a + força da liga × b + centro de treino × c
 *  − (OVR acima do nível do clube) × d; |Δ| ≤ máximo. Um jovem bom num clube fraco pode perder potencial e estagnar. */
export const POTENCIAL_DINAMICO = { idade_maxima: 24, minutos: 1.2, minutos_centro: 0.6, liga: 0.6, liga_centro: 60, treino: 0.3, acima_do_clube: 2, margem_clube: 6, desvio: 1.2, maximo: 4, topo_suave: 12 };

/** Contrato profissional obrigatório aos 18 (proposto pelo coordenador da academia, aprovado pelo dono/director): senão sai.
 *  Salário mínimo da liga = base × (1 + por_riqueza × índice/100) × (1 na 1.ª divisão, divisao nas outras); dura até aos 22. */
export const CONTRATO_JUNIOR = { idade: 18, base: 12_000, por_riqueza: 3, divisao: 0.6, ate_idade: 22 };

/** Âncora da evolução dos seniores (resposta à Paragem C): numa liga cujo OVR médio derivou d pontos, cada jogador da equipa
 *  principal tem −ganho × d de evolução por mês (d limitado como na âncora do intake). */
export const ANCORA_EVOLUCAO = { ganho: 0.025 };
