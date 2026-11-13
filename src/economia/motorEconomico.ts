// Motor económico do mundo (Prompt 3, Bloco A). Liga-se ao simulador em 4 pontos:
//   - cada semana: salários, staff, manutenção, obras, juros, TV fixa, patrocínios, pára-quedas; bilheteira dos jogos da semana;
//   - cada mês: saúde financeira e obras (decisão do controlador);
//   - fim de época (por calendário): TV por posição, prémios, pára-quedas, patrocínios, balanço, histórico;
//   - abertura de época: contratos dos novos, receita prevista e orçamentos (decisão do controlador).
// A economia não mexe na força das equipas (até ao mercado do Prompt 4): só as instalações de treino e médicas
// têm efeitos pequenos e limitados no jogo.
import { Rng } from '../core/rng.ts';
import type { World } from '../engine/world.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import type { RegistoEpoca } from '../engine/history.ts';
import type { JogoR } from '../engine/competitions/base.ts';
import type { Premio, RegrasLiga } from '../data/types.ts';
import { SALARIO, BILHETEIRA as B, COMERCIAL as CM, ADEPTOS as AD, DESPESAS as DP, FINANCAS_INICIAIS as FI, SAUDE as SA, TV, FAIR_PLAY, CONTRATOS as K, HISTORICO_CLUBE } from '../config/economia.ts';
import { TIPOS_INFRA, INFRA, EFEITOS_INFRA as EI, NIVEIS_INICIAIS } from '../config/infraestruturas.ts';
import { ClubStore, N_INFRA, RECEITAS, DESPESAS_R, N_RUB, type BalancoEpoca, type Rubrica } from '../club/store.ts';
import { IA, custoObra, factorCustoInfra, type ClubController } from '../club/controlador.ts';
import { gerirMes, fecharEpocaFinancas, abrirEpocaFinancas, type EventoClube } from '../club/financas.ts';
import { gerarDono, donoDeCsv, type Dono } from '../donos/dono.ts';
import { garantirContratos, massaSalarial, salarioMercado, indiceRiqueza, fimDeEpoca } from './contratos.ts';

const CONTINENTAIS = new Set(['UCL', 'UEL', 'UECL', 'CLI', 'ACLE', 'UCL_PO', 'UEL_PO']);
/** Ordem das fases continentais alcançadas. */
const ORDEM_FASE: Record<string, number> = { liga: 0, grupos: 0, playoff: 1, oitavos: 2, quartos: 3, meias: 4, final: 5, vencedor: 6 };
/** Jogos da fase de liga/grupos por competição (para os prémios por vitória e empate). */
const JOGOS_FASE: Record<string, number> = { UCL: 8, UEL: 8, UECL: 6, CLI: 6, ACLE: 6 };

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Linhas de financas.csv (valores editáveis por clube; "manual" tem prioridade sobre o gerado). */
export type LinhaFinancas = Record<string, string>;

export class Economia {
  clubes = new ClubStore();
  controladores: ClubController[] = [];
  /** Jogadores sem clube (contrato acabou e o clube não renovou): Prompt 4. */
  livres: number[] = [];
  /** Parte fixa anual da TV (igual + comercial) de cada clube na época. */
  tvFixa = new Float64Array(0);
  /** Intensidade de rivalidade (1–3) por par "a|b" (a < b). */
  rivalidade = new Map<string, number>();
  /** Dono de cada clube, objectivo da época, eventos financeiros e pontos a deduzir na época seguinte. */
  donos: Dono[] = [];
  objectivos: string[] = [];
  eventos: EventoClube[] = [];
  pontosPendentes = new Map<number, number>();
  private limiteLiga = new Map<string, number>();
  /** Escala salarial de cada liga (calibrada no arranque). */
  escalaSalarial = new Map<string, number>();
  private ligaIds = new Set<string>();

  constructor(public w: World, financas: LinhaFinancas[] = [], donosCsv: LinhaFinancas[] = []) {
    for (const l of w.ligas) {
      this.ligaIds.add(l.regras.id);
      this.limiteLiga.set(l.regras.id, limiteFairPlayLiga(l.regras));
    }
    w.clubes.forEach((cl, a) => {
      for (const r of cl.rivais) {
        const b = w.idx(r);
        this.rivalidade.set(a < b ? `${a}|${b}` : `${b}|${a}`, 2);
      }
    });
    const porId = new Map(financas.map((f) => [f.clube, f]));
    const dia0 = diaReferencia(w);
    for (const l of donosCsv) { const i = w.clubes.findIndex((c) => c.id === l.clube); const d = i >= 0 ? donoDeCsv(l, dia0) : null; if (d) this.donos[i] = d; }
    for (let c = 0; c < w.clubes.length; c++) if (!this.donos[c]) this.donos[c] = gerarDono(w, c, Rng.de(w.semente, 'dono', w.clubes[c].id), dia0);
    this.garantir(w.clubes.length, porId);
  }

