// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secções 2 e 10): tempo, campo e física dos jogadores.

export const CAMPO_2D = { comprimento: 105, largura: 68 };

/** O motor corre sempre em tempo de jogo real: um tick = 0,1 s de jogo. */
export const TICK_S = 0.1;

export const FISICA = {
  /** Sprint: 6,0 + 0,15 × Velocidade (m/s); aceleração 2,5 + 0,18 × Aceleração (m/s²); desaceleração 1,5 × aceleração. */
  vel_base: 6.0, vel_por_ponto: 0.15, acel_base: 2.5, acel_por_ponto: 0.18, desacel_factor: 1.5,
  /** Velocidades por intensidade (m/s; o sprint é o máximo do jogador). */
  andar: 1.8, trote: 3.8, corrida: 5.5,
  /** Distância à âncora (m) a partir da qual se trota e se corre; em RECUPERAR corre-se a fundo. */
  dist_trote: 3, dist_corrida: 9,
  /** Seguimento da âncora: velocidade desejada = velocidade da âncora + erro ÷ tau (s); zona morta (m). */
  seguir_tau_s: 1.1, zona_morta_m: 0.3,
  /** Viragem (rad/s): (base + Agilidade e Equilíbrio) ÷ (1 + velocidade ÷ v_ref). Parado roda quase no sítio. */
  viragem_base: 3.0, viragem_agi: 0.12, viragem_equ: 0.06, viragem_v_ref: 2.5,
  /** Separação entre colegas (m) e força. */
  separacao_m: 3, separacao_forca: 1.6,
  /** Corpo: roda (rad/s) e a partir desta velocidade olha para onde corre; abaixo, para a bola. */
  corpo_rad_s: 5, corpo_correr_ms: 3.5,
  /** De costas para onde olha anda-se mais devagar (fracção da velocidade máxima). */
  costas: 0.55, lado: 0.8,
};

/** Velocidades de apresentação na Fase 1 (compressão constante; a variável da secção 2.2 é da Fase 5).
 *  1× = 6× o tempo real (90 min em 15 min). */
export const VELOCIDADES_FASE1: [string, number][] = [['Tempo real', 1], ['0,5×', 3], ['1×', 6], ['2×', 12]];
