// Dívida, administração, fair play financeiro, donos e venda de clubes (Prompt 3, Bloco B).
// Funções chamadas pelo motor económico: mensal (financiamento, amortização, insolvência),
// fecho de época (amortização bancária, sanções, objectivo do dono, venda, eventos raros) e abertura (objectivo, injecção, pontos).
import { Rng } from '../core/rng.ts';
import { DIVIDA as DV, ADMINISTRACAO as AD, RECUPERACAO as RJ, PONTOS_CAIXA as PC, FAIR_PLAY_AVISO as FPA, INJECCAO_MAXIMA } from '../config/divida.ts';
import { DONOS as DN, VENDA as VD, EVENTOS_RAROS as ER } from '../config/donos.ts';
import { CONTRATOS as K } from '../config/economia.ts';
import { INFRA, TIPOS_INFRA } from '../config/infraestruturas.ts';
import { N_INFRA } from './store.ts';
import { factorCustoInfra } from './controlador.ts';
import { indiceRiqueza } from '../economia/contratos.ts';
import { gerarDono, fortuna, capacidadeAnual, politicaDivida, objectivo, cumpriu, sortearTipo, type Dono } from '../donos/dono.ts';
import type { Economia } from '../economia/motorEconomico.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import type { RegistoEpoca } from '../engine/history.ts';

export type TipoEvento = 'capital_dono' | 'emprestimo_dono' | 'emprestimo_banco' | 'amortizacao' | 'administracao' | 'saida_administracao' | 'recuperacao_judicial' | 'aviso' | 'aviso_ffp' | 'limite_divida' | 'fim_proibicao' | 'venda' | 'evento_raro' | 'injeccao_anual' | 'pontos';

export interface EventoClube {
  dia: number;
  clube: number;
  tipo: TipoEvento;
  texto: string;
  valor?: number;
}

const despesaMensal = (e: Economia, c: number) => Math.max(1, e.despesaAnual(c) / 12);

function evento(e: Economia, ev: EventoClube) {
  e.eventos.push(ev);
}

/** Dinheiro que o dono ainda pode pôr nesta época: a capacidade dele, até 25% da receita (capital; empréstimos à parte). */
function capacidadeRestante(e: Economia, c: number, capital = true): number {
  const d = e.donos[c];
  if (!d) return 0;
  const cap = capacidadeAnual(d);
  return Math.max(0, (capital ? Math.min(cap, INJECCAO_MAXIMA * Math.max(1, e.clubes.receitaPrevista[c])) : cap) - e.clubes.injeccoes[c]);
}

/** Dívida efectiva ÷ receita: banco + dono + parcelas + caixa negativa (salários e fornecedores em atraso). */
export function racioDivida(e: Economia, c: number): number {
  const s = e.clubes;
  return (s.divida(c) + Math.max(0, -s.caixa[c])) / Math.max(1, s.receitaPrevista[c]);
}

/** Meses de salários em atraso (caixa negativa ÷ salários mensais). */
export function mesesAtraso(e: Economia, c: number): number {
  const s = e.clubes;
  return s.caixa[c] >= 0 ? 0 : -s.caixa[c] / Math.max(1, s.folha[c] / 12);
}

/** Dia em que fecha a próxima janela de transferências da liga do clube (ou a actual, se estiver aberta). */
export function fimProximaJanela(e: Economia, c: number, dia: number): number {
  const l = e.w.liga[c];
  const janelas = l >= 0 ? e.w.ligas[l].regras.janelas_transferencias : [];
  if (!janelas?.length) return dia + 120;
  const ano = new Date(dia * 864e5).getUTCFullYear();
  let melhor = Infinity;
  for (const jn of janelas) for (const a of [ano - 1, ano, ano + 1]) {
    const [m, d] = jn.fecha.split('-').map(Number);
    const [ma, da] = jn.abre.split('-').map(Number);
    const abre = Math.floor(Date.UTC(a, ma - 1, da) / 864e5);
    let fecha = Math.floor(Date.UTC(a, m - 1, d) / 864e5);
    if (fecha < abre) fecha = Math.floor(Date.UTC(a + 1, m - 1, d) / 864e5);
    if (fecha > dia && fecha < melhor) melhor = fecha;
  }
  return melhor === Infinity ? dia + 120 : melhor;
}

