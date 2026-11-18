// Ligas juvenis (plano juvenil, resposta do utilizador): em todos os países do jogo, por escalão (Sub-18 e Sub-21),
// a 1.ª e a 2.ª divisão jogam juntas, todos contra todos a uma volta; os 8 primeiros vão ao playoff (quartos e meias a
// uma mão em casa do melhor classificado, final em campo neutro). Os clubes da 3.ª e 4.ª divisão jogam amigáveis
// semanais entre si (sem tabela). Tudo simulado em segundo plano, sem tácticas: a força de cada equipa é o OVR médio do
// onze do escalão (mais o treinador do escalão); os golos saem da mesma fórmula do modo rápido e são distribuídos pelos
// jogadores. Os minutos reais entram na evolução dos juniores (em vez de um número fixo por escalão).
import { Rng } from '../core/rng.ts';
import { POSICOES } from '../config/papeis.ts';
import { golosEsperados, sortearGolos } from '../engine/match/quickSim.ts';
import { SIMULACAO_ONZE } from '../config/simulacao.ts';
import { LIGAS_JUVENIS as LJ } from '../config/academia.ts';
import type { World } from '../engine/world.ts';
import type { Academia } from './academia.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export type Escalao = 'sub18' | 'sub21';
export const ESCALOES_J: Escalao[] = ['sub18', 'sub21'];
const DIA_MS = 864e5;

export interface JogoJuvenil { jornada: number; casa: number; fora: number; gc: number; gf: number; fase: 'regular' | 'quartos' | 'meias' | 'final'; penaltis?: [number, number] }
export interface LinhaTabela { clube: number; j: number; v: number; e: number; d: number; gm: number; gs: number; pts: number }

export interface LigaJuvenil {
  pais: string;
  esc: Escalao;
  clubes: number[];
  /** Divisão de cada clube (1 ou 2) no arranque da época. */
  divisao: Map<number, number>;
  /** Calendário: jornadas de pares [casa, fora]. */
  jornadas: [number, number][][];
  /** Semana (índice desde o arranque) de cada jornada. */
  semanaJornada: number[];
  tabela: Map<number, LinhaTabela>;
  jogos: JogoJuvenil[];
  jornadaActual: number;
  playoff: { quartos: JogoJuvenil[]; meias: JogoJuvenil[]; final: JogoJuvenil | null; campeao: number };
}

/** Grupo de amigáveis de um país (3.ª e 4.ª divisão). */
interface GrupoAmigaveis { pais: string; esc: Escalao; clubes: number[] }

export class LigasJuvenis {
  epoca = -1;
  inicio = 0;
  ligas: LigaJuvenil[] = [];
  amigaveis: GrupoAmigaveis[] = [];
  historico: { epoca: number; pais: string; esc: Escalao; campeao: number; finalista: number; resultado: string }[] = [];
  /** Estatísticas da época por jogador (todos os juniores). */
  jogos = new Uint16Array(0);
  golos = new Uint16Array(0);
  assist = new Uint16Array(0);
  notas = new Uint32Array(0); // soma das notas × 10
  /** Minutos desde a última evolução dos juniores (dia 15 de cada mês). */
  minMes = new Uint16Array(0);
  /** Liga de cada clube por escalão (índice em `ligas`), para a interface. */
  private ligaDoClube = new Map<string, number>();

  constructor(public w: World, public ac: Academia) { if (w.jogadores) this.garantir(); }

  garantir() {
    const cap = this.w.jogadores!.cap;
    if (this.jogos.length >= cap) return;
    const g = <T extends Uint16Array | Uint32Array>(a: T, C: new (n: number) => T) => { const b = new C(cap); b.set(a); return b; };
    this.jogos = g(this.jogos, Uint16Array); this.golos = g(this.golos, Uint16Array); this.assist = g(this.assist, Uint16Array);
    this.notas = g(this.notas, Uint32Array); this.minMes = g(this.minMes, Uint16Array);
  }

  /** Época juvenil de um dia: começa em Agosto. */
  static epocaDe(dia: number): number { const d = new Date(dia * DIA_MS); return d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }

  // ---------------------------------------------------------------- calendário

