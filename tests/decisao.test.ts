// Motor de decisão (camada 1): testes obrigatórios do pedido e de desempenho.
import { describe, expect, it } from 'vitest';
import { decideAction, limparMemo, avaliarOpcoes, cicloDecisao } from '../src/engine/decision/DecisionEngine.ts';
import { buildContext } from '../src/engine/decision/ContextBuilder.ts';
import { erroAccao } from '../src/engine/decision/ActionEvaluator.ts';
import { criarEstado, gerarEquipa, tactica } from '../src/engine/decision/montarJogo.ts';
import { formaEquipa, sectorDe } from '../src/engine/decision/TeamShape.ts';
import { CoachAI } from '../src/engine/coach/CoachAI.ts';
import { passo, limites } from '../src/engine/physics/Steering.ts';
import { mulberry32 } from '../src/engine/decision/rng.ts';
import { VERSAO_DECISAO, ESTILOS_DECISAO } from '../src/config/decisao.ts';
import type { IdEstilo } from '../src/config/estilos.ts';
import type { MatchState, PlayerState } from '../src/engine/decision/types.ts';

/** Estado com a bola num médio da equipa 0, num ponto dado do campo (os outros espalhados de forma determinística). */
function cenario(semente: number, opts: { estilo?: IdEstilo; passe?: number; moral?: number; x?: number; y?: number } = {}): { s: MatchState; p: PlayerState } {
  const a = gerarEquipa('a', 68), b = gerarEquipa('b', 68);
  const s = criarEstado([a.onze, b.onze], [tactica(opts.estilo ?? 'futebol_total'), tactica('bloco_medio_baixo', '4-4-2')]);
  const r = mulberry32(semente);
  for (const q of s.players) {
    if (q.role === 'GR') continue;
    q.pos = { x: 15 + r() * 75, y: 5 + r() * 58 };
  }
  const p = s.players.find((q) => q.team === 0 && q.role === 'MC')!;
  p.pos = { x: opts.x ?? 45 + r() * 20, y: opts.y ?? 15 + r() * 38 };
  if (opts.passe !== undefined) { p.attrs = { ...p.attrs, pas: opts.passe, vis: opts.passe, dec: opts.passe, tec: opts.passe }; }
  if (opts.moral !== undefined) p.morale = opts.moral;
  s.ball.ownerId = p.id; s.ball.pos = { ...p.pos }; s.possessionTeam = 0;
  s.tick = 10 + semente;
  return { s, p };
}

