// Nevoeiro de informação e scouting (Prompt 4, Bloco B).
// Cada clube só conhece os jogadores que os seus scouts viram, os que jogaram contra si e os que lhe foram propostos.
// O conhecimento (0–100) decai com o tempo; cada atributo aparece como intervalo que estreita com as observações; os
// ocultos aparecem tarde e o potencial é o último e o mais impreciso. O motor continua a usar os valores reais.
import { Rng, hash32 } from '../core/rng.ts';
import { CONHECIMENTO as K, SCOUTS as S } from '../config/scouting.ts';
import { ATRIBUTOS, OCULTOS, N_ATR } from '../config/atributos.ts';
import { grupoPos } from '../mercado/valor.ts';
import type { World } from '../engine/world.ts';
import { baseDias } from '../engine/calendar/datas.ts';
import type { JogoR } from '../engine/competitions/base.ts';

/** Ruído determinístico N(0,1) por (clube, jogador, chave). */
function gauss(a: number, b: number, k: number): number {
  const u = (hash32(a, b, k) + 1) / 4294967297, v = (hash32(b, a, k + 7) + 1) / 4294967297;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export interface Estimativa { estimado: number; min: number; max: number; conhecimento: number }

export interface Relatorio {
  jogador: number;
  conhecimento: number;
  ovr: Estimativa;
  potencial: Estimativa;
  /** Potencial em estrelas (0,5–5), intervalo. */
  estrelas: [number, number];
  atributos: Record<string, [number, number]>;
  ocultos: Record<string, [number, number]> | null;
  /** Estatísticas reais (analista): fiáveis para o passado, não para o potencial. */
  estatisticas: { jogos: number; golos: number; assistencias: number; nota: number };
  scout: string | null;
  vies: string | null;
}

export class Scouting {
  /** Conhecimento por clube: jogador → nível × 65536 + dia da última observação (relativo). */
  conh: Map<number, number>[] = [];
  /** Familiaridade dos scouts de cada clube com cada liga (0–1). */
  fam: Float32Array;
  /** Ligas atribuídas aos scouts de cada clube. */
  atribuicao: number[][] = [];
  /** Top 14 de cada clube (para o conhecimento dos adversários nos jogos), actualizado todos os meses. */
  private topo: number[][] = [];
  private base: number;
  nLigas: number;

  constructor(public w: World) {
    this.nLigas = w.ligas.length;
    this.fam = new Float32Array(w.clubes.length * this.nLigas);
    this.base = Math.floor(Date.UTC(w.epoca - 1, 0, 1) / 864e5);
    for (let c = 0; c < w.clubes.length; c++) {
      this.conh[c] = new Map();
      const l = w.liga[c];
      if (l >= 0) this.fam[c * this.nLigas + l] = 0.8; // a própria liga
    }
    this.actualizarTopo();
    this.inicial();
  }

  /** Conhecimento inicial: anos de jogos e de scouting na própria liga (os titulares prováveis de cada adversário). */
  private inicial() {
    const w = this.w, dia = baseDias(w.epoca, 'ago_mai');
    for (let c = 0; c < w.clubes.length; c++) {
      const l = w.liga[c];
      if (l < 0) continue;
      const m = this.conh[c];
      for (const d of w.ligas[l].clubes) {
        if (d === c) continue;
        for (const j of (this.topo[d] ?? []).slice(0, K.inicial_por_clube)) {
          const n = Math.round(K.inicial_liga[0] + (K.inicial_liga[1] - K.inicial_liga[0]) * ((hash32('inicial', c, j) >>> 0) / 4294967296));
          if (m.size < K.maximo_por_clube) m.set(j, n * 65536 + Math.max(0, dia - this.base));
        }
      }
      // E as ligas que os scouts já cobriam: os melhores de cada clube, com menos conhecimento.
      if (!this.atribuicao[c]) this.atribuir(c, Rng.de(w.semente, 'scouts', w.clubes[c].id));
      for (const li of new Set(this.atribuicao[c])) {
        this.fam[c * this.nLigas + li] = Math.max(this.fam[c * this.nLigas + li], 0.5);
        for (const d of w.ligas[li].clubes) for (const j of (this.topo[d] ?? []).slice(0, K.inicial_por_clube)) {
          const n = Math.round(K.inicial_scouts[0] + (K.inicial_scouts[1] - K.inicial_scouts[0]) * ((hash32('inicial', c, j) >>> 0) / 4294967296));
          if (m.size < K.maximo_por_clube && !m.has(j)) m.set(j, n * 65536 + Math.max(0, dia - this.base));
        }
      }
    }
  }

  private garantir() {
    const w = this.w;
    if (this.conh.length >= w.clubes.length) return;
    const f = new Float32Array(w.clubes.length * this.nLigas);
    f.set(this.fam);
    this.fam = f;
    for (let c = this.conh.length; c < w.clubes.length; c++) { this.conh[c] = new Map(); const l = w.liga[c]; if (l >= 0) this.fam[c * this.nLigas + l] = 0.8; }
  }

  // ---------------------------------------------------------------- leitura

  /** Conhecimento efectivo (com decaimento); o próprio plantel ao fim de 4 semanas é total. */
  nivel(c: number, j: number, dia: number): number {
    const st = this.w.jogadores!;
    if (st.clube[j] === c && (!this.w.mercado || dia - this.w.mercado.contratos.chegada[j] >= K.plantel_dias)) return 100;
    const v = this.conh[c]?.get(j);
    if (v === undefined) return st.clube[j] === c ? 60 : 0;
    const n = Math.floor(v / 65536), d = (v % 65536) + this.base;
    return Math.max(0, n - Math.floor((dia - d) / K.decaimento_dias));
  }

  /** Factor do erro pela familiaridade com a liga do jogador. */
  private factorLiga(c: number, j: number): number {
    const cl = this.w.jogadores!.clube[j];
    const l = cl >= 0 ? this.w.liga[cl] : -1;
    if (l < 0) return 1.3;
    return 1.6 - 0.6 * clamp(this.fam[c * this.nLigas + l], 0, 1);
  }

  /** Viés médio dos scouts do clube sobre o grupo de posições do jogador (pontos de OVR). */
  private vies(c: number, j: number): number {
    const sm = this.w.economia?.staff;
    if (!sm) return 0;
    const g = grupoPos(this.w.jogadores!.posNat[j]);
    let s = 0, n = 0;
    for (const m of sm.porClube[c] ?? []) if (m.cargo === 'scout' || m.cargo === 'chefe_scouts') {
      const h = hash32(m.id.length, ...[...m.id].map((x) => x.charCodeAt(0)));
      if (['GR', 'DEF', 'MED', 'AVA'][h % 4] === g) { s += S.vies_desvio * gauss(h, 1, 3); n++; }
    }
    return n ? s / n : 0;
  }

  estimarOVR(c: number, j: number, dia: number): Estimativa {
    const st = this.w.jogadores!;
    const n = this.nivel(c, j, dia);
    const real = st.ovrNat(j);
    if (n >= 100) return { estimado: real, min: real, max: real, conhecimento: 100 };
    const sig = (K.erro_ovr * (1 - n / 100) + K.erro_minimo) * this.factorLiga(c, j);
    const est = clamp(Math.round(real + sig * gauss(c, j, 1) + this.vies(c, j)), 1, 99);
    return { estimado: est, min: Math.max(1, Math.round(est - 1.5 * sig)), max: Math.min(99, Math.round(est + 1.5 * sig)), conhecimento: n };
  }

  estimarPotencial(c: number, j: number, dia: number): Estimativa {
    const st = this.w.jogadores!;
    const n = this.nivel(c, j, dia);
    const real = st.pot[j];
    if (n >= 100 && st.clube[j] === c) return { estimado: real, min: Math.max(st.ovrNat(j), real - 2), max: Math.min(99, real + 2), conhecimento: 100 };
    const sig = (K.erro_potencial * Math.pow(1 - n / 100, 0.7) + K.erro_potencial_minimo) * this.factorLiga(c, j);
    const est = clamp(Math.round(real + sig * gauss(c, j, 2)), st.ovrNat(j), 99);
    return { estimado: est, min: Math.max(st.ovrNat(j), Math.round(est - 1.5 * sig)), max: Math.min(99, Math.round(est + 1.5 * sig)), conhecimento: n };
  }

  /** Relatório completo (dados para a UI do Prompt 5). */
  relatorio(c: number, j: number, dia: number): Relatorio {
    const st = this.w.jogadores!;
    const n = this.nivel(c, j, dia);
    const f = this.factorLiga(c, j);
    const larg = (base: number, k: number) => Math.max(0, Math.round(base * (1 - n / 100) * f + 0.4 * gauss(c, j, 50 + k) * (1 - n / 100)));
    const atributos: Record<string, [number, number]> = {};
    ATRIBUTOS.forEach((a, k) => { const v = st.atr[j * N_ATR + k]; const h = larg(5, k); const m = clamp(Math.round(v + h * 0.4 * gauss(c, j, 100 + k)), 1, 20); atributos[a.id] = [clamp(m - h, 1, 20), clamp(m + h, 1, 20)]; });
    let ocultos: Record<string, [number, number]> | null = null;
    if (n >= K.ocultos_a_partir) {
      ocultos = {};
      OCULTOS.forEach((o, k) => { const v = st.oculto(j, o.id as never); const h = larg(10, 200 + k); ocultos![o.id] = [clamp(v - h, 1, 20), clamp(v + h, 1, 20)]; });
    }
    const pot = this.estimarPotencial(c, j, dia);
    const estrela = (p: number) => Math.max(0.5, Math.min(5, Math.round((p / 20) * 2) / 2));
    const sm = this.w.economia?.staff;
    const scout = (sm?.porClube[c] ?? []).find((m) => m.cargo === 'scout') ?? null;
    const v = this.vies(c, j);
    return {
      jogador: j, conhecimento: n, ovr: this.estimarOVR(c, j, dia), potencial: pot, estrelas: [estrela(pot.min), estrela(pot.max)], atributos, ocultos,
      estatisticas: { jogos: st.eJogos[j], golos: st.eGolos[j], assistencias: st.eAssist[j], nota: st.eJogos[j] ? st.eNotas[j] / st.eJogos[j] / 10 : 0 },
      scout: scout?.nome ?? null, vies: Math.abs(v) >= 1 ? `${v > 0 ? 'sobrevaloriza' : 'subvaloriza'} os ${grupoPos(st.posNat[j])} (${v > 0 ? '+' : ''}${v.toFixed(1)})` : null,
    };
  }

  /** Jogadores conhecidos pelo clube (para a IA escolher alvos). */
  conhecidos(c: number): number[] {
    return [...(this.conh[c]?.keys() ?? [])];
  }

  // ---------------------------------------------------------------- escrita

  conhecer(c: number, j: number, ganho: number, dia: number) {
    const st = this.w.jogadores!;
    if (st.clube[j] === c) return;
    const m = this.conh[c];
    if (!m) return;
    // Rendimentos decrescentes acima de x%: perto dos 100% cada observação acrescenta menos.
    const n0 = this.nivel(c, j, dia), x = K.decrescente_a_partir;
    const n = Math.min(100, Math.round(n0 + ganho * (n0 <= x ? 1 : Math.pow((100 - n0) / (100 - x), 0.7))));
    m.set(j, n * 65536 + Math.max(0, Math.min(65535, dia - this.base)));
    if (m.size > K.maximo_por_clube) {
      // Esquece o menos conhecido (amostra de 30, para não ordenar tudo).
      let pior = -1, pv = Infinity, k = 0;
      for (const [x, v] of m) { if (++k > 30) break; const nv = Math.floor(v / 65536); if (nv < pv) { pv = nv; pior = x; } }
      if (pior >= 0) m.delete(pior);
    }
  }

  /** Top 14 de cada clube (titulares prováveis), para o conhecimento dos adversários. */
  actualizarTopo() {
    const w = this.w, st = w.jogadores!;
    this.topo = w.clubes.map((_, c) => (w.plantel[c] ?? []).filter((j) => st.clube[j] === c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 14));
  }

  /** Atribui as ligas aos scouts do clube: pela filosofia (formador, vendedor e analítico: ligas baratas; compradores: ligas fortes),
   *  pela proximidade (mesma confederação) e pela relação qualidade/preço da liga. */
  atribuir(c: number, rng: Rng) {
    const w = this.w, e = w.economia!;
    const n = (e.staff.porClube[c] ?? []).filter((m) => m.cargo === 'scout').length;
    const l0 = w.liga[c];
    if (l0 < 0) { this.atribuicao[c] = []; return; }
    const fd0 = w.ligas[l0].regras.forca_desportiva;
    const conf0 = w.pacotes.find((p) => p.ligas.includes(l0))?.manifest.confederacao;
    const arq = e.ia?.arquetipo[c];
    const pesos = w.ligas.map((L, li) => {
      if (li === l0 || !L.clubes.length) return 0;
      const fd = L.regras.forca_desportiva;
      if (fd > fd0 + 25 || fd < fd0 - 40) return 0;
      const conf = w.pacotes.find((p) => p.ligas.includes(li))?.manifest.confederacao;
      const barato = 1 + (fd - L.regras.indice_riqueza) / 50; // muita qualidade para o dinheiro
      let p = Math.max(0.1, barato) * (conf === conf0 ? 1.5 : 1) * (L.regras.nivel === 1 ? 1.5 : 0.6);
      if (arq === 'comprador_estrelas' || arq === 'magnata_impaciente') p *= fd / 50;
      if (arq === 'formador' || arq === 'vendedor' || arq === 'analitico') p *= Math.max(0.3, barato);
      return p;
    });
    const tot = pesos.reduce((a, b) => a + b, 0);
    const out: number[] = [];
    for (let k = 0; k < n * S.ligas_por_scout && tot > 0; k++) {
      let r = rng.next() * tot;
      for (let li = 0; li < pesos.length; li++) if ((r -= pesos[li]) < 0) { out.push(li); break; }
    }
    this.atribuicao[c] = out;
  }

  /** Semana: observações dos scouts, jogos contra (adversários), familiaridade. */
  semana(segunda: number, jogos: JogoR[]) {
    const w = this.w, st = w.jogadores!, e = w.economia!;
    this.garantir();
    const rng = Rng.de(w.semente, 'scouting', segunda);
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0) continue;
      if (!this.atribuicao[c]) this.atribuir(c, Rng.de(w.semente, 'scouts', w.clubes[c].id));
      const ms = e.staff.porClube[c] ?? [];
      const scouts = ms.filter((m) => m.cargo === 'scout');
      const chefe = ms.find((m) => m.cargo === 'chefe_scouts')?.nivel ?? 8;
      const recrut = e.nivel(c, 'recrutamento');
      // Familiaridade: decai de 4 em 4 semanas (o mesmo ritmo, menos contas).
      if (Math.floor(segunda / 7) % 4 === 0) for (let li = 0; li < this.nLigas; li++) this.fam[c * this.nLigas + li] = Math.max(li === w.liga[c] ? 0.8 : 0, this.fam[c * this.nLigas + li] - 4 * S.familiaridade_desce);
      scouts.forEach((sc, k) => {
        const li = this.atribuicao[c][k];
        if (li === undefined) return;
        const L = w.ligas[li];
        this.fam[c * this.nLigas + li] = Math.min(1, this.fam[c * this.nLigas + li] + S.familiaridade_sobe);
        const fam = this.fam[c * this.nLigas + li];
        const obs = Math.round(S.observacoes * (1 + recrut / 10));
        for (let o = 0; o < obs; o++) {
          const alvo = L.clubes[rng.int(0, L.clubes.length - 1)];
          // Metade das observações nos titulares prováveis, metade no plantel inteiro (jovens incluídos).
          // Uma parte das observações vai aos juniores (sub-21, sub-18, academia).
          if (w.academia && rng.chance(S.juniores)) { const jj = w.academia.jovemAleatorio(alvo, rng); if (jj >= 0) this.conhecer(c, jj, (S.ganho_base + S.ganho_por_nivel * sc.nivel) * (0.5 + 0.7 * fam) * (1 + S.chefe * chefe), segunda); continue; }
          const t = rng.chance(0.5) ? this.topo[alvo] ?? [] : (w.plantel[alvo] ?? []);
          if (!t.length) continue;
          const j = t[rng.int(0, t.length - 1)];
          if (st.clube[j] !== alvo) continue;
          this.conhecer(c, j, (S.ganho_base + S.ganho_por_nivel * sc.nivel) * (0.5 + 0.7 * fam) * (1 + S.chefe * chefe), segunda);
        }
      });
    }
    // Jogos: cada clube vê os titulares prováveis do adversário.
    for (const j of jogos) {
      if (!j.r) continue;
      for (const [a, b] of [[j.casa, j.fora], [j.fora, j.casa]]) { const t = this.topo[b] ?? []; for (let k = 0; k < Math.min(11, t.length); k++) if (st.clube[t[k]] === b) this.conhecer(a, t[k], K.ganho_jogo, segunda); }
    }
  }

  bytes(): number {
    return this.conh.reduce((s, m) => s + m.size * 40, 0) + this.fam.byteLength;
  }
}