  // ---------------------------------------------------------------- utilidades

  /** Pontos a deduzir na próxima época do clube (sanções). */
  penalizar(c: number, pts: number, _motivo: string) {
    this.pontosPendentes.set(c, (this.pontosPendentes.get(c) ?? 0) + pts);
  }

  nivelLiga(id: string): number {
    return this.ligaIds.has(id) ? this.w.ligaPorId(id).regras.nivel : 99;
  }

  limiteFairPlay(c: number): number {
    const l = this.w.liga[c];
    return l >= 0 ? this.limiteLiga.get(this.w.ligas[l].regras.id) ?? FAIR_PLAY.padrao : FAIR_PLAY.padrao;
  }

  /** Multiplicador do salário de mercado no clube: escala da liga × capacidade salarial do clube. */
  escala(c: number): number {
    const l = this.w.liga[c];
    return (l >= 0 ? this.escalaSalarial.get(this.w.ligas[l].regras.id) ?? 1 : 1) * (this.clubes.escalaClube[c] || 1);
  }

  /** Calibra a escala salarial de cada liga: massa salarial de mercado = alvo × receita prevista da liga. */
  private calibrarEscalas(dia: number) {
    const w = this.w, st = w.jogadores;
    if (!st) return;
    for (const L of w.ligas) {
      let rec = 0, sal = 0;
      for (const c of L.clubes) {
        rec += this.clubes.receitaPrevista[c];
        for (const j of w.plantel[c]) if (st.clube[j] === c) sal += salarioMercado(st, j, L.regras.indice_riqueza, dia);
      }
      const alvo = L.regras.nivel === 1 ? SALARIO.alvo_massa_receita.nivel1 : SALARIO.alvo_massa_receita.inferiores;
      this.escalaSalarial.set(L.regras.id, sal > 0 ? (alvo * rec) / sal : 1);
    }
  }

  custoStaffPrevisto(_c: number, receita: number): number {
    return DP.staff_fraccao_receita * receita;
  }

  controlador(c: number): ClubController {
    return this.controladores[c] ?? IA;
  }

  intensidadeRival(a: number, b: number): number {
    return this.rivalidade.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0;
  }

  nivel(c: number, tipo: (typeof TIPOS_INFRA)[number]): number {
    return this.clubes.infra[c * N_INFRA + TIPOS_INFRA.indexOf(tipo)];
  }

  /** Efeito do centro de treino: pontos a somar ao "desenvolvimento" do treinador. */
  bonusTreino(c: number): number {
    return c < this.clubes.n ? EI.treino_desenvolvimento * (this.nivel(c, 'treino') - 5) : 0;
  }

  /** Efeito das instalações médicas: factor dos dias de lesão. */
  factorLesao(c: number): number {
    return c < this.clubes.n ? 1 - EI.medico_dias * (this.nivel(c, 'medico') - 5) : 1;
  }

  private receber(c: number, r: Rubrica, valor: number) {
    if (valor <= 0) return;
    const s = this.clubes;
    s.lancar(c, r, valor);
    s.lancar(c, 'impostos', valor * (DP.outros_por_pais[this.w.clubes[c].pais] ?? DP.outros_padrao));
  }

  // ---------------------------------------------------------------- inicialização

  /** Inicializa os clubes novos (geração do mundo ou entradas do exterior). */
  garantir(n: number, financas = new Map<string, LinhaFinancas>()) {
    const s = this.clubes;
    const n0 = s.n;
    if (n <= n0) return;
    for (let c = n0; c < n; c++) if (!this.donos[c]) this.donos[c] = gerarDono(this.w, c, Rng.de(this.w.semente, 'dono', this.w.clubes[c].id), diaReferencia(this.w));
    s.crescer(n);
    const t = new Float64Array(n);
    t.set(this.tvFixa);
    this.tvFixa = t;
    const dia = this.w.jogadores ? diaReferencia(this.w) : 0;
    for (let c = n0; c < n; c++) this.iniciarClube(c, financas.get(this.w.clubes[c].id));
    for (let c = n0; c < n; c++) this.clubes.receitaPrevista[c] = this.estimarReceita(c);
    if (n0 === 0) this.calibrarEscalas(dia);
    for (let c = n0; c < n; c++) this.iniciarCaixa(c, dia, financas.get(this.w.clubes[c].id));
  }

