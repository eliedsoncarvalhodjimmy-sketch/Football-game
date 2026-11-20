// Motor 2D táctico, Fase 3 (docs/tactics/MOTOR_2D.md, secções 6, 7, 9 e 10.3): decisão completa do portador, acções sem
// bola com pesos de papel × estilo × fase, defesa (pressão, desarmes, faltas, linha, fora de jogo), bola no ar, remates e
// guarda-redes. Valores de partida, para afinar.
import type { IdEstilo } from '../estilos.ts';
import type { AccaoSemBola, Fase } from '../../engine/match2d/tipos.ts';

/** Opções do portador (secção 7.1). */
export type OpcaoPortador = 'PASSE_CURTO' | 'PASSE_PROGRESSIVO' | 'PASSE_LONGO' | 'MUDANCA_FLANCO' | 'CRUZAMENTO' | 'CONDUZIR' | 'DRIBLAR' | 'REMATAR' | 'PROTEGER' | 'ALIVIAR';

export const PORTADOR = {
  /** A pontuação da secção 7.2 em "pontos de ameaça × 10" (V vai de 0,005 a ~0,6), para o ruído das Decisões
   *  (σ = 0,25 × (21 − Decisões) ÷ 20) ter uma escala comparável. */
  escala: 25,
  /** Valor de manter a posse (por unidade de sucesso, na escala de V): um passe seguro para o lado vale um pouco. */
  valor_posse: 0.03,
  /** Escolha: softmax com temperatura baixa só entre as 3 melhores. */
  softmax_top: 3, temperatura: 0.12,
  /** Tipos de passe pela geometria (m, no referencial da equipa). */
  curto_max: 20, longo_min: 30, progressivo_ganho: 9, flanco_dy: 28, max_passe: 60,
  /** Passes pelo ar: altura máxima (m) e o factor de recepção (mais difícil de controlar). */
  altura_longo: 6, altura_flanco: 7, altura_cruzamento: 3.6, altura_alivio: 13, recepcao_ar: 0.72,
  /** Zona de cruzamento: último terço e corredor lateral (|y − 34| acima de x m). */
  cruzamento_x: 72, cruzamento_corredor: 17,
  /** Conduzir: distância do alvo (m), velocidade (fracção da máxima, 70–85%), toques (a bola afasta-se 0,6–1,8 m, a cada x s). */
  conduzir_m: 7, conduzir_min_m: 3, conduzir_vel: 0.78, toque_min: 0.6, toque_max: 1.8, toque_periodo_s: 0.6,
  /** Revisão da decisão durante a condução ou o drible (s). */
  revisao_s: 0.5,
  /** Driblar: só com um adversário a menos de x m à frente; o alvo fica y m para lá dele. */
  driblar_m: 4.5, driblar_alem_m: 5,
  /** Rematar: só a menos de x m da baliza. */
  remate_max_m: 35,
  /** Proteger: no máximo x s seguidos (ganha tempo para o apoio chegar, não é uma solução). */
  proteger_max_s: 2,
  /** Remate: valor = xG − x × V(origem) (decisão 190). */
  remate_desconto_v: 0.8,
  /** Aliviar: só no próprio terço e pressionado. */
  aliviar_x: 30, aliviar_pressao_m: 2.5, aliviar_perigo: 0.3,
};

/** Duelo (Prompt 2): P(vence o defensor) = 0,5 + K × (defesa − ataque) ÷ 20, limitado. */
export const DUELO = {
  K: 0.6, min: 0.1, max: 0.9,
  /** Desarme só a menos de 1,5 m (secção 9.2); uma tentativa a cada x s; vontade de tentar pela Agressividade. */
  desarme_m: 1.5, intervalo_s: 0.8, tentar_base: 0.12, tentar_agr: 0.01, tentar_pressao: 0.1,
  /** Desarme certo: o defensor fica com a bola (x) ou ela fica solta (resto). */
  fica_com_bola: 0.55,
  /** Falhar deixa o defensor ultrapassado durante 0,5–1 s. */
  ultrapassado_s: [0.5, 1.0] as [number, number],
  /** Falta: base + por ponto de Agressividade acima de 10, mais se falhou o desarme. */
  falta_base: 0.035, falta_agr: 0.006, falta_falhou: 0.05,
  /** Proteger a bola (de costas, com força e equilíbrio) dá ao portador este bónus no duelo. */
  proteger_bonus: 2.5, costas_bonus: 1.5,
  /** O defensor entre o atacante e a baliza tem vantagem no duelo de drible e de desarme. */
  lado_baliza_bonus: 2,
};

