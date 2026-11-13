// Ratings de equipa (Fase 2, Bloco B), calculados a partir do onze, dos papéis e da táctica.
// Cada rating está na escala 1–20 (como os atributos). O motor não lê o OVR.
//
//   pontuação do jogador num rating = média dos seus atributos com os pesos desse rating
//   rating da equipa = Σ (contribuição do papel × pontuação × factor do jogador) / referência do rating
//   factor do jogador = familiaridade com a posição × adequação ao papel (face ao seu melhor papel na posição)
//
// Depois: índices de ataque e de defesa (combinações dos ratings) → escala de força da Fase 1
// (para os golos esperados usarem a mesma fórmula e a mesma calibração) → modificadores (±15% no total).

export const RATINGS = ['construcao', 'criacao', 'finalizacao', 'pressao', 'defesa_area', 'transicao', 'aereo', 'bolas_paradas', 'gr'] as const;
export type Rating = (typeof RATINGS)[number];

export const NOME_RATING: Record<Rating, string> = {
  construcao: 'Construção', criacao: 'Criação', finalizacao: 'Finalização', pressao: 'Pressão', defesa_area: 'Defesa da área',
  transicao: 'Transição defensiva', aereo: 'Jogo aéreo', bolas_paradas: 'Bolas paradas', gr: 'Guarda-redes',
};

/** Atributos que contam em cada rating (o rating "gr" usa a adequação ao papel de guarda-redes). */
export const PESOS_RATING: Record<Exclude<Rating, 'gr' | 'bolas_paradas'>, Record<string, number>> = {
  construcao: { pas: 3, ptq: 3, cmp: 2, dec: 2, vis: 1, tec: 1, plo: 1 },
  criacao: { vis: 3, pas: 2, tec: 2, dri: 2, msb: 2, cru: 1.5, dec: 1, ptq: 1 },
  finalizacao: { fin: 4, cmp: 2, msb: 2, ant: 1, cab: 1, rld: 1 },
  pressao: { ctr: 3, ant: 2, teq: 2, res: 2, agr: 1.5, ace: 1 },
  defesa_area: { mar: 3, des: 3, pos: 3, cab: 2, con: 2, for: 1, imp: 1 },
  transicao: { vel: 2, ace: 2, pos: 2, ant: 2, con: 1.5, dec: 1, ctr: 1 },
  aereo: { cab: 3, imp: 3, for: 2, equ: 1 },
};

/** Soma das contribuições de cada papel de campo, depois de normalizadas (os valores abaixo dão as proporções). */
export const SOMA_CONTRIBUICAO = 2.2;

/** Contribuição de cada papel para cada rating (0 = não contribui); normalizadas para somar SOMA_CONTRIBUICAO. */
export const CONTRIBUICAO: Record<string, Partial<Record<Rating, number>>> = {
  gr_cla: { gr: 1, construcao: 0.1 },
  gr_lib: { gr: 1, construcao: 0.35, transicao: 0.3 },
  dc_def: { defesa_area: 1.2, aereo: 1, transicao: 0.6, construcao: 0.15 },
  dc_con: { defesa_area: 1.0, aereo: 0.8, transicao: 0.5, construcao: 0.6 },
  lat_def: { defesa_area: 0.7, transicao: 0.7, pressao: 0.3, construcao: 0.2, criacao: 0.1 },
  lat_ofe: { defesa_area: 0.4, transicao: 0.4, criacao: 0.5, construcao: 0.3, pressao: 0.4 },
  ala: { criacao: 0.6, transicao: 0.4, pressao: 0.5, defesa_area: 0.35, construcao: 0.3 },
  mdc_tri: { defesa_area: 0.6, pressao: 0.6, transicao: 0.8, construcao: 0.3, aereo: 0.3 },
  mdc_con: { construcao: 1.0, criacao: 0.4, transicao: 0.5, pressao: 0.3, defesa_area: 0.3 },
  mc_b2b: { pressao: 0.8, construcao: 0.5, criacao: 0.4, finalizacao: 0.25, transicao: 0.5, defesa_area: 0.2 },
  mc_cri: { construcao: 0.8, criacao: 0.9, finalizacao: 0.15, pressao: 0.3 },
  mc_cob: { transicao: 0.7, pressao: 0.6, defesa_area: 0.4, construcao: 0.6, criacao: 0.2 },
  mo_10: { criacao: 1.2, construcao: 0.5, finalizacao: 0.35, pressao: 0.25 },
  mo_che: { finalizacao: 0.7, criacao: 0.6, pressao: 0.4 },
  ext_cla: { criacao: 0.9, finalizacao: 0.3, pressao: 0.35 },
  ext_inv: { criacao: 0.6, finalizacao: 0.65, pressao: 0.35 },
  pl_fin: { finalizacao: 1.3, aereo: 0.3, pressao: 0.2 },
  pl_f9: { criacao: 0.9, construcao: 0.5, finalizacao: 0.6, pressao: 0.3 },
  pl_piv: { finalizacao: 0.9, aereo: 0.8, criacao: 0.3 },
  pl_pre: { pressao: 1.0, finalizacao: 0.8, transicao: 0.2 },
};

