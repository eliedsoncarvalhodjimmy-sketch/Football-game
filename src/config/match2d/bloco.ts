// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secções 3 e 4): fases e bloco da equipa.

export const BLOCO = {
  /** Recalcula o alvo do bloco a 5 Hz (s). */
  periodo_s: 0.2,
  /** Filtro suave do bloco (constante de tempo, s): o bloco desloca-se com atraso, não instantaneamente. */
  filtro_s: 0.8,
  /** Quanto a linha defensiva acompanha a bola (m de linha por m de bola, a partir do meio-campo), sem e com bola. */
  seguir_bola_sem: 0.35, seguir_bola_com: 0.3,
  /** A linha nunca a menos de 7 m da própria baliza (o documento pede ≥ 6; 7 deixa o GR 3 m atrás); máximo acima do
   *  valor do estilo. */
  linha_min: 7, linha_folga_max: 14,
  /** Sem bola, a linha de médios fica do lado da própria baliza, pelo menos x m atrás da bola: a defesa e os médios
   *  defendem entre a bola e a baliza; só os avançados podem estar à frente dela. */
  medios_atras_bola_m: 2,
  /** A linha fica sempre atrás da bola (m), a defender e a atacar (equilíbrio). */
  atras_bola_sem: 4, atras_bola_com: 8,
  /** Comprimento com bola: o natural da forma (× 105), limitado à faixa real. */
  comprimento_com: [40, 55] as [number, number],
  /** Deslize lateral com bola (o da defesa vem do estilo): com bola a equipa abre o campo e desliza pouco. */
  deslize_com: 0.3,
  /** Margem lateral do bloco ao campo (m). */
  margem_y: 1.5,
  /** Com bola, ninguém tem a âncora para lá da linha do fora de jogo (penúltimo adversário, ou a bola): fica x m antes. */
  fora_jogo_margem: 1,
  /** Comprimento mínimo do bloco com bola quando encosta à linha do fora de jogo (m). */
  comprimento_min: 22,
  /** Guarda-redes: distância à linha de golo (m) conforme a linha defensiva; o líbero sai mais. */
  gr_min: 4, gr_max: 15, gr_por_linha: 0.2, gr_libero_extra: 4, gr_desvio_y: 0.25,
  /** O GR fica pelo menos x m atrás da linha defensiva (não se cola aos centrais). */
  gr_atras_linha: 3,
};

export const FASES = {
  /** Posse estabilizada: 2 passes seguidos ou 3 s de condução sem pressão (secção 3). */
  estabilizada_passes: 2, estabilizada_s: 3,
  /** Fronteiras (m no referencial da equipa): construção até ao meio-campo; finalização a partir da entrada da zona de
   *  finalização (último terço central) ou dentro da área. */
  criacao_desde: 52.5, finalizacao_desde: 70, finalizacao_corredor: 20,
  /** Transição termina mais cedo se o bloco já estiver formado: todos a menos de x m da âncora. */
  bloco_formado_m: 6,
};