  private iniciarClube(c: number, f?: LinhaFinancas) {
    const w = this.w, s = this.clubes;
    const rng = Rng.de(w.semente, 'financas', w.clubes[c].id);
    const rep = w.reputacao[c];
    const ind = indiceRiqueza(w, c);
    s.capacidade[c] = w.clubes[c].capacidade;
    s.adeptos[c] = AD.base + AD.referencia * Math.pow(rep / 100, AD.expoente) * Math.pow(ind / 100, AD.expoente_riqueza);
    s.fidelidade[c] = clamp(Math.round(10 + (4 * (rep - 50)) / 50 + rng.normal(0, AD.fidelidade_desvio)), 1, 20);
    const base = 1 + 9 * Math.pow(rep / 100, NIVEIS_INICIAIS.expoente_reputacao) * Math.pow(0.6 + (0.4 * ind) / 100, 0.3);
    for (let k = 0; k < N_INFRA; k++) s.infra[c * N_INFRA + k] = clamp(Math.round(base + rng.normal(0, NIVEIS_INICIAIS.ruido)), 1, 10);
    s.patrocinio[c] = valorComercial(rep, ind, s.adeptos[c]);
    s.patrocinioFim[c] = epocaDoClube(w, c) + rng.int(0, 3);
    s.juroBanco[c] = FI.juro_banco;
    this.aplicarFinancas(c, f, false);
  }

  /** Contratos, caixa, dívida e orçamentos (depois de calibradas as escalas salariais). */
  private iniciarCaixa(c: number, dia: number, f?: LinhaFinancas) {
    const w = this.w, s = this.clubes;
    const rng = Rng.de(w.semente, 'caixa', w.clubes[c].id);
    if (w.jogadores) {
      // Capacidade salarial do clube: a massa de mercado do plantel fica à volta do alvo × receita prevista.
      const st = w.jogadores, ind = indiceRiqueza(w, c);
      let mercado = 0;
      for (const j of w.plantel[c]) if (st.clube[j] === c) mercado += salarioMercado(st, j, ind, dia, this.escala(c));
      const alvo = Math.min(SALARIO.alvo_massa_receita.nivel1, this.limiteFairPlay(c) - 0.05) * Math.exp(rng.normal(0, SALARIO.clube.desvio));
      s.escalaClube[c] = mercado > 0 ? clamp((alvo * s.receitaPrevista[c]) / mercado, SALARIO.clube.min, SALARIO.clube.max) : 1;
      s.folha[c] = garantirContratos(w, c, dia, rng, false, this.escala(c));
    }
    const receita = s.receitaPrevista[c];
    s.caixa[c] = receita * FI.caixa_fraccao * Math.exp(rng.normal(0, FI.caixa_ruido));
    s.dividaBanco[c] = rng.chance(FI.divida_prob_zero) ? 0 : receita * FI.divida_max_fraccao * rng.next();
    this.aplicarFinancas(c, f, true);
    this.definirOrcamentos(c);
    this.tvFixa[c] = this.tvFixaPrevista(c);
  }

  /** Valores editados à mão (financas.csv) têm prioridade sobre os gerados. */
  /** Valores de financas.csv: uma linha "manual"/"real", ou um valor diferente do gerado, sobrepõe-se ao gerado e fica "manual". */
  private aplicarFinancas(c: number, f: LinhaFinancas | undefined, dinheiro: boolean) {
    const s = this.clubes;
    if (!f) return;
    const forte = f.origem === 'manual' || f.origem === 'real';
    let mudou = false;
    const num = (k: string) => (f[k] !== undefined && f[k] !== '' ? Number(f[k]) : undefined);
    const set = (a: { [i: number]: number }, i: number, k: string, lim?: [number, number]) => {
      let v = num(k);
      if (v === undefined || Number.isNaN(v)) return;
      if (lim) v = clamp(v, lim[0], lim[1]);
      if (forte || Math.round(a[i]) !== Math.round(v)) { a[i] = v; mudou = true; }
    };
    if (dinheiro) { set(s.caixa, c, 'caixa'); set(s.dividaBanco, c, 'divida_banco'); set(s.dividaDono, c, 'divida_dono'); }
    else {
      set(s.adeptos, c, 'adeptos'); set(s.fidelidade, c, 'fidelidade', [1, 20]); set(s.patrocinio, c, 'patrocinio'); set(s.capacidade, c, 'capacidade');
      TIPOS_INFRA.forEach((tipo, k) => set(s.infra, c * N_INFRA + k, `infra_${tipo}`, [1, 10]));
    }
    if (mudou) s.origem[c] = f.origem === 'real' ? 'real' : 'manual';
  }

