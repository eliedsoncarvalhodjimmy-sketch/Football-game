// Defender: marcar um adversário (entre ele e a baliza), interceptar a linha de passe mais perigosa e desarmar o
// portador ao alcance.
import { CAMPO, CONTEXTO as K } from '../../../config/decisao.ts';
import { dist } from '../../physics/Steering.ts';
import { utilidade, atributoAccao, erroAccao } from '../ActionEvaluator.ts';
import type { PlayerContext, Opcao, PlayerState } from '../types.ts';

export function avaliarDefesa(ctx: PlayerContext): Opcao[] {
  if (ctx.teamHasBall || ctx.hasBall || ctx.me.role === 'GR') return [];
  const me = ctx.me, out: Opcao[] = [];
  const minhaBaliza = { x: me.team === 0 ? 0 : CAMPO.comprimento, y: CAMPO.largura / 2 };
  // Desarmar o portador ao alcance.
  if (ctx.carrier) {
    const d = dist(me.pos, ctx.carrier.pos);
    if (d < 4) {
      const bc = d <= 2.5 ? K.desarme_ao_alcance : 0;
      const u = utilidade(ctx, 'desarmar', bc);
      const erro = erroAccao(atributoAccao(me, 'desarmar'), null, me.condition);
      out.push({ tipo: 'desarmar', utilidade: u, action: { type: 'tackle', target: { ...ctx.carrier.pos }, targetPlayerId: ctx.carrier.id, option: 'desarmar', utility: u, error: erro } });
    }
  }
  // Marcar: o adversário mais perigoso perto da minha posição na forma (mais perto da minha baliza pesa mais).
  let alvo: PlayerState | null = null, melhor = -Infinity;
  for (const o of ctx.opponents) {
    if (o.role === 'GR' || o.id === ctx.carrier?.id) continue;
    const dZona = dist(o.pos, ctx.shapeTarget);
    if (dZona > 18) continue;
    const perigo = 30 - dist(o.pos, minhaBaliza) / 3 - dZona;
    if (perigo > melhor) { melhor = perigo; alvo = o; }
  }
  if (alvo) {
    const goalSide = { x: alvo.pos.x + (minhaBaliza.x - alvo.pos.x) * 0.12, y: alvo.pos.y + (minhaBaliza.y - alvo.pos.y) * 0.12 };
    const bc = dist(alvo.pos, minhaBaliza) < 35 ? K.marcar_atacante_perigoso : 0;
    const u = utilidade(ctx, 'marcar', bc);
    out.push({ tipo: 'marcar', utilidade: u, action: { type: 'mark', target: goalSide, targetPlayerId: alvo.id, option: 'marcar', utility: u } });
    // Interceptar: meio da linha entre o portador e esse adversário.
    if (ctx.carrier) {
      const meio = { x: (ctx.carrier.pos.x + alvo.pos.x) / 2, y: (ctx.carrier.pos.y + alvo.pos.y) / 2 };
      const perto = dist(me.pos, meio) < 10;
      const ui = utilidade(ctx, 'interceptar', perto ? K.interceptar_linha : -1);
      out.push({ tipo: 'interceptar', utilidade: ui, action: { type: 'move', target: meio, targetPlayerId: alvo.id, option: 'interceptar', utility: ui } });
    }
  }
  return out;
}
