// Interferência do utilizador no seu clube (Fase 2, Bloco C, secção 3.3).
// O utilizador sugere onze e táctica antes do jogo; o treinador aceita, aceita em parte ou ignora.
// Cada sugestão gasta capital do utilizador junto do treinador e autoridade do treinador no balneário;
// os abusos fazem crescer o conflito. A consequência final (demissão, conflito público) chega no Prompt 3.
import { INTERFERENCIA as I } from '../config/treinadores.ts';
import { FORMACAO_POR_ID, type Instrucoes } from '../config/tacticas.ts';
import type { Rng } from '../core/rng.ts';
import type { Treinador } from './store.ts';
import type { PlayerStore } from '../players/store.ts';
import type { CacheRatings } from '../match/ratings.ts';
import { escolherOnze, planoDe, preencher, type EscolhaOnze } from '../match/onze.ts';

export interface RelacaoTreinador {
  /** Capital do utilizador junto do treinador (0–100). */
  capital: number;
  /** Autoridade do treinador no balneário (0–100); máximo = atributo × autoridade_por_ponto. */
  autoridade: number;
  /** Conflito acumulado (0–100). */
  conflito: number;
  /** Sugestões recentes (decai por semana): mede o abuso. */
  recentes: number;
  historico: { dia: number; decisao: Decisao; alteracoes: number }[];
}

export type Decisao = 'aceita' | 'parcial' | 'ignora';

export interface Sugestao {
  formacao?: string;
  instrucoes?: Partial<Instrucoes>;
  /** Onze sugerido (11 jogadores do plantel). */
  onze?: number[];
}

/** Uma alteração concreta face ao plano do treinador. */
type Alteracao = { tipo: 'formacao'; formacao: string } | { tipo: 'instrucao'; chave: keyof Instrucoes; valor: number } | { tipo: 'jogador'; entra: number; sai: number };

export interface ResultadoSugestao {
  decisao: Decisao;
  /** Nº de alterações pedidas (formação conta 2) e aplicadas. */
  pedidas: number;
  aplicadas: number;
  probabilidades: { aceita: number; parcial: number; ignora: number };
  escolha: EscolhaOnze;
  nivelConflito: 'baixo' | 'tenso' | 'crise';
}

const sig = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));

export function novaRelacao(t: Treinador): RelacaoTreinador {
  return { capital: I.capital_inicial, autoridade: t.atributos.autoridade * I.autoridade_por_ponto, conflito: 0, recentes: 0, historico: [] };
}

export function nivelConflito(r: RelacaoTreinador): ResultadoSugestao['nivelConflito'] {
  return r.conflito >= I.crise ? 'crise' : r.conflito >= I.tenso ? 'tenso' : 'baixo';
}

const peso = (a: Alteracao) => (a.tipo === 'formacao' ? 2 : 1);

function alteracoes(sug: Sugestao, plano: EscolhaOnze): Alteracao[] {
  const out: Alteracao[] = [];
  if (sug.formacao && sug.formacao !== plano.plano.formacao.id && FORMACAO_POR_ID[sug.formacao]) out.push({ tipo: 'formacao', formacao: sug.formacao });
  for (const [k, v] of Object.entries(sug.instrucoes ?? {}) as [keyof Instrucoes, number][]) if (plano.onze.instrucoes[k] !== v) out.push({ tipo: 'instrucao', chave: k, valor: v });
  if (sug.onze) {
    const dele = new Set(plano.onze.jogadores);
    const meu = new Set(sug.onze);
    const entram = sug.onze.filter((j) => !dele.has(j));
    const saem = plano.onze.jogadores.filter((j) => !meu.has(j));
    for (let k = 0; k < Math.min(entram.length, saem.length); k++) out.push({ tipo: 'jogador', entra: entram[k], sai: saem[k] });
  }
  return out;
}

/** Probabilidades de aceitar / aceitar em parte / ignorar uma sugestão com `n` alterações. */
export function probabilidades(t: Treinador, r: RelacaoTreinador, n: number) {
  const a = t.atributos;
  const resistencia = ((a.autoridade - 10) / 10) * I.peso_autoridade_atributo + (r.autoridade / 100 - 0.5) * I.peso_autoridade_balneario
    - ((a.adaptabilidade - 10) / 10) * I.peso_adaptabilidade + (r.conflito / 100) * I.peso_conflito + I.peso_por_alteracao * n + I.peso_recentes * r.recentes;
  const abertura = ((r.capital - 50) / 50) * I.peso_capital;
  const s = abertura - resistencia + I.base;
  const aceita = sig(2 * s - 0.5), ignora = sig(-2 * s - 0.5);
  return { aceita, parcial: 1 - aceita - ignora, ignora };
}

