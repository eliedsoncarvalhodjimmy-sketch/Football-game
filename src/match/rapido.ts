// Modo rápido com jogadores (Fase 2, Bloco B): os mesmos ratings e modificadores do modo
// detalhado → golos esperados (fórmula da Fase 1) → Poisson com Dixon-Coles. Depois distribui
// marcadores, assistências, remates, cartões, lesões, notas e minutos, e actualiza o estado
// dos jogadores (condição, moral, forma, entrosamento, lesões, suspensões).
import { Rng } from '../core/rng.ts';
import { IDX } from '../config/atributos.ts';
import { IDX_PAPEL, POSICOES } from '../config/papeis.ts';
import { MODIFICADORES as M } from '../config/ratings.ts';
import { ESTADO as E } from '../config/estado.ts';
import { EFEITOS_TREINADOR as ET } from '../config/treinadores.ts';
import { CANSACO_INSTRUCOES } from '../config/tacticas.ts';
import { RAPIDO } from '../config/motor.ts';
import { golosEsperados, sortearGolos } from '../engine/match/quickSim.ts';
import { SIMULACAO_ONZE } from '../config/simulacao.ts';
import { escolherOnze, condicaoActual, type EscolhaOnze } from './onze.ts';
import { pontuacao, type RatingsEquipa } from './ratings.ts';
import type { PlayerStore } from '../players/store.ts';
import type { World } from '../engine/world.ts';
import type { Treinador } from '../coaches/store.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export interface Lado {
  clube: number;
  escolha: EscolhaOnze;
  ratings: RatingsEquipa;
  /** Modificador total (fracção, limitado a ±15%) e as suas parcelas. */
  mod: number;
  parcelas: Record<string, number>;
  forcaAtaque: number;
  forcaDefesa: number;
}

/** Forma da época de um clube (o "choque de forma" da Fase 1), em fracção da força. */
export function formaEpoca(w: World, c: number): number {
  const l = w.liga[c];
  const g = l >= 0 ? w.ligas[l].regras.epoca.calendario : 'ago_mai';
  const rng = Rng.de(w.semente, 'formaEpoca', w.clubes[c].id, g, w.epocaPorGrupo[g] ?? w.epoca);
  return clamp(rng.normal(0, M.forma_epoca.desvio), -M.forma_epoca.limite, M.forma_epoca.limite);
}

/** Modificadores de uma equipa para um jogo (cada um com limite; total limitado a ±15%). */
export function modificadores(w: World, st: PlayerStore, c: number, t: Treinador, e: EscolhaOnze, dia: number): { total: number; parcelas: Record<string, number> } {
  const js = e.onze.jogadores;
  let moral = 0, forma = 0, nForma = 0, cond = 0, ent = 0;
  for (const j of js) {
    moral += st.moral[j];
    for (let k = 0; k < 5; k++) { const n = st.forma[j * 5 + k]; if (n) { forma += n / 10; nForma++; } }
    cond += condicaoActual(st, j, dia);
    ent += st.entrosamento[j];
  }
  moral /= js.length; cond /= js.length; ent /= js.length;
  const fm = nForma ? forma / nForma : M.forma.referencia;
  const a = t.atributos;
  const sm = w.economia?.staff;
  const tem = !!sm?.porClube[c];
  const tac = tem ? sm!.atributoTreinador(c, t, 'tactica') : a.tactica;
  const mot = tem ? sm!.atributoTreinador(c, t, 'motivacao') : a.motivacao;
  const analista = tem ? sm!.bonusAnalista(c) : 0;
  const p: Record<string, number> = {
    moral: clamp((moral - M.moral.referencia) * M.moral.por_ponto, -M.moral.limite, M.moral.limite),
    forma: clamp((fm - M.forma.referencia) * M.forma.por_ponto, -M.forma.limite, M.forma.limite),
    cansaco: -clamp((M.cansaco.limiar - cond) * M.cansaco.por_ponto, 0, M.cansaco.limite),
    entrosamento: clamp((ent - M.entrosamento.referencia) * M.entrosamento.por_ponto, -M.entrosamento.limite, M.entrosamento.limite),
    // Treinador (com o adjunto a atenuar as fraquezas e o analista a somar um pouco), dentro do limite da parcela.
    treinador: clamp((tac - 10) * M.treinador.tactica + (mot - 10) * M.treinador.motivacao + ((e.ajuste - 1) / 0.1) * M.treinador.adequacao + analista, -M.treinador.limite, M.treinador.limite),
  };
  const total = clamp(Object.values(p).reduce((s, x) => s + x, 0), -M.limite_total, M.limite_total);
  // Forma da época (equivalente ao choque de forma da Fase 1): nível do clube na época, fora do tecto dos modificadores de jogo.
  p.forma_epoca = formaEpoca(w, c);
  return { total, parcelas: p };
}

