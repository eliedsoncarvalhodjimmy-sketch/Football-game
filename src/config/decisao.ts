// Motor de decisão (camada 1 do jogo 2D): todos os números num sítio só.
// Campo em metros: 105 × 68. A equipa 0 ataca para x = 105; a equipa 1 ataca para x = 0.
import type { IdAtributo } from './atributos.ts';
import type { IdEstilo } from './estilos.ts';

/** Versão do algoritmo de decisão guardada em cada jogo ("decisionVersion"). A v1 nunca chegou a jogos guardados
 *  (só ao protótipo) e foi substituída pela v2: compromisso nas decisões, trela à forma e ruído mais lento. */
export const VERSAO_DECISAO = 'v2' as const;

export const CAMPO = { comprimento: 105, largura: 68, baliza: 7.32, area_comp: 16.5, area_larg: 40.3 };

/** Frequência de decisão (tempo simulado). */
export const FREQUENCIA = { com_bola_ms: 200, sem_bola_ms: 500, treinador_min: 5, tick_ms: 100 };

/** Pesos da fórmula de utilidade. */
export const PESOS = { atributo: 4, tactica: 1, contexto: 1, moral: 1.5, condicao: 1.5, aleatorio: 0.6, aleatorio_sem_bola: 0.25 };

/** O "capricho" (factor aleatório) de cada jogador muda a cada x segundos, não a cada decisão. */
export const RUIDO_JANELA_S = 3;

/**
 * Compromisso: um jogador mantém a opção que está a executar (com o alvo actualizado) enquanto a melhor alternativa
 * não a ultrapassar por uma margem; nos primeiros segundos de uma opção a margem é maior. Uma mudança de posse
 * liberta todos do compromisso (é outro momento do jogo).
 */
export const COMPROMISSO = { margem_sem_bola: 1.2, margem_com_bola: 0.6, minimo_s: 1.5, margem_inicio: 3.0 };

/**
 * Trela à forma: sem a bola, o alvo de cada opção fica dentro de uma elipse à volta da posição da forma da equipa
 * (metros em x, ao longo do campo, e em y, na largura). Ficam de fora quem pressiona o portador, quem vai à bola
 * solta e quem recebe um passe. A marcação perto da própria baliza estica a trela (segue o atacante).
 */
export const TRELA = { def: { x: 7, y: 6 }, med: { x: 11, y: 9 }, ata: { x: 14, y: 10 }, marcar_perto_baliza: 1.6 };

/** Tipos de acção avaliados (para o mapeamento de atributos e para a semente do factor aleatório). */
export type TipoAvaliado = 'passe_curto' | 'passe_longo' | 'cruzamento' | 'driblar' | 'proteger' | 'rematar' | 'cabecear'
  | 'correr_espaco' | 'apoiar' | 'manter_posicao' | 'pressionar' | 'recuar' | 'marcar' | 'interceptar' | 'desarmar';

/** Atributos por acção (principais pesam 70%, secundários 30%). "Flair" não existe nos atributos do jogo: usa-se a média
 *  de Drible e Visão (a criatividade com a bola), documentado em DECISIONS. */
export const ATRIBUTOS_ACCAO: Record<TipoAvaliado, { principais: (IdAtributo | 'flair')[]; secundarios: (IdAtributo | 'flair')[] }> = {
  passe_curto: { principais: ['pas', 'vis'], secundarios: ['dec', 'tec'] },
  passe_longo: { principais: ['pas', 'tec'], secundarios: ['vis', 'dec'] },
  cruzamento: { principais: ['cru', 'tec'], secundarios: ['vis'] },
  driblar: { principais: ['dri', 'agi'], secundarios: ['tec', 'flair'] },
  proteger: { principais: ['for', 'equ'], secundarios: ['tec', 'cmp'] },
  rematar: { principais: ['fin', 'cmp'], secundarios: ['tec'] },
  cabecear: { principais: ['cab', 'imp'], secundarios: ['cmp'] },
  correr_espaco: { principais: ['msb', 'ace'], secundarios: ['ant', 'dec'] },
  apoiar: { principais: ['msb', 'teq'], secundarios: ['dec'] },
  manter_posicao: { principais: ['pos', 'con'], secundarios: ['teq'] },
  pressionar: { principais: ['agr', 'res'], secundarios: ['det', 'teq'] },
  recuar: { principais: ['pos', 'teq'], secundarios: ['con'] },
  marcar: { principais: ['mar', 'pos'], secundarios: ['con', 'ant'] },
  interceptar: { principais: ['ant', 'pos'], secundarios: ['dec', 'con'] },
  desarmar: { principais: ['des', 'det'], secundarios: ['for', 'agr'] },
};

