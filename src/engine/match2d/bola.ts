// Camada 7 (secção 10.3): física da bola e previsão da trajectória; quem consegue chegar a um ponto da trajectória
// antes da bola. A bola só muda de dono com contacto físico: o jogador tem de estar no ponto da bola.
import { hyp } from './referencial.ts';
import { BOLA, RECEPCAO } from '../../config/match2d/bola.ts';
import { CAMPO_2D, TICK_S } from '../../config/match2d/fisica.ts';
import { limitesFisicos } from './fisica.ts';
import type { Jogador2D, V2 } from './tipos.ts';

const B = { ...BOLA }, R = { ...RECEPCAO };

/** Avança a bola rasteira dt segundos: dv/dt = −k·v − c (no sentido do movimento). */
export function avancarBola(p: V2, v: V2, dt: number): { p: V2; v: V2 } {
  const s = hyp(v.x, v.y);
  if (s < 1e-3) return { p, v: { x: 0, y: 0 } };
  const ns = Math.max(0, s * Math.exp(-B.atrito_k * dt) - B.rolamento_c * dt);
  const media = (s + ns) / 2;
  return { p: { x: p.x + (v.x / s) * media * dt, y: p.y + (v.y / s) * media * dt }, v: { x: (v.x / s) * ns, y: (v.y / s) * ns } };
}

/** Trajectória prevista (pontos a cada passo, com o tempo e a velocidade), até parar, sair do campo ou o horizonte. */
export function preverTrajectoria(p: V2, v: V2): { t: number; p: V2; s: number }[] {
  const out: { t: number; p: V2; s: number }[] = [];
  let q = p, w = v;
  for (let t = B.previsao_passo_s; t <= B.previsao_s + 1e-9; t += B.previsao_passo_s) {
    ({ p: q, v: w } = avancarBola(q, w, B.previsao_passo_s));
    const s = hyp(w.x, w.y);
    out.push({ t, p: q, s });
    if (s < 0.05 || q.x < -1 || q.x > CAMPO_2D.comprimento + 1 || q.y < -1 || q.y > CAMPO_2D.largura + 1) break;
  }
  return out;
}

/** Velocidade inicial de um passe rasteiro para percorrer d metros no tempo t(d) = a + b × d. */
export function velocidadePasse(d: number): number {
  const t = B.tempo_a + B.tempo_b * d, k = B.atrito_k, c = B.rolamento_c;
  // x(t) = (v0 + c/k)(1 − e^{−kt})/k − (c/k)·t  ⇒  v0 = (d + (c/k)·t)·k/(1 − e^{−kt}) − c/k
  const v0 = ((d + (c / k) * t) * k) / (1 - Math.exp(-k * t)) - c / k;
  return Math.max(B.passe_vmin, Math.min(B.passe_vmax, v0));
}

/** Tempo que o jogador leva a chegar (ao alcance) de um ponto: reacção + distância ÷ velocidade média. */
export function tempoChegada(j: Jogador2D, alvo: V2, reaccao = true): number {
  const L = limitesFisicos(j);
  const d = Math.max(0, hyp(alvo.x - j.p.x, alvo.y - j.p.y) - B.alcance);
  const ant = (j.attrs as Record<string, number | undefined>).ant ?? 10;
  return (reaccao ? R.reaccao_base - R.reaccao_ant * ant : 0) + d / (L.velMax * R.vel_media_factor);
}

/** Primeiro ponto da trajectória a que o jogador chega antes (ou ao mesmo tempo) que a bola; null se nenhum. */
export function pontoIntercepcao(j: Jogador2D, traj: { t: number; p: V2 }[], folga = 0): { t: number; p: V2; folga: number } | null {
  for (const q of traj) {
    const tj = tempoChegada(j, q.p);
    if (tj <= q.t + folga) return { t: q.t, p: q.p, folga: q.t - tj };
  }
  return null;
}

export const TICKS_SEM_RETOQUE = Math.round(B.sem_retoque_s / TICK_S);
