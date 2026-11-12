// Taça nacional: eliminatórias com sorteio livre e entrada escalonada por liga.
// Enquanto ainda entram clubes, um nº ímpar dá uma isenção ao clube mais bem
// cotado; depois da última entrada, se o nº não for potência de 2, jogam só os
// clubes mais fracos (pré-eliminatória). Cada ronda pode ser a jogo único ou a
// duas mãos (rondas normais, meias e final configuráveis). As semanas de cada
// ronda vêm do planeador de taças do país (season/tacas.ts).
import type { RegrasTaca } from '../../data/types.ts';
import type { Rng } from '../../core/rng.ts';
import { vencedor, type Competicao, type JogoR } from './base.ts';
import type { Slot } from './matamata.ts';

/** Nº de rondas (a última é a final), dadas as entradas por ronda. */
export function contarRondas(entrantes: number[]): number {
  let n = 0;
  let r = 0;
  const ultimaEntrada = entrantes.length - 1;
  for (;;) {
    n += entrantes[r] ?? 0;
    if (n <= 1 && r >= ultimaEntrada) return r;
    if (r < ultimaEntrada) n = Math.floor(n / 2) + (n % 2);
    else if (n === 2) return r + 1;
    else n = (n & (n - 1)) === 0 ? n / 2 : 1 << Math.floor(Math.log2(n));
    r++;
  }
}

/** Mãos de cada ronda (0-based) numa taça com nR rondas. */
export function maosRonda(regras: RegrasTaca, r: number, nR: number): 1 | 2 {
  if (r === nR - 1) return regras.maos.final;
  if (r === nR - 2) return regras.maos.meias;
  return regras.maos.rondas;
}

export function entrantesPorRonda(regras: RegrasTaca, porLiga: Map<string, number[]>): number[][] {
  const maxRonda = Math.max(1, ...regras.participantes.map((l) => regras.entrada_por_liga[l] ?? 1));
  const out: number[][] = Array.from({ length: maxRonda }, () => []);
  for (const l of regras.participantes) out[(regras.entrada_por_liga[l] ?? 1) - 1].push(...(porLiga.get(l) ?? []));
  return out;
}

export class Taca implements Competicao {
  tipo = 'taca' as const;
  id: string;
  nome: string;
  vencedorFinal: number | null = null;
  finalista: number | null = null;
  jogoFinal: JogoR | null = null;
  /** Ronda (1..) em que cada clube foi eliminado; o vencedor fica com nRondas + 1. */
  fase = new Map<number, number>();
  nRondas = 0;
  private entrantes: number[][];
  private emProva: number[] = [];
  private ronda = 0;
  private abertos: JogoR[] = [];
  private criada = -1;
  private isentos: number[] = [];

  constructor(
    public regras: RegrasTaca,
    porLiga: Map<string, number[]>,
    /** Ordem de força para isenções (menor = mais forte). */
    private forca: (c: number) => number,
    /** Slots de cada ronda: 1 (jogo único) ou 2 (ida e volta). */
    private slots: Slot[][],
    private rng: Rng,
  ) {
    this.id = regras.id;
    this.nome = regras.nome;
    this.entrantes = entrantesPorRonda(regras, porLiga);
    this.nRondas = contarRondas(this.entrantes.map((e) => e.length));
    if (slots.length !== this.nRondas) throw new Error(`${this.id}: ${slots.length} slots para ${this.nRondas} rondas`);
  }

  jogosDaSemana(s: number): JogoR[] {
    if (this.vencedorFinal !== null || this.ronda >= this.nRondas) return [];
    if (this.slots[this.ronda][0].semana === s && this.criada !== this.ronda) {
      this.criada = this.ronda;
      this.criarRonda();
    }
    return this.abertos.filter((j) => j.semana === s && !j.r);
  }

  private criarRonda() {
    const r = this.ronda;
    const pool = [...this.emProva, ...(this.entrantes[r] ?? [])];
    const ultimaEntrada = this.entrantes.length - 1;
    const ordem = [...pool].sort((a, b) => this.forca(a) - this.forca(b));
    let jogam: number[];
    if (r < ultimaEntrada) {
      this.isentos = pool.length % 2 ? [ordem[0]] : [];
      jogam = pool.length % 2 ? ordem.slice(1) : ordem;
    } else if ((pool.length & (pool.length - 1)) === 0) {
      this.isentos = [];
      jogam = ordem;
    } else {
      const P = 1 << Math.floor(Math.log2(pool.length));
      const m = pool.length - P;
      this.isentos = ordem.slice(0, pool.length - 2 * m);
      jogam = ordem.slice(pool.length - 2 * m);
    }
    this.rng.shuffle(jogam);
    const final = r === this.nRondas - 1;
    const sl = this.slots[r];
    const neutra = final && sl.length === 1 && this.regras.final_neutra;
    this.abertos = [];
    for (let i = 0; i + 1 < jogam.length; i += 2) {
      const [a, b] = [jogam[i], jogam[i + 1]];
      if (sl.length === 1) {
        this.abertos.push({ comp: this.id, ronda: r + 1, semana: sl[0].semana, ranhura: sl[0].ranhura, dia: this.rng.pick(sl[0].dias), casa: a, fora: b, decisivo: true, neutro: neutra });
      } else {
        const ida: JogoR = { comp: this.id, ronda: r + 1, semana: sl[0].semana, ranhura: sl[0].ranhura, dia: this.rng.pick(sl[0].dias), casa: a, fora: b };
        this.abertos.push(ida, { comp: this.id, ronda: r + 1, semana: sl[1].semana, ranhura: sl[1].ranhura, dia: this.rng.pick(sl[1].dias), casa: b, fora: a, decisivo: true, ida });
      }
    }
    if (this.abertos.length === 0) this.avancar();
  }

  registar(j: JogoR) {
    if (!j.decisivo) return;
    const v = vencedor(j);
    const p = v === j.casa ? j.fora : j.casa;
    this.fase.set(p, this.ronda + 1);
    if (this.ronda === this.nRondas - 1) {
      this.vencedorFinal = v;
      this.finalista = p;
      this.jogoFinal = j;
      this.fase.set(v, this.nRondas + 1);
    }
    if (this.abertos.every((x) => x.r)) this.avancar();
  }

  private avancar() {
    this.emProva = [...this.isentos, ...this.abertos.filter((x) => x.decisivo).map((x) => vencedor(x))];
    this.isentos = [];
    this.ronda++;
  }

  terminada(): boolean {
    return this.vencedorFinal !== null;
  }
}
