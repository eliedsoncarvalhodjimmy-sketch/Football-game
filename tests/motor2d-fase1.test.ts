// Motor 2D táctico — Fase 1 (docs/tactics/MOTOR_2D.md, secção 13): formações, bloco, âncoras e física dos jogadores.
import { describe, expect, it } from 'vitest';
import { Motor2D } from '../src/engine/match2d/Motor2D.ts';
import { gerarEquipa2D, lugaresApp } from '../src/engine/match2d/equipas.ts';
import { Medidor } from '../src/engine/match2d/metricas.ts';
import { posicaoCaminho } from '../src/engine/match2d/caminho.ts';
import { lugarForma, medidasForma } from '../src/engine/match2d/bloco.ts';
import { limitesFisicos, viragemMax } from '../src/engine/match2d/fisica.ts';
import { paraEquipa, dist } from '../src/engine/match2d/referencial.ts';
import { FORMAS_2D } from '../src/config/match2d/formacoes.ts';
import { ESTILOS_2D } from '../src/config/match2d/estilos.ts';
import { FORMACOES } from '../src/config/tacticas.ts';
import type { IdEstilo } from '../src/config/estilos.ts';
import type { Equipa } from '../src/engine/match2d/tipos.ts';

const ESTILOS = Object.keys(ESTILOS_2D) as IdEstilo[];
const motor = (fa = '4-3-3', fb = '4-4-2', ea: IdEstilo = 'gegenpressen', eb: IdEstilo = 'bloco_medio_baixo', posse: Equipa = 0) =>
  new Motor2D({ posse, equipas: [{ nome: 'A', formacao: fa, estilo: ea, jogadores: gerarEquipa2D('a', 70, fa) }, { nome: 'B', formacao: fb, estilo: eb, jogadores: gerarEquipa2D('b', 68, fb) }] });
const correr = (m: Motor2D, ticks: number, bola?: (t: number) => { x: number; y: number }, med?: Medidor, trocaCada = 0) => {
  for (let k = 0; k < ticks; k++) {
    if (bola) m.porBola(bola((m.estado.tick + 1) * 0.1));
    if (trocaCada && m.estado.tick > 0 && m.estado.tick % trocaCada === 0) m.trocarPosse();
    m.passo(); med?.registar(m);
  }
};

