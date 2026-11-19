// Remate (com o pé) e cabeceamento (bola no ar perto da baliza). Aponta ao poste mais longe do guarda-redes.
import { CAMPO, CONTEXTO as K, REMATE_LONGE_M } from '../../../config/decisao.ts';
import { utilidade, atributoAccao, erroAccao, aplicarErro } from '../ActionEvaluator.ts';
import { distSegmento } from '../ContextBuilder.ts';
import type { PlayerContext, Opcao } from '../types.ts';

/** xG estimado de um remate desta posição (distância, ângulo, pressão de defensores a menos de 2,5 m). */
export function xgEstimado(d: number, ang: number, pressao: number): number {
  return Math.max(0.01, Math.min(0.55, (0.55 * Math.exp(-d / 6) * Math.min(1, ang / 0.6) + 0.015) * (1 - 0.45 * pressao)));
}

export function avaliarRemate(ctx: PlayerContext): Opcao[] {
  const me = ctx.me;
  const noAr = ctx.state.ball.z > 1.2 && !ctx.state.ball.ownerId;
  if (!ctx.hasBall && !(noAr && Math.hypot(ctx.state.ball.pos.x - me.pos.x, ctx.state.ball.pos.y - me.pos.y) < 2.5)) return [];
  if (ctx.goalDist > 32) return [];
  const gx = me.team === 0 ? CAMPO.comprimento : 0, gy = CAMPO.largura / 2;
  const gr = ctx.opponents.find((o) => o.role === 'GR');
  // Poste mais longe do guarda-redes (a 0,6 m do poste).
  const lado = gr ? (gr.pos.y < gy ? 1 : -1) : 1;
  const alvo = { x: gx, y: gy + lado * (CAMPO.baliza / 2 - 0.6) };
  const naArea = ctx.goalDist < 18 && Math.abs(me.pos.y - gy) < CAMPO.area_larg / 2;
  const tipo = noAr && !ctx.hasBall ? 'cabecear' : 'rematar';
  // A vontade de rematar segue a qualidade da ocasião (xG estimado): ocasiões fracas dão lugar a passar ou conduzir.
  let pressao = 0;
  for (const o of ctx.opponents) if (o.role !== 'GR' && Math.hypot(o.pos.x - me.pos.x, o.pos.y - me.pos.y) < 2.5) pressao += 0.5;
  const xgE = xgEstimado(ctx.goalDist, ctx.goalAngle, Math.min(1, pressao));
  let bc = (xgE - K.remate_xg_limiar) * K.remate_por_xg;
  if (naArea) bc += K.remate_dentro_area;
  // Linha de remate tapada: adversários de campo entre o rematador e a baliza (a menos de 1,5 m da linha).
  const tapam = ctx.opponents.filter((o) => o.role !== 'GR' && distSegmento(o.pos, me.pos, alvo) < 1.5).length;
  bc += K.remate_tapado * tapam;
  if (ctx.goalAngle < 0.18) bc += K.remate_angulo_mau;
  if (ctx.goalDist > REMATE_LONGE_M) bc += K.remate_longe_por_metro * (ctx.goalDist - REMATE_LONGE_M);
  const u = utilidade(ctx, tipo, bc, { distancia: ctx.goalDist });
  const ang = Math.atan2(alvo.y - me.pos.y, alvo.x - me.pos.x);
  const erro = erroAccao(atributoAccao(me, tipo), ctx.nearestOpp?.d ?? null, me.condition);
  const { direction, power } = aplicarErro(`${me.id}|${ctx.state.tick}|${tipo}`, ang, Math.min(1, 0.55 + ctx.goalDist / 50), erro);
  const height = tipo === 'cabecear' ? 'mid' : ctx.goalDist < 12 ? 'low' : ctx.goalDist < 22 ? 'mid' : 'mid';
  const spin = tipo === 'cabecear' ? 'none' : ctx.goalDist > REMATE_LONGE_M ? 'topspin' : lado * (me.team === 0 ? 1 : -1) > 0 ? 'lateral_left' : 'lateral_right';
  return [{ tipo, utilidade: u, action: { type: 'shoot', target: alvo, power, direction, height, spin, option: tipo, utility: u, error: erro } }];
}
