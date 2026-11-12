// Taça nacional: eliminatórias a jogo único com sorteio livre e entrada
// escalonada por nível. Enquanto ainda entram clubes, um nº ímpar dá uma
// isenção ao clube mais bem cotado; depois da última entrada, se o nº não for
// potência de 2, jogam só os clubes mais fracos (pré-eliminatória). Final neutra.
import type { RegrasTaca } from '../../data/types.ts';
import type { ModeloCalendario } from '../../config/calendario.ts';
import { CALENDARIO } from '../../config/calendario.ts';
import type { Rng } from '../../core/rng.ts';
import { espacar } from '../calendar/scheduler.ts';
import { vencedor, type Competicao, type JogoR } from './base.ts';

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
  private entrantes: number[][] = []; // por ronda (0-based)
  private semanas: number[] = [];
  private emProva: number[] = [];
  private ronda = 0;
  private abertos: JogoR[] = [];
  private criada = -1;

  constructor(
    public regras: RegrasTaca,
    /** Clubes por nível (índice 0 = nível 1). */
    porNivel: number[][],
    /** Ordem de força para isenções (menor = mais forte). */
    private forca: (c: number) => number,
    private modelo: ModeloCalendario,
    private rng: Rng,
  ) {
    this.id = regras.id;
    this.nome = regras.nome;
    const maxRonda = Math.max(...Object.values(regras.entrada_por_nivel));
    for (let r = 0; r < maxRonda; r++) this.entrantes.push([]);
    porNivel.forEach((cl, i) => {
      const r = (regras.entrada_por_nivel[String(i + 1)] ?? 1) - 1;
      this.entrantes[r].push(...cl);
    });
    this.nRondas = this.contarRondas();
    // Rondas antes da final em semanas de meio da semana; final no fim-de-semana.
    this.semanas = [...espacar(modelo.taca, this.nRondas - 1), modelo.final_taca];
  }

  private contarRondas(): number {
    let n = 0;
    let r = 0;
    const ultimaEntrada = this.entrantes.length - 1;
    for (;;) {
      n += this.entrantes[r]?.length ?? 0;
      if (n <= 1 && r >= ultimaEntrada) return r;
      if (r < ultimaEntrada) n = Math.floor(n / 2) + (n % 2);
      else if (n === 2) return r + 1;
      else n = (n & (n - 1)) === 0 ? n / 2 : 1 << Math.floor(Math.log2(n));
      r++;
    }
  }

  jogosDaSemana(s: number): JogoR[] {
    if (this.vencedorFinal !== null || this.ronda >= this.nRondas) return [];
    if (this.semanas[this.ronda] === s && this.criada !== this.ronda) {
      this.criada = this.ronda;
      this.criarRonda();
    }
    return this.abertos.filter((j) => j.semana === s && !j.r);
  }

  private isentos: number[] = [];

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
    const s = this.semanas[r];
    const dias = final ? [5] : CALENDARIO.dias.meio;
    this.abertos = [];
    for (let i = 0; i + 1 < jogam.length; i += 2) {
      this.abertos.push({
        comp: this.id, ronda: r + 1, semana: s, ranhura: final ? 'fds' : 'meio', dia: this.rng.pick(dias),
        casa: jogam[i], fora: jogam[i + 1], decisivo: true, neutro: final,
      });
    }
    if (this.abertos.length === 0) this.avancar();
  }

  registar(j: JogoR) {
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
    this.emProva = [...this.isentos, ...this.abertos.map((x) => vencedor(x))];
    this.isentos = [];
    this.ronda++;
  }

  terminada(): boolean {
    return this.vencedorFinal !== null;
  }
}
