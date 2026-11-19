// Academia e juniores (Prompt 4, Bloco C).
// Cadeia juvenil (plano juvenil): Intake (Junho, 6–12 por clube) → Sub-18 (15–18, máx. 30) → Sub-21 (19–21) → equipa principal.
// Todos os juniores são jogadores individuais (PlayerStore, com o clube preenchido mas FORA de w.plantel, que é a equipa
// principal). Já não há prospectos nem agregado. O excedente do Sub-18 sai na passagem de época, por proposta do gestor.
import { Rng } from '../core/rng.ts';
import { POSICOES, PAPEIS_DA_POSICAO, type Posicao } from '../config/papeis.ts';
import { ATRIBUTOS, N_ATR } from '../config/atributos.ts';
import { GERACAO_JOGADORES as G } from '../config/geracaoJogadores.ts';
import { PESOS_PAPEL } from '../players/store.ts';
import { CONFEDERACAO_PAIS } from '../config/paises.ts';
import {
  ESCALOES, EXCEDENTE as EX, CORTE_RELATIVO, RELATORIO_INTAKE as RI, PERSONALIDADE, PERSONALIDADE_NEUTRA, INTAKE as I, MINUTOS_JUVENIS as MJ, DESENVOLVIMENTO_JUVENIL as DJ, PROMOCAO as PR,
  ALICIAMENTO as AL, COMPENSACAO as CO, FORCA_JUVENIL as FJ, TABELA_JOVENS as TJ, daTabela,
  INCLINACAO_TABELA, DESLOCAMENTO_FRACOS, TETO_JUNIOR, CRESCIMENTO_ATE_18, POTENCIAL_DINAMICO as PD, CONTRATO_JUNIOR as CJ,
} from '../config/academia.ts';
import { PARAMETROS } from '../config/arquetipos.ts';
import { LigasJuvenis } from './ligasJuvenis.ts';
import { MissoesJovens } from '../scouting/missoesJovens.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
import { gerarJogador, ovrAlvoClube } from '../players/gerador.ts';
import { diaInicioMundo, type World } from '../engine/world.ts';
import { fimDeEpoca as fimDeEpocaContrato, indiceRiqueza } from '../economia/contratos.ts';
import { CONTRATO as CONTRATO_J } from '../config/contratosJogador.ts';

/** 0 = não é júnior (equipa principal ou sem clube); 1 = sub-21; 2 = sub-18. */
export const ESC = { nenhum: 0, sub21: 1, sub18: 2 } as const;
export const NOME_ESCALAO = ['equipa principal', 'sub-21', 'sub-18'];
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export type Conselho = 'promover_sub21' | 'promover_principal' | 'manter' | 'emprestar' | 'vender' | 'libertar';

export interface LinhaProspecto {
  jogador: number;
  nome: string;
  idade: number;
  posicao: string;
  escalao: string;
  atributos: { id: string; nome: string; valor: number | [number, number] }[];
  ovr: number | [number, number];
  estrelas: [number, number];
  evolucao: number | null;
  estado: 'a treinar' | 'pronto para promoção';
  conselho: Conselho;
  conhecimento: number;
}

/** Uma linha do relatório do intake (simples, sem atributos). */
export interface LinhaIntake {
  jogador: number;
  nome: string;
  pais: string;
  posicao: string;
  idade: number;
  altura: number;
  peso: number;
  ovr: [number, number];
  pt: [number, number];
  personalidade: string;
  tom: string;
}

/** Altura (cm) e peso (kg) derivados da posição, da idade e da semente do jogador (o PlayerStore não os guarda). */
const ALTURA_POS: Record<string, number> = { GR: 190, DC: 187, DD: 178, DE: 178, ALD: 177, ALE: 177, MDC: 182, MC: 179, MO: 176, ED: 175, EE: 175, PL: 183 };
export function corpoJogador(id: string, pos: string, idade: number): { altura: number; peso: number } {
  const r = Rng.de(0, 'corpo', id);
  const cresc = Math.max(0, 18 - idade);
  const altura = Math.round((ALTURA_POS[pos] ?? 180) + (r.next() - 0.5) * 12 - 2 * cresc);
  return { altura, peso: Math.round(altura - 106 + (r.next() - 0.4) * 9 - 2.5 * cresc) };
}

const estrelas = (pot: number) => clamp(Math.round(((pot - 40) / 12) * 2) / 2, 0.5, 5);

export class Academia {
  escalao = new Uint8Array(0);
  /** OVR no fim da última época (para a "evolução recente"). */
  ovrInicio = new Uint8Array(0);
  /** Dia em que entrou na academia do clube actual (anos de formação para a compensação). */
  entrada = new Int32Array(0);
  sub18: number[][] = [];
  sub21: number[][] = [];
  /** Último intake de cada clube (dia e jogadores), para o relatório. */
  ultimoIntake: { dia: number; jogadores: number[] }[] = [];
  /** Proposta de libertação do excedente do Sub-18 (clubes do utilizador; a IA decide logo). */
  excedente = new Map<number, { dia: number; jogadores: number[] }>();
  /** Ligas Sub-18 e Sub-21 (todos os países): jogos, estatísticas e minutos para a evolução. */
  ligas: LigasJuvenis;
  /** Missões do olheiro de jovens. */
  missoes: MissoesJovens;
  /** Registo: promoções à equipa principal (para a comparação formador × comprador) e aliciamentos. */
  promovidos: { dia: number; clube: number; jogador: number; idade: number; ovr: number; foraDaCurva: boolean; motivo: string }[] = [];
  aliciados: { dia: number; de: number; para: number; jogador: number; compensacao: number }[] = [];
  foraDaCurva: { dia: number; clube: number; jogador: number; idade: number; ovr: number; pot: number; para: string }[] = [];
  private seq = 0;
  /** Âncora por liga: OVR médio da equipa principal no início e o actual (recalculado uma vez por dia de passagem). */
  private refLiga = new Map<number, number>();
  private actLiga = new Map<number, number>();
  private diaLiga = -1;
  /** Força juvenil e dimensão por país (derivadas das ligas do mundo). */
  private forcaPais = new Map<string, number>();
  private dimPais = new Map<string, number>();
  /** Calibração dos escalões da tabela (para a distribuição do mundo bater com ela) e a qualidade média/desvio dos clubes. */
  private calTabela: number[] = TJ.map(() => 1);
  private qMedia = 0;
  private qDesvio = 1;
  /** Tecto de OVR dos juniores (15–18), na escala do mundo. */
  readonly teto = Math.round(daTabela(TETO_JUNIOR.ovr_tabela));