/** Efeito de cada estilo táctico nos pesos (bónus somado à utilidade, na escala do Tactical_Bonus). */
export interface EfeitoEstilo {
  bonus: Partial<Record<TipoAvaliado, number>>;
  /** Bónus que só valem em certos momentos: após perder a bola (pressão) ou após a recuperar (transição). */
  aposPerda?: Partial<Record<TipoAvaliado, number>>;
  aposRecuperacao?: Partial<Record<TipoAvaliado, number>>;
  /** Multiplicador do consumo de resistência. */
  consumo?: number;
  /** Bónus de jogo aéreo (cabeceamento e passe longo pelo ar). */
  aereo?: number;
  /** Subida dos laterais, amplitude, troca de posição, posição fixa, subir no campo, compactação (forma da equipa). */
  forma?: { subidaLaterais?: number; amplitude?: number; trocaPosicao?: number; posicaoFixa?: number; subir?: number; compactacao?: number; linhaDefensiva?: number };
}

export const ESTILOS_DECISAO: Record<IdEstilo, EfeitoEstilo> = {
  tiki_taka: { bonus: { passe_curto: 2.0, passe_longo: -1.0, correr_espaco: 1.0, apoiar: 1.0 }, forma: { compactacao: 0.3 } },
  gegenpressen: { bonus: { desarmar: 1.0 }, aposPerda: { pressionar: 2.5 }, consumo: 1.5, forma: { linhaDefensiva: 0.15 } },
  contra_ataque: { bonus: { correr_espaco: 2.0, proteger: -1.0, passe_curto: -1.0 }, aposRecuperacao: { passe_longo: 3.0 }, forma: { linhaDefensiva: -0.15 } },
  catenaccio: { bonus: { marcar: 3.0, recuar: 2.0, manter_posicao: 2.0 }, forma: { subir: -2.0, linhaDefensiva: -0.25, compactacao: 0.3 } },
  jogo_direto: { bonus: { passe_longo: 3.0, passe_curto: -1.0, cabecear: 2.0 }, aereo: 2.0 },
  pelas_alas: { bonus: { cruzamento: 2.5 }, forma: { subidaLaterais: 1.5, amplitude: 1.0 } },
  futebol_total: { bonus: { correr_espaco: 1.5, apoiar: 1.0, manter_posicao: -0.5 }, forma: { trocaPosicao: 1.5, posicaoFixa: -0.5 } },
  bloco_medio_baixo: { bonus: { recuar: 2.0, manter_posicao: 1.5, pressionar: -1.0 }, forma: { compactacao: 1.5, linhaDefensiva: -0.2 } },
};

/** "Após perder/recuperar a bola" vale durante N segundos. */
export const JANELA_TRANSICAO_S = 6;

/** Bónus de contexto (escala do Context_Bonus). */
export const CONTEXTO = {
  colega_livre_curto: 3.0, // colega livre a ≤ 12 m
  livre_metros: 4, // "livre": adversário mais próximo a ≥ x m do receptor
  linha_cortada: -3.0, // adversário perto da linha de passe
  passe_para_tras: -0.3,
  progressao_por_10m: 0.6,
  remate_dentro_area: 0.5,
  /** Rematar: bónus = (xG estimado − limiar) × factor. */
  remate_xg_limiar: 0.085,
  /** Por cada adversário na linha de remate. */
  remate_tapado: -1.5,
  remate_por_xg: 40,
  remate_angulo_mau: -2.0,
  remate_longe_por_metro: -0.2,
  cruzamento_zona: 2.0, // corredor lateral no último terço
  drible_espaco: 1.5, // ninguém a ≤ 6 m à frente
  drible_pressionado: -1.0,
  /** A menos de 18 m da baliza conduzir perde para rematar/passar. */
  drible_perto_baliza: -2.5,
  proteger_pressionado: 1.0,
  desarme_ao_alcance: 3.0, // portador a ≤ 2,5 m
  pressao_mais_proximo: 2.5,
  marcar_atacante_perigoso: 1.5,
  interceptar_linha: 2.0,
  recuar_atras_da_bola: 1.0,
};

