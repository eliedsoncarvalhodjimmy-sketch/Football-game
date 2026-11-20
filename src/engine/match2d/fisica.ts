// Camada 6 (secção 10.1): movimento fisicamente realista. Velocidade máxima, aceleração e desaceleração pelos atributos;
// a capacidade de virar desce com a velocidade (em sprint não se muda 90° de repente); segue a âncora sem oscilar
// (velocidade da âncora + erro ÷ τ, com zona morta); separação de 3 m entre colegas; corpo orientado.
import { FISICA, CAMPO_2D } from '../../config/match2d/fisica.ts';
import { difAngulo, rodar, hyp } from './referencial.ts';
import type { Intensidade, Jogador2D, V2 } from './tipos.ts';

// Cópia local (lida a cada passo de cada jogador: evita o custo da ligação de importação em desenvolvimento).
const F = { ...FISICA }, COMP = CAMPO_2D.comprimento, LARG = CAMPO_2D.largura;

const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;

export function limitesFisicos(j: Jogador2D) {
  const acel = F.acel_base + F.acel_por_ponto * at(j, 'ace');
  return { velMax: F.vel_base + F.vel_por_ponto * at(j, 'vel'), acel, desacel: acel * F.desacel_factor };
}

/** Velocidade angular máxima (rad/s) à velocidade v: parado roda quase no sítio; em sprint, devagar. */
export function viragemMax(j: Jogador2D, v: number) {
  return (F.viragem_base + F.viragem_agi * at(j, 'agi') + F.viragem_equ * at(j, 'equ')) / (1 + v / F.viragem_v_ref);
}

export function velocidadeIntensidade(j: Jogador2D, i: Intensidade) {
  const L = limitesFisicos(j);
  return Math.min(L.velMax, i === 'andar' ? F.andar : i === 'trote' ? F.trote : i === 'corrida' ? F.corrida : L.velMax);
}

/** Intensidade pela distância ao alvo (e sprint só em acções que o justificam). */
export function intensidadePara(d: number, sprint: boolean): Intensidade {
  if (sprint) return 'sprint';
  return d < F.dist_trote ? 'andar' : d < F.dist_corrida ? 'trote' : 'corrida';
}

/**
 * Um passo de movimento (dt em s de jogo). `alvo` e `vAlvo` (velocidade do alvo) estão no referencial absoluto.
 * `olhar`: para onde o corpo vira quando vai devagar (a bola).
 */
export function moverJogador(j: Jogador2D, alvo: V2, vAlvo: V2, intensidade: Intensidade, colegas: Jogador2D[], olhar: V2, dt: number) {
  const L = limitesFisicos(j);
  const cap = Math.max(velocidadeIntensidade(j, intensidade), Math.min(L.velMax, hyp(vAlvo.x, vAlvo.y) * 1.15));
  // Velocidade desejada: acompanhar o alvo (a sua velocidade) e corrigir o erro; dentro da zona morta, só acompanhar.
  const ex = alvo.x - j.p.x, ey = alvo.y - j.p.y, e = hyp(ex, ey);
  const corr = e < F.zona_morta_m ? 0 : (e - F.zona_morta_m) / e / F.seguir_tau_s;
  let dx = vAlvo.x + ex * corr, dy = vAlvo.y + ey * corr;
  // Separação dos colegas (a menos de 3 m).
  for (const o of colegas) {
    if (o === j) continue;
    const sx = j.p.x - o.p.x, sy = j.p.y - o.p.y, d = hyp(sx, sy);
    if (d > 0.01 && d < F.separacao_m) { const f = (F.separacao_forca * (F.separacao_m - d)) / F.separacao_m / d; dx += sx * f; dy += sy * f; }
  }
  let sd = hyp(dx, dy);
  if (sd > cap) { dx *= cap / sd; dy *= cap / sd; sd = cap; }
  // Intenção suavizada: o jogador não corrige a trajectória dez vezes por segundo (filtro de τ = intencao_s).
  if (j.intencao) { const k = 1 - Math.exp(-dt / F.intencao_s); dx = j.intencao.x + (dx - j.intencao.x) * k; dy = j.intencao.y + (dy - j.intencao.y) * k; sd = hyp(dx, dy); }
  j.intencao = { x: dx, y: dy };
  // Física: direcção com viragem limitada pela velocidade; velocidade com aceleração e travagem limitadas.
  const s = hyp(j.v.x, j.v.y);
  // Limite de velocidade de lado ou de costas para onde o corpo olha.
  const limCorpo = (ang: number) => { const c = Math.cos(difAngulo(ang, j.corpo)); return L.velMax * (c >= 0 ? F.lado + (1 - F.lado) * c : F.lado + (F.lado - F.costas) * c); };
  let th: number, ns: number;
  if (s < F.devagar_ms) {
    // Devagar (passos curtos): a velocidade muda como um vector, limitada pela aceleração (a ganhar) e pela travagem
    // (a perder). Para inverter o sentido tem de parar primeiro — nunca passa de um sentido ao oposto num instante.
    if (sd > 0.05) { const lim = Math.min(sd, limCorpo(Math.atan2(dy, dx))); dx *= lim / sd; dy *= lim / sd; }
    const ax = dx - j.v.x, ay = dy - j.v.y, a = hyp(ax, ay);
    const max = (ax * j.v.x + ay * j.v.y < 0 ? L.desacel : L.acel) * dt;
    const k = a > max ? max / a : 1;
    const vx = j.v.x + ax * k, vy = j.v.y + ay * k;
    ns = hyp(vx, vy); th = ns > 1e-6 ? Math.atan2(vy, vx) : Math.atan2(dy, dx);
  } else {
    // A andar depressa ou a correr: a direcção roda com limite (menos quanto mais depressa) e a velocidade muda com a
    // aceleração e a travagem; a virar, abranda.
    th = Math.atan2(j.v.y, j.v.x);
    let alvoS = sd;
    if (sd > 0.05) {
      const thd = Math.atan2(dy, dx);
      th = rodar(th, thd, viragemMax(j, s) * dt);
      alvoS = Math.min(sd * Math.max(0, Math.cos(difAngulo(thd, th))), limCorpo(th));
    }
    ns = Math.max(0, s + Math.max(-L.desacel * dt, Math.min(L.acel * dt, alvoS - s)));
  }
  j.v = { x: Math.cos(th) * ns, y: Math.sin(th) * ns };
  j.p = { x: Math.max(-1, Math.min(COMP + 1, j.p.x + j.v.x * dt)), y: Math.max(-1, Math.min(LARG + 1, j.p.y + j.v.y * dt)) };
  // Corpo: a correr olha para onde vai; devagar, para a bola.
  const paraCorpo = ns > F.corpo_correr_ms ? th : Math.atan2(olhar.y - j.p.y, olhar.x - j.p.x);
  j.corpo = rodar(j.corpo, paraCorpo, F.corpo_rad_s * dt);
}
