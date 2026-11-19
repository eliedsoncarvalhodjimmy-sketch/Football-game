// VERSÃO v1 CONGELADA — não alterar.
// Presets por nacionalidade: distribuições ponderadas de tom de pele, estilo e cor de cabelo, cor dos olhos, barba e
// acessórios. Nunca um único fenótipo por país: cada preset mistura vários, e o gerador junta ainda uma pequena parte do
// preset global (ninguém sai igual). Códigos ISO 3166-1 alfa-2 (AO, BR, PT, ...); os códigos do jogo (FIFA: POR, BRA,
// ...) são convertidos por `presetDe`. Nacionalidade desconhecida → preset genérico global balanceado.
import type { EyeColorId, FaceShapeId, HairColorId } from './faceParts/contexto.ts';

export interface NationalityPreset {
  nome: string;
  /** [tom 0–7, peso] (0 = muito clara … 7 = muito escura). */
  skinTones: [number, number][];
  /** Estilo de cabelo (ids de Hair.tsx) → peso. */
  hairStyles: Record<string, number>;
  hairColors: [HairColorId, number][];
  eyeColors: [EyeColorId, number][];
  /** Probabilidade de ter barba (aos adultos; os mais novos têm muito menos). */
  beardProbability: number;
  /** Preferências de barba [tipo 1–11, peso]; por omissão todas. */
  beardStyles?: [number, number][];
  /** Probabilidade base de acessórios (brincos, tatuagem). */
  accessoryProbability: number;
  faceShapes?: [FaceShapeId, number][];
  /** Formas de olhos preferidas [índice 0–11, peso] (ex.: pálpebra única na Ásia oriental). */
  eyeShapes?: [number, number][];
  /** Tendência para nariz largo (0–1) e lábios grossos (0–1). */
  narizLargo?: number;
  labiosGrossos?: number;
}

// ---------------------------------------------------------------- blocos reutilizáveis

const CABELO_AFRO: Record<string, number> = {
  fade_top_crespo: 30, crespo_curto: 14, black_power: 9, twists: 7, ondas_360: 7, dreads_compridos: 5, dreads_presos: 2,
  trancas: 4, cornrows: 5, careca: 6, raspado: 6, moicano_risca: 3, loiro_descolorido: 3, militar: 2,
};
const CABELO_EUROPA: Record<string, number> = {
  fade_curto: 16, liso_curto: 12, risca_lateral: 10, ondulado_medio: 9, liso_tras: 7, texturizado: 8, topete: 6, militar: 5,
  raspado: 4, careca: 3, cacheado_medio: 3, comprido_liso: 2, comprido_ondulado: 2, top_knot: 2, cortina: 3, desgrenhado: 2,
  entradas: 2, rabo_cavalo: 1, franja: 1, moicano: 1,
};
const CABELO_LATINO: Record<string, number> = {
  fade_curto: 16, liso_curto: 8, risca_lateral: 6, liso_tras: 6, texturizado: 6, topete: 6, ondulado_medio: 8, cacheado_medio: 8,
  fade_top_crespo: 8, crespo_curto: 4, comprido_ondulado: 3, caracois_compridos: 2, raspado: 5, careca: 4, militar: 3,
  moicano: 2, top_knot: 2, cortina: 2, loiro_descolorido: 1, twists: 1, cornrows: 1,
};
const CABELO_ASIA_LESTE: Record<string, number> = {
  franja: 18, desgrenhado: 14, liso_curto: 18, fade_curto: 12, texturizado: 10, risca_lateral: 8, cortina: 8, militar: 6, liso_tras: 4, topete: 2,
};
const CABELO_ARABE: Record<string, number> = {
  fade_curto: 20, fade_top_crespo: 6, cacheado_medio: 12, liso_tras: 10, topete: 8, texturizado: 8, ondulado_medio: 8, raspado: 6,
  careca: 4, risca_lateral: 6, militar: 5, crespo_curto: 3, caracois_compridos: 1,
};