/** Bola no ar e cabeceamento. */
export const AEREO = {
  /** Cabeceamento: alcance (m), velocidade da bola (m/s) e subida (m/s); duelo por Cabeceamento, Impulsão e Força. */
  alcance: 1.2, v: [10, 15] as [number, number], vz: [1, 2.5], ruido_duelo: 2,
  /** Recepção de bola alta (abaixo de 1 m, com o pé/peito): a qualidade desce x por m/s acima de 10. */
  ar_penalidade: 0.05,
};

/** Remate (base; afinação na Fase 5) e guarda-redes. */
export const REMATE = {
  /** Velocidade: 18 + 0,7 × Finalização (ou Remate de longe a mais de 20 m), até 32 m/s; subida 0,5–4 m/s. */
  v_base: 18, v_ponto: 0.7, v_max: 32, vz: [0.5, 4] as [number, number],
  /** Erro do ângulo (rad): (base + por ponto abaixo de 20) × (1 + d ÷ 30) × (1 + pressão). */
  erro_base: 0.06, erro_ponto: 0.008, pressao: 0.7,
  /** Subida (m/s) a mais nos remates de longe, para a bola poder sair por cima da barra. */
  vz_longe_extra: 3,
  /** Aponta a x m para dentro do poste do lado oposto ao guarda-redes. */
  margem_poste: 0.7,
  /** Baliza (m): meia largura e altura da barra. */
  meia_baliza: 3.66, barra: 2.44,
  /** xG estimado (para a decisão): e^(−d/k) × ângulo, com pressão e bloqueios. */
  xg_k: 9, xg_escala: 0.9, xg_pressao: 0.35, xg_bloqueio: 0.4,
};

export const GR = {
  /** Alcance a mergulhar (m) = base + por ponto de Agilidade; reacção (s) = base − por ponto de Reflexos. */
  alcance_base: 1.5, alcance_agi: 0.05, reaccao_base: 0.3, reaccao_ref: 0.01, z_max: 2.9,
  /** Defesa: qualidade = (Reflexos + Pega) ÷ 40 − (velocidade − 20) ÷ 40; agarra se passar o sorteio, senão desvia. */
  agarrar_folga: 0.25,
  /** Sai aos cruzamentos dentro da pequena área (+ x m) se lá chegar. */
  sai_cruzamento_m: 3,
};

/** Linha defensiva (secção 9.1). */
export const LINHA = {
  /** Bola descoberta (portador sem ninguém a x m, de frente para a baliza): a linha recua y m. */
  descoberta_livre_m: 5, descoberta_recua: 7,
  /** Passe adversário para trás: a linha sobe x m durante y s. */
  passe_atras_sobe: 5, passe_atras_s: 2.5,
};

export const FORA_DE_JOGO = { margem: 0.3 };

