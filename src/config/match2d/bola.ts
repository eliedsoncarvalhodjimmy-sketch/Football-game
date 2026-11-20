// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secções 7.3, 7.4 e 10.3): bola, passes e recepção.

export const BOLA = {
  /** Rasteira: perde ~10% da velocidade por segundo (dv/dt = −k·v) mais uma resistência de rolamento constante (m/s²),
   *  para parar de vez. Com isto, um passe de 20 m demora cerca de 1,3 s. */
  atrito_k: 0.105, rolamento_c: 0.4,
  /** Passe rasteiro: velocidade inicial 10–25 m/s, escolhida para o tempo de viagem t(d) = a + b × d (s). */
  passe_vmin: 10, passe_vmax: 25, tempo_a: 0.4, tempo_b: 0.045,
  /** A bola só pode ser jogada com o pé abaixo de 1 m e com a cabeça abaixo de 2,5 m; alcance do controlo (m). */
  z_pe: 1, z_cabeca: 2.5, alcance: 1.0,
  /** Quem acabou de tocar na bola não a volta a jogar durante x s (não "recebe" o próprio passe). */
  sem_retoque_s: 0.3,
  /** Bola conduzida/parada aos pés: distância à frente do corpo (m) e velocidade a que desliza para lá (m/s). */
  pe_m: 0.6, pe_desliza_ms: 8,
  /** No ar (secção 10.3): gravidade (m/s²), arrasto do ar (fracção por segundo), ressalto (fracção da velocidade
   *  vertical e da horizontal que fica) e velocidade vertical mínima para ainda ressaltar (m/s). */
  g: 9.81, ar_k: 0.12, ressalto_vz: 0.45, ressalto_h: 0.6, ressalto_min_vz: 2,
  /** Previsão da trajectória: horizonte (s) e passo (s). */
  previsao_s: 4, previsao_passo_s: 0.1,
};

export const RECEPCAO = {
  /** Tempo de reacção (s) = base − por ponto de Antecipação; quem corre para a bola parte ao fim deste tempo. */
  reaccao_base: 0.35, reaccao_ant: 0.01,
  /** Na linha da bola (a menos de x m) o adversário corta com o corpo, sem precisar de reagir. */
  corpo_m: 0.45,
  /** Para chegar a um ponto conta-se o arranque: a velocidade média é esta fracção da velocidade máxima. */
  vel_media_factor: 0.85,
  /**
   * Primeiro toque (secção 7.3): qualidade = (0,6 × Primeiro toque + 0,4 × Técnica) ÷ 20 − (velocidade da bola − 10) ÷ 40.
   * Se um sorteio com semente passar a qualidade + folga, o toque é mau: a bola afasta-se 1–3 m e fica solta.
   */
  toque_folga: 0.45, mau_toque_v: [3, 6] as [number, number],
  /** Cada adversário a menos de 1,5 m ao receber tira x à qualidade do primeiro toque. */
  encostado: 0.12,
};

export const PASSE = {
  /** Passe curto (secção 7.1): até 20 m; se não houver nenhum, aceita até 28 m (Fase 2: só há passes curtos). */
  curto_max: 20, curto_max_recurso: 28, min: 4,
  /** Avalia só os 6 colegas mais promissores (secção 14). */
  candidatos: 6,
  /** Erro de execução (secção 7.4): desvio do ângulo (rad) = (base + por ponto abaixo de 20 de Passe/Técnica) × (1 +
   *  distância ÷ 40) × (1 + pressão); a velocidade erra ± x%. Pé fraco: Fase 3. */
  erro_ang_base: 0.015, erro_ang_ponto: 0.0045, erro_vel: 0.06, pressao_m: 3, pressao_factor: 0.8,
  /** Previsão do portador (secção 7.4): sucesso = logística da folga (tempo do defensor − tempo da bola) ÷ escala; o
   *  portador erra a leitura conforme a Visão (ruído na folga, s). */
  folga_escala_s: 0.25, leitura_ruido_s: 0.25,
  /** Peso do ganho de ameaça (mapa V) e da distância ideal (m) na escolha do passe. */
  peso_valor: 2.5, distancia_ideal: [8, 18] as [number, number], peso_gr: -0.15,
};

/** Tempo de decisão do portador (secção 7.3): tempoBaseEstilo × (1,3 − 0,02 × Decisões) × pressão. */
export const DECISAO_PORTADOR = { pressao_m: 3, pressao_factor: 0.6, ruido_base: 0.25 };

/**
 * Mapa de ameaça V(x, y) (secção 7.2), no referencial da equipa:
 *   V = 0,005 + 0,30 × (x/105)³ × (1 − 0,8 × |y − 34| / 34), +0,15 na área, +0,25 na pequena área.
 */
export const AMEACA = { base: 0.005, escala: 0.3, expoente: 3, largura: 0.8, area: 0.06, pequena_area: 0.1, fundo_m: 6, fundo_queda: 0.6 };

/** OFERECER_APOIO (secção 6.1 e 6.3). */
export const APOIO = {
  /** Distância ao portador (m) e número de apoiantes. */
  raio: [8, 18] as [number, number], max_apoiantes: 3, so_ate_m: 30,
  /** Pontos candidatos: anéis e ângulos à volta do portador. */
  aneis: [10, 14, 18], angulos: 16,
  /** Penalização se um colega já estiver a menos de 10 m do mesmo ponto (secção 6.2). */
  colega_m: 10,
  /** Um ponto a menos de x m de um colega já está ocupado. */
  ocupado_m: 4,
  /** Em ângulo: dois apoiantes na mesma linha que o portador (diferença de ângulo abaixo de x rad) penalizam. */
  mesma_linha_rad: 0.4, mesma_linha_pen: 1.2,
  /** Desvio máximo à âncora por papel (secção 6.3); liberdade posicional alta acrescenta até +50%. */
  desvio: { central: 12, lateral: 15, medio: 15, extremo: 20, avancado: 18 } as Record<string, number>,
  /** Linha de passe "livre": nenhum adversário a menos de x m do segmento. */
  linha_livre_m: 2.5,
};

/** Compromisso das acções sem bola (secção 6.3). */
export const COMPROMISSO_2D = { periodo_min_s: 0.33, periodo_max_s: 0.66, acao_min_s: 1.0, trocar_factor: 1.25, alvo_m: 2 };

/** Bola fora (Fase 2: reposição simplificada; as bolas paradas completas são da Fase 5). */
export const REPOSICAO = { espera_min_s: 2, chegada_m: 1, grande_area_x: 6 };
