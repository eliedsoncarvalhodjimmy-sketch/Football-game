// Mercado do clube do utilizador (Prompt 5, A3): negociações ronda a ronda com o clube vendedor e com o jogador/agente,
// como no protótipo aprovado; pedidos de empréstimo; ofertas recebidas à espera de resposta; listagens e shortlist.
// Tudo determinístico (sem sorteios): as respostas dependem só do estado do mundo e das propostas, por isso os comandos
// gravados reproduzem as mesmas negociações ao carregar.
import { NEG_CLUBE as NC, NEG_EMPRESTIMO as NE, NEG_JOGADOR as NJ, OFERTAS_RECEBIDAS as OR, SHORTLIST as SL } from '../config/negociacaoUtilizador.ts';
import { CONHECIMENTO } from '../config/scouting.ts';
import { ESTATUTOS } from '../config/contratosJogador.ts';
import { valorMercado, precoPedido } from './valor.ts';
import { salarioPedido } from './decisaoJogador.ts';
import type { Mercado, Negocio } from './mercado.ts';
import type { World } from '../engine/world.ts';

export type Papel = (typeof NJ.papeis)[number];
export type TipoNeg = 'transferencia' | 'emprestimo' | 'livre' | 'clausula';
export type FaseNeg = 'clube' | 'jogador' | 'registo' | 'concluida' | 'rompeu' | 'rompeu_jogador' | 'desistiu' | 'falhou';

export interface PropostaClube { valor: number; vendaFutura: number; parcelas: string; troca: number | null }
export interface PropostaEmprestimo { salario: number; opcao: number }
export interface Bonus { tipo: (typeof NJ.bonus_tipos)[number]; modo: (typeof NJ.bonus_modos)[number]; n: number; valor: number }
export interface PropostaJogador { papel: Papel; anos: number; salario: number; premio: number; agente: number; clausula: number; bonus: Bonus | null }

/** Termos acordados pelo utilizador, levados pelo Negocio até ao registo. */
export interface TermosUtilizador {
  parcelas: string; vendaFutura: number; troca: number | null; premio: number; agente: number; anos: number; clausula: number; bonus: Bonus | null;
}

export interface NegUtilizador {
  id: number; tipo: TipoNeg; jogador: number; vendedor: number; fase: FaseNeg;
  ronda: number; tensao: number; fala: string; inicio: number;
  /** Clube: pedido actual e piso; acordo (valor fechado). */
  pedido: number; piso: number; acordo: number;
  ultimaClube: PropostaClube | null;
  emprestimo: PropostaEmprestimo | null;
  /** O que o jogador pede (actualizado a cada recusa) e o pedido inicial (para o mínimo). */
  pede: { salario: number; premio: number; agente: number; papel: Papel } | null;
  pede0: { salario: number; agente: number } | null;
  ultimaJogador: PropostaJogador | null;
  negocio: number | null;
  historico: { dia: number; texto: string }[];
}

const fE = (n: number) => `€${Math.round(n).toLocaleString('pt-PT')}`;
const r4 = (x: number) => Math.round(x / 1e4) * 1e4;
const r3 = (x: number) => Math.round(x / 1e3) * 1e3;

/** Proposta ao clube: o vendedor exige o pedido, menos a venda futura, mais o extra das parcelas; a troca conta x do valor. */
export function avaliarClube(pedido: number, p: PropostaClube, valorTroca: number) {
  const parc = NC.parcelas.find((x) => x.id === p.parcelas) ?? NC.parcelas[0];
  const troca = p.troca !== null ? NC.troca_valor * valorTroca : 0;
  const efectivo = p.valor + troca;
  const exigido = pedido * (1 - p.vendaFutura * NC.venda_futura_por_ponto) * (1 + parc.extra);
  return { efectivo, exigido, troca, ok: efectivo >= exigido - 1 };
}

/** Proposta ao jogador: salário pesa mais; o agente bloqueia abaixo de x da taxa; papel abaixo do pedido custa; cláusula até
 *  N × o valor agrada; bónus ajuda pouco. Aceita com pontuação ≥ 1. */
