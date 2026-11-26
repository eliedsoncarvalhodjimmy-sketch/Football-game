// Valor de mercado e preço pedido (Prompt 4, Bloco A). Todos os factores limitados e em config/valor.ts.
import { VALOR as V, PRECO as P } from '../config/valor.ts';
import { POSICOES, type Posicao } from '../config/papeis.ts';
import { VALOR_MERCADO, type Curva } from '../config/valorMercado.ts';
import { PLANO_PLANTEL } from '../config/negociacao.ts';
import type { World } from '../engine/world.ts';
import type { Mercado } from './mercado.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
export const grupoPos = (pos: number) => GRUPO[POSICOES[pos]];
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Valor de mercado (€): OVR, potencial, idade, posição, contrato restante, inflação; comprimido acima de 20 M€ e com
 *  tecto (200 M€; 300 M€ para os 3 mais valiosos do mundo). */
export function valorMercado(w: World, j: number, dia: number, inflacao = 1): number {
  const v = valorBruto(w, j, dia, inflacao);
  const top3 = w.mercado ? v >= w.mercado.limiarTop3 : false;
  return Math.min(v, top3 ? V.tecto_top3 : V.tecto);
}

/** Valor sem tecto (já comprimido): para escolher o top 3 do mundo. */
export function valorBruto(w: World, j: number, dia: number, inflacao = 1): number {
  const st = w.jogadores!;
  const ovr = st.ovrNat(j);
  const idade = st.idade(j, dia);
  let v = V.referencia * Math.exp(V.por_ponto_ovr * (ovr - V.ovr_referencia)) * V.idade(idade) * (V.posicao[grupoPos(st.posNat[j])] ?? 1);
  if (idade <= 24) v *= 1 + Math.min(V.potencial_maximo, Math.max(0, st.pot[j] - ovr) * V.potencial_por_ponto);
  const anos = st.clube[j] >= 0 ? Math.max(0, (st.fimContrato[j] - dia) / 365) : 0;
  v *= st.clube[j] >= 0 ? V.contrato(anos) : 0.3;
  v *= inflacao;
  const K = V.compressao.acima;
  if (v > K) v = K * Math.pow(v / K, V.compressao.expoente);
  return Math.max(V.minimo, Math.round(v / 1000) * 1000);
}

export interface PrecoPedido {
  valor: number;
  preco: number;
  factores: Record<string, number>;
}

