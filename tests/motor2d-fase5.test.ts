// Motor 2D táctico — Fase 5 (docs/tactics/MOTOR_2D.md, secção 13): remates, bolas paradas, jogadas-padrão, cansaço e
// apresentação por lances (modelo FM). O teste de 200 jogos da secção 12 corre com `npx tsx scripts/validar-motor2d.ts`
// (demora uns minutos); aqui verificam-se os comportamentos e um jogo inteiro.
import { describe, expect, it } from 'vitest';
import { Motor2D } from '../src/engine/match2d/Motor2D.ts';
import { gerarEquipa2D } from '../src/engine/match2d/equipas.ts';
import { gastar, limitesFisicos } from '../src/engine/match2d/fisica.ts';
import { planear, naGrandeArea } from '../src/engine/match2d/bolaParada.ts';
import { candidatos, seleccionar } from '../src/engine/match2d/lances.ts';
import { Apresentacao } from '../src/engine/match2d/apresentacao.ts';
import { JOGADAS } from '../src/config/match2d/fase5.ts';
import { CANSACO } from '../src/config/match2d/fisica.ts';
import { paraEquipa, dist } from '../src/engine/match2d/referencial.ts';
import type { Estilo2D } from '../src/config/match2d/estilos.ts';

const motor = (semente: string, ea: Estilo2D = 'neutro', eb: Estilo2D = 'neutro', fa = '4-3-3', fb = '4-3-3') =>
  new Motor2D({ semente, equipas: [{ nome: 'A', formacao: fa, estilo: ea, jogadores: gerarEquipa2D('a' + semente, 70, fa) }, { nome: 'B', formacao: fb, estilo: eb, jogadores: gerarEquipa2D('b' + semente, 70, fb) }] });

// Um jogo inteiro (Gegenpressen × Bloco Médio-Baixo), partilhado pelos testes que precisam dele.
const jogo = motor('f5', 'gegenpressen', 'bloco_medio_baixo', '4-2-3-1', '4-4-2');
for (let k = 0; k < 54000; k++) jogo.passo();

describe('motor 2D — Fase 5: cansaço (secção 10.2)', () => {
  it('a condição desce com a distância e mais com os sprints; a Resistência dá o ritmo', () => {
    const m = motor('cansaco'), [a, b] = m.estado.jogadores.filter((j) => j.chave !== 'GR');
    a.attrs = { ...a.attrs, res: 18 }; b.attrs = { ...b.attrs, res: 6 };
    for (let k = 0; k < 1000; k++) { gastar(a, 0.5, 0.1); gastar(b, 0.5, 0.1); } // 500 m a trote
    expect(1 - b.condicao).toBeGreaterThan(1.5 * (1 - a.condicao));
    const antes = a.condicao;
    for (let k = 0; k < 100; k++) gastar(a, 0.8, 0.1); // 80 m em sprint
    expect(antes - a.condicao).toBeGreaterThan((80 * CANSACO.por_km) / 1000);
  });

  it('abaixo de 80% a velocidade máxima desce até 10%', () => {
    const m = motor('quebra'), j = m.estado.jogadores.find((o) => o.chave !== 'GR')!;
    const fresco = limitesFisicos(j).velMax;
    j.condicao = 0.3; gastar(j, 0, 0.1);
    expect(limitesFisicos(j).velMax).toBeCloseTo(fresco * (1 - CANSACO.queda_max), 2);
  });

  it('num jogo: 9–12 km por jogador, condição a cair ao longo do jogo, intervalo aos 45 min', () => {
    const e = jogo.estado.estat;
    for (const q of [0, 1]) expect(e.distancia[q] / 10).toBeGreaterThan(8000);
    const c = jogo.estado.jogadores.filter((j) => j.chave !== 'GR').map((j) => j.condicao);
    expect(Math.min(...c)).toBeLessThan(0.85);
    expect(jogo.registo.some((x) => x.tipo === 'intervalo' && x.tick === 27000)).toBe(true);
  });
});

describe('motor 2D — Fase 5: bolas paradas, penáltis e cartões', () => {
  it('canto: o melhor cabeceador vai à zona da variante, 5 na área (Catenaccio: 4), 2 atrás; a defesa marca e cobre zonas', () => {
    const m = motor('canto'), s = m.estado;
    const r = { tipo: 'canto' as const, equipa: 0 as const, local: { x: 104.5, y: 0.5 }, marcador: '', desde: 0 };
    const p = planear(s, r, 'x')!;
    expect(p.tipo).toBe('canto');
    const area = s.jogadores.filter((j) => j.equipa === 0 && j.id !== p.executor && p.posicoes[j.id] && naGrandeArea(1, p.posicoes[j.id]));
    expect(area.length).toBeGreaterThanOrEqual(5);
    const atras = s.jogadores.filter((j) => j.equipa === 0 && p.posicoes[j.id] && paraEquipa(0, p.posicoes[j.id]).x < 60);
    expect(atras.length).toBeGreaterThanOrEqual(2);
    // Defesa: quase todos dentro da área, o GR na baliza.
    const def = s.jogadores.filter((j) => j.equipa === 1 && p.posicoes[j.id] && naGrandeArea(1, p.posicoes[j.id]));
    expect(def.length).toBeGreaterThanOrEqual(7);
  });

  it('penálti: todos fora da área menos o marcador e o GR; resultado decidido pelos atributos', () => {
    const m = motor('pen'), s = m.estado;
    const p = planear(s, { tipo: 'penalti', equipa: 0, local: { x: 94, y: 34 }, marcador: '', desde: 0 }, 'x')!;
    for (const j of s.jogadores) {
      if (j.id === p.executor || j.chave === 'GR') continue;
      expect(naGrandeArea(1, p.posicoes[j.id]), j.chave).toBe(false);
    }
    expect(['golo', 'defesa', 'fora']).toContain(p.resultado);
  });

  it('livre directo perto da área: barreira a 9,15 m da bola', () => {
    const m = motor('livre'), s = m.estado, local = { x: 82, y: 34 };
    const p = planear(s, { tipo: 'livre', equipa: 0, local, marcador: '', desde: 0 }, 'x')!;
    expect(p.tipo).toBe('livre_directo');
    expect(p.barreira!.length).toBeGreaterThanOrEqual(3);
    for (const id of p.barreira!) expect(dist(p.posicoes[id], local)).toBeCloseTo(9.15, 0);
  });

  it('num jogo: cantos, faltas, cartões; as bolas paradas com plano', () => {
    const e = jogo.estado.estat;
    expect(e.cantos[0] + e.cantos[1]).toBeGreaterThanOrEqual(2);
    expect(e.faltas[0] + e.faltas[1]).toBeGreaterThan(10);
    expect(e.amarelos[0] + e.amarelos[1]).toBeGreaterThan(0);
  });
});