const OLHOS_ESCUROS: [EyeColorId, number][] = [['castanho', 55], ['preto', 38], ['mel', 7]];
const OLHOS_SUL: [EyeColorId, number][] = [['castanho', 55], ['preto', 15], ['mel', 12], ['verde', 10], ['azul', 8]];
const OLHOS_NORTE: [EyeColorId, number][] = [['azul', 40], ['verde', 20], ['castanho', 25], ['mel', 10], ['preto', 5]];
const OLHOS_ASIA: [EyeColorId, number][] = [['preto', 60], ['castanho', 38], ['mel', 2]];

const CORES_AFRO: [HairColorId, number][] = [['preto', 85], ['castanho_escuro', 15]];
const CORES_SUL: [HairColorId, number][] = [['preto', 25], ['castanho_escuro', 50], ['castanho_claro', 15], ['loiro', 7], ['ruivo', 2], ['loiro_platinado', 1]];
const CORES_NORTE: [HairColorId, number][] = [['castanho_claro', 30], ['loiro', 35], ['castanho_escuro', 20], ['loiro_platinado', 6], ['ruivo', 7], ['preto', 2]];
const CORES_ASIA: [HairColorId, number][] = [['preto', 85], ['castanho_escuro', 10], ['castanho_claro', 3], ['loiro', 2]];

const PELE_NORTE: [number, number][] = [[0, 40], [1, 42], [2, 12], [3, 4], [5, 1], [6, 1]];
const PELE_SUL: [number, number][] = [[0, 8], [1, 30], [2, 30], [3, 20], [4, 8], [5, 2], [6, 2]];
const PELE_AFRO: [number, number][] = [[4, 4], [5, 18], [6, 40], [7, 38]];
const PELE_ARABE: [number, number][] = [[1, 10], [2, 22], [3, 34], [4, 26], [5, 6], [6, 2]];
const PELE_ASIA: [number, number][] = [[0, 30], [1, 50], [2, 15], [3, 5]];

const africano = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_AFRO, hairStyles: CABELO_AFRO, hairColors: CORES_AFRO, eyeColors: OLHOS_ESCUROS, beardProbability: 0.45,
  beardStyles: [[1, 25], [2, 15], [3, 15], [6, 12], [11, 10], [8, 8], [4, 8], [10, 7]], accessoryProbability: 0.3, narizLargo: 0.75, labiosGrossos: 0.7, ...extra,
});
const europeuNorte = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_NORTE, hairStyles: CABELO_EUROPA, hairColors: CORES_NORTE, eyeColors: OLHOS_NORTE, beardProbability: 0.45,
  accessoryProbability: 0.15, narizLargo: 0.2, labiosGrossos: 0.2, ...extra,
});
const europeuSul = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_SUL, hairStyles: CABELO_EUROPA, hairColors: CORES_SUL, eyeColors: OLHOS_SUL, beardProbability: 0.5,
  accessoryProbability: 0.2, narizLargo: 0.3, labiosGrossos: 0.35, ...extra,
});
const europeuLeste = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_NORTE, hairStyles: { ...CABELO_EUROPA, militar: 9, raspado: 6, fade_curto: 18 },
  hairColors: [['castanho_claro', 35], ['castanho_escuro', 30], ['loiro', 22], ['preto', 8], ['loiro_platinado', 3], ['ruivo', 2]],
  eyeColors: [['azul', 32], ['verde', 20], ['castanho', 30], ['mel', 10], ['preto', 8]], beardProbability: 0.4, accessoryProbability: 0.12, narizLargo: 0.3, labiosGrossos: 0.2, ...extra,
});
const latino = (nome: string, pele: [number, number][], extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: pele, hairStyles: CABELO_LATINO, hairColors: [['preto', 45], ['castanho_escuro', 40], ['castanho_claro', 10], ['loiro', 4], ['loiro_platinado', 1]],
  eyeColors: [['castanho', 60], ['preto', 25], ['mel', 9], ['verde', 4], ['azul', 2]], beardProbability: 0.5, accessoryProbability: 0.25, narizLargo: 0.45, labiosGrossos: 0.45, ...extra,
});
const arabe = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_ARABE, hairStyles: CABELO_ARABE, hairColors: [['preto', 55], ['castanho_escuro', 38], ['castanho_claro', 6], ['loiro', 1]],
  eyeColors: [['castanho', 55], ['preto', 30], ['mel', 9], ['verde', 5], ['azul', 1]], beardProbability: 0.7,
  beardStyles: [[6, 25], [1, 20], [4, 15], [10, 15], [3, 12], [11, 8]], accessoryProbability: 0.12, narizLargo: 0.4, labiosGrossos: 0.35, ...extra,
});
const asiaLeste = (nome: string, extra: Partial<NationalityPreset> = {}): NationalityPreset => ({
  nome, skinTones: PELE_ASIA, hairStyles: CABELO_ASIA_LESTE, hairColors: CORES_ASIA, eyeColors: OLHOS_ASIA, beardProbability: 0.3,
  beardStyles: [[1, 50], [11, 20], [5, 15], [3, 15]], accessoryProbability: 0.1, faceShapes: [['oval', 30], ['redondo', 25], ['quadrado', 20], ['diamante', 15], ['comprido', 10]],
  eyeShapes: [[6, 40], [7, 25], [3, 15], [0, 10], [10, 10]], narizLargo: 0.45, labiosGrossos: 0.3, ...extra,
});