/** Acções de risco (afectadas pela moral). */
export const ACCOES_RISCO: TipoAvaliado[] = ['driblar', 'rematar', 'passe_longo', 'cruzamento'];

/** Moral (0–100) → factor 0,8–1,2; condição (0–1) → factor 0,5–1,0. Remate de longe: acima de x metros. */
export const MORAL = { minimo: 0.8, maximo: 1.2, baixa: 30, penalizacao_risco_baixa: 1.2 };
export const REMATE_LONGE_M = 22;

/** Erro humano (fracção 0–0,5) e a sua aplicação ao ângulo (radianos) e à força. */
export const ERRO = { base: 0.3, pressao: 0.15, pressao_metros: 3, fadiga: 0.10, fadiga_condicao: 0.6, maximo: 0.5, angulo_max_rad: 0.6, forca_max: 0.35 };

/** Movimento (steering): velocidade máxima e aceleração pelos atributos (1–20). */
export const MOVIMENTO = {
  vel_base: 6.0, vel_por_ponto: 0.18, // m/s: Velocidade 20 → 9,6 m/s
  acel_base: 2.5, acel_por_ponto: 0.15, // m/s²: Aceleração 20 → 5,5 m/s²
  viragem_base: 2.5, viragem_por_ponto: 0.2, // rad/s: Agilidade
  raio_chegada: 3, separacao_raio: 2.2, separacao_forca: 6,
  fadiga_por_s_a_correr: 0.00012, fadiga_por_s_parado: 0.00002,
  /** Mínimo do ritmo (fracção da velocidade máxima): abaixo disto anda. */
  ritmo_minimo: 0.12,
  /** A andar de costas (ou de lado) para o sítio para onde olha: fracção da velocidade máxima. */
  costas: 0.55, lado: 0.8,
  /** O corpo roda mais depressa do que a trajectória: viragem do olhar = viragem × factor. */
  olhar_factor: 1.6,
  /** A partir desta velocidade (m/s) o jogador olha para onde corre; abaixo, olha para a bola. */
  olhar_correr_ms: 5.5,
};

/**
 * Ritmo (fracção da velocidade máxima) conforme a distância ao alvo e o momento do jogo: andar, trote, correr, sprint.
 * Um jogador no seu lugar anda; a caminho de um lugar longe trota ou corre; quem pressiona, persegue a bola ou recua
 * depois da perda corre a fundo.
 */
export const RITMO = {
  andar: 0.18, trote: 0.4, correr: 0.65, sprint: 1.0,
  /** Distâncias ao alvo (m): até `andar_m` anda, até `trote_m` trota, até `correr_m` corre, acima corre mais. */
  andar_m: 2.5, trote_m: 7, correr_m: 15,
  portador_conduz: 0.62, portador_protege: 0.2, portador_espaco: 0.8,
  pressao: 0.92, bola_solta: 0.95, receptor: 0.8, desmarcacao: 0.8,
  /** Transição defensiva: atrás da linha da bola depois de perder a posse. */
  recuo_transicao: 0.9,
};

/**
 * Bola parada: o marcador vai até à bola (a trote), os outros reorganizam-se na forma; recomeça quando o marcador
 * chega à bola e passou o tempo mínimo (segundos de jogo). Os adversários ficam a 9,15 m nos livres e cantos.
 */
export const PARAGEM = { lancamento_s: 4, canto_s: 9, baliza_s: 7, livre_s: 6, saida_s: 12, saida_max_s: 30, distancia_m: 9.15 };

/** Treinador IA: gatilhos avaliados a cada 5 minutos. */
export const TREINADOR_IA = {
  perder_apos_min: 60, condicao_substituir: 0.6, seca_remates_min: 15,
  /** Probabilidade de activação = base + por_ponto × (média dos atributos usados − 10). */
  prob_base: 0.55, prob_por_ponto: 0.04, substituicoes_max: 5,
};