/**
 * O treinador decide sobre a sugestão e devolve o onze com que a equipa joga.
 * `r` é actualizada (capital, autoridade, conflito, sugestões recentes).
 */
export function sugerir(st: PlayerStore, plantel: number[], t: Treinador, r: RelacaoTreinador, sug: Sugestao, dia: number, rng: Rng, cache?: CacheRatings): ResultadoSugestao {
  const dele = escolherOnze(st, plantel, t, dia, rng, undefined, cache);
  const alts = alteracoes(sug, dele);
  const pedidas = alts.reduce((s, a) => s + peso(a), 0);
  const p = probabilidades(t, r, pedidas);
  if (!pedidas) return { decisao: 'aceita', pedidas: 0, aplicadas: 0, probabilidades: p, escolha: dele, nivelConflito: nivelConflito(r) };
  const u = rng.next();
  const decisao: Decisao = u < p.aceita ? 'aceita' : u < p.aceita + p.parcial ? 'parcial' : 'ignora';
  // Em parte: aplica as alterações pela ordem (formação, instruções, jogadores) até metade do pedido.
  let aplicar: Alteracao[] = [];
  if (decisao === 'aceita') aplicar = alts;
  else if (decisao === 'parcial') {
    let soma = 0;
    for (const a of alts) { if (soma + peso(a) > Math.ceil(pedidas / 2)) continue; aplicar.push(a); soma += peso(a); }
    if (!aplicar.length) aplicar = [alts[alts.length - 1]];
  }
  const aplicadas = aplicar.reduce((s, a) => s + peso(a), 0);
  // Custos e conflito (a gestão de grupo do treinador amortece o conflito; o abuso duplica-o).
  const custo = I.custo_capital * pedidas * (decisao === 'aceita' ? 1 : decisao === 'parcial' ? I.custo_parcial : I.custo_ignora);
  r.capital = clamp(r.capital - custo);
  r.autoridade = clamp(r.autoridade - I.custo_autoridade * aplicadas);
  const abuso = r.recentes >= I.limiar_abuso ? 2 : 1;
  r.conflito = clamp(r.conflito + I.conflito[decisao] * pedidas * abuso * (1.5 - t.atributos.gestao / 20));
  r.recentes += 1;
  r.historico.push({ dia, decisao, alteracoes: pedidas });
  return { decisao, pedidas, aplicadas, probabilidades: p, escolha: aplicarAlteracoes(st, plantel, t, dele, aplicar, dia), nivelConflito: nivelConflito(r) };
}

function aplicarAlteracoes(st: PlayerStore, plantel: number[], t: Treinador, dele: EscolhaOnze, alts: Alteracao[], dia: number): EscolhaOnze {
  if (!alts.length) return dele;
  const f = alts.find((a) => a.tipo === 'formacao') as Extract<Alteracao, { tipo: 'formacao' }> | undefined;
  const plano = f ? planoDe(f.formacao, f.formacao === t.formacoes[0] ? t.papeis : {}) : dele.plano;
  const instrucoes = { ...dele.onze.instrucoes };
  for (const a of alts) if (a.tipo === 'instrucao') instrucoes[a.chave] = a.valor;
  let onze = [...dele.onze.jogadores];
  for (const a of alts) if (a.tipo === 'jogador') onze = onze.map((j) => (j === a.sai ? a.entra : j));
  // Os 11 escolhidos são colocados pelo treinador nos lugares do plano.
  const { jogadores } = preencher(st, onze, plano, dia);
  const usados = new Set(jogadores);
  return {
    onze: { formacao: plano.formacao, papeis: plano.papeis, jogadores, instrucoes },
    plano, mudou: dele.mudou, ajuste: dele.ajuste,
    banco: plantel.filter((j) => !usados.has(j) && st.clube[j] >= 0).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 9),
  };
}

/** Recuperação semanal da relação. */
export function recuperarSemana(t: Treinador, r: RelacaoTreinador) {
  const R = I.recuperacao;
  r.capital = clamp(r.capital + R.capital);
  r.autoridade = Math.min(t.atributos.autoridade * I.autoridade_por_ponto, r.autoridade + R.autoridade);
  r.conflito = clamp(r.conflito - R.conflito * (0.5 + t.atributos.gestao / 20));
  r.recentes *= R.recentes;
}