  private definirOrcamentos(c: number) {
    const s = this.clubes;
    const o = this.controlador(c).orcamentos(this.w, this, c, s.receitaPrevista[c]);
    s.orcSalarios[c] = o.salarios;
    s.orcTransferencias[c] = o.transferencias;
    s.orcInfra[c] = o.infra;
    s.orcStaff[c] = o.staff;
  }

  // ---------------------------------------------------------------- receitas: estimativas

  /** Parte fixa anual da TV de um clube (igual + comercial) na liga actual. */
  tvFixaPrevista(c: number): number {
    const l = this.w.liga[c];
    if (l < 0) return 0;
    const L = this.w.ligas[l];
    const p = partesTV(L.regras);
    const total = L.regras.tv.total_eur ?? 0;
    let somaRep = 0;
    for (const x of L.clubes) somaRep += Math.pow(this.w.reputacao[x], TV.expoente_comercial);
    return (total * p.igual) / L.clubes.length + (total * p.comercial * Math.pow(this.w.reputacao[c], TV.expoente_comercial)) / Math.max(1, somaRep);
  }

  /** Parte de desempenho para uma posição final. */
  tvDesempenho(regras: RegrasLiga, n: number, pos: number): number {
    const p = partesTV(regras);
    const total = (regras.tv.total_eur ?? 0) * p.desempenho;
    const k = razaoDesempenho(regras);
    const peso = (q: number) => 1 + ((k - 1) * (n - q)) / Math.max(1, n - 1);
    let soma = 0;
    for (let q = 1; q <= n; q++) soma += peso(q);
    return (total * peso(pos)) / soma;
  }

