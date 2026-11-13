// Ratings de equipa a partir do onze, dos papéis e da táctica (Fase 2, Bloco B).
// Calculados uma vez por onze e guardados em cache: só se recalculam quando mudam o
// onze, os papéis, a táctica ou o entrosamento (os modificadores do jogo ficam à parte).
import { ATRIBUTOS, N_ATR } from '../config/atributos.ts';
import { PAPEIS, IDX_PAPEL, POSICOES, factorFamiliaridade, N_POS, N_PAPEIS } from '../config/papeis.ts';
import { RATINGS, PESOS_RATING, CONTRIBUICAO, SOMA_CONTRIBUICAO, SINERGIA_FALSO9, PENALIZACAO_PAPEL, INDICE_ATAQUE, INDICE_DEFESA, CONVERSAO_FORCA, type Rating } from '../config/ratings.ts';
import { FORMACOES, EFEITO_INSTRUCOES, type Instrucoes, type Formacao } from '../config/tacticas.ts';
import type { PlayerStore } from '../players/store.ts';

export interface Onze {
  formacao: Formacao;
  /** Papel (índice) de cada lugar. */
  papeis: number[];
  /** Jogador de cada lugar (11). */
  jogadores: number[];
  instrucoes: Instrucoes;
}

export type ValoresRatings = Record<Rating, number>;

export interface RatingsEquipa {
  r: ValoresRatings;
  /** Índices de ataque e de defesa (1–20) e a sua conversão para a escala de força da Fase 1. */
  indiceAtaque: number;
  indiceDefesa: number;
  forcaAtaque: number;
  forcaDefesa: number;
  /** Factor de cada jogador no seu lugar (familiaridade × adequação ao papel). */
  factores: number[];
}

/** Pesos densos (normalizados) de cada rating por atributo. */
const PESOS_DENSOS: Record<string, Float32Array> = Object.fromEntries(
  Object.entries(PESOS_RATING).map(([k, pes]) => {
    const v = new Float32Array(N_ATR);
    let s = 0;
    ATRIBUTOS.forEach((a, i) => { v[i] = (pes as Record<string, number>)[a.id] ?? 0; s += v[i]; });
    for (let i = 0; i < N_ATR; i++) v[i] /= s;
    return [k, v];
  }),
);
const IDX_BPA = ATRIBUTOS.findIndex((a) => a.id === 'bpa');
/** Contribuições normalizadas: todos os papéis de campo somam o mesmo (o papel distribui a influência, não a aumenta). */
const CONTRIB_NORM: Record<string, Partial<Record<Rating, number>>> = Object.fromEntries(
  Object.entries(CONTRIBUICAO).map(([id, c]) => {
    if (c.gr) return [id, c];
    const soma = Object.values(c).reduce((s, x) => s + x!, 0);
    return [id, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v! * SOMA_CONTRIBUICAO) / soma]))];
  }),
);
const CONTRIB_IDX: Partial<Record<Rating, number>>[] = PAPEIS.map((p) => CONTRIB_NORM[p.id] ?? {});
const F9 = IDX_PAPEL.pl_f9;
const INTERIORES = new Set([IDX_PAPEL.mc_b2b, IDX_PAPEL.mo_che, IDX_PAPEL.mc_cri]);

/** Referência de cada rating: Σ das contribuições média das formações (com os papéis por defeito). */
const REFERENCIA: Record<Rating, number> = (() => {
  const ref = Object.fromEntries(RATINGS.map((r) => [r, 0])) as Record<Rating, number>;
  for (const f of FORMACOES) for (const l of f.lugares) for (const [k, v] of Object.entries(CONTRIB_NORM[l.papel] ?? {})) ref[k as Rating] += v! / FORMACOES.length;
  ref.gr = 1;
  return ref;
})();

/** Pontuação (1–20) de um jogador num rating. */
export function pontuacao(st: PlayerStore, j: number, rating: string): number {
  const w = PESOS_DENSOS[rating];
  const base = j * N_ATR;
  let s = 0;
  for (let k = 0; k < N_ATR; k++) if (w[k] > 0) s += w[k] * st.atr[base + k];
  return s;
}

/** Factor de um jogador num lugar: familiaridade com a posição × adequação ao papel (face ao seu melhor papel na posição). */
const TAB_FAM = Float32Array.from({ length: 21 }, (_, f) => factorFamiliaridade(Math.max(1, f)));

