// Jogadores em arrays tipados (estrutura de arrays): ~23 000 seniores ocupam poucos MB.
// Índice do jogador = posição nos arrays. Os textos (id, nome) vivem em arrays à parte.
import { N_ATR, N_OCU, ATRIBUTOS, IDX_OCU, type IdOculto } from '../config/atributos.ts';
import { N_POS, N_PAPEIS, PAPEIS, POSICOES, PAPEIS_DA_POSICAO, IDX_POS, type Posicao } from '../config/papeis.ts';
import { ESTADO } from '../config/estado.ts';

export const ORIGEM_JOGADOR = ['gerado', 'real', 'manual'] as const;
export type OrigemJogador = (typeof ORIGEM_JOGADOR)[number];

/** Pesos de cada papel como vector denso normalizado (soma 1). */
export const PESOS_PAPEL: Float32Array[] = PAPEIS.map((p) => {
  const v = new Float32Array(N_ATR);
  let s = 0;
  ATRIBUTOS.forEach((a, i) => { v[i] = p.pesos[a.id] ?? 0; s += v[i]; });
  for (let i = 0; i < N_ATR; i++) v[i] /= s;
  return v;
});

/** Índices (não nulos) e pesos de cada papel, para o cálculo rápido da adequação. */
const PESOS_ESPARSOS = PESOS_PAPEL.map((v) => {
  const idx: number[] = [];
  const w: number[] = [];
  v.forEach((x, i) => { if (x > 0) { idx.push(i); w.push(x); } });
  return { idx: Int32Array.from(idx), w: Float32Array.from(w) };
});

export class PlayerStore {
  n = 0;
  cap: number;
  /** Atributos visíveis (n × 39), 1–20. */
  atr!: Uint8Array;
  /** Ocultos (n × 6), 1–20. */
  ocu!: Uint8Array;
  /** Familiaridade por posição (n × 12), 1–20. */
  fam!: Uint8Array;
  /** Data de nascimento (dia absoluto desde 1970-01-01). */
  nasc!: Int32Array;
  /** Potencial: OVR máximo na posição natural (1–100). */
  pot!: Uint8Array;
  /** Clube (índice no mundo); −1 sem clube; −2 aposentado. */
  clube!: Int32Array;
  posNat!: Uint8Array;
  papelPref!: Uint8Array;
  /** 0 direito, 1 esquerdo, 2 ambos. */
  pe!: Uint8Array;
  /** País de formação (índice em `paises`). */
  pais!: Uint16Array;
  origem!: Uint8Array;
  // ---- Estado dinâmico ----
  moral!: Uint8Array; // 1–20
  condicao!: Uint8Array; // 0–100
  ritmo!: Uint8Array; // 0–100
  entrosamento!: Uint8Array; // 0–100
  /** Últimas 5 notas × 10 (0 = sem nota). */
  forma!: Uint8Array;
  lesaoDias!: Uint16Array;
  lesaoTipo!: Uint8Array;
  suspensao!: Uint8Array;
  amarelos!: Uint8Array;
  /** Indisponível (lesão) até este dia absoluto, exclusive. */
  indisponivelAte!: Int32Array;
  /** Dia do último jogo (para a recuperação física). */
  ultimoJogo!: Int32Array;
  // ---- Estatísticas da época (todas as competições) ----
  eJogos!: Uint16Array;
  eTitular!: Uint16Array;
  eMinutos!: Uint16Array;
  eGolos!: Uint16Array;
  eAssist!: Uint16Array;
  eAmarelos!: Uint16Array;
  eVermelhos!: Uint16Array;
  eLesoes!: Uint16Array;
  eRemates!: Uint16Array;
  eSofridos!: Uint16Array;
  /** Soma das notas × 10. */
  eNotas!: Int32Array;
  /** Minutos jogados no mês corrente (para a evolução). */
  minMes!: Uint16Array;
  // ---- Caches ----
  /** Adequação a cada papel × 10 (10–200). */
  adeq!: Uint8Array;
  /** OVR por posição (1–100), sem familiaridade. */
  ovr!: Uint8Array;
  /** Melhor adequação (× 10) entre os papéis de cada posição (n × 12). */
  adeqMaxPos!: Uint8Array;
  // ---- Textos ----
  ids: string[] = [];
  nomes: string[] = [];
  paises: string[] = [];
  private idxPais = new Map<string, number>();
  private porId = new Map<string, number>();

  constructor(cap = 1024) {
    this.cap = 0;
    this.crescer(cap);
  }