// ---------------------------------------------------------------- mensal

export function gerirMes(e: Economia, c: number, dia: number) {
  const w = e.w, s = e.clubes;
  const receita = Math.max(1, s.receitaPrevista[c]);
  const rng = Rng.de(w.semente, 'financas-mes', w.clubes[c].id, dia);
  // 1. Falta de caixa: o clube pede dinheiro pela ordem do controlador.
  const reserva = DV.reserva_meses * despesaMensal(e, c);
  if (s.caixa[c] < reserva && !s.administracaoAte[c]) {
    for (const via of e.controlador(c).financiamento(w, e, c, reserva - s.caixa[c])) {
      const defice = reserva - s.caixa[c];
      if (defice <= 0) break;
      const d = e.donos[c];
      if (via === 'capital_dono' && d) {
        const p = Math.max(DN.socorro_minimo, (d.atributos.lealdade + d.atributos.riqueza) / 40);
        const v = Math.min(defice, capacidadeRestante(e, c));
        if (v > 0 && rng.chance(p)) { s.caixa[c] += v; s.injeccoes[c] += v; evento(e, { dia, clube: c, tipo: 'capital_dono', texto: 'o dono injecta capital', valor: v }); }
      } else if (via === 'emprestimo_dono' && d && d.atributos.lealdade >= 12) {
        const v = Math.min(defice, capacidadeRestante(e, c, false));
        if (v > 0) { s.caixa[c] += v; s.dividaDono[c] += v; evento(e, { dia, clube: c, tipo: 'emprestimo_dono', texto: 'empréstimo do dono', valor: v }); }
      } else if (via === 'banco') {
        const tecto = Math.min(DV.limite_banco, d ? politicaDivida(d) : DV.limite_banco) * receita;
        const div = s.divida(c);
        const saude = e.calcularSaude(c);
        if (saude === 2 && div > tecto / 2) continue;
        const v = Math.min(defice, tecto - div);
        if (v > 0) {
          s.caixa[c] += v;
          const j = DV.juro_base + DV.premio_saude[Math.min(2, saude)];
          s.juroBanco[c] = s.dividaBanco[c] > 0 ? (s.juroBanco[c] * s.dividaBanco[c] + j * v) / (s.dividaBanco[c] + v) : j;
          s.dividaBanco[c] += v;
          evento(e, { dia, clube: c, tipo: 'emprestimo_banco', texto: `empréstimo bancário a ${(100 * j).toFixed(1)}%`, valor: v });
        }
      }
    }
  } else if (s.dividaBanco[c] > 0 && s.caixa[c] > DV.amortizar_acima_meses * despesaMensal(e, c)) {
    const v = Math.min(s.dividaBanco[c], DV.amortizar_fraccao * (s.caixa[c] - DV.amortizar_acima_meses * despesaMensal(e, c)));
    s.caixa[c] -= v;
    s.dividaBanco[c] -= v;
    evento(e, { dia, clube: c, tipo: 'amortizacao', texto: 'amortiza dívida bancária', valor: v });
  }
  const r = racioDivida(e, c);
  // 2. Administração (dívida > 3,5×) e saída quando regulariza.
  if (s.administracaoAte[c]) {
    if (r <= AD.regularizado && s.caixa[c] >= 0) {
      s.administracaoAte[c] = 0;
      s.proibidoAte[c] = dia;
      s.saude[c] = e.calcularSaude(c);
      evento(e, { dia, clube: c, tipo: 'saida_administracao', texto: 'situação regularizada: sai de administração e acaba a proibição de contratar' });
    } else s.proibidoAte[c] = Math.max(s.proibidoAte[c], dia + 31);
  } else if (r > AD.divida) { entrarAdministracao(e, c, dia); return; }
  // 3. Recuperação judicial (dívida > 2,5×), a pedido do dono.
  else if (r > RJ.divida && (!s.rjUltimo[c] || dia - s.rjUltimo[c] > RJ.intervalo_anos * 365) && e.controlador(c).pedirRecuperacao(w, e, c)) recuperacaoJudicial(e, c, dia);
  // 4. Limite de dívida (> 1,5×): proibição de contratar até voltar a 1× (a multa é anual, no fecho de época).
  if (r > DV.limite_sancao && !s.banDivida[c]) {
    s.banDivida[c] = 1;
    evento(e, { dia, clube: c, tipo: 'limite_divida', texto: `dívida de ${r.toFixed(2)}× a receita: proibição de contratar até voltar a ${DV.saida_proibicao}×` });
  } else if (s.banDivida[c] && r <= DV.saida_proibicao) {
    s.banDivida[c] = 0;
    evento(e, { dia, clube: c, tipo: 'fim_proibicao', texto: 'dívida de volta a 1× a receita: acaba a proibição de contratar' });
  }
  if (s.banDivida[c]) s.proibidoAte[c] = Math.max(s.proibidoAte[c], dia + 31);
  // 5. Avisos: dívida ≥ 1,2× (uma vez por subida), caixa negativa, salários em atraso.
  if (r >= DV.aviso && !s.avisoDivida[c]) { s.avisoDivida[c] = 1; evento(e, { dia, clube: c, tipo: 'aviso', texto: `aviso: dívida de ${r.toFixed(2)}× a receita` }); }
  else if (r < DV.aviso) s.avisoDivida[c] = 0;
  // 6. Perda de pontos: caixa < −15% da receita ou mais de 2 meses de salários em atraso (um aviso por mês; 2.º −3, 3.º −9, em 12 meses).
  if (s.caixa[c] < -PC.caixa_negativa * receita || mesesAtraso(e, c) > PC.atraso_meses) {
    if (s.avisoUltimo[c] && dia - s.avisoUltimo[c] < PC.intervalo_dias) return;
    s.avisoUltimo[c] = dia;
    if (!s.avisosN[c] || dia - s.avisosDesde[c] > PC.janela_dias) { s.avisosN[c] = 0; s.avisosDesde[c] = dia; }
    const n = Math.min(PC.pontos.length, s.avisosN[c] + 1);
    s.avisosN[c] = n;
    const pts = PC.pontos[n - 1] ?? 0;
    const motivo = s.caixa[c] < -PC.caixa_negativa * receita ? `caixa de ${(s.caixa[c] / 1e6).toFixed(1)} M€` : `${mesesAtraso(e, c).toFixed(1)} meses de salários em atraso`;
    evento(e, { dia, clube: c, tipo: 'aviso', texto: `${n}.º aviso (${motivo})${pts ? `: −${pts} pontos` : ''}` });
    if (pts) e.penalizar(c, pts, 'caixa/salários em atraso', dia);
  }
}

