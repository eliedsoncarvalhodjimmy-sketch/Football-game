// Movimento sem bola: correr para o espaço (atrás da linha adversária), apoiar o portador, manter a posição na forma,
// pressionar o portador (sem a bola) e recuar para trás da linha da bola.
import { CAMPO, CONTEXTO as K, ESTILOS_DECISAO } from '../../../config/decisao.ts';
import { dist } from '../../physics/Steering.ts';
import { utilidade } from '../ActionEvaluator.ts';
import { trela } from '../TeamShape.ts';
import type { PlayerContext, Opcao } from '../types.ts';

const clampCampo = (p: { x: number; y: number }) => ({ x: Math.max(1, Math.min(CAMPO.comprimento - 1, p.x)), y: Math.max(1, Math.min(CAMPO.largura - 1, p.y)) });

export function avaliarMovimento(ctx: PlayerContext): Opcao[] {
  if (ctx.hasBall) return [];
  const me = ctx.me, out: Opcao[] = [], s = ctx.shapeTarget, ball = ctx.state.ball.pos;
  const ef = ESTILOS_DECISAO[ctx.state.tactics[me.team].style]?.forma ?? {};
  const gr = me.role === 'GR';
  // Manter a posição (forma da equipa).
  const uM = utilidade(ctx, 'manter_posicao', 1.0 + 0.3 * (ef.posicaoFixa ?? 0));
  const sx = ctx.teamHasBall && !gr ? (ctx.dir > 0 ? Math.min(s.x, ctx.offsideX - 0.5) : Math.max(s.x, ctx.offsideX + 0.5)) : s.x;
  out.push({ tipo: 'manter_posicao', utilidade: uM, action: { type: 'move', target: { x: sx, y: s.y }, option: 'manter_posicao', utility: uM } });
  if (gr) return out;
  if (ctx.teamHasBall) {
    // Correr para o espaço: à frente da forma, na direcção da baliza, mais para avançados e médios.
    const ofensivo = me.role === 'PL' || me.role === 'ED' || me.role === 'EE' || me.role === 'MO' || me.role === 'MC';
    const prof = ofensivo ? 12 : 5;
    // Nunca para lá da linha do fora de jogo (fica 0,5 m antes).
    const xMax = ctx.offsideX - ctx.dir * 0.5;
    const xa = s.x + ctx.dir * prof;
    const alvo = clampCampo(trela(me, s, { x: ctx.dir > 0 ? Math.min(xa, xMax) : Math.max(xa, xMax), y: s.y + (ef.trocaPosicao ? (me.pos.y > CAMPO.largura / 2 ? -4 : 4) : 0) }));
    const uC = utilidade(ctx, 'correr_espaco', (ofensivo ? 1.5 : -1.0) + (ctx.dir * (ball.x - me.pos.x) > -5 ? 0.5 : 0));
    out.push({ tipo: 'correr_espaco', utilidade: uC, action: { type: 'move', target: alvo, option: 'correr_espaco', utility: uC } });
    // Apoiar: a 8–12 m do portador, ligeiramente atrás e aberto.
    if (ctx.carrier && ctx.carrier.id !== me.id) {
      const d = dist(me.pos, ctx.carrier.pos);
      const lado = me.pos.y > ctx.carrier.pos.y ? 1 : -1;
      // Na trela: só apoia de perto quem tem a zona perto do portador; os outros oferecem-se a partir do seu lugar.
      const alvoA = clampCampo(trela(me, s, { x: ctx.carrier.pos.x - ctx.dir * 4, y: ctx.carrier.pos.y + lado * 9 }));
      const uA = utilidade(ctx, 'apoiar', d < 25 ? 1.5 : -1.5);
      out.push({ tipo: 'apoiar', utilidade: uA, action: { type: 'move', target: alvoA, option: 'apoiar', utility: uA } });
    }
    return out;
  }
  // Sem a bola: pressionar (o mais perto ou a menos de 15 m) ou recuar para trás da linha da bola.
  const dBola = dist(me.pos, ball);
  // Só pressiona o mais próximo da bola (e um segundo, com pressão alta); os outros guardam a linha e marcam.
  const ordem = ctx.teammates.filter((t) => dist(t.pos, ball) < dBola).length;
  // Perto da própria baliza (bola a menos de 30 m) qualquer estilo fecha o portador: o mais próximo e um segundo.
  const perigo = Math.abs(ball.x - (me.team === 0 ? 0 : CAMPO.comprimento)) < 30;
  const segundo = ordem === 1 && (ctx.state.tactics[me.team].pressing >= 0.7 || perigo);
  const defesa = me.role === 'DC' || me.role === 'DD' || me.role === 'DE';
  const bcP = (ordem === 0 ? K.pressao_mais_proximo + (perigo ? 2.5 : 0) : segundo ? (perigo ? 2.5 : 1) : -2.5) - (dBola > 15 ? 2 + dBola / 10 : 0) - (defesa && ordem > 0 ? 1.5 : 0);
  const uP = utilidade(ctx, 'pressionar', bcP);
  // Pressionar de frente: um ponto a 1,5 m do portador, do lado da própria baliza (fecha o caminho, não corre atrás).
  // Quem não é o primeiro nem o segundo a pressionar só encurta, sem sair da zona.
  const minhaBaliza = { x: me.team === 0 ? 0 : CAMPO.comprimento, y: CAMPO.largura / 2 };
  const ref = ctx.carrier?.pos ?? ball;
  const gl = Math.hypot(minhaBaliza.x - ref.x, minhaBaliza.y - ref.y) || 1;
  const frente = { x: ref.x + ((minhaBaliza.x - ref.x) / gl) * 1.5, y: ref.y + ((minhaBaliza.y - ref.y) / gl) * 1.5 };
  const alvoP = ordem === 0 || segundo ? frente : trela(me, s, frente);
  out.push({ tipo: 'pressionar', utilidade: uP, action: { type: 'press', target: clampCampo(alvoP), targetPlayerId: ctx.carrier?.id, option: 'pressionar', utility: uP } });
  const atras = ctx.dir * (me.pos.x - ball.x) > 0; // estou à frente da bola (do lado errado)?
  const uR = utilidade(ctx, 'recuar', atras ? K.recuar_atras_da_bola : -0.5);
  out.push({ tipo: 'recuar', utilidade: uR, action: { type: 'move', target: clampCampo(trela(me, s, { x: me.team === 0 ? Math.min(s.x, ball.x - 3) : Math.max(s.x, ball.x + 3), y: s.y }, 1.4)), option: 'recuar', utility: uR } });
  return out;
}