// ---------------------------------------------------------------- presets

export const PRESETS: Record<string, NationalityPreset> = {
  // Os 10 do enunciado.
  AO: africano('Angola', {
    skinTones: [[3, 5], [4, 10], [5, 22], [6, 35], [7, 28]],
    hairStyles: { black_power: 18, fade_top_crespo: 34, crespo_curto: 10, ondas_360: 8, trancas: 5, dreads_compridos: 5, cornrows: 3, twists: 2, careca: 6, raspado: 4, liso_curto: 3, fade_curto: 2 },
    eyeColors: [['castanho', 50], ['preto', 40], ['mel', 10]], beardProbability: 0.5, beardStyles: [[1, 25], [2, 25], [6, 20], [3, 15], [8, 10], [4, 5]],
  }),
  BR: latino('Brasil', [[1, 12], [2, 18], [3, 17], [4, 18], [5, 15], [6, 12], [7, 8]], {
    hairStyles: { liso_curto: 8, fade_curto: 10, risca_lateral: 4, liso_tras: 4, texturizado: 4, fade_top_crespo: 10, cacheado_medio: 8, black_power: 4, twists: 4, crespo_curto: 4, loiro_descolorido: 5, careca: 5, raspado: 5, moicano: 3, cornrows: 2, dreads_compridos: 2, topete: 3, ondulado_medio: 3, caracois_compridos: 2 },
    hairColors: [['castanho_escuro', 38], ['preto', 38], ['castanho_claro', 12], ['loiro', 10], ['loiro_platinado', 2]],
    accessoryProbability: 0.35, beardProbability: 0.5,
  }),
  PT: europeuSul('Portugal', {
    skinTones: [[0, 8], [1, 30], [2, 32], [3, 10], [4, 10], [5, 4], [6, 4], [7, 2]],
    hairStyles: { ...CABELO_EUROPA, fade_curto: 18, ondulado_medio: 12, risca_lateral: 10, cacheado_medio: 4, careca: 6, raspado: 4, fade_top_crespo: 3 },
    hairColors: [['castanho_escuro', 60], ['preto', 20], ['castanho_claro', 8], ['loiro', 10], ['ruivo', 1], ['loiro_platinado', 1]],
    beardProbability: 0.55, beardStyles: [[6, 30], [1, 25], [4, 15], [10, 12], [3, 8], [11, 10]],
  }),
  NG: africano('Nigéria', {
    skinTones: [[4, 3], [5, 7], [6, 42], [7, 48]],
    hairStyles: { fade_top_crespo: 34, crespo_curto: 14, ondas_360: 12, dreads_compridos: 8, trancas: 6, cornrows: 6, careca: 6, raspado: 4, black_power: 10 },
  }),
  AR: latino('Argentina', [[0, 10], [1, 30], [2, 20], [3, 18], [4, 12], [5, 6], [6, 4]], {
    hairStyles: { liso_curto: 12, fade_curto: 14, ondulado_medio: 12, liso_tras: 8, risca_lateral: 8, comprido_ondulado: 6, caracois_compridos: 4, cacheado_medio: 6, top_knot: 4, texturizado: 6, careca: 8, raspado: 7, cortina: 3, entradas: 2 },
    hairColors: [['castanho_escuro', 50], ['preto', 20], ['castanho_claro', 15], ['loiro', 13], ['ruivo', 2]],
    eyeColors: [['castanho', 55], ['preto', 12], ['mel', 12], ['verde', 11], ['azul', 10]], beardProbability: 0.65,
    beardStyles: [[4, 30], [6, 25], [1, 15], [9, 8], [10, 12], [3, 10]],
  }),
  FR: {
    nome: 'França', skinTones: [[0, 12], [1, 22], [2, 16], [3, 15], [4, 15], [5, 8], [6, 7], [7, 5]],
    hairStyles: { ...CABELO_EUROPA, fade_top_crespo: 10, crespo_curto: 5, ondas_360: 3, dreads_compridos: 3, trancas: 2, cornrows: 3, black_power: 2, cacheado_medio: 6, twists: 2, loiro_descolorido: 2 },
    hairColors: [['castanho_escuro', 40], ['preto', 30], ['castanho_claro', 15], ['loiro', 11], ['ruivo', 3], ['loiro_platinado', 1]],
    eyeColors: [['castanho', 45], ['preto', 20], ['azul', 15], ['verde', 10], ['mel', 10]], beardProbability: 0.5, accessoryProbability: 0.3, narizLargo: 0.45, labiosGrossos: 0.45,
  },
  JP: asiaLeste('Japão', {
    skinTones: [[0, 35], [1, 45], [2, 15], [3, 5]],
    hairStyles: { franja: 20, desgrenhado: 16, liso_curto: 20, fade_curto: 12, texturizado: 12, risca_lateral: 8, cortina: 7, militar: 3, liso_tras: 2 },
    hairColors: [['preto', 85], ['castanho_escuro', 6], ['castanho_claro', 4], ['loiro', 3], ['loiro_platinado', 2]],
    beardProbability: 0.3,
  }),
  DE: europeuNorte('Alemanha', {
    skinTones: [[0, 35], [1, 45], [2, 8], [3, 5], [4, 3], [5, 2], [6, 2]],
    hairColors: [['loiro', 30], ['castanho_claro', 25], ['castanho_escuro', 30], ['preto', 8], ['loiro_platinado', 4], ['ruivo', 3]],
    eyeColors: [['azul', 40], ['verde', 20], ['castanho', 28], ['mel', 8], ['preto', 4]],
  }),
  MA: arabe('Marrocos', {
    skinTones: [[1, 12], [2, 18], [3, 26], [4, 24], [5, 12], [6, 8]],
    hairStyles: { ...CABELO_ARABE, fade_curto: 26, cacheado_medio: 10, fade_top_crespo: 8 },
    hairColors: [['preto', 55], ['castanho_escuro', 40], ['castanho_claro', 5]],
    beardProbability: 0.75,
  }),
  CO: latino('Colômbia', [[1, 14], [2, 16], [3, 22], [4, 18], [5, 14], [6, 10], [7, 6]], {
    hairColors: [['preto', 45], ['castanho_escuro', 25], ['castanho_claro', 15], ['loiro', 10], ['loiro_platinado', 5]],
  }),
  // Europa.
  ES: europeuSul('Espanha', { hairColors: [['castanho_escuro', 55], ['preto', 25], ['castanho_claro', 12], ['loiro', 7], ['ruivo', 1]] }),
  IT: europeuSul('Itália', { beardProbability: 0.6, hairStyles: { ...CABELO_EUROPA, liso_tras: 12, ondulado_medio: 12, comprido_ondulado: 4 } }),
  GB: europeuNorte('Reino Unido', { skinTones: [[0, 30], [1, 34], [2, 10], [3, 6], [4, 6], [5, 6], [6, 5], [7, 3]], hairStyles: { ...CABELO_EUROPA, fade_top_crespo: 5, crespo_curto: 3, cornrows: 2, ondas_360: 2 }, hairColors: [['castanho_claro', 30], ['castanho_escuro', 30], ['loiro', 22], ['ruivo', 8], ['preto', 8], ['loiro_platinado', 2]] }),
  IE: europeuNorte('Irlanda', { hairColors: [['castanho_claro', 30], ['castanho_escuro', 25], ['ruivo', 18], ['loiro', 22], ['preto', 5]], eyeColors: [['azul', 50], ['verde', 22], ['castanho', 20], ['mel', 8]] }),
  NL: europeuNorte('Países Baixos', { skinTones: [[0, 32], [1, 38], [2, 10], [3, 6], [4, 4], [5, 5], [6, 5]], hairStyles: { ...CABELO_EUROPA, fade_top_crespo: 5, crespo_curto: 3 } }),
  BE: europeuNorte('Bélgica', { skinTones: [[0, 25], [1, 35], [2, 12], [3, 8], [4, 6], [5, 6], [6, 5], [7, 3]], hairStyles: { ...CABELO_EUROPA, fade_top_crespo: 6, crespo_curto: 3, cornrows: 2 } }),
  CH: europeuNorte('Suíça', { skinTones: [[0, 30], [1, 42], [2, 12], [3, 6], [4, 4], [5, 3], [6, 3]] }),
  AT: europeuNorte('Áustria'),
  SE: europeuNorte('Suécia', { hairColors: [['loiro', 40], ['castanho_claro', 30], ['loiro_platinado', 10], ['castanho_escuro', 14], ['ruivo', 4], ['preto', 2]] }),
  NO: europeuNorte('Noruega', { hairColors: [['loiro', 40], ['castanho_claro', 30], ['loiro_platinado', 12], ['castanho_escuro', 12], ['ruivo', 4], ['preto', 2]] }),
  DK: europeuNorte('Dinamarca'),
  FI: europeuNorte('Finlândia', { hairColors: [['loiro', 40], ['castanho_claro', 30], ['loiro_platinado', 14], ['castanho_escuro', 12], ['ruivo', 4]] }),
  IS: europeuNorte('Islândia', { hairColors: [['loiro', 35], ['castanho_claro', 30], ['ruivo', 12], ['loiro_platinado', 10], ['castanho_escuro', 13]] }),
  PL: europeuLeste('Polónia'), CZ: europeuLeste('Chéquia'), SK: europeuLeste('Eslováquia'), HU: europeuLeste('Hungria'),
  RO: europeuLeste('Roménia', { skinTones: PELE_SUL, hairColors: CORES_SUL }), BG: europeuLeste('Bulgária', { skinTones: PELE_SUL, hairColors: CORES_SUL }),
  UA: europeuLeste('Ucrânia'), RU: europeuLeste('Rússia'),
  HR: europeuLeste('Croácia', { faceShapes: [['comprido', 30], ['oval', 30], ['quadrado', 25], ['diamante', 15]] }),
  RS: europeuLeste('Sérvia', { faceShapes: [['comprido', 30], ['oval', 30], ['quadrado', 25], ['diamante', 15]], beardProbability: 0.5 }),
  BA: europeuLeste('Bósnia e Herzegovina'), SI: europeuLeste('Eslovénia'), ME: europeuLeste('Montenegro'), MK: europeuLeste('Macedónia do Norte'), AL: europeuSul('Albânia'), XK: europeuSul('Kosovo'),
  GR: europeuSul('Grécia', { beardProbability: 0.65 }), TR: arabe('Turquia', { skinTones: [[1, 18], [2, 30], [3, 32], [4, 16], [5, 4]], eyeColors: OLHOS_SUL }),
  SC: europeuNorte('Escócia', { hairColors: [['castanho_claro', 30], ['ruivo', 15], ['loiro', 25], ['castanho_escuro', 25], ['preto', 5]] }),
  // Américas.
  UY: latino('Uruguai', [[0, 10], [1, 35], [2, 22], [3, 15], [4, 8], [5, 6], [6, 4]], { beardProbability: 0.6 }),
  MX: latino('México', [[1, 8], [2, 18], [3, 30], [4, 28], [5, 12], [6, 4]]),
  CL: latino('Chile', [[1, 12], [2, 25], [3, 30], [4, 25], [5, 8]]),
  PE: latino('Peru', [[2, 15], [3, 35], [4, 35], [5, 15]]),
  EC: latino('Equador', [[2, 10], [3, 25], [4, 25], [5, 18], [6, 14], [7, 8]]),
  VE: latino('Venezuela', [[1, 10], [2, 18], [3, 24], [4, 22], [5, 14], [6, 8], [7, 4]]),
  PY: latino('Paraguai', [[1, 10], [2, 25], [3, 35], [4, 25], [5, 5]]),
  BO: latino('Bolívia', [[2, 10], [3, 35], [4, 40], [5, 15]]),
  US: { nome: 'Estados Unidos', skinTones: [[0, 18], [1, 25], [2, 12], [3, 12], [4, 10], [5, 9], [6, 9], [7, 5]], hairStyles: { ...CABELO_EUROPA, ...{ fade_top_crespo: 8, crespo_curto: 4, cornrows: 3, dreads_compridos: 2, ondas_360: 3, twists: 2 } }, hairColors: [['castanho_escuro', 32], ['castanho_claro', 22], ['preto', 24], ['loiro', 18], ['ruivo', 3], ['loiro_platinado', 1]], eyeColors: [['castanho', 42], ['azul', 22], ['verde', 12], ['mel', 12], ['preto', 12]], beardProbability: 0.45, accessoryProbability: 0.25 },
  CA: europeuNorte('Canadá', { skinTones: [[0, 22], [1, 30], [2, 12], [3, 10], [4, 9], [5, 8], [6, 6], [7, 3]] }),
  // África.
  CI: africano('Costa do Marfim'), SN: africano('Senegal', { skinTones: [[5, 8], [6, 35], [7, 57]], faceShapes: [['comprido', 40], ['oval', 35], ['diamante', 25]] }),
  GH: africano('Gana'), CM: africano('Camarões'), ZA: africano('África do Sul', { skinTones: [[1, 6], [2, 4], [3, 8], [4, 10], [5, 20], [6, 30], [7, 22]] }),
  EG: arabe('Egipto', { skinTones: [[2, 12], [3, 32], [4, 34], [5, 16], [6, 6]] }), DZ: arabe('Argélia'), TN: arabe('Tunísia'),
  SA: arabe('Arábia Saudita', { skinTones: [[2, 12], [3, 30], [4, 34], [5, 18], [6, 6]], beardProbability: 0.8 }),
  IL: europeuSul('Israel'),
  // Ásia e Oceânia.
  KR: asiaLeste('Coreia do Sul', { hairStyles: { ...CABELO_ASIA_LESTE, cortina: 14, franja: 20 } }),
  CN: asiaLeste('China', { hairStyles: { ...CABELO_ASIA_LESTE, militar: 10, fade_curto: 16 } }),
  IN: { nome: 'Índia', skinTones: [[2, 8], [3, 25], [4, 32], [5, 25], [6, 10]], hairStyles: { ...CABELO_ARABE, risca_lateral: 12, liso_curto: 10 }, hairColors: [['preto', 80], ['castanho_escuro', 20]], eyeColors: OLHOS_ESCUROS, beardProbability: 0.5, accessoryProbability: 0.15, narizLargo: 0.45, labiosGrossos: 0.4 },
  AU: europeuNorte('Austrália', { skinTones: [[0, 30], [1, 38], [2, 12], [3, 8], [4, 6], [5, 3], [6, 3]], accessoryProbability: 0.25 }),
  NZ: europeuNorte('Nova Zelândia', { skinTones: [[0, 25], [1, 30], [2, 12], [3, 10], [4, 10], [5, 8], [6, 5]] }),
};

