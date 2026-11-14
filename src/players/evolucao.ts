// Evolução mensal, aposentação e reposição dos jogadores.
// Os atributos são inteiros (Uint8); a evolução fraccionária aplica-se por
// arredondamento estocástico (cada atributo sobe 1 ponto com probabilidade igual
// à fracção), o que mantém o valor esperado sem guardar acumuladores.
import { Rng } from '../core/rng.ts';
import { N_ATR, IDX } from '../config/atributos.ts';
import { PAPEIS_DA_POSICAO, POSICOES, IDX_POS, type Posicao } from '../config/papeis.ts';
import { EVOLUCAO as E } from '../config/evolucao.ts';
import { GERACAO_JOGADORES as G } from '../config/geracaoJogadores.ts';
import { PESOS_PAPEL, type PlayerStore } from './store.ts';
import { gerarJogador, ovrAlvoClube } from './gerador.ts';
import type { World } from '../engine/world.ts';

/** Atributos relevantes (peso > 0 em algum papel) de cada posição. */
const RELEVANTES: number[][] = POSICOES.map((p) => {
  const s = new Set<number>();
  for (const r of PAPEIS_DA_POSICAO[p]) PESOS_PAPEL[r].forEach((w, k) => { if (w > 0) s.add(k); });
  return [...s];
});
const FISICOS = new Set(E.declinio_fisico.map((id) => IDX[id as keyof typeof IDX]));
const MENTAIS_TARDIOS = new Set(E.mentais_tardios.map((id) => IDX[id as keyof typeof IDX]));
const GR = IDX_POS.GR;

export interface ContextoEvolucao {
  /** Fracção dos minutos possíveis jogados no último mês (0–1). */
  parteMinutos: (i: number) => number;
  /** Desenvolvimento de jovens do treinador principal do clube (1–20). */
  desenvolvimentoTreinador: (clube: number, jogador?: number) => number;
  /** Multiplicador do crescimento (ex.: jovem titular numa liga competitiva, Bloco C). */
  multCrescimento?: (i: number) => number;
  /** Ajuste aditivo mensal (ex.: âncora da liga, Bloco C). */
  ajuste?: (i: number) => number;
}

/** Variação mensal esperada de OVR (sem ruído), exposta para os testes e as curvas. */
export function variacaoEsperada(idade: number, gr: boolean, ovr: number, pot: number, prof: number, amb: number, parte: number, dev: number, mult = 1): number {
  const cresc = mult * E.taxa_crescimento(idade) * Math.max(0, pot - ovr) * E.factor_minutos(parte) * E.factor_treinador(dev) * E.factor_personalidade(prof, amb);
  const decl = E.declinio(gr ? idade - E.atraso_gr : idade) * E.protecao_prof(prof);
  return cresc - decl;
}

/** Aplica uma variação de OVR a um jogador, distribuída pelos atributos da posição natural. */
export function aplicarVariacao(st: PlayerStore, i: number, delta: number, idade: number, rng: Rng) {
  const p = st.posNat[i];
  const rel = RELEVANTES[p];
  const dA = (Math.abs(delta) * 19) / 99; // em pontos de adequação (1–20)
  const base = i * N_ATR;
  let mudou = false;
  if (delta > 0) {
    for (const k of rel) if (rng.next() < dA && st.atr[base + k] < 20) { st.atr[base + k]++; mudou = true; }
  } else if (delta < 0) {
    for (const k of rel) {
      const f = FISICOS.has(k) ? 1.6 : MENTAIS_TARDIOS.has(k) ? 0.3 : 0.9;
      if (rng.next() < dA * f && st.atr[base + k] > 1) { st.atr[base + k]--; mudou = true; }
    }
    // Os mentais ainda podem subir um pouco depois dos 30.
    if (idade < 34) for (const k of MENTAIS_TARDIOS) if (rng.next() < 0.02 && st.atr[base + k] < 20) { st.atr[base + k]++; mudou = true; }
  }
  if (!mudou) return;
  st.recalcular(i);
  // Ninguém ultrapassa o potencial.
  let guarda = 0;
  while (st.ovrNat(i) > st.pot[i] && guarda++ < 40) {
    const k = rel[Math.floor(rng.next() * rel.length)];
    if (st.atr[base + k] > 1) { st.atr[base + k]--; st.recalcular(i); }
  }
}

/** Parte dos minutos por omissão (antes do motor do Bloco B): pela ordem no plantel. */
export function parteMinutosPorOrdem(w: World, st: PlayerStore): (i: number) => number {
  const parte = new Float32Array(st.n);
  for (const pl of w.plantel) {
    const ord = [...pl].sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
    ord.forEach((j, r) => { parte[j] = r < 14 ? E.parte_minutos_padrao.titular : E.parte_minutos_padrao.suplente; });
  }
  return (i) => parte[i];
}