  /** Receita prevista de um clube (TV, bilheteira média, comercial; sem prémios). */
  estimarReceita(c: number): number {
    const w = this.w;
    const l = w.liga[c];
    if (l < 0) return this.clubes.patrocinio[c];
    const L = w.ligas[l];
    const ordem = [...L.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
    const pos = Math.max(1, ordem.indexOf(c) + 1);
    const jogosCasa = (L.clubes.length - 1) * L.regras.formato.voltas / 2 + 2;
    const tv = this.tvFixaPrevista(c) + this.tvDesempenho(L.regras, L.clubes.length, pos);
    const bilhete = jogosCasa * this.receitaJogo(c, -1, 'liga');
    return tv + bilhete + this.clubes.patrocinio[c] + this.clubes.paraquedas[c];
  }

  /** Receita de bilheteira de um jogo em casa (adversário −1 = médio). */
  receitaJogo(c: number, adv: number, tipo: 'liga' | 'taca' | 'continental' | 'playoff'): number {
    const w = this.w, s = this.clubes;
    const rep = w.reputacao[c];
    const ind = indiceRiqueza(w, c);
    let preco = B.preco_base * Math.pow(ind / 100, B.expoente_riqueza) * (B.piso_preco_reputacao + (1 - B.piso_preco_reputacao) * rep / 100);
    preco *= 1 + EI.estadio_preco * (this.nivel(c, 'estadio') - 5);
    let ocup = B.ocupacao.a + (B.ocupacao.b * rep) / 100 + B.ocupacao.fidelidade * (s.fidelidade[c] - 10) + B.forma * ((s.forma[c] || 1.4) - 1.4);
    if (adv >= 0) {
      ocup += B.rival * this.intensidadeRival(c, adv);
      if (w.reputacao[adv] > rep + 10) ocup += B.jogo_grande;
    }
    if (tipo === 'continental') { preco *= B.preco_continental; ocup += B.ocupacao_continental; }
    else if (tipo === 'taca') preco *= B.preco_taca;
    else if (tipo === 'playoff') { preco *= B.preco_playoff; ocup += B.ocupacao_continental; }
    return s.capacidade[c] * clamp(ocup, B.ocupacao.min, 1) * preco;
  }

  // ---------------------------------------------------------------- semana e mês

  semana(segunda: number, jogos: JogoR[]) {
    const w = this.w, s = this.clubes;
    this.garantir(w.clubes.length);
    for (let c = 0; c < s.n; c++) {
      if (w.liga[c] < 0) continue;
      const ind = indiceRiqueza(w, c);
      s.lancar(c, 'salarios', s.folha[c] / 52);
      s.lancar(c, 'staff', s.orcStaff[c] / 52);
      let manut = s.capacidade[c] * DP.manutencao_por_lugar * Math.pow(ind / 100, 0.3);
      const fc = factorCustoInfra(ind);
      TIPOS_INFRA.forEach((tipo, k) => { const t = INFRA[tipo]; manut += fc * t.manutencao * t.base * Math.pow(t.crescimento, s.infra[c * N_INFRA + k]); });
      s.lancar(c, 'manutencao', manut / 52);
      for (let k = 0; k < N_INFRA; k++) {
        const i = c * N_INFRA + k;
        if (!s.obraSemanal[i]) continue;
        s.lancar(c, 'obras', s.obraSemanal[i]);
        if (s.obraFim[i] <= segunda + 7) { // obra concluída
          s.obraSemanal[i] = 0;
          s.infra[i] = Math.min(10, s.infra[i] + 1);
          if (TIPOS_INFRA[k] === 'estadio') s.capacidade[c] = Math.round(s.capacidade[c] * (1 + EI.estadio_capacidade_por_obra));
        }
      }
      s.lancar(c, 'juros', (s.dividaBanco[c] * s.juroBanco[c]) / 52);
      this.receber(c, 'tv', this.tvFixa[c] / 52);
      this.receber(c, 'comercial', s.patrocinio[c] / 52);
      if (s.paraquedasAnos[c]) this.receber(c, 'tv', s.paraquedas[c] / 52);
    }
    for (const j of jogos) {
      if (!j.r) continue;
      const pc = j.r.gc > j.r.gf ? 3 : j.r.gc === j.r.gf ? 1 : 0;
      const pf = j.r.gf > j.r.gc ? 3 : j.r.gc === j.r.gf ? 1 : 0;
      s.forma[j.casa] = 0.8 * (s.forma[j.casa] || 1.4) + 0.2 * pc;
      s.forma[j.fora] = 0.8 * (s.forma[j.fora] || 1.4) + 0.2 * pf;
      if (j.neutro || w.liga[j.casa] < 0) continue;
      const tipo = CONTINENTAIS.has(j.comp) ? 'continental' : this.ligaIds.has(j.comp) ? 'liga' : j.comp.includes('PO') || j.comp.includes('BAR') ? 'playoff' : 'taca';
      this.receber(j.casa, 'bilheteira', this.receitaJogo(j.casa, j.fora, tipo));
    }
  }

  mes(dia: number) {
    const w = this.w, s = this.clubes;
    for (let c = 0; c < s.n; c++) {
      if (w.liga[c] < 0) continue;
      s.saude[c] = Math.max(s.saude[c] === 3 ? 3 : 0, this.calcularSaude(c));
      const tipo = this.controlador(c).obra(w, this, c, dia);
      if (tipo) {
        const k = TIPOS_INFRA.indexOf(tipo);
        const { custo, semanas } = custoObra(tipo, s.infra[c * N_INFRA + k], indiceRiqueza(w, c));
        s.obraFim[c * N_INFRA + k] = dia + semanas * 7;
        s.obraSemanal[c * N_INFRA + k] = custo / semanas;
      }
      gerirMes(this, c, dia);
    }
  }

  /** Despesa anual estimada (salários, staff, manutenção, juros). */
  despesaAnual(c: number): number {
    const s = this.clubes;
    return s.folha[c] + s.orcStaff[c] + s.dividaBanco[c] * s.juroBanco[c] + s.capacidade[c] * DP.manutencao_por_lugar;
  }

  calcularSaude(c: number): number {
    const s = this.clubes;
    const receita = Math.max(1, s.receitaPrevista[c]);
    const div = s.divida(c);
    if (s.caixa[c] < 0 || div > SA.crise_divida * receita) return 2;
    if (s.caixa[c] < (SA.apertado_meses * this.despesaAnual(c)) / 12 || div > SA.apertado_divida * receita) return 1;
    return 0;
  }

  // ---------------------------------------------------------------- contratos (chamado na passagem de época, antes da reposição)

  renovarContratos(t: Temporada, dia: number) {
    const w = this.w, st = w.jogadores;
    if (!st) return;
    // Acabam os contratos que terminam antes do início da época seguinte (a época fecha no fim de Junho / Dezembro).
    const limite = dia + 45;
    const s = this.clubes;
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
      const ind = indiceRiqueza(w, c);
      const plantel = w.plantel[c].filter((j) => st.clube[j] === c);
      const ordem = [...plantel].sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
      let folha = 0;
      for (const j of plantel) if (st.fimContrato[j] > limite) folha += st.salario[j];
      let tamanho = plantel.length;
      for (const j of ordem) {
        if (st.fimContrato[j] > limite) continue;
        const sal = salarioMercado(st, j, ind, dia, this.escala(c));
        const ok = this.controlador(c).renovar(w, this, c, { jogador: j, salario: sal, ordem: ordem.indexOf(j), tamanhoPlantel: tamanho, idade: st.idade(j, dia) }, folha);
        if (ok) {
          st.salario[j] = sal;
          st.fimContrato[j] = fimDeEpoca(w, c, limite, Rng.de(w.semente, 'renovacao', st.ids[j], dia).int(K.anos_renovacao[0], K.anos_renovacao[1]));
          folha += sal;
        } else {
          st.clube[j] = -3; // livre
          st.salario[j] = 0;
          this.livres.push(j);
          tamanho--;
        }
      }
      w.plantel[c] = w.plantel[c].filter((j) => st.clube[j] === c);
      s.folha[c] = folha;
    }
  }