  constructor(public w: World) {
    const dia = diaInicioMundo();
    this.ligas = new LigasJuvenis(w, this);
    this.missoes = new MissoesJovens(w, this);
    this.garantir();
    for (let l = 0; l < w.ligas.length; l++) { const v = this.ovrLiga(l); if (v > 0) this.refLiga.set(l, v); }
    this.paises();
    this.calibrarTabela();
    for (let c = 0; c < w.clubes.length; c++) this.iniciarClube(c, dia);
    this.aplicarTeto(dia);
  }

  garantir() {
    const cap = this.w.jogadores!.cap;
    if (this.escalao.length < cap) {
      const e = new Uint8Array(cap); e.set(this.escalao); this.escalao = e;
      const o = new Uint8Array(cap); o.set(this.ovrInicio); this.ovrInicio = o;
      const n = new Int32Array(cap); n.set(this.entrada); this.entrada = n;
    }
    this.w.mercado?.contratos.garantir(cap);
    this.ligas?.garantir();
    const n = this.w.clubes.length;
    while (this.sub18.length < n) { this.sub18.push([]); this.sub21.push([]); this.ultimoIntake.push({ dia: -1, jogadores: [] }); }
  }

  // ---------------------------------------------------------------- leitura

  nivelAcademia(c: number): number { return this.w.economia?.nivel(c, 'academia') ?? 5; }
  coordenador(c: number): number { return this.w.economia?.staff.coordenacaoAcademia(c) ?? 10; }
  usoAcademia(c: number): number { const a = this.w.economia?.ia?.arquetipo[c]; return a ? PARAMETROS[a].academia : 0.5; }

  /** Todos os juniores individuais do clube. */
  jovens(c: number): number[] { return [...(this.sub21[c] ?? []), ...(this.sub18[c] ?? [])]; }

  /** Um júnior individual ao acaso (para os scouts), sem criar listas. */
  jovemAleatorio(c: number, rng: Rng): number {
    const a = this.sub21[c]?.length ?? 0, b = this.sub18[c]?.length ?? 0;
    if (!a && !b) return -1;
    const k = rng.int(0, a + b - 1);
    return k < a ? this.sub21[c][k] : this.sub18[c][k - a];
  }

  /** Minutos (0–1) que entram na evolução de um júnior: minutos reais nas ligas juvenis, nível da academia e campeonato do país. */
  minutos(j: number): number {
    const c = this.w.jogadores!.clube[j];
    const base = this.ligas.parteMinutos(j);
    const l = c >= 0 ? this.w.liga[c] : -1;
    const fd = l >= 0 ? this.w.ligas[l].regras.forca_desportiva : 30;
    return clamp(base + MJ.por_nivel_academia * (this.nivelAcademia(c) - 5) + (MJ.por_campeonato * fd) / 100, 0, 1);
  }

  /** "Desenvolvimento" (1–20) dos juniores: coordenador da academia e nível da academia. */
  desenvolvimento(c: number): number { return clamp(this.coordenador(c) + DJ.por_nivel_academia * (this.nivelAcademia(c) - 5), 1, 20); }

  private ovrLiga(l: number): number {
    const w = this.w, st = w.jogadores!;
    let s = 0, n = 0;
    for (const c of w.ligas[l].clubes) for (const j of w.plantel[c] ?? []) if (st.clube[j] === c) { s += st.ovrNat(j); n++; }
    return n ? s / n : 0;
  }

  /** Deriva da liga do clube face ao início (pontos de OVR), limitada. */
  derivaLiga(c: number, dia: number): number {
    const l = this.w.liga[c];
    if (l < 0 || !this.refLiga.has(l)) return 0;
    if (this.diaLiga !== dia) { this.actLiga.clear(); this.diaLiga = dia; }
    if (!this.actLiga.has(l)) this.actLiga.set(l, this.ovrLiga(l));
    return clamp(this.actLiga.get(l)! - this.refLiga.get(l)!, -I.ancora.maximo, I.ancora.maximo);
  }

  // ---------------------------------------------------------------- geração

  private paisIntake(c: number, rng: Rng): string {
    const pais = this.w.clubes[c].pais;
    if (!rng.chance(I.vizinhos)) return pais;
    const conf = CONFEDERACAO_PAIS[pais];
    const viz = Object.keys(G.paises_estrangeiros).filter((p) => p !== pais && CONFEDERACAO_PAIS[p] === conf);
    return viz.length ? viz[rng.int(0, viz.length - 1)] : pais;
  }