/** Evolução de um mês para todos os jogadores com clube. */
export function evoluirMes(w: World, st: PlayerStore, dia: number, ctx: ContextoEvolucao, so?: (i: number) => boolean) {
  const rng = Rng.de(w.semente, 'evolucao', dia);
  for (let i = 0; i < st.n; i++) {
    if (st.clube[i] < 0) continue;
    if (so && !so(i)) continue;
    const idade = st.idade(i, dia);
    const gr = st.posNat[i] === GR;
    const esperado = variacaoEsperada(idade, gr, st.ovrNat(i), st.pot[i], st.oculto(i, 'prof'), st.oculto(i, 'amb'), ctx.parteMinutos(i), ctx.desenvolvimentoTreinador(st.clube[i], i), ctx.multCrescimento?.(i) ?? 1) + (ctx.ajuste?.(i) ?? 0);
    const delta = esperado + rng.normal(0, E.ruido);
    if (Math.abs(delta) < 0.01) continue;
    aplicarVariacao(st, i, delta, idade, rng);
  }
}

/**
 * Fim de época de um clube: aposentações e reposição para manter a composição do plantel.
 * (Os novos jogadores são gerados; a academia real chega no Prompt 4.)
 */
export function renovarPlantel(w: World, st: PlayerStore, c: number, dia: number, rng: Rng, epoca: number, repor = true): { aposentados: number[]; novos: number[] } {
  const aposentados: number[] = [];
  const restantes: number[] = [];
  for (const j of w.plantel[c]) {
    const idade = st.idade(j, dia);
    if (st.clube[j] === c && rng.chance(E.prob_aposentacao(idade, st.posNat[j] === GR))) { st.clube[j] = -2; aposentados.push(j); }
    else if (st.clube[j] === c) restantes.push(j);
  }
  // Com a academia (Prompt 4, Bloco C) não há reposição gerada: as vagas enchem-se com promoções e com o mercado.
  if (!repor) { w.plantel[c] = restantes; return { aposentados, novos: [] }; }
  // Repõe as posições que faltam face à composição-modelo.
  const falta = new Map<Posicao, number>();
  for (const slot of G.composicao) { const pos = (slot === 'ED|EE' ? 'ED' : slot) as Posicao; falta.set(pos, (falta.get(pos) ?? 0) + 1); }
  for (const j of restantes) {
    let pos = POSICOES[st.posNat[j]];
    if (pos === 'EE' || pos === 'ED') pos = (falta.get('ED') ?? 0) > 0 ? 'ED' : 'EE';
    falta.set(pos, (falta.get(pos) ?? 0) - 1);
  }
  const L = ovrAlvoClube(w, c);
  // Âncora: se o plantel derivou face ao que tinha na geração (relativamente ao nível do clube), a reposição compensa.
  const ref = w.ovrReferencia?.[c];
  const media = restantes.reduce((s, j) => s + st.ovrNat(j), 0) / Math.max(1, restantes.length);
  const deriva = ref === undefined || Number.isNaN(ref) || !restantes.length ? 0 : Math.max(-G.reposicao_ancora.maximo, Math.min(G.reposicao_ancora.maximo, media - L - ref));
  const novos: number[] = [];
  let k = 0;
  for (const [pos0, n] of falta) {
    for (let x = 0; x < n; x++) {
      const pos = pos0 === 'ED' && rng.chance(0.5) ? 'EE' : pos0;
      // Reposição: sobretudo jovens (18–23) abaixo do nível do clube, com potencial à volta dele.
      const idade = 18 + rng.next() * 5;
      const t0 = L - 3 - G.reposicao_ancora.ganho * deriva + rng.normal(0, G.ruido_ovr);
      const t = Math.max(15, t0 - G.atraso_jovem(idade));
      const pot = Math.min(99, Math.max(t, t0 + 0.5 * G.margem_potencial(idade) + rng.normal(0, G.ruido_potencial)));
      const pais = w.clubes[c].pais;
      novos.push(gerarJogador(st, rng, { id: `${w.clubes[c].id}_r${epoca}_${++k}`, pais, pos, idade, dia, ovr: t, potencial: pot, clube: c }));
    }
  }
  w.plantel[c] = [...restantes, ...novos];
  return { aposentados, novos };
}

/** Guarda, por clube, a média do OVR do plantel menos o nível do clube (âncora da reposição). */
export function registarReferencia(w: World, st: PlayerStore, c: number) {
  if (!w.ovrReferencia || w.ovrReferencia.length < w.clubes.length) {
    const n = new Float32Array(w.clubes.length).fill(NaN);
    if (w.ovrReferencia) n.set(w.ovrReferencia);
    w.ovrReferencia = n;
  }
  const js = w.plantel[c] ?? [];
  w.ovrReferencia[c] = js.length ? js.reduce((s, j) => s + st.ovrNat(j), 0) / js.length - ovrAlvoClube(w, c) : NaN;
}
