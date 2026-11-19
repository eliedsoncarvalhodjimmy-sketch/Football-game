// Drible (conduzir para a frente, contornando o adversário mais próximo) e proteger a bola (de costas, sob pressão).
import { CAMPO, CONTEXTO as K } from '../../../config/decisao.ts';
import { dist } from '../../physics/Steering.ts';
import { utilidade, atributoAccao, erroAccao, aplicarErro } from '../ActionEvaluator.ts';
import type { PlayerContext, Opcao } from '../types.ts';

export function avaliarDrible(ctx: PlayerContext): Opcao[] {
  if (!ctx.hasBall) return [];
  const me = ctx.me, out: Opcao[] = [];
  // Espaço à frente: nenhum adversário num cone de 6 m na direcção da baliza.
  const gx = me.team === 0 ? CAMPO.comprimento : 0, gy = CAMPO.largura / 2;
  const ang = Math.atan2(gy - me.pos.y, gx - me.pos.x);
  const frente = { x: me.pos.x + Math.cos(ang) * 6, y: me.pos.y + Math.sin(ang) * 6 };
  const espaco = !ctx.opponents.some((o) => dist(o.pos, frente) < 4);
  const pressionado = (ctx.nearestOpp?.d ?? 99) < 3;
  // Contorna o adversário mais próximo: desvia o ângulo para o lado contrário.
  let a = ang;
  if (ctx.nearestOpp && ctx.nearestOpp.d < 6) {
    const ao = Math.atan2(ctx.nearestOpp.p.pos.y - me.pos.y, ctx.nearestOpp.p.pos.x - me.pos.x);
    let d = a - ao;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    a += Math.sign(d || 1) * 0.6;
  }
  // Perto da baliza já não se conduz para dentro da pequena área: remata-se ou passa-se.
  const bcD = (espaco ? K.drible_espaco : 0) + (pressionado ? K.drible_pressionado : 0) + (ctx.goalDist < 30 && ctx.goalDist >= 18 ? 0.8 : 0) + (ctx.goalDist < 18 ? K.drible_perto_baliza : 0);
  const uD = utilidade(ctx, 'driblar', bcD);
  const erroD = erroAccao(atributoAccao(me, 'driblar'), ctx.nearestOpp?.d ?? null, me.condition);
  const pd = aplicarErro(`${me.id}|${ctx.state.tick}|driblar`, a, 0.5, erroD);
  const dentro = (x: number, y: number) => ({ x: Math.max(2, Math.min(CAMPO.comprimento - 2, x)), y: Math.max(2, Math.min(CAMPO.largura - 2, y)) });
  out.push({ tipo: 'driblar', utilidade: uD, action: { type: 'dribble', target: dentro(me.pos.x + Math.cos(pd.direction) * 6, me.pos.y + Math.sin(pd.direction) * 6), direction: pd.direction, power: pd.power, height: 'ground', spin: 'none', option: 'driblar', utility: uD, error: erroD } });
  // Proteger: afasta-se do adversário, mantém a bola.
  const bcP = (pressionado ? K.proteger_pressionado : -1);
  const uP = utilidade(ctx, 'proteger', bcP);
  const fuga = ctx.nearestOpp ? Math.atan2(me.pos.y - ctx.nearestOpp.p.pos.y, me.pos.x - ctx.nearestOpp.p.pos.x) : ang;
  out.push({ tipo: 'proteger', utilidade: uP, action: { type: 'dribble', target: dentro(me.pos.x + Math.cos(fuga) * 2, me.pos.y + Math.sin(fuga) * 2), direction: fuga, power: 0.2, height: 'ground', spin: 'none', option: 'proteger', utility: uP, error: 0 } });
  return out;
}
