// Prompt 6B: jogos pela selecção (internacionalizações), para o F_visibilidade do valor de mercado.
// O jogo ainda não simula jogos de selecções: nas paragens de selecções do calendário, os melhores de cada país (por
// OVR) somam jogos. O número inicial vem dos ficheiros (coluna internacionalizacoes) ou é estimado e assinalado
// (intEstimada = 1) pela idade e pelo lugar do jogador entre os melhores do seu país.
import { SELECOES as S } from '../config/valorMercado.ts';
import type { World } from '../engine/world.ts';

/** Seniores com clube de cada país, do melhor para o pior (por OVR natural). */
function porPais(w: World, dia: number): Map<number, number[]> {
  const st = w.jogadores!, out = new Map<number, number[]>();
  for (let j = 0; j < st.n; j++) {
    if (st.clube[j] < 0 || st.idade(j, dia) < S.idade_minima) continue;
    const p = st.pais[j];
    let a = out.get(p);
    if (!a) out.set(p, (a = []));
    a.push(j);
  }
  for (const a of out.values()) a.sort((x, y) => st.ovrNat(y) - st.ovrNat(x) || x - y);
  return out;
}

/** Estimativa inicial (só para quem não a trouxe dos ficheiros). */
export function iniciarInternacionalizacoes(w: World, dia: number) {
  const st = w.jogadores!, E = S.estimativa;
  for (const a of porPais(w, dia).values()) a.forEach((j, r) => {
    if (st.intEstimada[j] === 0 && st.origem[j] !== 0) return; // veio dos ficheiros
    const k = r < E.lugares[0] ? 0 : r < E.lugares[1] ? 1 : r < E.lugares[2] ? 2 : 3;
    const anos = Math.max(0, st.idade(j, dia) - E.idade_inicio);
    st.internacionalizacoes[j] = k === 3 ? 0 : Math.min(E.maximo, Math.round(anos * E.por_ano[k as 0 | 1 | 2]));
    st.intEstimada[j] = 1;
  });
}

/** Paragem de selecções: os convocados de cada país (os melhores por OVR) somam os jogos da paragem. */
export function paragemSelecoes(w: World, dia: number) {
  const st = w.jogadores!;
  for (const a of porPais(w, dia).values()) for (const j of a.slice(0, S.convocados)) st.internacionalizacoes[j] = Math.min(65535, st.internacionalizacoes[j] + S.jogos_por_paragem);
}