  /** Arranque da época: ligas por país (1.ª + 2.ª divisão), grupos de amigáveis (3.ª e abaixo) e calendários. */
  iniciarEpoca(epoca: number) {
    const w = this.w;
    this.fecharEpoca();
    this.epoca = epoca;
    const ago = Math.floor(Date.UTC(epoca, 7, LJ.dia_inicio) / DIA_MS);
    this.inicio = ago - ((new Date(ago * DIA_MS).getUTCDay() + 6) % 7); // segunda-feira
    const maio = Math.floor(Date.UTC(epoca + 1, 4, 1) / DIA_MS);
    const semanasRegulares = Math.max(10, Math.floor((maio - this.inicio) / 7));
    this.ligas = []; this.amigaveis = []; this.ligaDoClube.clear();
    // Clubes por país e divisão.
    const porPais = new Map<string, Map<number, number[]>>();
    for (let c = 0; c < w.clubes.length; c++) {
      const l = w.liga[c];
      if (l < 0) continue;
      const pais = w.clubes[c].pais, nv = w.ligas[l].regras.nivel;
      const m = porPais.get(pais) ?? porPais.set(pais, new Map()).get(pais)!;
      (m.get(nv) ?? m.set(nv, []).get(nv)!).push(c);
    }
    for (const [pais, m] of [...porPais].sort((a, b) => a[0].localeCompare(b[0]))) {
      const principais = [...(m.get(1) ?? []), ...(m.get(2) ?? [])];
      const outros = [...m].filter(([nv]) => nv > 2).flatMap(([, cs]) => cs);
      for (const esc of ESCALOES_J) {
        if (principais.length >= 2) {
          const rng = Rng.de(w.semente, 'liga-juvenil', pais, esc, epoca);
          const clubes = [...principais];
          rng.shuffle(clubes);
          const jornadas = roundRobin(clubes);
          const R = jornadas.length;
          const liga: LigaJuvenil = {
            pais, esc, clubes, divisao: new Map(principais.map((c) => [c, w.ligas[w.liga[c]].regras.nivel])), jornadas,
            semanaJornada: jornadas.map((_, r) => Math.floor((r * semanasRegulares) / R)),
            tabela: new Map(clubes.map((c) => [c, { clube: c, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, pts: 0 }])), jogos: [], jornadaActual: 0,
            playoff: { quartos: [], meias: [], final: null, campeao: -1 },
          };
          for (const c of clubes) this.ligaDoClube.set(`${c}|${esc}`, this.ligas.length);
          this.ligas.push(liga);
        }
        if (outros.length >= 2) this.amigaveis.push({ pais, esc, clubes: outros });
      }
    }
  }

  /** Fecho: regista os campeões e zera as estatísticas da época. */
  private fecharEpoca() {
    for (const L of this.ligas) {
      const f = L.playoff.final;
      if (f && L.playoff.campeao >= 0) this.historico.push({ epoca: this.epoca, pais: L.pais, esc: L.esc, campeao: L.playoff.campeao, finalista: L.playoff.campeao === f.casa ? f.fora : f.casa, resultado: `${f.gc}-${f.gf}${f.penaltis ? ` (${f.penaltis[0]}-${f.penaltis[1]} g.p.)` : ''}` });
    }
    this.jogos.fill(0); this.golos.fill(0); this.assist.fill(0); this.notas.fill(0);
  }

  // ---------------------------------------------------------------- semana

