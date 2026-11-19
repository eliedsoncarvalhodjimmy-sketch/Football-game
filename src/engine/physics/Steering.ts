// Steering behaviors (Seek, Arrive, Separation) para o movimento suave dos jogadores.
// A velocidade máxima, a aceleração e a capacidade de mudar de direcção vêm dos atributos (Velocidade, Aceleração,
// Agilidade). A condição física baixa reduz a velocidade máxima.
import { MOVIMENTO as M } from '../../config/decisao.ts';
import type { Position, PlayerState } from '../decision/types.ts';

export const sub = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Position, k: number): Position => ({ x: a.x * k, y: a.y * k });
export const len = (a: Position) => Math.hypot(a.x, a.y);
export const dist = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Position): Position => { const l = len(a); return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }; };
export const limitar = (a: Position, max: number): Position => { const l = len(a); return l > max ? mul(a, max / l) : a; };

/** Limites físicos do jogador (m/s, m/s², rad/s). */
export function limites(p: PlayerState) {
  const a = (k: string) => (p.attrs as Record<string, number | undefined>)[k] ?? 10;
  const fadiga = 0.75 + 0.25 * Math.max(0, Math.min(1, p.condition));
  return {
    velMax: (M.vel_base + M.vel_por_ponto * a('vel')) * fadiga,
    acelMax: M.acel_base + M.acel_por_ponto * a('ace'),
    viragem: M.viragem_base + M.viragem_por_ponto * a('agi'),
  };
}

/** Seek: velocidade desejada a toda a velocidade em direcção ao alvo. */
export function seek(pos: Position, alvo: Position, velMax: number): Position {
  return mul(norm(sub(alvo, pos)), velMax);
}

/** Arrive: como o Seek, mas abranda dentro do raio de chegada (pára no alvo). */
export function arrive(pos: Position, alvo: Position, velMax: number, raio = M.raio_chegada): Position {
  const d = sub(alvo, pos), l = len(d);
  if (l < 0.05) return { x: 0, y: 0 };
  const v = l < raio ? velMax * (l / raio) : velMax;
  return mul(d, v / l);
}

/** Separation: afasta-se dos colegas demasiado perto (força inversa à distância). */
export function separation(p: PlayerState, vizinhos: PlayerState[], raio = M.separacao_raio): Position {
  let f = { x: 0, y: 0 };
  for (const o of vizinhos) {
    if (o.id === p.id || !o.onPitch) continue;
    const d = sub(p.pos, o.pos), l = len(d);
    if (l > 0 && l < raio) f = add(f, mul(d, (raio - l) / (l * raio)));
  }
  return mul(f, M.separacao_forca);
}

/** Diferença entre dois ângulos, em (−π, π]. */
export function difAngulo(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Roda um ângulo para outro, no máximo `max` radianos. */
export function rodar(de: number, para: number, max: number): number {
  const d = difAngulo(para, de);
  return Math.abs(d) <= max ? para : de + Math.sign(d) * max;
}

/**
 * Um passo de movimento: combina Arrive (para o alvo) e Separation (dos colegas), limita a aceleração e a mudança de
 * direcção, e integra a posição. `ritmo` (0–1) é a fracção da velocidade máxima (andar ≈ 0,18, trote ≈ 0,4, correr
 * ≈ 0,65, sprint = 1). Se o jogador tiver `facing`, andar de costas ou de lado para onde olha é mais lento.
 */
export function passo(p: PlayerState, alvo: Position, colegas: PlayerState[], dt: number, ritmo = 1): { pos: Position; vel: Position } {
  const L = limites(p);
  let velMax = L.velMax * Math.max(M.ritmo_minimo, Math.min(1, ritmo));
  if (p.facing !== undefined) {
    const d = sub(alvo, p.pos);
    if (len(d) > 0.5) {
      const c = Math.cos(difAngulo(Math.atan2(d.y, d.x), p.facing));
      // De frente (c ≈ 1) a 100%; de lado (c ≈ 0) a 80%; de costas (c ≈ −1) a 55%.
      const f = c >= 0 ? M.lado + (1 - M.lado) * c : M.lado + (M.lado - M.costas) * c;
      velMax = Math.min(velMax, L.velMax * f);
    }
  }
  let desejada = add(arrive(p.pos, alvo, velMax), separation(p, colegas));
  desejada = limitar(desejada, velMax);
  // Mudança de direcção limitada pela agilidade (a velocidade roda no máximo viragem × dt por passo).
  const va = len(p.vel), vd = len(desejada);
  if (va > 1 && vd > 1) {
    const a0 = Math.atan2(p.vel.y, p.vel.x), a1 = Math.atan2(desejada.y, desejada.x);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const max = L.viragem * dt;
    if (Math.abs(da) > max) { const a = a0 + Math.sign(da) * max; desejada = { x: Math.cos(a) * vd, y: Math.sin(a) * vd }; }
  }
  // Aceleração limitada.
  const acel = limitar(sub(desejada, p.vel), L.acelMax * dt);
  const vel = add(p.vel, acel);
  return { vel, pos: add(p.pos, mul(vel, dt)) };
}
