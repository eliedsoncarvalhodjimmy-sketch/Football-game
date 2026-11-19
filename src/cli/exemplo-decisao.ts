// Exemplo de uso do motor de decisão: 22 jogadores, 10 ticks (100 ms cada), imprime as acções decididas.
// Uso: npm run exemplo-decisao
import { cicloDecisao, decideNesteTick } from '../engine/decision/DecisionEngine.ts';
import { criarEstado, gerarEquipa, tactica } from '../engine/decision/montarJogo.ts';
import { passo } from '../engine/physics/Steering.ts';
import { VERSAO_DECISAO } from '../config/decisao.ts';
import type { Action } from '../engine/decision/types.ts';

const a = gerarEquipa('a', 72, '4-3-3'), b = gerarEquipa('b', 70, '4-4-2');
const s = criarEstado([a.onze, b.onze], [tactica('gegenpressen', '4-3-3'), tactica('contra_ataque', '4-4-2')]);
let accoes = new Map<string, Action>();
const fmt = (x: Action) => `${x.option ?? x.type}${x.targetPlayerId ? ` → ${x.targetPlayerId}` : ''}${x.target ? ` (${x.target.x.toFixed(1)}, ${x.target.y.toFixed(1)})` : ''}${x.height ? ` ${x.height}/${x.spin}` : ''}${x.error !== undefined ? ` erro ${(x.error * 100).toFixed(0)}%` : ''}`;

console.log(`Motor de decisão ${VERSAO_DECISAO} · Gegenpressen (4-3-3) contra Contra-ataque (4-4-2) · 22 jogadores\n`);
for (let t = 1; t <= 10; t++) {
  s.tick = t;
  s.minute = (t * 0.1) / 60;
  const antes = accoes;
  const t0 = performance.now();
  accoes = cicloDecisao(s, antes);
  const ms = performance.now() - t0;
  console.log(`— tick ${t} (${(t * 0.1).toFixed(1)} s) · ciclo em ${ms.toFixed(2)} ms`);
  for (const p of s.players) {
    if (!decideNesteTick(s, p) && antes.has(p.id)) continue;
    console.log(`   ${p.team === 0 ? 'A' : 'B'} ${String(p.number).padStart(2)} ${p.role.padEnd(3)} ${p.id === s.ball.ownerId ? '(bola) ' : '       '}${fmt(accoes.get(p.id)!)}`);
  }
  // Movimento (steering) para os alvos decididos.
  for (const p of s.players) {
    const ac = accoes.get(p.id);
    const r = passo(p, ac?.target ?? p.pos, s.players.filter((o) => o.team === p.team), 0.1, ac?.type === 'press' ? 1 : 0.6);
    p.pos = r.pos; p.vel = r.vel;
  }
  const dono = s.players.find((p) => p.id === s.ball.ownerId);
  if (dono) s.ball.pos = { ...dono.pos };
}