describe('motor 2D — Fase 5: jogadas-padrão (secção 11)', () => {
  it('há jogadas para os 8 estilos e cada uma tem efeito', () => {
    const estilos = new Set(JOGADAS.flatMap((j) => j.estilos));
    for (const e of ['tiki_taka', 'gegenpressen', 'contra_ataque', 'catenaccio', 'jogo_direto', 'pelas_alas', 'futebol_total', 'bloco_medio_baixo']) expect(estilos.has(e), e).toBe(true);
    for (const j of JOGADAS) expect(!!(j.accoes || j.opcoes || j.receptores || j.linha_m), j.id).toBe(true);
  });

  it('num jogo, as jogadas do estilo activam-se (e só as do estilo)', () => {
    const ids = (e: 0 | 1) => new Set(jogo.registo.filter((x) => x.tipo === 'jogada' && x.equipa === e).map((x) => x.subtipo!));
    const gegen = ids(0), bloco = ids(1);
    expect(gegen.size).toBeGreaterThanOrEqual(2);
    for (const id of gegen) expect(JOGADAS.find((j) => j.id === id)!.estilos).toContain('gegenpressen');
    for (const id of bloco) expect(JOGADAS.find((j) => j.id === id)!.estilos).toContain('bloco_medio_baixo');
  });
});

describe('motor 2D — Fase 5: apresentação por lances (secção 2.2)', () => {
  const cands = candidatos(jogo.registo, jogo.posses);
  const golos = jogo.registo.filter((x) => x.tipo === 'golo').map((x) => x.tick);

  it('Alargados: ~15 min a 1× (12–16), todos os golos, jogo corrido ≥ 20% do mostrado', () => {
    const s = seleccionar(cands, 'alargados');
    expect(s.duracao_s / 60).toBeGreaterThanOrEqual(12);
    expect(s.duracao_s / 60).toBeLessThanOrEqual(16);
    for (const t of golos) expect(s.lances.some((l) => l.inicio <= t && t <= l.fim)).toBe(true);
    expect(s.corrido_s / s.mostrado_s).toBeGreaterThanOrEqual(0.2);
    // Cada lance começa antes do momento-chave (no máximo 15–25 s; dois lances juntados podem começar antes) e acaba depois.
    for (const l of s.lances) { expect(l.momento - l.inicio).toBeLessThanOrEqual(400); expect(l.fim).toBeGreaterThanOrEqual(l.momento); }
  });

  it('Lances-chave é mais curto e só tem "sempre" e prioridade alta; Jogo completo é o jogo todo', () => {
    const ch = seleccionar(cands, 'chave'), al = seleccionar(cands, 'alargados');
    expect(ch.duracao_s).toBeLessThan(al.duracao_s);
    for (const l of ch.lances) expect(['sempre', 'alta']).toContain(l.prioridade);
    const co = seleccionar(cands, 'completo');
    expect(co.duracao_s).toBeCloseTo(90 * 60, -1);
  });

  it('o relógio do ecrã: simula por blocos à frente, mostra os golos e chega ao fim', () => {
    const m = motor('apresentacao');
    const a = new Apresentacao(m, 'alargados');
    let real = 0, vistos = 0;
    const modos = new Set<string>();
    while (a.modo !== 'fim' && real < 20 * 60) {
      if (a.precisaSimular()) a.simular(Infinity, 3000);
      expect(a.simulado).toBeGreaterThanOrEqual(Math.min(54000, Math.floor(a.t))); // nunca mostra o que não foi simulado
      modos.add(a.avancar(0.25, 1)); real += 0.25;
      expect(a.fotosEcra()).not.toBeNull();
    }
    vistos = m.registo.filter((x) => x.tipo === 'golo' && a.lances.some((l) => l.inicio <= x.tick && x.tick <= l.fim)).length;
    expect(a.modo).toBe('fim');
    expect(real / 60).toBeGreaterThan(12); expect(real / 60).toBeLessThanOrEqual(16);
    expect(vistos).toBe(m.registo.filter((x) => x.tipo === 'golo').length);
    expect(modos.has('avanco') && modos.has('lance')).toBe(true);
  }, 60_000);
});
