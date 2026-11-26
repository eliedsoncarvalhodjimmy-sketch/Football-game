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
  /** Peso do colectivo no total (decisão do utilizador na PARAGEM B: metade do que era, para o campeão não encher o top 10). */
  peso: { melhor_do_mundo: 0.5, guarda_redes: 0.25, golden_boy: 0.25 } as Record<string, number>,
};

/** Visibilidade das ligas (nota do utilizador): as Big 5 pesam sempre muito. Fora delas, o total × factor do prémio,
 *  mais um bónus pela campanha continental do jogador (pontos continentais brutos × por_ponto, até ao tecto). Um caso
 *  fora da curva na POR1/NED1/TUR1 com boa campanha europeia pode entrar no top 30 da Bola de Ouro, mas não no top 20. */
export const VISIBILIDADE_LIGA = {
  big5: ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1'],
  fora_big5: { melhor_do_mundo: 0.68, guarda_redes: 0.8, golden_boy: 0.85 } as Record<string, number>,
  continental: { por_ponto: 0.004, tecto: 0.08 },
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

/** Prompt 8, Bloco C: efeito do selo na carreira e na economia (nunca nos atributos, na moral nem no rendimento).
 *  Cada selo (prémio, ano, lugar) vale pontos de prestígio que decaem com meia-vida de 2 anos (a partir da cerimónia) e
 *  deixam de contar ao fim de `duracao_anos`. O prestígio do jogador é a soma, até 100. */
export const PRESTIGIO = {
  meia_vida_anos: 2,
  duracao_anos: 3,
  /** Pontos de prestígio por selo (no dia da cerimónia). */
  pontos: {
    melhor_do_mundo: { vencedor: 100, top3: 55, finalista: 20 },
    golden_boy: { vencedor: 50, top3: 20, finalista: 8 },
    guarda_redes: { vencedor: 45, top3: 20, finalista: 10 },
  } as Record<string, { vencedor: number; top3: number; finalista: number }>,
  /** Factor de marca no preço pedido (não no valor de mercado), por selo, a decair como o prestígio; tecto total. */
  preco: {
    melhor_do_mundo: { vencedor: 0.125, top3: 0.05, finalista: 0.02 },
    golden_boy: { vencedor: 0.08, top3: 0.02, finalista: 0 },
    guarda_redes: { vencedor: 0.05, top3: 0.015, finalista: 0 },
  } as Record<string, { vencedor: number; top3: number; finalista: number }>,
  preco_tecto: 0.25,
  /** Pedido salarial: + maximo × prestígio / 100 (5 a 10% para os vencedores). */
  salario_maximo: 0.1,
  /** Exigência de projecto: a parcela de prestígio do clube na decisão × (1 + x × prestígio / 100). */
  exigencia_projecto: 0.5,
  /** Cláusulas de rescisão: + x × prestígio / 100 na probabilidade de a pôr no contrato; o múltiplo × (1 + marca). */
  clausula_prob: 0.3,
  /** Visibilidade: vencedores e top 3 conhecidos de todos os clubes (conhecimento mínimo) enquanto o selo dura. */
  conhecimento_minimo: 70,
  visibilidade_anos: 2,
  /** Receitas comerciais do clube: + por_ponto × soma do prestígio dos seus jogadores, até ao tecto (fracção do patrocínio). */
  comercial: { por_ponto: 0.0003, tecto: 0.05 },
  /** Legado (funil de treinadores e staff): reputação de entrada de um ex-craque. */
  legado: { base: 40, melhor_do_mundo: 15, golden_boy: 6, guarda_redes: 8, top3: 3, tecto: 95 },
};
