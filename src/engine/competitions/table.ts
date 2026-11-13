// Classificação de uma liga com desempates configuráveis.
import type { Desempate } from '../../data/types.ts';
import { hash32 } from '../../core/rng.ts';

export interface LinhaTabela {
  clube: number;
  pj: number;
  v: number;
  e: number;
  d: number;
  gm: number;
  gs: number;
  pts: number;
  /** Pontos deduzidos (sanções). */
  ded?: number;
}

export class Tabela {
  private pos = new Map<number, number>();
  linhas: LinhaTabela[];
  /** Resultados [casa, fora, gc, gf] (para o confronto directo). */
  private res: number[] = [];

  constructor(clubes: number[], private pontosVitoria = 3) {
    this.linhas = clubes.map((clube, i) => {
      this.pos.set(clube, i);
      return { clube, pj: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, pts: 0 };
    });
  }

  /** Dedução de pontos (sanção): fica registada na linha. */
  deduzir(clube: number, pts: number) {
    const i = this.pos.get(clube);
    if (i === undefined) return false;
    this.linhas[i].pts -= pts;
    this.linhas[i].ded = (this.linhas[i].ded ?? 0) + pts;
    return true;
  }

  registar(casa: number, fora: number, gc: number, gf: number) {
    const a = this.linhas[this.pos.get(casa)!];
    const b = this.linhas[this.pos.get(fora)!];
    a.pj++; b.pj++;
    a.gm += gc; a.gs += gf; b.gm += gf; b.gs += gc;
    if (gc > gf) { a.v++; b.d++; a.pts += this.pontosVitoria; }
    else if (gc < gf) { b.v++; a.d++; b.pts += this.pontosVitoria; }
    else { a.e++; b.e++; a.pts++; b.pts++; }
    this.res.push(casa, fora, gc, gf);
  }

  /** Mini-tabela (pontos, dg, gm) entre um grupo de clubes. */
  private miniTabela(grupo: Set<number>): Map<number, [number, number, number]> {
    const m = new Map<number, [number, number, number]>();
    for (const c of grupo) m.set(c, [0, 0, 0]);
    for (let i = 0; i < this.res.length; i += 4) {
      const [c, f, gc, gf] = [this.res[i], this.res[i + 1], this.res[i + 2], this.res[i + 3]];
      if (!grupo.has(c) || !grupo.has(f)) continue;
      const a = m.get(c)!;
      const b = m.get(f)!;
      a[1] += gc - gf; a[2] += gc; b[1] += gf - gc; b[2] += gf;
      if (gc > gf) a[0] += 3; else if (gc < gf) b[0] += 3; else { a[0]++; b[0]++; }
    }
    return m;
  }

  /** Clubes ordenados (1.º primeiro). `sal` torna o sorteio determinístico. */
  ordenar(desempates: Desempate[], sal: number | string = 0): LinhaTabela[] {
    const porPts = new Map<number, Set<number>>();
    for (const l of this.linhas) {
      if (!porPts.has(l.pts)) porPts.set(l.pts, new Set());
      porPts.get(l.pts)!.add(l.clube);
    }
    const minis = new Map<number, Map<number, [number, number, number]>>();
    const mini = (l: LinhaTabela) => {
      if (!minis.has(l.pts)) minis.set(l.pts, this.miniTabela(porPts.get(l.pts)!));
      return minis.get(l.pts)!.get(l.clube)!;
    };
    const cmp = (a: LinhaTabela, b: LinhaTabela): number => {
      for (const d of desempates) {
        let x = 0;
        switch (d) {
          case 'pontos': x = b.pts - a.pts; break;
          case 'dg': x = b.gm - b.gs - (a.gm - a.gs); break;
          case 'gm': x = b.gm - a.gm; break;
          case 'vitorias': x = b.v - a.v; break;
          case 'confronto_directo': {
            const ma = mini(a), mb = mini(b);
            x = mb[0] - ma[0] || mb[1] - ma[1] || mb[2] - ma[2];
            break;
          }
          case 'sorteio': x = hash32(sal, a.clube) - hash32(sal, b.clube); break;
        }
        if (x !== 0) return x;
      }
      return a.clube - b.clube;
    };
    return [...this.linhas].sort(cmp);
  }
}