export function factorLugar(st: PlayerStore, j: number, pos: number, papel: number): number {
  const fam = TAB_FAM[st.fam[j * N_POS + pos]];
  const dif = (st.adeqMaxPos[j * N_POS + pos] - st.adeq[j * N_PAPEIS + papel]) / 10;
  if (dif <= 0) return fam;
  return fam * (1 - Math.min(PENALIZACAO_PAPEL.maximo, PENALIZACAO_PAPEL.por_ponto * dif));
}

export function calcularRatings(st: PlayerStore, onze: Onze): RatingsEquipa {
  const r = Object.fromEntries(RATINGS.map((k) => [k, 0])) as ValoresRatings;
  const factores: number[] = [];
  // Sinergia do falso 9: adequação do jogador no papel de falso 9 (se existir).
  let sinergia = 0;
  onze.papeis.forEach((p, s) => {
    if (p !== F9) return;
    const a = st.adequacao(onze.jogadores[s], F9);
    sinergia = Math.max(sinergia, Math.min(1.2, Math.max(0, (a - SINERGIA_FALSO9.adequacao_minima) / (SINERGIA_FALSO9.adequacao_referencia - SINERGIA_FALSO9.adequacao_minima))));
  });
  let maxBpa = 0;
  onze.jogadores.forEach((j, s) => {
    const papel = onze.papeis[s];
    const pos = POSICOES.indexOf(onze.formacao.lugares[s].pos);
    const f = factorLugar(st, j, pos, papel);
    factores.push(f);
    const c = { ...CONTRIB_IDX[papel] };
    if (sinergia > 0 && INTERIORES.has(papel)) {
      c.finalizacao = (c.finalizacao ?? 0) + SINERGIA_FALSO9.finalizacao_interiores * sinergia;
      c.criacao = (c.criacao ?? 0) + SINERGIA_FALSO9.criacao_combinacao * sinergia;
    }
    for (const [k, v] of Object.entries(c) as [Rating, number][]) {
      if (k === 'gr') r.gr += v * st.adequacao(j, papel) * f;
      else if (k !== 'bolas_paradas') r[k] += v * pontuacao(st, j, k) * f;
    }
    if (onze.formacao.lugares[s].pos !== 'GR') maxBpa = Math.max(maxBpa, st.atr[j * N_ATR + IDX_BPA] * f);
  });
  for (const k of RATINGS) if (k !== 'bolas_paradas') r[k] /= REFERENCIA[k];
  r.bolas_paradas = 0.5 * maxBpa + 0.5 * r.aereo;
  // Instruções de equipa.
  for (const [ins, efeitos] of Object.entries(EFEITO_INSTRUCOES) as [keyof Instrucoes, Partial<Record<string, number>>][]) {
    const v = onze.instrucoes[ins];
    if (!v) continue;
    for (const [k, e] of Object.entries(efeitos)) r[k as Rating] *= 1 + v * e!;
  }
  let ia = 0, id = 0;
  for (const [k, p] of Object.entries(INDICE_ATAQUE)) ia += p! * r[k as Rating];
  for (const [k, p] of Object.entries(INDICE_DEFESA)) id += p! * r[k as Rating];
  const fa = CONVERSAO_FORCA.ataque.a + CONVERSAO_FORCA.ataque.b * ia;
  const fd = CONVERSAO_FORCA.defesa.a + CONVERSAO_FORCA.defesa.b * id;
  const media = (fa + fd) / 2;
  const k = CONVERSAO_FORCA.assimetria;
  return { r, indiceAtaque: ia, indiceDefesa: id, factores, forcaAtaque: media + k * (fa - media), forcaDefesa: media + k * (fd - media) };
}

/** Cache dos ratings por equipa: chave = formação + papéis + jogadores + instruções. Guarda os últimos planos de cada clube. */
export class CacheRatings {
  private mapa = new Map<number, Map<string, RatingsEquipa>>();
  calculos = 0;
  pedidos = 0;

  obter(clube: number, st: PlayerStore, onze: Onze): RatingsEquipa {
    this.pedidos++;
    const i = onze.instrucoes;
    const chave = `${onze.formacao.id}|${onze.papeis.join(',')}|${onze.jogadores.join(',')}|${i.mentalidade}${i.pressao}${i.linha}${i.largura}${i.ritmo}`;
    let m = this.mapa.get(clube);
    if (!m) { m = new Map(); this.mapa.set(clube, m); }
    const c = m.get(chave);
    if (c) return c;
    this.calculos++;
    const v = calcularRatings(st, onze);
    if (m.size >= 8) m.delete(m.keys().next().value!);
    m.set(chave, v);
    return v;
  }

  /** Invalida (ex.: atributos mudaram na evolução mensal). */
  limpar() {
    this.mapa.clear();
  }
}
