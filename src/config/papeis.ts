// Posições, papéis e pesos (aprovados pelo utilizador na Paragem A da Fase 2:
// "por enquanto está ok"). Pesos: 5 essencial, 4 muito importante, 3 importante,
// 2 útil, 1 marginal; atributos não listados = 0.
//   adequação ao papel (1–20) = média dos atributos ponderada pelos pesos do papel
//   OVR da posição (1–100) = 1 + 99 × (adequação média aos papéis da posição − 1) / 19
import type { IdAtributo } from './atributos.ts';

export const POSICOES = ['GR', 'DC', 'DD', 'DE', 'ALD', 'ALE', 'MDC', 'MC', 'MO', 'ED', 'EE', 'PL'] as const;
export type Posicao = (typeof POSICOES)[number];
export const N_POS = POSICOES.length;
export const IDX_POS: Record<Posicao, number> = Object.fromEntries(POSICOES.map((p, i) => [p, i])) as Record<Posicao, number>;

export const NOME_POSICAO: Record<Posicao, string> = {
  GR: 'Guarda-redes', DC: 'Defesa central', DD: 'Defesa direito', DE: 'Defesa esquerdo', ALD: 'Ala direito', ALE: 'Ala esquerdo',
  MDC: 'Médio defensivo', MC: 'Médio centro', MO: 'Médio ofensivo', ED: 'Extremo direito', EE: 'Extremo esquerdo', PL: 'Ponta de lança',
};

export interface Papel {
  id: string;
  nome: string;
  posicoes: Posicao[];
  pesos: Partial<Record<IdAtributo, number>>;
}

export const PAPEIS: Papel[] = [
  { id: 'gr_cla', nome: 'Guarda-redes clássico', posicoes: ['GR'],
    pesos: { ref: 5, uco: 4, peg: 4, jae: 4, cma: 4, pos: 4, com: 3, con: 3, cmp: 3, agi: 3, ant: 2, dec: 2, jpe: 1, pon: 1, imp: 1 } },
  { id: 'gr_lib', nome: 'Guarda-redes líbero', posicoes: ['GR'],
    pesos: { uco: 5, ref: 4, jpe: 4, cma: 4, ant: 4, pon: 3, dec: 3, cmp: 3, ace: 3, peg: 3, jae: 3, com: 2, vel: 2, agi: 2 } },
  { id: 'dc_def', nome: 'Central defensivo', posicoes: ['DC'],
    pesos: { mar: 5, des: 5, pos: 5, cab: 4, for: 4, con: 4, imp: 3, ant: 3, agr: 2, cmp: 2, dec: 2, vel: 2, equ: 2, det: 1 } },
  { id: 'dc_con', nome: 'Central construtor', posicoes: ['DC'],
    pesos: { des: 4, mar: 4, pos: 4, pas: 4, cmp: 4, plo: 3, ptq: 3, ant: 3, dec: 3, con: 3, cab: 3, vis: 2, tec: 2, for: 2, vel: 2 } },
  { id: 'lat_def', nome: 'Lateral defensivo', posicoes: ['DD', 'DE'],
    pesos: { des: 4, mar: 4, pos: 4, ant: 3, con: 3, vel: 3, ace: 3, res: 3, teq: 2, pas: 2, cru: 1, equ: 1, for: 1 } },
  { id: 'lat_ofe', nome: 'Lateral ofensivo', posicoes: ['DD', 'DE'],
    pesos: { cru: 4, res: 4, vel: 4, ace: 3, dri: 3, pas: 3, ctr: 3, des: 3, teq: 2, msb: 2, mar: 2, pos: 2, ptq: 2, tec: 2 } },
  { id: 'ala', nome: 'Ala (linha de 3)', posicoes: ['ALD', 'ALE'],
    pesos: { res: 5, cru: 4, ctr: 4, vel: 4, ace: 3, dri: 3, pas: 3, msb: 3, teq: 3, des: 2, mar: 2, pos: 2, ptq: 2, agi: 1 } },
  { id: 'mdc_tri', nome: 'Trinco', posicoes: ['MDC'],
    pesos: { des: 5, pos: 5, mar: 4, ant: 4, con: 3, ctr: 3, agr: 3, for: 3, dec: 3, teq: 3, res: 3, pas: 2, cmp: 2 } },
  { id: 'mdc_con', nome: 'Médio construtor recuado', posicoes: ['MDC'],
    pesos: { pas: 5, plo: 4, vis: 4, dec: 4, cmp: 4, ptq: 3, tec: 3, pos: 3, ant: 3, des: 2, teq: 2, con: 2 } },
  { id: 'mc_b2b', nome: 'Box-to-box', posicoes: ['MC'],
    pesos: { res: 5, ctr: 5, pas: 3, des: 3, msb: 3, ant: 3, dec: 3, teq: 3, det: 3, rld: 2, fin: 2, vel: 2, ace: 2, for: 2, ptq: 2 } },
  { id: 'mc_cri', nome: 'Médio criativo', posicoes: ['MC'],
    pesos: { pas: 5, vis: 5, tec: 4, ptq: 4, dec: 4, cmp: 3, dri: 3, msb: 3, plo: 3, ant: 2, rld: 2, agi: 2 } },
  { id: 'mc_cob', nome: 'Médio de cobertura', posicoes: ['MC'],
    pesos: { pos: 4, des: 4, teq: 4, ctr: 4, dec: 3, pas: 3, ant: 3, con: 3, res: 3, mar: 3, cmp: 2, ptq: 2 } },
  { id: 'mo_10', nome: '10 clássico', posicoes: ['MO'],
    pesos: { vis: 5, pas: 5, tec: 5, ptq: 4, dec: 4, cmp: 4, dri: 3, msb: 3, agi: 3, rld: 3, fin: 2, bpa: 2 } },
  { id: 'mo_che', nome: 'Segundo médio que entra na área', posicoes: ['MO'],
    pesos: { msb: 5, fin: 4, ant: 4, cmp: 3, ptq: 3, rld: 3, dri: 3, ace: 3, pas: 3, ctr: 3, dec: 3, tec: 2, res: 2 } },
  { id: 'ext_cla', nome: 'Extremo clássico', posicoes: ['ED', 'EE'],
    pesos: { cru: 5, vel: 5, ace: 5, dri: 4, tec: 3, ptq: 3, agi: 3, msb: 3, res: 2, pas: 2, ctr: 2 } },
  { id: 'ext_inv', nome: 'Extremo invertido', posicoes: ['ED', 'EE'],
    pesos: { dri: 5, fin: 4, rld: 4, ace: 4, vel: 4, tec: 4, agi: 4, ptq: 3, msb: 3, cmp: 3, pas: 2, dec: 2 } },
  { id: 'pl_fin', nome: 'Finalizador', posicoes: ['PL'],
    pesos: { fin: 5, msb: 5, cmp: 4, ant: 4, ptq: 3, cab: 3, ace: 3, vel: 3, equ: 2, dec: 2, tec: 2, agi: 2 } },
  { id: 'pl_f9', nome: 'Falso 9', posicoes: ['PL'],
    pesos: { ptq: 5, pas: 4, vis: 4, tec: 4, dec: 4, msb: 4, cmp: 4, dri: 3, fin: 3, agi: 3, ant: 3, teq: 3 } },
  { id: 'pl_piv', nome: 'Pivô', posicoes: ['PL'],
    pesos: { for: 5, cab: 5, imp: 4, equ: 4, ptq: 3, fin: 3, teq: 3, cmp: 2, msb: 2, pas: 2, ant: 2, agr: 1 } },
  { id: 'pl_pre', nome: 'Avançado de pressão', posicoes: ['PL'],
    pesos: { ctr: 5, res: 5, agr: 4, ace: 4, teq: 4, ant: 3, vel: 3, fin: 3, msb: 3, det: 3, des: 2, for: 2 } },
];
export const N_PAPEIS = PAPEIS.length; // 20
export const IDX_PAPEL: Record<string, number> = Object.fromEntries(PAPEIS.map((p, i) => [p.id, i]));

