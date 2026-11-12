// Eliminatórias com cabeças-de-série (play-offs, barragens, fases a eliminar
// das continentais). Em cada ronda o melhor cabeça-de-série defronta o pior
// ainda em prova; na 1.ª ronda os melhores ficam isentos até a ronda seguinte
// ter uma potência de 2. Jogo único em casa do melhor (ou neutro na final);
// a duas mãos, a 2.ª mão é em casa do melhor.
import type { Ranhura } from '../../config/calendario.ts';
import type { Rng } from '../../core/rng.ts';
import { vencedor, type Competicao, type JogoR } from './base.ts';

export interface Slot {
  semana: number;
  ranhura: Ranhura;
  dias: number[];
}

export interface RondaCfg {
  maos: 1 | 2;
  /** 1 slot (jogo único) ou 2 slots (ida e volta). */
  slots: Slot[];
  neutra?: boolean;
}

export class MataMata implements Competicao {
  /** Ronda em que cada clube foi eliminado (0-based); o vencedor fica com o nº de rondas. */
  fase = new Map<number, number>();
  vencedorFinal: number | null = null;
  finalista: number | null = null;
  jogoFinal: JogoR | null = null;
  participantes: number[] | null = null;
  private rondas: RondaCfg[] = [];
  private emProva: number[] = [];
  private ronda = 0;
  private abertos: JogoR[] = [];
  private criados = new Set<string>();
  private semente: number[] = [];

  constructor(
    public id: string,
    public nome: string,
    public tipo: 'playoff' | 'barragem' | 'continental',
    /** Participantes por ordem de cabeça-de-série (melhor primeiro), ou null se ainda não se sabem. */
    private obter: () => number[] | null,
    /** Configuração das rondas, dado o nº de rondas necessário. */
    private planear: (nRondas: number) => RondaCfg[],
    private rng: Rng,
  ) {}

  private iniciar(): boolean {
    if (this.participantes) return true;
    const p = this.obter();
    if (!p) return false;
    this.participantes = p;
    this.semente = p;
    this.emProva = [...p];
    const n = Math.max(1, Math.ceil(Math.log2(p.length)));
    this.rondas = p.length < 2 ? [] : this.planear(n);
    if (p.length === 1) this.vencedorFinal = p[0];
    return true;
  }

  private seed(c: number): number {
    return this.semente.indexOf(c);
  }

  jogosDaSemana(s: number): JogoR[] {
    if (!this.iniciar() || this.vencedorFinal !== null) return [];
    const out: JogoR[] = [];
    const cfg = this.rondas[this.ronda];
    if (!cfg) return out;
    const chave = `${this.ronda}`;
    if (cfg.slots[0].semana === s && !this.criados.has(chave)) {
      this.criados.add(chave);
      this.criarRonda(cfg);
    }
    for (const j of this.abertos) if (j.semana === s && !j.r) out.push(j);
    return out;
  }

  private criarRonda(cfg: RondaCfg) {
    const ordem = [...this.emProva].sort((a, b) => this.seed(a) - this.seed(b));
    const P = 1 << Math.ceil(Math.log2(ordem.length));
    const isentos = this.ronda === 0 ? P - ordem.length : 0;
    const jogam = ordem.slice(isentos);
    this.abertos = [];
    for (let i = 0; i < jogam.length / 2; i++) {
      const melhor = jogam[i];
      const pior = jogam[jogam.length - 1 - i];
      if (cfg.maos === 1) {
        const s = cfg.slots[0];
        this.abertos.push({ comp: this.id, ronda: this.ronda + 1, semana: s.semana, ranhura: s.ranhura, dia: this.rng.pick(s.dias), casa: melhor, fora: pior, decisivo: true, neutro: !!cfg.neutra });
      } else {
        const [s1, s2] = cfg.slots;
        const ida: JogoR = { comp: this.id, ronda: this.ronda + 1, semana: s1.semana, ranhura: s1.ranhura, dia: this.rng.pick(s1.dias), casa: pior, fora: melhor };
        const volta: JogoR = { comp: this.id, ronda: this.ronda + 1, semana: s2.semana, ranhura: s2.ranhura, dia: this.rng.pick(s2.dias), casa: melhor, fora: pior, decisivo: true, ida };
        this.abertos.push(ida, volta);
      }
    }
    // Isentos passam directamente.
    this.isentos = ordem.slice(0, isentos);
  }
  private isentos: number[] = [];

  registar(j: JogoR) {
    if (!j.decisivo) return;
    const v = vencedor(j);
    const p = v === j.casa ? j.fora : j.casa;
    this.fase.set(p, this.ronda);
    if (this.abertos.every((x) => x.r)) {
      const vencedores = this.abertos.filter((x) => x.decisivo).map((x) => vencedor(x));
      this.emProva = [...this.isentos, ...vencedores];
      this.isentos = [];
      if (this.ronda === this.rondas.length - 1) {
        this.vencedorFinal = v;
        this.finalista = p;
        this.jogoFinal = j;
        this.fase.set(v, this.rondas.length);
      }
      this.ronda++;
    }
  }

  /** Clubes ainda em prova (no fim: os vencedores da última ronda). */
  sobreviventes(): number[] {
    return [...this.emProva];
  }

  terminada(): boolean {
    return this.vencedorFinal !== null || (this.participantes !== null && this.participantes.length === 0);
  }
}
