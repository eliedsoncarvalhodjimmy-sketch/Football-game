// Camada 7 (secção 10.3): física da bola e previsão da trajectória; quem consegue chegar a um ponto da trajectória
// antes da bola. A bola só muda de dono com contacto físico: o jogador tem de estar no ponto da bola.
import { hyp } from './referencial.ts';
import { BOLA, RECEPCAO } from '../../config/match2d/bola.ts';
import { CAMPO_2D, TICK_S } from '../../config/match2d/fisica.ts';
import { limitesFisicos, reaccaoCansaco } from './fisica.ts';
import type { Jogador2D, V2 } from './tipos.ts';

const B = { ...BOLA }, R = { ...RECEPCAO };
const DECAI_01 = Math.exp(-B.atrito_k * 0.1), AR_01 = Math.exp(-B.ar_k * 0.1);

/** Avança a bola rasteira dt segundos: dv/dt = −k·v − c (no sentido do movimento). */
export function avancarBola(p: V2, v: V2, dt: number): { p: V2; v: V2 } {
  const s = hyp(v.x, v.y);
  if (s < 1e-3) return { p, v: { x: 0, y: 0 } };
  const ns = Math.max(0, s * (dt === 0.1 ? DECAI_01 : Math.exp(-B.atrito_k * dt)) - B.rolamento_c * dt);
  const media = (s + ns) / 2;
  return { p: { x: p.x + (v.x / s) * media * dt, y: p.y + (v.y / s) * media * dt }, v: { x: (v.x / s) * ns, y: (v.y / s) * ns } };
}

export interface EstadoBola3D { p: V2; z: number; v: V2; vz: number; /** Efeito (Magnus), rad/s: só actua no ar. */ efeito?: number }

/**
 * Avança a bola dt segundos em 3D. No ar: gravidade, arrasto ligeiro e, ao chegar ao chão, ressalto (perde 55% da
 * velocidade vertical e 25% da horizontal) até deixar de ressaltar; depois rola (avancarBola).
 */
export function avancarBola3D(b: EstadoBola3D, dt: number): EstadoBola3D {
  if (b.z <= 0 && b.vz <= 0) { const r = avancarBola(b.p, b.v, dt); return { p: r.p, v: r.v, z: 0, vz: 0 }; }
  const f = dt === 0.1 ? AR_01 : Math.exp(-B.ar_k * dt);
  // Efeito (Magnus, Anexo C C2): aceleração lateral = efeito × (−vy, vx); a bola curva no ar e nunca no chão.
  const ef = b.efeito ?? 0, vx0 = b.v.x - b.v.y * ef * dt, vy0 = b.v.y + b.v.x * ef * dt;
  const v = { x: vx0 * f, y: vy0 * f };
  let z = b.z + b.vz * dt - 0.5 * B.g * dt * dt, vz = b.vz - B.g * dt;
  let vh = v;
  if (z <= 0) {
    z = 0;
    if (-vz > B.ressalto_min_vz) { vz = -vz * B.ressalto_vz; vh = { x: v.x * B.ressalto_h, y: v.y * B.ressalto_h }; }
    else vz = 0;
  }
  return { p: { x: b.p.x + ((b.v.x + v.x) / 2) * dt, y: b.p.y + ((b.v.y + v.y) / 2) * dt }, v: vh, z, vz, efeito: z > 0 ? ef : 0 };
}

export interface PontoTraj { t: number; p: V2; z: number; s: number }

/** Trajectória prevista (pontos a cada passo, com o tempo, a altura e a velocidade), até parar, sair ou o horizonte. */
export function preverTrajectoria(p: V2, v: V2, z = 0, vz = 0): PontoTraj[] {
  const out: PontoTraj[] = [];
  let b: EstadoBola3D = { p, v, z, vz };
  for (let t = B.previsao_passo_s; t <= B.previsao_s + 1e-9; t += B.previsao_passo_s) {
    b = avancarBola3D(b, B.previsao_passo_s);
    const s = hyp(b.v.x, b.v.y);
    out.push({ t, p: b.p, z: b.z, s });
    if ((s < 0.05 && b.z <= 0) || b.p.x < -1 || b.p.x > CAMPO_2D.comprimento + 1 || b.p.y < -1 || b.p.y > CAMPO_2D.largura + 1) break;
  }
  return out;
}