  /** Joga a semana que começa em `segunda` (jogos ao sábado). */
  semana(segunda: number) {
    const w = this.w;
    if (!w.jogadores) return;
    this.garantir();
    const ep = LigasJuvenis.epocaDe(segunda);
    const mes = new Date(segunda * DIA_MS).getUTCMonth();
    if (ep !== this.epoca && mes === 7) this.iniciarEpoca(ep);
    if (this.epoca < 0 || segunda < this.inicio) return;
    const k = Math.floor((segunda - this.inicio) / 7), dia = segunda + 5;
    const rng = Rng.de(w.semente, 'juvenis', segunda);
    const forca = new Map<string, number>();
    const F = (c: number, esc: Escalao) => { const key = `${c}|${esc}`; let f = forca.get(key); if (f === undefined) { f = this.forca(c, esc, dia); forca.set(key, f); } return f; };
    let regular = false;
    for (const L of this.ligas) {
      while (L.jornadaActual < L.jornadas.length && L.semanaJornada[L.jornadaActual] <= k) {
        regular = true;
        for (const [a, b] of L.jornadas[L.jornadaActual]) L.jogos.push(this.jogar(L, a, b, L.jornadaActual + 1, 'regular', F, dia, rng));
        L.jornadaActual++;
      }
    }
    // Amigáveis semanais (3.ª e 4.ª divisão) durante a fase regular.
    if (regular || k < Math.max(...this.ligas.map((L) => L.semanaJornada.at(-1) ?? 0), 0)) {
      for (const g of this.amigaveis) {
        const cs = [...g.clubes];
        rng.shuffle(cs);
        for (let i = 0; i + 1 < cs.length; i += 2) this.jogarAmigavel(cs[i], cs[i + 1], g.esc, F, dia, rng);
      }
    }
    // Playoff em Maio: quartos, meias e final em semanas seguidas.
    if (mes === 4) for (const L of this.ligas) if (L.jornadaActual >= L.jornadas.length) this.avancarPlayoff(L, F, dia, rng);
  }

  private avancarPlayoff(L: LigaJuvenil, F: (c: number, e: Escalao) => number, dia: number, rng: Rng) {
    const P = L.playoff;
    const t = this.classificacao(L).map((x) => x.clube);
    if (t.length < 8) {
      // Ligas pequenas: final entre os 2 primeiros.
      if (!P.final && t.length >= 2) { P.final = this.jogar(L, t[0], t[1], 0, 'final', F, dia, rng, true); P.campeao = vencedor(P.final); }
      return;
    }
    if (!P.quartos.length) { P.quartos = [[0, 7], [3, 4], [1, 6], [2, 5]].map(([a, b]) => this.jogar(L, t[a], t[b], 0, 'quartos', F, dia, rng, false, true)); return; }
    if (!P.meias.length) { const v = P.quartos.map(vencedor); P.meias = [[v[0], v[1]], [v[2], v[3]]].map(([a, b]) => { const [x, y] = t.indexOf(a) <= t.indexOf(b) ? [a, b] : [b, a]; return this.jogar(L, x, y, 0, 'meias', F, dia, rng, false, true); }); return; }
    if (!P.final) { const [a, b] = P.meias.map(vencedor); P.final = this.jogar(L, a, b, 0, 'final', F, dia, rng, true, true); P.campeao = vencedor(P.final); }
  }

  // ---------------------------------------------------------------- jogo

  /** Onze do escalão (1 GR, 4 DEF, 4 MED, 2 AVA pelos melhores OVR; falta → o melhor que sobra) e 3 suplentes. */
  onze(c: number, esc: Escalao): { onze: number[]; suplentes: number[] } {
    const st = this.w.jogadores!;
    const lista = (esc === 'sub18' ? this.ac.sub18[c] : this.ac.sub21[c]).filter((j) => st.clube[j] === c && st.lesaoDias[j] <= 0);
    const ord = [...lista].sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
    const grupo = (j: number) => { const p = POSICOES[st.posNat[j]]; return p === 'GR' ? 'GR' : p === 'DC' || p === 'DD' || p === 'DE' || p === 'ALD' || p === 'ALE' ? 'DEF' : p === 'PL' || p === 'ED' || p === 'EE' ? 'AVA' : 'MED'; };
    const quer: Record<string, number> = { GR: 1, DEF: 4, MED: 4, AVA: 2 };
    const onze: number[] = [];
    for (const j of ord) { const g = grupo(j); if (quer[g] > 0) { quer[g]--; onze.push(j); } }
    for (const j of ord) { if (onze.length >= 11) break; if (!onze.includes(j)) onze.push(j); }
    const suplentes = ord.filter((j) => !onze.includes(j)).slice(0, LJ.suplentes);
    return { onze, suplentes };
  }