/** Recuperação judicial: −6 pontos, proibição de contratar durante a próxima janela, dívida bancária renegociada (juro e prazo). */
export function recuperacaoJudicial(e: Economia, c: number, dia: number) {
  const s = e.clubes;
  s.rjUltimo[c] = dia;
  e.penalizar(c, RJ.pontos, 'recuperação judicial', dia);
  const fim = fimProximaJanela(e, c, dia);
  s.proibidoAte[c] = Math.max(s.proibidoAte[c], fim);
  s.juroBanco[c] = RJ.juro;
  s.prazoBanco[c] = RJ.prazo_anos;
  evento(e, { dia, clube: c, tipo: 'recuperacao_judicial', texto: `recuperação judicial: −${RJ.pontos} pontos, proibição de contratar até ${new Date(fim * 864e5).toISOString().slice(0, 10)}, dívida renegociada (${100 * RJ.juro}%, ${RJ.prazo_anos} anos)`, valor: s.divida(c) });
}

export function entrarAdministracao(e: Economia, c: number, dia: number) {
  const w = e.w, s = e.clubes, st = w.jogadores;
  const receita = Math.max(1, s.receitaPrevista[c]);
  s.administracaoAte[c] = dia;
  s.proibidoAte[c] = Math.max(s.proibidoAte[c], dia + 31);
  s.saude[c] = 3;
  e.penalizar(c, AD.pontos, 'administração', dia);
  // Venda forçada (até ao mercado do Prompt 4: saída para a lista de livres) dos salários mais altos, sem tocar nos melhores.
  let saidas = 0;
  if (st) {
    const todos = w.plantel[c].filter((j) => st.clube[j] === c);
    const melhores = new Set([...todos].sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, AD.protegidos));
    let folha = todos.reduce((x, j) => x + st.salario[j], 0);
    const plantel = todos.filter((j) => !melhores.has(j)).sort((a, b) => st.salario[b] - st.salario[a]);
    let n = todos.length;
    for (const j of plantel) {
      if (folha <= AD.massa_alvo * receita || n <= K.plantel_minimo) break;
      folha -= st.salario[j];
      st.clube[j] = -3; st.salario[j] = 0; e.livres.push(j); n--; saidas++;
    }
    w.plantel[c] = w.plantel[c].filter((j) => st.clube[j] === c);
    s.folha[c] = folha;
  }
  const antes = s.divida(c) + Math.max(0, -s.caixa[c]);
  s.dividaBanco[c] *= 1 - AD.perdao;
  s.dividaParcelas[c] *= 1 - AD.perdao;
  s.dividaDono[c] = 0;
  s.caixa[c] = AD.caixa_nova * receita;
  const d = e.donos[c];
  const texto = `entra em administração: −${AD.pontos} pontos, proibição de contratar até regularizar, ${saidas} jogadores saem, dívida de ${(antes / 1e6).toFixed(1)} para ${(s.divida(c) / 1e6).toFixed(1)} M€`;
  evento(e, { dia, clube: c, tipo: 'administracao', texto, valor: antes - s.divida(c) });
  // Perda do controlo do clube: novo dono por valor baixo (nos clubes de sócios, uma comissão administrativa até regularizar).
  if (d && d.tipo !== 'adeptos') trocarDono(e, c, dia, 'administração', AD.preco * receita, Rng.de(w.semente, 'administracao', w.clubes[c].id, dia));
  else if (d) evento(e, { dia, clube: c, tipo: 'evento_raro', texto: 'os sócios perdem o controlo: comissão administrativa até regularizar' });
}

