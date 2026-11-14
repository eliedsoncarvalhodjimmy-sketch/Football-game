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
  /** Composição-modelo do plantel por grupo (mínimos) e tamanho alvo. */
  minimos: { GR: 3, DEF: 8, MED: 8, AVA: 6 } as Record<string, number>,
  tamanho_alvo: 25,
  /** Abordagens por clube por semana de janela (probabilidade). */
  prob_abordagem: 0.7,
  /** Reforço: OVR do candidato ≥ pior titular da posição + x. */
  melhoria_minima: 2,
  /** Candidatos avaliados por necessidade (listas curtas por posição). */
  candidatos: 40,
  /** Venda: listar excedentes (posição acima do mínimo + x) e descontentes. */
  excedente: 1,
  /** Renovações: oferece renovação no último ano aos N melhores do plantel e a jovens de potencial. */
  renovar_melhores: 21,
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
