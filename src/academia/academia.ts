// Academia e juniores (Prompt 4, Bloco C).
// Dois escalões por clube (sub-18, sub-21) e a academia (prospectos 15–17). Só os escalões e a shortlist de prospectos
// são jogadores individuais (PlayerStore, com o clube preenchido mas FORA de w.plantel, que é a equipa principal);
// os restantes jovens da academia são um agregado (quantos, por idade e faixa de qualidade).
// Sem jogos de juniores: os minutos e o nível de competição entram na evolução como um número por escalão.
import { Rng } from '../core/rng.ts';
import { POSICOES, PAPEIS_DA_POSICAO, type Posicao } from '../config/papeis.ts';
import { ATRIBUTOS, N_ATR } from '../config/atributos.ts';
import { GERACAO_JOGADORES as G } from '../config/geracaoJogadores.ts';
import { PESOS_PAPEL } from '../players/store.ts';
import { CONFEDERACAO_PAIS } from '../config/paises.ts';
import {
  ESCALOES, PROSPECTOS as P, INTAKE as I, MINUTOS_JUVENIS as MJ, DESENVOLVIMENTO_JUVENIL as DJ, PROMOCAO as PR,
  ALICIAMENTO as AL, COMPENSACAO as CO, ESTATISTICAS_JUVENIS as EJ, FORCA_JUVENIL_PAIS, DIMENSAO_PAIS,
} from '../config/academia.ts';
import { PARAMETROS } from '../config/arquetipos.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
import { gerarJogador, ovrAlvoClube } from '../players/gerador.ts';
import { diaInicioMundo, type World } from '../engine/world.ts';

/** 0 = não é júnior (equipa principal ou sem clube); 1 = sub-21; 2 = sub-18; 3 = prospecto da academia. */
export const ESC = { nenhum: 0, sub21: 1, sub18: 2, prospecto: 3 } as const;
export const NOME_ESCALAO = ['equipa principal', 'sub-21', 'sub-18', 'academia'];
const N_IDADES = 3; // agregado: 15, 16, 17
const NF = P.faixas.length;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export type Conselho = 'promover_sub18' | 'promover_sub21' | 'promover_principal' | 'manter' | 'emprestar' | 'vender' | 'libertar';

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

export interface EstatJovem { jogos: number; golos: number; assist: number; notas: number }

const estrelas = (pot: number) => clamp(Math.round(((pot - 40) / 12) * 2) / 2, 0.5, 5);

export class Academia {
  escalao = new Uint8Array(0);
  /** OVR no fim da última época (para a "evolução recente"). */
  ovrInicio = new Uint8Array(0);
  /** Dia em que entrou na academia do clube actual (anos de formação para a compensação). */
  entrada = new Int32Array(0);
  sub18: number[][] = [];
  sub21: number[][] = [];
  prospectos: number[][] = [];
  /** Agregado por clube: idade (15, 16, 17) × faixa de qualidade → quantidade. */
  agregado: Uint16Array[] = [];
  /** Estatísticas leves dos jovens do clube do utilizador (nos clubes da IA não se guardam). */
  estat = new Map<number, EstatJovem>();
  /** Registo: promoções à equipa principal (para a comparação formador × comprador) e aliciamentos. */
  promovidos: { dia: number; clube: number; jogador: number; idade: number; ovr: number; foraDaCurva: boolean; motivo: string }[] = [];
  aliciados: { dia: number; de: number; para: number; jogador: number; compensacao: number }[] = [];
  foraDaCurva: { dia: number; clube: number; jogador: number; idade: number; ovr: number; pot: number; para: string }[] = [];
  private seq = 0;
  /** Âncora por liga: OVR médio da equipa principal no início e o actual (recalculado uma vez por dia de passagem). */
  private refLiga = new Map<number, number>();
  private actLiga = new Map<number, number>();
  private diaLiga = -1;

  constructor(public w: World) {
    const dia = diaInicioMundo();
    this.garantir();
    for (let l = 0; l < w.ligas.length; l++) { const v = this.ovrLiga(l); if (v > 0) this.refLiga.set(l, v); }
    for (let c = 0; c < w.clubes.length; c++) this.iniciarClube(c, dia);
  }

