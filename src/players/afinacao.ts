// Afinação do plantel gerado à força-alvo do clube (ver AFINACAO_PLANTEL em config/geracaoJogadores.ts).
import { AFINACAO_PLANTEL as A, DERIVA_PLANTEL as DV } from '../config/geracaoJogadores.ts';
import { N_ATR, ATRIBUTOS } from '../config/atributos.ts';
import { POSICOES } from '../config/papeis.ts';
import { FORCA } from '../config/forca.ts';
import { Rng } from '../core/rng.ts';
import type { World } from '../engine/world.ts';
import type { Treinador } from '../coaches/store.ts';
import { escolherOnze } from '../match/onze.ts';
import { calcularRatings } from '../match/ratings.ts';

const GR_ATR = ATRIBUTOS.map((a) => a.grupo === 'guarda_redes');

/** Força-alvo de um clube (Fase 1, sem choque de forma). */
export function forcaAlvo(w: World, c: number): number {
  const l = w.liga[c];
  const fd = l >= 0 ? w.ligas[l].regras.forca_desportiva : 50;
  return w.reputacao[c] * (FORCA.base + (FORCA.peso_forca_desportiva * fd) / 100);
}

/** Força (média ataque/defesa, antes de modificadores) do onze que o treinador escolhe. */
export function forcaOnze(w: World, c: number, t: Treinador, dia: number): number {
  const st = w.jogadores!;
  const e = escolherOnze(st, w.plantel[c], t, dia, Rng.de(1, 'afinacao', c));
  const r = calcularRatings(st, e.onze);
  return (r.forcaAtaque + r.forcaDefesa) / 2;
}

export function afinarPlantel(w: World, c: number, t: Treinador, dia: number, rng: Rng): number {
  const st = w.jogadores!;
  const alvo = forcaAlvo(w, c);
  const gerados = w.plantel[c].filter((j) => st.origem[j] === 0);
  if (!gerados.length) return 0;
  let dif = 0;
  for (let it = 0; it < A.iteracoes; it++) {
    dif = alvo - forcaOnze(w, c, t, dia);
    if (Math.abs(dif) <= A.tolerancia) break;
    const passo = Math.max(-A.passo_maximo, Math.min(A.passo_maximo, dif / A.forca_por_ponto));
    const base = Math.trunc(passo), frac = Math.abs(passo - base), sinal = Math.sign(passo);
    for (const j of gerados) {
      // Atributos de guarda-redes só se mexem nos guarda-redes (nos de campo ficam baixos, como gerados).
      const gr = POSICOES[st.posNat[j]] === 'GR';
      for (let k = 0; k < N_ATR; k++) {
        if (!gr && GR_ATR[k]) continue;
        const d = base + (rng.next() < frac ? sinal : 0);
        if (d) st.atr[j * N_ATR + k] = Math.max(1, Math.min(20, st.atr[j * N_ATR + k] + d));
      }
      st.recalcular(j);
      st.pot[j] = Math.max(st.pot[j], st.ovrNat(j));
    }
  }
  return dif;
}

/** Recalcula a correcção da deriva dos clubes indicados (início de época). */
export function corrigirDeriva(w: World, clubes: number[], dia: number) {
  const m = w.motor!;
  if (m.correcao.length < w.clubes.length) { const n = new Float32Array(w.clubes.length); n.set(m.correcao); m.correcao = n; }
  for (const c of clubes) {
    const d = DV.reversao * (forcaAlvo(w, c) - forcaOnze(w, c, m.treinadores[c], dia));
    m.correcao[c] = Math.max(-DV.limite, Math.min(DV.limite, d));
  }
}