  /** Força (pontos de OVR): média do onze + treinador do escalão (trabalho com jovens e conhecimento táctico). */
  forca(c: number, esc: Escalao, _dia: number): number {
    const st = this.w.jogadores!;
    const { onze } = this.onze(c, esc);
    if (!onze.length) return LJ.forca_vazia;
    let s = 0;
    for (const j of onze) s += st.ovrNat(j);
    s = s / onze.length - LJ.falta_jogador * Math.max(0, 11 - onze.length);
    const sm = this.w.economia?.staff;
    if (sm?.porClube[c]) {
      const cargo = esc === 'sub18' ? 'treinador_sub18' : 'treinador_sub21';
      s += clamp((sm.atr(c, cargo, 'trabalho_jovens', 10) - 10) * LJ.treinador_por_ponto + (sm.atr(c, cargo, 'conhecimento_tactico', 10) - 10) * LJ.treinador_por_ponto, -LJ.treinador_limite, LJ.treinador_limite);
    }
    return s;
  }

  private sortear(fc: number, ff: number, neutro: boolean, rng: Rng): [number, number] {
    // Mesma fórmula do modo rápido, com a diferença em pontos de OVR (gama próprio).
    const [l, m] = golosEsperados(fc, ff, ff, fc, neutro, { ...SIMULACAO_ONZE, gama: LJ.gama, base: LJ.base });
    return sortearGolos(l, m, rng, SIMULACAO_ONZE.rho, SIMULACAO_ONZE);
  }

  private jogar(L: LigaJuvenil, a: number, b: number, jornada: number, fase: JogoJuvenil['fase'], F: (c: number, e: Escalao) => number, dia: number, rng: Rng, neutro = false, eliminatoria = false): JogoJuvenil {
    const [gc, gf] = this.sortear(F(a, L.esc), F(b, L.esc), neutro, rng);
    this.registar(a, L.esc, gc, gf, dia, rng);
    this.registar(b, L.esc, gf, gc, dia, rng);
    const jg: JogoJuvenil = { jornada, casa: a, fora: b, gc, gf, fase };
    if (fase === 'regular') {
      const ta = L.tabela.get(a)!, tb = L.tabela.get(b)!;
      ta.j++; tb.j++; ta.gm += gc; ta.gs += gf; tb.gm += gf; tb.gs += gc;
      if (gc > gf) { ta.v++; tb.d++; ta.pts += 3; } else if (gc < gf) { tb.v++; ta.d++; tb.pts += 3; } else { ta.e++; tb.e++; ta.pts++; tb.pts++; }
    } else if (eliminatoria && gc === gf) {
      let x = 0, y = 0;
      for (let k = 0; k < 5; k++) { if (rng.chance(0.75)) x++; if (rng.chance(0.75)) y++; }
      while (x === y) { if (rng.chance(0.75)) x++; if (rng.chance(0.75)) y++; }
      jg.penaltis = [x, y];
    }
    if (fase !== 'regular') L.jogos.push(jg);
    return jg;
  }

  private jogarAmigavel(a: number, b: number, esc: Escalao, F: (c: number, e: Escalao) => number, dia: number, rng: Rng) {
    const [gc, gf] = this.sortear(F(a, esc), F(b, esc), false, rng);
    this.registar(a, esc, gc, gf, dia, rng, true);
    this.registar(b, esc, gf, gc, dia, rng, true);
  }

