// Negociação, janelas, inscrições e IA básica de mercado (Prompt 4, Bloco A).
export const NEGOCIACAO = {
  /** Duração de cada ronda (dias). */
  dias_ronda: [1, 3] as [number, number],
  /** Contra-proposta do vendedor: entre a oferta e o preço pedido (fracção do caminho). */
  contra: 0.6,
  /** O comprador sobe a oferta até ao seu máximo (fracção do orçamento) em passos de x. */
  subida: 0.12,
  /** Máximo de rondas antes de desistir. */
  rondas_max: 6,
  /** Exames médicos: falham se o jogador estiver lesionado, com probabilidade p. */
  exames_falha_lesionado: 0.6,
  /** Mudança de orçamento: o negócio cai se o comprador já não tiver orçamento. */
  /** Último dia da janela: negócios abertos caem por falta de tempo com probabilidade p. */
  falta_tempo: 0.5,
  /** Pico de actividade: probabilidade de abordagem por semana × x na última semana da janela. */
  pico_ultima_semana: 2.5,
};


/** Inscrições: mínimo de nacionais (formados no país) e máximo de estrangeiros (fora da confederação do clube). */
export const INSCRICAO = {
  minimo_nacionais: { GER1: 12, GER2: 12, GER3: 12, ENG1: 8, ENG2: 8, ENG3: 8, ENG4: 8, ITA1: 8, ITA2: 8 } as Record<string, number>,
  maximo_estrangeiros: {} as Record<string, number>,
};

/** IA de mercado (versão do Bloco A; o nevoeiro e o scouting chegam no Bloco B). */
export const IA_MERCADO = {
  /** Tamanho alvo do plantel (a composição sai do plano de plantel: PLANO_PLANTEL). */
  tamanho_alvo: 25,
  /** Abordagens por necessidade por semana de janela (probabilidade). */
  prob_abordagem: 0.7,
  /** Candidatos avaliados por necessidade (listas curtas por posição). */
  candidatos: 40,
  /** Renovação: tendência a ficar quando o clube oferece o salário pedido (somada à ligação e ao salário). */
  renovacao_ficar: 1.0,
  /** Sem folga no orçamento salarial, renova-se na mesma se o pedido não passar de x × o salário actual. */
  renovacao_aumento_sem_folga: 1.15,
  /** A oferta de renovação é pelo menos x × o salário actual. */
  renovacao_minimo_actual: 0.95,
  /** Peso do descontentamento na renovação: − descontentamento / x. */
  renovacao_descontentamento: 120,
  /** Livres: quantos se avaliam por tentativa (amostra) e quantos dias sem clube até deixarem o futebol. */
  amostra_livres: 30,
  /** Plantel curto sem necessidade de posição: só livres a menos de x pontos do 11.º melhor (senão compra-se). */
  livre_curto_margem: 5,
  /** Necessidade de posição: livres até x pontos abaixo do 11.º melhor. */
  livre_falta_margem: 8,
  /** Preferência por um livre face a uma compra equivalente (pontos de OVR estimado). */
  livre_bonus: 1.5,
  /** Um livre não entra acima do 11.º melhor + x (os livres não são reforços de borla). */
  livre_acima: 1,
  livre_dias_maximo: 400,
  /** Poder de compra do clube (Prompt 6, fecho, decisão do utilizador): depende do clube (receita, dono, dívida), não da
   *  liga. Por receita prevista do clube (o primeiro escalão com receita ≥ x):
   *    janela: orçamento-base = janela × receita × (0,5 + ambição), mais as vendas da janela; tecto: nunca passa tecto × receita;
   *    negocio: um só negócio ≤ negocio × receita; estrelas por janela (com reputação ≥ estrela_rep, ou compradores de
   *    estrelas e magnatas com reputação ≥ estrela.reputacao_arquetipo); necessidades de qualidade a mais por janela. */
  poder_compra: [
    { receita: 600e6, janela: 0.3, tecto: 0.7, negocio: 0.3, estrelas: 2, estrela_rep: 80, necessidades: 1 },
    { receita: 250e6, janela: 0.22, tecto: 0.55, negocio: 0.4, estrelas: 1, estrela_rep: 80, necessidades: 1 },
    { receita: 80e6, janela: 0.15, tecto: 0.4, negocio: 0.4, estrelas: 0, estrela_rep: 999, necessidades: 0 },
    { receita: 0, janela: 0.12, tecto: 0.35, negocio: 0.4, estrelas: 0, estrela_rep: 999, necessidades: 0 },
  ],
  /** Dinheiro (substitui "só compra com caixa"): um negócio é pagável com a caixa acima da reserva (x meses de despesa),
   *  o que o dono ainda pode injectar este ano (pelo perfil) e a folga até ao tecto de dívida bancária; e não passa o
   *  limite tipo PSR: (salários + amortizações + o novo salário + o preço ÷ anos de contrato) ≤ custo_plantel_max × receita,
   *  com mais margem para donos estado e bilionários (capital próprio). A saúde financeira continua a travar: um clube
   *  apertado usa metade do orçamento; em crise ou administração não compra. */
  prudencia_saude: [1, 0.5, 0, 0],
  reserva_meses: 2,
  psr: { custo_plantel_max: 0.7, bonus_dono: { estado: 0.15, bilionario: 0.15, multiclube: 0.05 } as Record<string, number> },
  /** Clubes com reputação < 60: probabilidade de pedir um empréstimo em cada tentativa. */
  prob_emprestimo: 0.45,
  /** Oferta inicial = fracção do preço pedido. */
  oferta_inicial: [0.65, 0.85] as [number, number],
};