  private crescer(novo: number) {
    const g = <T extends Uint8Array | Uint16Array | Int32Array>(a: T | undefined, C: new (n: number) => T, k = 1): T => {
      const b = new C(novo * k);
      if (a) b.set(a);
      return b;
    };
    this.atr = g(this.atr, Uint8Array, N_ATR);
    this.ocu = g(this.ocu, Uint8Array, N_OCU);
    this.fam = g(this.fam, Uint8Array, N_POS);
    this.nasc = g(this.nasc, Int32Array);
    this.pot = g(this.pot, Uint8Array);
    this.clube = g(this.clube, Int32Array);
    this.posNat = g(this.posNat, Uint8Array);
    this.papelPref = g(this.papelPref, Uint8Array);
    this.pe = g(this.pe, Uint8Array);
    this.pais = g(this.pais, Uint16Array);
    this.origem = g(this.origem, Uint8Array);
    this.moral = g(this.moral, Uint8Array);
    this.condicao = g(this.condicao, Uint8Array);
    this.ritmo = g(this.ritmo, Uint8Array);
    this.entrosamento = g(this.entrosamento, Uint8Array);
    this.forma = g(this.forma, Uint8Array, 5);
    this.lesaoDias = g(this.lesaoDias, Uint16Array);
    this.lesaoTipo = g(this.lesaoTipo, Uint8Array);
    this.suspensao = g(this.suspensao, Uint8Array);
    this.amarelos = g(this.amarelos, Uint8Array);
    this.indisponivelAte = g(this.indisponivelAte, Int32Array);
    this.ultimoJogo = g(this.ultimoJogo, Int32Array);
    for (const k of ['eJogos', 'eTitular', 'eMinutos', 'eGolos', 'eAssist', 'eAmarelos', 'eVermelhos', 'eLesoes', 'eRemates', 'eSofridos'] as const) this[k] = g(this[k], Uint16Array);
    this.eNotas = g(this.eNotas, Int32Array);
    this.minMes = g(this.minMes, Uint16Array);
    this.adeq = g(this.adeq, Uint8Array, N_PAPEIS);
    this.ovr = g(this.ovr, Uint8Array, N_POS);
    this.adeqMaxPos = g(this.adeqMaxPos, Uint8Array, N_POS);
    this.cap = novo;
  }

  codigoPais(p: string): number {
    let i = this.idxPais.get(p);
    if (i === undefined) { i = this.paises.length; this.paises.push(p); this.idxPais.set(p, i); }
    return i;
  }

  idx(id: string): number | undefined {
    return this.porId.get(id);
  }

  /** Acrescenta um jogador (atributos já preenchidos depois com `atr`). Devolve o índice. */
  novo(id: string, nome: string, pais: string): number {
    if (this.n === this.cap) this.crescer(this.cap * 2);
    const i = this.n++;
    this.ids[i] = id;
    this.nomes[i] = nome;
    this.porId.set(id, i);
    this.pais[i] = this.codigoPais(pais);
    this.clube[i] = -1;
    this.moral[i] = ESTADO.moral_inicial;
    this.condicao[i] = ESTADO.condicao_inicial;
    this.ritmo[i] = ESTADO.ritmo_inicial;
    this.entrosamento[i] = 50;
    return i;
  }

  a(i: number, k: number): number {
    return this.atr[i * N_ATR + k];
  }

  oculto(i: number, id: IdOculto): number {
    return this.ocu[i * N_OCU + IDX_OCU[id]];
  }

  /** Recalcula a adequação aos papéis e o OVR por posição de um jogador. */
  recalcular(i: number) {
    const base = i * N_ATR;
    for (let r = 0; r < N_PAPEIS; r++) {
      const { idx, w } = PESOS_ESPARSOS[r];
      let s = 0;
      for (let k = 0; k < idx.length; k++) s += w[k] * this.atr[base + idx[k]];
      this.adeq[i * N_PAPEIS + r] = Math.round(s * 10);
    }
    for (let p = 0; p < N_POS; p++) {
      const papeis = PAPEIS_DA_POSICAO[POSICOES[p]];
      let s = 0, mx = 0;
      for (const r of papeis) { const v = this.adeq[i * N_PAPEIS + r]; s += v; if (v > mx) mx = v; }
      this.adeqMaxPos[i * N_POS + p] = mx;
      const a = s / papeis.length / 10;
      this.ovr[i * N_POS + p] = Math.max(1, Math.min(100, Math.round(1 + (99 * (a - 1)) / 19)));
    }
  }

  /** Adequação ao papel (1–20, com uma casa decimal). */
  adequacao(i: number, papel: number): number {
    return this.adeq[i * N_PAPEIS + papel] / 10;
  }

  ovrPos(i: number, pos: Posicao | number): number {
    return this.ovr[i * N_POS + (typeof pos === 'number' ? pos : IDX_POS[pos])];
  }

  /** OVR na posição natural. */
  ovrNat(i: number): number {
    return this.ovr[i * N_POS + this.posNat[i]];
  }

  idade(i: number, dia: number): number {
    return (dia - this.nasc[i]) / 365.25;
  }

  /** Repõe as estatísticas da época de um conjunto de jogadores. */
  zerarEstatisticas(js: Iterable<number>) {
    for (const i of js) {
      this.eJogos[i] = this.eTitular[i] = this.eMinutos[i] = this.eGolos[i] = this.eAssist[i] = 0;
      this.eAmarelos[i] = this.eVermelhos[i] = this.eLesoes[i] = this.eRemates[i] = this.eSofridos[i] = 0;
      this.eNotas[i] = 0;
      this.amarelos[i] = 0;
    }
  }

  /** Bytes ocupados pelos arrays tipados (capacidade alocada). */
  bytes(): number {
    let s = 0;
    for (const v of Object.values(this)) if (ArrayBuffer.isView(v)) s += (v as Uint8Array).byteLength;
    return s;
  }
}