/**
 * Sinergia do falso 9: com um falso 9 adequado, os médios interiores (box-to-box, segundo médio)
 * aparecem mais na área. A contribuição deles para a finalização sobe na proporção da adequação do 9.
 */
export const SINERGIA_FALSO9 = {
  finalizacao_interiores: 0.35,
  /** Combinações (tabelinhas com o 9 que recua): criação extra dos interiores. */
  criacao_combinacao: 0.3,
  /** Modo detalhado: probabilidade (× sinergia) de uma criação falhada ser repetida numa tabelinha com o falso 9. */
  tabelinha: 0.35,
  /** A sinergia vai de 0 (adequação ao papel de falso 9 ≤ mínima) a 1 (adequação = referência), até 1,2. */
  adequacao_minima: 13,
  adequacao_referencia: 17,
};

/** Penalização por jogar num papel para o qual é menos adequado do que ao seu melhor papel da posição (por ponto 1–20). */
export const PENALIZACAO_PAPEL = { por_ponto: 0.08, maximo: 0.4 };

/** Índices de ataque e de defesa: pesos dos ratings (somam 1). */
export const INDICE_ATAQUE: Partial<Record<Rating, number>> = { construcao: 0.18, criacao: 0.27, finalizacao: 0.45, bolas_paradas: 0.05, aereo: 0.05 };
export const INDICE_DEFESA: Partial<Record<Rating, number>> = { pressao: 0.2, defesa_area: 0.35, transicao: 0.2, gr: 0.2, aereo: 0.05 };

/**
 * Conversão índice (1–20) → força (escala da Fase 1): força = a + b × índice.
 * Calibrada com `scripts/calibrar-ratings.ts` (regressão entre os onzes gerados e a força da Fase 1).
 */
export const CONVERSAO_FORCA = {
  ataque: { a: -37.93, b: 6.706 },
  defesa: { a: -52.69, b: 8.175 },
  /** Assimetria ataque/defesa conservada (0 = iguais à média da equipa; 1 = tal como saem dos índices).
   *  Os índices dependem de atributos concretos e a conversão amplifica a diferença entre eles. */
  assimetria: 0.5,
};

/** Modificadores (fracção da força). Cada um tem o seu limite; o total é limitado a ±15%. */
export const MODIFICADORES = {
  limite_total: 0.15,
  moral: { limite: 0.05, referencia: 13, por_ponto: 0.0075 },
  forma: { limite: 0.04, referencia: 6.6, por_ponto: 0.04 },
  /** Cansaço: média da condição do onze abaixo de 80% tira rendimento. */
  cansaco: { limiar: 80, por_ponto: 0.004, limite: 0.08 },
  /** Entrosamento (0–100) do onze com a táctica. */
  entrosamento: { referencia: 70, por_ponto: 0.0015, limite: 0.05 },
  /** Treinador: qualidade táctica, motivação e adequação da táctica ao plantel. */
  treinador: { tactica: 0.003, motivacao: 0.002, adequacao: 0.03, limite: 0.05 },
  /** Forma da época do clube (o "choque de forma" da Fase 1, σ em fracção da força). Fica fora do limite total:
   *  é o nível do clube na época, não um modificador do jogo. */
  forma_epoca: { desvio: 0.1, limite: 0.2 },
  /** Rivalidade: mais variância nos golos esperados (sem mudar a média) e mais cartões. */
  rivalidade: { desvio_xg: 0.15, cartoes: 1.3 },
  /** Factor casa extra: estádio cheio (até) e adversário de outra confederação. */
  casa: { estadio_cheio: 0.02, outra_confederacao: 0.04 },
};