/** Papéis de cada posição (o OVR da posição é a média das adequações a estes papéis). */
export const PAPEIS_DA_POSICAO: Record<Posicao, number[]> = Object.fromEntries(
  POSICOES.map((p) => [p, PAPEIS.map((r, i) => (r.posicoes.includes(p) ? i : -1)).filter((i) => i >= 0)]),
) as Record<Posicao, number[]>;

/** Familiaridade (1–20): natural 18–20, competente 10–17, desconfortável < 10. */
export const FAMILIARIDADE = {
  natural: 18,
  competente: 10,
  /** Penalização do rendimento por nível (interpolada linearmente dentro de cada faixa). */
  penalizacao: {
    natural: 0,
    competente: { em17: 0.03, em10: 0.08 },
    desconfortavel: { em9: 0.15, em1: 0.25 },
  },
};

/** Factor de rendimento (0,75–1) pela familiaridade com a posição. */
export function factorFamiliaridade(f: number): number {
  const p = FAMILIARIDADE.penalizacao;
  if (f >= FAMILIARIDADE.natural) return 1;
  if (f >= FAMILIARIDADE.competente) return 1 - (p.competente.em17 + ((17 - f) / 7) * (p.competente.em10 - p.competente.em17));
  return 1 - (p.desconfortavel.em9 + ((9 - Math.max(1, f)) / 8) * (p.desconfortavel.em1 - p.desconfortavel.em9));
}

/**
 * Familiaridade gerada com outras posições, a partir da natural: [mín, máx] em 1–20.
 * Ex.: um DD natural é competente a DE e ALD; um GR é desconfortável em tudo o resto.
 */
export const VIZINHANCA: Partial<Record<Posicao, Partial<Record<Posicao, [number, number]>>>> = {
  GR: {},
  DC: { MDC: [8, 15], DD: [6, 13], DE: [6, 13] },
  DD: { DE: [9, 16], ALD: [12, 18], DC: [6, 12], ED: [5, 11], ALE: [6, 12] },
  DE: { DD: [9, 16], ALE: [12, 18], DC: [6, 12], EE: [5, 11], ALD: [6, 12] },
  ALD: { DD: [12, 18], ED: [9, 16], ALE: [8, 14], MC: [4, 10] },
  ALE: { DE: [12, 18], EE: [9, 16], ALD: [8, 14], MC: [4, 10] },
  MDC: { MC: [12, 18], DC: [8, 15] },
  MC: { MDC: [10, 17], MO: [10, 17], ED: [4, 10], EE: [4, 10] },
  MO: { MC: [10, 17], PL: [8, 15], ED: [7, 14], EE: [7, 14] },
  ED: { EE: [8, 16], MO: [6, 13], PL: [6, 13], ALD: [6, 12] },
  EE: { ED: [8, 16], MO: [6, 13], PL: [6, 13], ALE: [6, 12] },
  PL: { MO: [7, 14], ED: [5, 12], EE: [5, 12] },
};