// ---------------------------------------------------------------- fecho de época

export function fecharEpocaFinancas(e: Economia, t: Temporada, reg: RegistoEpoca) {
  const w = e.w, s = e.clubes;
  const dia = t.base + 51 * 7;
  const posicao = new Map<number, [string, number, number]>();
  for (const [id, tab] of Object.entries(reg.tabelas)) tab.forEach((l, i) => posicao.set(l.clube, [id, i + 1, tab.length]));
  const subidos = new Set(reg.movimentos.filter((m) => m.via !== 'exterior' && e.nivelLiga(m.para) < e.nivelLiga(m.de)).map((m) => m.clube));
  for (const [c, [id, pos, n]] of posicao) {
    if (c >= s.n) continue;
    const rng = Rng.de(w.semente, 'financas-ano', w.clubes[c].id, t.ano);
    const b = s.balancos[c].at(-1);
    const receita = Math.max(1, b?.receita ?? s.receitaPrevista[c]);
    // Amortização anual da dívida bancária (capital).
    if (s.dividaBanco[c] > 0) {
      const v = Math.min(s.dividaBanco[c], s.dividaBanco[c] / (s.prazoBanco[c] || DV.prazo_anos));
      s.caixa[c] -= v;
      s.dividaBanco[c] -= v;
    }
    // Fair play salarial: a massa acima do balizador da liga (ou perto dele) dá aviso.
    if (b) {
      const limite = e.limiteFairPlay(c);
      const m = b.massaSalarial / receita;
      if (m > limite - FPA.perto) evento(e, { dia, clube: c, tipo: 'aviso_ffp', texto: `${id}: aviso do fair play (massa salarial ${Math.round(100 * m)}% da receita, balizador ${Math.round(100 * limite)}%)` });
    }
    // Limite de dívida: multa anual de 2% da receita enquanto durar a proibição.
    if (s.banDivida[c]) {
      s.lancar(c, 'multas', DV.multa_limite * receita);
      evento(e, { dia, clube: c, tipo: 'limite_divida', texto: `multa anual do limite de dívida (${(100 * DV.multa_limite).toFixed(0)}% da receita)`, valor: DV.multa_limite * receita });
    }
    // Dono: objectivo, venda, eventos raros.
    const d = e.donos[c];
    if (!d) continue;
    const ok = cumpriu(e.objectivos[c] ?? 'manutenção', pos, n, e.nivelLiga(id), subidos.has(c));
    s.objectivoFalhado[c] = ok ? 0 : Math.min(255, s.objectivoFalhado[c] + 1);
    if (d.idade) d.idade++;
    avaliarVenda(e, c, dia, rng);
  }
}

