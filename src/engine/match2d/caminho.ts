// Caminho pré-definido da bola para a Fase 1 (sem bola real): circula pelo campo a uma velocidade de passe/condução,
// passando pelas alas, pelo meio, pelas áreas, para se ver o bloco a deslizar. Referencial absoluto.
import type { V2 } from './tipos.ts';

export const CAMINHO_BOLA: V2[] = [
  { x: 12, y: 34 }, { x: 24, y: 14 }, { x: 40, y: 6 }, { x: 55, y: 22 }, { x: 70, y: 10 }, { x: 88, y: 18 }, { x: 96, y: 34 },
  { x: 80, y: 46 }, { x: 62, y: 60 }, { x: 46, y: 50 }, { x: 52, y: 34 }, { x: 34, y: 40 }, { x: 22, y: 58 }, { x: 14, y: 46 },
];
const VEL_BOLA = 7; // m/s de jogo (média entre conduções e passes)

const comprimentos = CAMINHO_BOLA.map((p, k) => { const q = CAMINHO_BOLA[(k + 1) % CAMINHO_BOLA.length]; return Math.hypot(q.x - p.x, q.y - p.y); });
const total = comprimentos.reduce((a, b) => a + b, 0);

/** Posição da bola no caminho ao fim de t segundos de jogo. */
export function posicaoCaminho(t: number): V2 {
  let d = (t * VEL_BOLA) % total;
  for (let k = 0; k < CAMINHO_BOLA.length; k++) {
    if (d <= comprimentos[k]) { const p = CAMINHO_BOLA[k], q = CAMINHO_BOLA[(k + 1) % CAMINHO_BOLA.length], f = d / comprimentos[k]; return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f }; }
    d -= comprimentos[k];
  }
  return CAMINHO_BOLA[0];
}
