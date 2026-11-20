// Academia e juniores (Prompt 4, Bloco C). Todos os números do bloco; os valores por país estão marcados "gerado".

/** Dois escalões por clube (não há sub-17, sub-19 nem sub-23). Cadeia: Intake → Sub-18 → Sub-21 → equipa principal.
 *  Sub-18 com máximo 30 (resposta do utilizador à Paragem 2 do plano juvenil): o intake de 6–12 por ano entra todo no Sub-18;
 *  o excedente é libertado na passagem de época (fim de Julho), por proposta do gestor da academia. */
export const ESCALOES = {
  sub18: { idade: [15, 18] as [number, number], maximo: 30 },
  sub21: { idade: [19, 21] as [number, number], maximo: 18 },
};

/** Excedente do Sub-18: na passagem de época o gestor propõe quem libertar; a IA decide logo, o utilizador até ao mês indicado
 *  (0 = Janeiro), depois aplica-se a proposta. */
export const EXCEDENTE = { prazo_utilizador_mes: 8 };

/** Saem (contrato aos 18, passagem ao sub-21) os que têm potencial abaixo de (potencial médio do intake do clube + x). */
export const CORTE_RELATIVO = -11;

/** Intake anual (15 e 16 anos), em Junho, directamente no Sub-18. Substitui a reposição gerada do Prompt 2. */
export const INTAKE = {
  /** Mês do intake (0 = Janeiro). */
  mes: 5,
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
  pesos: { reputacao: 3, academia: 3, coordenador: 2, recrutamento: 1, pais: 3, uso: 7 },
  desvio: 7,
  /** Volume: mínimo + (máximo − mínimo) × (dimensão do país × a + academia/10 × b + reputação/100 × c). */
  volume: { dimensao: 0.4, academia: 0.3, reputacao: 0.3 },
};

/** Minutos dos juniores na fórmula de evolução: os minutos reais vêm das ligas juvenis (LIGAS_JUVENIS); somam-se estes termos. */
export const MINUTOS_JUVENIS = {
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
  margem_por_academia: 14,
  /** Clubes com pouco uso da academia (comprador de estrelas, magnata): os formados da casa até aos 23 fora dos 14 melhores são postos à venda. */
  vender_formados_uso: 0.4,
  vender_formados_ordem: 14,
  vender_formados_idade: 23,
  /** Promover não é obrigatório: o júnior sobe se tiver lugar no plano de plantel. Quem usa pouco a academia (uso < x:
   *  comprador de estrelas, magnata) só promove quem entra no onze; o formador cede lugar só pelo nível (sem plano);
   *  os outros exigem lugar na profundidade da posição. */
  so_titular_uso: 0.4,
  /** ... e, nesses clubes, o júnior sem lugar sai cedo (a partir desta idade): sobe ao plantel para ser emprestado
   *  (potencial ≥ OVR + 5) ou vendido a um clube menor, antes de se estrear. */
  sair_cedo_idade: 19,
  /** Mínimo do plantel que obriga a subir juniores sem nível nesses clubes (o resto faz o mercado). */
  minimo_pouca_academia: 20,
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

/** Contrato profissional obrigatório aos 18 (proposto pelo coordenador da academia, aprovado pelo dono): senão sai.
 *  Salário mínimo da liga = base × (1 + por_riqueza × índice/100) × (1 na 1.ª divisão, divisao nas outras); dura até aos 22. */
export const CONTRATO_JUNIOR = { idade: 18, base: 12_000, por_riqueza: 3, divisao: 0.6, ate_idade: 22 };

/** Âncora da evolução dos seniores (resposta à Paragem C): numa liga cujo OVR médio derivou d pontos, cada jogador da equipa
 *  principal tem −ganho × d de evolução por mês (d limitado como na âncora do intake). */
export const ANCORA_EVOLUCAO = { ganho: 0.025 };

/** Relatório do intake (simples): OVR e PT em intervalo e uma palavra de personalidade.
 *  Meia-largura = base − por_ponto × (avaliação do Chefe de Desenvolvimento Juvenil − 10), no mínimo `minimo`; encolhe com os jogos. */
export const RELATORIO_INTAKE = { meia_largura_base: 5, por_ponto: 0.35, minimo: 1, por_jogo: 0.06 };

/** Personalidade numa palavra, a partir dos atributos ocultos (a primeira regra que se cumpre). */
export const PERSONALIDADE: { nome: string; tom: 'bom' | 'info' | 'neutro' | 'aviso' | 'mau'; oculto: 'prof' | 'amb' | 'cst' | 'pre'; min?: number; max?: number }[] = [
  { nome: 'Pouco dedicado', tom: 'mau', oculto: 'prof', max: 6 },
  { nome: 'Temperamental', tom: 'aviso', oculto: 'pre', max: 6 },
  { nome: 'Profissional', tom: 'bom', oculto: 'prof', min: 15 },
  { nome: 'Ambicioso', tom: 'info', oculto: 'amb', min: 15 },
  { nome: 'Determinado', tom: 'bom', oculto: 'cst', min: 15 },
];
export const PERSONALIDADE_NEUTRA = { nome: 'Equilibrado', tom: 'neutro' as const };

/** Ligas juvenis (plano juvenil, resposta do utilizador): 1.ª + 2.ª divisão juntas a uma volta, playoff dos 8 primeiros em
 *  Maio; 3.ª e 4.ª divisão com amigáveis semanais. Simulação leve: força = OVR médio do onze do escalão. */
export const LIGAS_JUVENIS = {
  /** Dia de Agosto da semana da 1.ª jornada. */
  dia_inicio: 8,
  suplentes: 3,
  /** Golos esperados: base e efeito de cada ponto de OVR de diferença (o modo rápido sénior usa a escala dos ratings). */
  base: 1.35,
  gama: 0.06,
  /** Equipa incompleta: − pontos de força por jogador em falta; sem jogadores: força fixa. */
  falta_jogador: 3,
  forca_vazia: 30,
  /** Treinador do escalão: + pontos por ponto de "trabalho com jovens" e de "conhecimento táctico" acima de 10 (limite). */
  treinador_por_ponto: 0.08,
  treinador_limite: 1.2,
  prob_substituido: 0.3,
  minuto_substituicao: 65,
  prob_assistencia: 0.7,
  peso_golo: { PL: 1.2, ED: 0.6, EE: 0.6, MO: 0.5, MC: 0.22, MDC: 0.1, DC: 0.07, DD: 0.06, DE: 0.06, ALD: 0.1, ALE: 0.1, GR: 0.001 } as Record<string, number>,
  peso_assist: { PL: 0.35, ED: 0.7, EE: 0.7, MO: 0.8, MC: 0.45, MDC: 0.2, DC: 0.08, DD: 0.3, DE: 0.3, ALD: 0.4, ALE: 0.4, GR: 0.02 } as Record<string, number>,
  nota_base: 6.5,
  nota_vitoria: 0.35,
  nota_golo: 0.7,
  nota_assist: 0.35,
  nota_sofrido: 0.25,
  nota_ruido: 0.45,
  /** Evolução: parte dos minutos = mínima + escala × (minutos desde a última evolução / referência). Calibrada para que a
   *  média dos escalões fique perto dos valores fixos anteriores (sub-18 0,40; sub-21 0,45). */
  minutos_mes_referencia: 330,
  parte_minima: 0.2,
  parte_escala: 0.45,
};