/** Acções sem bola (secção 6.2): pesos e limites. */
export const SEM_BOLA = {
  /** Profundidade: no máximo 2 ao mesmo tempo; o portador tem de ter tempo, estar de frente e ter Visão ≥ x. */
  profundidade_max: 2, profundidade_visao: 11, profundidade_tempo_m: 5, profundidade_alem_m: [8, 14] as [number, number],
  /** Pressionar: activação pela distância do estilo; na contrapressão, × factor + extra. */
  contrapressao_factor: 1.6, contrapressao_extra: 5, pressao_aproximacao_m: 1.2,
  /** Perto da própria baliza (bola a menos de x m) a distância de activação cresce até +y m. */
  perigo_x: 35, perigo_extra: 14,
  /** Perto da própria baliza a vontade de pressionar cresce até × x (o mais próximo sai sempre ao portador). */
  perigo_pressao: 4,
  /** Gatilhos (secção 9.2): cada um soma à utilidade. */
  gatilho: { passe_atras: 0.4, de_costas: 0.35, mau_toque: 0.5, linha_lateral: 0.3, fraco_tecnica: 0.25 },
  /** Cobrir: 5–8 m atrás e ao lado de quem pressiona. */
  cobrir_m: 6.5,
  /** Fechar linha de passe: 2–3 perto da bola; o ponto fica a x da linha (fracção a partir do receptor). */
  fechar_max: 3, fechar_fraccao: 0.4, fechar_raio_m: 22,
  /** Marcar: a 1,5 m, entre o adversário e a baliza; na marcação individual, a trela à zona estica 1,5×. */
  marcar_m: 1.5, marcar_trela: 1.5,
  /** Ocupar a área: as 5 zonas (no referencial da equipa) e o máximo de jogadores. */
  zonas_area: [[99, 30.5], [98, 39], [94, 34], [86, 34], [90, 26]] as [number, number][], area_max: 4,
  /** Largura: a x m da linha lateral. */
  largura_m: 4,
  /** Equilíbrio defensivo: fica pelo menos x m atrás da bola. */
  equilibrio_atras_m: 18,
  /** Apoio frontal: entre as linhas de médios e defesas adversárias; no máximo 2 e não no ponto de um colega (m). */
  frontal_max: 2, frontal_colega_m: 8,
  /** Equilíbrio defensivo: só com a bola para lá de x m (no nosso referencial) e sem recuar mais de y m da âncora. */
  equilibrio_bola_x: 45, equilibrio_recuo_max: 10,
};

type Pesos = Partial<Record<AccaoSemBola, number>>;

/** Peso do papel (secção 6.4). Por omissão 1; 0 = o papel não faz essa acção. */
export const PESO_PAPEL: Record<string, Pesos> = {
  gr_cla: { MANTER_POSICAO: 1, OFERECER_APOIO: 0.4 },
  gr_lib: { MANTER_POSICAO: 1, OFERECER_APOIO: 0.8 },
  dc_def: { MANTER_POSICAO: 1.1, OFERECER_APOIO: 0.6, EQUILIBRIO_DEFENSIVO: 1.4, ATACAR_PROFUNDIDADE: 0, APOIO_FRONTAL: 0, SOBREPOSICAO: 0, OCUPAR_AREA: 0, DAR_LARGURA: 0, PRESSIONAR: 0.7, MARCAR: 1.2, COBRIR: 1.2, FECHAR_LINHA_PASSE: 0.8 },
  dc_con: { MANTER_POSICAO: 1, OFERECER_APOIO: 1.0, EQUILIBRIO_DEFENSIVO: 1.2, ATACAR_PROFUNDIDADE: 0, APOIO_FRONTAL: 0, SOBREPOSICAO: 0, OCUPAR_AREA: 0, DAR_LARGURA: 0, PRESSIONAR: 0.8, MARCAR: 1.1, COBRIR: 1.2 },
  lat_def: { OFERECER_APOIO: 1.1, DAR_LARGURA: 0.6, SOBREPOSICAO: 0.4, ATACAR_PROFUNDIDADE: 0.2, OCUPAR_AREA: 0, EQUILIBRIO_DEFENSIVO: 1.0, MARCAR: 1.1, COBRIR: 1.1 },
  lat_ofe: { OFERECER_APOIO: 1.0, DAR_LARGURA: 1.3, SOBREPOSICAO: 1.4, ATACAR_PROFUNDIDADE: 0.6, OCUPAR_AREA: 0.3, EQUILIBRIO_DEFENSIVO: 0.6, RECUPERAR: 1.3 },
  ala: { DAR_LARGURA: 1.5, SOBREPOSICAO: 1.2, ATACAR_PROFUNDIDADE: 0.8, OCUPAR_AREA: 0.6, EQUILIBRIO_DEFENSIVO: 0.5, RECUPERAR: 1.3 },
  mdc_tri: { OFERECER_APOIO: 1.0, EQUILIBRIO_DEFENSIVO: 1.4, ATACAR_PROFUNDIDADE: 0.1, OCUPAR_AREA: 0.1, PRESSIONAR: 1.2, FECHAR_LINHA_PASSE: 1.3, COBRIR: 1.2 },
  mdc_con: { OFERECER_APOIO: 1.4, EQUILIBRIO_DEFENSIVO: 1.2, ATACAR_PROFUNDIDADE: 0.1, OCUPAR_AREA: 0.1, PRESSIONAR: 0.6, FECHAR_LINHA_PASSE: 1.2 },
  mc_b2b: { OFERECER_APOIO: 1.2, ATACAR_PROFUNDIDADE: 0.8, OCUPAR_AREA: 1.0, SOBREPOSICAO: 0.6, PRESSIONAR: 1.2, RECUPERAR: 1.2 },
  mc_cri: { OFERECER_APOIO: 1.2, APOIO_FRONTAL: 1.3, ATACAR_PROFUNDIDADE: 0.5, OCUPAR_AREA: 0.6, PRESSIONAR: 0.6 },
  mc_cob: { OFERECER_APOIO: 1.1, EQUILIBRIO_DEFENSIVO: 1.2, COBRIR: 1.3, ATACAR_PROFUNDIDADE: 0.3, OCUPAR_AREA: 0.4 },
  mo_10: { APOIO_FRONTAL: 1.5, OFERECER_APOIO: 1.0, ATACAR_PROFUNDIDADE: 0.6, OCUPAR_AREA: 0.8, PRESSIONAR: 0.5, RECUPERAR: 0.6 },
  mo_che: { ATACAR_PROFUNDIDADE: 1.1, OCUPAR_AREA: 1.4, APOIO_FRONTAL: 1.0, OFERECER_APOIO: 0.8 },
  ext_cla: { DAR_LARGURA: 1.5, ATACAR_PROFUNDIDADE: 1.0, OCUPAR_AREA: 0.8, MARCAR: 1.0, OFERECER_APOIO: 0.8 },
  ext_inv: { APOIO_FRONTAL: 1.2, ATACAR_PROFUNDIDADE: 1.1, OCUPAR_AREA: 1.0, DAR_LARGURA: 0.7, FECHAR_LINHA_PASSE: 1.0 },
  pl_fin: { ATACAR_PROFUNDIDADE: 1.5, OCUPAR_AREA: 1.5, OFERECER_APOIO: 0.6, APOIO_FRONTAL: 0.5, PRESSIONAR: 0.7 },
  pl_f9: { APOIO_FRONTAL: 1.5, OFERECER_APOIO: 1.2, ATACAR_PROFUNDIDADE: 0.5, OCUPAR_AREA: 0.9, FECHAR_LINHA_PASSE: 1.1 },
  pl_piv: { OFERECER_APOIO: 1.0, OCUPAR_AREA: 1.5, ATACAR_PROFUNDIDADE: 0.4, PRESSIONAR: 0.5 },
  pl_pre: { ATACAR_PROFUNDIDADE: 1.3, OCUPAR_AREA: 1.2, PRESSIONAR: 1.5 },
};

