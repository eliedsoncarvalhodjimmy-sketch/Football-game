// Referenciais (secção 2.1): cada equipa raciocina no seu — x de 0 (própria baliza) a 105, y de 0 (esquerda de quem ataca)
// a 68. O estado físico guarda posições no referencial absoluto, que é o da equipa 0; a equipa 1 está rodada 180°.
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import type { Equipa, V2 } from './tipos.ts';

const COMP = CAMPO_2D.comprimento, LARG = CAMPO_2D.largura;
export const paraEquipa = (e: Equipa, p: V2): V2 => (e === 0 ? { x: p.x, y: p.y } : { x: COMP - p.x, y: LARG - p.y });
/** A rotação de 180° é a sua própria inversa. */
export const paraAbsoluto = paraEquipa;
export const anguloAbsoluto = (e: Equipa, a: number) => (e === 0 ? a : a + Math.PI);

export const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function difAngulo(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}
export function rodar(de: number, para: number, max: number): number {
  const d = difAngulo(para, de);
  return Math.abs(d) <= max ? para : de + Math.sign(d) * max;
}
