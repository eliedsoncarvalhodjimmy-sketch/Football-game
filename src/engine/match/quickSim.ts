// Modo rápido de jogo (sem jogadores): Poisson com correcção de Dixon-Coles.
import { SIMULACAO } from '../../config/simulacao.ts';
import type { Rng } from '../../core/rng.ts';

export function golosEsperados(atqC: number, defC: number, atqF: number, defF: number, neutro: boolean, S = SIMULACAO): [number, number] {
  const casa = neutro ? 1 : S.casa;
  const lc = S.base * Math.exp(S.gama * (atqC - defF)) * casa;
  const lf = (S.base * Math.exp(S.gama * (atqF - defC))) / casa;
  const cl = (x: number) => (x < S.xg_min ? S.xg_min : x > S.xg_max ? S.xg_max : x);
  return [cl(lc), cl(lf)];
}

function tau(x: number, y: number, l: number, m: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - l * m * rho;
  if (x === 0 && y === 1) return 1 + l * rho;
  if (x === 1 && y === 0) return 1 + m * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

/** Sorteia um resultado com golos esperados (l, m). */
export function sortearGolos(l: number, m: number, rng: Rng, rho = SIMULACAO.rho, S = SIMULACAO): [number, number] {
  const tmax = Math.max(1, 1 - l * m * rho, 1 + l * rho, 1 + m * rho, (1 - rho) * S.empate_fator, S.empate_fator);
  for (;;) {
    const x = rng.poisson(l);
    const y = rng.poisson(m);
    let w = tau(x, y, l, m, rho);
    const t = x + y;
    if (x === y && x > 0) w *= S.empate_fator;
    if (t > S.goleada_limiar) w *= Math.pow(S.goleada_fator, t - S.goleada_limiar);
    if (rng.next() * tmax <= w) return [x, y];
  }
}

const S = SIMULACAO;

export function jogoRapido(atqC: number, defC: number, atqF: number, defF: number, neutro: boolean, rng: Rng): [number, number] {
  const [l, m] = golosEsperados(atqC, defC, atqF, defF, neutro);
  return sortearGolos(l, m, rng);
}

/** Prolongamento: golos com uma fracção dos golos esperados (sem correcção de baixo resultado). */
export function prolongamento(atqC: number, defC: number, atqF: number, defF: number, neutro: boolean, rng: Rng): [number, number] {
  const [l, m] = golosEsperados(atqC, defC, atqF, defF, neutro);
  return [rng.poisson(l * S.prolongamento), rng.poisson(m * S.prolongamento)];
}

/** Penáltis: devolve o resultado do desempate (vencedor com mais golos). */
export function penaltis(forcaC: number, forcaF: number, rng: Rng): [number, number] {
  const p = Math.min(0.65, Math.max(0.35, 0.5 + ((forcaC - forcaF) / 10) * S.penaltis_vantagem_por_10));
  const ganhaCasa = rng.next() < p;
  const perdedor = rng.int(2, 4);
  const vencedor = perdedor + rng.int(1, 2);
  return ganhaCasa ? [Math.min(5, vencedor), perdedor] : [perdedor, Math.min(5, vencedor)];
}
