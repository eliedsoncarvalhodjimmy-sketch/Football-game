// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secções 2 e 10): tempo, campo e física dos jogadores.

export const CAMPO_2D = { comprimento: 105, largura: 68 };

/** O motor corre sempre em tempo de jogo real: um tick = 0,1 s de jogo. */
export const TICK_S = 0.1;

export const FISICA = {
  /** Sprint: 6,0 + 0,15 × Velocidade (m/s); aceleração 2,5 + 0,18 × Aceleração (m/s²); desaceleração 1,5 × aceleração. */
  vel_base: 6.0, vel_por_ponto: 0.15, acel_base: 2.5, acel_por_ponto: 0.18, desacel_factor: 1.5,
  /** Velocidades por intensidade (m/s; o sprint é o máximo do jogador). */
  andar: 1.3, trote: 3.2, corrida: 5.0,
  /** Distância à âncora (m) a partir da qual se trota e se corre; em RECUPERAR corre-se a fundo. */
  dist_trote: 6, dist_corrida: 15,
  /** Seguimento da âncora: velocidade desejada = velocidade da âncora + erro ÷ tau (s); zona morta (m). */
  seguir_tau_s: 1.5, zona_morta_m: 0.3,
  /** A manter a posição (sem tarefa com a bola), a zona morta é maior: não se corrige cada metro que a âncora mexe. */
  zona_morta_posicao_m: 1.5,
  /** A seguir um alvo em movimento sem intenção de sprint, não passa desta velocidade (m/s). */
  seguir_max: 5,
  /** Viragem (rad/s): (base + Agilidade e Equilíbrio) ÷ (1 + velocidade ÷ v_ref). Parado roda quase no sítio. */
  viragem_base: 3.0, viragem_agi: 0.12, viragem_equ: 0.06, viragem_v_ref: 2.5,
  /** Separação entre colegas (m) e força. */
  separacao_m: 3, separacao_forca: 2.5,
  /** Quem defende não fica em cima de um adversário: põe-se a esta distância dele, do lado da própria baliza (m). */
  separacao_adv_m: 1.5,
  /** Corpo: roda (rad/s) e a partir desta velocidade olha para onde corre; abaixo, para a bola. */
  corpo_rad_s: 5, corpo_correr_ms: 3.5,
  /** Abaixo desta velocidade (m/s) os passos são curtos: a velocidade muda como vector (para inverter, pára primeiro). */
  devagar_ms: 1.5,
  /** Suavização da intenção de movimento (s). */
  intencao_s: 0.25,
  /** De costas para onde olha anda-se mais devagar (fracção da velocidade máxima). */
  costas: 0.55, lado: 0.8,
};

/** Velocidades de apresentação (secção 2.2, modelo FM): 1× = tempo real dentro dos lances; 2× e 4× aceleram; 0,5× para
 *  ver em detalhe. O avanço rápido (⏩) é o que se usa entre lances, independente da velocidade escolhida. */
export const VELOCIDADES_FASE1: [string, number][] = [['0,5×', 0.5], ['1×', 1], ['2×', 2], ['4×', 4], ['⏩ 12×', 12]];

/** Cansaço (secção 10.2). A condição física (1 = fresco) desce com cada metro e mais com cada metro em sprint; a
 *  Resistência dá o ritmo: factor = res_base − res_ponto × Resistência (20 → 0,5; 10 → 1; 1 → 1,45). Parado ou a andar
 *  recupera um pouco; ao intervalo recupera `intervalo`. Abaixo de `limiar` a velocidade máxima e a aceleração descem até
 *  `queda_max` (atingida `queda_intervalo` abaixo do limiar) e a reacção piora até `reaccao_extra_s`. */
export const CANSACO = {
  por_km: 0.032, sprint_por_km: 0.12, sprint_ms: 7, res_base: 1.5, res_ponto: 0.05,
  recupera_s: 0.00003, recupera_v: 1.5, intervalo: 0.06,
  limiar: 0.8, queda_max: 0.1, queda_intervalo: 0.4, reaccao_extra_s: 0.1,
  /** Abaixo disto o jogador poupa-se: só sprinta para a bola ou quando ficou fora de posição. */
  poupar: 0.6,
};