/** Passe pelo ar: velocidade horizontal e vertical para cair a d metros com altura máxima h (o arrasto é compensado). */
export function lancamentoAereo(d: number, h: number): { vh: number; vz: number; voo: number } {
  const vz = Math.sqrt(2 * B.g * h), voo = (2 * vz) / B.g;
  // Com arrasto k: distância = vh·(1 − e^{−k·T})/k ⇒ vh = d·k/(1 − e^{−k·T}).
  const vh = (d * B.ar_k) / (1 - Math.exp(-B.ar_k * voo));
  return { vh, vz, voo };
}

/** Velocidade inicial de um passe rasteiro para percorrer d metros no tempo t(d) = a + b × d. */
export function velocidadePasse(d: number): number {
  const t = B.tempo_a + B.tempo_b * d, k = B.atrito_k, c = B.rolamento_c;
  // x(t) = (v0 + c/k)(1 − e^{−kt})/k − (c/k)·t  ⇒  v0 = (d + (c/k)·t)·k/(1 − e^{−kt}) − c/k
  const v0 = ((d + (c / k) * t) * k) / (1 - Math.exp(-k * t)) - c / k;
  return Math.max(B.passe_vmin, Math.min(B.passe_vmax, v0));
}

/**
 * Tempo que o jogador leva a chegar (ao alcance) de um ponto: reacção + corrida com aceleração a partir da velocidade que
 * já leva nessa direcção, até à velocidade máxima (um arranque parado para 3 m demora ~1 s, não 0,4 s).
 */
export function tempoChegada(j: Jogador2D, alvo: V2, reaccao = true, alcance = B.alcance): number {
  const L = limitesFisicos(j);
  const dx = alvo.x - j.p.x, dy = alvo.y - j.p.y, dd = hyp(dx, dy);
  const d = Math.max(0, dd - alcance);
  const ant = (j.attrs as Record<string, number | undefined>).ant ?? 10;
  const tr = reaccao ? R.reaccao_base - R.reaccao_ant * ant + reaccaoCansaco(j) : 0;
  if (d <= 0) return tr;
  const v0 = dd > 1e-6 ? Math.max(0, Math.min(L.velMax, (j.v.x * dx + j.v.y * dy) / dd)) : 0, a = L.acel, vm = L.velMax;
  const dAcel = (vm * vm - v0 * v0) / (2 * a); // distância até chegar à velocidade máxima
  const t = d <= dAcel ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * d)) / a : (vm - v0) / a + (d - dAcel) / vm;
  return tr + t;
}

/** Primeiro ponto jogável da trajectória (abaixo da altura que o jogador alcança) a que chega antes (ou ao mesmo tempo)
 *  que a bola; null se nenhum. `zMax`: 2,5 m de cabeça (o GR na área chega mais alto); `alcance`: maior no GR. */
export function pontoIntercepcao(j: Jogador2D, traj: { t: number; p: V2; z?: number }[], folga = 0, zMax = B.z_cabeca, alcance = B.alcance): { t: number; p: V2; folga: number; z: number } | null {
  for (const q of traj) {
    if ((q.z ?? 0) > zMax) continue;
    const tj = tempoChegada(j, q.p, true, alcance);
    if (tj <= q.t + folga) return { t: q.t, p: q.p, folga: q.t - tj, z: q.z ?? 0 };
  }
  return null;
}

export const TICKS_SEM_RETOQUE = Math.round(B.sem_retoque_s / TICK_S);