/** Preço pedido pelo vendedor a um comprador (factores limitados; razão preço/valor dentro da faixa). */
export function precoPedido(w: World, m: Mercado, j: number, comprador: number, dia: number, interessados = 1): PrecoPedido {
  const st = w.jogadores!, e = w.economia!;
  const vend = st.clube[j];
  const valor = valorMercado(w, j, dia, e.inflacao);
  const f: Record<string, number> = {};
  f.necessidade = P.necessidade[e.clubes.saude[vend]] ?? 1;
  if (m.contratos.listado[j] === 3) f.necessidade = Math.min(f.necessidade, P.necessidade[3]);
  // Excedente do plano à venda: mais barato, e ainda mais nas últimas semanas da janela (vender antes de rescindir).
  if (m.contratos.listado[j] === 1 && m.planos.excedente(vend, j)) {
    const D = PLANO_PLANTEL.excedente_desconto;
    f.excedente = m.fimJanela(vend, dia) - dia <= D.semanas_finais * 7 ? D.final : D.normal;
  }
  // Pechincha: o contrato acaba e o vendedor não o vai renovar (prefere vender barato a perdê-lo a custo zero).
  if ((st.fimContrato[j] - dia) / 365 < P.fim_contrato.anos && (m.contratos.listado[j] > 0 || !m.planos.porClube.get(vend)?.lugar.has(j))) f.fim_contrato = P.fim_contrato.factor;
  // Importância no plantel e na filosofia.
  const plantel = w.plantel[vend].filter((x) => st.clube[x] === vend).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
  const ordem = plantel.indexOf(j);
  f.importancia = ordem >= 0 && ordem < 3 ? P.chave : ordem >= 0 && ordem < 11 ? P.titular : 1;
  const casa = m.contratos.formadoClube[j] === vend && st.idade(j, dia) <= 23;
  if (casa) f.importancia *= P.jovem_casa;
  // Comprador: riqueza e liga.
  const ind = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.indice_riqueza : 20);
  const fd = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.forca_desportiva : 30);
  f.riqueza_comprador = clamp(1 + (P.riqueza_comprador * (ind(comprador) - ind(vend))) / 100, P.riqueza_limites[0], P.riqueza_limites[1]);
  f.liga_comprador = clamp(1 + P.liga_comprador * (fd(comprador) - fd(vend)), P.liga_limites[0], P.liga_limites[1]);
  f.concorrencia = Math.min(P.concorrencia_maximo, 1 + P.concorrencia * Math.max(0, interessados - 1));
  f.rivalidade = 1 + P.rivalidade * e.intensidadeRival(vend, comprador);
  if (w.liga[vend] === w.liga[comprador] && w.reputacao[comprador] > w.reputacao[vend]) f.rivalidade *= P.mesma_liga;
  // Arquétipo do vendedor.
  const arq = e.ia?.arquetipo[vend];
  f.arquetipo = 1;
  if (arq === 'vendedor') f.arquetipo = P.arquetipo.vendedor;
  else if (arq === 'formador' && casa) f.arquetipo = P.arquetipo.formador_jovem;
  else if (arq === 'tradicional' && ordem >= 0 && ordem < 5 && dia - m.contratos.chegada[j] >= P.idolo_anos * 365) f.arquetipo = P.arquetipo.tradicional_idolo;
  // Talento de potencial absurdo num clube de menor expressão: pode sair por mais de 5× o valor.
  const T = P.talento;
  const absurdo = st.idade(j, dia) <= T.idade && st.pot[j] >= T.potencial && w.reputacao[vend] <= w.reputacao[comprador] - T.diferenca_reputacao;
  if (absurdo) f.talento = Math.min(T.factor_maximo, 1 + T.por_ponto * (st.pot[j] - T.base));
  // Marca dos prémios (Prompt 8, Bloco C): no preço pedido, nunca no valor de mercado.
  const marca = w.prestigio?.marca(j, dia) ?? 1;
  if (marca > 1) f.marca = marca;
  let preco = valor;
  for (const x of Object.values(f)) preco *= x;
  preco = Math.min(P.preco_maximo, clamp(preco, P.razao[0] * valor, (absurdo ? T.razao_maxima : P.razao[1]) * valor));
  return { valor, preco: Math.round(preco / 10000) * 10000, factores: f };
}

// ---------------------------------------------------------------- Prompt 6B: fórmula própria (ainda não ligada)
// Qefectiva = OVR + w(idade) × (POT − OVR); V_base = V_ref × exp(β × (Q − Q_ref)) × convexidade do topo;
// Valor = V_base × F_idade × F_contrato × F_liga × F_clube × F_posição × F_visibilidade × F_forma × F_lesão × F_inflação
//         × (1 + ruído determinístico). Números em config/valorMercado.ts (hipóteses do Bloco 1, a calibrar).

