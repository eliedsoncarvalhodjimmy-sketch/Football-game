// IA do treinador para o onze (Fase 2, Bloco B): formação, papéis e onze, pesando o estilo
// preferido, o plantel disponível e a adaptabilidade. O adaptável muda de plano quando o
// plantel não serve o estilo; o teimoso insiste e paga (factor de ajuste nos modificadores).
import { IDX_PAPEL, IDX_POS, PAPEIS_DA_POSICAO, FAMILIARIDADE, N_POS } from '../config/papeis.ts';
import { FORMACAO_POR_ID, type Formacao } from '../config/tacticas.ts';
import { TREINADORES as T } from '../config/treinadores.ts';
import { ESTADO } from '../config/estado.ts';
import type { Rng } from '../core/rng.ts';
import type { PlayerStore } from '../players/store.ts';
import type { Treinador } from '../coaches/store.ts';
import { factorLugar, calcularRatings, type CacheRatings } from './ratings.ts';
import type { Onze } from './ratings.ts';

export interface Plano {
  formacao: Formacao;
  papeis: number[];
  /** Papéis ajustados ao plantel (variante do plano preferido). */
  adaptado?: boolean;
}

export interface EscolhaOnze {
  onze: Onze;
  plano: Plano;
  /** O treinador trocou o plano preferido por outro. */
  mudou: boolean;
  /** Valor do plano escolhido ÷ valor do melhor plano possível (≤ 1): adequação da táctica ao plantel. */
  ajuste: number;
  banco: number[];
}

/** Condição física actual (com a recuperação desde o último jogo). */
export function condicaoActual(st: PlayerStore, j: number, dia: number): number {
  const ult = st.ultimoJogo[j];
  if (!ult) return st.condicao[j];
  return Math.min(100, st.condicao[j] + Math.max(0, dia - ult) * ESTADO.recuperacao_por_dia);
}

export function disponivel(st: PlayerStore, j: number, dia: number): boolean {
  return st.indisponivelAte[j] <= dia && st.suspensao[j] === 0;
}

export function planoDe(formacaoId: string, papeisExtra: Record<number, string> = {}): Plano {
  const f = FORMACAO_POR_ID[formacaoId];
  return { formacao: f, papeis: f.lugares.map((l, s) => IDX_PAPEL[papeisExtra[s] ?? l.papel]) };
}

/** Planos que o treinador considera: o preferido primeiro, depois as alternativas do perfil. */
export function planosDoTreinador(t: Treinador): Plano[] {
  return t.formacoes.map((f, k) => planoDe(f, k === 0 ? t.papeis : {}));
}

/** Preenche um plano com os melhores jogadores disponíveis (escolha gulosa por lugar). */
export function preencher(st: PlayerStore, candidatos: number[], plano: Plano, dia: number, condicoes?: Float32Array): { jogadores: number[]; valor: number } {
  const n = candidatos.length;
  const usados = new Uint8Array(n);
  const jogadores: number[] = new Array(11);
  let valor = 0;
  // Factor de rotação por candidato (condição física), calculado uma vez.
  const rot = new Float32Array(n);
  const naturais = new Int32Array(12);
  for (let k = 0; k < n; k++) {
    const c = condicoes ? condicoes[k] : condicaoActual(st, candidatos[k], dia);
    rot[k] = c < T.condicao_rotacao ? 1 - T.penalizacao_rotacao : 1;
    naturais[st.posNat[candidatos[k]]]++;
  }
  // Ordem: guarda-redes, depois os lugares com menos candidatos naturais.
  const lugares = plano.formacao.lugares;
  const ordem = lugares.map((_, s) => s).sort((a, b) => {
    if (lugares[a].pos === 'GR') return -1;
    if (lugares[b].pos === 'GR') return 1;
    return naturais[IDX_POS[lugares[a].pos]] - naturais[IDX_POS[lugares[b].pos]];
  });
  const GR = IDX_POS.GR;
  for (const s of ordem) {
    const l = lugares[s];
    const pos = IDX_POS[l.pos];
    const papel = plano.papeis[s];
    const querGR = pos === GR;
    let melhor = -1, mv = -1;
    for (let k = 0; k < n; k++) {
      if (usados[k]) continue;
      const j = candidatos[k];
      if (querGR !== (st.posNat[j] === GR)) continue;
      const v = st.adequacao(j, papel) * factorLugar(st, j, pos, papel) * rot[k] * (st.fam[j * N_POS + pos] < FAMILIARIDADE.competente ? T.aversao_desconfortavel : 1);
      if (v > mv) { mv = v; melhor = k; }
    }
    if (melhor < 0) { // sem jogador adequado (plantel curto): qualquer um
      melhor = usados.indexOf(0);
      if (melhor < 0) melhor = 0;
      mv = 5;
    }
    usados[melhor] = 1;
    jogadores[s] = candidatos[melhor];
    valor += mv;
  }
  return { jogadores, valor };
}

