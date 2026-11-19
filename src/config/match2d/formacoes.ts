// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secção 5): as formações com as duas formas, sem bola e com bola.
// Coordenadas normalizadas no referencial da equipa: x 0 = guarda-redes … 1 = baliza adversária (× 105 m); y 0 = esquerda
// … 1 = direita (× 68 m), vistos por quem ataca. A ordem dos lugares é a da formação da app (src/config/tacticas.ts),
// para o mesmo jogador ficar no mesmo lugar; `chave` é o nome do lugar no documento.

export interface LugarForma { chave: string; semBola: [number, number]; comBola: [number, number] }
export interface Forma2D { id: string; lugares: LugarForma[] }

const l = (chave: string, semBola: [number, number], comBola: [number, number]): LugarForma => ({ chave, semBola, comBola });
const GR = l('GR', [0.04, 0.5], [0.04, 0.5]);
// Linha de 4 (ordem da app: DD, DC direito, DC esquerdo, DE).
const QUATRO = (lat: number) => [l('DD', [0.2, 0.85], [lat, 0.94]), l('DCD', [0.19, 0.62], [0.2, 0.68]), l('DCE', [0.19, 0.38], [0.2, 0.32]), l('DE', [0.2, 0.15], [lat, 0.06])];

export const FORMAS_2D: Record<string, Forma2D> = {
  '4-3-3': { id: '4-3-3', lugares: [GR, l('DD', [0.2, 0.85], [0.4, 0.95]), l('DCD', [0.19, 0.62], [0.2, 0.7]), l('DCE', [0.19, 0.38], [0.2, 0.3]), l('DE', [0.2, 0.15], [0.4, 0.05]),
    l('MDC', [0.28, 0.5], [0.3, 0.5]), l('MCD', [0.36, 0.67], [0.46, 0.65]), l('MCE', [0.36, 0.33], [0.46, 0.35]), l('ED', [0.44, 0.88], [0.62, 0.92]), l('PL', [0.52, 0.5], [0.68, 0.5]), l('EE', [0.44, 0.12], [0.62, 0.08])] },
  '4-2-3-1': { id: '4-2-3-1', lugares: [GR, ...QUATRO(0.38),
    l('MDCD', [0.29, 0.6], [0.34, 0.58]), l('MDCE', [0.29, 0.4], [0.32, 0.42]), l('ED', [0.4, 0.88], [0.6, 0.9]), l('MO', [0.42, 0.5], [0.56, 0.5]), l('EE', [0.4, 0.12], [0.6, 0.1]), l('PL', [0.52, 0.5], [0.68, 0.5])] },
  '4-4-2': { id: '4-4-2', lugares: [GR, ...QUATRO(0.36),
    l('MD', [0.33, 0.87], [0.56, 0.92]), l('MCD', [0.32, 0.62], [0.42, 0.6]), l('MCE', [0.32, 0.38], [0.4, 0.4]), l('ME', [0.33, 0.13], [0.56, 0.08]), l('PLD', [0.48, 0.6], [0.68, 0.58]), l('PLE', [0.48, 0.4], [0.66, 0.42])] },
  '4-1-4-1': { id: '4-1-4-1', lugares: [GR, ...QUATRO(0.36),
    l('MDC', [0.26, 0.5], [0.3, 0.5]), l('MD', [0.34, 0.87], [0.56, 0.9]), l('MCD', [0.34, 0.62], [0.46, 0.62]), l('MCE', [0.34, 0.38], [0.46, 0.38]), l('ME', [0.34, 0.13], [0.56, 0.1]), l('PL', [0.48, 0.5], [0.68, 0.5])] },
  '3-5-2': { id: '3-5-2', lugares: [GR, l('DCD', [0.19, 0.7], [0.22, 0.75]), l('DC', [0.18, 0.5], [0.2, 0.5]), l('DCE', [0.19, 0.3], [0.22, 0.25]),
    l('AD', [0.26, 0.93], [0.54, 0.95]), l('MCD', [0.33, 0.67], [0.44, 0.67]), l('MDC', [0.28, 0.5], [0.33, 0.5]), l('MCE', [0.33, 0.33], [0.44, 0.33]), l('AE', [0.26, 0.07], [0.54, 0.05]), l('PLD', [0.47, 0.58], [0.68, 0.58]), l('PLE', [0.47, 0.42], [0.66, 0.42])] },
  '3-4-3': { id: '3-4-3', lugares: [GR, l('DCD', [0.19, 0.72], [0.22, 0.78]), l('DC', [0.18, 0.5], [0.2, 0.5]), l('DCE', [0.19, 0.28], [0.22, 0.22]),
    l('AD', [0.24, 0.94], [0.5, 0.96]), l('MCD', [0.32, 0.62], [0.38, 0.62]), l('MCE', [0.32, 0.38], [0.38, 0.38]), l('AE', [0.24, 0.06], [0.5, 0.04]), l('ED', [0.44, 0.8], [0.64, 0.75]), l('PL', [0.52, 0.5], [0.68, 0.5]), l('EE', [0.44, 0.2], [0.64, 0.25])] },
  '5-3-2': { id: '5-3-2', lugares: [GR, l('AD', [0.21, 0.93], [0.48, 0.95]), l('DCD', [0.19, 0.7], [0.22, 0.75]), l('DC', [0.18, 0.5], [0.2, 0.5]), l('DCE', [0.19, 0.3], [0.22, 0.25]), l('AE', [0.21, 0.07], [0.48, 0.05]),
    l('MCD', [0.32, 0.68], [0.42, 0.67]), l('MC', [0.3, 0.5], [0.36, 0.5]), l('MCE', [0.32, 0.32], [0.42, 0.33]), l('PLD', [0.46, 0.58], [0.68, 0.58]), l('PLE', [0.46, 0.42], [0.66, 0.42])] },
  '5-4-1': { id: '5-4-1', lugares: [GR, l('AD', [0.2, 0.93], [0.38, 0.95]), l('DCD', [0.19, 0.7], [0.21, 0.73]), l('DC', [0.18, 0.5], [0.19, 0.5]), l('DCE', [0.19, 0.3], [0.21, 0.27]), l('AE', [0.2, 0.07], [0.38, 0.05]),
    l('MD', [0.31, 0.86], [0.52, 0.86]), l('MCD', [0.3, 0.62], [0.38, 0.6]), l('MCE', [0.3, 0.38], [0.38, 0.4]), l('ME', [0.31, 0.14], [0.52, 0.14]), l('PL', [0.44, 0.5], [0.64, 0.5])] },
  // Não está no documento (definido aqui, DECISIONS 187): losango com laterais a dar a largura com bola.
  '4-4-2L': { id: '4-4-2L', lugares: [GR, ...QUATRO(0.4),
    l('MDC', [0.27, 0.5], [0.3, 0.5]), l('MCD', [0.33, 0.7], [0.44, 0.7]), l('MCE', [0.33, 0.3], [0.44, 0.3]), l('MO', [0.4, 0.5], [0.56, 0.5]), l('PLD', [0.48, 0.58], [0.68, 0.6]), l('PLE', [0.48, 0.42], [0.66, 0.4])] },
  // 4-3-3 com falso 9: as mesmas formas; o papel pl_f9 baixa 0,10 (secção 5).
  '4-3-3F9': { id: '4-3-3F9', lugares: [] },
  // 3-4-3 losango (variante Cruyff/Ajax, pedida no documento; ainda não existe na app): coordenadas definidas aqui.
  '3-4-3L': { id: '3-4-3L', lugares: [GR, l('DCD', [0.19, 0.72], [0.22, 0.78]), l('DC', [0.18, 0.5], [0.2, 0.5]), l('DCE', [0.19, 0.28], [0.22, 0.22]),
    l('MDC', [0.27, 0.5], [0.32, 0.5]), l('MCD', [0.33, 0.75], [0.42, 0.72]), l('MCE', [0.33, 0.25], [0.42, 0.28]), l('MO', [0.4, 0.5], [0.54, 0.5]), l('ED', [0.44, 0.82], [0.64, 0.92]), l('PL', [0.5, 0.5], [0.68, 0.5]), l('EE', [0.44, 0.18], [0.64, 0.08])] },
};
FORMAS_2D['4-3-3F9'].lugares = FORMAS_2D['4-3-3'].lugares;