export function avaliarJogador(pe: { salario: number; premio: number; agente: number; papel: Papel }, p: PropostaJogador, valor: number, posicao: string) {
  const ip = NJ.papeis.indexOf(p.papel) - NJ.papeis.indexOf(pe.papel);
  let sc = NJ.peso_salario * p.salario / pe.salario + NJ.peso_premio * Math.min(NJ.tecto_extra, pe.premio ? p.premio / pe.premio : 1)
    + NJ.peso_agente * Math.min(NJ.tecto_extra, pe.agente ? p.agente / pe.agente : 1) + NJ.constante;
  sc -= Math.max(0, ip) * NJ.papel_abaixo; sc += Math.max(0, -ip) * NJ.papel_acima;
  if (p.anos > NJ.anos_livres) sc -= NJ.anos_custo * (p.anos - NJ.anos_livres);
  if (p.clausula > 0) sc += p.clausula <= NJ.clausula_multiplo * valor ? NJ.clausula_agrada : -NJ.clausula_desagrada;
  const bonusInvalido = !!p.bonus && p.bonus.tipo === 'Jogos sem sofrer golos' && !['GR', 'DC', 'DD', 'DE', 'ALD', 'ALE'].includes(posicao);
  if (p.bonus && !bonusInvalido) sc += Math.min(NJ.bonus_max, p.bonus.modo === 'Por cada' ? (p.bonus.valor * p.bonus.n / 1e6) * NJ.bonus_por_cada : (p.bonus.valor / 1e6) * NJ.bonus_ao_chegar);
  const agenteOk = p.agente >= pe.agente * NJ.agente_minimo;
  return { sc, agenteOk, bonusInvalido, ok: agenteOk && !bonusInvalido && sc >= 1 };
}

export class MercadoUtilizador {
  negs: NegUtilizador[] = [];
  /** Respostas às ofertas recebidas (id do Negocio da IA → resposta). */
  respostas = new Map<number, 'aceitar' | 'recusar' | { contra: number }>();
  shortlist: number[] = [];
  private seq = 0;
  private rodaShort = 0;

  constructor(public w: World, public m: Mercado, public clube: number) {}

  private get st() { return this.w.jogadores!; }
  activa(j: number) { return this.negs.find((n) => n.jogador === j && (n.fase === 'clube' || n.fase === 'jogador' || n.fase === 'registo')); }

  // ---------------------------------------------------------------- abrir

  abrir(j: number, tipo: TipoNeg, dia: number): NegUtilizador {
    const w = this.w, st = this.st, m = this.m, c = this.clube;
    if (this.activa(j)) throw new Error('Já estás a negociar este jogador.');
    const vend = st.clube[j];
    if (vend === c) throw new Error('O jogador já é do teu clube.');
    if (tipo === 'livre' && vend !== -3) throw new Error('O jogador não está livre.');
    if (tipo !== 'livre' && vend < 0) throw new Error('O jogador não tem clube.');
    if (tipo !== 'livre' && !m.janelaAberta(c, dia)) throw new Error('A janela de transferências está fechada.');
    if (tipo === 'clausula' && !(m.contratos.clausula[j] > 0)) throw new Error('O jogador não tem cláusula de rescisão.');
    if (tipo === 'emprestimo' && m.contratos.emprestimo.has(j)) throw new Error('O jogador já está emprestado.');
    const insc = m.podeInscrever(j, c);
    if (insc) throw new Error(`Não o podes inscrever: ${insc}.`);
    // Pedir informação sobre o jogador também o dá a conhecer.
    m.scouting.conhecer(c, j, CONHECIMENTO.ganho_proposta, dia);
    const n: NegUtilizador = {
      id: ++this.seq, tipo, jogador: j, vendedor: tipo === 'livre' ? -1 : vend, fase: 'clube', ronda: 1, tensao: NC.tensao_inicial, fala: '', inicio: dia,
      pedido: 0, piso: 0, acordo: 0, ultimaClube: null, emprestimo: null, pede: null, pede0: null, ultimaJogador: null, negocio: null, historico: [],
    };
    const vn = vend >= 0 ? w.clubes[vend].nome : '';
    if (tipo === 'transferencia') {
      const pp = precoPedido(w, m, j, c, dia, m.interessados(j).length + 1);
      n.pedido = pp.preco; n.piso = r4(pp.preco * NC.piso);
      n.fala = `${vn}: "Pedimos ${fE(n.pedido)} à vista."`;
    } else if (tipo === 'emprestimo') {
      n.fala = `${vn}: "Emprestamos se pagarem pelo menos ${Math.round(this.salarioExigido(j) * 100)}% do salário."`;
    } else {
      // Livre ou cláusula: não há negociação com o clube; segue para o jogador.
      n.acordo = tipo === 'clausula' ? m.contratos.clausula[j] : 0;
      this.paraJogador(n, dia);
    }
    n.historico.push({ dia, texto: tipo === 'clausula' ? `Pagas a cláusula de rescisão (${fE(n.acordo)})` : tipo === 'livre' ? 'Abordagem a um jogador livre' : tipo === 'emprestimo' ? `Pedido de empréstimo ao ${vn}` : `Proposta de compra ao ${vn}` });
    this.negs.push(n);
    return n;
  }