/** Preço do clube = múltiplo × receita + instalações + caixa − dívida (mínimo: fracção da receita). */
export function precoClube(e: Economia, c: number): number {
  const s = e.clubes;
  const receita = Math.max(1, s.balancos[c].at(-1)?.receita ?? s.receitaPrevista[c]);
  const fc = factorCustoInfra(indiceRiqueza(e.w, c));
  let infra = 0;
  TIPOS_INFRA.forEach((tipo, k) => { const t = INFRA[tipo]; for (let n = 1; n < s.infra[c * N_INFRA + k]; n++) infra += 0.5 * fc * t.base * Math.pow(t.crescimento, n); });
  return Math.max(VD.minimo_receita * receita, VD.multiplo_receita * receita + infra + Math.max(0, s.caixa[c]) - s.divida(c));
}

function avaliarVenda(e: Economia, c: number, dia: number, rng: Rng) {
  const w = e.w, s = e.clubes, d = e.donos[c];
  if (!d || d.tipo === 'adeptos' || dia < d.luaDeMelAte || s.administracaoAte[c]) return;
  // Eventos raros.
  if (d.idade >= ER.retira_idade && rng.chance(ER.retira)) {
    if (d.tipo === 'familia') {
      const h = gerarDono(w, c, rng, dia, 'familia');
      h.nome = `${d.nome.split(' ').slice(-1)[0]} (herdeiros)`;
      h.idade = rng.int(35, 55);
      e.donos[c] = h;
      evento(e, { dia, clube: c, tipo: 'evento_raro', texto: `o dono retira-se; os herdeiros ficam com o clube` });
      return;
    }
    trocarDono(e, c, dia, 'o dono retira-se', precoClube(e, c), rng);
    return;
  }
  if (rng.chance(ER.escandalo)) { trocarDono(e, c, dia, 'escândalo: venda forçada', 0.7 * precoClube(e, c), rng); return; }
  if (rng.chance(ER.perda_riqueza)) {
    d.atributos.riqueza = Math.max(1, d.atributos.riqueza - rng.int(3, 6));
    evento(e, { dia, clube: c, tipo: 'evento_raro', texto: 'o grupo do dono perde riqueza' });
  }
  if (w.reputacao[c] >= ER.magnata_reputacao_min && rng.chance(ER.magnata)) { trocarDono(e, c, dia, 'compra por um magnata', 1.3 * precoClube(e, c), rng, rng.chance(0.5) ? 'estado' : 'bilionario'); return; }
  // Venda por maus resultados, dívida ou perda de riqueza.
  const hist = s.historicoReputacao(c);
  const queda = hist.length >= 3 && hist[hist.length - 3] - hist[hist.length - 1] > VD.queda_reputacao;
  const maus = queda || s.objectivoFalhado[c] >= 2;
  const receita = Math.max(1, s.receitaPrevista[c]);
  const pobre = fortuna(d) < 0.5 * Math.max(0, -s.resultadoUltimo(c));
  let p = VD.base + (maus ? VD.maus_resultados : 0) + (s.divida(c) > 1.2 * receita ? VD.divida : 0) + (pobre ? VD.perda_riqueza : 0);
  p = Math.min(VD.maximo, p * (1.5 - d.atributos.lealdade / 20));
  if (rng.chance(p)) trocarDono(e, c, dia, maus ? 'maus resultados' : s.divida(c) > 1.2 * receita ? 'dívida elevada' : 'venda', precoClube(e, c), rng);
}