describe('motor de decisão (camada 1)', () => {
  it('1. o mesmo jogador no mesmo estado escolhe a mesma acção 100 vezes', () => {
    const { s, p } = cenario(7);
    const primeira = JSON.stringify(decideAction(p, buildContext(s, p)));
    for (let k = 0; k < 100; k++) {
      limparMemo(); // sem a memoização: a decisão em si é determinística
      expect(JSON.stringify(decideAction(p, buildContext(s, p)))).toBe(primeira);
    }
    expect(VERSAO_DECISAO).toBe('v1');
  });

  it('2. Passe 18 passa mais vezes do que Passe 8 nos mesmos contextos', () => {
    let alto = 0, baixo = 0;
    for (let k = 0; k < 200; k++) {
      limparMemo();
      const A = cenario(k, { passe: 18 }); if (decideAction(A.p, buildContext(A.s, A.p)).type === 'pass') alto++;
      limparMemo();
      const B = cenario(k, { passe: 8 }); if (decideAction(B.p, buildContext(B.s, B.p)).type === 'pass') baixo++;
    }
    expect(alto).toBeGreaterThan(baixo);
  });

  it('3. "Jogo Direto" aumenta os passes longos face ao "Tiki-Taka"', () => {
    const contar = (estilo: IdEstilo) => {
      let n = 0;
      for (let k = 0; k < 200; k++) { limparMemo(); const c = cenario(k, { estilo }); if (decideAction(c.p, buildContext(c.s, c.p)).option === 'passe_longo') n++; }
      return n;
    };
    expect(contar('jogo_direto')).toBeGreaterThan(contar('tiki_taka'));
  });

  it('4. moral baixa (< 30) reduz a utilidade de driblar e de rematar de longe', () => {
    for (let k = 0; k < 20; k++) {
      const alta = cenario(k, { moral: 85, x: 76, y: 34 }), baixa = cenario(k, { moral: 20, x: 76, y: 34 });
      const u = (c: ReturnType<typeof cenario>, t: string) => avaliarOpcoes(buildContext(c.s, c.p)).find((o) => o.tipo === t)?.utilidade ?? NaN;
      expect(u(baixa, 'driblar')).toBeLessThan(u(alta, 'driblar'));
      // A 29 m da baliza: remate de longe (acima de 22 m) é acção de risco.
      expect(u(baixa, 'rematar')).toBeLessThan(u(alta, 'rematar'));
    }
  });

  it('5. o treinador IA passa a mentalidade ofensiva quando perde depois do minuto 60', () => {
    const { s } = cenario(3);
    s.score = [0, 1];
    s.tactics[0].mentality = 0;
    const t = new CoachAI('treinador-teste', 0, { tactica: 18, gestao: 16, motivacao: 18 }, []);
    let mudou = false;
    for (let m = 60; m <= 85 && !mudou; m += 5) {
      s.minute = m;
      const d = t.avaliar(s);
      t.aplicar(s, d);
      if (d.some((x) => x.tipo === 'mentalidade')) mudou = true;
    }
    expect(mudou).toBe(true);
    expect(s.tactics[0].mentality).toBeGreaterThan(0);
    // A ganhar ou antes do minuto 60, não muda.
    const t2 = new CoachAI('treinador-teste-2', 0, { tactica: 20, gestao: 20, motivacao: 20 }, []);
    const s2 = cenario(4).s; s2.score = [0, 1]; s2.minute = 40;
    expect(t2.avaliar(s2).some((x) => x.tipo === 'mentalidade')).toBe(false);
  });

  it('6. o erro de passe aumenta sob pressão e com fadiga', () => {
    const fresco = erroAccao(18, 10, 1), pressionado = erroAccao(18, 2, 1), pressionadoCansado = erroAccao(18, 2, 0.5);
    expect(fresco).toBeCloseTo(0.03, 5); // Passe 18 no minuto 5: ~3%
    expect(pressionado).toBeGreaterThan(fresco);
    expect(pressionadoCansado).toBeGreaterThan(pressionado);
    expect(pressionadoCansado).toBeCloseTo(0.28, 5); // minuto 85 sob pressão: ~25–28%
    expect(erroAccao(1, 1, 0.1)).toBeLessThanOrEqual(0.5);
  });

  it('7. passes e remates trazem height e spin válidos (compatível com a física 2.5D)', () => {
    const alturas = ['ground', 'low', 'mid', 'high'], rotacoes = ['none', 'lateral_left', 'lateral_right', 'backspin', 'topspin'];
    let vistos = 0;
    for (let k = 0; k < 60; k++) {
      const c = cenario(k, { x: k % 2 ? 90 : 50 });
      for (const o of avaliarOpcoes(buildContext(c.s, c.p))) {
        if (o.action.type !== 'pass' && o.action.type !== 'cross' && o.action.type !== 'shoot') continue;
        expect(alturas).toContain(o.action.height);
        expect(rotacoes).toContain(o.action.spin);
        expect(o.action.power).toBeGreaterThan(0);
        expect(o.action.power).toBeLessThanOrEqual(1);
        expect(Number.isFinite(o.action.direction)).toBe(true);
        vistos++;
      }
    }
    expect(vistos).toBeGreaterThan(50);
  });

  it('forma da equipa: a linha defensiva fica alinhada; sem bola, entre a bola e a baliza', () => {
    const { s } = cenario(11);
    s.possessionTeam = 1; s.ball.ownerId = null; s.ball.pos = { x: 30, y: 30 };
    const f = formaEquipa(s, 0);
    const dcs = s.players.filter((p) => p.team === 0 && p.role === 'DC').map((p) => f.get(p.id)!.x);
    expect(Math.max(...dcs) - Math.min(...dcs)).toBeLessThan(0.01);
    expect(Math.max(...dcs)).toBeLessThan(30);
    expect(s.players.filter((p) => p.team === 0).map(sectorDe)).toContain('gr');
  });

  it('steering: a velocidade e a aceleração respeitam os atributos', () => {
    const { s } = cenario(2);
    const p = s.players.find((q) => q.team === 0 && q.role === 'PL')!;
    p.vel = { x: 0, y: 0 };
    const L = limites(p);
    let r = { pos: p.pos, vel: p.vel };
    for (let k = 0; k < 50; k++) { r = passo({ ...p, pos: r.pos, vel: r.vel }, { x: p.pos.x + 60, y: p.pos.y }, [], 0.1); }
    expect(Math.hypot(r.vel.x, r.vel.y)).toBeLessThanOrEqual(L.velMax + 1e-6);
    const r1 = passo({ ...p, vel: { x: 0, y: 0 } }, { x: p.pos.x + 60, y: p.pos.y }, [], 0.1);
    expect(Math.hypot(r1.vel.x, r1.vel.y)).toBeLessThanOrEqual(L.acelMax * 0.1 + 1e-6);
  });

  it('desempenho: decideAction < 1 ms por jogador; ciclo de 22 jogadores < 25 ms', () => {
    const { s } = cenario(5);
    limparMemo();
    // Aquecimento (JIT).
    for (let k = 0; k < 200; k++) for (const p of s.players) decideAction(p, buildContext(s, p));
    const t0 = performance.now();
    let n = 0;
    for (let k = 0; k < 50; k++) { limparMemo(); s.tick++; for (const p of s.players) { decideAction(p, buildContext(s, p)); n++; } }
    const porJogador = (performance.now() - t0) / n;
    expect(porJogador).toBeLessThan(1);
    const t1 = performance.now();
    limparMemo();
    cicloDecisao(s, new Map());
    expect(performance.now() - t1).toBeLessThan(25);
    expect(Object.keys(ESTILOS_DECISAO).length).toBe(8);
  });
});
