// Nível MICRO: utility AI por jogador. decideAction(player, context) reúne as opções disponíveis (passe, drible,
// remate, movimento, defesa), escolhe a de maior utilidade e devolve a acção (compatível com a física 2.5D).
// Determinístico: o mesmo estado dá sempre a mesma acção (o factor aleatório usa uma semente fixa).
// Memoização: se a assinatura do contexto não mudou desde a última decisão do jogador, reutiliza as opções avaliadas.
// Compromisso (v2): com a acção anterior, o jogador mantém a opção que está a executar (com o alvo actualizado) até
// uma alternativa a ultrapassar por uma margem — maior nos primeiros segundos; a mudança de posse liberta-o.
import { FREQUENCIA, VERSAO_DECISAO, COMPROMISSO } from '../../config/decisao.ts';
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

const memo = new Map<string, { key: string; op: Opcao[] }>();
const TICKS_MIN_COMPROMISSO = (COMPROMISSO.minimo_s * 1000) / FREQUENCIA.tick_ms;

/** Escolha com compromisso: a opção anterior (o mesmo tipo e, num passe, o mesmo receptor) fica se não for batida. */
function escolher(op: Opcao[], ctx: PlayerContext, anterior?: Action): Opcao | undefined {
  const melhor = op[0];
  if (!anterior?.option || !melhor) return melhor;
  // Mudou a posse (ou passou a ter/deixou de ter a bola) desde que começou: outro momento do jogo, decide de novo.
  const desde = anterior.since ?? ctx.state.tick;
  if (ctx.state.possessionChangeTick > desde) return melhor;
  const mesma = op.find((o) => o.tipo === anterior.option && o.action.targetPlayerId === anterior.targetPlayerId) ?? op.find((o) => o.tipo === anterior.option);
  if (!mesma || mesma === melhor) return melhor;
  const margem = ctx.state.tick - desde < TICKS_MIN_COMPROMISSO ? COMPROMISSO.margem_inicio : ctx.hasBall ? COMPROMISSO.margem_com_bola : COMPROMISSO.margem_sem_bola;
  return melhor.utilidade - mesma.utilidade < margem ? mesma : melhor;
}

/** Decisão de um jogador (v2: utilidade com compromisso). */
function decideActionV2(player: PlayerState, context: PlayerContext, anterior?: Action): Action {
  const m = memo.get(player.id);
  const op = m && m.key === context.key ? m.op : avaliarOpcoes(context);
  if (!m || m.key !== context.key) memo.set(player.id, { key: context.key, op });
  const e = escolher(op, context, anterior);
  if (!e) return { type: 'move', target: { ...context.shapeTarget }, option: 'manter_posicao', utility: 0, since: context.state.tick };
  const continua = anterior?.option === e.tipo && anterior.since !== undefined && context.state.possessionChangeTick <= anterior.since;
  return { ...e.action, since: continua ? anterior!.since : context.state.tick };
}

/** Algoritmos por versão: um jogo guarda a "decisionVersion" e usa sempre o mesmo algoritmo. */
export const DECISORES: Record<string, (p: PlayerState, c: PlayerContext, anterior?: Action) => Action> = { v2: decideActionV2 };

/** Função principal: decide a acção do jogador no contexto dado (com a acção anterior, aplica o compromisso). */
export function decideAction(player: PlayerState, context: PlayerContext, versao: string = VERSAO_DECISAO, anterior?: Action): Action {
  const f = DECISORES[versao];
  if (!f) throw new Error(`Versão de decisão desconhecida: ${versao}`);
  return f(player, context, anterior);
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
    const ant = anteriores.get(p.id);
    // Com a bola, o compromisso só vale para quem já a tinha (quem a acabou de receber decide de raiz).
    const comBola = state.ball.ownerId === p.id, tinha = ant && (ant.type === 'dribble' || ant.type === 'pass' || ant.type === 'cross' || ant.type === 'shoot');
    out.set(p.id, decideAction(p, buildContext(state, p), versao, comBola === !!tinha ? ant : undefined));
  }
  return out;
}
