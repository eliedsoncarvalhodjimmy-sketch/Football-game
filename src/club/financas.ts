// Dívida, administração, fair play financeiro, donos e venda de clubes (Prompt 3, Bloco B).
// Funções chamadas pelo motor económico: mensal (financiamento, amortização, insolvência),
// fecho de época (amortização bancária, sanções, objectivo do dono, venda, eventos raros) e abertura (objectivo, injecção, pontos).
import { Rng } from '../core/rng.ts';
import { DIVIDA as DV, ADMINISTRACAO as AD, SANCOES_FFP as SF } from '../config/divida.ts';
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

export type TipoEvento = 'capital_dono' | 'emprestimo_dono' | 'emprestimo_banco' | 'amortizacao' | 'administracao' | 'saida_administracao' | 'sancao_ffp' | 'aviso_ffp' | 'limite_divida' | 'venda' | 'evento_raro' | 'injeccao_anual' | 'pontos';

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

/** Dinheiro que o dono ainda pode pôr nesta época. */
function capacidadeRestante(e: Economia, c: number): number {
  const d = e.donos[c];
  return d ? Math.max(0, capacidadeAnual(d) - e.clubes.injeccoes[c]) : 0;
}

// ---------------------------------------------------------------- mensal

export function gerirMes(e: Economia, c: number, dia: number) {
  const w = e.w, s = e.clubes;
  const receita = Math.max(1, s.receitaPrevista[c]);
  const rng = Rng.de(w.semente, 'financas-mes', w.clubes[c].id, dia);
  if (s.administracaoAte[c] && dia >= s.administracaoAte[c] && s.caixa[c] >= 0) {
    s.administracaoAte[c] = 0;
    s.saude[c] = e.calcularSaude(c);
    evento(e, { dia, clube: c, tipo: 'saida_administracao', texto: 'sai de administração' });
  }
  const reserva = DV.reserva_meses * despesaMensal(e, c);
  if (s.caixa[c] < reserva && !s.administracaoAte[c]) {
    for (const via of e.controlador(c).financiamento(w, e, c, reserva - s.caixa[c])) {
      const defice = reserva - s.caixa[c];
      if (defice <= 0) break;
      const d = e.donos[c];
      if (via === 'capital_dono' && d) {
        const p = Math.max(DN.socorro_minimo, (d.atributos.lealdade + d.atributos.riqueza) / 40);
        const v = Math.min(defice, capacidadeRestante(e, c));
        if (v > 0 && rng.chance(p)) { s.caixa[c] += v; s.injeccoes[c] += v; evento(e, { dia, clube: c, tipo: 'capital_dono', texto: `o dono injecta capital`, valor: v }); }
      } else if (via === 'emprestimo_dono' && d && d.atributos.lealdade >= 12) {
        const v = Math.min(defice, capacidadeRestante(e, c));
        if (v > 0) { s.caixa[c] += v; s.dividaDono[c] += v; s.injeccoes[c] += v; evento(e, { dia, clube: c, tipo: 'emprestimo_dono', texto: 'empréstimo do dono', valor: v }); }
      } else if (via === 'banco') {
        const tecto = Math.min(DV.limite_banco, d ? politicaDivida(d) : DV.limite_banco) * receita;
        const div = s.divida(c);
        const saude = e.calcularSaude(c);
        if (saude === 2 && div > tecto / 2) continue;
        const v = Math.min(defice, tecto - div);
        if (v > 0) {
          s.caixa[c] += v;
          // Juro novo: média ponderada com o da dívida antiga.
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
  // Insolvência.
  if (!s.administracaoAte[c] && (s.caixa[c] < -AD.caixa_negativa * receita || s.divida(c) > AD.divida_maxima * receita)) entrarAdministracao(e, c, dia);
  // Limite de dívida: proibição de contratar enquanto estiver acima.
  if (s.divida(c) > DV.limite_sancao * receita) s.proibidoAte[c] = Math.max(s.proibidoAte[c], dia + 31);
}

export function entrarAdministracao(e: Economia, c: number, dia: number) {
  const w = e.w, s = e.clubes, st = w.jogadores;
  const receita = Math.max(1, s.receitaPrevista[c]);
  s.administracaoAte[c] = dia + AD.meses * 30;
  s.proibidoAte[c] = Math.max(s.proibidoAte[c], s.administracaoAte[c]);
  s.saude[c] = 3;
  e.penalizar(c, AD.pontos, 'administração');
  // Venda forçada (até ao mercado do Prompt 4: saída para a lista de livres) dos salários mais altos.
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
  const antes = s.divida(c);
  s.dividaBanco[c] *= 1 - AD.perdao;
  s.dividaParcelas[c] *= 1 - AD.perdao;
  s.dividaDono[c] = 0;
  s.caixa[c] = AD.caixa_nova * receita;
  const d = e.donos[c];
  const texto = `entra em administração: −${AD.pontos} pontos, ${saidas} jogadores saem, dívida de ${(antes / 1e6).toFixed(1)} para ${(s.divida(c) / 1e6).toFixed(1)} M€`;
  evento(e, { dia, clube: c, tipo: 'administracao', texto, valor: antes - s.divida(c) });
  // Novo dono por valor baixo (os clubes de adeptos continuam dos sócios, com nova direcção).
  if (d && d.tipo !== 'adeptos') trocarDono(e, c, dia, 'administração', AD.preco * receita, Rng.de(w.semente, 'administracao', w.clubes[c].id, dia));
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
      const v = Math.min(s.dividaBanco[c], s.dividaBanco[c] / DV.prazo_anos);
      s.caixa[c] -= v;
      s.dividaBanco[c] -= v;
    }
    // Fair play financeiro.
    if (b) {
      const limite = e.limiteFairPlay(c);
      const excesso = b.massaSalarial / receita - limite;
      if (excesso > 0) sancionarFFP(e, c, dia, excesso, receita, id);
      else s.ffpSeguidas[c] = 0;
    }
    // Limite de dívida: multa anual.
    if (s.divida(c) > DV.limite_sancao * receita) {
      s.lancar(c, 'multas', DV.multa_limite * receita);
      evento(e, { dia, clube: c, tipo: 'limite_divida', texto: `dívida acima de ${DV.limite_sancao}× a receita: multa e proibição de contratar`, valor: DV.multa_limite * receita });
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

export function sancionarFFP(e: Economia, c: number, dia: number, excesso: number, receita: number, liga: string) {
  const s = e.clubes;
  const r = s.ffpSeguidas[c];
  s.ffpSeguidas[c] = Math.min(255, r + 1);
  if (r === 0 && excesso <= SF.aviso_ate) {
    evento(e, { dia, clube: c, tipo: 'aviso_ffp', texto: `${liga}: aviso do fair play (massa ${(100 * excesso).toFixed(1)} p.p. acima)` });
    return;
  }
  const multa = SF.multa[Math.min(1, r)] * excesso * receita;
  s.lancar(c, 'multas', multa);
  const partes = [`multa de ${(multa / 1e6).toFixed(2)} M€`];
  if (excesso > SF.proibicao_excesso || r >= 1) { s.proibidoAte[c] = Math.max(s.proibidoAte[c], dia + 365); partes.push('proibição de contratar (1 época)'); }
  if (r >= SF.pontos_reincidencia || (r >= 1 && excesso > SF.pontos_excesso)) {
    const pts = Math.min(SF.pontos_maximo, SF.pontos_base + SF.pontos_por_decimo * Math.floor(excesso / 0.1));
    e.penalizar(c, pts, 'fair play');
    partes.push(`−${pts} pontos`);
  }
  evento(e, { dia, clube: c, tipo: 'sancao_ffp', texto: `${liga}: fair play (massa ${(100 * excesso).toFixed(1)} p.p. acima, ${r ? `reincidência ${r}` : '1.ª vez'}): ${partes.join(', ')}`, valor: multa });
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
  const inj = Math.min(capacidadeAnual(novo), (VD.injeccao_inicial * receita * novo.atributos.ambicao) / 20);
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
      const v = Math.min(capacidadeAnual(d), ((d.atributos.ambicao - DN.injeccao_limiar_ambicao) / 10) * DN.injeccao_fraccao_receita * s.receitaPrevista[c]);
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