export function escolherOnze(st: PlayerStore, plantel: number[], t: Treinador, dia: number, rng: Rng, forcar?: Plano, cache?: CacheRatings): EscolhaOnze {
  let cand = plantel.filter((j) => st.clube[j] >= 0 && disponivel(st, j, dia));
  if (cand.length < 11) cand = plantel.filter((j) => st.clube[j] >= 0); // emergência: joga quem houver
  const planos = forcar ? [forcar] : planosDoTreinador(t);
  const condicoes = Float32Array.from(cand, (j) => condicaoActual(st, j, dia));
  // Cada plano é preenchido com os melhores jogadores e avaliado pela força da equipa (ratings do onze, em cache).
  const avaliar = (p: Plano, jogadores?: number[]) => {
    const js = jogadores ?? preencher(st, cand, p, dia, condicoes).jogadores;
    const onze = { formacao: p.formacao, papeis: p.papeis, jogadores: js, instrucoes: t.instrucoes };
    const r = cache ? cache.obter(t.clube, st, onze) : calcularRatings(st, onze);
    return { p, jogadores: js, valor: r.forcaAtaque + r.forcaDefesa };
  };
  const avaliados = planos.map((p) => avaliar(p));
  // Variante do plano preferido com os papéis ajustados aos jogadores escolhidos (ex.: finalizador em vez de falso 9).
  if (!forcar) {
    const pref0 = avaliados[0];
    const papeis = pref0.p.papeis.map((papel, s) => {
      const pos = pref0.p.formacao.lugares[s].pos;
      const j = pref0.jogadores[s];
      return PAPEIS_DA_POSICAO[pos].reduce((m, r) => (st.adequacao(j, r) > st.adequacao(j, m) ? r : m), papel);
    });
    if (papeis.some((r, s) => r !== pref0.p.papeis[s])) avaliados.push(avaliar({ formacao: pref0.p.formacao, papeis, adaptado: true }, pref0.jogadores));
  }
  const pref = avaliados[0];
  const melhor = avaliados.reduce((a, b) => (b.valor > a.valor ? b : a));
  let escolhido = pref;
  let mudou = false;
  if (melhor !== pref && melhor.valor > pref.valor * (1 + T.limiar_mudanca)) {
    const p = Math.pow(t.atributos.adaptabilidade / 20, T.expoente_adaptabilidade);
    if (rng.next() < p) { escolhido = melhor; mudou = true; }
  }
  const usados = new Set(escolhido.jogadores);
  const banco = cand.filter((j) => !usados.has(j)).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 9);
  return {
    onze: { formacao: escolhido.p.formacao, papeis: escolhido.p.papeis, jogadores: escolhido.jogadores, instrucoes: t.instrucoes },
    plano: escolhido.p, mudou, ajuste: escolhido.valor / melhor.valor, banco,
  };
}