describe('motor 2D — Fase 1: formações e bloco', () => {
  it('todas as formações da app (e o 3-4-3 losango) têm as duas formas, com 11 lugares dentro do campo', () => {
    for (const f of [...FORMACOES.map((x) => x.id), '3-4-3L']) {
      expect(FORMAS_2D[f]?.lugares.length).toBe(11);
      const papeis = lugaresApp(f).map((l) => l.papel);
      for (const mi of [0, 1]) for (let k = 0; k < 11; k++) {
        const q = lugarForma(f, k, papeis[k], mi);
        expect(q.x).toBeGreaterThan(0); expect(q.x).toBeLessThan(1); expect(q.y).toBeGreaterThanOrEqual(0); expect(q.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('em todas as formações e estilos, as âncoras ficam no campo e o GR entre a bola e a baliza', () => {
    for (const f of Object.keys(FORMAS_2D)) for (const e of ESTILOS) for (const bola of [{ x: 10, y: 10 }, { x: 52, y: 34 }, { x: 95, y: 60 }]) {
      const m = motor(f, f, e, e);
      correr(m, 30, () => bola);
      for (const j of m.estado.jogadores) {
        expect(j.ancora.x).toBeGreaterThanOrEqual(1.5); expect(j.ancora.x).toBeLessThanOrEqual(103.5);
        expect(j.ancora.y).toBeGreaterThanOrEqual(1.5); expect(j.ancora.y).toBeLessThanOrEqual(66.5);
        if (j.chave === 'GR') { const a = paraEquipa(j.equipa, j.ancora); expect(a.x).toBeGreaterThanOrEqual(4); expect(a.x).toBeLessThanOrEqual(15); }
      }
    }
  });

  it('defesa organizada: linha defensiva paralela, bloco com o comprimento e a largura do estilo, a deslizar para o lado da bola', () => {
    for (const e of ESTILOS) {
      const m = motor('4-3-3', '4-4-2', 'tiki_taka', e, 0);
      const med = new Medidor();
      correr(m, 300, () => ({ x: 60, y: 14 })); // bola parada perto da ala (equipa 1 defende)
      correr(m, 200, () => ({ x: 60, y: 14 }), med);
      const r = med.resumo(), eq = m.estado.equipas[1];
      expect(eq.fase).toBe('DEF_ORGANIZADA');
      expect(r.linhaDesvioM).toBeLessThan(1.2);
      expect(r.erroComprimentoM).toBeLessThan(3);
      expect(r.erroLarguraM).toBeLessThan(3);
      expect(eq.bloco.largura).toBeCloseTo(ESTILOS_2D[e].larguraSemBola, 0);
      // Bola no lado y = 14 (absoluto) → do lado direito da equipa 1 (y da equipa = 54): o bloco desliza para lá.
      expect(eq.bloco.centroY).toBeGreaterThan(34);
      // A equipa defende à volta da bola: a maioria dos jogadores de campo entre a bola e a própria baliza.
      const bx = paraEquipa(1, { x: 60, y: 14 }).x;
      const atras = m.estado.jogadores.filter((j) => j.equipa === 1 && j.chave !== 'GR' && paraEquipa(1, j.p).x <= bx + 3).length;
      expect(atras).toBeGreaterThanOrEqual(7);
    }
  });

  it('com a bola a mexer e trocas de posse: sem tremor, sem ziguezague, perto das âncoras e dentro dos limites físicos', () => {
    const m = motor();
    const med = new Medidor();
    correr(m, 6000, posicaoCaminho, med, 200);
    const r = med.resumo();
    expect(r.pertoAncoraPct).toBeGreaterThanOrEqual(80);
    expect(r.ziguezaguesPorJogMin).toBeLessThan(4);
    expect(r.inversoesPorJogMin).toBeLessThan(0.2);
    expect(r.acimaVelMax).toBe(0);
    expect(r.acelExcesso).toBe(0);
    expect(r.coladosPorMin).toBeLessThan(1);
    // A maior parte do tempo andam e trotam; o sprint é raro (só a recuperar).
    expect(r.ritmoPct.andar + r.ritmoPct.trote).toBeGreaterThan(75);
    expect(r.ritmoPct.sprint).toBeLessThan(10);
  });

  it('troca de posse: transições, mudança gradual de forma (1,5–3 s) e recuperação em sprint de quem está longe', () => {
    const m = motor('4-3-3', '4-4-2', 'contra_ataque', 'gegenpressen', 0);
    const bola = () => ({ x: 82, y: 34 });
    correr(m, 200, bola);
    expect(m.estado.equipas[0].fase).toBe('ATQ_FINALIZACAO');
    m.trocarPosse();
    expect(m.estado.equipas[0].fase).toBe('TRANS_ATQ_DEF');
    expect(m.estado.equipas[1].fase).toBe('TRANS_DEF_ATQ');
    let ticksForma = 0, sprint = false;
    while (m.estado.equipas[0].mistura > 0) { correr(m, 1, bola); ticksForma++; sprint ||= m.estado.jogadores.some((j) => j.equipa === 0 && j.accao === 'RECUPERAR' && j.intensidade === 'sprint'); }
    expect(ticksForma * 0.1).toBeGreaterThanOrEqual(1.5);
    expect(ticksForma * 0.1).toBeLessThanOrEqual(3);
    expect(sprint).toBe(true);
    correr(m, 100, bola);
    expect(m.estado.equipas[0].fase).toBe('DEF_ORGANIZADA');
    expect(m.estado.equipas[1].fase).toBe('ATQ_CONSTRUCAO');
  });

  it('física: velocidade máxima, aceleração e travagem pelos atributos; em sprint não se vira 90° num instante', () => {
    const m = motor();
    const j = m.estado.jogadores.find((q) => q.chave === 'PL')!;
    const L = limitesFisicos(j);
    expect(L.velMax).toBeCloseTo(6 + 0.15 * (j.attrs.vel ?? 10), 6);
    expect(L.acel).toBeCloseTo(2.5 + 0.18 * (j.attrs.ace ?? 10), 6);
    expect(L.desacel).toBeCloseTo(1.5 * L.acel, 6);
    // Virar 90° a 9 m/s demora mais de 0,4 s; parado, roda depressa.
    expect(Math.PI / 2 / viragemMax(j, 9)).toBeGreaterThan(0.4);
    expect(viragemMax(j, 0)).toBeGreaterThan(viragemMax(j, 9) * 3);
  });

  it('determinismo: a mesma configuração dá exactamente o mesmo estado', () => {
    const a = motor(), b = motor();
    correr(a, 1500, posicaoCaminho, undefined, 300); correr(b, 1500, posicaoCaminho, undefined, 300);
    expect(JSON.stringify(a.estado)).toBe(JSON.stringify(b.estado));
  });

  it('estilos diferentes dão blocos diferentes (Catenaccio baixo e estreito; Gegenpressen alto)', () => {
    const linha = (e: IdEstilo) => { const m = motor('4-3-3', '5-3-2', 'tiki_taka', e, 0); correr(m, 300, () => ({ x: 30, y: 34 })); return m.estado.equipas[1].bloco; };
    const cat = linha('catenaccio'), geg = linha('gegenpressen');
    expect(cat.linhaDefX).toBeLessThan(geg.linhaDefX - 10);
    expect(cat.largura).toBeLessThan(geg.largura);
    expect(medidasForma('5-3-2', lugaresApp('5-3-2').map((l) => l.papel), 0).xDef).toBeGreaterThan(0.15);
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
