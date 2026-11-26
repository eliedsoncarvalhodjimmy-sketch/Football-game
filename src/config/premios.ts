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

/** Elegibilidade (Prompt 8, Bloco B): mínimo de MINUTOS na janela (substitui os mínimos de jogos), para não prejudicar
 *  quem joga menos de 90 minutos por jogo. */
export const ELEGIBILIDADE = { minutos_minimos: 2000, minutos_minimos_gr: 2000, minutos_minimos_golden_boy: 1200 };

/** Pesos dos títulos colectivos (repartidos pelos minutos de cada jogador nessa competição com o clube vencedor). */
export const PONTUACAO = {
  titulos: { liga: 18, taca: 6, supertaca: 2, continental_1: 30, continental_2: 14, continental_3: 8, mundial: 40, continental_seleccoes: 28 } as Record<string, number>,
};

/** Componente "desempenho": por 90 minutos e por grupo de posições, comparado com a média do grupo na liga (z), ajustado
 *  pela força da liga e dos adversários; os jogos grandes pesam mais (com tecto). Pontos = base + escala × z. */
export const DESEMPENHO = {
  /** Pesos das métricas (z por 90 minutos) por grupo. */
  pesos: { AVA: { nota: 0.4, golos: 0.45, assist: 0.15 }, MED: { nota: 0.5, golos: 0.2, assist: 0.3 }, DEF: { nota: 0.8, golos: 0.1, assist: 0.1 }, GR: { nota: 1, golos: 0, assist: 0 } } as Record<string, { nota: number; golos: number; assist: number }>,
  /** Força da liga: + x × (força desportiva − ref) / 20 (em unidades de z): a ENG1 vale mais do que a EUR1 com a mesma nota. */
  liga_por_20: 0.6, liga_ref: 50,
  /** Força dos adversários: + x × (reputação média dos adversários − a da liga) / 10. */
  adversario_por_10: 0.25,
  /** Jogos grandes: + x × (nota média nos grandes − nota média) por jogo grande, até ao tecto de jogos. */
  grandes_por_jogo: 0.08, grandes_tecto: 12,
  base: 50, escala: 15,
};

/** Resultados colectivos: títulos (PONTUACAO.titulos, repartidos pelos minutos) e fase atingida nas competições
 *  continentais (pontos por fase × peso da competição × participação). A selecção fica a 0 até haver torneios. */
export const COLECTIVO = {
  fase: { liga: 0, playoff: 1, oitavos: 4, quartos: 7, meias: 11, final: 16, vencedor: 16 } as Record<string, number>,
  peso_competicao: { continental_1: 1, continental_2: 0.45, continental_3: 0.25 } as Record<string, number>,
  selecao: 0,
};

/** Classe e fair play: − por amarelo e por vermelho na janela, até ao tecto. */
export const CLASSE = { amarelo: 0.3, vermelho: 2, tecto: 8 };

/** Visibilidade ("fama", mais baixa do que no Prompt 4): pontos = x × fama (0–100, pelo OVR). Golden Boy: nenhuma. */
export const FAMA = { peso: 0.08 };

/** Aura dos vencedores recentes: + fracção da pontuação, a decair em 2 anos (no máximo 5%). */
export const AURA = { ano_1: 0.05, ano_2: 0.025 };

/** Viés de posição (decisão do utilizador: ligado, moderado): factor por grupo no desempenho da Bola de Ouro. */
export const VIES_POSICAO = { ligado: true, factor: { AVA: 1, MED: 0.9, DEF: 0.75, GR: 0.55 } as Record<string, number> };

/** Melhor guarda-redes: golos evitados (xG − golos) por 90, defesas por 90, penáltis defendidos, jogos sem sofrer
 *  acima do esperado pela defesa da equipa (xG sofrido por jogo), erros e nota nos jogos grandes. Pontos = base + escala × z. */
export const GUARDA_REDES = { evitados_por_90: 1, defesas_por_90: 0.25, penalti: 0.4, sem_sofrer_acima: 0.5, erro: 0.6, grandes: 0.3, base: 50, escala: 15 };

/** Júri simulado: N jurados distribuídos pelos países das ligas (peso pela força desportiva da liga), cada um ordena os
 *  seus melhores com os pontos por posição; vieses pequenos e limitados (nacionalidade, liga, narrativa) e um ruído
 *  pessoal. Determinístico (semente do ano). Os candidatos são os `candidatos` melhores pela pontuação. */
export const JURI = {
  jurados: 100,
  pontos: [15, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1],
  candidatos: 50,
  ruido: 0.03,
  vies: { nacionalidade: 0.04, liga: 0.03, narrativa: 0.02 },
  /** Unanimidade: o vencedor é o 1.º de pelo menos x dos boletins. */
  unanimidade: 0.8,
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
