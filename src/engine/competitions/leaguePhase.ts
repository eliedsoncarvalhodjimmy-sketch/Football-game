// Fase de liga estilo UEFA (36 ou 32 equipas, 8 jogos cada): 4 potes por
// reputação; cada equipa joga 2 adversários de cada pote (1 em casa, 1 fora),
// nunca do mesmo país, com no máximo 2 adversários de um mesmo país.
// Depois: 1.º–8.º directos aos oitavos; 9.º–24.º play-off a duas mãos;
// eliminatórias a duas mãos e final em campo neutro.
import { CALENDARIO, type ModeloCalendario } from '../../config/calendario.ts';
import type { Rng } from '../../core/rng.ts';
import type { Competicao, JogoR } from './base.ts';
import { MataMata, type RondaCfg } from './matamata.ts';
import { Tabela, type LinhaTabela } from './table.ts';
import type { CompContinental } from '../../data/load.ts';

export interface Equipa {
  clube: number;
  pais: string;
  forca: number; // para os potes
}

type Aresta = [number, number]; // [casa, fora] em índices locais

/** Permutação aleatória de b em a que respeita `ok(i, j)`; null se falhar. */
function emparelhar(a: number[], b: number[], ok: (i: number, j: number) => boolean, rng: Rng, proibidos?: Map<number, number>): Map<number, number> | null {
  for (let t = 0; t < 400; t++) {
    const livres = rng.shuffle([...b]);
    const m = new Map<number, number>();
    let falhou = false;
    for (const i of rng.shuffle([...a])) {
      const k = livres.findIndex((j) => j !== i && ok(i, j) && proibidos?.get(i) !== j && m.get(j) !== i);
      if (k < 0) { falhou = true; break; }
      m.set(i, livres[k]);
      livres.splice(k, 1);
    }
    if (!falhou) return m;
  }
  return null;
}

/** Sorteio dos 8 adversários. Devolve as arestas [casa, fora] (índices locais). */
export function sortearFaseLiga(eq: Equipa[], potes: number, rng: Rng, maxMesmoPais = 2): Aresta[] {
  const porPote: number[][] = [];
  const ordem = eq.map((_, i) => i).sort((x, y) => eq[y].forca - eq[x].forca);
  const tam = eq.length / potes;
  for (let p = 0; p < potes; p++) porPote.push(ordem.slice(p * tam, (p + 1) * tam));
  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const arestas: Aresta[] = [];
    const jogou = new Set<string>();
    const contaPais = new Map<string, number>(); // "i|pais"
    const ok = (i: number, j: number) => {
      if (eq[i].pais === eq[j].pais) return false;
      if (jogou.has(`${i}|${j}`)) return false;
      return (contaPais.get(`${i}|${eq[j].pais}`) ?? 0) < maxMesmoPais && (contaPais.get(`${j}|${eq[i].pais}`) ?? 0) < maxMesmoPais;
    };
    const juntar = (c: number, f: number) => {
      arestas.push([c, f]);
      jogou.add(`${c}|${f}`); jogou.add(`${f}|${c}`);
      contaPais.set(`${c}|${eq[f].pais}`, (contaPais.get(`${c}|${eq[f].pais}`) ?? 0) + 1);
      contaPais.set(`${f}|${eq[c].pais}`, (contaPais.get(`${f}|${eq[c].pais}`) ?? 0) + 1);
    };
    let falhou = false;
    for (let p = 0; p < potes && !falhou; p++) {
      for (let q = p; q < potes && !falhou; q++) {
        const A = porPote[p], B = porPote[q];
        // Recebe em casa um de B e visita outro de B.
        const casa = emparelhar(A, B, ok, rng);
        if (!casa) { falhou = true; break; }
        // Dentro do mesmo pote, "i recebe casa(i)" já dá a cada um 1 jogo em casa e 1 fora.
        if (p === q) { for (const [i, j] of casa) juntar(i, j); continue; }
        for (const [i, j] of casa) juntar(i, j);
        const fora = emparelhar(A, B, ok, rng);
        if (!fora) { falhou = true; break; }
        for (const [i, j] of fora) juntar(j, i);
      }
    }
    if (falhou) continue;
    // Confirma o limite de adversários do mesmo país (as permutações não o actualizam a meio).
    const contagem = new Map<string, number>();
    for (const [c, f] of arestas) {
      for (const [x, y] of [[c, f], [f, c]]) contagem.set(`${x}|${eq[y].pais}`, (contagem.get(`${x}|${eq[y].pais}`) ?? 0) + 1);
    }
    if ([...contagem.values()].every((v) => v <= maxMesmoPais)) return arestas;
  }
  throw new Error('não foi possível sortear a fase de liga');
}

