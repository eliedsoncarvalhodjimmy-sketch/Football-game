// Motor 2D táctico — Fase 2 (docs/tactics/MOTOR_2D.md, secção 13): bola com física e passes curtos, intercepção pela
// trajectória, OFERECER_APOIO, primeiro toque e reposições sem teletransporte.
import { describe, expect, it } from 'vitest';
import { Motor2D } from '../src/engine/match2d/Motor2D.ts';
import { gerarEquipa2D } from '../src/engine/match2d/equipas.ts';
import { Medidor } from '../src/engine/match2d/metricas.ts';
import { avancarBola, velocidadePasse, preverTrajectoria } from '../src/engine/match2d/bola.ts';
import { ameaca } from '../src/engine/match2d/passe.ts';
import { dist } from '../src/engine/match2d/referencial.ts';
import { distSegmento } from '../src/engine/decision/ContextBuilder.ts';
import { BOLA } from '../src/config/match2d/bola.ts';
import { PORTADOR } from '../src/config/match2d/fase3.ts';
import type { IdEstilo } from '../src/config/estilos.ts';

const motor = (semente = 's1', ea: IdEstilo = 'tiki_taka', eb: IdEstilo = 'bloco_medio_baixo', fa = '4-3-3', fb = '4-4-2') =>
  new Motor2D({ semente, equipas: [{ nome: 'A', formacao: fa, estilo: ea, jogadores: gerarEquipa2D('a', 70, fa) }, { nome: 'B', formacao: fb, estilo: eb, jogadores: gerarEquipa2D('b', 68, fb) }] });

