// Cenário do teste do falso 9 (Fase 2, Bloco B, secção 2.5), partilhado pelos testes e pelo relatório.
// Um clube cujo treinador prefere 4-3-3 com falso 9: (A) com um falso 9 adequado no plantel;
// (B) só com finalizadores puros do mesmo nível. Treinador teimoso (adaptabilidade 2) ou adaptável (19).
import { Rng } from '../core/rng.ts';
import { IDX_PAPEL, POSICOES } from '../config/papeis.ts';
import { gerarJogador } from '../players/gerador.ts';
import { IDX } from '../config/atributos.ts';
import { prepararLado } from './rapido.ts';
import { jogoDetalhado, type EstatEquipa } from './detalhado.ts';
import type { World } from '../engine/world.ts';

export interface ResultadoFalso9 {
  plano: string;
  mudou: boolean;
  ocasioes: number;
  grandes: number;
  remates: number;
  rematesInteriores: number;
  perdasDoNove: number;
  golos: number;
  sofridos: number;
  xgRapido: number;
}

/** Substitui os PL do clube por jogadores gerados com o papel pedido (mesmo OVR-alvo). */
export function prepararPlantel(w: World, c: number, papel: 'pl_f9' | 'pl_fin', ovr: number, sufixo: string) {
  const st = w.jogadores!;
  const rng = Rng.de(42, 'falso9', papel, sufixo);
  const fora = w.plantel[c].filter((j) => POSICOES[st.posNat[j]] === 'PL');
  for (const j of fora) st.clube[j] = -1;
  const novos = fora.map((_, k) => gerarJogador(st, rng, { id: `${w.clubes[c].id}_${papel}_${sufixo}_${k}`, pais: w.clubes[c].pais, pos: 'PL', papel: IDX_PAPEL[papel], idade: 26, dia: 0, ovr: ovr - k * 3, potencial: ovr + 2, clube: c }));
  // Acentua o perfil: um falso 9 a sério (combina e recua) ou um finalizador puro (vive na área).
  const mais = papel === 'pl_f9' ? ['ptq', 'pas', 'vis', 'tec', 'dec'] : ['fin', 'msb', 'cab', 'ant'];
  const menos = papel === 'pl_f9' ? ['fin', 'cab'] : ['pas', 'vis', 'tec', 'ptq', 'dec'];
  for (const j of novos) {
    for (const k of mais) st.atr[j * 39 + IDX[k as keyof typeof IDX]] = Math.min(20, st.atr[j * 39 + IDX[k as keyof typeof IDX]] + 3);
    for (const k of menos) st.atr[j * 39 + IDX[k as keyof typeof IDX]] = Math.max(1, st.atr[j * 39 + IDX[k as keyof typeof IDX]] - 3);
    st.recalcular(j);
  }
  w.plantel[c] = [...w.plantel[c].filter((j) => !fora.includes(j)), ...novos];
  // Cenário limpo: só os PL do plantel sabem jogar a 9 (os médios e extremos não são opção para o lugar).
  const PL = POSICOES.indexOf('PL');
  for (const j of w.plantel[c]) if (POSICOES[st.posNat[j]] !== 'PL') st.fam[j * POSICOES.length + PL] = Math.min(st.fam[j * POSICOES.length + PL], 3);
  w.motor!.cache.limpar();
}

export function correrFalso9(w: World, c: number, adversario: number, adaptabilidade: number, n: number, dia: number, formacoes = ['4-3-3F9', '4-3-3', '4-4-2']): ResultadoFalso9 {
  const t = w.motor!.treinadores[c];
  t.formacoes = formacoes;
  t.atributos.adaptabilidade = adaptabilidade;
  const soma: EstatEquipa = { golos: 0, remates: 0, aBaliza: 0, xg: 0, posses: 0, ataques: 0, progressoesGanhas: 0, progressoesPerdidas: 0, ocasioesCriadas: 0, grandesOcasioes: 0, rematesInteriores: 0, perdasDoNove: 0, faltas: 0, amarelos: 0, vermelhos: 0, cantos: 0, penaltis: 0 };
  let mudou = 0, xg = 0, plano = '', sofridos = 0;
  for (let k = 0; k < n; k++) {
    const rng = Rng.de(7, 'f9', c, adaptabilidade, k);
    const lado = prepararLado(w, c, dia, rng);
    const adv = prepararLado(w, adversario, dia, rng);
    plano = lado.escolha.plano.formacao.id + (lado.escolha.plano.adaptado ? ' (papéis ajustados: finalizador)' : '');
    if (lado.escolha.mudou) mudou++;
    xg += lado.forcaAtaque;
    const r = jogoDetalhado(w, lado, adv, false, rng, { eventos: false });
    for (const key of Object.keys(soma) as (keyof EstatEquipa)[]) soma[key] += r.estat[0][key];
    sofridos += r.golos[1];
  }
  return {
    plano, mudou: mudou > n / 2, ocasioes: soma.ocasioesCriadas / n, grandes: soma.grandesOcasioes / n, remates: soma.remates / n,
    rematesInteriores: soma.rematesInteriores / n, perdasDoNove: soma.perdasDoNove / n, golos: soma.golos / n, sofridos: sofridos / n, xgRapido: xg / n,
  };
}