  private garantir() {
    const cap = this.w.jogadores!.cap;
    if (this.escalao.length < cap) {
      const e = new Uint8Array(cap); e.set(this.escalao); this.escalao = e;
      const o = new Uint8Array(cap); o.set(this.ovrInicio); this.ovrInicio = o;
      const n = new Int32Array(cap); n.set(this.entrada); this.entrada = n;
    }
    this.w.mercado?.contratos.garantir(cap);
    const n = this.w.clubes.length;
    while (this.sub18.length < n) { this.sub18.push([]); this.sub21.push([]); this.prospectos.push([]); this.agregado.push(new Uint16Array(N_IDADES * NF)); }
  }

  // ---------------------------------------------------------------- leitura

  nivelAcademia(c: number): number { return this.w.economia?.nivel(c, 'academia') ?? 5; }
  coordenador(c: number): number { return this.w.economia?.staff.nivel(c, 'coordenador_academia') ?? 10; }
  shortlistMax(c: number): number { return Math.min(P.shortlist_maximo, Math.round(P.shortlist_base + P.shortlist_por_nivel * this.nivelAcademia(c))); }
  usoAcademia(c: number): number { const a = this.w.economia?.ia?.arquetipo[c]; return a ? PARAMETROS[a].academia : 0.5; }

  /** Todos os juniores individuais do clube. */
  jovens(c: number): number[] { return [...(this.sub21[c] ?? []), ...(this.sub18[c] ?? []), ...(this.prospectos[c] ?? [])]; }

  /** Um júnior individual ao acaso (para os scouts), sem criar listas. */
  jovemAleatorio(c: number, rng: Rng): number {
    const a = this.sub21[c]?.length ?? 0, b = this.sub18[c]?.length ?? 0, d = this.prospectos[c]?.length ?? 0;
    const n = a + b + d;
    if (!n) return -1;
    let k = rng.int(0, n - 1);
    if (k < a) return this.sub21[c][k];
    k -= a;
    if (k < b) return this.sub18[c][k];
    return this.prospectos[c][k - b];
  }

