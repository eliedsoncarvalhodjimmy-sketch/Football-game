// Camada 4 na Fase 2 (secções 6.1–6.3): OFERECER_APOIO. Os colegas mais perto do portador procuram um ponto a 8–18 m
// dele, com a linha de passe livre e em ângulo, sem dois colegas no mesmo sítio e sem sair da sua zona (desvio à âncora
// limitado pelo papel). Os outros mantêm a posição.
import { APOIO } from '../../config/match2d/bola.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { distSegmento } from '../decision/ContextBuilder.ts';
import { dist, paraEquipa } from './referencial.ts';
import type { Estado2D, Jogador2D, V2 } from './tipos.ts';

const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;

/** Desvio máximo à âncora pelo papel (secção 6.3), com a liberdade posicional do estilo (+50% no máximo). */
export function desvioMaximo(s: Estado2D, j: Jogador2D): number {
  const c = j.chave;
  const tipo = /^DC/.test(c) ? 'central' : /^(DD|DE|AD|AE)$/.test(c) ? 'lateral' : /^(ED|EE|ME|MD)$/.test(c) ? 'extremo' : /^PL/.test(c) ? 'avancado' : 'medio';
  return APOIO.desvio[tipo] * (1 + 0.5 * ESTILOS_2D[s.equipas[j.equipa].estilo].liberdade);
}

/** Pontuação de um ponto de apoio para o jogador j (maior é melhor); −Infinity se não serve. */
export function pontuarApoio(s: Estado2D, j: Jogador2D, portador: Jogador2D, p: V2, outros: V2[]): number {
  if (p.x < 2 || p.x > CAMPO_2D.comprimento - 2 || p.y < 2 || p.y > CAMPO_2D.largura - 2) return -Infinity;
  const desvio = dist(p, j.ancora), lim = desvioMaximo(s, j);
  if (desvio > lim) return -Infinity;
  // Não serve um ponto a menos de 4 m de um colega (já lá está alguém).
  for (const o of s.jogadores) if (o.equipa === j.equipa && o !== j && o !== portador && dist(o.p, p) < APOIO.ocupado_m) return -Infinity;
  const adv = s.jogadores.filter((o) => o.equipa !== j.equipa);
  let linha = Infinity, espaco = Infinity;
  for (const o of adv) { linha = Math.min(linha, distSegmento(o.p, portador.p, p)); espaco = Math.min(espaco, dist(o.p, p)); }
  const d = dist(p, portador.p);
  let u = 0;
  u += linha >= APOIO.linha_livre_m ? 1.2 : (linha / APOIO.linha_livre_m) * 1.2 - 0.6; // linha de passe livre
  u += Math.min(espaco, 8) / 8; // espaço para receber
  u -= (desvio / lim) * 0.8; // perto da sua zona
  u -= d < APOIO.raio[0] ? (APOIO.raio[0] - d) / 4 : d > APOIO.raio[1] ? (d - APOIO.raio[1]) / 4 : 0;
  for (const q of outros) if (dist(q, p) < APOIO.colega_m) u -= (APOIO.colega_m - dist(q, p)) / APOIO.colega_m; // não dois no mesmo sítio
  // Em ângulo: não na mesma linha que o portador e um colega já em apoio.
  for (const q of outros) { const a1 = Math.atan2(p.y - portador.p.y, p.x - portador.p.x), a2 = Math.atan2(q.y - portador.p.y, q.x - portador.p.x); if (Math.abs(Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2))) < 0.35) u -= 0.5; }
  // Progressão ligeira (apoio à frente vale um pouco mais), ponderada pelo trabalho de equipa e posicionamento.
  u += 0.15 * (paraEquipa(j.equipa, p).x - paraEquipa(j.equipa, portador.p).x) / 10;
  return u * (0.7 + 0.03 * (at(j, 'teq') + at(j, 'pos')) / 2);
}

/** Melhor ponto de apoio para j à volta do portador (ou null). */
export function melhorApoio(s: Estado2D, j: Jogador2D, portador: Jogador2D, outros: V2[]): { p: V2; u: number } | null {
  let best: { p: V2; u: number } | null = null;
  for (const r of APOIO.aneis) for (let k = 0; k < APOIO.angulos; k++) {
    const a = (2 * Math.PI * k) / APOIO.angulos, p = { x: portador.p.x + Math.cos(a) * r, y: portador.p.y + Math.sin(a) * r };
    const u = pontuarApoio(s, j, portador, p, outros);
    if (u > (best?.u ?? -Infinity)) best = { p, u };
  }
  return best && Number.isFinite(best.u) ? best : null;
}
