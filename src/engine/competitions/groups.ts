// Fase de grupos + eliminatórias (Libertadores e Liga dos Campeões Asiática):
// 4 grupos de 4 (duas voltas), 1.º e 2.º aos quartos; quartos e meias a duas
// mãos; final em campo neutro. Potes por força; evita clubes do mesmo país no
// mesmo grupo quando possível.
import { CALENDARIO, type ModeloCalendario } from '../../config/calendario.ts';
import type { Rng } from '../../core/rng.ts';
import type { CompContinental } from '../../data/load.ts';
import type { Competicao, JogoR } from './base.ts';
import { MataMata, type RondaCfg } from './matamata.ts';
import { rondasBerger } from './roundRobin.ts';
import { Tabela, type LinhaTabela } from './table.ts';
import type { Equipa } from './leaguePhase.ts';

export function sortearGrupos(eq: Equipa[], nGrupos: number, rng: Rng): number[][] {
  const ordem = eq.map((_, i) => i).sort((a, b) => eq[b].forca - eq[a].forca);
  const porGrupo = eq.length / nGrupos;
  let melhor: number[][] = [];
  let melhorChoques = Infinity;
  for (let t = 0; t < 500 && melhorChoques > 0; t++) {
    const grupos: number[][] = Array.from({ length: nGrupos }, () => []);
    for (let p = 0; p < porGrupo; p++) {
      const pote = rng.shuffle(ordem.slice(p * nGrupos, (p + 1) * nGrupos));
      pote.forEach((e, g) => grupos[g].push(e));
    }
    let choques = 0;
    for (const g of grupos) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (eq[g[i]].pais === eq[g[j]].pais) choques++;
    if (choques < melhorChoques) { melhorChoques = choques; melhor = grupos; }
  }
  return melhor;
}

export class GruposEliminatorias implements Competicao {
  tipo = 'continental' as const;
  id: string;
  nome: string;
  grupos: { clubes: number[]; tabela: Tabela; jogos: JogoR[] }[] = [];
  ko: MataMata;
  private registados = 0;
  private total = 0;

  constructor(public cfg: CompContinental, public equipas: Equipa[], m: ModeloCalendario, rng: Rng) {
    this.id = cfg.id;
    this.nome = cfg.nome;
    const nG = Number(cfg.grupos);
    const dias = CALENDARIO.dias.continental[cfg.id] ?? [1, 2];
    for (const g of sortearGrupos(equipas, nG, rng)) {
      const clubes = g.map((i) => equipas[i].clube);
      const jogos: JogoR[] = [];
      rondasBerger(clubes.length, Number(cfg.voltas)).forEach((rd, r) => {
        for (const [h, a] of rd) jogos.push({ comp: this.id, ronda: r + 1, semana: m.continentais.grupos[r], ranhura: 'meio', dia: rng.pick(dias), casa: clubes[h], fora: clubes[a] });
      });
      this.total += jogos.length;
      this.grupos.push({ clubes, tabela: new Tabela(clubes), jogos });
    }
    const c = m.continentais;
    const meio = (s: number) => ({ semana: s, ranhura: 'meio' as const, dias });
    const apuram = Number(cfg.apuram_por_grupo);
    this.ko = new MataMata(`${this.id}_ko`, this.nome, 'continental',
      () => {
        if (this.registados < this.total) return null;
        // Cabeças-de-série: 1.os classificados (por pontos, dg, gm) e depois os 2.os.
        const out: number[] = [];
        for (let p = 0; p < apuram; p++) {
          const linhas = this.grupos.map((g) => this.classificacao(g)[p]);
          linhas.sort((a, b) => b.pts - a.pts || b.gm - b.gs - (a.gm - a.gs) || b.gm - a.gm || a.clube - b.clube);
          out.push(...linhas.map((l) => l.clube));
        }
        return out;
      },
      (nr) => {
        const pares = [c.quartos_grupos, c.meias_grupos];
        const r: RondaCfg[] = [];
        for (let i = 0; i < nr - 1; i++) r.push({ maos: 2, slots: [meio(pares[i][0]), meio(pares[i][1])] });
        r.push({ maos: 1, slots: [{ semana: c.final, ranhura: 'fds', dias: [5] }], neutra: true });
        return r;
      }, rng);
  }

  classificacao(g: { tabela: Tabela }): LinhaTabela[] {
    return g.tabela.ordenar(['pontos', 'confronto_directo', 'dg', 'gm', 'sorteio'], this.id);
  }

  jogosDaSemana(s: number): JogoR[] {
    const out: JogoR[] = [];
    for (const g of this.grupos) for (const j of g.jogos) if (j.semana === s) out.push(j);
    return [...out, ...this.ko.jogosDaSemana(s)];
  }

  registar(j: JogoR) {
    if (j.comp === this.id) {
      this.grupos.find((g) => g.clubes.includes(j.casa))!.tabela.registar(j.casa, j.fora, j.r!.gc, j.r!.gf);
      this.registados++;
    } else this.ko.registar(j);
  }

  terminada(): boolean {
    return this.ko.terminada();
  }

  faseDe(clube: number): string {
    if (this.ko.vencedorFinal === clube) return 'vencedor';
    const f = this.ko.fase.get(clube);
    if (f !== undefined) return ['quartos', 'meias', 'final'][f] ?? 'final';
    return 'grupos';
  }
}
