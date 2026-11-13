// Tácticas (Fase 2, Bloco B): formações com papel por posição e instruções de equipa.
// Coordenadas (x, y) em 0–100: x = comprimento do campo (0 = baliza própria), y = largura (0 = esquerda).
import type { Posicao } from './papeis.ts';

export interface Lugar {
  pos: Posicao;
  papel: string;
  x: number;
  y: number;
}

export interface Formacao {
  id: string;
  nome: string;
  lugares: Lugar[]; // 11, o GR primeiro
}

const GR: Lugar = { pos: 'GR', papel: 'gr_cla', x: 4, y: 50 };
const L = (pos: Posicao, papel: string, x: number, y: number): Lugar => ({ pos, papel, x, y });
const QUATRO = [L('DD', 'lat_ofe', 22, 88), L('DC', 'dc_def', 18, 62), L('DC', 'dc_con', 18, 38), L('DE', 'lat_def', 22, 12)];

export const FORMACOES: Formacao[] = [
  { id: '4-4-2', nome: '4-4-2', lugares: [GR, ...QUATRO, L('ED', 'ext_cla', 55, 88), L('MC', 'mc_b2b', 48, 60), L('MC', 'mc_cob', 46, 40), L('EE', 'ext_cla', 55, 12), L('PL', 'pl_fin', 82, 58), L('PL', 'pl_pre', 80, 42)] },
  { id: '4-3-3', nome: '4-3-3', lugares: [GR, ...QUATRO, L('MDC', 'mdc_con', 36, 50), L('MC', 'mc_b2b', 52, 66), L('MC', 'mc_cri', 52, 34), L('ED', 'ext_inv', 76, 86), L('PL', 'pl_fin', 84, 50), L('EE', 'ext_inv', 76, 14)] },
  { id: '4-2-3-1', nome: '4-2-3-1', lugares: [GR, ...QUATRO, L('MDC', 'mdc_tri', 36, 60), L('MDC', 'mdc_con', 36, 40), L('ED', 'ext_inv', 66, 86), L('MO', 'mo_10', 64, 50), L('EE', 'ext_cla', 66, 14), L('PL', 'pl_fin', 84, 50)] },
  { id: '4-1-4-1', nome: '4-1-4-1', lugares: [GR, ...QUATRO, L('MDC', 'mdc_tri', 34, 50), L('ED', 'ext_cla', 60, 86), L('MC', 'mc_b2b', 54, 62), L('MC', 'mc_cri', 54, 38), L('EE', 'ext_cla', 60, 14), L('PL', 'pl_fin', 84, 50)] },
  { id: '3-5-2', nome: '3-5-2', lugares: [GR, L('DC', 'dc_def', 18, 70), L('DC', 'dc_def', 16, 50), L('DC', 'dc_con', 18, 30), L('ALD', 'ala', 50, 92), L('MC', 'mc_b2b', 50, 64), L('MDC', 'mdc_con', 38, 50), L('MC', 'mc_cri', 50, 36), L('ALE', 'ala', 50, 8), L('PL', 'pl_fin', 82, 58), L('PL', 'pl_piv', 80, 42)] },
  { id: '3-4-3', nome: '3-4-3', lugares: [GR, L('DC', 'dc_def', 18, 70), L('DC', 'dc_def', 16, 50), L('DC', 'dc_con', 18, 30), L('ALD', 'ala', 50, 92), L('MC', 'mc_b2b', 46, 60), L('MC', 'mc_cri', 46, 40), L('ALE', 'ala', 50, 8), L('ED', 'ext_inv', 76, 80), L('PL', 'pl_fin', 84, 50), L('EE', 'ext_inv', 76, 20)] },
  { id: '5-3-2', nome: '5-3-2', lugares: [GR, L('ALD', 'ala', 30, 92), L('DC', 'dc_def', 16, 70), L('DC', 'dc_def', 14, 50), L('DC', 'dc_con', 16, 30), L('ALE', 'ala', 30, 8), L('MC', 'mc_cob', 46, 64), L('MDC', 'mdc_tri', 36, 50), L('MC', 'mc_b2b', 46, 36), L('PL', 'pl_fin', 80, 58), L('PL', 'pl_pre', 78, 42)] },
  { id: '4-4-2L', nome: '4-4-2 losango', lugares: [GR, ...QUATRO, L('MDC', 'mdc_tri', 34, 50), L('MC', 'mc_b2b', 50, 68), L('MC', 'mc_cri', 50, 32), L('MO', 'mo_10', 64, 50), L('PL', 'pl_fin', 82, 58), L('PL', 'pl_pre', 80, 42)] },
  // 4-3-3 igual ao anterior, mas com o avançado-centro como falso 9 (os interiores entram mais na área).
  { id: '4-3-3F9', nome: '4-3-3 (falso 9)', lugares: [GR, ...QUATRO, L('MDC', 'mdc_con', 36, 50), L('MC', 'mc_b2b', 52, 66), L('MC', 'mc_cri', 52, 34), L('ED', 'ext_inv', 76, 86), L('PL', 'pl_f9', 74, 50), L('EE', 'ext_inv', 76, 14)] },
];

export const FORMACAO_POR_ID: Record<string, Formacao> = Object.fromEntries(FORMACOES.map((f) => [f.id, f]));

/** Instruções de equipa (−1, 0, +1; mentalidade −2..+2). Poucas e com efeito claro e medido nos ratings. */
export interface Instrucoes {
  mentalidade: number; // −2 muito defensiva … +2 muito ofensiva
  pressao: number; // −1 baixa, 0 média, +1 alta
  linha: number; // −1 recuada, 0 normal, +1 subida
  largura: number; // −1 estreita, 0 normal, +1 larga
  ritmo: number; // −1 lento, 0 normal, +1 rápido
}

export const INSTRUCOES_NEUTRAS: Instrucoes = { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 0 };

/**
 * Efeito de cada instrução nos ratings (fracção por unidade). Ex.: mentalidade +1 → criação +3%,
 * finalização +3%, transição defensiva −4%, defesa da área −2%.
 */
export const EFEITO_INSTRUCOES: Record<keyof Instrucoes, Partial<Record<string, number>>> = {
  mentalidade: { criacao: 0.03, finalizacao: 0.03, transicao: -0.04, defesa_area: -0.02 },
  pressao: { pressao: 0.06, transicao: -0.03, construcao: 0.01 },
  linha: { pressao: 0.03, transicao: -0.05, defesa_area: 0.01 },
  largura: { criacao: 0.02, aereo: 0.03, construcao: -0.01, transicao: -0.01 },
  ritmo: { criacao: 0.02, construcao: -0.03, pressao: 0.01 },
};

/** Custo físico: pressão alta e ritmo rápido cansam mais (fracção a mais de perda de condição por unidade). */
export const CANSACO_INSTRUCOES = { pressao: 0.12, ritmo: 0.06 };