  /** Minutos (0–1) que entram na evolução de um júnior: escalão, nível da academia e campeonato do país. */
  minutos(j: number): number {
    const c = this.w.jogadores!.clube[j];
    const e = this.escalao[j];
    const base = e === ESC.sub21 ? MJ.sub21 : e === ESC.sub18 ? MJ.sub18 : MJ.prospecto;
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

  /** Potencial médio do intake do clube (nível do clube + factores). */
  potencialMedio(c: number, pais = this.w.clubes[c].pais): number {
    const w = this.w;
    const f = {
      reputacao: (w.reputacao[c] - 50) / 50,
      academia: (this.nivelAcademia(c) - 5) / 5,
      coordenador: (this.coordenador(c) - 10) / 10,
      recrutamento: ((w.economia?.nivel(c, 'recrutamento') ?? 5) - 5) / 5,
      pais: ((FORCA_JUVENIL_PAIS[pais] ?? 0.5) - 0.5) * 2,
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

  /** Cria um júnior individual com o potencial dado (OVR actual pela idade, como no gerador do Prompt 2). */
  private gerarJovem(c: number, idade: number, pot: number, dia: number, rng: Rng, esc: number, pais = this.paisIntake(c, rng)): number {
    const st = this.w.jogadores!;
    const t0 = pot - 0.5 * G.margem_potencial(idade);
    const ovr = clamp(t0 - G.atraso_jovem(idade), 12, 90);
    const j = gerarJogador(st, rng, { id: `${this.w.clubes[c].id}_a${++this.seq}`, pais, pos: this.posicaoAleatoria(rng), idade, dia, ovr, potencial: clamp(pot, ovr, 99), clube: c });
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
    const mu = this.potencialMedio(c);
    // Os escalões já existentes: os que sobreviveram às selecções anteriores (mais fortes do que o intake médio).
    const n18 = ESCALOES.sub18.maximo - 2, n21 = ESCALOES.sub21.maximo - 2;
    for (let k = 0; k < n21; k++) this.sub21[c].push(this.gerarJovem(c, 19 + rng.next() * 3, mu + 5 + rng.normal(0, I.desvio * 0.8), dia, rng, ESC.sub21));
    for (let k = 0; k < n18; k++) this.sub18[c].push(this.gerarJovem(c, 15.5 + rng.next() * 3.4, mu + 3 + rng.normal(0, I.desvio * 0.8), dia, rng, ESC.sub18));
    for (let k = 0; k < this.shortlistMax(c); k++) this.prospectos[c].push(this.gerarJovem(c, 15 + rng.next() * 2.9, mu + 1 + rng.normal(0, I.desvio * 0.8), dia, rng, ESC.prospecto));
    // Agregado: o resto de três intakes.
    const vol = this.volumeIntake(c);
    const ag = this.agregado[c];
    for (let a = 0; a < N_IDADES; a++) for (let k = 0; k < vol - Math.round(this.shortlistMax(c) / 3); k++) ag[a * NF + this.faixa(mu + rng.normal(0, I.desvio) - ovrAlvoClube(w, c))]++;
  }

  private faixa(dPot: number): number {
    let f = 0;
    for (let k = 0; k < NF; k++) if (dPot >= P.faixas[k]) f = k;
    return f;
  }

  volumeIntake(c: number): number {
    const V = I.volume;
    const dim = DIMENSAO_PAIS[this.w.clubes[c].pais] ?? 0.4;
    const x = V.dimensao * dim + (V.academia * this.nivelAcademia(c)) / 10 + (V.reputacao * this.w.reputacao[c]) / 100;
    return Math.round(I.minimo + (I.maximo - I.minimo) * clamp(x, 0, 1));
  }

  // ---------------------------------------------------------------- saídas e movimentos

  private tirar(j: number) {
    const st = this.w.jogadores!;
    const c = st.clube[j];
    if (c < 0) return;
    for (const L of [this.sub18, this.sub21, this.prospectos]) { const a = L[c]; const k = a?.indexOf(j) ?? -1; if (k >= 0) a.splice(k, 1); }
    this.escalao[j] = ESC.nenhum;
  }

  /** Liberta um júnior: livre se tiver nível para isso, senão deixa o futebol. */
  libertar(j: number, dia: number) {
    const st = this.w.jogadores!;
    this.tirar(j);
    this.estat.delete(j);
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

  private moverPara(j: number, esc: number, c: number) {
    this.tirar(j);
    this.w.jogadores!.clube[j] = c;
    this.escalao[j] = esc;
    (esc === ESC.sub21 ? this.sub21 : esc === ESC.sub18 ? this.sub18 : this.prospectos)[c].push(j);
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

  /** Passagem de época de um clube: promoções, transições de escalão, shortlist, agregado e intake. */
  fimDeEpoca(c: number, dia: number) {
    const w = this.w, st = w.jogadores!;
    if (w.liga[c] < 0) return;
    this.garantir();
    const rng = Rng.de(w.semente, 'academia', w.clubes[c].id, dia);
    for (const L of [this.sub18, this.sub21, this.prospectos]) L[c] = L[c].filter((j) => st.clube[j] === c && this.escalao[j]);
    const idade = (j: number) => st.idade(j, dia + 60); // idade na época que começa
    const L = ovrAlvoClube(w, c);
    // Corte de qualidade (sub-21, shortlist): relativo à média do intake do clube, já com a âncora da liga.
    const mu = this.potencialMedio(c) - I.ancora.ganho * this.derivaLiga(c, dia);
    const corte = mu + P.corte_relativo;
    const plantel = () => w.plantel[c].filter((j) => st.clube[j] === c).length;
    const ord = (a: number[]) => a.sort((x, y) => st.ovrNat(y) + 0.3 * st.pot[y] - st.ovrNat(x) - 0.3 * st.pot[x]);

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
        if (st.ovrNat(j) >= nivelLiga - PR.vender_margem && plantel() < alvo + PR.vender_lugares) { this.promover(j, dia, false, 'vender'); if (w.mercado) w.mercado.contratos.listado[j] = 1; }
        else this.libertar(j, dia);
      }
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

    // 3. Prospectos → sub-18 (vagas, os melhores); aos 18 sem lugar saem.
    for (const j of ord([...this.prospectos[c]])) {
      if (this.sub18[c].length < ESCALOES.sub18.maximo && (idade(j) >= 16 || st.pot[j] >= p75)) this.moverPara(j, ESC.sub18, c);
      else if (idade(j) >= 18) this.libertar(j, dia);
    }

    // 4. Agregado: envelhece, alguns despontam (passam a individuais).
    const ag = this.agregado[c];
    for (let f = 0; f < NF; f++) {
      for (let a = 0; a < N_IDADES; a++) {
        let n = ag[a * NF + f], desp = 0;
        for (let k = 0; k < n; k++) if (rng.chance(P.despontar)) desp++;
        n -= desp;
        ag[a * NF + f] = n;
        for (let k = 0; k < desp; k++) this.prospectos[c].push(this.gerarJovem(c, 15.2 + a + rng.next() * 0.7, L + P.faixas[f] + 3 + P.despontar_bonus + rng.normal(0, 2), dia, rng, ESC.prospecto));
      }
    }
    // Os de 17 saem do agregado (deixam a academia); os outros fazem anos.
    for (let f = 0; f < NF; f++) { ag[2 * NF + f] = ag[1 * NF + f]; ag[1 * NF + f] = ag[f]; ag[f] = 0; }

    // 5. Intake: os que entram na shortlist viram individuais; os outros vão para o agregado.
    const vol = this.volumeIntake(c);
    const max = this.shortlistMax(c);
    for (let k = 0; k < vol; k++) {
      const pais = this.paisIntake(c, rng);
      const pot = (pais === w.clubes[c].pais ? mu : this.potencialMedio(c, pais) - I.ancora.ganho * this.derivaLiga(c, dia)) + rng.normal(0, I.desvio);
      const pior = this.prospectos[c].length ? Math.min(...this.prospectos[c].map((j) => st.pot[j])) : -1;
      if (this.prospectos[c].length < max || pot > pior) {
        this.prospectos[c].push(this.gerarJovem(c, I.idade[0] + rng.next() * (I.idade[1] - I.idade[0] + 0.9), pot, dia, rng, ESC.prospecto, pais));
      } else ag[this.faixa(pot - L)]++;
    }
    // 6. Shortlist: fica com os N de maior potencial; os que não evoluem saem (ou voltam ao agregado).
    const pros = [...this.prospectos[c]].sort((x, y) => st.pot[y] - st.pot[x]);
    for (const [k, j] of pros.entries()) {
      if (k < max && st.pot[j] >= corte) continue;
      const a = Math.floor(idade(j)) - 15;
      if (a >= 0 && a < N_IDADES && st.pot[j] >= corte - 6) { ag[a * NF + this.faixa(st.pot[j] - L)]++; this.tirar(j); st.clube[j] = -2; }
      else this.libertar(j, dia);
    }
    for (const j of this.jovens(c)) this.ovrInicio[j] = st.ovrNat(j);
  }

  /** Clubes que saíram para o exterior: a academia fecha (os juniores ficam livres ou deixam o futebol). */
  limparExterior(dia: number) {
    const w = this.w;
    for (let c = 0; c < this.sub18.length; c++) {
      if (w.liga[c] >= 0) continue;
      for (const j of this.jovens(c)) this.libertar(j, dia);
      this.agregado[c].fill(0);
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

  /** Transfere um júnior para a academia de outro clube, pagando a compensação de formação. */
  transferirJovem(j: number, para: number, dia: number): number {
    const w = this.w, st = w.jogadores!, e = w.economia;
    const de = st.clube[j];
    const valor = this.compensacao(j, para, dia);
    if (e) { e.clubes.lancar(para, 'aquisicoes', valor); e.clubes.lancar(de, 'transferencias', valor); }
    const esc = st.idade(j, dia) >= 19 ? ESC.sub21 : st.idade(j, dia) >= 17 || this.escalao[j] !== ESC.prospecto ? ESC.sub18 : ESC.prospecto;
    const lista = esc === ESC.sub21 ? this.sub21 : esc === ESC.sub18 ? this.sub18 : this.prospectos;
    this.moverPara(j, esc, para);
    // Sem vaga: sai o pior do escalão de destino.
    const max = esc === ESC.sub21 ? ESCALOES.sub21.maximo : esc === ESC.sub18 ? ESCALOES.sub18.maximo : this.shortlistMax(para);
    if (lista[para].length > max) { const pior = lista[para].filter((x) => x !== j).sort((a, b) => st.pot[a] - st.pot[b])[0]; if (pior !== undefined) this.libertar(pior, dia); }
    this.entrada[j] = dia;
    this.estat.delete(j);
    if (w.mercado) {
      w.mercado.contratos.chegada[j] = dia;
      w.mercado.registo.push({ dia, tipo: 'formacao', jogador: j, de, para, fee: valor, valor, idade: Math.floor(st.idade(j, dia)), ovr: st.ovrNat(j) });
    }
    this.aliciados.push({ dia, de, para, jogador: j, compensacao: valor });
    return valor;
  }

  /** Aliciamento anual (Julho): clubes maiores levam os melhores prospectos (16–18) de clubes menores que conhecem. */
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
        if (d < 0 || d === c || (this.escalao[j] !== ESC.sub18 && this.escalao[j] !== ESC.prospecto)) continue;
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
    if (mes === 6) this.aliciar(dia);
    if (!e) return;
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0 && e.controlador(c).tipo === 'utilizador') this.estatisticasMes(c, dia);
  }

  /** Estatísticas leves (jogos, golos, assistências, nota) coerentes com o OVR face ao escalão. Só o clube do utilizador. */
  estatisticasMes(c: number, dia: number) {
    const st = this.w.jogadores!;
    const rng = Rng.de(this.w.semente, 'estat-juvenis', c, dia);
    for (const [esc, lista] of [['sub21', this.sub21[c]], ['sub18', this.sub18[c]], ['prospecto', this.prospectos[c]]] as const) {
      const med = lista.length ? lista.reduce((s, j) => s + st.ovrNat(j), 0) / lista.length : 50;
      for (const j of lista) {
        const r = this.estat.get(j) ?? { jogos: 0, golos: 0, assist: 0, notas: 0 };
        const rel = (st.ovrNat(j) - med) / 10;
        const jogos = Math.max(0, Math.round(EJ.jogos_mes[esc] * clamp(0.6 + 0.4 * rel, 0.2, 1) + rng.normal(0, 0.6)));
        const pos = POSICOES[st.posNat[j]];
        const ataque = pos === 'PL' ? 0.45 : pos === 'ED' || pos === 'EE' || pos === 'MO' ? 0.25 : pos === 'MC' ? 0.1 : pos === 'GR' ? 0 : 0.04;
        for (let k = 0; k < jogos; k++) {
          if (rng.chance(ataque * clamp(1 + rel, 0.4, 2))) r.golos++;
          if (rng.chance(ataque * 0.7 * clamp(1 + rel, 0.4, 2))) r.assist++;
          r.notas += Math.round(clamp(6.6 + 0.4 * rel + rng.normal(0, 0.5), 4, 10) * 10);
        }
        r.jogos += jogos;
        this.estat.set(j, r);
      }
    }
  }

  // ---------------------------------------------------------------- dados para a interface (Prompt 5)

  conselho(j: number, dia: number): Conselho {
    const st = this.w.jogadores!;
    const c = st.clube[j];
    const L = ovrAlvoClube(this.w, c);
    const e = this.escalao[j], a = st.idade(j, dia), ovr = st.ovrNat(j), pot = st.pot[j];
    const limiar = this.limiarPromocao(c);
    if (pot < this.potencialMedio(c) - I.ancora.ganho * this.derivaLiga(c, this.diaLiga) + P.corte_relativo) return 'libertar';
    if (ovr >= limiar) return 'promover_principal';
    if (e === ESC.prospecto) {
      const med21 = this.sub21[c].length ? this.sub21[c].map((x) => st.ovrNat(x)).sort((x, y) => x - y)[this.sub21[c].length >> 1] : L - 15;
      if (ovr >= med21) return 'promover_sub21';
      return a >= 16 ? 'promover_sub18' : 'manter';
    }
    if (e === ESC.sub18) return ovr >= limiar - 8 && a >= 17 ? 'promover_sub21' : 'manter';
    if (a >= 20 && ovr >= limiar - 8) return 'emprestar';
    if (a >= 21) return ovr >= L - 20 ? 'vender' : 'libertar';
    return 'manter';
  }

  /** Ecrã de resumo dos prospectos (15–17) de um clube visto por `observador` (o próprio: conhecimento total; outros: nevoeiro). */
  resumoProspectos(c: number, dia: number, observador = c): LinhaProspecto[] {
    const w = this.w, st = w.jogadores!, sc = w.mercado?.scouting;
    const proprio = observador === c;
    const out: LinhaProspecto[] = [];
    for (const j of [...this.prospectos[c], ...this.sub18[c].filter((x) => st.idade(x, dia) < 18)]) {
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
  contagens(): { individuais: number; sub18: number; sub21: number; prospectos: number; agregado: number } {
    const s = (L: number[][]) => L.reduce((a, b) => a + b.length, 0);
    const ag = this.agregado.reduce((a, b) => a + b.reduce((x, y) => x + y, 0), 0);
    return { individuais: s(this.sub18) + s(this.sub21) + s(this.prospectos), sub18: s(this.sub18), sub21: s(this.sub21), prospectos: s(this.prospectos), agregado: ag };
  }

  bytes(): number {
    const c = this.contagens();
    return this.escalao.byteLength + this.ovrInicio.byteLength + this.entrada.byteLength + c.individuais * 8 + this.agregado.length * N_IDADES * NF * 2 + this.estat.size * 48;
  }
}
