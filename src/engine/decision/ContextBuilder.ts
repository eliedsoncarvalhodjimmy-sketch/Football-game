// Constrói o contexto de decisão de um jogador num tick: colegas e adversários, quem tem a bola, distância e ângulo à
// baliza, pressão, transições (acabou de perder/recuperar a bola), marcador e posição-alvo da forma da equipa.
// Inclui uma assinatura ("key") que muda só quando o contexto relevante muda (para a memoização das decisões).
import { CAMPO, FREQUENCIA, JANELA_TRANSICAO_S } from '../../config/decisao.ts';
import { dist } from '../physics/Steering.ts';
import { formaEquipa } from './TeamShape.ts';
import type { MatchState, PlayerState, PlayerContext } from './types.ts';

const r1 = (x: number) => Math.round(x);

export function buildContext(state: MatchState, me: PlayerState): PlayerContext {
  const dir: 1 | -1 = me.team === 0 ? 1 : -1;
  const teammates: PlayerState[] = [], opponents: PlayerState[] = [];
  for (const p of state.players) {
    if (!p.onPitch || p.id === me.id) continue;
    (p.team === me.team ? teammates : opponents).push(p);
  }
  const carrier = state.ball.ownerId ? state.players.find((p) => p.id === state.ball.ownerId) ?? null : null;
  let nearestOpp: PlayerContext['nearestOpp'] = null;
  for (const o of opponents) { const d = dist(o.pos, me.pos); if (!nearestOpp || d < nearestOpp.d) nearestOpp = { p: o, d }; }
  const gx = me.team === 0 ? CAMPO.comprimento : 0, gy = CAMPO.largura / 2;
  const goalDist = Math.hypot(gx - me.pos.x, gy - me.pos.y);
  // Ângulo de remate: ângulo sob o qual o jogador vê a baliza (largura 7,32 m).
  const a1 = Math.atan2(gy - CAMPO.baliza / 2 - me.pos.y, gx - me.pos.x), a2 = Math.atan2(gy + CAMPO.baliza / 2 - me.pos.y, gx - me.pos.x);
  const goalAngle = Math.abs(a2 - a1);
  const sinceChange = ((state.tick - state.possessionChangeTick) * FREQUENCIA.tick_ms) / 1000;
  const teamHasBall = state.possessionTeam === me.team;
  const shape = formaEquipa(state, me.team);
  const offsideX = linhaForaDeJogo(state, me.team);
  // Mais perto da bola na minha equipa?
  const dMe = dist(me.pos, state.ball.pos);
  const nearestToBall = !teammates.some((t) => dist(t.pos, state.ball.pos) < dMe);
  const key = [me.id, r1(me.pos.x), r1(me.pos.y), r1(state.ball.pos.x), r1(state.ball.pos.y), state.ball.ownerId ?? '-', state.possessionTeam,
    nearestOpp ? `${nearestOpp.p.id}:${r1(nearestOpp.d)}` : '-', state.score.join(':'), Math.floor(state.minute), Math.round(me.morale / 5), Math.round(me.condition * 20),
    me.yellow ? 1 : 0, me.calmer ? 1 : 0, Math.min(Math.floor(sinceChange), JANELA_TRANSICAO_S + 1),
    state.tactics[me.team].style, state.tactics[me.team].mentality].join('|');
  return {
    state, me, dir, hasBall: state.ball.ownerId === me.id, teamHasBall, teammates, opponents, carrier, nearestOpp, goalDist, goalAngle,
    sinceChange, justLost: !teamHasBall && sinceChange <= JANELA_TRANSICAO_S, justRecovered: teamHasBall && sinceChange <= JANELA_TRANSICAO_S,
    scoreDiff: state.score[me.team] - state.score[me.team === 0 ? 1 : 0],
    offsideX, shapeTarget: shape.get(me.id) ?? me.pos, nearestToBall, key,
  };
}

/** Linha do fora de jogo para a equipa que ataca: o penúltimo adversário (contando o guarda-redes) ou a bola, o que
 *  estiver mais perto da baliza adversária; nunca antes do meio-campo. Em x do campo. */
export function linhaForaDeJogo(state: MatchState, team: 0 | 1): number {
  const dir = team === 0 ? 1 : -1;
  const xs = state.players.filter((p) => p.onPitch && p.team !== team).map((p) => p.pos.x * dir).sort((a, b) => b - a);
  const penultimo = xs[1] ?? xs[0] ?? 0;
  const linha = Math.max(penultimo, state.ball.pos.x * dir, (CAMPO.comprimento / 2) * dir);
  return linha * dir;
}

/** Distância mínima de um ponto a um segmento (para saber se uma linha de passe está cortada). */
export function distSegmento(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}