/** Peso do estilo por acção (secção 8.2: o que tem de se ver no ecrã). */
export const PESO_ESTILO: Record<IdEstilo, Pesos> = {
  tiki_taka: { OFERECER_APOIO: 1.5, APOIO_FRONTAL: 1.2, ATACAR_PROFUNDIDADE: 0.7, DAR_LARGURA: 1.1, PRESSIONAR: 1.2 },
  gegenpressen: { PRESSIONAR: 1.5, FECHAR_LINHA_PASSE: 1.3, COBRIR: 1.2, ATACAR_PROFUNDIDADE: 1.2 },
  contra_ataque: { ATACAR_PROFUNDIDADE: 1.5, OFERECER_APOIO: 0.8, EQUILIBRIO_DEFENSIVO: 1.3, PRESSIONAR: 0.7 },
  catenaccio: { MARCAR: 1.7, EQUILIBRIO_DEFENSIVO: 1.6, OFERECER_APOIO: 0.7, ATACAR_PROFUNDIDADE: 0.8, PRESSIONAR: 0.6 },
  jogo_direto: { ATACAR_PROFUNDIDADE: 1.3, OCUPAR_AREA: 1.4, OFERECER_APOIO: 0.7 },
  pelas_alas: { DAR_LARGURA: 1.6, SOBREPOSICAO: 1.6, OCUPAR_AREA: 1.4, APOIO_FRONTAL: 0.8 },
  futebol_total: { OFERECER_APOIO: 1.2, APOIO_FRONTAL: 1.3, SOBREPOSICAO: 1.3, ATACAR_PROFUNDIDADE: 1.1, PRESSIONAR: 1.2 },
  bloco_medio_baixo: { FECHAR_LINHA_PASSE: 1.4, PRESSIONAR: 0.7, EQUILIBRIO_DEFENSIVO: 1.3, ATACAR_PROFUNDIDADE: 1.1 },
};