  // ---------------------------------------------------------------- fecho e abertura de época

  fecharEpoca(t: Temporada, reg: RegistoEpoca) {
    const w = this.w, s = this.clubes;
    this.garantir(w.clubes.length);
    // TV por posição (e prémios de liga, se a folha os tiver).
    for (const [id, tab] of Object.entries(reg.tabelas)) {
      const L = w.ligaPorId(id);
      tab.forEach((linha, i) => {
        this.receber(linha.clube, 'tv', this.tvDesempenho(L.regras, tab.length, i + 1));
        const pr = L.regras.premios?.find((x) => x.posicao === i + 1);
        if (pr) this.receber(linha.clube, 'premios', pr.valor_eur);
      });
    }
    // Taças: prémio por ronda alcançada (cumulativo), contando do fim da tabela (finalista = final, campeão à parte).
    for (const [id, tc] of t.tacas) {
      const premios = tc.regras.premios ?? [];
      if (!premios.length) continue;
      const ronda = new Map<number, Set<number>>();
      let R = 0;
      for (const j of t.jogos) if (j.comp === id) {
        R = Math.max(R, j.ronda);
        for (const c of [j.casa, j.fora]) { if (!ronda.has(c)) ronda.set(c, new Set()); ronda.get(c)!.add(j.ronda); }
      }
      const P = premios.length;
      for (const [c, rs] of ronda) {
        let v = 0;
        for (const r of rs) { const i = P - 2 - (R - r); if (i >= 0) v += premios[i].por_equipa_eur ?? 0; }
        if (reg.tacas[id]?.vencedor === c) v += premios[P - 1].por_equipa_eur ?? 0;
        this.receber(c, 'premios', v);
      }
    }
    // Continentais.
    for (const [id, rc] of Object.entries(reg.continentais)) this.premiosContinentais(id, rc, t);
    for (const [id, a] of Object.entries(reg.acesso)) {
      const base = id.replace('_PO', '');
      const pr = premiosDe(w, base).find((p) => p.fase.startsWith('Play-off de acesso'));
      if (pr?.por_equipa_eur) for (const c of a.participantes) this.receber(c, 'premios', pr.por_equipa_eur);
    }
    // Patrocínio: bónus de título; descida corta o contrato.
    const ano = t.ano;
    for (const c of Object.values(reg.campeoes)) this.receber(c, 'comercial', CM.bonus_titulo * s.patrocinio[c]);
    // Pára-quedas: avança um ano; os descidos das ligas com pára-quedas começam a receber.
    const descidos = new Map<number, string>();
    for (const m of reg.movimentos) if (m.via !== 'exterior' && this.ligaIds.has(m.de) && this.ligaIds.has(m.para) && w.ligaPorId(m.para).regras.nivel > w.ligaPorId(m.de).regras.nivel) descidos.set(m.clube, m.de);
    const subidos = new Set(reg.movimentos.filter((m) => this.ligaIds.has(m.de) && this.ligaIds.has(m.para) && w.ligaPorId(m.para).regras.nivel < w.ligaPorId(m.de).regras.nivel).map((m) => m.clube));
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
      if (subidos.has(c)) { s.paraquedasAnos[c] = 0; continue; }
      if (s.paraquedasAnos[c]) { s.paraquedasAnos[c]--; s.paraquedas[c] = s.paraquedasProx[c]; s.paraquedasProx[c] = 0; }
    }
    for (const [c, de] of descidos) {
      s.patrocinio[c] *= 1 - CM.malus_descida;
      // Cláusula de descida nos salários.
      const st = w.jogadores;
      if (st) { let f = 0; for (const j of w.plantel[c]) if (st.clube[j] === c) { st.salario[j] = Math.round(st.salario[j] * (1 - K.corte_descida)); f += st.salario[j]; } s.folha[c] = f; }
      const pct = TV.paraquedas[de];
      if (!pct) continue;
      const L = w.ligaPorId(de);
      const igual = ((L.regras.tv.total_eur ?? 0) * partesTV(L.regras).igual) / L.clubes.length;
      s.paraquedas[c] = pct[0] * igual;
      s.paraquedasProx[c] = (pct[1] ?? 0) * igual;
      s.paraquedasAnos[c] = pct.length;
    }
    // Balanço da época e histórico.
    const posicao = new Map<number, [string, number]>();
    for (const [id, tab] of Object.entries(reg.tabelas)) tab.forEach((l, i) => posicao.set(l.clube, [id, i + 1]));
    for (const [c] of posicao) if (c < s.n) this.fecharBalanco(c, ano, posicao.get(c));
    // Mercado salarial: a capacidade salarial de cada clube ajusta-se devagar à sua receita real (inflação/deflação limitada).
    const A = SALARIO.ajuste_anual;
    for (const [c] of posicao) {
      const b = s.balancos[c].at(-1);
      if (!b || b.massaSalarial <= 0 || b.receita <= 0) continue;
      const alvo = Math.min(SALARIO.alvo_massa_receita.nivel1, this.limiteFairPlay(c) - 0.05);
      s.escalaClube[c] = clamp((s.escalaClube[c] || 1) * clamp(Math.pow((alvo * b.receita) / b.massaSalarial, A.expoente), A.min, A.max), SALARIO.clube.min, SALARIO.clube.max);
    }
    // Patrocínios que acabam: renovam com a reputação actual.
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
      if (s.patrocinioFim[c] > ano) continue;
      const rng = Rng.de(w.semente, 'patrocinio', w.clubes[c].id, ano);
      s.patrocinio[c] = valorComercial(w.reputacao[c], indiceRiqueza(w, c), s.adeptos[c]) * Math.exp(rng.normal(0, CM.ruido_renovacao));
      s.patrocinioFim[c] = ano + rng.int(CM.anos[0], CM.anos[1]);
    }
    fecharEpocaFinancas(this, t, reg);
  }

  private premiosContinentais(id: string, rc: RegistoEpoca['continentais'][string], t: Temporada) {
    const premios = premiosDe(this.w, id);
    if (!premios.length) return;
    // Posição na fase de liga (UEFA) ou no grupo.
    const pos = new Map<number, number>();
    for (const g of rc.tabela) g.forEach((l, i) => pos.set(l.clube, i + 1));
    const n36 = rc.tabela.length === 1 ? rc.tabela[0].length : 0;
    // Vitórias e empates na fase de liga/grupos: os primeiros N jogos de cada clube.
    const vit = new Map<number, number>(), emp = new Map<number, number>(), cont = new Map<number, number>();
    const N = JOGOS_FASE[id] ?? 6;
    for (const j of t.jogos) if (j.comp === id && j.r) for (const [c, gm, gs] of [[j.casa, j.r.gc, j.r.gf], [j.fora, j.r.gf, j.r.gc]] as [number, number, number][]) {
      const k = cont.get(c) ?? 0;
      if (k >= N) continue;
      cont.set(c, k + 1);
      if (gm > gs) vit.set(c, (vit.get(c) ?? 0) + 1); else if (gm === gs) emp.set(c, (emp.get(c) ?? 0) + 1);
    }
    const val = (f: string) => premios.find((p) => p.fase.startsWith(f));
    const p1 = val('Fase de liga: posição final 1'), pU = premios.find((p) => /posição final \d+\.º \(último\)/.test(p.fase));
    for (const [cs, fase] of Object.entries(rc.fases)) {
      const c = Number(cs);
      const o = ORDEM_FASE[fase] ?? 0;
      const ps = pos.get(c) ?? 99;
      let v = 0;
      const add = (p?: Premio) => { if (p?.por_equipa_eur) v += p.por_equipa_eur; };
      add(val('Participação'));
      const bj = val('Fase de liga: bónus por jogo') ?? val('Fase de grupos: bónus por jogo');
      if (bj) v += (vit.get(c) ?? 0) * (bj.por_vitoria_eur ?? 0) + (emp.get(c) ?? 0) * (bj.por_empate_eur ?? 0);
      if (n36 && p1?.por_equipa_eur && pU?.por_equipa_eur && ps <= n36) v += p1.por_equipa_eur + ((pU.por_equipa_eur - p1.por_equipa_eur) * (ps - 1)) / Math.max(1, n36 - 1);
      if (n36) {
        if (ps <= 8) { add(val('Fase de liga: bónus top 8')); if (o >= 2) add(val('Entrada direta')); }
        else if (ps <= 16) add(val('Fase de liga: bónus 9.º–16.º'));
        if (ps > 8 && ps <= 24) { add(val('Play-off de eliminatórias')); if (o >= 2) add(val('Passar o play-off')); }
      } else {
        if (ps === 1) add(val('1.º do grupo'));
        if (ps === 2) add(val('2.º do grupo'));
      }
      if (o >= 3) add(val('Quartos'));
      if (o >= 4) add(val('Meias'));
      if (o >= 5) add(val('Finalista'));
      if (o >= 6) add(val('Campeão'));
      this.receber(c, 'premios', v);
    }
  }

  private fecharBalanco(c: number, ano: number, pos?: [string, number]) {
    const w = this.w, s = this.clubes;
    const receitas: Record<string, number> = {}, despesas: Record<string, number> = {};
    RECEITAS.forEach((r, k) => (receitas[r] = s.contas[c * N_RUB + k]));
    DESPESAS_R.forEach((r, k) => (despesas[r] = s.contas[c * N_RUB + RECEITAS.length + k]));
    const receita = s.receitaEpoca(c), despesa = s.despesaEpoca(c);
    const b: BalancoEpoca = {
      epoca: ano, liga: pos?.[0] ?? (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.id : 'exterior'), posicao: pos?.[1] ?? 0,
      receitas, despesas, receita, despesa, resultado: receita - despesa, massaSalarial: despesas.salarios, caixa: s.caixa[c], divida: s.divida(c), reputacao: w.reputacao[c],
    };
    const h = s.balancos[c];
    h.push(b);
    if (h.length > HISTORICO_CLUBE.anos) h.shift();
    s.registarReputacao(c, w.reputacao[c]);
    s.contas.fill(0, c * N_RUB, (c + 1) * N_RUB);
  }

  /** Abertura de época de um calendário: contratos dos novos, receita prevista, TV fixa, orçamentos. */
  abrirEpoca(t: Temporada) {
    const w = this.w, s = this.clubes;
    this.garantir(w.clubes.length);
    const dia = t.base;
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
      if (w.jogadores) s.folha[c] = garantirContratos(w, c, dia, Rng.de(w.semente, 'contratos', w.clubes[c].id, t.ano), true, this.escala(c));
      // Receita prevista: metade da última época (sem prémios), metade da estimativa pela fórmula.
      const ult = s.balancos[c][s.balancos[c].length - 1];
      const est = this.estimarReceita(c);
      s.receitaPrevista[c] = ult ? 0.5 * (ult.receita - (ult.receitas.premios ?? 0)) + 0.5 * est : est;
      this.tvFixa[c] = this.tvFixaPrevista(c);
    }
    abrirEpocaFinancas(this, t);
    for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) this.definirOrcamentos(c);
  }

  massaSalarialReal(c: number): number {
    return this.w.jogadores ? massaSalarial(this.w, c) : 0;
  }

  bytes(): number {
    return this.clubes.bytes() + this.tvFixa.byteLength;
  }
}