/** Posição (da app) de cada lugar do 3-4-3 losango, que não existe em src/config/tacticas.ts. */
export const LUGARES_343L: { pos: string; papel: string }[] = [
  { pos: 'GR', papel: 'gr_cla' }, { pos: 'DC', papel: 'dc_def' }, { pos: 'DC', papel: 'dc_def' }, { pos: 'DC', papel: 'dc_con' }, { pos: 'MDC', papel: 'mdc_con' },
  { pos: 'MC', papel: 'mc_b2b' }, { pos: 'MC', papel: 'mc_cri' }, { pos: 'MO', papel: 'mo_10' }, { pos: 'ED', papel: 'ext_inv' }, { pos: 'PL', papel: 'pl_fin' }, { pos: 'EE', papel: 'ext_inv' },
];

/** Ajustes do papel à forma com bola (secção 5): x e "para dentro" (aproxima y de 0,5), normalizados. */
export const AJUSTE_PAPEL: Record<string, { x?: number; dentro?: number }> = {
  // As formas do documento são a referência neutra: o lateral ofensivo sobe 0,06 e o defensivo baixa 0,06 (diferença 0,12).
  lat_ofe: { x: 0.06 },
  lat_def: { x: -0.06 },
  ext_inv: { dentro: 0.1 },
  pl_f9: { x: -0.1 },
};

/** Transição entre as formas sem bola e com bola (s). */
export const TRANSICAO_FORMA_S = 2.0;
