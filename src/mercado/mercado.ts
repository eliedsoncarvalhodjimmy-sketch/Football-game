// Mercado de transferências (Prompt 4, Bloco A). Substitui a renovação automática, a lista de livres sem uso e
// a venda forçada do Prompt 3. Negócios em rondas ao longo de dias: oferta → resposta (aceita, recusa, contra-proposta)
// → termos pessoais → exames → registo; rivais e leilão; falhas por rival, lesão, orçamento ou falta de tempo.
// A IA nunca percorre todos os jogadores: usa índices por grupo de posições (ordenados por OVR), listados, livres e
// contratos a acabar, e escolhe de amostras curtas. (O nevoeiro de informação chega no Bloco B.)
import { Rng } from '../core/rng.ts';
import { CONTRATO, EMPRESTIMOS, ESTATUTOS, type Estatuto } from '../config/contratosJogador.ts';
import { CLAUSULAS as CL } from '../config/clausulas.ts';
import { NEGOCIACAO as N, JANELAS_ANO_CIVIL, INSCRICAO, IA_MERCADO as IA, PLANO_PLANTEL } from '../config/negociacao.ts';
import { PlanosPlantel, type Necessidade } from './planoPlantel.ts';
import { IDX_POS, FAMILIARIDADE, POSICOES as POS_NOMES } from '../config/papeis.ts';
import { CONFEDERACAO_PAIS } from '../config/paises.ts';
import { VALOR } from '../config/valor.ts';
import { Contratos } from './contratos.ts';
import { Scouting } from '../scouting/conhecimento.ts';
import { PROMOCAO } from '../config/academia.ts';
import { CONHECIMENTO, PREMIO_SALARIAL_DONO } from '../config/scouting.ts';
import type { JogoR } from '../engine/competitions/base.ts';
import { valorMercado, precoPedido, grupoPos } from './valor.ts';
import { aceita, salarioPedido, actualizarDescontentamento, pontuarProposta } from './decisaoJogador.ts';
import { salarioMercado, indiceRiqueza, fimDeEpoca } from '../economia/contratos.ts';
import type { World } from '../engine/world.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import type { MercadoUtilizador, TermosUtilizador } from './mercadoUtilizador.ts';
import { NEG_CLUBE } from '../config/negociacaoUtilizador.ts';
import { Direitos, planearDireitos } from './direitos.ts';
import { DIREITOS } from '../config/contratosJogador.ts';
import { LIVRES_INICIAIS } from '../config/mundo.ts';
import { gerarJogador, ovrAlvoClube } from '../players/gerador.ts';
import type { POSICOES as POSICOES_J } from '../config/papeis.ts';

export type TipoNegocio = 'transferencia' | 'livre' | 'emprestimo' | 'clausula' | 'pre_contrato' | 'formacao';
export type EstadoNegocio = 'oferta' | 'recompra' | 'termos' | 'exames' | 'registo' | 'concluido' | 'falhou';

export interface Negocio {
  id: number;
  tipo: TipoNegocio;
  jogador: number;
  vendedor: number; // −1 = livre
  comprador: number;
  estado: EstadoNegocio;
  oferta: number;
  pedido: number;
  maximo: number;
  salario: number;
  estatuto: Estatuto;
  dia: number;
  inicio: number;
  rondas: { dia: number; texto: string }[];
  /** Respostas do vendedor até agora; última contra-proposta. */
  respostas?: number;
  contra?: number;
  motivo?: string;
  /** Empréstimo: fracção do salário paga pelo clube que recebe, opção/obrigação de compra. */
  emprestimo?: { salario: number; opcao: number; obrigacao: boolean };
  /** Negócio fechado pelo utilizador (Prompt 5): os termos que ele acordou substituem os sorteados. */
  util?: TermosUtilizador;
  /** Oferta por um jogador do utilizador à espera da resposta dele. */
  aguardaUtilizador?: boolean;
  /** Direitos que o vendedor (IA) pede nesta venda (Prompt 6): % de venda futura e múltiplo de recompra (0 = nenhum). */
  direitosPlano?: { vendaFutura: number; recompra: number; anosRecompra: number };
  /** O vendedor aceitou, mas um clube tem a recompra: espera a decisão dele até este dia. */
  recompraAte?: number;
  /** Negócio criado pelo exercício de uma recompra. */
  deRecompra?: boolean;
  /** Onde retoma se o titular não exercer a recompra (termos pessoais, ou concluir já: opção de compra de empréstimo). */
  depoisRecompra?: 'termos' | 'concluir';
}

export interface Parcela { pagador: number; recebedor: number; valor: number; dia: number }

