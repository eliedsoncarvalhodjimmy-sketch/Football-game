// Nível MICRO: utility AI por jogador. decideAction(player, context) reúne as opções disponíveis (passe, drible,
// remate, movimento, defesa), escolhe a de maior utilidade e devolve a acção (compatível com a física 2.5D).
// Determinístico: o mesmo estado dá sempre a mesma acção (o factor aleatório usa uma semente fixa).
// Memoização: se a assinatura do contexto não mudou desde a última decisão do jogador, devolve a mesma acção.
import { FREQUENCIA, VERSAO_DECISAO } from '../../config/decisao.ts';
import { buildContext } from './ContextBuilder.ts';
import { avaliarPasses } from './actions/PassAction.ts';
import { avaliarDrible } from './actions/DribbleAction.ts';
import { avaliarRemate } from './actions/ShootAction.ts';
import { avaliarMovimento } from './actions/MoveAction.ts';
import { avaliarDefesa } from './actions/DefendAction.ts';
import type { Action, MatchState, Opcao, PlayerContext, PlayerState } from './types.ts';

/** Todas as opções avaliadas para o jogador (ordenadas pela utilidade, da maior para a menor). */
export function avaliarOpcoes(context: PlayerContext): Opcao[] {
  const o = [...avaliarPasses(context), ...avaliarDrible(context), ...avaliarRemate(context), ...avaliarMovimento(context), ...avaliarDefesa(context)];
  // Desempate estável: maior utilidade; em empate, a ordem do tipo (determinística).
  return o.sort((a, b) => b.utilidade - a.utilidade || (a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0));
}

const memo = new Map<string, { key: string; action: Action }>();

/** Decisão de um jogador (v1). */
function decideActionV1(player: PlayerState, context: PlayerContext): Action {
  const m = memo.get(player.id);
  if (m && m.key === context.key) return m.action;
  const op = avaliarOpcoes(context);
  const action: Action = op[0]?.action ?? { type: 'move', target: { ...context.shapeTarget }, option: 'manter_posicao', utility: 0 };
  memo.set(player.id, { key: context.key, action });
  return action;
}

/** Algoritmos por versão: um jogo guarda a "decisionVersion" e usa sempre o mesmo algoritmo. */
export const DECISORES: Record<string, (p: PlayerState, c: PlayerContext) => Action> = { v1: decideActionV1 };

/** Função principal: decide a acção do jogador no contexto dado. */
export function decideAction(player: PlayerState, context: PlayerContext, versao: string = VERSAO_DECISAO): Action {
  const f = DECISORES[versao];
  if (!f) throw new Error(`Versão de decisão desconhecida: ${versao}`);
  return f(player, context);
}

/** Limpa a memoização (ex.: ao começar um jogo novo). */
export function limparMemo() { memo.clear(); }

/** Este jogador decide neste tick? Com bola: a cada 200 ms; sem bola: a cada 500 ms (desfasado pelo número). */
export function decideNesteTick(state: MatchState, p: PlayerState): boolean {
  const com = state.ball.ownerId === p.id;
  const n = (com ? FREQUENCIA.com_bola_ms : FREQUENCIA.sem_bola_ms) / FREQUENCIA.tick_ms;
  return (state.tick + (com ? 0 : p.number)) % n === 0;
}

/** Ciclo de decisão de um tick: decide para os jogadores que decidem neste tick (os outros mantêm a acção anterior). */
export function cicloDecisao(state: MatchState, anteriores: Map<string, Action>, versao: string = VERSAO_DECISAO): Map<string, Action> {
  const out = new Map(anteriores);
  for (const p of state.players) {
    if (!p.onPitch) continue;
    if (!decideNesteTick(state, p) && out.has(p.id)) continue;
    out.set(p.id, decideAction(p, buildContext(state, p), versao));
  }
  return out;
}