/** Interpolação linear numa curva (x → y), constante fora das pontas. */
export function curva(c: Curva, x: number): number {
  if (x <= c[0][0]) return c[0][1];
  for (let k = 1; k < c.length; k++) if (x <= c[k][0]) { const [x0, y0] = c[k - 1], [x1, y1] = c[k]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return c[c.length - 1][1];
}

/** Hash determinístico (jogador, trimestre) → [−1, 1]. */
function ruido(j: number, t: number): number {
  let h = (j * 374761393 + t * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1;
}

export interface OpcoesValor {
  /** Clubes nas competições continentais desta época (F_visibilidade). */
  europa?: Set<number>;
  /** Dia de referência da inflação (início do mundo). */
  diaBase?: number;
  /** Decomposição por factor (para a calibração e os testes). */
  factores?: boolean;
}

/** Factores por clube (calculados uma vez por actualização, não por jogador). */
function factoresClube(w: World, opc: OpcoesValor) {
  const VM = VALOR_MERCADO, n = w.clubes.length;
  const liga = new Float64Array(n), rep = new Uint8Array(n), eur = new Uint8Array(n);
  for (let c = 0; c < n; c++) {
    const l = w.liga[c];
    const id = l >= 0 ? w.ligas[l].regras.id : '';
    const riq = l >= 0 ? w.ligas[l].regras.indice_riqueza : 0;
    liga[c] = VM.liga[id] ?? VM.liga_min + (1 - VM.liga_min) * Math.min(1, riq / VM.liga_riqueza_ref);
    rep[c] = w.reputacao[c];
    eur[c] = opc.europa?.has(c) ? 1 : 0;
  }
  return { liga, rep, eur };
}

/** F_clube pela reputação do clube (escalões), mais forte em jovens e mais fraco em veteranos. */
function fClube(rep: number, idade: number): number {
  const C = VALOR_MERCADO.clube;
  const base = rep >= C.gigante.rep ? C.gigante.f : rep >= C.grande.rep ? C.grande.f : rep >= C.medio.rep ? C.medio.f : C.pequeno;
  return 1 + (base - 1) * curva(VALOR_MERCADO.clube_idade, idade);
}

/** Valor de um jogador pela fórmula (Prompt 6B), com a decomposição por factor se pedida. Sem arredondamento. */
export function valorFormula(w: World, j: number, dia: number, opc: OpcoesValor = {}): { valor: number; f?: Record<string, number> } {
  const f: Record<string, number> | undefined = opc.factores ? {} : undefined;
  const valor = calcValor(w, j, dia, opc, factoresClube(w, opc), f);
  return f ? { valor, f } : { valor };
}

/** O cálculo (um número; sem objectos por jogador, salvo a decomposição pedida). */
function calcValor(w: World, j: number, dia: number, opc: OpcoesValor, fc: ReturnType<typeof factoresClube>, f?: Record<string, number>): number {
  const VM = VALOR_MERCADO, st = w.jogadores!;
  const idade = st.idade(j, dia), pos = POSICOES[st.posNat[j]] as Posicao, c = st.clube[j];
  const ovr = st.ovrNat(j), pot = Math.max(ovr, st.pot[j]);
  const q = ovr + curva(VM.peso_potencial, idade) * (pot - ovr);
  const base = VM.v_ref * Math.exp(VM.beta * (q - VM.q_ref)) * Math.exp(VM.topo.gama * Math.max(0, q - VM.topo.q));
  const fIdade = pos === 'GR' && VM.idade_gr ? curva(VM.idade_gr, idade) : curva(VM.idade, idade - (VM.desvio_idade[pos] ?? 0));
  const anos = c >= 0 ? Math.max(0, (st.fimContrato[j] - dia) / 365) : 0;
  let fContrato = c >= 0 ? curva(VM.contrato, anos) : VM.livre;
  if (c >= 0 && idade >= VM.contrato_idade_fraco) fContrato = 1 - (1 - fContrato) / 2;
  const fLiga = c >= 0 ? fc.liga[c] : VM.liga_min;
  const fCl = c >= 0 ? fClube(fc.rep[c], idade) : 1;
  const fPos = VM.posicao[pos] ?? 1;
  const V = VM.visibilidade;
  const fVis = 1 + Math.min(V.maximo, V.max_int * Math.min(1, st.internacionalizacoes[j] / V.int_ref) + (c >= 0 && fc.eur[c] ? V.europa : 0));
  const F = VM.forma, jogos = st.eJogos[j];
  let fForma = 1;
  if (jogos >= F.jogos_min) fForma += F.por_ponto_nota * (st.eNotas[j] / jogos / 10 - F.nota_ref);
  fForma = Math.max(1 - F.maximo, Math.min(1 + F.maximo, fForma));
  const fLesao = curva(VM.lesao, Math.max(0, st.indisponivelAte[j] - dia));
  const fInfl = Math.pow(1 + VM.inflacao_anual, Math.max(0, dia - (opc.diaBase ?? dia)) / 365);
  const trimestre = Math.floor(dia / 91);
  const fRuido = 1 + VM.ruido * ruido(j, trimestre);
  const valor = Math.max(VM.minimo, Math.min(VM.tecto, base * fIdade * fContrato * fLiga * fCl * fPos * fVis * fForma * fLesao * fInfl * fRuido));
  if (f) Object.assign(f, { q, base, idade: fIdade, contrato: fContrato, liga: fLiga, clube: fCl, posicao: fPos, visibilidade: fVis, forma: fForma, lesao: fLesao, inflacao: fInfl, ruido: fRuido });
  return valor;
}

/** Recálculo de todos os jogadores (arrays tipados; os factores de clube uma só vez). */
export function calcularValores(w: World, dia: number, opc: OpcoesValor = {}, out?: Float64Array): Float64Array {
  const st = w.jogadores!;
  const r = out && out.length >= st.n ? out : new Float64Array(st.n);
  const fc = factoresClube(w, opc);
  for (let j = 0; j < st.n; j++) r[j] = st.clube[j] === -2 ? 0 : calcValor(w, j, dia, opc, fc);
  return r;
}