  /** Força juvenil (força desportiva da 1.ª liga + bónus dos exportadores) e dimensão (clubes do país) — simplificado. */
  private paises() {
    const w = this.w;
    const n = new Map<string, number>();
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0) n.set(w.clubes[c].pais, (n.get(w.clubes[c].pais) ?? 0) + 1);
    const max = Math.max(1, ...n.values());
    for (const [p, k] of n) this.dimPais.set(p, k / max);
    for (const L of w.ligas) {
      if (L.regras.nivel !== 1 || !L.clubes.length) continue;
      const p = w.clubes[L.clubes[0]].pais;
      this.forcaPais.set(p, clamp(FJ.base + (FJ.por_forca_desportiva * L.regras.forca_desportiva) / 100 + (FJ.exportadores.includes(p) ? FJ.bonus_exportador : 0), 0, 1));
    }
  }
  forcaJuvenil(p: string): number { return this.forcaPais.get(p) ?? (FJ.exportadores.includes(p) ? FJ.sem_liga + FJ.bonus_exportador : FJ.sem_liga); }
  dimensao(p: string): number { return this.dimPais.get(p) ?? FJ.dimensao_sem_liga; }

  /** Qualidade do clube para o intake (z): o potencial médio (nível + factores + âncora), normalizado no mundo. */
  private qualidade(c: number, pais?: string, dia?: number): number {
    const mu = this.potencialMedio(c, pais) - (dia === undefined ? 0 : I.ancora.ganho * this.derivaLiga(c, dia));
    return (mu - this.qMedia) / this.qDesvio;
  }

  /** Probabilidades dos escalões da tabela para uma qualidade q. */
  private probTabela(q: number): number[] {
    const n = TJ.length;
    const p = TJ.map((t, k) => t.p * this.calTabela[k] * Math.exp(INCLINACAO_TABELA * q * (n > 1 ? (2 * k) / (n - 1) - 1 : 0)));
    const s = p.reduce((a, b) => a + b, 0);
    return p.map((x) => x / s);
  }

  /** Calibra os escalões para que a distribuição do mundo (pesada pelo volume do intake) bata com a tabela. */
  private calibrarTabela() {
    const w = this.w;
    const cl: { mu: number; vol: number }[] = [];
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0) cl.push({ mu: this.potencialMedio(c), vol: this.volumeIntake(c) });
    if (!cl.length) return;
    const V = cl.reduce((a, x) => a + x.vol, 0);
    this.qMedia = cl.reduce((a, x) => a + x.mu * x.vol, 0) / V;
    this.qDesvio = Math.max(1, Math.sqrt(cl.reduce((a, x) => a + x.vol * (x.mu - this.qMedia) ** 2, 0) / V));
    const alvo = TJ.map((t) => t.p / TJ.reduce((a, x) => a + x.p, 0));
    for (let it = 0; it < 6; it++) {
      const m = TJ.map(() => 0);
      for (const x of cl) this.probTabela((x.mu - this.qMedia) / this.qDesvio).forEach((v, k) => (m[k] += (v * x.vol) / V));
      this.calTabela = this.calTabela.map((f, k) => f * (alvo[k] / Math.max(1e-6, m[k])));
    }
  }

  /** Sorteia um jovem do intake do clube: potencial e OVR aos 18 (escala do mundo), pela tabela. */
  sortearJovem(c: number, rng: Rng, pais?: string, dia?: number, desloc = 0): { pot: number; ovr18: number } {
    const mu = this.potencialMedio(c, pais);
    const pr = this.probTabela((mu - this.qMedia) / this.qDesvio + desloc);
    let r = rng.next(), k = 0;
    for (; k < pr.length - 1; k++) { r -= pr[k]; if (r < 0) break; }
    const t = TJ[k];
    // Clubes abaixo da qualidade média do mundo formam abaixo da tabela; a âncora da liga desloca o potencial.
    const sh = DESLOCAMENTO_FRACOS * Math.min(0, mu - this.qMedia) - (dia === undefined ? 0 : I.ancora.ganho * this.derivaLiga(c, dia));
    const pot = Math.round(daTabela(t.pot[0] + rng.next() * (t.pot[1] - t.pot[0])) + sh);
    const ovr18 = Math.min(pot - 1, Math.round(daTabela(t.ovr[0] + rng.next() * (t.ovr[1] - t.ovr[0])) + sh));
    return { pot: clamp(pot, 1, 99), ovr18: clamp(ovr18, 1, this.teto) };
  }

  /** Potencial médio esperado do intake do clube pela tabela (para os cortes de qualidade). */
  potencialEsperado(c: number, dia?: number): number {
    const mu = this.potencialMedio(c);
    const sh = DESLOCAMENTO_FRACOS * Math.min(0, mu - this.qMedia) - (dia === undefined ? 0 : I.ancora.ganho * this.derivaLiga(c, dia));
    return sh + this.probTabela((mu - this.qMedia) / this.qDesvio).reduce((a, p, k) => a + p * daTabela((TJ[k].pot[0] + TJ[k].pot[1]) / 2), 0);
  }

  /** Potencial médio do intake do clube (nível do clube + factores). */
  potencialMedio(c: number, pais = this.w.clubes[c].pais): number {
    const w = this.w;
    const f = {
      reputacao: (w.reputacao[c] - 50) / 50,
      academia: (this.nivelAcademia(c) - 5) / 5,
      coordenador: (this.coordenador(c) - 10) / 10,
      recrutamento: ((w.economia?.nivel(c, 'recrutamento') ?? 5) - 5) / 5,
      pais: (this.forcaJuvenil(pais) - 0.5) * 2,
      uso: (this.usoAcademia(c) - 0.5) * 2,
    };
    const L = ovrAlvoClube(w, c);
    // Compressão: o talento a mais desce na pirâmide; o intake compensa com um termo pelo nível do clube.
    let s = L + I.potencial_base + I.potencial_por_nivel * (L - I.nivel_referencia);
    for (const [k, v] of Object.entries(I.pesos)) s += v * f[k as keyof typeof f];
    return s;
  }

  private posicaoAleatoria(rng: Rng): Posicao {
    const slot = G.composicao[rng.int(0, G.composicao.length - 1)];
    return slot === 'ED|EE' ? (rng.chance(0.5) ? 'ED' : 'EE') : slot;
  }

  /** Cria um júnior individual: OVR pela idade a partir do OVR aos 18 (a distância ao potencial encolhe ~e^−k por ano). */
  private gerarJovem(c: number, idade: number, jv: { pot: number; ovr18: number }, dia: number, rng: Rng, esc: number, pais = this.paisIntake(c, rng)): number {
    const st = this.w.jogadores!;
    const pot = jv.pot;
    let ovr = pot - (pot - jv.ovr18) * Math.exp(CRESCIMENTO_ATE_18.k * (18 - idade));
    if (idade < TETO_JUNIOR.idade) ovr = Math.min(ovr, this.teto);
    ovr = clamp(ovr, 8, 95);
    const j = gerarJogador(st, rng, { id: `${this.w.clubes[c].id}_a${++this.seq}`, pais, pos: this.posicaoAleatoria(rng), idade, dia, ovr, potencial: clamp(pot, ovr, 99), clube: c, perfilPais: true });
    this.garantir();
    this.escalao[j] = esc;
    this.ovrInicio[j] = st.ovrNat(j);
    this.entrada[j] = Math.max(dia - Math.round((idade - CO.idade_inicio) * 365), st.nasc[j] + CO.idade_inicio * 365);
    if (this.w.mercado) this.w.mercado.contratos.formadoClube[j] = c;
    return j;
  }

  private iniciarClube(c: number, dia: number) {
    const w = this.w;
    if (w.liga[c] < 0) return;
    const rng = Rng.de(w.semente, 'academia-inicial', w.clubes[c].id);
    // Os escalões já existentes: os que sobreviveram às selecções anteriores (o melhor de dois sorteios).
    const melhor = () => { const a = this.sortearJovem(c, rng), b = this.sortearJovem(c, rng); return a.pot >= b.pot ? a : b; };
    // Sub-18: quatro idades de intakes, já depois das saídas (até 2 abaixo do máximo); Sub-21: 2 abaixo do máximo.
    const n18 = Math.min(ESCALOES.sub18.maximo - 2, Math.round(3.3 * this.volumeIntake(c))), n21 = ESCALOES.sub21.maximo - 2;
    for (let k = 0; k < n21; k++) this.sub21[c].push(this.gerarJovem(c, 19 + rng.next() * 3, melhor(), dia, rng, ESC.sub21));
    for (let k = 0; k < n18; k++) this.sub18[c].push(this.gerarJovem(c, 15 + rng.next() * 3.9, melhor(), dia, rng, ESC.sub18));
  }

  volumeIntake(c: number): number {
    const V = I.volume;
    const dim = this.dimensao(this.w.clubes[c].pais);
    const x = V.dimensao * dim + (V.academia * this.nivelAcademia(c)) / 10 + (V.reputacao * this.w.reputacao[c]) / 100;
    return Math.round(I.minimo + (I.maximo - I.minimo) * clamp(x, 0, 1));
  }

  // ---------------------------------------------------------------- saídas e movimentos

  private tirar(j: number) {
    const st = this.w.jogadores!;
    const c = st.clube[j];
    if (c < 0) return;
    for (const L of [this.sub18, this.sub21]) { const a = L[c]; const k = a?.indexOf(j) ?? -1; if (k >= 0) a.splice(k, 1); }
    this.escalao[j] = ESC.nenhum;
  }

  /** Liberta um júnior: livre se tiver nível para isso, senão deixa o futebol. */
  libertar(j: number, dia: number) {
    const st = this.w.jogadores!;
    this.tirar(j);
    // A maior parte dos libertados segue para divisões abaixo das simuladas (deixa o mundo do jogo); alguns ficam livres.
    const fica = Rng.de(this.w.semente, 'libertado', j).chance(PR.prob_livre);
    if (this.w.mercado && fica && st.ovrNat(j) >= PR.livre_minimo && st.idade(j, dia) >= 17) this.w.mercado.tornarLivre(j, dia);
    else st.clube[j] = -2;
  }

  /** Promove à equipa principal (o primeiro contrato profissional é dado pela economia no fecho da época, como no Bloco A). */
  promover(j: number, dia: number, foraDaCurva = false, motivo = 'nivel') {
    const st = this.w.jogadores!;
    const c = st.clube[j];
    this.tirar(j);
    this.w.plantel[c].push(j);
    this.promovidos.push({ dia, clube: c, jogador: j, idade: Math.floor(st.idade(j, dia)), ovr: st.ovrNat(j), foraDaCurva, motivo });
  }

  /** Sobe um jogador do Sub-18 ao Sub-21 (decisão do utilizador). */
  subirAoSub21(j: number) {
    if (this.escalao[j] !== ESC.sub18) throw new Error('Não está no Sub-18.');
    this.moverPara(j, ESC.sub21, this.w.jogadores!.clube[j]);
  }

  private moverPara(j: number, esc: number, c: number) {
    this.tirar(j);
    this.w.jogadores!.clube[j] = c;
    this.escalao[j] = esc;
    (esc === ESC.sub21 ? this.sub21 : this.sub18)[c].push(j);
  }

  // ---------------------------------------------------------------- fim de época

  /** OVR do n-ésimo melhor do plantel principal (n a contar de 1). */
  private ovrOrdem(c: number, n: number): number {
    const st = this.w.jogadores!;
    const v = this.w.plantel[c].filter((j) => st.clube[j] === c).map((j) => st.ovrNat(j)).sort((a, b) => b - a);
    return v[Math.min(n, v.length) - 1] ?? ovrAlvoClube(this.w, c) - 10;
  }

  /** Limiar de promoção à equipa principal (o formador cede mais lugar aos da casa). */
  limiarPromocao(c: number): number { return this.ovrOrdem(c, PR.ordem_referencia) - PR.margem_promocao - PR.margem_por_academia * (this.usoAcademia(c) - 0.5); }

  /** Passagem de época de um clube (fim de Julho): contratos aos 18, promoções, transições de escalão e excedente do Sub-18. */
  fimDeEpoca(c: number, dia: number) {
    const w = this.w, st = w.jogadores!;
    if (w.liga[c] < 0) return;
    this.garantir();
    const rng = Rng.de(w.semente, 'academia', w.clubes[c].id, dia);
    for (const L of [this.sub18, this.sub21]) L[c] = L[c].filter((j) => st.clube[j] === c && this.escalao[j]);
    // Clube que entrou do exterior (ou voltou): cria a academia como a dos clubes iniciais.
    if (!this.sub18[c].length && !this.sub21[c].length) this.iniciarClube(c, dia);
    const idade = (j: number) => st.idade(j, dia + 60); // idade na época que começa
    const L = ovrAlvoClube(w, c);
    // Corte de qualidade (contrato aos 18, sub-21): relativo à média do intake do clube, já com a âncora da liga.
    const corte = this.potencialEsperado(c, dia) + CORTE_RELATIVO;
    const plantel = () => w.plantel[c].filter((j) => st.clube[j] === c).length;
    const ord = (a: number[]) => a.sort((x, y) => st.ovrNat(y) + 0.3 * st.pot[y] - st.ovrNat(x) - 0.3 * st.pot[x]);

    // 0. Contrato profissional obrigatório aos 18: o coordenador propõe, o dono aprova (IA: os que passam o corte); senão sai.
    for (const j of [...this.sub21[c], ...this.sub18[c]]) {
      if (idade(j) < CJ.idade) continue;
      const temContrato = st.salario[j] > 0 && st.fimContrato[j] > dia + 30;
      if (temContrato) continue;
      if (st.pot[j] >= corte) this.contratoJunior(j, c, dia);
      else this.libertar(j, dia);
    }

    // 1. Sub-21: promoções (os que têm nível) e saídas aos 22. Os juniores enchem a equipa principal até um alvo que depende
    // do uso da academia do arquétipo (o formador até 25; o comprador de estrelas deixa as vagas para o mercado).
    const limiar = this.limiarPromocao(c);
    const alvo = PR.plantel_minimo + Math.round((PR.plantel_alvo - PR.plantel_minimo) * clamp(this.usoAcademia(c) * PR.alvo_por_academia, 0, 1));
    for (const j of ord([...this.sub21[c]])) {
      const vaga = plantel() < alvo;
      if (st.ovrNat(j) >= limiar && vaga) { this.promover(j, dia, false, 'nivel'); continue; }
      if (idade(j) >= 22) {
        const nivelLiga = L - 8;
        // Vender: sobe ao plantel já listado para venda (se houver lugar); senão é libertado.
        // Com contrato: sobe ao plantel a pedir para sair (2) — será vendido ou emprestado; sem lugar nem nível, rescinde.
        if (st.salario[j] > 0 && st.ovrNat(j) >= nivelLiga - PR.vender_margem && plantel() < alvo + PR.vender_lugares + 3) { this.promover(j, dia, false, 'vender'); if (w.mercado) w.mercado.contratos.listado[j] = 2; }
        else this.libertar(j, dia);
      }
    }
    // Arquétipo acima do tamanho: quem usa pouco a academia vende os formados da casa que não são titulares.
    if (w.mercado && this.usoAcademia(c) < PR.vender_formados_uso) {
      const pl = w.plantel[c].filter((j) => st.clube[j] === c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
      for (const [i, j] of pl.entries()) if (i >= PR.vender_formados_ordem && w.mercado.contratos.formadoClube[j] === c && idade(j) <= PR.vender_formados_idade && !w.mercado.contratos.listado[j]) w.mercado.contratos.listado[j] = 1;
    }
    // Grupos de posições abaixo do mínimo: sobe o melhor júnior (17+) desse grupo.
    const grupo = (j: number) => GRUPO[POSICOES[st.posNat[j]]];
    const porG: Record<string, number> = { GR: 0, DEF: 0, MED: 0, AVA: 0 };
    for (const j of w.plantel[c]) if (st.clube[j] === c) porG[grupo(j)]++;
    const cand = ord([...this.sub21[c], ...this.sub18[c].filter((x) => idade(x) >= 16)]);
    for (const g of Object.keys(porG)) {
      for (const j of cand) {
        if (porG[g] >= PR.minimos_posicao[g]) break;
        if (grupo(j) !== g || !this.escalao[j]) continue;
        this.promover(j, dia, false, 'posicao'); porG[g]++;
      }
    }
    // Plantel abaixo do mínimo: sobem os melhores juniores, tenham ou não o nível.
    for (const j of cand) { if (plantel() >= PR.plantel_minimo) break; if (this.escalao[j]) this.promover(j, dia, false, 'minimo'); }

    // 2. Sub-18: aos 19 passam ao sub-21 (ou saem); fora da curva sobem antes.
    const med21 = (() => { const v = this.sub21[c].map((j) => st.ovrNat(j)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * PR.fora_da_curva_sub21)] : L - 15; })();
    const p75 = (() => { const v = this.sub18[c].map((j) => st.pot[j]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length * PR.fora_da_curva_percentil)] : 99; })();
    for (const j of ord([...this.sub18[c]])) {
      const a = idade(j);
      if (a >= 19) {
        if (this.sub21[c].length < ESCALOES.sub21.maximo && st.pot[j] >= corte) this.moverPara(j, ESC.sub21, c);
        else this.libertar(j, dia);
      } else if (a < 18 && st.ovrNat(j) >= med21 && st.pot[j] >= p75) {
        // Fora da curva: directo à equipa principal se já tiver o nível; senão ao sub-21.
        const principal = st.ovrNat(j) >= limiar && plantel() < PR.plantel_alvo;
        this.foraDaCurva.push({ dia, clube: c, jogador: j, idade: Math.floor(a), ovr: st.ovrNat(j), pot: st.pot[j], para: principal ? 'equipa principal' : 'sub-21' });
        if (principal) this.promover(j, dia, true, 'fora_da_curva');
        else if (this.sub21[c].length < ESCALOES.sub21.maximo) this.moverPara(j, ESC.sub21, c);
      }
    }
    // Sub-21 acima do limite: saem os piores.
    while (this.sub21[c].length > ESCALOES.sub21.maximo) this.libertar(ord([...this.sub21[c]]).pop()!, dia);

    // 3. Excedente do Sub-18 (o intake de Junho entra todo): o gestor propõe libertar os piores; a IA decide logo.
    const exc = this.propostaExcedente(c, dia);
    if (exc.length) {
      if (w.economia?.controlador(c).tipo === 'utilizador') this.excedente.set(c, { dia, jogadores: exc });
      else for (const j of exc) this.libertar(j, dia);
    }
    for (const j of this.jovens(c)) this.ovrInicio[j] = st.ovrNat(j);
  }

  /** Quem o gestor da academia propõe libertar para o Sub-18 voltar ao máximo (os de menor OVR + potencial; os mais velhos pesam menos). */
  propostaExcedente(c: number, dia: number): number[] {
    const st = this.w.jogadores!;
    const n = this.sub18[c].length - ESCALOES.sub18.maximo;
    if (n <= 0) return [];
    const val = (j: number) => st.ovrNat(j) + 0.6 * st.pot[j] - 2 * Math.max(0, st.idade(j, dia) - 16);
    return [...this.sub18[c]].sort((a, b) => val(a) - val(b)).slice(0, n);
  }

  /** Decisão do utilizador sobre o excedente: liberta os indicados (por omissão, a proposta do gestor). */
  decidirExcedente(c: number, dia: number, libertar?: number[]) {
    const p = this.excedente.get(c);
    this.excedente.delete(c);
    for (const j of libertar ?? p?.jogadores ?? []) if (this.w.jogadores!.clube[j] === c && this.escalao[j] === ESC.sub18) this.libertar(j, dia);
  }

  /** Intake de Junho: 6–12 jovens de 15–16 anos entram directamente no Sub-18. */
  intake(c: number, dia: number) {
    const w = this.w;
    if (w.liga[c] < 0) return;
    this.garantir();
    const rng = Rng.de(w.semente, 'intake', w.clubes[c].id, dia);
    const novos: number[] = [];
    for (let k = 0, vol = this.volumeIntake(c); k < vol; k++) {
      const pais = this.paisIntake(c, rng);
      const jv = this.sortearJovem(c, rng, pais, dia);
      const j = this.gerarJovem(c, I.idade[0] + rng.next() * (I.idade[1] - I.idade[0] + 0.9), jv, dia, rng, ESC.sub18, pais);
      this.sub18[c].push(j);
      novos.push(j);
    }
    this.ultimoIntake[c] = { dia, jogadores: novos };
  }

  /** Relatório do intake (posição, idade, altura, peso, OVR e PT em intervalo, personalidade numa palavra). */
  relatorioIntake(c: number, dia: number): LinhaIntake[] {
    const w = this.w, st = w.jogadores!;
    const aval = (w.economia?.staff.atr(c, 'chefe_juvenil', 'avaliacao_potencial', 10) ?? 10) + (w.economia?.staff.atr(c, 'chefe_juvenil', 'avaliacao_habilidade', 10) ?? 10);
    const base = Math.max(RI.minimo, RI.meia_largura_base - RI.por_ponto * (aval / 2 - 10));
    const out: LinhaIntake[] = [];
    for (const j of this.ultimoIntake[c]?.jogadores ?? []) {
      if (st.clube[j] !== c) continue;
      const jogos = this.ligas.jogos[j] ?? 0;
      const m = Math.max(RI.minimo, Math.round(base * Math.max(0.3, 1 - RI.por_jogo * jogos)));
      // Intervalo deslocado ao acaso (estável por jogador), para não centrar sempre no valor real.
      const r = Rng.de(w.semente, 'intake-rel', j);
      const ovr = st.ovrNat(j), pot = st.pot[j], dO = r.int(1 - m, m - 1), dP = r.int(1 - m, m - 1);
      const pers = PERSONALIDADE.find((x) => { const v = st.oculto(j, x.oculto); return (x.min === undefined || v >= x.min) && (x.max === undefined || v <= x.max); }) ?? PERSONALIDADE_NEUTRA;
      const pos = POSICOES[st.posNat[j]], idade = st.idade(j, dia), corpo = corpoJogador(st.ids[j], pos, idade);
      out.push({ jogador: j, nome: st.nomes[j], pais: st.paises[st.pais[j]] ?? '', posicao: pos, idade: Math.floor(idade), altura: corpo.altura, peso: corpo.peso,
        ovr: [clamp(ovr + dO - m, 1, 99), clamp(ovr + dO + m, 1, 99)], pt: [clamp(pot + dP - m, 1, 99), clamp(pot + dP + m, 1, 99)], personalidade: pers.nome, tom: pers.tom });
    }
    return out.sort((a, b) => b.pt[1] - a.pt[1]);
  }

  /** Primeiro contrato profissional (aos 18): salário mínimo da liga/divisão, até aos 22; cláusula de aumento após N jogos. */
  contratoJunior(j: number, c: number, dia: number) {
    const w = this.w, st = w.jogadores!, m = w.mercado;
    const l = w.liga[c];
    const div = l >= 0 && w.ligas[l].regras.nivel > 1 ? CJ.divisao : 1;
    st.salario[j] = Math.round((CJ.base * (1 + (CJ.por_riqueza * indiceRiqueza(w, c)) / 100) * div) / 1000) * 1000;
    const anos = Math.max(1, Math.round(CJ.ate_idade - st.idade(j, dia + 60)));
    st.fimContrato[j] = fimDeEpocaContrato(w, c, dia + 60, anos);
    if (m) { m.contratos.aumentoJogos[j] = CONTRATO_J.jovem_aumento_jogos; m.contratos.chegada[j] ||= dia; }
  }

  /** Massa salarial dos juniores com contrato (paga todos os meses pela economia do clube). */
  folhaJuniores(c: number): number {
    const st = this.w.jogadores!;
    let s = 0;
    for (const j of this.jovens(c)) s += st.salario[j];
    return s;
  }

  /** Tecto de OVR dos 15 aos 18 (todos os jogadores, também os já promovidos): tira pontos aos atributos relevantes. */
  aplicarTeto(dia: number) {
    const st = this.w.jogadores!;
    const lim = dia - TETO_JUNIOR.idade * 365.25;
    for (let j = 0; j < st.n; j++) {
      if (st.clube[j] < 0 || st.nasc[j] <= lim || st.ovrNat(j) <= this.teto) continue;
      let guarda = 0;
      while (st.ovrNat(j) > this.teto && guarda++ < 60) {
        let k = 0, mx = 0;
        for (let a = 0; a < N_ATR; a++) if (st.atr[j * N_ATR + a] > mx) { mx = st.atr[j * N_ATR + a]; k = a; }
        st.atr[j * N_ATR + k]--;
        st.recalcular(j);
      }
    }
  }

  /** Potencial dinâmico (fim de época, até aos 24): minutos, força da liga, centro de treino; um jogador muito acima do clube perde. */
  ajustarPotenciais(clubes: number[], dia: number) {
    const w = this.w, st = w.jogadores!, e = w.economia;
    const rng = Rng.de(w.semente, 'potencial', dia);
    for (const c of clubes) {
      const l = w.liga[c];
      if (l < 0) continue;
      const R = w.ligas[l].regras;
      const fd = R.forca_desportiva;
      const jornadas = Math.max(10, 2 * (R.formato.equipas - 1));
      const L = ovrAlvoClube(w, c);
      const treino = e ? e.nivel(c, 'treino') : 5;
      for (const j of [...w.plantel[c], ...this.jovens(c)]) {
        if (st.clube[j] !== c || st.idade(j, dia) > PD.idade_maxima) continue;
        const parte = this.escalao[j] ? this.minutos(j) : clamp(st.eMinutos[j] / (90 * jornadas), 0, 1);
        const mu = PD.minutos * (parte - PD.minutos_centro) + (PD.liga * (fd - PD.liga_centro)) / 50 + (PD.treino * (treino - 5)) / 5 - (PD.acima_do_clube * Math.max(0, st.ovrNat(j) - L - PD.margem_clube)) / 10;
        let d = clamp(mu + rng.normal(0, PD.desvio), -PD.maximo, PD.maximo);
        // Perto do topo sobe-se cada vez menos: o 99 é raríssimo.
        if (d > 0) d *= clamp((99 - st.pot[j]) / PD.topo_suave, 0, 1);
        d = Math.round(d);
        if (d) st.pot[j] = clamp(st.pot[j] + d, st.ovrNat(j), 99);
      }
    }
  }

  /** Clubes que saíram para o exterior: a academia fecha (os juniores ficam livres ou deixam o futebol). */
  limparExterior(dia: number) {
    const w = this.w;
    for (let c = 0; c < this.sub18.length; c++) {
      if (w.liga[c] >= 0) continue;
      for (const j of this.jovens(c)) this.libertar(j, dia);
    }
  }

  // ---------------------------------------------------------------- mercado de jovens

  /** Compensação de formação (€): anos de formação dos 12 aos 21 no clube actual × valor da categoria do comprador. */
  compensacao(j: number, comprador: number, dia: number): number {
    const st = this.w.jogadores!;
    const ini = Math.max(CO.idade_inicio, (this.entrada[j] - st.nasc[j]) / 365.25);
    const fim = Math.min(CO.idade_fim, st.idade(j, dia));
    const anos = Math.max(1, Math.round(fim - ini));
    const cat = CO.categorias.find((k) => this.w.reputacao[comprador] >= k.reputacao) ?? CO.categorias[CO.categorias.length - 1];
    return anos * cat.por_ano;
  }

  /** Semana: ligas juvenis e missões do olheiro de jovens. */
  semana(segunda: number) {
    this.ligas.semana(segunda);
    this.missoes.semana(segunda);
  }

  /** Recebe na academia um jovem de fora do mundo (missão do olheiro): Sub-18 ou Sub-21 pela idade; contrato aos 18. */
  receberExterno(j: number, c: number, dia: number) {
    const st = this.w.jogadores!;
    this.garantir();
    const esc = st.idade(j, dia) >= 19 ? ESC.sub21 : ESC.sub18;
    this.moverPara(j, esc, c);
    this.entrada[j] = dia;
    this.ovrInicio[j] = st.ovrNat(j);
    if (this.w.mercado) { this.w.mercado.contratos.chegada[j] = dia; this.w.mercado.contratos.formadoClube[j] = c; }
    if (st.idade(j, dia) >= CJ.idade) this.contratoJunior(j, c, dia);
    const lista = esc === ESC.sub21 ? this.sub21 : this.sub18, max = esc === ESC.sub21 ? ESCALOES.sub21.maximo : ESCALOES.sub18.maximo;
    if (lista[c].length > max) { const pior = lista[c].filter((x) => x !== j).sort((a, b) => st.pot[a] - st.pot[b])[0]; if (pior !== undefined) this.libertar(pior, dia); }
  }

  /** Transfere um júnior para a academia de outro clube, pagando a compensação de formação. */
  transferirJovem(j: number, para: number, dia: number): number {
    const w = this.w, st = w.jogadores!, e = w.economia;
    const de = st.clube[j];
    const valor = this.compensacao(j, para, dia);
    if (e) { e.clubes.lancar(para, 'aquisicoes', valor); e.clubes.lancar(de, 'transferencias', valor); }
    const esc = st.idade(j, dia) >= 19 ? ESC.sub21 : ESC.sub18;
    const lista = esc === ESC.sub21 ? this.sub21 : this.sub18;
    this.moverPara(j, esc, para);
    // Sem vaga: sai o pior do escalão de destino.
    const max = esc === ESC.sub21 ? ESCALOES.sub21.maximo : ESCALOES.sub18.maximo;
    if (lista[para].length > max) { const pior = lista[para].filter((x) => x !== j).sort((a, b) => st.pot[a] - st.pot[b])[0]; if (pior !== undefined) this.libertar(pior, dia); }
    this.entrada[j] = dia;
    if (w.mercado) {
      w.mercado.contratos.chegada[j] = dia;
      w.mercado.registo.push({ dia, tipo: 'formacao', jogador: j, de, para, fee: valor, valor, idade: Math.floor(st.idade(j, dia)), ovr: st.ovrNat(j) });
    }
    this.aliciados.push({ dia, de, para, jogador: j, compensacao: valor });
    return valor;
  }

  /** Aliciamento anual (Julho): clubes maiores levam os melhores jovens do Sub-18 (16–18) de clubes menores que conhecem. */
  aliciar(dia: number) {
    const w = this.w, st = w.jogadores!, m = w.mercado, e = w.economia;
    if (!m || !e) return;
    const sc = m.scouting;
    const rng = Rng.de(w.semente, 'aliciamento', dia);
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0 || e.controlador(c).tipo === 'utilizador' || !rng.chance(AL.prob_clube * (0.5 + this.usoAcademia(c)))) continue;
      const L = ovrAlvoClube(w, c);
      let melhor = -1, mv = -Infinity;
      for (const j of sc.conhecidos(c)) {
        const d = st.clube[j];
        if (d < 0 || d === c || this.escalao[j] !== ESC.sub18) continue;
        if (w.reputacao[c] < w.reputacao[d] + AL.diferenca_reputacao) continue;
        const a = st.idade(j, dia);
        if (a < AL.idade[0] || a >= AL.idade[1] + 1) continue;
        if (sc.nivel(c, j, dia) < 35) continue;
        const pot = sc.estimarPotencial(c, j, dia).estimado;
        if (pot < L - AL.margem_potencial || pot <= mv) continue;
        mv = pot; melhor = j;
      }
      if (melhor < 0) continue;
      const d = st.clube[melhor];
      // O jovem (e a família) aceita se o clube grande o atrai mais do que ficar (reputação, ambição).
      const atraccao = w.reputacao[c] - w.reputacao[d] - AL.diferenca_reputacao + (st.oculto(melhor, 'amb') - 10) + rng.normal(0, AL.ruido);
      if (atraccao <= 0) continue;
      if (e.controlador(d).tipo === 'utilizador') continue; // o utilizador decide (Prompt 5)
      if (e.clubes.caixa[c] < this.compensacao(melhor, c, dia)) continue;
      this.transferirJovem(melhor, c, dia);
    }
  }

  // ---------------------------------------------------------------- mensal

  mes(dia: number) {
    const w = this.w, e = w.economia;
    const mes = new Date(dia * 864e5).getUTCMonth();
    if (mes === I.mes) for (let c = 0; c < w.clubes.length; c++) this.intake(c, dia);
    if (mes === 6) this.aliciar(dia);
    // Excedente do Sub-18 que o utilizador não decidiu até ao prazo: aplica-se a proposta do gestor.
    if (mes === EX.prazo_utilizador_mes) for (const c of [...this.excedente.keys()]) this.decidirExcedente(c, dia);
    if (!e) return;
    // Salários dos juniores com contrato profissional.
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0) { const f = this.folhaJuniores(c); if (f) e.clubes.lancar(c, 'salarios', f / 12); }
  }

  // ---------------------------------------------------------------- dados para a interface (Prompt 5)

  conselho(j: number, dia: number): Conselho {
    const st = this.w.jogadores!;
    const c = st.clube[j];
    const L = ovrAlvoClube(this.w, c);
    const e = this.escalao[j], a = st.idade(j, dia), ovr = st.ovrNat(j), pot = st.pot[j];
    const limiar = this.limiarPromocao(c);
    if (pot < this.potencialEsperado(c, this.diaLiga) + CORTE_RELATIVO) return 'libertar';
    if (ovr >= limiar) return 'promover_principal';
    if (e === ESC.sub18) {
      const med21 = this.sub21[c].length ? this.sub21[c].map((x) => st.ovrNat(x)).sort((x, y) => x - y)[this.sub21[c].length >> 1] : L - 15;
      return (ovr >= limiar - 8 && a >= 17) || ovr >= med21 ? 'promover_sub21' : 'manter';
    }
    if (a >= 20 && ovr >= limiar - 8) return 'emprestar';
    if (a >= 21) return ovr >= L - 20 ? 'vender' : 'libertar';
    return 'manter';
  }

  /** Ecrã de resumo dos jovens do Sub-18 (15–17) de um clube visto por `observador` (o próprio: conhecimento total; outros: nevoeiro). */
  resumoSub18(c: number, dia: number, observador = c): LinhaProspecto[] {
    const w = this.w, st = w.jogadores!, sc = w.mercado?.scouting;
    const proprio = observador === c;
    const out: LinhaProspecto[] = [];
    for (const j of this.sub18[c].filter((x) => st.idade(x, dia) < 18)) {
      const n = proprio ? 100 : sc?.nivel(observador, j, dia) ?? 0;
      if (!proprio && n < 1) continue;
      const pos = POSICOES[st.posNat[j]];
      // Atributos principais: os de maior peso nos papéis da posição.
      const peso = new Float32Array(N_ATR);
      for (const r of PAPEIS_DA_POSICAO[pos]) for (let k = 0; k < N_ATR; k++) peso[k] += PESOS_PAPEL[r][k];
      const top = [...peso.keys()].sort((a, b) => peso[b] - peso[a]).slice(0, 5);
      const rel = proprio ? null : sc!.relatorio(observador, j, dia);
      const atributos = top.map((k) => {
        const a = ATRIBUTOS[k];
        const v = st.atr[j * N_ATR + k];
        const iv = rel?.atributos[a.id];
        return { id: a.id, nome: a.nome, valor: proprio || !iv ? v : iv };
      });
      const pot = proprio ? { min: st.pot[j] - 1, max: st.pot[j] + 1 } : sc!.estimarPotencial(observador, j, dia);
      const ovr = proprio ? st.ovrNat(j) : (() => { const o = sc!.estimarOVR(observador, j, dia); return [o.min, o.max] as [number, number]; })();
      const cons = this.conselho(j, dia);
      out.push({
        jogador: j, nome: st.nomes[j], idade: Math.floor(st.idade(j, dia)), posicao: pos, escalao: NOME_ESCALAO[this.escalao[j]], atributos, ovr,
        estrelas: [estrelas(pot.min), estrelas(pot.max)], evolucao: proprio ? st.ovrNat(j) - this.ovrInicio[j] : null,
        estado: cons.startsWith('promover') ? 'pronto para promoção' : 'a treinar', conselho: cons, conhecimento: Math.round(n),
      });
    }
    return out.sort((a, b) => b.estrelas[1] + b.estrelas[0] - a.estrelas[1] - a.estrelas[0]);
  }

  /** Contagens (para os relatórios). */
  contagens(): { individuais: number; sub18: number; sub21: number } {
    const s = (L: number[][]) => L.reduce((a, b) => a + b.length, 0);
    return { individuais: s(this.sub18) + s(this.sub21), sub18: s(this.sub18), sub21: s(this.sub21) };
  }

  bytes(): number {
    const c = this.contagens();
    return this.escalao.byteLength + this.ovrInicio.byteLength + this.entrada.byteLength + c.individuais * 8 + this.ultimoIntake.reduce((a, x) => a + x.jogadores.length * 4, 0) + this.ligas.bytes();
  }
}