/** Preset genérico global balanceado (nacionalidades sem preset). */
export const PRESET_GLOBAL: NationalityPreset = {
  nome: 'Global',
  skinTones: [[0, 10], [1, 15], [2, 14], [3, 14], [4, 13], [5, 12], [6, 12], [7, 10]],
  hairStyles: { ...CABELO_EUROPA, ...CABELO_LATINO, ...CABELO_AFRO, ...CABELO_ASIA_LESTE, fade_curto: 14 },
  hairColors: [['preto', 35], ['castanho_escuro', 32], ['castanho_claro', 14], ['loiro', 12], ['loiro_platinado', 2], ['ruivo', 3], ['grisalho', 2]],
  eyeColors: [['castanho', 45], ['preto', 22], ['mel', 11], ['verde', 9], ['azul', 13]],
  beardProbability: 0.45, accessoryProbability: 0.2, narizLargo: 0.4, labiosGrossos: 0.4,
};

/** Códigos do jogo (FIFA) → ISO alfa-2. */
export const ISO2_DE_FIFA: Record<string, string> = {
  POR: 'PT', BRA: 'BR', ESP: 'ES', FRA: 'FR', ITA: 'IT', GER: 'DE', ENG: 'GB', SCO: 'SC', WAL: 'GB', NIR: 'GB', IRL: 'IE', NED: 'NL', BEL: 'BE',
  SUI: 'CH', AUT: 'AT', SWE: 'SE', NOR: 'NO', DEN: 'DK', FIN: 'FI', ISL: 'IS', POL: 'PL', CZE: 'CZ', SVK: 'SK', HUN: 'HU', ROU: 'RO', BUL: 'BG',
  UKR: 'UA', RUS: 'RU', CRO: 'HR', SRB: 'RS', BIH: 'BA', SVN: 'SI', MNE: 'ME', MKD: 'MK', ALB: 'AL', KOS: 'XK', GRE: 'GR', TUR: 'TR', CYP: 'GR',
  ARG: 'AR', URU: 'UY', COL: 'CO', MEX: 'MX', CHI: 'CL', PER: 'PE', ECU: 'EC', VEN: 'VE', PAR: 'PY', BOL: 'BO', USA: 'US', CAN: 'CA',
  ANG: 'AO', NGA: 'NG', CIV: 'CI', SEN: 'SN', GHA: 'GH', CMR: 'CM', RSA: 'ZA', MAR: 'MA', ALG: 'DZ', TUN: 'TN', EGY: 'EG', KSA: 'SA', UAE: 'SA', ISR: 'IL',
  JPN: 'JP', KOR: 'KR', CHN: 'CN', IND: 'IN', AUS: 'AU', NZL: 'NZ',
};

/** Preset de uma nacionalidade (ISO alfa-2 ou código do jogo); desconhecida → global. */
export function presetDe(codigo: string): NationalityPreset {
  const c = (codigo || '').toUpperCase();
  return PRESETS[c] ?? PRESETS[ISO2_DE_FIFA[c] ?? ''] ?? PRESET_GLOBAL;
}

/** Lista para filtros (código ISO e nome), por ordem alfabética do nome. */
export const NACIONALIDADES = Object.entries(PRESETS).map(([codigo, p]) => ({ codigo, nome: p.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
