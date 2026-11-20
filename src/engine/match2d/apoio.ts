// Camada 4 na Fase 2 (secções 6.1–6.3): OFERECER_APOIO. Os colegas mais perto do portador procuram um ponto a 8–18 m
// dele, com a linha de passe livre e em ângulo, sem dois colegas no mesmo sítio e sem sair da sua zona (desvio à âncora
// limitado pelo papel). Os outros mantêm a posição.
import { APOIO } from '../../config/match2d/bola.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { dist, paraEquipa } from './referencial.ts';
import type { Estado2D, Jogador2D, V2 } from './tipos.ts';

const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;

/** Desvio máximo à âncora pelo papel (secção 6.3), com a liberdade posicional do estilo (+50% no máximo). */
export function desvioMaximo(s: Estado2D, j: Jogador2D): number {
  const c = j.chave;
  const tipo = /^DC/.test(c) ? 'central' : /^(DD|DE|AD|AE)$/.test(c) ? 'lateral' : /^(ED|EE|ME|MD)$/.test(c) ? 'extremo' : /^PL/.test(c) ? 'avancado' : 'medio';
  return APOIO.desvio[tipo] * (1 + 0.5 * ESTILOS_2D[s.equipas[j.equipa].estilo].liberdade);
}

/** Distância de um ponto a um segmento (sem raízes até ao fim). */
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

/** O que não muda entre os pontos candidatos de uma decisão (listas, limite, factor do jogador). */
interface ContextoApoio { j: Jogador2D; portador: Jogador2D; colegas: Jogador2D[]; adv: Jogador2D[]; lim: number; factor: number; xPort: number; outros: V2[]; angOutros: number[] }
function contexto(s: Estado2D, j: Jogador2D, portador: Jogador2D, outros: V2[]): ContextoApoio {
  return { j, portador, outros, lim: desvioMaximo(s, j), factor: 0.7 + 0.03 * (at(j, 'teq') + at(j, 'pos')) / 2,
    colegas: s.jogadores.filter((o) => o.equipa === j.equipa && o !== j && o.id !== portador.id), adv: s.jogadores.filter((o) => o.equipa !== j.equipa),
    xPort: paraEquipa(j.equipa, portador.p).x, angOutros: outros.map((q) => Math.atan2(q.y - portador.p.y, q.x - portador.p.x)) };
}

function pontuar(c: ContextoApoio, p: V2): number {
  if (p.x < 2 || p.x > CAMPO_2D.comprimento - 2 || p.y < 2 || p.y > CAMPO_2D.largura - 2) return -Infinity;
  const { j, portador } = c;
  const desvio = dist(p, j.ancora);
  if (desvio > c.lim) return -Infinity;
  // Não serve um ponto a menos de 4 m de um colega (já lá está alguém).
  const oc2 = APOIO.ocupado_m * APOIO.ocupado_m;
  for (const o of c.colegas) { const dx = o.p.x - p.x, dy = o.p.y - p.y; if (dx * dx + dy * dy < oc2) return -Infinity; }
  let linha = Infinity, espaco = Infinity;
  for (const o of c.adv) { linha = Math.min(linha, distSeg(o.p.x, o.p.y, portador.p.x, portador.p.y, p.x, p.y)); espaco = Math.min(espaco, dist(o.p, p)); }
  const d = dist(p, portador.p);
  let u = 0;
  u += linha >= APOIO.linha_livre_m ? 1.2 : (linha / APOIO.linha_livre_m) * 1.2 - 0.6; // linha de passe livre
  u += Math.min(espaco, 8) / 8; // espaço para receber
  u -= (desvio / c.lim) * 0.8; // perto da sua zona
  u -= d < APOIO.raio[0] ? (APOIO.raio[0] - d) / 4 : d > APOIO.raio[1] ? (d - APOIO.raio[1]) / 4 : 0;
  for (const q of c.outros) { const dq = dist(q, p); if (dq < APOIO.colega_m) u -= (APOIO.colega_m - dq) / APOIO.colega_m; } // não dois no mesmo sítio
  // Em ângulo: não na mesma linha que o portador e um colega já em apoio.
  const a1 = Math.atan2(p.y - portador.p.y, p.x - portador.p.x);
  for (const a2 of c.angOutros) if (Math.abs(Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2))) < APOIO.mesma_linha_rad) u -= APOIO.mesma_linha_pen;
  // Progressão ligeira (apoio à frente vale um pouco mais), ponderada pelo trabalho de equipa e posicionamento.
  u += 0.15 * (paraEquipa(j.equipa, p).x - c.xPort) / 10;
  return u * c.factor;
}

/** Pontuação de um ponto de apoio para o jogador j (maior é melhor); −Infinity se não serve. */
export function pontuarApoio(s: Estado2D, j: Jogador2D, portador: Jogador2D, p: V2, outros: V2[]): number {
  return pontuar(contexto(s, j, portador, outros), p);
}

/** Melhor ponto de apoio para j à volta do portador (ou null). */
export function melhorApoio(s: Estado2D, j: Jogador2D, portador: Jogador2D, outros: V2[]): { p: V2; u: number } | null {
  const c = contexto(s, j, portador, outros);
  let best: { p: V2; u: number } | null = null;
  for (const r of APOIO.aneis) for (let k = 0; k < APOIO.angulos; k++) {
    const a = (2 * Math.PI * k) / APOIO.angulos, p = { x: portador.p.x + Math.cos(a) * r, y: portador.p.y + Math.sin(a) * r };
    const u = pontuar(c, p);
    if (u > (best?.u ?? -Infinity)) best = { p, u };
  }
  return best && Number.isFinite(best.u) ? best : null;
}
