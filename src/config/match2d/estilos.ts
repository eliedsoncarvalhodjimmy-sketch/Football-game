// Motor 2D táctico (docs/tactics/MOTOR_2D.md, secção 8.1): os 8 estilos como parâmetros. Valores de partida.
// Na Fase 1 só se usam os do bloco (linhas, comprimento, largura, deslize) e a duração das transições.
import type { IdEstilo } from '../estilos.ts';

export interface ParametrosEstilo {
  /** Altura da linha defensiva (m da própria baliza), sem e com bola. */
  linhaSemBola: number; linhaComBola: number;
  /** Comprimento do bloco sem bola (m) — com bola usa-se o comprimento natural da forma (secção 4.3). */
  comprimentoSemBola: number;
  /** Largura do bloco (m), sem e com bola, e deslize lateral (0–1). */
  larguraSemBola: number; larguraComBola: number; deslize: number;
  pressaoDistancia: number; contrapressaoS: number; pressionantes: [number, number];
  tempoBaseBola: number;
  pesoPasseCurto: number; pesoPasseLongo: number; pesoCruzamento: number; pesoDrible: number; pesoRemateLonge: number;
  aversaoRiscoProprioTerco: number; jogadoresAtaque: [number, number]; equilibrioMinimo: number;
  marcacao: 'zona' | 'individual'; liberdade: number; corredor: 'centro' | 'alas' | 'indiferente' | 'centro_ar'; atacarJa: number;
  /** Duração da transição ataque→defesa e defesa→ataque (s), dentro das faixas 4–8 e 3–6 da secção 3. */
  transAtqDefS: number; transDefAtqS: number;
}

const E = (linhaSemBola: number, linhaComBola: number, comprimentoSemBola: number, larguraSemBola: number, larguraComBola: number, deslize: number,
  pressaoDistancia: number, contrapressaoS: number, pressionantes: [number, number], tempoBaseBola: number,
  pesoPasseCurto: number, pesoPasseLongo: number, pesoCruzamento: number, pesoDrible: number, pesoRemateLonge: number,
  aversaoRiscoProprioTerco: number, jogadoresAtaque: [number, number], equilibrioMinimo: number, marcacao: 'zona' | 'individual', liberdade: number,
  corredor: ParametrosEstilo['corredor'], atacarJa: number, transAtqDefS: number, transDefAtqS: number): ParametrosEstilo => ({
  linhaSemBola, linhaComBola, comprimentoSemBola, larguraSemBola, larguraComBola, deslize, pressaoDistancia, contrapressaoS, pressionantes, tempoBaseBola,
  pesoPasseCurto, pesoPasseLongo, pesoCruzamento, pesoDrible, pesoRemateLonge, aversaoRiscoProprioTerco, jogadoresAtaque, equilibrioMinimo, marcacao, liberdade,
  corredor, atacarJa, transAtqDefS, transDefAtqS });

export const ESTILOS_2D: Record<IdEstilo, ParametrosEstilo> = {
  tiki_taka: E(42, 55, 30, 38, 62, 0.55, 14, 5, [1, 2], 1.0, 1.6, 0.3, 0.4, 1.0, 0.5, 0.6, [6, 6], 3, 'zona', 0.4, 'centro', 0.3, 5, 4),
  gegenpressen: E(48, 52, 28, 40, 56, 0.65, 22, 7, [2, 3], 1.4, 1.1, 0.8, 0.8, 1.0, 0.9, 0.8, [6, 6], 3, 'zona', 0.3, 'centro', 0.9, 7, 4),
  contra_ataque: E(28, 38, 26, 34, 54, 0.55, 8, 0, [1, 1], 1.6, 0.9, 1.5, 0.8, 1.1, 0.9, 1.2, [3, 4], 5, 'zona', 0.2, 'alas', 1.0, 4, 6),
  catenaccio: E(16, 28, 22, 30, 48, 0.45, 6, 0, [1, 1], 2.0, 0.8, 1.3, 0.9, 0.6, 0.8, 1.6, [2, 3], 7, 'individual', 0.1, 'indiferente', 0.5, 4, 3),
  jogo_direto: E(34, 40, 34, 40, 52, 0.5, 12, 2, [1, 1], 1.4, 0.6, 2.2, 1.3, 0.7, 1.1, 1.4, [4, 4], 4, 'zona', 0.2, 'centro_ar', 0.8, 5, 5),
  pelas_alas: E(36, 48, 32, 40, 66, 0.55, 12, 3, [1, 1], 1.8, 1.0, 0.9, 2.0, 1.4, 0.8, 1.0, [6, 6], 3, 'zona', 0.3, 'alas', 0.6, 5, 4),
  futebol_total: E(44, 56, 30, 40, 62, 0.6, 16, 5, [2, 2], 1.2, 1.4, 0.6, 0.7, 1.2, 0.8, 0.6, [7, 7], 2, 'zona', 0.9, 'indiferente', 0.6, 6, 4),
  bloco_medio_baixo: E(26, 36, 24, 32, 54, 0.6, 9, 0, [1, 1], 1.8, 0.9, 1.2, 1.0, 0.8, 1.0, 1.3, [3, 4], 5, 'zona', 0.15, 'alas', 0.8, 4, 5),
};
