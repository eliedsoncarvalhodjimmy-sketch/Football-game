// Fase 2, Bloco B: tácticas, ratings, modificadores, motor detalhado e rápido, falso 9, IA do onze.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { diaInicioMundo } from '../src/engine/world.ts';
import { FORMACOES, INSTRUCOES_NEUTRAS } from '../src/config/tacticas.ts';
import { MODIFICADORES, RATINGS } from '../src/config/ratings.ts';
import { DETALHADO } from '../src/config/motor.ts';
import { calcularRatings } from '../src/match/ratings.ts';
import { escolherOnze } from '../src/match/onze.ts';
import { prepararLado, golosRapido } from '../src/match/rapido.ts';
import { jogoDetalhado, probDuelo } from '../src/match/detalhado.ts';
import { prepararPlantel, correrFalso9 } from '../src/match/falso9.ts';
import { forcaAlvo, forcaOnze } from '../src/players/afinacao.ts';
import { relatoDetalhado, escolherExemplo } from '../src/cli/simulate-match.ts';
import { Rng } from '../src/core/rng.ts';

let w: World;
const dia = diaInicioMundo() + 40;
beforeAll(async () => { w = await mundo(); }, 60000);

describe('tácticas e ratings', () => {
  it('pelo menos 8 formações, todas com 11 lugares e um guarda-redes', () => {
    expect(FORMACOES.length).toBeGreaterThanOrEqual(8);
    for (const f of FORMACOES) {
      expect(f.lugares.length).toBe(11);
      expect(f.lugares.filter((l) => l.pos === 'GR').length).toBe(1);
    }
  });

  it('9 ratings na escala 1–20 e cache por onze', () => {
    const c = w.ligaPorId('ENG1').clubes[0];
    const a = prepararLado(w, c, dia, Rng.de(1));
    const b = prepararLado(w, c, dia, Rng.de(1));
    expect(RATINGS.length).toBe(9);
    for (const k of RATINGS) { expect(a.ratings.r[k]).toBeGreaterThan(1); expect(a.ratings.r[k]).toBeLessThan(25); }
    expect(b.ratings).toBe(a.ratings); // mesmo onze → mesmo objecto da cache
  });

  it('instruções têm efeitos medidos: mentalidade ofensiva sobe criação/finalização e baixa a transição', () => {
    const c = w.ligaPorId('ESP1').clubes[0];
    const e = escolherOnze(w.jogadores!, w.plantel[c], w.motor!.treinadores[c], dia, Rng.de(2));
    const base = calcularRatings(w.jogadores!, { ...e.onze, instrucoes: INSTRUCOES_NEUTRAS });
    const ofe = calcularRatings(w.jogadores!, { ...e.onze, instrucoes: { ...INSTRUCOES_NEUTRAS, mentalidade: 2 } });
    const pre = calcularRatings(w.jogadores!, { ...e.onze, instrucoes: { ...INSTRUCOES_NEUTRAS, pressao: 1 } });
    expect(ofe.r.criacao).toBeGreaterThan(base.r.criacao);
    expect(ofe.r.finalizacao).toBeGreaterThan(base.r.finalizacao);
    expect(ofe.r.transicao).toBeLessThan(base.r.transicao);
    expect(pre.r.pressao).toBeGreaterThan(base.r.pressao);
  });

  it('modificadores: cada um no seu limite e o total em ±15%', () => {
    for (let c = 0; c < w.clubes.length; c += 7) {
      const l = prepararLado(w, c, dia, Rng.de(3, c));
      expect(Math.abs(l.mod)).toBeLessThanOrEqual(MODIFICADORES.limite_total + 1e-9);
      expect(Math.abs(l.parcelas.moral)).toBeLessThanOrEqual(MODIFICADORES.moral.limite + 1e-9);
      expect(Math.abs(l.parcelas.forma)).toBeLessThanOrEqual(MODIFICADORES.forma.limite + 1e-9);
    }
  });

  it('plantéis gerados afinados à força-alvo da Fase 1', () => {
    let perto = 0, n = 0;
    for (let c = 0; c < w.clubes.length; c += 5) {
      if (w.liga[c] < 0) continue;
      n++;
      if (Math.abs(forcaOnze(w, c, w.motor!.treinadores[c], dia) - forcaAlvo(w, c)) <= 3) perto++;
    }
    expect(perto / n).toBeGreaterThan(0.85);
  });
});