describe('motor 2D — Fase 2: bola e passes curtos', () => {
  it('física da bola: um passe de 20 m demora ~1,3 s, perde ~10% de velocidade por segundo e acaba por parar', () => {
    const v0 = velocidadePasse(20);
    expect(v0).toBeGreaterThanOrEqual(BOLA.passe_vmin); expect(v0).toBeLessThanOrEqual(BOLA.passe_vmax);
    let p = { x: 0, y: 0 }, v = { x: v0, y: 0 }, t = 0;
    while (p.x < 20) { ({ p, v } = avancarBola(p, v, 0.1)); t += 0.1; }
    expect(t).toBeGreaterThan(1.1); expect(t).toBeLessThan(1.5);
    // Perda em 1 s a alta velocidade: ~10% (mais o rolamento).
    const um = { v: { x: 20, y: 0 }, p: { x: 0, y: 0 } };
    let q = um; for (let k = 0; k < 10; k++) q = avancarBola(q.p, q.v, 0.1);
    expect(q.v.x / 20).toBeGreaterThan(0.86); expect(q.v.x / 20).toBeLessThan(0.91);
    // Uma bola a 3 m/s pára (o rolamento acaba com ela) em menos de 10 s.
    let r = { p: { x: 50, y: 34 }, v: { x: 3, y: 0 } }, tr = 0;
    while (r.v.x > 0 && tr < 20) { r = avancarBola(r.p, r.v, 0.1); tr += 0.1; }
    expect(tr).toBeLessThan(10);
    expect(preverTrajectoria({ x: 50, y: 34 }, { x: 15, y: 0 }).length).toBeGreaterThan(10);
    // Mapa de ameaça: cresce para a baliza e é maior ao centro.
    expect(ameaca({ x: 95, y: 34 })).toBeGreaterThan(ameaca({ x: 70, y: 34 }));
    expect(ameaca({ x: 70, y: 34 })).toBeGreaterThan(ameaca({ x: 70, y: 5 }));
  });

  it('10 min de jogo: a bola circula em passes curtos, quase sempre certos, e só muda de dono com contacto', () => {
    const m = motor();
    const s = m.estado;
    let donoAntes: string | null = s.bola.dono, mudancas = 0, semContacto = 0;
    for (let k = 0; k < 6000; k++) {
      const antes = { ...s.bola.p };
      m.passo();
      if (s.bola.dono && s.bola.dono !== donoAntes) {
        mudancas++;
        const j = s.jogadores.find((o) => o.id === s.bola.dono)!;
        // Quem recebe ou intercepta estava ao alcance do percurso da bola neste tick (contacto físico). Os desarmes
        // (a 1,5 m), as defesas do GR (mergulho) e as reposições têm o seu próprio alcance.
        const ev = s.eventos.filter((x) => x.tick === s.tick).map((x) => x.tipo);
        const toque = ev.includes('recepcao') || ev.includes('intercepcao');
        if (toque && distSegmento(j.p, antes, s.bola.p) > BOLA.alcance + 0.6 && dist(j.p, s.bola.p) > BOLA.alcance + 0.6) semContacto++;
      }
      donoAntes = s.bola.dono;
    }
    const e = s.estat, passes = e.passes[0] + e.passes[1], certos = e.certos[0] + e.certos[1];
    expect(passes).toBeGreaterThan(120);
    // Com a pressão e os desarmes da Fase 3 o acerto desce do ~95% da Fase 2 (sem pressão) para valores reais.
    expect(certos / passes).toBeGreaterThan(0.65);
    expect(mudancas).toBeGreaterThan(100);
    expect(semContacto).toBe(0);
    // Passes curtos: o destino pretendido nunca passa do limite de recurso; a mediana entre 8 e 18 m.
    const ds = s.eventos.filter((x) => x.tipo === 'passe' && x.alvo).map((x) => Math.hypot(x.alvo!.x - x.x, x.alvo!.y - x.y));
    ds.sort((a, b) => a - b);
    expect(ds[Math.floor(ds.length / 2)]).toBeGreaterThan(8); expect(ds[Math.floor(ds.length / 2)]).toBeLessThan(18);
    // Fase 3: também há passes longos e mudanças de flanco (até 60 m).
    expect(ds[ds.length - 1]).toBeLessThanOrEqual(PORTADOR.max_passe + 4);
  });

  it('intercepções pela trajectória: acontecem, e o interceptor estava no caminho da bola', () => {
    let total = 0;
    for (const sem of ['a', 'b', 'c']) {
      const m = motor(sem, 'tiki_taka', 'gegenpressen');
      for (let k = 0; k < 6000; k++) {
        const antes = m.estado.estat.intercepcoes[0] + m.estado.estat.intercepcoes[1];
        const bolaAntes = { ...m.estado.bola.p };
        m.passo();
        const depois = m.estado.estat.intercepcoes[0] + m.estado.estat.intercepcoes[1];
        if (depois > antes) {
          total++;
          const ev = m.estado.eventos.filter((x) => x.tipo === 'intercepcao').pop()!;
          const j = m.estado.jogadores.find((o) => o.id === ev.jogador)!;
          expect(Math.min(dist(j.p, bolaAntes), dist(j.p, m.estado.bola.p))).toBeLessThan(BOLA.alcance + 2.5);
        }
      }
    }
    expect(total).toBeGreaterThan(5);
  });

  it('triângulos: com a bola, 2–3 colegas oferecem apoio a 6–22 m do portador, em ângulos diferentes', () => {
    const m = motor('tri');
    const s = m.estado;
    let amostras = 0, comApoio = 0, dentro = 0, nApoio = 0, emAngulo = 0;
    for (let k = 0; k < 6000; k++) {
      m.passo();
      const p = s.jogadores.find((o) => o.id === s.bola.dono);
      if (!p || k % 5) continue;
      amostras++;
      const ap = s.jogadores.filter((o) => o.equipa === p.equipa && o.accao === 'OFERECER_APOIO');
      if (ap.length >= 2) comApoio++;
      for (const a of ap) { nApoio++; if (dist(a.p, p.p) >= 6 && dist(a.p, p.p) <= 22) dentro++; }
      const alvos = ap.filter((a) => a.alvoAccao).map((a) => a.alvoAccao!);
      if (alvos.length >= 2) {
        const ang = alvos.map((a) => Math.atan2(a.y - p.p.y, a.x - p.p.x)).sort((x, y) => x - y);
        if (ang.every((a, i) => i === 0 || a - ang[i - 1] > 0.3)) emAngulo++;
      }
    }
    expect(comApoio / amostras).toBeGreaterThan(0.5);
    expect(dentro / nApoio).toBeGreaterThan(0.6);
    expect(emAngulo / Math.max(1, comApoio)).toBeGreaterThan(0.8);
  });

  it('movimento com a bola real: sem inversões, pouco ziguezague, perto da forma e dentro dos limites físicos', () => {
    const m = motor('mov');
    const med = new Medidor();
    for (let k = 0; k < 6000; k++) { m.passo(); med.registar(m); }
    const r = med.resumo();
    expect(r.inversoesPorJogMin).toBeLessThan(0.2);
    expect(r.ziguezaguesPorJogMin).toBeLessThan(4.5); // Fase 3: pressões e dribles mudam mais de direcção
    expect(r.pertoAncoraPct).toBeGreaterThan(45); // Fase 3: largura, apoio frontal, equilíbrio afastam da âncora de propósito
    expect(r.acimaVelMax).toBe(0); expect(r.acelExcesso).toBe(0);
    expect(r.coladosPorMin).toBeLessThan(80);
  });

  it('bola fora: quem repõe vai buscá-la (sem teletransporte) e o jogo recomeça', () => {
    const m = motor('fora');
    const s = m.estado;
    // Atira a bola para fora pela linha lateral.
    s.bola.dono = null; s.bola.p = { x: 50, y: 66 }; s.bola.v = { x: 0, y: 8 }; s.bola.equipaUltima = 0; s.bola.tickUltimo = s.tick;
    const pos = new Map(s.jogadores.map((j) => [j.id, { ...j.p }]));
    let repos = false, recomecou = false, salto = 0;
    for (let k = 0; k < 400 && !recomecou; k++) {
      m.passo();
      if (s.reposicao) repos = true;
      for (const j of s.jogadores) { if (dist(pos.get(j.id)!, j.p) > 1.2) salto++; pos.set(j.id, { ...j.p }); }
      if (repos && !s.reposicao) recomecou = true;
    }
    expect(repos).toBe(true); expect(recomecou).toBe(true); expect(salto).toBe(0);
    expect(s.posse).toBe(1);
    expect(s.eventos.some((x) => x.tipo === 'reposicao')).toBe(true);
  });

  it('determinismo: a mesma semente dá o mesmo jogo; outra semente, outro jogo', () => {
    const a = motor('d'), b = motor('d'), c = motor('outra');
    for (let k = 0; k < 2000; k++) { a.passo(); b.passo(); c.passo(); }
    expect(JSON.stringify(a.estado)).toBe(JSON.stringify(b.estado));
    expect(JSON.stringify(a.estado.estat)).not.toBe(JSON.stringify(c.estado.estat));
  });
});
