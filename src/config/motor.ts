// Motor de jogo (Fase 2, Bloco B): parâmetros do modo rápido e do modo detalhado.

export const MOTOR = {
  /** 'onze': força a partir dos ratings do onze (Fase 2). 'reputacao': cálculo da Fase 1 (para comparar). */
  modo_forca: 'onze' as 'onze' | 'reputacao',
};

export const RAPIDO = {
  /** Conversão de remates em golos (para o número de remates). */
  conversao: 0.11,
  autogolos: 0.03,
  golos_com_assistencia: 0.78,
  amarelos_por_equipa: 1.85,
  vermelhos_por_equipa: 0.06,
  substituicoes_media: 3,
  substituicoes_max: 5,
  minuto_sub: [58, 82] as [number, number],
  penalti_base: 0.76,
};

/**
 * Modo detalhado (só no jogo do utilizador): posses e duelos encadeados.
 *   P(duelo) = 0,5 + K × diferença, diferença limitada a ±10 (19 contra 11 → ~70%).
 *   Cada remate é golo com probabilidade igual ao seu xG (sem Poisson por cima).
 */
export const DETALHADO = {
  K: 0.025,
  diferenca_max: 10,
  /** Posses por jogo (as duas equipas) e divisão da posse: 0,5 + k_posse × (construção − pressão adversária). */
  posses_por_jogo: 150,
  k_posse: 0.02,
  /** Fracção das posses que chegam a ataque (antes dos duelos). */
  inicio_ataque: 0.79,
  /** Base de cada duelo (sem diferença): a progressão e a criação passam com esta probabilidade. */
  base_progressao: 0.62,
  base_criacao: 0.5,
  base_penetracao: 0.6,
  /** Empatados a partir deste minuto, as duas equipas atacam menos (fracção). */
  cautela_empate: { minuto: 58, reducao: 0.2 },
  /** A partir de 4 golos no jogo, as duas equipas atacam menos (por golo a mais). */
  amortecimento_golos: 0.22,
  /** Ritmo do jogo partilhado pelas duas equipas (lognormal, média 1): jogos mais abertos ou mais fechados. */
  ritmo_jogo_desvio: 0.36,
  /** Estado do jogo: por golo de vantagem, a equipa que ganha ataca menos; a que perde ataca mais. */
  estado_jogo: { lider: 0.32, perdedor: 0.02 },
  /** Vantagem da equipa da casa na divisão da posse. */
  posse_casa: 0.02,
  /** Termo de equipa somado à diferença de cada duelo de ataque: peso × (força de ataque − força de defesa adversária) / 10,
   *  com as forças dos ratings do onze (as mesmas do modo rápido). Alinha a sensibilidade dos dois modos. */
  peso_forca_equipa: 0.6,
  /** Tipos de ocasião depois de uma criação bem-sucedida (probabilidades) e xG (intervalo). */
  ocasioes: {
    grande: { p: 0.18, xg: [0.35, 0.45] as [number, number] },
    normal: { p: 0.57, xg: [0.065, 0.125] as [number, number] },
    longe: { p: 0.25, xg: [0.03, 0.05] as [number, number] },
  },
  /** Remates de longe quando a progressão falha mas a equipa ainda remata. */
  remate_apos_falha: 0.08,
  penalti_xg: 0.76,
  /** Faltas por duelo defensivo ganho; fracção na área (penálti); cartões. */
  falta_por_duelo: 0.12,
  falta_na_area: 0.035,
  amarelo_por_falta: 0.16,
  /** Bolas paradas: livres perigosos e cantos por ataque falhado. */
  canto_por_ataque_falhado: 0.18,
  xg_canto: [0.03, 0.08] as [number, number],
  /** O duelo finalizador contra o GR ajusta o xG no máximo ±30%. */
  ajuste_gr_max: 0.3,
  /** Vantagem da equipa da casa nos duelos (pontos de atributo). */
  casa_pontos: 1.0,
};