export function prepararLado(w: World, c: number, dia: number, rng: Rng): Lado {
  const st = w.jogadores!;
  const t = w.motor!.treinadores[c];
  const sug = c === w.motor!.clubeUtilizador ? w.motor!.consumirSugestao(st, w.plantel[c], dia, rng) : null;
  const escolha = sug ? sug.escolha : escolherOnze(st, w.plantel[c], t, dia, rng, undefined, w.motor!.cache);
  const ratings = w.motor!.cache.obter(c, st, escolha.onze);
  const { total, parcelas } = modificadores(w, st, c, t, escolha, dia);
  const corr = w.motor!.correcao[c] ?? 0;
  const f = (1 + total) * (1 + parcelas.forma_epoca);
  return { clube: c, escolha, ratings, mod: total, parcelas, forcaAtaque: (ratings.forcaAtaque + corr) * f, forcaDefesa: (ratings.forcaDefesa + corr) * f };
}

export function saoRivais(w: World, a: number, b: number): boolean {
  return w.clubes[a].rivais.includes(w.clubes[b].id);
}

/** Golos esperados de um jogo entre dois lados preparados. */
export function xgJogo(w: World, casa: Lado, fora: Lado, neutro: boolean, rng: Rng): [number, number] {
  let [l, m] = golosEsperados(casa.forcaAtaque, casa.forcaDefesa, fora.forcaAtaque, fora.forcaDefesa, neutro, SIMULACAO_ONZE);
  if (!neutro) l *= 1 + M.casa.estadio_cheio * Math.min(1, w.clubes[casa.clube].capacidade / 40000);
  if (saoRivais(w, casa.clube, fora.clube)) {
    const s = M.rivalidade.desvio_xg;
    l *= Math.exp(rng.normal(0, s) - (s * s) / 2);
    m *= Math.exp(rng.normal(0, s) - (s * s) / 2);
  }
  return [l, m];
}

// ---------------------------------------------------------------------------
// Distribuição de golos, assistências, cartões, lesões, notas e minutos.

const PESO_MARCADOR: number[] = (() => {
  const v = new Array(30).fill(0.05);
  const def: Record<string, number> = {
    gr_cla: 0.001, gr_lib: 0.001, dc_def: 0.07, dc_con: 0.06, lat_def: 0.06, lat_ofe: 0.12, ala: 0.15, mdc_tri: 0.08, mdc_con: 0.1,
    mc_b2b: 0.3, mc_cri: 0.22, mc_cob: 0.12, mo_10: 0.45, mo_che: 0.6, ext_cla: 0.45, ext_inv: 0.65, pl_fin: 1.2, pl_f9: 0.75, pl_piv: 1.0, pl_pre: 0.9,
  };
  for (const [k, x] of Object.entries(def)) v[IDX_PAPEL[k]] = x;
  return v;
})();
const PESO_ASSIST: number[] = (() => {
  const v = new Array(30).fill(0.1);
  const def: Record<string, number> = {
    gr_cla: 0.01, gr_lib: 0.03, dc_def: 0.06, dc_con: 0.12, lat_def: 0.18, lat_ofe: 0.4, ala: 0.45, mdc_tri: 0.12, mdc_con: 0.35,
    mc_b2b: 0.35, mc_cri: 0.6, mc_cob: 0.2, mo_10: 0.8, mo_che: 0.4, ext_cla: 0.7, ext_inv: 0.55, pl_fin: 0.3, pl_f9: 0.6, pl_piv: 0.35, pl_pre: 0.3,
  };
  for (const [k, x] of Object.entries(def)) v[IDX_PAPEL[k]] = x;
  return v;
})();
const PESO_CARTAO_POS: Record<string, number> = { GR: 0.2, DC: 1.3, DD: 1.2, DE: 1.2, ALD: 1.1, ALE: 1.1, MDC: 1.4, MC: 1.0, MO: 0.8, ED: 0.7, EE: 0.7, PL: 0.7 };

