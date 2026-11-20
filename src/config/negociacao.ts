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

/** Janelas próprias das ligas de calendário anual (as folhas trazem as europeias). */
export const JANELAS_ANO_CIVIL = [{ abre: '01-15', fecha: '03-31' }, { abre: '07-01', fecha: '08-15' }];

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
  /** Orçamento da janela: fracção da receita × (0,5 + ambição), mais as vendas, até ao tecto (fracção da receita). */
  orcamento_receita: 0.12,
  /** Clubes com reputação < 60: probabilidade de pedir um empréstimo em cada tentativa. */
  prob_emprestimo: 0.45,
  orcamento_tecto: 0.35,
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
  /** Necessidades aceites por janela: base + pedidos do treinador (reforços × autonomia), até ao máximo. */
  necessidades_base: 2, necessidades_max: 4,
  /** Clube com o nível dos titulares x pontos abaixo da média da liga: +1 necessidade (luta pela permanência). */
  abaixo_da_liga: 3,
  /** Um jogador não encaixa no sistema (descontente do treinador): nível no sistema < OVR − x. */
  encaixe_margem: 6,
  /** Insubstituível: titular sem alternativa a menos de x pontos; só sai com oferta ≥ y × o valor (ou pela cláusula). */
  insubstituivel_margem: 5, insubstituivel_multiplo: 1.6,
  /** Jovens sem lugar no plano (≤ idade) dos clubes grandes: emprestam-se em vez de se venderem. */
  jovem_emprestar: 21,
  /** Fim da janela: acima de x jogadores, ou com y ou mais na mesma posição natural, o clube rescinde os piores
   *  excedentes do plano (nunca abaixo de 22), pagando z do salário que falta até ao fim do contrato. */
  plantel_max: 30, repetidos_max: 6, rescisao_fraccao: 0.3,
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