  /** Minutos, golos, assistências e notas dos jogadores de um lado. Os amigáveis só contam minutos. */
  private registar(c: number, esc: Escalao, marcados: number, sofridos: number, _dia: number, rng: Rng, amigavel = false) {
    const st = this.w.jogadores!;
    const { onze, suplentes } = this.onze(c, esc);
    if (!onze.length) return;
    // 3 titulares (não GR) saem aos ~65'; entram os suplentes.
    const sai = new Set<number>();
    for (const j of onze.slice(1)) { if (sai.size >= suplentes.length) break; if (rng.chance(LJ.prob_substituido)) sai.add(j); }
    const med = onze.reduce((s, j) => s + st.ovrNat(j), 0) / onze.length;
    const minutos = new Map<number, number>();
    for (const j of onze) minutos.set(j, sai.has(j) ? LJ.minuto_substituicao : 90);
    [...sai].forEach((_, i) => minutos.set(suplentes[i], 90 - LJ.minuto_substituicao));
    const marcadores = new Map<number, number>(), assistentes = new Map<number, number>();
    if (!amigavel) {
      const peso = (j: number, t: Record<string, number>) => (t[POSICOES[st.posNat[j]]] ?? 0.1) * Math.max(0.2, 1 + (st.ovrNat(j) - med) / 15) * (minutos.get(j)! / 90);
      const js = [...minutos.keys()];
      const pick = (t: Record<string, number>, excl = -1) => { let tot = 0; for (const j of js) if (j !== excl) tot += peso(j, t); let r = rng.next() * tot; for (const j of js) { if (j === excl) continue; r -= peso(j, t); if (r <= 0) return j; } return js[js.length - 1]; };
      for (let g = 0; g < marcados; g++) {
        const m = pick(LJ.peso_golo);
        marcadores.set(m, (marcadores.get(m) ?? 0) + 1);
        if (rng.chance(LJ.prob_assistencia)) { const a = pick(LJ.peso_assist, m); assistentes.set(a, (assistentes.get(a) ?? 0) + 1); }
      }
    }
    const res = marcados > sofridos ? LJ.nota_vitoria : marcados < sofridos ? -LJ.nota_vitoria : 0;
    for (const [j, mins] of minutos) {
      this.minMes[j] = Math.min(65535, this.minMes[j] + mins);
      if (amigavel) continue;
      const g = marcadores.get(j) ?? 0, a = assistentes.get(j) ?? 0;
      const gr = st.posNat[j] === 0 ? -LJ.nota_sofrido * Math.max(0, sofridos - 1) + (sofridos === 0 ? LJ.nota_vitoria : 0) : 0;
      const nota = clamp(LJ.nota_base + res + LJ.nota_golo * g + LJ.nota_assist * a + gr + (st.ovrNat(j) - med) / 20 + rng.normal(0, LJ.nota_ruido), 3, 10);
      this.jogos[j]++; this.golos[j] += g; this.assist[j] += a; this.notas[j] += Math.round(nota * 10);
    }
  }

  // ---------------------------------------------------------------- leitura (interface e evolução)

  /** Parte dos minutos (0–1) para a evolução dos juniores: minutos reais desde a última evolução. */
  parteMinutos(j: number): number { return clamp(LJ.parte_minima + LJ.parte_escala * Math.min(1, (this.minMes[j] ?? 0) / LJ.minutos_mes_referencia), 0, 1); }
  zerarMinutos() { this.minMes.fill(0); }

  classificacao(L: LigaJuvenil): LinhaTabela[] {
    return [...L.tabela.values()].sort((a, b) => b.pts - a.pts || (b.gm - b.gs) - (a.gm - a.gs) || b.gm - a.gm || a.clube - b.clube);
  }

  ligaDe(c: number, esc: Escalao): LigaJuvenil | null { const k = this.ligaDoClube.get(`${c}|${esc}`); return k === undefined ? null : this.ligas[k]; }

  /** Estatísticas da época dos jogadores de um escalão de um clube. */
  estatisticas(c: number, esc: Escalao): { jogador: number; jogos: number; golos: number; assist: number; nota: number }[] {
    const lista = esc === 'sub18' ? this.ac.sub18[c] : this.ac.sub21[c];
    return lista.map((j) => ({ jogador: j, jogos: this.jogos[j], golos: this.golos[j], assist: this.assist[j], nota: this.jogos[j] ? this.notas[j] / this.jogos[j] / 10 : 0 }))
      .sort((a, b) => b.golos - a.golos || b.jogos - a.jogos);
  }

  bytes(): number {
    return this.jogos.byteLength * 3 + this.notas.byteLength + this.minMes.byteLength + this.ligas.reduce((a, L) => a + L.jogos.length * 24 + L.clubes.length * 40, 0) + this.historico.length * 48;
  }
}

/** Todos contra todos a uma volta (método do círculo), alternando casa e fora. */
export function roundRobin(clubes: number[]): [number, number][][] {
  const t = [...clubes];
  if (t.length % 2) t.push(-1);
  const n = t.length, out: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const j: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a < 0 || b < 0) continue;
      j.push((r + i) % 2 ? [a, b] : [b, a]);
    }
    out.push(j);
    t.splice(1, 0, t.pop()!);
  }
  return out;
}

const vencedor = (g: JogoJuvenil) => (g.gc > g.gf ? g.casa : g.gc < g.gf ? g.fora : g.penaltis ? (g.penaltis[0] > g.penaltis[1] ? g.casa : g.fora) : g.casa);