  private salarioExigido(j: number): number {
    const st = this.st, d = st.clube[j];
    const top = (this.w.plantel[d] ?? []).filter((x) => st.clube[x] === d).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 11);
    return Math.min(1, NE.salario_base + (top.includes(j) ? NE.salario_titular : 0));
  }

  private papelPedido(j: number, dia: number): Papel {
    const st = this.st, c = this.clube;
    const ordem = this.m.plantel(c).filter((x) => st.ovrNat(x) > st.ovrNat(j)).length;
    return ordem < NJ.ordem_estrela ? 'Estrela' : ordem < NJ.ordem_importante ? 'Importante' : ordem < NJ.ordem_rotacao ? 'Rotação' : st.idade(j, dia) <= NJ.idade_promessa ? 'Promessa' : 'Reserva';
  }

  private paraJogador(n: NegUtilizador, dia: number) {
    const st = this.st, j = n.jogador;
    let sal = salarioPedido(this.w, j, this.m.salarioMercado(j, this.clube, dia));
    if (n.tipo === 'livre') sal = Math.max(sal * 0.85, this.m.contratos.salarioAnterior.get(j) ?? 0);
    sal = r3(sal);
    const papel = this.papelPedido(j, dia);
    const agente = r3(Math.max(NJ.agente_fee * n.acordo, NJ.agente_salario * sal));
    n.pede = { salario: sal, premio: r3(NJ.premio * sal), agente, papel };
    n.pede0 = { salario: sal, agente };
    n.fase = 'jogador'; n.ronda = 1; n.tensao = NJ.tensao_inicial;
    n.fala = `Agente de ${st.nomes[j]}: "Ele quer ser ${papel.toLowerCase()} e pede ${fE(sal)} por ano."`;
  }

  // ---------------------------------------------------------------- propostas

  /** Avaliação da proposta ao clube (a interface usa a mesma função antes de enviar). */
  avaliarClube(n: NegUtilizador, p: PropostaClube, dia: number) {
    const troca = p.troca !== null ? valorMercado(this.w, p.troca, dia, this.w.economia!.inflacao) : 0;
    return avaliarClube(n.pedido, p, troca);
  }

  propostaClube(id: number, p: PropostaClube, dia: number) {
    const n = this.neg(id, 'clube');
    if (n.tipo !== 'transferencia') throw new Error('Esta negociação não passa pelo clube.');
    if (!(p.valor >= 0)) throw new Error('Escreve um valor.');
    if (!NC.venda_futura_opcoes.includes(p.vendaFutura)) throw new Error('Percentagem de venda futura inválida.');
    if (p.troca !== null && this.st.clube[p.troca] !== this.clube) throw new Error('O jogador da troca tem de ser do teu plantel.');
    const vn = this.w.clubes[n.vendedor].nome;
    if (this.st.clube[n.jogador] !== n.vendedor) return this.falhar(n, dia, 'O jogador já saiu do clube.');
    const av = this.avaliarClube(n, p, dia);
    n.ultimaClube = p;
    if (av.ok) {
      n.acordo = p.valor;
      n.historico.push({ dia, texto: `${vn} aceita ${fE(p.valor)}${p.vendaFutura ? ` + ${p.vendaFutura}% de venda futura` : ''}${p.troca !== null ? ` + ${this.st.nomes[p.troca]}` : ''}` });
      this.paraJogador(n, dia);
      n.fala = `Acordo com o ${vn} por ${fE(p.valor)}. ${n.fala}`;
      return n;
    }
    const falta = (av.exigido - av.efectivo) / av.exigido;
    n.tensao = Math.min(100, Math.round(n.tensao + NC.tensao_base + falta * NC.tensao_por_falta));
    if (n.tensao >= 100) { n.fase = 'rompeu'; n.fala = `${vn}: "Não há acordo possível. Terminamos aqui."`; n.historico.push({ dia, texto: `${vn} termina a negociação` }); return n; }
    n.ronda++;
    n.pedido = Math.max(n.piso, r4((n.pedido + av.efectivo) / 2));
    n.fala = falta > NC.falta_dura ? `${vn}: "Isso não é sério. Só baixamos para ${fE(n.pedido)}."` : `${vn}: "Estamos perto. Fechamos por ${fE(n.pedido)}."`;
    n.historico.push({ dia, texto: `${vn} recusa ${fE(p.valor)} e pede ${fE(n.pedido)}` });
    return n;
  }

  propostaEmprestimo(id: number, p: PropostaEmprestimo, dia: number) {
    const n = this.neg(id, 'clube');
    if (n.tipo !== 'emprestimo') throw new Error('Não é um pedido de empréstimo.');
    const vn = this.w.clubes[n.vendedor].nome;
    const exig = this.salarioExigido(n.jogador);
    const valor = valorMercado(this.w, n.jogador, dia, this.w.economia!.inflacao);
    const opcaoOk = !p.opcao || p.opcao >= NE.opcao_minima * valor;
    n.emprestimo = p;
    if (p.salario >= exig && opcaoOk) {
      n.historico.push({ dia, texto: `${vn} aceita emprestar (${Math.round(p.salario * 100)}% do salário pago por ti${p.opcao ? `, opção de compra de ${fE(p.opcao)}` : ''})` });
      return this.registar(n, dia, null);
    }
    n.tensao = Math.min(100, n.tensao + NC.tensao_base * 2);
    if (n.tensao >= 100) { n.fase = 'rompeu'; n.fala = `${vn}: "Não emprestamos."`; return n; }
    n.ronda++;
    n.fala = p.salario < exig ? `${vn}: "Só emprestamos se pagarem ${Math.round(exig * 100)}% do salário."` : `${vn}: "A opção de compra tem de ser pelo menos ${fE(r4(NE.opcao_minima * valor))}."`;
    n.historico.push({ dia, texto: `${vn} recusa os termos do empréstimo` });
    return n;
  }

  /** Avaliação da proposta ao jogador (fórmula do protótipo; a interface usa a mesma função). */
  avaliarJogador(n: NegUtilizador, p: PropostaJogador, dia: number) {
    return avaliarJogador(n.pede!, p, valorMercado(this.w, n.jogador, dia, this.w.economia!.inflacao), this.posicao(n.jogador));
  }

  private posicao(j: number) { return ['GR', 'DC', 'DD', 'DE', 'ALD', 'ALE', 'MDC', 'MC', 'MO', 'ED', 'EE', 'PL'][this.st.posNat[j]]; }

  propostaJogador(id: number, p: PropostaJogador, dia: number) {
    const n = this.neg(id, 'jogador');
    if (!NJ.papeis.includes(p.papel) || !NJ.anos_opcoes.includes(p.anos)) throw new Error('Papel ou duração inválidos.');
    if (!(p.salario > 0)) throw new Error('Escreve o salário.');
    const st = this.st, nome = st.nomes[n.jogador];
    const av = this.avaliarJogador(n, p, dia);
    n.ultimaJogador = p;
    if (av.bonusInvalido) { n.fala = `Agente: "Jogos sem sofrer golos é só para guarda-redes e defesas."`; return n; }
    if (av.ok) {
      n.historico.push({ dia, texto: `${nome} aceita: ${fE(p.salario)}/ano, ${p.papel.toLowerCase()}, ${p.anos} ${p.anos === 1 ? 'ano' : 'anos'}` });
      const u = n.ultimaClube;
      return this.registar(n, dia, { parcelas: u?.parcelas ?? 'vista', vendaFutura: u?.vendaFutura ?? 0, troca: u?.troca ?? null, premio: p.premio, agente: p.agente, anos: p.anos, clausula: p.clausula, bonus: p.bonus }, p);
    }
    n.tensao = Math.min(100, Math.round(n.tensao + NJ.tensao_base + Math.max(0, 1 - av.sc) * NJ.tensao_por_falta));
    if (n.tensao >= 100) { n.fase = 'rompeu_jogador'; n.fala = `Agente: "${nome} não quer vir. Acabaram as conversas."`; n.historico.push({ dia, texto: `${nome} recusa e termina as conversas` }); return n; }
    n.ronda++;
    const pe = n.pede!, p0 = n.pede0!;
    pe.salario = Math.max(r3(p0.salario * NJ.minimo_salario), r4(pe.salario * NJ.cede_salario + p.salario * (1 - NJ.cede_salario)));
    pe.agente = Math.max(r3(p0.agente * NJ.minimo_agente), r4(pe.agente * NJ.cede_agente + p.agente * (1 - NJ.cede_agente)));
    n.fala = !av.agenteOk ? `Agente: "A minha taxa não desce abaixo de ${fE(pe.agente * NJ.agente_minimo)}."`
      : `Agente: "Podemos baixar o salário para ${fE(pe.salario)}${NJ.papeis.indexOf(p.papel) > NJ.papeis.indexOf(pe.papel) ? `, mas ele quer ser ${pe.papel.toLowerCase()}` : ''}."`;
    n.historico.push({ dia, texto: `${nome} recusa; pede agora ${fE(pe.salario)}/ano` });
    return n;
  }

  desistir(id: number, dia: number) {
    const n = this.negs.find((x) => x.id === id);
    if (!n || (n.fase !== 'clube' && n.fase !== 'jogador')) throw new Error('Negociação inexistente ou já terminada.');
    n.fase = 'desistiu'; n.fala = 'Terminaste a negociação.';
    n.historico.push({ dia, texto: 'Terminaste a negociação' });
  }

  private neg(id: number, fase: FaseNeg): NegUtilizador {
    const n = this.negs.find((x) => x.id === id);
    if (!n) throw new Error('Negociação inexistente.');
    if (n.fase !== fase) throw new Error('A negociação não está nesta fase.');
    return n;
  }

  private falhar(n: NegUtilizador, dia: number, motivo: string) {
    n.fase = 'falhou'; n.fala = motivo; n.historico.push({ dia, texto: motivo });
    return n;
  }

  /** Acordo completo: o negócio segue para os exames e o registo no motor do mercado (na semana seguinte). */
  private registar(n: NegUtilizador, dia: number, termos: TermosUtilizador | null, p?: PropostaJogador) {
    const m = this.m, st = this.st;
    const neg = m.abrir(n.tipo === 'clausula' ? 'clausula' : n.tipo, n.jogador, this.clube, dia, n.acordo, n.acordo, {} as never);
    if (!neg) return this.falhar(n, dia, 'Já há um negócio aberto por este jogador.');
    neg.estado = 'exames';
    neg.pedido = n.acordo;
    if (p) { neg.salario = p.salario; neg.estatuto = NJ.estatuto[p.papel]; }
    else { neg.salario = st.salario[n.jogador]; }
    if (n.tipo === 'emprestimo') neg.emprestimo = { salario: n.emprestimo!.salario, opcao: n.emprestimo!.opcao, obrigacao: false };
    neg.util = termos ?? undefined;
    n.negocio = neg.id;
    n.fase = 'registo';
    n.fala = 'Acordo fechado: faltam os exames médicos e o registo.';
    return n;
  }

  /** Semana: estado dos negócios em registo; observações da shortlist. */
  semana(segunda: number) {
    const m = this.m;
    for (const n of this.negs) {
      if (n.fase !== 'registo' || n.negocio === null) continue;
      const neg = m.concluidos.find((x) => x.id === n.negocio) ?? m.negocios.find((x) => x.id === n.negocio);
      if (!neg) continue;
      if (neg.estado === 'concluido') { n.fase = 'concluida'; n.fala = `${this.st.nomes[n.jogador]} é jogador do clube.`; n.historico.push({ dia: neg.dia, texto: neg.rondas.at(-1)?.texto ?? 'Negócio concluído' }); }
      else if (neg.estado === 'falhou') { n.fase = 'falhou'; n.fala = `O negócio caiu: ${neg.motivo ?? ''}`; n.historico.push({ dia: neg.dia, texto: n.fala }); }
    }
    // Shortlist: cada olheiro observa x jogadores da lista por semana (por ordem, em roda).
    const c = this.clube, st = this.st;
    this.shortlist = this.shortlist.filter((j) => st.clube[j] !== -2 && st.clube[j] !== c);
    const olheiros = (this.w.economia?.staff.porClube[c] ?? []).filter((x) => x.cargo === 'olheiro');
    const nObs = Math.min(this.shortlist.length, olheiros.length * SL.observacoes_por_olheiro);
    const qual = olheiros.length ? olheiros.reduce((s, o) => s + (o.atributos.avaliacao ?? o.nivel), 0) / olheiros.length : 8;
    for (let k = 0; k < nObs; k++) {
      const j = this.shortlist[(this.rodaShort + k) % this.shortlist.length];
      m.scouting.conhecer(c, j, 10 + 1.2 * qual, segunda);
    }
    if (this.shortlist.length) this.rodaShort = (this.rodaShort + nObs) % this.shortlist.length;
  }

  /** Resposta a uma oferta recebida (a IA espera; sem resposta em N dias desiste). */
  respostaOferta(n: Negocio): 'aceitar' | 'recusar' | { contra: number } | 'aguarda' | 'expirou' {
    const r = this.respostas.get(n.id);
    if (r) { this.respostas.delete(n.id); return r; }
    if (n.dia - n.inicio > OR.espera_dias) return 'expirou';
    return 'aguarda';
  }

  responder(id: number, r: 'aceitar' | 'recusar' | { contra: number }) {
    const n = this.m.negocios.find((x) => x.id === id && x.vendedor === this.clube && x.estado === 'oferta');
    if (!n) throw new Error('A oferta já não está activa.');
    if (typeof r === 'object' && !(r.contra > n.oferta)) throw new Error('A contra-proposta tem de ser maior do que a oferta.');
    this.respostas.set(id, r);
    n.aguardaUtilizador = false;
  }

  listar(j: number, listado: boolean) {
    if (this.st.clube[j] !== this.clube) throw new Error('O jogador não é do teu clube.');
    this.m.contratos.listado[j] = listado ? 1 : 0;
  }

  marcar(j: number, sim: boolean) {
    if (sim) {
      if (this.shortlist.includes(j)) return;
      if (this.shortlist.length >= SL.maximo) throw new Error(`A shortlist está cheia (${SL.maximo}).`);
      if (this.st.clube[j] === this.clube) throw new Error('O jogador já é do teu clube.');
      this.shortlist.push(j);
    } else this.shortlist = this.shortlist.filter((x) => x !== j);
  }
}

export { ESTATUTOS };