/** Peso da fase por acção (secção 3: a fase muda os pesos das acções). */
export const PESO_FASE: Record<Fase, Pesos> = {
  ATQ_CONSTRUCAO: { OFERECER_APOIO: 1.4, DAR_LARGURA: 1.1, ATACAR_PROFUNDIDADE: 0.6, APOIO_FRONTAL: 0.9, SOBREPOSICAO: 0.4, OCUPAR_AREA: 0, EQUILIBRIO_DEFENSIVO: 1.2 },
  ATQ_CRIACAO: { OFERECER_APOIO: 1.1, DAR_LARGURA: 1.2, ATACAR_PROFUNDIDADE: 1.1, APOIO_FRONTAL: 1.3, SOBREPOSICAO: 1.2, OCUPAR_AREA: 0.5, EQUILIBRIO_DEFENSIVO: 1.0 },
  ATQ_FINALIZACAO: { OFERECER_APOIO: 0.9, DAR_LARGURA: 0.9, ATACAR_PROFUNDIDADE: 1.3, APOIO_FRONTAL: 1.1, SOBREPOSICAO: 1.2, OCUPAR_AREA: 1.6, EQUILIBRIO_DEFENSIVO: 1.0 },
  TRANS_DEF_ATQ: { OFERECER_APOIO: 1.0, ATACAR_PROFUNDIDADE: 1.5, APOIO_FRONTAL: 1.0, DAR_LARGURA: 0.9, OCUPAR_AREA: 0.6, EQUILIBRIO_DEFENSIVO: 0.8 },
  TRANS_ATQ_DEF: { PRESSIONAR: 1.4, COBRIR: 1.2, FECHAR_LINHA_PASSE: 1.2, RECUPERAR: 1.5, MARCAR: 0.8 },
  DEF_ORGANIZADA: { MANTER_POSICAO: 1.2, PRESSIONAR: 1.0, COBRIR: 1.0, FECHAR_LINHA_PASSE: 1.0, MARCAR: 1.0 },
  BOLA_PARADA: { MANTER_POSICAO: 1 },
};

/** Atributos de cada acção (atributoFactor = 0,7 + 0,03 × média). */
export const ATRIBUTOS_SEM_BOLA: Record<AccaoSemBola, string[]> = {
  MANTER_POSICAO: ['pos', 'con'], OFERECER_APOIO: ['teq', 'pos'], DAR_LARGURA: ['teq', 'msb'], ATACAR_PROFUNDIDADE: ['msb', 'ant'],
  APOIO_FRONTAL: ['msb', 'vis'], SOBREPOSICAO: ['ctr', 'msb'], OCUPAR_AREA: ['msb', 'cab'], EQUILIBRIO_DEFENSIVO: ['pos', 'con'],
  PRESSIONAR: ['agr', 'ctr'], COBRIR: ['pos', 'teq'], FECHAR_LINHA_PASSE: ['ant', 'pos'], MARCAR: ['mar', 'con'], RECUPERAR: ['ctr', 'vel'],
};

/** Peso do estilo por opção do portador (secção 8.1). */
export function pesoOpcaoEstilo(P: { pesoPasseCurto: number; pesoPasseLongo: number; pesoCruzamento: number; pesoDrible: number; pesoRemateLonge: number }, o: OpcaoPortador, longe = false): number {
  switch (o) {
    case 'PASSE_CURTO': case 'PASSE_PROGRESSIVO': return P.pesoPasseCurto;
    case 'PASSE_LONGO': case 'MUDANCA_FLANCO': case 'ALIVIAR': return P.pesoPasseLongo;
    case 'CRUZAMENTO': return P.pesoCruzamento;
    case 'DRIBLAR': case 'CONDUZIR': return P.pesoDrible;
    case 'REMATAR': return longe ? P.pesoRemateLonge : 1;
    default: return 1;
  }
}