const GRUPOS = ['GR', 'DEF', 'MED', 'AVA'] as const;
/** Plantel mínimo (Prompt 3): o vendedor não vende abaixo disto. */
const K_MIN = 22;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const data = (d: number) => new Date(d * 864e5).toISOString().slice(0, 10);
const M = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)} M€` : `${Math.round(x / 1e3)} mil €`);

export class Mercado {
  contratos = new Contratos();
  /** Direitos futuros (venda futura, recompra): uma estrutura e uma liquidação (Prompt 6, Bloco A). */
  direitos: Direitos;
  /** Plano de plantel por clube (Prompt 6, Bloco B): necessidades, excedentes, insubstituíveis. */
  planos: PlanosPlantel;
  /** Posições reforçadas por clube na janela em curso (para os pedidos do treinador). */
  reforcosJanela = new Map<number, string[]>();
  negocios: Negocio[] = [];
  concluidos: Negocio[] = [];
  parcelas: Parcela[] = [];
  /** Índices: jogadores contratados por grupo, ordenados por OVR (reconstruídos todos os meses). */
  private porGrupo = new Map<string, Int32Array>();
  private ovrGrupo = new Map<string, Uint8Array>();
  /** Livres por grupo. */
  livres = new Map<string, number[]>();
  /** Gasto e vendas na janela por clube. */
  private gastoJanela = new Map<number, number>();
  private vendasJanela = new Map<number, number>();
  private seq = 0;
  /** Registo compacto dos negócios fechados (relatórios e calibração). */
  registo: { dia: number; tipo: TipoNegocio; jogador: number; de: number; para: number; fee: number; valor: number; idade: number; ovr: number }[] = [];
  /** Contadores (relatórios e testes). */
  estat = { transferencias: 0, livres: 0, emprestimos: 0, clausulas: 0, preContratos: 0, renovacoes: 0, falhados: 0, faltaTempo: 0, renovSemFolga: 0, renovRecusadas: 0, expirados: 0, rescisoes: 0 };

  /** Nevoeiro de informação e scouting (Bloco B). */
  scouting: Scouting;
  /** Listados para venda por grupo (propostas dos agentes) e jovens emprestáveis dos clubes grandes. */
  private listados = new Map<string, number[]>();
  private emprestaveis = new Map<string, number[]>();
  private ordem = new Map<number, number>();
  private hoje = 0;
  /** Mercado do clube do utilizador (Prompt 5): negociações, ofertas recebidas, shortlist. */
  util: MercadoUtilizador | null = null;

  constructor(public w: World, clausulasCsv: Record<string, string>[] = []) {
    const st = w.jogadores!;
    this.scouting = new Scouting(w);
    this.direitos = new Direitos(w);
    this.planos = new PlanosPlantel(w, this);
    this.contratos.garantir(st.cap);
    for (const g of GRUPOS) this.livres.set(g, []);
    const dia = Math.floor(Date.UTC(w.epoca, 6, 1) / 864e5);
    const csv = new Map(clausulasCsv.map((l) => [l.jogador, Number(l.valor)]));
    // Contratos iniciais: estatuto pela ordem no plantel, bónus, chegada, formação, cláusulas.
    for (let c = 0; c < w.clubes.length; c++) {
      const rng = Rng.de(w.semente, 'contratos-iniciais', w.clubes[c].id);
      const pl = (w.plantel[c] ?? []).filter((j) => st.clube[j] === c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
      pl.forEach((j, i) => {
        this.definirEstatuto(j, i, dia);
        this.bonus(j);
        this.contratos.chegada[j] = dia - rng.int(0, 6) * 365;
        if (st.paises[st.pais[j]] === w.clubes[c].pais && rng.chance(0.25)) this.contratos.formadoClube[j] = c;
      });
      for (const j of pl) {
        const v = csv.get(st.ids[j]);
        if (v) { this.contratos.clausula[j] = v; this.contratos.clausulaDesde[j] = dia; }
      }
      for (const j of pl) if (!this.contratos.clausula[j]) this.talvezClausula(j, c, dia, rng);
    }
    this.gerarLivresIniciais(dia);
    for (const j of w.economia?.livres ?? []) this.tornarLivre(j, dia);
    this.reindexar();
  }

  /** Jogadores livres no início do mundo (LIVRES_INICIAIS): por liga, perto do nível dos clubes mais fracos dela. */
  private gerarLivresIniciais(dia: number) {
    const w = this.w, st = w.jogadores!, e = w.economia;
    if (!e) return;
    const L = LIVRES_INICIAIS;
    const pos = Object.entries(L.posicoes);
    const tot = pos.reduce((a, [, p]) => a + p, 0);
    w.ligas.forEach((liga) => {
      if (!liga.clubes.length) return;
      const rng = Rng.de(w.semente, 'livres-iniciais', liga.regras.id);
      const base = Math.min(...liga.clubes.map((c) => ovrAlvoClube(w, c)));
      const pais = w.clubes[liga.clubes[0]].pais;
      const n = Math.round(liga.clubes.length * L.por_clube);
      for (let k = 0; k < n; k++) {
        let u = rng.next() * tot;
        const p = (pos.find(([, x]) => (u -= x) < 0) ?? pos[0])[0] as (typeof POSICOES_J)[number];
        const idade = rng.int(L.idade[0], L.idade[1]) + rng.next();
        const ovr = Math.max(35, Math.round(base - rng.int(L.desconto[0], L.desconto[1])));
        const j = gerarJogador(st, rng, { id: `livre_${liga.regras.id}_${k}`, pais, pos: p, idade, dia, ovr, potencial: Math.max(ovr, Math.round(ovr + Math.max(0, 26 - idade) * 1.5)), clube: -3 });
        const c = liga.clubes[liga.clubes.length - 1];
        this.contratos.salarioAnterior.set(j, Math.round(this.salarioMercado(j, c, dia) / 1000) * 1000);
        this.contratos.garantir(st.cap);
        this.tornarLivre(j, dia);
        this.contratos.livreDesde[j] = dia - rng.int(L.meses_livre[0], L.meses_livre[1]) * 30;
      }
    });
  }

  // ---------------------------------------------------------------- utilidades

  private grupo(j: number) { return grupoPos(this.w.jogadores!.posNat[j]); }

  plantel(c: number): number[] {
    const st = this.w.jogadores!;
    return (this.w.plantel[c] ?? []).filter((j) => st.clube[j] === c);
  }

  /** Salário de mercado do jogador no clube c (escala da liga e do clube, inflação). */
  salarioMercado(j: number, c: number, dia: number): number {
    const e = this.w.economia!;
    return salarioMercado(this.w.jogadores!, j, indiceRiqueza(this.w, c), dia, e.escala(c)) * e.inflacao;
  }

  definirEstatuto(j: number, ordem: number, dia: number) {
    const st = this.w.jogadores!;
    const idade = st.idade(j, dia);
    const est: Estatuto = ordem < 11 ? 'titular' : ordem < 18 ? 'rotacao' : idade <= 21 ? 'promessa' : 'suplente';
    this.contratos.estatuto[j] = ESTATUTOS.indexOf(est);
  }

  bonus(j: number) {
    const s = this.w.jogadores!.salario[j];
    const k = this.contratos;
    k.bonusJogo[j] = Math.round(s * CONTRATO.bonus_jogo);
    k.bonusGolo[j] = Math.round(s * CONTRATO.bonus_golo);
    k.bonusAssist[j] = Math.round(s * CONTRATO.bonus_assistencia);
    k.bonusTitulo[j] = Math.round(s * CONTRATO.bonus_titulo);
  }

  /** Janela de transferências aberta para a liga do clube no dia? */
  janelaAberta(c: number, dia: number): boolean {
    const l = this.w.liga[c];
    if (l < 0) return true;
    const r = this.w.ligas[l].regras;
    const jan = r.epoca.calendario === 'ano_civil' ? JANELAS_ANO_CIVIL : r.janelas_transferencias;
    const d = new Date(dia * 864e5);
    const md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    for (const x of jan) {
      const [am, ad] = x.abre.split('-').map(Number), [fm, fdd] = x.fecha.split('-').map(Number);
      const a = am * 100 + ad, f = fm * 100 + fdd;
      if (a <= f ? md >= a && md <= f : md >= a || md <= f) return true;
    }
    return false;
  }

  /** Último dia da janela aberta (ou o dia, se fechada). */
  fimJanela(c: number, dia: number): number {
    const k = this.w.liga[c] * 100000 + dia, x = this.cacheFimJanela.get(k);
    if (x !== undefined) return x;
    let d = dia;
    while (this.janelaAberta(c, d + 1) && d - dia < 120) d++;
    if (this.cacheFimJanela.size > 5000) this.cacheFimJanela.clear();
    this.cacheFimJanela.set(k, d);
    return d;
  }
  private cacheFimJanela = new Map<number, number>();

  /** Cláusula de rescisão, conforme o costume da liga, o poder do jogador e o arquétipo; limite por plantel. */
  talvezClausula(j: number, c: number, dia: number, rng: Rng) {
    const w = this.w, st = w.jogadores!;
    const l = w.liga[c];
    const id = l >= 0 ? w.ligas[l].regras.id : '';
    const universal = CL.ligas_universal.includes(id), comum = CL.ligas_comum.includes(id);
    let p = universal ? CL.costume.universal : comum ? CL.costume.comum : CL.costume.rara;
    const nivel = 35 + 0.6 * w.reputacao[c];
    p += Math.max(0, CL.poder_jovem * (st.pot[j] - nivel) / 10) * (st.idade(j, dia) <= 21 ? 1 : 0);
    p += CL.arquetipo[w.economia?.ia?.arquetipo[c] ?? ''] ?? 0;
    if (!universal) {
      const max = comum ? CL.maximo_tradicao : CL.maximo_plantel;
      const com = this.plantel(c).filter((x) => this.contratos.clausula[x] > 0).length;
      if (com >= max) return;
    }
    if (!rng.chance(Math.min(1, p))) return;
    const jovem = st.idade(j, dia) <= 21 ? clamp((st.pot[j] - st.ovrNat(j)) / 20, 0, 1) : 0;
    const mult = CL.multiplo[0] + (CL.multiplo[1] - CL.multiplo[0]) * (0.3 * rng.next() + 0.7 * jovem);
    this.contratos.clausula[j] = Math.round((valorMercado(w, j, dia, w.economia!.inflacao) * mult) / 100000) * 100000;
    this.contratos.clausulaDesde[j] = dia;
  }

  tornarLivre(j: number, dia: number) {
    const st = this.w.jogadores!;
    st.clube[j] = -3;
    if (st.salario[j] > 0) this.contratos.salarioAnterior.set(j, st.salario[j]);
    st.salario[j] = 0;
    this.contratos.livreDesde[j] = dia;
    this.contratos.clausula[j] = 0;
    this.contratos.listado[j] = 0;
    this.contratos.preContrato[j] = -1;
    this.contratos.emprestimo.delete(j);
    this.livres.get(this.grupo(j))!.push(j);
  }

  /** Massa salarial do clube, com os empréstimos (o receptor paga a sua parte; o dono o resto). */
  recalcularFolha(c: number) {
    const w = this.w, st = w.jogadores!, e = w.economia!;
    let f = 0;
    for (const j of this.plantel(c)) { const em = this.contratos.emprestimo.get(j); f += st.salario[j] * (em ? em.salarioReceptor : 1); }
    for (const [j, em] of this.contratos.emprestimo) if (em.dono === c) f += st.salario[j] * (1 - em.salarioReceptor);
    e.clubes.folha[c] = f;
  }

  /** Reconstrói os índices por grupo (contratados em clubes em jogo, ordenados por OVR). */
  reindexar(dia = this.hoje) {
    const w = this.w, st = w.jogadores!;
    this.hoje = dia;
    const por = new Map<string, number[]>(GRUPOS.map((g) => [g, []]));
    this.ordem.clear();
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0) this.plantel(c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).forEach((j, i) => { por.get(this.grupo(j))!.push(j); this.ordem.set(j, i); });
    for (const g of GRUPOS) {
      const a = por.get(g)!.sort((x, y) => st.ovrNat(x) - st.ovrNat(y));
      this.porGrupo.set(g, Int32Array.from(a));
      this.ovrGrupo.set(g, Uint8Array.from(a, (j) => st.ovrNat(j)));
      this.livres.set(g, this.livres.get(g)!.filter((j) => st.clube[j] === -3));
      this.listados.set(g, a.filter((j) => this.contratos.listado[j] > 0));
      // Emprestáveis: jovens (≤ 21) de clubes grandes sem lugar no plano de plantel (antes do 1.º plano: fora dos 18 primeiros).
      // Mais os excedentes do plano (até 27 anos), de qualquer clube: emprestar vem antes de rescindir.
      this.emprestaveis.set(g, a.filter((j) => { const c = st.clube[j]; if (this.contratos.emprestimo.has(j)) return false; const id = st.idade(j, this.hoje); if (id <= PLANO_PLANTEL.excedente_emprestar_idade && this.planos.excedente(c, j)) return true; const plano = this.planos.porClube.get(c); if (plano?.emprestar.includes(j)) return id <= EMPRESTIMOS.idade_maxima; return w.reputacao[c] >= EMPRESTIMOS.emprestador_reputacao && id <= EMPRESTIMOS.idade_maxima && !plano && (this.ordem.get(j) ?? 0) >= 18; }));
    }
  }

  /** Listados para venda e emprestáveis (todos os grupos), para a interface do Mercado. */
  /** (Calculados na hora: os índices só se refazem uma vez por mês.) */
  todosListados(): number[] { const st = this.w.jogadores!; return GRUPOS.flatMap((g) => [...(this.porGrupo.get(g) ?? [])]).filter((j) => st.clube[j] >= 0 && this.contratos.listado[j] > 0); }
  todosEmprestaveis(dia: number): number[] {
    const w = this.w, st = w.jogadores!;
    const out: number[] = [];
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0 || w.reputacao[c] < EMPRESTIMOS.emprestador_reputacao) continue;
      this.plantel(c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).forEach((j, i) => { if (i >= 18 && st.idade(j, dia) <= EMPRESTIMOS.idade_maxima && !this.contratos.emprestimo.has(j)) out.push(j); });
    }
    return out;
  }
  todosLivres(): number[] { return GRUPOS.flatMap((g) => this.livres.get(g) ?? []); }

  /** Amostra de até n jogadores do grupo com OVR em [a, b] (pesquisa binária no índice). */
  amostra(g: string, a: number, b: number, n: number, rng: Rng): number[] {
    const ovr = this.ovrGrupo.get(g)!, idx = this.porGrupo.get(g)!;
    const lo = (v: number) => { let l = 0, h = ovr.length; while (l < h) { const m = (l + h) >> 1; if (ovr[m] < v) l = m + 1; else h = m; } return l; };
    const i0 = lo(a), i1 = lo(b + 1);
    const out: number[] = [];
    if (i1 <= i0) return out;
    for (let k = 0; k < n; k++) out.push(idx[i0 + rng.int(0, i1 - i0 - 1)]);
    return [...new Set(out)];
  }

  /** Um livre conta como conhecido se o clube o conhece ou se os agentes já o divulgaram (livre há 2+ semanas, mesma confederação). */
  private livreConhecido(c: number, j: number, dia: number): boolean {
    if (this.scouting.nivel(c, j, dia) >= CONHECIMENTO.minimo_alvo) return true;
    const st = this.w.jogadores!;
    return dia - this.contratos.livreDesde[j] >= 14 && CONFEDERACAO_PAIS[st.paises[st.pais[j]]] === CONFEDERACAO_PAIS[this.w.clubes[c].pais];
  }

  /** Amostra de livres do grupo (a lista pode ser longa): até n, ao acaso. */
  private amostraLivres(g: string, n: number, rng: Rng): number[] {
    const a = this.livres.get(g) ?? [];
    if (a.length <= n) return a;
    const out: number[] = [];
    for (let k = 0; k < n; k++) out.push(a[rng.int(0, a.length - 1)]);
    return out;
  }

  /** Alvos do clube: só jogadores que conhece (scouts, jogos, propostas), avaliados pela estimativa (nevoeiro). */
  alvos(c: number, g: string, a: number, b: number, i0: number, i1: number, dia: number, rng: Rng): { j: number; est: number }[] {
    const w = this.w, st = w.jogadores!, sc = this.scouting;
    const out: { j: number; est: number }[] = [];
    for (const j of sc.conhecidos(c)) {
      const d = st.clube[j];
      if (d < 0 || d === c || w.liga[d] < 0 || this.grupo(j) !== g || this.contratos.emprestimo.has(j)) continue;
      const id = st.idade(j, dia);
      if (id < i0 || id > i1) continue;
      if (sc.nivel(c, j, dia) < CONHECIMENTO.minimo_alvo) continue;
      const est = sc.estimarOVR(c, j, dia).estimado;
      if (est >= a && est <= b) out.push({ j, est });
    }
    for (let k = out.length - 1; k > 0; k--) { const r = rng.int(0, k); [out[k], out[r]] = [out[r], out[k]]; }
    return out.slice(0, IA.candidatos);
  }

  /** Agentes propõem jogadores listados (e livres) ao clube: o clube passa a conhecê-los. */
  private propostasAgentes(c: number, g: string, dia: number, rng: Rng) {
    const sc = this.scouting;
    for (const fonte of [this.listados.get(g) ?? [], this.livres.get(g) ?? [], this.emprestaveis.get(g) ?? []]) {
      for (let k = 0; k < 2 && fonte.length; k++) sc.conhecer(c, fonte[rng.int(0, fonte.length - 1)], CONHECIMENTO.ganho_proposta, dia);
    }
  }

  // ---------------------------------------------------------------- inscrições

  nacional(j: number, c: number): boolean {
    const st = this.w.jogadores!;
    return st.paises[st.pais[j]] === this.w.clubes[c].pais;
  }

  estrangeiro(j: number, c: number): boolean {
    const st = this.w.jogadores!;
    const l = this.w.liga[c];
    const conf = l >= 0 ? this.w.pacotes.find((p) => p.ligas.includes(l))?.manifest.confederacao : undefined;
    return !!conf && CONFEDERACAO_PAIS[st.paises[st.pais[j]]] !== conf;
  }

  /** Pode o clube inscrever o jogador? (tamanho do plantel, mínimo de nacionais, máximo de estrangeiros) */
  podeInscrever(j: number, c: number): string | null {
    const w = this.w;
    const l = w.liga[c];
    if (l < 0) return null;
    const r = w.ligas[l].regras;
    const pl = this.plantel(c);
    const max = r.plantel?.max ?? 35;
    if (pl.length + 1 > max) return `plantel cheio (${max})`;
    const minNac = INSCRICAO.minimo_nacionais[r.id] ?? 0;
    if (minNac && !this.nacional(j, c)) {
      const nac = pl.filter((x) => this.nacional(x, c)).length;
      if (max - (pl.length + 1) < minNac - nac) return `faltam nacionais (mínimo ${minNac})`;
    }
    const maxEst = INSCRICAO.maximo_estrangeiros[r.id];
    if (maxEst !== undefined && this.estrangeiro(j, c) && pl.filter((x) => this.estrangeiro(x, c)).length + 1 > maxEst) return `máximo de estrangeiros (${maxEst})`;
    return null;
  }

  // ---------------------------------------------------------------- negociação

  abrir(tipo: TipoNegocio, j: number, comprador: number, dia: number, oferta: number, maximo: number, rng: Rng): Negocio | null {
    const st = this.w.jogadores!;
    if (this.negocios.some((n) => n.jogador === j && n.comprador === comprador)) return null;
    const vend = tipo === 'livre' ? -1 : st.clube[j];
    const n: Negocio = {
      id: ++this.seq, tipo, jogador: j, vendedor: vend, comprador, estado: tipo === 'livre' || tipo === 'pre_contrato' ? 'termos' : 'oferta',
      oferta, pedido: 0, maximo, salario: 0, estatuto: 'rotacao', dia, inicio: dia, rondas: [],
    };
    const nome = st.nomes[j], cn = this.w.clubes[comprador].nome;
    const tx = tipo === 'livre' ? `${cn} aborda ${nome} (livre)` : tipo === 'pre_contrato' ? `${cn} propõe um pré-contrato a ${nome}` : tipo === 'clausula' ? `${cn} paga a cláusula de rescisão de ${nome} (${M(oferta)})` : tipo === 'emprestimo' ? `${cn} pede ${nome} emprestado ao ${this.w.clubes[vend].nome}` : `${cn} oferece ${M(oferta)} ao ${this.w.clubes[vend].nome} por ${nome}`;
    n.rondas.push({ dia, texto: tx });
    if (tipo === 'clausula') { n.estado = 'termos'; this.notificarRecompra(n, 'termos'); }
    this.negocios.push(n);
    void rng;
    return n;
  }

  /** Interessados activos no jogador (leilão). */
  interessados(j: number): Negocio[] {
    return this.negocios.filter((n) => n.jogador === j && n.estado !== 'falhou' && n.estado !== 'concluido' && n.tipo !== 'pre_contrato');
  }

  /** Avança um negócio uma ronda. */
  ronda(n: Negocio, rng: Rng) {
    const w = this.w, st = w.jogadores!, e = w.economia!;
    const cn = w.clubes[n.comprador].nome;
    const rival = this.interessados(n.jogador);
    if (n.estado === 'oferta') {
      if (n.tipo === 'emprestimo' && this.plantel(n.vendedor).length <= K_MIN) return this.falhar(n, `${w.clubes[n.vendedor].nome} não empresta: plantel no mínimo`);
      if (n.tipo === 'emprestimo' && this.util && n.vendedor === this.util.clube) {
        const r = this.util.respostaOferta(n);
        if (r === 'aguarda') { n.aguardaUtilizador = true; return; }
        if (r !== 'aceitar') return this.falhar(n, r === 'expirou' ? `${w.clubes[n.vendedor].nome} não respondeu ao pedido de empréstimo` : `${w.clubes[n.vendedor].nome} recusa emprestar`);
      }
      if (n.tipo === 'emprestimo') { n.estado = 'termos'; n.rondas.push({ dia: n.dia, texto: `${w.clubes[n.vendedor].nome} aceita emprestar` }); return; }
      if (st.clube[n.jogador] !== n.vendedor) return this.falhar(n, 'o jogador já saiu do clube');
      // O vendedor não fica abaixo do plantel mínimo (excepto na venda forçada).
      if (this.contratos.listado[n.jogador] !== 3 && this.plantel(n.vendedor).length <= K_MIN) return this.falhar(n, `${w.clubes[n.vendedor].nome} não vende: plantel no mínimo`);
      // Nem abaixo do mínimo absoluto do grupo de posições (Bloco C).
      { const g = this.grupo(n.jogador); if (this.contratos.listado[n.jogador] !== 3 && this.plantel(n.vendedor).filter((x) => this.grupo(x) === g).length <= PROMOCAO.minimos_posicao[g]) return this.falhar(n, `${w.clubes[n.vendedor].nome} não vende: fica sem ${g}`); }
      const pp = precoPedido(w, this, n.jogador, n.comprador, n.dia, rival.length);
      n.pedido = pp.preco;
      // Direitos futuros (Prompt 6): o vendedor (IA) pode pedir % de venda futura e/ou recompra; em troca aceita um
      // preço um pouco mais baixo (a mesma regra do mercado do utilizador: x por ponto percentual).
      const vendeUtil = !!this.util && n.vendedor === this.util.clube;
      if (!vendeUtil && n.tipo === 'transferencia') {
        n.direitosPlano ??= planearDireitos(w, this.contratos, this.direitos, n.jogador, n.vendedor, n.comprador, n.pedido, n.dia, `${w.semente}|dir|${n.id}`);
        if (n.direitosPlano.vendaFutura > 0) n.pedido = Math.round((n.pedido * (1 - 100 * n.direitosPlano.vendaFutura * NEG_CLUBE.venda_futura_por_ponto)) / 10000) * 10000;
        // Insubstituível no plano do vendedor (titular sem alternativa): só sai muito acima do valor (Bloco B).
        if (this.contratos.listado[n.jogador] !== 3 && this.planos.porClube.get(n.vendedor)?.insubstituiveis.has(n.jogador))
          n.pedido = Math.max(n.pedido, Math.round(valorMercado(w, n.jogador, n.dia, e.inflacao) * PLANO_PLANTEL.insubstituivel_multiplo / 10000) * 10000);
      }
      // Contra-proposta do vendedor igualada: aceita.
      let resp: 'aceitar' | 'recusar' | { contra: number };
      if (n.contra && n.oferta >= n.contra) resp = 'aceitar';
      else if (this.util && n.vendedor === this.util.clube) {
        // Jogador do utilizador: a oferta espera a resposta dele (Mercado → Ofertas).
        const r = this.util.respostaOferta(n);
        if (r === 'aguarda') { n.aguardaUtilizador = true; return; }
        n.aguardaUtilizador = false;
        if (r === 'expirou') return this.falhar(n, `${w.clubes[n.vendedor].nome} não respondeu à oferta`);
        if (r === 'recusar') return this.falhar(n, `${w.clubes[n.vendedor].nome} recusa vender`);
        resp = r;
      } else resp = e.controlador(n.vendedor).responderOferta?.(w, e, n.vendedor, { jogador: n.jogador, comprador: n.comprador, oferta: n.oferta, pedido: n.pedido }) ?? this.respostaIA(n);
      if (resp === 'aceitar') {
        // Leilão: com outros interessados, o preço sobe em lances de +5% até só sobrar quem pode pagar.
        const outros = rival.filter((x) => x !== n && x.estado === 'oferta');
        let ganha = n, preco = n.oferta;
        if (outros.length) {
          let ativos = [n, ...outros];
          for (let k = 0; k < 60 && ativos.filter((x) => x.maximo >= preco * 1.05).length >= 2; k++) {
            preco *= 1.05;
            ativos = ativos.filter((x) => x.maximo >= preco);
          }
          ganha = [n, ...outros].sort((a, b) => b.maximo - a.maximo)[0];
          ganha.oferta = Math.round(Math.max(ganha.oferta, Math.min(ganha.maximo, preco)) / 10000) * 10000;
          for (const x of [n, ...outros]) x.rondas.push({ dia: n.dia, texto: `leilão entre ${[n, ...outros].map((y) => w.clubes[y.comprador].nome).join(' e ')}: o preço sobe até ${M(ganha.oferta)}` });
        }
        ganha.rondas.push({ dia: n.dia, texto: `${w.clubes[n.vendedor].nome} aceita ${M(ganha.oferta)} do ${w.clubes[ganha.comprador].nome}` });
        ganha.estado = 'termos';
        // Recompra: o titular é notificado e tem alguns dias para a exercer ao preço fixo.
        this.notificarRecompra(ganha, 'termos');
        for (const x of [n, ...outros]) if (x !== ganha) this.falhar(x, `perdeu o leilão para o ${w.clubes[ganha.comprador].nome}`);
        return;
      }
      n.respostas = (n.respostas ?? 0) + 1;
      if (n.respostas > N.rondas_max) return this.falhar(n, 'negociação arrastada: o comprador desiste');
      // Recusa: o comprador aproxima-se do pedido (metade da distância, pelo menos +x%).
      if (resp === 'recusar') { n.rondas.push({ dia: n.dia, texto: `${w.clubes[n.vendedor].nome} recusa (pede ${M(n.pedido)})` }); return this.subir(n, Math.min(n.pedido, Math.max(n.oferta * (1 + N.subida), n.oferta + 0.5 * (n.pedido - n.oferta)))); }
      n.contra = resp.contra;
      n.rondas.push({ dia: n.dia, texto: `${w.clubes[n.vendedor].nome} faz contra-proposta: ${M(resp.contra)}` });
      return this.subir(n, resp.contra);
    }
    if (n.estado === 'recompra') return this.decidirRecompra(n, rng);
    if (n.estado === 'termos') {
      // Termos pessoais: o jogador decide (salário pedido no clube comprador, minutos pelo estatuto previsto).
      const ordem = this.plantel(n.comprador).filter((x) => st.ovrNat(x) > st.ovrNat(n.jogador)).length;
      n.estatuto = ordem < 11 ? 'titular' : ordem < 18 ? 'rotacao' : st.idade(n.jogador, n.dia) <= 21 ? 'promessa' : 'suplente';
      let sal = salarioPedido(w, n.jogador, this.salarioMercado(n.jogador, n.comprador, n.dia));
      if (n.tipo === 'livre') sal *= Math.max(CONTRATO.livre_minimo, 1 - CONTRATO.livre_desconto_mes * ((n.dia - this.contratos.livreDesde[n.jogador]) / 30));
      if (n.tipo === 'emprestimo') sal = st.salario[n.jogador];
      // Donos ricos e ambiciosos pagam acima do mercado para atrair reforços (pago com as injecções).
      const dn = e.donos[n.comprador];
      if (n.tipo !== 'emprestimo' && dn && PREMIO_SALARIAL_DONO[dn.tipo]) sal *= 1 + PREMIO_SALARIAL_DONO[dn.tipo] * Math.max(0, dn.atributos.ambicao - 10) / 10;
      n.salario = Math.round(sal / 1000) * 1000;
      const prop = { clube: n.comprador, salario: n.salario, minutos: CONTRATO.minutos_prometidos[n.estatuto] };
      if (n.tipo === 'emprestimo' || aceita(w, this, n.jogador, prop, n.dia, rng)) {
        n.rondas.push({ dia: n.dia, texto: `${st.nomes[n.jogador]} aceita os termos: ${M(n.salario)}/ano, ${n.estatuto}` });
        n.estado = n.tipo === 'pre_contrato' ? 'registo' : 'exames';
        return;
      }
      // Uma segunda tentativa com +15% de salário.
      const p2 = { ...prop, salario: n.salario * 1.15 };
      if (n.rondas.filter((r) => r.texto.includes('recusa os termos')).length === 0 && aceita(w, this, n.jogador, p2, n.dia, rng)) {
        n.salario = Math.round(p2.salario / 1000) * 1000;
        n.rondas.push({ dia: n.dia, texto: `${st.nomes[n.jogador]} recusa os termos; aceita com +15% (${M(n.salario)}/ano)` });
        n.estado = n.tipo === 'pre_contrato' ? 'registo' : 'exames';
        return;
      }
      return this.falhar(n, `${st.nomes[n.jogador]} recusa os termos do ${cn}`);
    }
    if (n.estado === 'exames') {
      if (st.indisponivelAte[n.jogador] > n.dia && rng.chance(N.exames_falha_lesionado)) return this.falhar(n, 'chumba nos exames médicos (lesionado)');
      n.rondas.push({ dia: n.dia, texto: 'passa nos exames médicos' });
      n.estado = 'registo';
      return;
    }
    if (n.estado === 'registo') {
      if (n.tipo === 'pre_contrato') { this.contratos.preContrato[n.jogador] = n.comprador; this.contratos.salarioPreContrato.set(n.jogador, n.salario); n.estado = 'concluido'; this.estat.preContratos++; n.rondas.push({ dia: n.dia, texto: `pré-contrato assinado: muda-se no fim do contrato (${data(st.fimContrato[n.jogador])})` }); this.concluidos.push(n); return; }
      if (n.tipo !== 'livre' && !this.janelaAberta(n.comprador, n.dia)) return this.falhar(n, 'a janela fechou');
      if (n.vendedor >= 0 && n.tipo !== 'emprestimo' && this.contratos.listado[n.jogador] !== 3 && this.plantel(n.vendedor).length <= K_MIN) return this.falhar(n, `${w.clubes[n.vendedor].nome} ficaria abaixo do plantel mínimo`);
      const insc = this.podeInscrever(n.jogador, n.comprador);
      if (insc) return this.falhar(n, `não pode inscrever: ${insc}`);
      if (n.tipo !== 'emprestimo' && n.tipo !== 'livre' && e.clubes.caixa[n.comprador] < n.oferta * CONTRATO.parcelas_vista[0]) return this.falhar(n, 'o comprador ficou sem orçamento');
      this.concluir(n, rng);
    }
  }

  /** O titular da recompra decide: exerce (o negócio com o outro clube cai e ele compra ao preço fixo) ou deixa seguir
   *  (o direito extingue-se). IA: exerce se o jogador melhora o seu plantel, o preço é inferior ao valor de mercado e há
   *  caixa e vaga. Utilizador: um evento com uma decisão (sem resposta até ao prazo = recusa). */
  /** Se um clube (que não o comprador nem o vendedor) tem a recompra do jogador, notifica-o: o negócio espera a decisão
   *  dele (3 a 5 dias) e, se não a exercer, retoma em `depois`. Vale para todas as saídas com preço: oferta aceite,
   *  cláusula de rescisão paga e opção/obrigação de compra de empréstimo. */
  private notificarRecompra(n: Negocio, depois: 'termos' | 'concluir'): boolean {
    const rc = this.direitos.recompra(n.jogador, n.dia);
    if (!rc || rc.clube === n.comprador || rc.clube === n.vendedor) return false;
    const [p0, p1] = DIREITOS.recompra.prazo_dias;
    n.estado = 'recompra';
    n.depoisRecompra = depois;
    n.recompraAte = n.dia + p0 + (n.id % (p1 - p0 + 1));
    n.rondas.push({ dia: n.dia, texto: `o ${this.w.clubes[rc.clube].nome} tem a recompra (${M(rc.preco)}) e é notificado: decide até ${data(n.recompraAte)}` });
    return true;
  }

  private decidirRecompra(n: Negocio, rng: Rng) {
    const w = this.w, st = w.jogadores!, e = w.economia!, j = n.jogador;
    const rc = this.direitos.recompra(j, n.dia);
    const retomar = () => { if (n.depoisRecompra === 'concluir') this.concluir(n, rng); else n.estado = 'termos'; };
    if (!rc) return retomar();
    const h = rc.clube;
    let exerce: boolean;
    if (this.util && h === this.util.clube) {
      const r = this.util.respostaRecompra(n, rc, n.dia);
      if (r === 'aguarda' && n.dia < (n.recompraAte ?? n.dia)) return;
      exerce = r === 'exercer';
    } else {
      // Exerce se o jogador cobre uma necessidade do seu plano de plantel (Bloco B).
      const melhora = !!this.planos.cobre(h, j, n.dia);
      const barato = rc.preco < DIREITOS.recompra.abaixo_do_valor * valorMercado(w, j, n.dia, e.inflacao);
      exerce = melhora && barato && e.clubes.caixa[h] > rc.preco && !this.podeInscrever(j, h) && this.janelaAberta(h, n.dia);
    }
    this.direitos.recompraDecidida(j, rc, exerce, n.dia);
    if (!exerce) {
      n.rondas.push({ dia: n.dia, texto: `o ${w.clubes[h].nome} não exerce a recompra: o negócio segue` });
      return retomar();
    }
    this.falhar(n, `o ${w.clubes[h].nome} exerceu a recompra`);
    const ordem = this.plantel(h).filter((x) => st.ovrNat(x) > st.ovrNat(j)).length;
    const r: Negocio = { id: ++this.seq, tipo: 'transferencia', jogador: j, vendedor: n.vendedor, comprador: h, estado: 'registo', oferta: rc.preco, pedido: rc.preco, maximo: rc.preco,
      salario: Math.round(this.salarioMercado(j, h, n.dia) / 1000) * 1000, estatuto: ordem < 11 ? 'titular' : ordem < 18 ? 'rotacao' : 'promessa', dia: n.dia, inicio: n.dia, deRecompra: true,
      rondas: [{ dia: n.dia, texto: `${w.clubes[h].nome} exerce a recompra de ${st.nomes[j]} por ${M(rc.preco)} (cláusula do contrato: o jogador não pode recusar)` }] };
    this.negocios.push(r);
  }

  private subir(n: Negocio, nova: number) {
    if (nova > n.maximo) {
      if (n.oferta >= n.maximo) return this.falhar(n, `${this.w.clubes[n.comprador].nome} desiste (máximo ${M(n.maximo)})`);
      nova = n.maximo;
    }
    n.oferta = Math.round(nova / 10000) * 10000;
    n.rondas.push({ dia: n.dia, texto: `${this.w.clubes[n.comprador].nome} sobe a oferta para ${M(n.oferta)}` });
  }

  /** Resposta da IA do vendedor: aceita a partir do pedido; contra-proposta perto dele; recusa longe. */
  respostaIA(n: Negocio): 'aceitar' | 'recusar' | { contra: number } {
    if (n.oferta >= n.pedido) return 'aceitar';
    if (n.oferta >= 0.75 * n.pedido) return { contra: Math.round((n.oferta + N.contra * (n.pedido - n.oferta)) / 10000) * 10000 };
    return 'recusar';
  }

  falhar(n: Negocio, motivo: string) {
    n.estado = 'falhou';
    n.motivo = motivo;
    n.rondas.push({ dia: n.dia, texto: `negócio falha: ${motivo}` });
    this.estat.falhados++;
    this.concluidos.push(n);
  }

  /** Conclui: dinheiro (à cabeça e parcelas), agentes, % de venda futura, contrato novo, mudança de clube. */
  concluir(n: Negocio, rng: Rng) {
    const w = this.w, st = w.jogadores!, e = w.economia!, s = e.clubes, k = this.contratos;
    const j = n.jogador, de = n.vendedor, para = n.comprador;
    const valorAntes = valorMercado(w, j, n.dia, e.inflacao);
    if (n.tipo === 'emprestimo') {
      k.emprestimo.set(j, { dono: de, ate: fimDeEpoca(w, para, n.dia + 60, 1), salarioReceptor: n.emprestimo?.salario ?? 1, opcao: n.emprestimo?.opcao ?? 0, obrigacao: !!n.emprestimo?.obrigacao, minutos: 0 });
      this.mover(j, de, para, n.dia);
      this.recalcularFolha(de); this.recalcularFolha(para);
      this.estat.emprestimos++;
      n.rondas.push({ dia: n.dia, texto: `empréstimo concluído até ${data(k.emprestimo.get(j)!.ate)} (${Math.round(100 * (n.emprestimo?.salario ?? 1))}% do salário pago pelo ${w.clubes[para].nome}${n.emprestimo?.opcao ? `, ${n.emprestimo.obrigacao ? 'obrigação' : 'opção'} de compra por ${M(n.emprestimo.opcao)}` : ''})` });
    } else {
      const fee = n.tipo === 'livre' ? 0 : n.oferta;
      if (fee > 0) {
        // Direitos futuros (Prompt 6): liquidação única. Os titulares de % de venda futura recebem a sua parte do preço
        // (o vendedor recebe o líquido), à vista e nas parcelas na mesma proporção; todas as cláusulas se extinguem.
        const partilhas = this.direitos.liquidar(j, de, para, fee, n.dia);
        const recebedores: [number, number][] = [[de, 1 - partilhas.reduce((a, p) => a + p.fraccao, 0)], ...partilhas.map((p) => [p.clube, p.fraccao] as [number, number])];
        const receber = (valor: number) => { for (const [c, f] of recebedores) s.lancar(c, 'transferencias', valor * f); };
        const parcelar = (resto: number, nP: number, dias: number) => {
          s.dividaParcelas[para] += resto;
          for (let a = 1; a <= nP; a++) for (const [c, f] of recebedores) this.parcelas.push({ pagador: para, recebedor: c, valor: (resto / nP) * f, dia: n.dia + a * dias });
        };
        // Pagamento: sempre um valor à vista; só alguns vendedores aceitam o resto em parcelas.
        const U = n.util, parcU = U ? NEG_CLUBE.parcelas.find((x) => x.id === U.parcelas) ?? NEG_CLUBE.parcelas[0] : null;
        const aceitaParcelas = parcU ? parcU.n > 0 : fee > CONTRATO.parcelas_acima && rng.chance(CONTRATO.parcelas_aceita[Math.min(2, s.saude[de])]);
        const vista = parcU ? Math.round(fee * parcU.vista) : aceitaParcelas ? Math.round((fee * (CONTRATO.parcelas_vista[0] + rng.next() * (CONTRATO.parcelas_vista[1] - CONTRATO.parcelas_vista[0]))) / 100000) * 100000 : fee;
        s.lancar(para, 'aquisicoes', vista);
        receber(vista);
        if (vista < fee && parcU) {
          parcelar(fee - vista, parcU.n, parcU.dias);
          n.rondas.push({ dia: n.dia, texto: `pagamento: ${M(vista)} à vista e ${parcU.n} parcelas de ${M((fee - vista) / parcU.n)}` });
        } else if (vista < fee) {
          let u = rng.next() * CONTRATO.esquemas.reduce((a, x) => a + x.peso, 0);
          const esq = CONTRATO.esquemas.find((x) => (u -= x.peso) < 0) ?? CONTRATO.esquemas[0];
          const nP = rng.int(esq.max === 1 ? 1 : 2, esq.max);
          parcelar(fee - vista, nP, esq.dias);
          n.rondas.push({ dia: n.dia, texto: `pagamento: ${M(vista)} à vista e ${nP} parcela(s) ${esq.nome}(is) de ${M((fee - vista) / nP)}` });
        } else n.rondas.push({ dia: n.dia, texto: `pagamento: ${M(fee)} à vista` });
        for (const p of partilhas) n.rondas.push({ dia: n.dia, texto: `${M(p.fraccao * fee)} (${Math.round(100 * p.fraccao)}% de venda futura) para o ${w.clubes[p.clube].nome}, que perde o direito` });
        if (this.direitos.verificar) {
          const soma = recebedores.reduce((a, [, f]) => a + f, 0);
          if (Math.abs(soma - 1) > 1e-9 || recebedores[0][1] < 0.5 - 1e-9) this.direitos.erros.push(`negócio ${n.id}: preço ≠ vendedor + beneficiários (${soma})`);
        }
        s.lancar(para, 'agentes', n.util ? n.util.agente : CONTRATO.agentes * fee);
        // Direitos novos: os do utilizador (a % que acordou) ou os que o vendedor (IA) pediu na negociação.
        if (n.util) {
          if (n.util.vendaFutura > 0) this.direitos.criar(j, 'venda_futura', de, n.util.vendaFutura / 100, n.dia, fee, DIREITOS.venda_futura.validade_anos);
          const t = n.util.troca;
          if (t !== null && st.clube[t] === para) {
            this.mover(t, para, de, n.dia);
            k.listado[t] = 0;
            n.rondas.push({ dia: n.dia, texto: `${st.nomes[t]} segue para o ${w.clubes[de].nome} na troca` });
          }
        } else if (n.direitosPlano && !n.deRecompra) {
          const pl = n.direitosPlano;
          if (pl.vendaFutura > 0) {
            const d = this.direitos.criar(j, 'venda_futura', de, pl.vendaFutura, n.dia, fee, DIREITOS.venda_futura.validade_anos);
            if (d) n.rondas.push({ dia: n.dia, texto: `cláusula de venda futura: ${Math.round(100 * d.pct)}% da próxima venda para o ${w.clubes[de].nome} (até ${data(d.ate)})` });
          }
          if (pl.recompra > 0) {
            const d = this.direitos.criar(j, 'recompra', de, fee * pl.recompra, n.dia, fee, pl.anosRecompra);
            if (d) n.rondas.push({ dia: n.dia, texto: `cláusula de recompra: o ${w.clubes[de].nome} pode recomprar por ${M(d.preco)} até ${data(d.ate)}` });
          }
        }
        e.clubes.orcTransferencias[para] = Math.max(0, e.clubes.orcTransferencias[para] - fee);
        this.gastoJanela.set(para, (this.gastoJanela.get(para) ?? 0) + fee);
        this.vendasJanela.set(de, (this.vendasJanela.get(de) ?? 0) + fee);
        if (n.tipo === 'clausula') this.estat.clausulas++; else this.estat.transferencias++;
      } else {
        s.lancar(para, 'agentes', n.util ? n.util.agente : CONTRATO.agentes * n.salario);
        this.estat.livres++;
      }
      // Contrato novo (os anos acordados pelo utilizador, ou sorteados pela idade).
      const [a0, a1] = CONTRATO.anos(st.idade(j, n.dia));
      st.salario[j] = n.salario;
      st.fimContrato[j] = fimDeEpoca(w, para, n.dia + 60, n.util ? n.util.anos : rng.int(a0, a1));
      if (n.util?.premio) s.lancar(para, 'aquisicoes', n.util.premio);
      k.estatuto[j] = ESTATUTOS.indexOf(n.estatuto);
      k.clausula[j] = 0; k.listado[j] = 0; k.descontentamento[j] = 0; k.livreDesde[j] = 0; k.preContrato[j] = -1; k.salarioAnterior.delete(j); k.salarioPreContrato.delete(j);
      k.emprestimo.delete(j);
      this.bonus(j);
      if (n.util) {
        if (n.util.clausula > 0) { k.clausula[j] = n.util.clausula; k.clausulaDesde[j] = n.dia; }
        const b = n.util.bonus;
        if (b && b.modo === 'Por cada') { if (b.tipo === 'Golos') k.bonusGolo[j] = b.valor; else if (b.tipo === 'Jogos') k.bonusJogo[j] = b.valor; else if (b.tipo === 'Assistências') k.bonusAssist[j] = b.valor; }
      } else this.talvezClausula(j, para, n.dia, rng);
      this.estruturaSalarial(para, j);
      if (de >= 0) this.mover(j, de, para, n.dia);
      else { st.clube[j] = para; w.plantel[para].push(j); k.chegada[j] = n.dia; const g = this.livres.get(this.grupo(j))!; const i = g.indexOf(j); if (i >= 0) g.splice(i, 1); }
      if (de >= 0) this.recalcularFolha(de);
      this.recalcularFolha(para);
      n.rondas.push({ dia: n.dia, texto: `${st.nomes[j]} assina pelo ${w.clubes[para].nome} até ${data(st.fimContrato[j])}${k.clausula[j] ? ` (cláusula de rescisão de ${M(k.clausula[j])})` : ''}` });
    }
    // O plantel mudou: os planos dos dois clubes recalculam-se (quem vendeu 10 numa janela tem de repor).
    if (n.tipo !== 'pre_contrato') { if (n.comprador >= 0) this.planos.invalidar(n.comprador); if (de >= 0) this.planos.invalidar(de); }
    // Posições reforçadas pelo comprador nesta janela (as necessidades do plano cobertas; pedidos do treinador).
    if (n.comprador >= 0 && n.tipo !== 'pre_contrato') {
      const st2 = this.w.jogadores!, NP = POS_NOMES.length;
      const r = this.reforcosJanela.get(n.comprador) ?? [];
      for (let p = 0; p < NP; p++) if (st2.fam[n.jogador * NP + p] >= FAMILIARIDADE.competente) r.push(POS_NOMES[p]);
      this.reforcosJanela.set(n.comprador, r);
    }
    n.estado = 'concluido';
    this.concluidos.push(n);
    this.registo.push({ dia: n.dia, tipo: n.tipo, jogador: j, de, para, fee: n.tipo === 'livre' || n.tipo === 'emprestimo' ? 0 : n.oferta, valor: valorAntes, idade: Math.floor(st.idade(j, n.dia)), ovr: st.ovrNat(j) });
    if (this.registo.length > 60000) this.registo = this.registo.slice(-30000);
    for (const x of this.interessados(j)) if (x !== n) this.falhar(x, `${st.nomes[j]} assinou por outro clube`);
  }

  private mover(j: number, de: number, para: number, dia: number) {
    const w = this.w, st = w.jogadores!;
    w.plantel[de] = w.plantel[de].filter((x) => x !== j);
    w.plantel[para].push(j);
    st.clube[j] = para;
    st.entrosamento[j] = 30;
    this.contratos.chegada[j] = dia;
  }

  /** Estrutura salarial: um salário muito acima do maior do plantel baixa a moral dos outros titulares. */
  private estruturaSalarial(c: number, j: number) {
    const st = this.w.jogadores!;
    const pl = this.plantel(c).filter((x) => x !== j);
    const max = Math.max(0, ...pl.map((x) => st.salario[x]));
    if (max > 0 && st.salario[j] > CONTRATO.estrutura_limite * max) {
      for (const x of pl.sort((a, b) => st.salario[b] - st.salario[a]).slice(0, 5)) st.moral[x] = Math.max(1, st.moral[x] - CONTRATO.estrutura_moral);
    }
  }

  // ---------------------------------------------------------------- ciclo semanal (chamado pelo simulador)

  semana(segunda: number, jogos: JogoR[] = []) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'mercado', segunda);
    this.scouting.semana(segunda, jogos);
    this.direitos.caducar(segunda);
    // Parcelas que vencem.
    const s = w.economia!.clubes;
    this.parcelas = this.parcelas.filter((p) => {
      if (p.dia > segunda + 7) return true;
      s.lancar(p.pagador, 'aquisicoes', p.valor); s.dividaParcelas[p.pagador] = Math.max(0, s.dividaParcelas[p.pagador] - p.valor);
      s.lancar(p.recebedor, 'transferencias', p.valor);
      return false;
    });
    // Fora das janelas europeias de Verão e de Inverno o gasto da janela recomeça.
    const mes = new Date(segunda * 864e5).getUTCMonth();
    if (mes === 4 || mes === 10) { this.gastoJanela.clear(); this.vendasJanela.clear(); }
    // IA: novas abordagens (compras e empréstimos na janela; livres sempre que faltam jogadores).
    this.abordagens(segunda, rng);
    this.colocarEmprestimos(segunda, rng);
    // Negócios: rondas ao longo dos dias da semana.
    for (const n of [...this.negocios]) {
      const r = Rng.de(w.semente, 'negocio', n.id, segunda);
      const activo = (x: Negocio) => x.estado !== 'concluido' && x.estado !== 'falhou';
      while (activo(n) && n.dia < segunda + 7) {
        this.ronda(n, r);
        n.dia += r.int(N.dias_ronda[0], N.dias_ronda[1]);
        // Último dia da janela: o que não fechou cai por falta de tempo (com probabilidade).
        if (activo(n) && n.tipo !== 'livre' && n.tipo !== 'pre_contrato' && !this.janelaAberta(n.comprador, n.dia)) {
          if (r.chance(N.falta_tempo)) { this.estat.faltaTempo++; this.falhar(n, 'falta de tempo: a janela fechou'); }
          else n.dia = this.fimJanela(n.comprador, n.dia - 3);
          break;
        }
      }
    }
    this.negocios = this.negocios.filter((n) => n.estado !== 'concluido' && n.estado !== 'falhou');
    this.util?.semana(segunda);
    if (this.concluidos.length > 4000) this.concluidos = this.concluidos.slice(-2000);
  }

  /** Mensal: índices, listagens, descontentamento, renovações e pré-contratos. */
  mes(dia: number) {
    const w = this.w, st = w.jogadores!, e = w.economia!;
    this.reindexar(dia);
    this.scouting.actualizarTopo();
    // Os scouts são reatribuídos no início de cada janela (Julho e Janeiro).
    const mes = new Date(dia * 864e5).getUTCMonth();
    if (mes === 0 || mes === 6) for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0 && !this.scouting.fixas.has(c)) this.scouting.atribuir(c, Rng.de(w.semente, 'scouts', w.clubes[c].id, dia));
    // Fim da janela (Setembro e Fevereiro): os pedidos do treinador que ficaram por cumprir baixam-lhe a moral.
    if (mes === 8 || mes === 1) {
      // (Com os planos da janela, antes de se recalcularem.)
      for (const [c, plano] of this.planos.porClube) {
        const t = w.motor?.treinadores[c];
        if (!t) continue;
        const feitos = this.reforcosJanela.get(c) ?? [];
        const falhados = plano.necessidades.filter((n) => n.pedido && !feitos.includes(n.pos)).length;
        if (falhados) t.moral = Math.max(0, (t.moral ?? 60) - PLANO_PLANTEL.moral_pedido * falhados);
      }
      // Plantéis acima do máximo ou com uma posição repetida demais: rescinde os piores excedentes do plano.
      for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0 && this.util?.clube !== c) this.rescindirExcedentes(c, dia);
    }
    if (mes === 0 || mes === 6) this.reforcosJanela.clear();
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0) continue;
      const rng = Rng.de(w.semente, 'mercado-mes', w.clubes[c].id, dia);
      const pl = this.plantel(c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
      pl.forEach((j, i) => {
        if (i < 30) actualizarDescontentamento(w, this, j, Math.min(1, st.minMes[j] / 380));
        // Primeiro contrato de jovem: aumento depois de N jogos na equipa principal.
        const n = this.contratos.aumentoJogos[j];
        if (n && st.eJogos[j] >= n) { st.salario[j] += Math.round(CONTRATO.jovem_aumento * Math.max(0, this.salarioMercado(j, c, dia) - st.salario[j])); this.contratos.aumentoJogos[j] = 0; }
      });
      // Plano de plantel do mês (Bloco B): as listagens saem dos excedentes do plano (a mais na posição, sem lugar,
      // não encaixa no sistema); mais as intenções da IA do clube e a venda forçada.
      const doUtilizador = this.util?.clube === c;
      const plano = this.planos.calcular(c, dia);
      if (!doUtilizador) for (const x of plano.excedentes) if (!this.contratos.listado[x.j]) this.contratos.listado[x.j] = 1;
      if (!doUtilizador) for (const j of e.controlador(c).listarParaVenda?.(w, e, c) ?? []) if (st.clube[j] === c && !this.contratos.listado[j]) this.contratos.listado[j] = 1;
      // Renovações (último ano de contrato): os melhores e os jovens de potencial.
      for (const [i, j] of pl.entries()) {
        if (doUtilizador) break; // as renovações do utilizador fazem-se no Escritório
        const anos = (st.fimContrato[j] - dia) / 365;
        if (anos > 1 || anos < 0 || this.contratos.preContrato[j] >= 0) continue;
        // Renova quem tem lugar no plano (titular ou profundidade) e os jovens de potencial; não os excedentes.
        const quer = (plano.lugar.has(j) && !plano.excedentes.some((x) => x.j === j)) || (st.idade(j, dia) <= 23 && st.pot[j] >= st.ovrNat(j) + 5);
        void i;
        // Quem não vai ser renovado é posto à venda no último ano (melhor do que sair a custo zero).
        if (!quer || st.idade(j, dia) > 34) { if (!doUtilizador && !this.contratos.listado[j] && st.idade(j, dia) <= 33) this.contratos.listado[j] = 1; continue; }
        if (!rng.chance(0.35)) continue;
        // A oferta não desce abaixo de x × o salário actual (o clube quer mantê-lo).
        const sal = Math.round(Math.max(salarioPedido(w, j, this.salarioMercado(j, c, dia)), IA.renovacao_minimo_actual * st.salario[j]) / 1000) * 1000;
        const folga = e.clubes.orcSalarios[c] - e.clubes.folha[c] + st.salario[j];
        // Sem folga salarial só se deixa sair quem pede um aumento grande (os outros renovam-se ao salário pedido).
        if (sal > folga && i >= 11 && sal > st.salario[j] * IA.renovacao_aumento_sem_folga) { this.estat.renovSemFolga++; continue; }
        const sc = pontuarProposta(w, this, j, { clube: c, salario: sal, minutos: CONTRATO.minutos_prometidos[this.contratos.nomeEstatuto(j)] }, dia);
        // Ficar: a ligação conta a favor, o descontentamento contra.
        if (-sc.parcelas.ligacao + sc.parcelas.salario - this.contratos.descontentamento[j] / IA.renovacao_descontentamento + IA.renovacao_ficar + rng.normal(0, 0.3) > 0) {
          st.salario[j] = sal;
          const [a0, a1] = CONTRATO.anos(st.idade(j, dia));
          st.fimContrato[j] = fimDeEpoca(w, c, dia + 60, rng.int(a0, a1));
          this.definirEstatuto(j, i, dia);
          this.bonus(j);
          this.estat.renovacoes++;
        } else this.estat.renovRecusadas++;
      }
      this.recalcularFolha(c);
    }
  }

  /** Fim da janela, último recurso: os excedentes do plano que não se venderam (com o preço a descer) nem emprestaram.
   *  Só quando o plantel passa do máximo ou uma posição natural tem jogadores a mais (os piores primeiro; nunca abaixo
   *  de 22), e conforme o arquétipo (quem gasta muito corta; o tradicional e o formador mantêm e vendem mais tarde). */
  rescindirExcedentes(c: number, dia: number) {
    const w = this.w, st = w.jogadores!, e = w.economia!, P = PLANO_PLANTEL;
    const disposicao = P.rescisao_arquetipo[e.ia?.arquetipo[c] ?? ''] ?? 0.5;
    const rng = Rng.de(w.semente, 'rescisao', w.clubes[c].id, dia);
    const plano = this.planos.calcular(c, dia);
    let pl = this.plantel(c);
    const contar = () => { const n = new Map<number, number>(); for (const j of pl) n.set(st.posNat[j], (n.get(st.posNat[j]) ?? 0) + 1); return n; };
    for (const { j, motivo } of plano.excedentes) {
      if (pl.length <= 22) break;
      if (motivo.startsWith('não encaixa')) continue; // esses ficam à venda (são bons jogadores noutro sistema)
      const porPos = contar();
      // Quem luta pela permanência guarda a profundidade: só rescinde acima do plantel máximo.
      const repetido = (porPos.get(st.posNat[j]) ?? 0) >= P.repetidos_max && !this.planos.abaixoDaLiga(c);
      if (pl.length <= P.plantel_max && !repetido) continue;
      if (this.contratos.emprestimo.has(j) || st.clube[j] !== c) continue;
      if (pl.length <= P.plantel_limite && !rng.chance(disposicao)) continue; // fica à venda para a próxima janela
      const anos = Math.max(0, (st.fimContrato[j] - dia) / 365);
      e.clubes.lancar(c, 'indemnizacoes', P.rescisao_fraccao * anos * st.salario[j]);
      w.plantel[c] = w.plantel[c].filter((x) => x !== j);
      this.tornarLivre(j, dia);
      this.estat.rescisoes++;
      pl = this.plantel(c);
    }
    this.recalcularFolha(c);
  }

  /** Abordagens da IA (Prompt 6, Bloco B): só por necessidade do plano de plantel. Procura nos índices por grupo,
   *  filtrados pela posição necessária (natural ou competente), na faixa de nível e de idade da necessidade. */
  private abordagens(segunda: number, rng: Rng) {
    const w = this.w, st = w.jogadores!, e = w.economia!, s = e.clubes;
    const N_POS = POS_NOMES.length;
    // Serve a necessidade: posição natural; só com um titular em falta (urgência) vale um competente. Assim um central
    // não é comprado para lateral ou trinco de reserva (os plantéis não acumulam centrais e médios).
    const natural = (j: number, n: Necessidade) => st.fam[j * N_POS + IDX_POS[n.pos]] >= FAMILIARIDADE.natural;
    const serve = (j: number, n: Necessidade) => n.urgencia >= PLANO_PLANTEL.urgencia.titular_em_falta && n.motivo === 'profundidade' ? st.fam[j * N_POS + IDX_POS[n.pos]] >= FAMILIARIDADE.competente : natural(j, n);
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0) continue;
      if (e.controlador(c).tipo === 'utilizador') continue; // o utilizador decide (Prompt 5)
      const aberta = this.janelaAberta(c, segunda + 3);
      const pl = this.plantel(c);
      const plano = this.planos.obter(c, segunda);
      // As necessidades ainda por cobrir nesta janela (uma contratação para a posição cobre a qualidade e a sucessão; a
      // profundidade só desaparece quando o plano recalculado já tem gente que chegue).
      const feitos = this.reforcosJanela.get(c) ?? [];
      const nec = plano.necessidades.filter((n) => n.motivo === 'profundidade' || !feitos.includes(n.pos));
      if (!nec.length) continue; // sem necessidade não se compra (acabou o "comprar o melhor possível")
      const nivel = plano.nivel;
      // Livres: a qualquer momento, quando falta gente numa posição (profundidade) ou o plantel está curto.
      const urgente = nec.find((n) => n.motivo === 'profundidade');
      const curto = pl.length < IA.tamanho_alvo;
      if ((urgente || curto) && rng.chance(0.6)) {
        const n = urgente ?? nec[0], g = grupoPos(IDX_POS[n.pos]);
        this.propostasAgentes(c, g, segunda, rng);
        const sc = this.scouting;
        const semTitular = urgente?.texto.includes('titular');
        const cand = this.amostraLivres(g, IA.amostra_livres, rng).filter((j) => serve(j, n) && (semTitular || this.livreConhecido(c, j, segunda)))
          .map((j) => ({ j, est: sc.estimarOVR(c, j, segunda).estimado })).filter((x) => x.est >= n.nivelMin - (semTitular ? 12 : IA.livre_falta_margem) && x.est <= nivel + IA.livre_acima);
        const melhor = cand.sort((a, b) => b.est - a.est)[0]?.j;
        if (melhor !== undefined) this.abrir('livre', melhor, c, segunda + rng.int(0, 4), 0, 0, rng);
      }
      if (!aberta) continue;
      for (const n of nec) if (rng.chance(0.5)) this.propostasAgentes(c, grupoPos(IDX_POS[n.pos]), segunda, rng);
      const fim = this.fimJanela(c, segunda);
      const pico = fim - segunda < 7 ? N.pico_ultima_semana : 1;
      // Uma tentativa por necessidade por semana: as mais urgentes e todas as de profundidade (sem tecto rígido).
      const nProf = nec.filter((n) => n.motivo === 'profundidade').length;
      for (const n of nec.slice(0, Math.min(PLANO_PLANTEL.tentativas_max, Math.max(PLANO_PLANTEL.tentativas_semana, nProf)))) {
        if (!rng.chance(Math.min(0.95, IA.prob_abordagem * pico))) continue;
        // Orçamento da janela: o maior entre o da caixa e uma fracção da receita (pela ambição), mais as vendas da janela, até ao tecto.
        const amb = e.ia?.ambicao[c] ?? 0.5;
        const orc = Math.min(IA.orcamento_tecto * s.receitaPrevista[c], Math.max(s.orcTransferencias[c], IA.orcamento_receita * (0.5 + amb) * s.receitaPrevista[c]) + (this.vendasJanela.get(c) ?? 0)) - (this.gastoJanela.get(c) ?? 0);
        const g = grupoPos(IDX_POS[n.pos]);
        const alvoMin = n.nivelMin, alvoMax = n.nivelMin + 10;
        const [i0, i1] = n.idade;
        // Empréstimo (pouco orçamento, profundidade, clube pequeno): jovens de clubes grandes sem lugar no plano deles.
        // Quem luta pela permanência procura mais empréstimos (excedentes dos maiores).
        if (orc < 0.02 * s.receitaPrevista[c] || (n.motivo === 'profundidade' && rng.chance(0.4)) || ((w.reputacao[c] < 60 || this.planos.abaixoDaLiga(c)) && rng.chance(IA.prob_emprestimo))) {
          // Jovens sem lugar dos clubes grandes; ou excedentes do plano de outro clube (de reputação maior), que os empresta
          // antes de pensar em rescindir.
          const cand = this.alvos(c, g, alvoMin - 4, alvoMax, 16, PLANO_PLANTEL.excedente_emprestar_idade, segunda, rng).map((x) => x.j).filter((j) => {
            const d = st.clube[j];
            if (!serve(j, n)) return false;
            if (this.planos.excedente(d, j)) return w.reputacao[d] > w.reputacao[c];
            return st.idade(j, segunda) <= EMPRESTIMOS.idade_maxima && (w.reputacao[d] >= EMPRESTIMOS.emprestador_reputacao || !!this.planos.porClube.get(d)?.emprestar.includes(j)) && w.reputacao[d] > w.reputacao[c] + 10;
          });
          const j = cand[0];
          if (j !== undefined) {
            const recebidos = [...this.contratos.emprestimo.values()].filter((x) => x.dono !== c && pl.some((p) => this.contratos.emprestimo.get(p) === x)).length;
            if (recebidos < EMPRESTIMOS.max_recebidos) {
              const ne = this.abrir('emprestimo', j, c, segunda + rng.int(0, 4), 0, 0, rng);
              if (ne) ne.emprestimo = this.termosEmprestimo(j, segunda, rng);
            }
          }
          if (orc < 0.02 * s.receitaPrevista[c]) continue;
        }
        // Compra: candidatos que servem a posição, na faixa de nível e de idade da necessidade, dentro do orçamento.
        const cand = this.alvos(c, g, alvoMin, alvoMax, i0, i1, segunda, rng).filter((x) => serve(x.j, n));
        let melhor = -1, mv = -Infinity, mp = 0;
        for (const { j, est } of cand.slice(0, 15)) {
          const pp = precoPedido(w, this, j, c, segunda, 1);
          const clau = this.contratos.clausula[j];
          const custo = Math.min(pp.preco, clau > 0 ? clau : Infinity);
          if (custo > orc) continue;
          const v = est - n.nivelMin - custo / Math.max(1, orc) * 3 + (this.contratos.listado[j] ? 2 : 0) + (natural(j, n) ? PLANO_PLANTEL.bonus_natural : 0);
          if (v > mv) { mv = v; melhor = j; mp = custo; }
        }
        // Livres conhecidos que servem a necessidade: sem custo de transferência, preferidos.
        const sc = this.scouting;
        for (const j of this.amostraLivres(g, IA.amostra_livres, rng)) {
          if (!serve(j, n) || !this.livreConhecido(c, j, segunda)) continue;
          const id = st.idade(j, segunda);
          if (id < i0 - 2 || id > i1 + 3) continue;
          const est = sc.estimarOVR(c, j, segunda).estimado;
          if (est < alvoMin - 2 || est > alvoMax) continue;
          const v = est - n.nivelMin + IA.livre_bonus + (natural(j, n) ? PLANO_PLANTEL.bonus_natural : 0);
          if (v > mv) { mv = v; melhor = j; mp = 0; }
        }
        if (melhor < 0) continue;
        if (st.clube[melhor] === -3) { this.abrir('livre', melhor, c, segunda + rng.int(0, 4), 0, 0, rng); continue; }
        const pp = precoPedido(w, this, melhor, c, segunda, this.interessados(melhor).length + 1);
        const clau = this.contratos.clausula[melhor];
        if (clau > 0 && clau <= pp.preco && clau <= orc) { this.abrir('clausula', melhor, c, segunda + rng.int(0, 4), clau, clau, rng); continue; }
        // Pré-contrato: jogador nos últimos 6 meses de contrato (sem custo de transferência).
        if ((st.fimContrato[melhor] - segunda) / 30 <= CONTRATO.pre_contrato_meses && this.contratos.preContrato[melhor] < 0) { this.abrir('pre_contrato', melhor, c, segunda + rng.int(0, 4), 0, 0, rng); continue; }
        const oferta = pp.preco * (IA.oferta_inicial[0] + rng.next() * (IA.oferta_inicial[1] - IA.oferta_inicial[0]));
        this.abrir('transferencia', melhor, c, segunda + rng.int(0, 4), oferta, Math.min(orc, mp * 1.15), rng);
      }
    }
  }

  /** Termos de um empréstimo: fracção do salário paga por quem recebe, opção e obrigação de compra (sorteadas). */
  private termosEmprestimo(j: number, dia: number, rng: Rng) {
    return { salario: EMPRESTIMOS.salario_receptor[0] + rng.next() * (EMPRESTIMOS.salario_receptor[1] - EMPRESTIMOS.salario_receptor[0]), opcao: rng.chance(EMPRESTIMOS.prob_opcao) ? Math.round(valorMercado(this.w, j, dia, this.w.economia!.inflacao) * EMPRESTIMOS.opcao_multiplo) : 0, obrigacao: rng.chance(EMPRESTIMOS.prob_obrigacao) };
  }

  /** Quem tem jovens sem lugar no plano (a emprestar) procura-lhes destino: um por semana, na janela, oferecido a alguns
   *  clubes menores (reputação 10+ abaixo, não em luta pela permanência) a quem falte gente na posição natural dele
   *  (necessidade de profundidade), com o nível mínimo da necessidade. É o clube que
   *  empresta a tomar a iniciativa (sem isto só saíam se quem precisa já os conhecesse). */
  private colocarEmprestimos(segunda: number, rng: Rng) {
    const w = this.w, st = w.jogadores!, e = w.economia!, P = PLANO_PLANTEL, NP = POS_NOMES.length;
    const emJogo: number[] = [];
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0 && e.controlador(c).tipo !== 'utilizador') emJogo.push(c);
    const cedidos = new Map<number, number>(), recebidos = new Map<number, number>();
    for (const [j, x] of this.contratos.emprestimo) { cedidos.set(x.dono, (cedidos.get(x.dono) ?? 0) + 1); recebidos.set(st.clube[j], (recebidos.get(st.clube[j]) ?? 0) + 1); }
    for (const [c, plano] of this.planos.porClube) {
      // Os jovens a emprestar e os excedentes novos (até x anos).
      const lista = [...plano.emprestar, ...plano.excedentes.filter((x) => !x.motivo.startsWith('não encaixa') && st.idade(x.j, segunda) <= P.colocar_idade_excedente).map((x) => x.j)];
      if (!lista.length || e.controlador(c).tipo === 'utilizador' || !this.janelaAberta(c, segunda + 3)) continue;
      if ((cedidos.get(c) ?? 0) >= EMPRESTIMOS.max_cedidos || !rng.chance(P.colocar_prob)) continue;
      const j = lista.find((x) => st.clube[x] === c && !this.contratos.emprestimo.has(x) && !this.negocios.some((n) => n.jogador === x));
      if (j === undefined) continue;
      for (let k = 0; k < P.colocar_amostra; k++) {
        const d = emJogo[rng.int(0, emJogo.length - 1)];
        // Quem luta pela permanência não quer jovens emprestados (quer jogadores feitos).
        if (d === c || w.reputacao[d] > w.reputacao[c] - 10 || (recebidos.get(d) ?? 0) >= EMPRESTIMOS.max_recebidos || this.planos.abaixoDaLiga(d) || !this.janelaAberta(d, segunda + 3)) continue;
        const n = this.planos.porClube.get(d)?.necessidades.find((x) => x.motivo === 'profundidade' && st.fam[j * NP + IDX_POS[x.pos]] >= FAMILIARIDADE.natural && st.ovrNat(j) >= x.nivelMin);
        if (!n) continue;
        this.scouting.conhecer(d, j, CONHECIMENTO.ganho_proposta, segunda);
        const ne = this.abrir('emprestimo', j, d, segunda + rng.int(0, 4), 0, 0, rng);
        if (ne) ne.emprestimo = this.termosEmprestimo(j, segunda, rng);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- fim de época (chamado na passagem, antes da reposição de jovens)

  fimDeContratos(t: Temporada, dia: number) {
    const w = this.w, st = w.jogadores!, k = this.contratos;
    const limite = dia + 45;
    const clubes = t.pacotes.flatMap((p) => p.ligas).flatMap((li) => w.ligas[li].clubes);
    for (const c of clubes) {
      for (const j of this.plantel(c)) {
        // Empréstimos que acabam: opção/obrigação de compra ou regresso.
        const em = k.emprestimo.get(j);
        if (em && em.ate <= limite) {
          const rng = Rng.de(w.semente, 'fim-emprestimo', st.ids[j], dia);
          if (em.opcao > 0 && (em.obrigacao || (st.ovrNat(j) >= 50 && rng.chance(0.4))) && w.economia!.clubes.caixa[c] > em.opcao) {
            const n: Negocio = { id: ++this.seq, tipo: 'transferencia', jogador: j, vendedor: em.dono, comprador: c, estado: 'registo', oferta: em.opcao, pedido: em.opcao, maximo: em.opcao, salario: st.salario[j], estatuto: 'rotacao', dia, inicio: dia, rondas: [{ dia, texto: `${w.clubes[c].nome} ${em.obrigacao ? 'cumpre a obrigação' : 'exerce a opção'} de compra (${M(em.opcao)})` }] };
            k.emprestimo.delete(j);
            st.clube[j] = em.dono; w.plantel[c] = w.plantel[c].filter((x) => x !== j); w.plantel[em.dono].push(j);
            // Com recompra de outro clube, o titular é notificado (o negócio espera na fila); senão conclui já.
            if (this.notificarRecompra(n, 'concluir')) this.negocios.push(n); else this.concluir(n, rng);
          } else {
            k.emprestimo.delete(j);
            this.mover(j, c, em.dono, dia);
            // Volta ao clube dono; se o contrato também acabou, fica livre.
            if (st.fimContrato[j] <= limite && k.preContrato[j] < 0) { w.plantel[em.dono] = w.plantel[em.dono].filter((x) => x !== j); this.tornarLivre(j, dia); }
            this.recalcularFolha(em.dono);
          }
          continue;
        }
        // Sem contrato ainda (gerados que entram do exterior, juniores promovidos): a economia dá-lhes o primeiro contrato.
        if (st.fimContrato[j] > limite || st.fimContrato[j] === 0) continue;
        const pre = k.preContrato[j];
        if (pre >= 0 && pre !== c) {
          const n: Negocio = { id: ++this.seq, tipo: 'livre', jogador: j, vendedor: -1, comprador: pre, estado: 'registo', oferta: 0, pedido: 0, maximo: 0, salario: k.salarioPreContrato.get(j) ?? st.salario[j], estatuto: 'rotacao', dia, inicio: dia, rondas: [{ dia, texto: `${st.nomes[j]} chega ao ${w.clubes[pre].nome} com o pré-contrato` }] };
          w.plantel[c] = w.plantel[c].filter((x) => x !== j);
          st.clube[j] = -3;
          this.concluir(n, Rng.de(w.semente, 'pre', st.ids[j]));
        } else {
          w.plantel[c] = w.plantel[c].filter((x) => x !== j);
          this.tornarLivre(j, dia);
          this.estat.expirados++;
        }
      }
      // As cláusulas descem com o tempo.
      for (const j of this.plantel(c)) if (k.clausula[j] > 0) k.clausula[j] = Math.max(valorMercado(w, j, dia, w.economia!.inflacao) * 1.2, k.clausula[j] * (1 - CL.desce_por_ano));
      this.recalcularFolha(c);
    }
    // Livres muito velhos deixam o futebol.
    // E os que passam mais de N dias sem clube também (Bloco C: os juniores libertados enchiam a lista).
    for (const g of GRUPOS) this.livres.set(g, this.livres.get(g)!.filter((j) => { if (st.idade(j, dia) >= 36 || dia - this.contratos.livreDesde[j] > IA.livre_dias_maximo) { st.clube[j] = -2; this.contratos.salarioAnterior.delete(j); return false; } return true; }));
    void VALOR;
  }

  bytes(): number {
    return this.contratos.bytes() + this.direitos.bytes() + this.parcelas.length * 40 + [...this.livres.values()].reduce((a, b) => a + b.length * 8, 0);
  }
}