/**
 * Plano de plantel (Prompt 6, Bloco B): substitui os mínimos por grupo. Calculado uma vez por mês por clube a partir da
 * formação e do estilo do treinador. Cada lugar da formação pede titulares e profundidade; os jogadores entram nas
 * posições pela familiaridade (natural ou competente) e pelo nível no sistema (OVR na posição, ajustado pelos atributos
 * que o estilo do treinador valoriza nessa zona do campo).
 */
export const PLANO_PLANTEL = {
  /** Jogadores por posição: GR fixos; nos outros, titulares × factor (arredondado para cima). */
  profundidade_gr: 2, profundidade_campo: 1.67,
  /** Reforço: pede a posição NATURAL (um competente só com um titular em falta); natural com +x na escolha. */
  bonus_natural: 3,
  /** Nível no sistema = (1 − peso) × OVR na posição + peso × média dos atributos do estilo (×5, escala 0–100). */
  peso_estilo: 0.25,
  /** Nível alvo = (1 − peso) × média dos titulares do clube + peso × média dos titulares dos clubes da liga, + ambição. */
  peso_liga: 0.3, ambicao_pontos: 6,
  /** Qualidade: titular abaixo do alvo − x pontos. */
  margem_qualidade: 3,
  /** Sucessão: titular com x anos ou mais; contrato a acabar (≤ 1 ano) sem renovação prevista; descontente (≥ x). */
  idade_sucessao: 32, descontente: 70,
  /** Urgências por motivo (somadas à distância ao alvo). */
  urgencia: { profundidade: 1.0, titular_em_falta: 2.0, qualidade_por_ponto: 0.12, sucessao: 0.5, sucessao_velho: 0.3, sucessao_saida: 0.7 },
  /** Nível mínimo de um reforço face ao alvo, por motivo (pontos). */
  nivel_min: { qualidade: -1, profundidade: -8, sucessao: -4 } as Record<string, number>,
  /** …mas, na qualidade, nunca mais do que o titular actual + x (um reforço realista). */
  melhoria: 4,
  /** Necessidades de qualidade e sucessão aceites por janela: base + pedidos do treinador (reforços × autonomia), até ao
   *  máximo. As de profundidade (posição sem gente, p. ex. depois de vender 10) ficam fora do tecto: repor não é opcional. */
  necessidades_base: 2, necessidades_max: 4,
  /** Idades-alvo dos reforços por arquétipo (a sucessão procura sempre 18–26). */
  idade_alvo: { formador: [17, 24], vendedor: [17, 24], analitico: [20, 27], comprador_estrelas: [22, 31], magnata_impaciente: [22, 31], outro: [20, 30] } as Record<string, [number, number]>,
  /** Veteranos: ligas que compram jogadores mais velhos (idade máxima dos reforços) e clubes a lutar pelo título (nível
   *  dos titulares ≥ média da liga + x: até y anos). */
  ligas_veteranos: { KSA1: 31, UAE1: 31, USA1: 35, TUR1: 33, MEX1: 33, JPN1: 33 } as Record<string, number>,
  titulo_margem: 4, titulo_idade_max: 33,
  /** Estrelas: nos escalões de poder de compra com estrelas (Inglaterra; topo de Alemanha, Espanha e Itália), a
   *  necessidade de qualidade mais urgente passa a "estrela": nível mínimo = min(alvo + a, titular + b), candidatos até
   *  + c pontos, escolhidos pelo nível (não pelo custo), o orçamento da janela vai até ao tecto e o lance até × lance_maximo. */
  estrela: { reputacao_arquetipo: 75, acima_alvo: 6, acima_titular: 8, faixa: 12, lance_maximo: 1.3 },
  /** Desespero: titular em falta nas últimas x semanas da janela: o lance máximo vai até y × o pedido. */
  desespero: { semanas: 2, lance_maximo: 1.35 },
  /** Validade do plano com a janela aberta (dias); fora dela, um mês. */
  validade_janela_dias: 14,
  /** Tentativas de compra por semana: as x necessidades mais urgentes, mais todas as de profundidade (até y). */
  tentativas_semana: 2, tentativas_max: 5,
  /** Clube com o nível dos titulares x pontos abaixo da média da liga: +1 necessidade (luta pela permanência). */
  abaixo_da_liga: 3,
  /** Um jogador não encaixa no sistema (descontente do treinador): nível no sistema < OVR − x. */
  encaixe_margem: 6,
  /** Insubstituível: titular sem alternativa a menos de x pontos; só sai com oferta ≥ y × o valor (ou pela cláusula). */
  insubstituivel_margem: 5, insubstituivel_multiplo: 1.6,
  /** Jovens sem lugar no plano (≤ idade) dos clubes grandes: emprestam-se em vez de se venderem. */
  jovem_emprestar: 21,
  /** Excedentes à venda: o preço pedido desce durante a janela, de x (normal) até y nas últimas z semanas. */
  excedente_desconto: { normal: 0.85, final: 0.65, semanas_finais: 3 },
  /** Jovens a emprestar (e excedentes novos): cada semana da janela, com esta probabilidade, o clube oferece um a x clubes menores ao acaso. */
  colocar_prob: 1, colocar_amostra: 20,
  /** ... e os excedentes do plano até esta idade. */
  colocar_idade_excedente: 23,
  /** Excedentes até esta idade (29) também se emprestam (a um clube de reputação menor), antes de se pensar em rescindir. */
  excedente_emprestar_idade: 29,
  /** Último recurso, no fim da janela: os excedentes que não se venderam nem emprestaram. Acima de x jogadores, ou com
   *  y ou mais na mesma posição natural, o clube rescinde (nunca abaixo de 22), pagando z do salário que falta. */
  plantel_max: 30, repetidos_max: 6, rescisao_fraccao: 0.3,
  /** Acima de x jogadores (perto do limite de inscrição) rescinde qualquer arquétipo. */
  plantel_limite: 33,
  /** Disposição para rescindir, por arquétipo (probabilidade por excedente que ficou). Quem gasta muito corta sem
   *  pena; o tradicional, o formador e o vendedor preferem manter e vender mais tarde. */
  rescisao_arquetipo: { comprador_estrelas: 0.9, magnata_impaciente: 0.9, analitico: 0.5, tradicional: 0.25, formador: 0.2, vendedor: 0.15 } as Record<string, number>,
  /** Moral do treinador: −x por pedido não cumprido no fim da janela (0–100). */
  moral_pedido: 6,
  /** Atributos que cada estilo valoriza por zona do campo. */
  estilo: {
    tiki_taka: { MED: ['pas', 'tec', 'vis', 'ptq'], DEF: ['pas', 'cmp'], LAT: ['pas', 'tec'] },
    gegenpressen: { MED: ['res', 'ctr', 'agr'], EXT: ['res', 'ace', 'ctr'], PL: ['res', 'ctr'] },
    contra_ataque: { EXT: ['vel', 'ace', 'dri'], PL: ['vel', 'fin'] },
    catenaccio: { DEF: ['mar', 'des', 'pos', 'cab'], MED: ['des', 'pos'] },
    jogo_direto: { PL: ['cab', 'for', 'imp'], MED: ['plo', 'for'] },
    pelas_alas: { LAT: ['cru', 'vel', 'res'], EXT: ['cru', 'vel', 'dri'], PL: ['cab'] },
    futebol_total: { MED: ['tec', 'pas', 'msb'], DEF: ['pas', 'tec'], LAT: ['tec', 'msb'] },
    bloco_medio_baixo: { DEF: ['pos', 'mar', 'cab'], MED: ['pos', 'des', 'teq'] },
  } as Record<string, Partial<Record<'GR' | 'DEF' | 'LAT' | 'MED' | 'EXT' | 'PL', string[]>>>,
};

/** Titulares dos gigantes ficam (Prompt 6, fecho, pedido do utilizador). Depende da reputação do clube e da importância do
 *  jogador no plano de plantel (titular):
 *   (a) o clube (IA) só vende um titular por ≥ multiplo × o valor, a subir de 1 (reputação reputacao_min) até
 *       multiplo_max (reputação reputacao_max); em crise (saúde ≥ crise_saude) vende como os outros;
 *   (b) o jogador recusa descer de reputação: um titular de um clube com reputação ≥ reputacao_min perde
 *       peso × (diferença ÷ 10) × (importância do clube) na decisão quando o comprador tem ≥ diferenca pontos a menos;
 *       não conta com salário ≥ salario_enorme × o actual, idade ≥ idade_fim ou descontentamento ≥ descontente. */
export const GIGANTES = {
  reputacao_min: 80, reputacao_max: 95, multiplo_max: 2.2, crise_saude: 2,
  descida: { diferenca: 10, peso: 1.5, salario_enorme: 2, idade_fim: 32, descontente: 50 },
};
