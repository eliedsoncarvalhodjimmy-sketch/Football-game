// Passes: curto (até 25 m), longo (25–55 m) e cruzamento (do corredor lateral no último terço para a área).
// Para cada tipo avalia o melhor receptor (o mais livre, com a linha de passe aberta e a progredir) e devolve uma opção.
import { CAMPO, CONTEXTO as K } from '../../../config/decisao.ts';
import { dist } from '../../physics/Steering.ts';
import { distSegmento } from '../ContextBuilder.ts';
import { utilidade, atributoAccao, erroAccao, aplicarErro } from '../ActionEvaluator.ts';
import type { PlayerContext, Opcao, PlayerState } from '../types.ts';

const LINHA_CORTADA_M = 1.6;

function abertura(ctx: PlayerContext, r: PlayerState) {
  let livre = Infinity, corte = Infinity;
  for (const o of ctx.opponents) {
    livre = Math.min(livre, dist(o.pos, r.pos));
    corte = Math.min(corte, distSegmento(o.pos, ctx.me.pos, r.pos));
  }
  return { livre, cortada: corte < LINHA_CORTADA_M };
}

export function avaliarPasses(ctx: PlayerContext): Opcao[] {
  if (!ctx.hasBall) return [];
  const me = ctx.me, out: Opcao[] = [];
  const ultimoTerco = (me.team === 0 ? me.pos.x : CAMPO.comprimento - me.pos.x) > CAMPO.comprimento * 0.66;
  const corredor = Math.abs(me.pos.y - CAMPO.largura / 2) > CAMPO.largura / 2 - 14;
  let melhor: Record<'passe_curto' | 'passe_longo' | 'cruzamento', Opcao | null> = { passe_curto: null, passe_longo: null, cruzamento: null };
  for (const r of ctx.teammates) {
    if (r.role === 'GR' && ctx.dir * (r.pos.x - me.pos.x) < -30) continue; // não devolve ao guarda-redes de muito longe
    const d = dist(me.pos, r.pos);
    if (d < 4 || d > 55) continue;
    // Fora de jogo: o receptor está para lá da linha (e à frente da bola).
    if (ctx.dir * (r.pos.x - ctx.offsideX) > 0 && ctx.dir * (r.pos.x - me.pos.x) > 0) continue;
    const { livre, cortada } = abertura(ctx, r);
    const progresso = ctx.dir * (r.pos.x - me.pos.x);
    const naArea = (r.team === 0 ? r.pos.x > CAMPO.comprimento - CAMPO.area_comp : r.pos.x < CAMPO.area_comp) && Math.abs(r.pos.y - CAMPO.largura / 2) < CAMPO.area_larg / 2;
    const tipo: 'passe_curto' | 'passe_longo' | 'cruzamento' = corredor && ultimoTerco && naArea ? 'cruzamento' : d <= 25 ? 'passe_curto' : 'passe_longo';
    let bc = 0;
    if (livre >= K.livre_metros && d <= 12 && tipo === 'passe_curto') bc += K.colega_livre_curto;
    else if (livre >= K.livre_metros) bc += 1.0;
    if (cortada && tipo !== 'cruzamento') bc += K.linha_cortada;
    if (progresso < 0) bc += K.passe_para_tras;
    bc += (Math.max(-20, progresso) / 10) * K.progressao_por_10m;
    if (tipo === 'cruzamento') bc += K.cruzamento_zona;
    const u = utilidade(ctx, tipo, bc);
    if (melhor[tipo] && melhor[tipo]!.utilidade >= u) continue;
    // Acção (compatível com a física 2.5D): alvo à frente do receptor, força pela distância, altura e rotação pelo tipo.
    const alvo = { x: r.pos.x + r.vel.x * 0.6, y: r.pos.y + r.vel.y * 0.6 };
    const ang = Math.atan2(alvo.y - me.pos.y, alvo.x - me.pos.x);
    const erro = erroAccao(atributoAccao(me, tipo), ctx.nearestOpp?.d ?? null, me.condition);
    const { direction, power } = aplicarErro(`${me.id}|${ctx.state.tick}|${tipo}`, ang, Math.min(1, d / 50), erro);
    const height = tipo === 'cruzamento' ? 'high' : tipo === 'passe_longo' ? (cortada ? 'high' : 'mid') : cortada ? 'low' : 'ground';
    const spin = tipo === 'cruzamento' ? (me.pos.y < CAMPO.largura / 2 ? 'lateral_right' : 'lateral_left') : tipo === 'passe_longo' ? 'backspin' : 'none';
    melhor[tipo] = { tipo, utilidade: u, action: { type: tipo === 'cruzamento' ? 'cross' : 'pass', target: alvo, targetPlayerId: r.id, power, direction, height, spin, option: tipo, utility: u, error: erro } };
  }
  for (const o of Object.values(melhor)) if (o) out.push(o);
  return out;
}