/** Distribui as arestas por k jornadas (cada equipa joga 1 vez por jornada). Coloração com cadeias de Kempe. */
export function distribuirJornadas(n: number, arestas: Aresta[], k: number, rng: Rng): number[] {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const cor = new Array(arestas.length).fill(-1);
    const em: number[][] = Array.from({ length: n }, () => new Array(k).fill(-1)); // em[v][c] = aresta
    let falhou = false;
    for (const e of rng.shuffle(arestas.map((_, i) => i))) {
      const [u, v] = arestas[e];
      let c = -1;
      for (let x = 0; x < k; x++) if (em[u][x] < 0 && em[v][x] < 0) { c = x; break; }
      if (c < 0) {
        // Tenta todas as combinações (a livre em u, b livre em v) com troca de Kempe a partir de v.
        for (let a = 0; a < k && c < 0; a++) {
          if (em[u][a] >= 0) continue;
          for (let b = 0; b < k && c < 0; b++) {
            if (em[v][b] >= 0 || a === b) continue;
            const caminho: number[] = [];
            let x = v, cc = a, chegaU = false;
            while (em[x][cc] >= 0) {
              const ed = em[x][cc];
              caminho.push(ed);
              const [p, q] = arestas[ed];
              x = p === x ? q : p;
              if (x === u) { chegaU = true; break; }
              cc = cc === a ? b : a;
            }
            if (chegaU) continue;
            for (const ed of caminho) { const [p, q] = arestas[ed]; em[p][cor[ed]] = -1; em[q][cor[ed]] = -1; }
            for (const ed of caminho) { cor[ed] = cor[ed] === a ? b : a; const [p, q] = arestas[ed]; em[p][cor[ed]] = ed; em[q][cor[ed]] = ed; }
            if (em[u][a] < 0 && em[v][a] < 0) c = a;
          }
        }
        if (c < 0) { falhou = true; break; }
      }
      cor[e] = c;
      em[u][c] = e;
      em[v][c] = e;
    }
    if (!falhou) return cor;
  }
  throw new Error('não foi possível distribuir as jornadas');
}

export class FaseLigaUEFA implements Competicao {
  tipo = 'continental' as const;
  tabela: Tabela;
  jogos: JogoR[] = [];
  playoff: MataMata;
  final: MataMata;
  private registados = 0;
  private classif: LinhaTabela[] | null = null;
  id: string;
  nome: string;

  constructor(public cfg: CompContinental, public equipas: Equipa[], m: ModeloCalendario, rng: Rng) {
    this.id = cfg.id;
    this.nome = cfg.nome;
    const n = equipas.length;
    const jornadas = Number(cfg.jogos_por_equipa);
    // Se a distribuição pelas jornadas falhar (raro), repete o sorteio.
    let arestas: Aresta[] = [];
    let cor: number[] | null = null;
    for (let t = 0; t < 50 && !cor; t++) {
      arestas = sortearFaseLiga(equipas, Number(cfg.potes), rng, Number(cfg.max_mesmo_pais_por_adversarios ?? 2));
      try { cor = distribuirJornadas(n, arestas, jornadas, rng); } catch { cor = null; }
    }
    if (!cor) throw new Error(`${cfg.id}: não foi possível montar o calendário da fase de liga`);
    const dias = CALENDARIO.dias.continental[cfg.id] ?? [2];
    const cores = cor;
    arestas.forEach(([c, f], e) => {
      this.jogos.push({ comp: this.id, ronda: cores[e] + 1, semana: m.continentais.fase_liga[cores[e]], ranhura: 'meio', dia: rng.pick(dias), casa: equipas[c].clube, fora: equipas[f].clube });
    });
    this.tabela = new Tabela(equipas.map((e) => e.clube));
    const c = m.continentais;
    const meio = (s: number) => ({ semana: s, ranhura: 'meio' as const, dias });
    const [d1, d2] = cfg.playoff as number[];
    this.playoff = new MataMata(`${this.id}_po`, `${this.nome} (play-off)`, 'continental',
      () => (this.terminouFase() ? this.classificacao().slice(d1 - 1, d2).map((l) => l.clube) : null),
      () => [{ maos: 2, slots: [meio(c.playoff[0]), meio(c.playoff[1])] }], rng);
    const [o1, o2] = cfg.directos_oitavos as number[];
    const diaFinal = this.id === 'uefa_cl' ? { semana: c.final, ranhura: 'fds' as const, dias: [5] } : { semana: c.final, ranhura: 'meio' as const, dias };
    this.final = new MataMata(`${this.id}_ko`, this.nome, 'continental',
      () => {
        if (!this.playoff.terminada() || !this.terminouFase()) return null;
        const pos = new Map(this.classificacao().map((l, i) => [l.clube, i]));
        const vencPO = this.playoff.sobreviventes().sort((a, b) => pos.get(a)! - pos.get(b)!);
        return [...this.classificacao().slice(o1 - 1, o2).map((l) => l.clube), ...vencPO];
      },
      (nr) => {
        const r: RondaCfg[] = [];
        const pares = [c.oitavos, c.quartos, c.meias];
        for (let i = 0; i < nr - 1; i++) r.push({ maos: 2, slots: [meio(pares[i][0]), meio(pares[i][1])] });
        r.push({ maos: 1, slots: [diaFinal], neutra: true });
        return r;
      }, rng);
  }

  private terminouFase() {
    return this.registados === this.jogos.length;
  }

  classificacao(): LinhaTabela[] {
    if (!this.classif) this.classif = this.tabela.ordenar(['pontos', 'dg', 'gm', 'vitorias', 'sorteio'], this.id);
    return this.classif;
  }

  jogosDaSemana(s: number): JogoR[] {
    return [...this.jogos.filter((j) => j.semana === s), ...this.playoff.jogosDaSemana(s), ...this.final.jogosDaSemana(s)];
  }

  registar(j: JogoR) {
    if (j.comp === this.id) { this.tabela.registar(j.casa, j.fora, j.r!.gc, j.r!.gf); this.registados++; }
    else if (j.comp === this.playoff.id) this.playoff.registar(j);
    else this.final.registar(j);
  }

  terminada(): boolean {
    return this.final.terminada();
  }

  /** Fase alcançada por clube: 'liga' | 'playoff' | 'oitavos' | 'quartos' | 'meias' | 'final' | 'vencedor'. */
  faseDe(clube: number): string {
    if (this.final.vencedorFinal === clube) return 'vencedor';
    const f = this.final.fase.get(clube);
    if (f !== undefined) return ['oitavos', 'quartos', 'meias', 'final'][f] ?? 'final';
    if (this.playoff.fase.has(clube)) return 'playoff';
    return 'liga';
  }
}