export function limiteFairPlayLiga(r: RegrasLiga): number {
  const t = typeof r.tecto_salarial === 'string' ? r.tecto_salarial : '';
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return Number(m[1].replace(',', '.')) / 100;
  return r.fair_play?.massa_salarial_max_receita ?? FAIR_PLAY.padrao;
}

export function partesTV(r: RegrasLiga): { igual: number; desempenho: number; comercial: number } {
  const igual = r.tv.pct_igual ?? 0, desempenho = r.tv.pct_desempenho ?? 0, comercial = r.tv.pct_comercial ?? 0;
  const s = igual + desempenho + comercial;
  return { igual: igual + Math.max(0, 1 - s), desempenho, comercial };
}

/** "linear: 1º recebe 5x o último" → 5. */
export function razaoDesempenho(r: RegrasLiga): number {
  const m = (r.tv.regra_desempenho ?? '').match(/(\d+(?:[.,]\d+)?)\s*x/);
  return m ? Number(m[1].replace(',', '.')) : 2;
}

export function valorComercial(rep: number, indice: number, adeptos: number): number {
  return Math.max(CM.minimo, CM.referencia * Math.pow(indice / 100, CM.expoente_riqueza) * Math.pow(rep / 100, CM.expoente_reputacao) * (0.75 + 0.25 * Math.min(1, adeptos / CM.adeptos_referencia)));
}

function premiosDe(w: World, id: string): Premio[] {
  return ((w.continental?.competicoes.find((c) => c.id === id) as { premios?: Premio[] } | undefined)?.premios) ?? [];
}

function epocaDoClube(w: World, c: number): number {
  const l = w.liga[c];
  return l >= 0 ? w.epocaPorGrupo[w.ligas[l].regras.epoca.calendario] ?? w.epoca : w.epoca;
}

function diaReferencia(w: World): number {
  return Math.floor(Date.UTC(w.epoca, 7, 1) / 86400000);
}
