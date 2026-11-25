// Prémios individuais anuais (pedido do utilizador): Melhor do Mundo (Bola de Ouro), Melhor guarda-redes, Golden Boy (melhor sub-21).
// Período de avaliação (Prompt 8, decisão do utilizador): 1 de Agosto a 28 de Julho, para todas as ligas; finalistas a
// 29 de Julho (depois do fim do período); cerimónia a 30 de Julho. O prémio tem o nome do ano da cerimónia
// (Bola de Ouro 2028: 01/08/2027 a 28/07/2028).

export const CALENDARIO_PREMIOS = {
  /** Período de avaliação (mês 1–12, dia). */
  inicio: { mes: 8, dia: 1 },
  fim: { mes: 7, dia: 28 },
  anuncio_finalistas: { mes: 7, dia: 29 },
  cerimonia: { mes: 7, dia: 30 },
  /** Ordem da cerimónia; cada etapa tem botão de saltar. */
  ordem: ['golden_boy', 'guarda_redes', 'melhor_do_mundo'] as const,
};

export const FINALISTAS = { melhor_do_mundo: 30, golden_boy: 30, guarda_redes: 5 };

/** Golden Boy: até aos 21 anos no início do período de avaliação (1 de Agosto). */
export const GOLDEN_BOY = { idade_maxima: 21 };

/** Mínimos para entrar na votação (em jogos oficiais do período). */
export const ELEGIBILIDADE = { jogos_minimos: 25, jogos_minimos_gr: 25, jogos_minimos_golden_boy: 18 };

/** Pontuação de cada candidato (soma), antes do ruído da "votação". */
export const PONTUACAO = {
  /** Nota média dos jogos (escala do motor) × peso. */
  nota_media: 22,
  /** Por golo e por assistência, conforme o grupo de posições. */
  golo: { AVA: 1.0, MED: 1.3, DEF: 1.8, GR: 3 } as Record<string, number>,
  assistencia: { AVA: 0.8, MED: 1.0, DEF: 1.2, GR: 3 } as Record<string, number>,
  /** Guarda-redes: por jogo sem sofrer e por defesa decisiva. */
  jogo_sem_sofrer: 1.6,
  defesa_decisiva: 0.4,
  /** Títulos colectivos do período (o clube ou a selecção), × participação (minutos jogados na competição / possíveis). */
  titulos: { liga: 18, taca: 6, supertaca: 2, continental_1: 30, continental_2: 14, continental_3: 8, mundial: 40, continental_seleccoes: 28 } as Record<string, number>,
  /** Prémio de "nome": reputação 0–100 × peso (os votantes conhecem melhor as estrelas). */
  reputacao: 0.25,
  /** Força do campeonato onde joga (0–100) × peso. */
  forca_liga: 0.15,
  /** Ruído da votação (desvio padrão, em pontos). */
  ruido: 4,
};

/** Na cerimónia, do 30.º ao 4.º lugar com intervalo curto; o top 3 com suspense. */
export const CERIMONIA = { intervalo_ms: 450, suspense_ms: 1800 };

/** Janela dos prémios (Prompt 8, Bloco A): categorias de competição (índice nos contadores por categoria) e a sua
 *  correspondência com os pesos dos títulos (PONTUACAO.titulos). */
export const CATEGORIAS = ['liga', 'taca', 'supertaca', 'continental_1', 'continental_2', 'continental_3', 'outra'] as const;
export type Categoria = (typeof CATEGORIAS)[number];
/** Competições continentais por categoria (1 = a principal de cada confederação). */
export const CATEGORIA_CONTINENTAL: Record<string, Categoria> = { UCL: 'continental_1', CLI: 'continental_1', ACLE: 'continental_1', UEL: 'continental_2', UECL: 'continental_3' };

/** Estatísticas que o modo rápido não gera jogada a jogada (também no 2D, que não as regista):
 *  remates à baliza sofridos ≈ golos + Poisson(max(0, x × xG do adversário − golos)); defesas = remates à baliza − golos;
 *  um golo sofrido é "erro" com probabilidade p (atribuído a um defesa ou ao GR, pela compostura). Jogo sem sofrer: GR
 *  com ≥ min minutos e 0 golos. Jogo grande: eliminatória ou final, ou jogo de liga entre dois dos `top` maiores da liga. */
export const ESTATISTICAS_JANELA = { remates_baliza_por_xg: 3.2, prob_erro_por_golo: 0.06, sem_sofrer_minutos: 60, top: 5,
  /** Desempate por penáltis: fracção dos penáltis falhados que conta como defesa do GR. */
  penaltis_defendidos_fraccao: 0.7 };