export interface Participacao {
  j: number;
  papel: number;
  pos: string;
  minutos: number;
  titular: boolean;
}

function escolherPonderado(rng: Rng, itens: Participacao[], peso: (p: Participacao) => number, excluir = -1): Participacao | null {
  let s = 0;
  for (const p of itens) if (p.j !== excluir) s += peso(p);
  if (s <= 0) return null;
  let r = rng.next() * s;
  for (const p of itens) if (p.j !== excluir && (r -= peso(p)) < 0) return p;
  return null;
}

/** Participações (titulares e suplentes) com os minutos, incluindo as substituições automáticas do treinador. */
export function participacoes(st: PlayerStore, lado: Lado, duracao: number, dia: number, rng: Rng): Participacao[] {
  const e = lado.escolha;
  const lst: Participacao[] = e.onze.jogadores.map((j, s) => ({ j, papel: e.onze.papeis[s], pos: e.onze.formacao.lugares[s].pos, minutos: duracao, titular: true }));
  // Substituições: os jogadores de campo mais cansados saem entre os 60 e os 80 minutos (máximo 5).
  const nSubs = Math.min(RAPIDO.substituicoes_max, e.banco.length, RAPIDO.substituicoes_media + (rng.chance(0.3) ? 1 : 0) - (rng.chance(0.15) ? 1 : 0));
  const cansados = lst.filter((p) => p.pos !== 'GR').sort((a, b) => condicaoActual(st, a.j, dia) - condicaoActual(st, b.j, dia) || rng.next() - 0.5);
  const banco = [...e.banco];
  for (let k = 0; k < nSubs && k < cansados.length; k++) {
    const sai = cansados[k];
    const grupo = (pos: string) => (pos === 'GR' ? 'G' : ['DC', 'DD', 'DE', 'ALD', 'ALE'].includes(pos) ? 'D' : ['MDC', 'MC', 'MO'].includes(pos) ? 'M' : 'A');
    const ix = banco.findIndex((b) => grupo(POSICOES[st.posNat[b]]) === grupo(sai.pos) && POSICOES[st.posNat[b]] !== 'GR');
    const entra = ix >= 0 ? banco.splice(ix, 1)[0] : banco.find((b) => POSICOES[st.posNat[b]] !== 'GR');
    if (entra === undefined) break;
    if (ix < 0) banco.splice(banco.indexOf(entra), 1);
    const minuto = rng.int(RAPIDO.minuto_sub[0], RAPIDO.minuto_sub[1]);
    sai.minutos = minuto;
    lst.push({ j: entra, papel: sai.papel, pos: sai.pos, minutos: duracao - minuto, titular: false });
  }
  return lst;
}

export interface ResumoLado {
  golos: number;
  remates: number;
  marcadores: number[];
  assistencias: number[];
  amarelos: number[];
  vermelhos: number[];
  lesoes: number[];
}