describe('motor detalhado', () => {
  it('duelo 19 contra 11 ≈ 70%, diferença limitada a ±10', () => {
    expect(probDuelo(19, 11)).toBeCloseTo(0.7, 2);
    expect(probDuelo(20, 1)).toBeCloseTo(0.5 + DETALHADO.K * 10, 5);
    expect(DETALHADO.K).toBeGreaterThanOrEqual(0.02);
    expect(DETALHADO.K).toBeLessThanOrEqual(0.03);
  });

  it('determinista e com eventos coerentes com o resultado', () => {
    const [c, f] = escolherExemplo(w, 'equilibrado');
    const corre = () => {
      const rng = Rng.de(11, 'teste');
      const a = prepararLado(w, c, dia, rng), b = prepararLado(w, f, dia, rng);
      return { r: jogoDetalhado(w, a, b, false, rng), a, b };
    };
    const x = corre(), y = corre();
    expect(y.r.golos).toEqual(x.r.golos);
    expect(y.r.eventos.length).toBe(x.r.eventos.length);
    expect(x.r.eventos.filter((e) => e.tipo === 'golo').length).toBe(x.r.golos[0] + x.r.golos[1]);
    const txt = relatoDetalhado(w, x.a, x.b, x.r).join('\n');
    expect(txt).toContain('Fim do jogo');
    expect(txt).toContain('Estatísticas finais');
  });
});

describe('calibração (amostra de 3000 jogos de liga em cada modo)', () => {
  const amostra = (modo: 'rapido' | 'detalhado') => {
    const rng = Rng.de(5, 'teste-calibracao');
    const ligas = ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'NED1', 'BRA1'].map((id) => w.ligaPorId(id));
    const lados = new Map<number, ReturnType<typeof prepararLado>>();
    const lado = (c: number) => { if (!lados.has(c)) lados.set(c, prepararLado(w, c, dia, Rng.de(9, c))); return lados.get(c)!; };
    let g = 0, casa = 0, emp = 0, z = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const cl = ligas[i % ligas.length].clubes;
      const a = rng.pick(cl);
      let b = rng.pick(cl);
      while (b === a) b = rng.pick(cl);
      const rj = Rng.de(77, modo, i);
      let x: number, y: number;
      if (modo === 'rapido') { const o = golosRapido(w, lado(a), lado(b), false, rj); x = o.gc; y = o.gf; }
      else { const o = jogoDetalhado(w, lado(a), lado(b), false, rj, { eventos: false }); [x, y] = o.golos; }
      g += x + y; if (x > y) casa++; else if (x === y) emp++;
      if (x + y === 0) z++;
    }
    return { golos: g / N, casa: casa / N, emp: emp / N, zero: z / N };
  };
  let r: ReturnType<typeof amostra>, d: ReturnType<typeof amostra>;
  it('modo rápido nos alvos', () => {
    r = amostra('rapido');
    expect(r.golos).toBeGreaterThan(2.4); expect(r.golos).toBeLessThan(2.8);
    expect(r.casa).toBeGreaterThan(0.41); expect(r.casa).toBeLessThan(0.49);
    expect(r.emp).toBeGreaterThan(0.22); expect(r.emp).toBeLessThan(0.3);
    expect(r.zero).toBeGreaterThan(0.05); expect(r.zero).toBeLessThan(0.1);
  });
  it('modo detalhado nos alvos e próximo do rápido (< 0,15 golos na amostra)', () => {
    d = amostra('detalhado');
    expect(d.golos).toBeGreaterThan(2.4); expect(d.golos).toBeLessThan(2.8);
    expect(d.casa).toBeGreaterThan(0.41); expect(d.casa).toBeLessThan(0.49);
    expect(d.emp).toBeGreaterThan(0.22); expect(d.emp).toBeLessThan(0.3);
    expect(Math.abs(d.golos - r.golos)).toBeLessThan(0.15);
  }, 30000);
});

describe('falso 9 (secção 2.5)', () => {
  it('com falso 9 adequado há mais ocasiões e interiores na área; sem ele o 9 perde mais bolas; o adaptável muda de plano', async () => {
    const v = await mundo();
    const l = v.ligaPorId('ENG1');
    const ord = [...l.clubes].sort((a, b) => v.reputacao[b] - v.reputacao[a]);
    const c = ord[5], adv = ord[9];
    prepararPlantel(v, c, 'pl_f9', 76, 'A');
    const A = correrFalso9(v, c, adv, 2, 600, dia);
    prepararPlantel(v, c, 'pl_fin', 76, 'B');
    const B = correrFalso9(v, c, adv, 2, 600, dia);
    const Bad = correrFalso9(v, c, adv, 19, 600, dia);
    const queda = 1 - B.ocasioes / A.ocasioes;
    expect(queda).toBeGreaterThan(0.1);
    expect(queda).toBeLessThan(0.3);
    expect(A.rematesInteriores).toBeGreaterThan(B.rematesInteriores);
    expect(B.perdasDoNove).toBeGreaterThan(A.perdasDoNove);
    expect(B.mudou).toBe(false);
    expect(Bad.mudou).toBe(true);
    expect(Bad.plano.includes('finalizador') || !Bad.plano.startsWith('4-3-3F9')).toBe(true);
    expect(Bad.golos - Bad.sofridos).toBeGreaterThan(B.golos - B.sofridos);
  }, 60000);
});