/** Muda o dono: comprador gerado com fortuna suficiente, lua de mel, injecção, dívida, obras. */
export function trocarDono(e: Economia, c: number, dia: number, motivo: string, preco: number, rng: Rng, tipo?: Dono['tipo']) {
  const w = e.w, s = e.clubes;
  const antigo = e.donos[c];
  let novo = gerarDono(w, c, rng, dia, tipo ?? sortearTipo(w.clubes[c].pais, w.reputacao[c], rng, true));
  for (let k = 0; k < 5 && antigo && novo.nome === antigo.nome; k++) novo = gerarDono(w, c, rng, dia, novo.tipo);
  for (let k = 0; k < 6 && fortuna(novo) < VD.fortuna_preco * preco; k++) novo.atributos.riqueza = Math.min(20, novo.atributos.riqueza + 1);
  novo.luaDeMelAte = dia + VD.lua_de_mel_meses * 30;
  e.donos[c] = novo;
  const receita = Math.max(1, s.receitaPrevista[c]);
  const inj = Math.min(capacidadeRestante(e, c), (VD.injeccao_inicial * receita * novo.atributos.ambicao) / 20);
  s.caixa[c] += inj;
  s.injeccoes[c] += inj;
  let pago = 0;
  if (novo.atributos.risco < 10 || fortuna(novo) > 20 * receita) { pago = VD.paga_divida * s.dividaBanco[c]; s.dividaBanco[c] -= pago; }
  s.dividaDono[c] = 0;
  s.orcInfra[c] *= 1 + novo.atributos.ambicao / 20;
  s.objectivoFalhado[c] = 0;
  evento(e, { dia, clube: c, tipo: 'venda', texto: `vendido (${motivo}) por ${(preco / 1e6).toFixed(1)} M€: ${antigo ? `${antigo.nome} → ` : ''}${novo.nome} (${novo.tipo}); injecção ${(inj / 1e6).toFixed(1)} M€${pago ? `, paga ${(pago / 1e6).toFixed(1)} M€ de dívida` : ''}`, valor: preco });
}

// ---------------------------------------------------------------- abertura de época

export function abrirEpocaFinancas(e: Economia, t: Temporada) {
  const w = e.w, s = e.clubes;
  for (const p of t.pacotes) for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
    if (!e.donos[c]) e.donos[c] = gerarDono(w, c, Rng.de(w.semente, 'dono', w.clubes[c].id), t.base);
    const d = e.donos[c];
    s.injeccoes[c] = 0;
    e.objectivos[c] = objectivo(w, c, d);
    // Injecção anual de um dono ambicioso.
    if (d.atributos.ambicao > DN.injeccao_limiar_ambicao && !s.administracaoAte[c]) {
      const v = Math.min(capacidadeRestante(e, c), ((d.atributos.ambicao - DN.injeccao_limiar_ambicao) / 10) * DN.injeccao_fraccao_receita * s.receitaPrevista[c]);
      if (v > 0) { s.caixa[c] += v; s.injeccoes[c] += v; evento(e, { dia: t.base, clube: c, tipo: 'injeccao_anual', texto: `${d.nome} injecta capital (objectivo: ${e.objectivos[c]})`, valor: v }); }
    }
  }
  // Pontos deduzidos pendentes, na liga desta época.
  for (const [c, pts] of [...e.pontosPendentes]) {
    const l = w.liga[c];
    if (l < 0) { e.pontosPendentes.delete(c); continue; }
    const comp = t.ligas.get(w.ligas[l].regras.id);
    if (!comp) continue;
    if (comp.tabela.deduzir(c, pts)) evento(e, { dia: t.base, clube: c, tipo: 'pontos', texto: `começa a época com −${pts} pontos`, valor: pts });
    e.pontosPendentes.delete(c);
  }
}