/** Distribui os acontecimentos de uma equipa e actualiza estatísticas e estado. */
export function registarLado(w: World, lado: Lado, golos: number, sofridos: number, xg: number, duracao: number, dia: number, rng: Rng, rival: boolean): ResumoLado {
  const st = w.jogadores!;
  const t = w.motor!.treinadores[lado.clube];
  const parts = participacoes(st, lado, duracao, dia, rng);
  const r: ResumoLado = { golos, remates: 0, marcadores: [], assistencias: [], amarelos: [], vermelhos: [], lesoes: [] };
  // Pesos de cada participante, calculados uma vez por jogo.
  const pRemate = new Map<number, number>(), pGolo = new Map<number, number>(), pAssist = new Map<number, number>(), pCartao = new Map<number, number>();
  for (const x of parts) {
    const fm = x.minutos / duracao;
    pRemate.set(x.j, fm * PESO_MARCADOR[x.papel] * (0.5 + pontuacao(st, x.j, 'finalizacao') / 20));
    pGolo.set(x.j, fm * PESO_MARCADOR[x.papel] * (0.4 + st.atr[x.j * 39 + IDX.fin] / 20));
    pAssist.set(x.j, fm * PESO_ASSIST[x.papel] * (0.4 + pontuacao(st, x.j, 'criacao') / 20));
    pCartao.set(x.j, fm * (PESO_CARTAO_POS[x.pos] ?? 1) * (0.5 + st.atr[x.j * 39 + IDX.agr] / 20));
  }
  // Remates: golos + falhados (conversão-alvo ≈ 11%).
  const falhados = rng.poisson(Math.max(0.3, xg * (1 / RAPIDO.conversao - 1)));
  r.remates = golos + falhados;
  for (let k = 0; k < r.remates; k++) {
    const p = escolherPonderado(rng, parts, (x) => pRemate.get(x.j)!);
    if (p) st.eRemates[p.j]++;
  }
  for (let g = 0; g < golos; g++) {
    if (rng.chance(RAPIDO.autogolos)) continue; // autogolo do adversário
    const m = escolherPonderado(rng, parts, (x) => pGolo.get(x.j)!);
    if (!m) continue;
    st.eGolos[m.j]++;
    r.marcadores.push(m.j);
    if (rng.chance(RAPIDO.golos_com_assistencia)) {
      const a = escolherPonderado(rng, parts, (x) => pAssist.get(x.j)!, m.j);
      if (a) { st.eAssist[a.j]++; r.assistencias.push(a.j); }
    }
  }
  // Cartões (mais com rivalidade e com treinador pouco disciplinador).
  const fCart = (rival ? M.rivalidade.cartoes : 1) * (1 + (10 - t.atributos.disciplina) * ET.cartoes_por_disciplina);
  const nAm = rng.poisson(RAPIDO.amarelos_por_equipa * fCart);
  for (let k = 0; k < nAm; k++) {
    const p = escolherPonderado(rng, parts, (x) => pCartao.get(x.j)!);
    if (!p) continue;
    st.eAmarelos[p.j]++;
    r.amarelos.push(p.j);
    st.amarelos[p.j]++;
    if (st.amarelos[p.j] % E.amarelos_suspensao === 0) st.suspensao[p.j]++;
  }
  if (rng.chance(RAPIDO.vermelhos_por_equipa * fCart)) {
    const p = escolherPonderado(rng, parts, (x) => pCartao.get(x.j)!);
    if (p) { st.eVermelhos[p.j]++; r.vermelhos.push(p.j); st.suspensao[p.j] += E.jogos_vermelho; }
  }
  // Os suspensos que não jogaram cumprem um jogo de castigo.
  const jogaram = new Set(parts.map((p) => p.j));
  for (const j of w.plantel[lado.clube]) if (st.suspensao[j] > 0 && !jogaram.has(j) && !r.vermelhos.includes(j)) st.suspensao[j]--;
  // Lesões, condição, notas, moral, forma, entrosamento, estatísticas.
  const res = golos > sofridos ? 1 : golos < sofridos ? -1 : 0;
  const refMoral = E.moral_inicial + (t.atributos.gestao - 10) * ET.moral_por_gestao;
  const fCansaco = 1 + Math.max(0, lado.escolha.onze.instrucoes.pressao) * CANSACO_INSTRUCOES.pressao + Math.max(0, lado.escolha.onze.instrucoes.ritmo) * CANSACO_INSTRUCOES.ritmo;
  for (const p of parts) {
    const j = p.j;
    const cond = condicaoActual(st, j, dia);
    const pl = E.lesao_base_por_jogo * E.lesao_por_propensao(st.oculto(j, 'les')) * E.lesao_por_condicao(cond) * (p.minutos / 90) * (w.economia?.factorTaxaLesao(lado.clube) ?? 1);
    if (rng.chance(pl)) {
      let u = rng.next();
      const g = E.gravidade.find((x) => (u -= x.p) < 0) ?? E.gravidade[0];
      st.indisponivelAte[j] = dia + Math.max(1, Math.round(rng.int(g.dias[0], g.dias[1]) * (w.economia?.factorLesao(lado.clube) ?? 1)));
      st.lesaoTipo[j] = E.gravidade.indexOf(g) + 1;
      st.lesaoDias[j] = st.indisponivelAte[j] - dia;
      st.eLesoes[j]++;
      r.lesoes.push(j);
    }
    st.condicao[j] = Math.max(0, Math.round(cond - E.perda_por_jogo * (p.minutos / 90) * fCansaco));
    st.ultimoJogo[j] = dia;
    st.ritmo[j] = Math.min(100, st.ritmo[j] + 10);
    st.entrosamento[j] = Math.min(100, st.entrosamento[j] + 3);
    const dm = E.moral_por_resultado * res * (res < 0 ? 1 - (t.atributos.gestao - 10) * ET.derrota_por_gestao : 1) - E.moral_reversao * (st.moral[j] - refMoral);
    const base = Math.floor(dm);
    st.moral[j] = clamp(st.moral[j] + base + (rng.next() < dm - base ? 1 : 0), 1, 20);
    // Nota: base + resultado + golos e assistências + golos sofridos (defesas e GR), com variância pela consistência.
    const nGol = r.marcadores.filter((x) => x === j).length;
    const nAss = r.assistencias.filter((x) => x === j).length;
    const defensivo = p.pos === 'GR' || ['DC', 'DD', 'DE', 'ALD', 'ALE', 'MDC'].includes(p.pos);
    let nota = 6.6 + 0.3 * res + 0.9 * nGol + 0.5 * nAss;
    if (defensivo) nota += sofridos === 0 ? (p.pos === 'GR' ? 0.6 : 0.4) : -0.2 * sofridos * (p.pos === 'GR' ? 1.5 : 1);
    if (r.vermelhos.includes(j)) nota -= 1.5;
    nota += rng.normal(0, 0.6 * (1.3 - (st.oculto(j, 'cst') / 20) * 0.6));
    nota = clamp(nota, 3, 10);
    for (let k = 0; k < 4; k++) st.forma[j * 5 + k] = st.forma[j * 5 + k + 1];
    st.forma[j * 5 + 4] = Math.round(nota * 10);
    st.eJogos[j]++;
    if (p.titular) st.eTitular[j]++;
    st.eMinutos[j] += p.minutos;
    st.minMes[j] += p.minutos;
    st.eNotas[j] += Math.round(nota * 10);
    if (p.pos === 'GR') st.eSofridos[j] += sofridos;
  }
  return r;
}

/** Penáltis (desempate) com os 5 melhores marcadores contra o guarda-redes. */
export function desempatePenaltis(w: World, casa: Lado, fora: Lado, rng: Rng): [number, number] {
  const st = w.jogadores!;
  const prob = (atacante: Lado, defensor: Lado) => {
    const gr = defensor.escolha.onze.jogadores[0];
    const marc = [...atacante.escolha.onze.jogadores].sort((a, b) => st.atr[b * 39 + IDX.fin] + st.atr[b * 39 + IDX.cmp] - st.atr[a * 39 + IDX.fin] - st.atr[a * 39 + IDX.cmp]);
    return (k: number) => {
      const j = marc[k % marc.length];
      const dif = (st.atr[j * 39 + IDX.fin] + st.atr[j * 39 + IDX.cmp]) / 2 - (st.atr[gr * 39 + IDX.ref] + st.atr[gr * 39 + IDX.uco]) / 2;
      return clamp(RAPIDO.penalti_base + 0.012 * dif, 0.55, 0.9);
    };
  };
  const pc = prob(casa, fora), pf = prob(fora, casa);
  let a = 0, b = 0;
  for (let k = 0; k < 5; k++) { if (rng.next() < pc(k)) a++; if (rng.next() < pf(k)) b++; }
  for (let k = 5; a === b && k < 30; k++) { if (rng.next() < pc(k)) a++; if (rng.next() < pf(k)) b++; }
  if (a === b) a++;
  return [a, b];
}

/** Golos de um jogo no modo rápido (90 minutos), a partir dos lados preparados. */
export function golosRapido(w: World, casa: Lado, fora: Lado, neutro: boolean, rng: Rng): { gc: number; gf: number; xg: [number, number] } {
  const xg = xgJogo(w, casa, fora, neutro, rng);
  const [gc, gf] = sortearGolos(xg[0], xg[1], rng, SIMULACAO_ONZE.rho, SIMULACAO_ONZE);
  return { gc, gf, xg };
}

export const _interno = { PESO_MARCADOR, PESO_ASSIST };
