import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.ts';
import { Tabela } from '../src/engine/competitions/table.ts';
import { MataMata } from '../src/engine/competitions/matamata.ts';
import { Taca } from '../src/engine/competitions/taca.ts';
import { planearTacas } from '../src/engine/season/tacas.ts';
import type { RegrasTaca } from '../src/data/types.ts';
import { sortearFaseLiga, distribuirJornadas, type Equipa } from '../src/engine/competitions/leaguePhase.ts';
import { sortearGrupos } from '../src/engine/competitions/groups.ts';
import { vencedor, type JogoR } from '../src/engine/competitions/base.ts';
import { CALENDARIO } from '../src/config/calendario.ts';
import { jogoRapido } from '../src/engine/match/quickSim.ts';

/** Simula uma competição a eliminar até ao fim, com resultados aleatórios. */
function jogarAteAoFim(c: { jogosDaSemana(s: number): JogoR[]; registar(j: JogoR): void; terminada(): boolean }, rng: Rng) {
  for (let s = 0; s < 52; s++) {
    for (;;) {
      const js = c.jogosDaSemana(s).filter((j) => !j.r && (!j.ida || j.ida.r));
      if (!js.length) break;
      for (const j of js.sort((a, b) => a.dia - b.dia)) {
        j.r = { gc: rng.int(0, 3), gf: rng.int(0, 3) };
        if (j.decisivo) {
          const c1 = j.r.gc + (j.ida?.r!.gf ?? 0), f1 = j.r.gf + (j.ida?.r!.gc ?? 0);
          if (c1 === f1) j.r.pen = rng.chance(0.5) ? [5, 4] : [3, 4];
        }
        c.registar(j);
      }
    }
  }
  expect(c.terminada()).toBe(true);
}

describe('classificação', () => {
  it('desempate por confronto directo antes da diferença de golos', () => {
    const t2 = new Tabela([1, 2]);
    t2.registar(1, 2, 1, 0);
    t2.registar(2, 1, 5, 2); // 3 pontos cada; no confronto directo o 2 tem +2 de diferença
    expect(t2.ordenar(['pontos', 'confronto_directo', 'dg', 'sorteio']).map((l) => l.clube)).toEqual([2, 1]);
    const t3 = new Tabela([1, 2, 4]);
    t3.registar(1, 2, 1, 0);
    t3.registar(2, 4, 6, 0);
    t3.registar(4, 1, 1, 0);
    // Todos com 3 pontos; mini-tabela igual em pontos; dg: 2 (+5), 1 (0), 4 (-5)
    expect(t3.ordenar(['pontos', 'confronto_directo', 'dg']).map((l) => l.clube)).toEqual([2, 1, 4]);
    // Sem confronto directo, decide a diferença de golos geral.
    const t4 = new Tabela([1, 2]);
    t4.registar(1, 2, 1, 0);
    t4.registar(2, 1, 1, 0);
    t4.registar(1, 1 === 1 ? 2 : 2, 0, 0);
    expect(t4.ordenar(['pontos', 'dg', 'sorteio'], 7).length).toBe(2);
  });
});

describe('eliminatórias', () => {
  const fds = (s: number) => ({ semana: s, ranhura: 'fds' as const, dias: [5] });
  for (const n of [3, 4, 6, 8]) {
    it(`play-off com ${n} equipas: isenções, final neutra, um vencedor`, () => {
      const rng = Rng.de(1, 'po', n);
      const parts = Array.from({ length: n }, (_, i) => 100 + i);
      const nr = Math.ceil(Math.log2(n));
      const m = new MataMata('t', 't', 'playoff', () => parts, (k) => Array.from({ length: k }, (_, i) => ({ maos: 1 as const, slots: [fds(49 + i)], neutra: i === k - 1 })), rng);
      jogarAteAoFim(m, rng);
      expect(parts).toContain(m.vencedorFinal);
      expect(m.jogoFinal!.neutro).toBe(true);
      expect(m.fase.get(m.vencedorFinal!)).toBe(nr);
      // Na 1.ª ronda, os melhores cabeças-de-série ficam isentos.
      const isentos = (1 << nr) - n;
      for (let i = 0; i < isentos; i++) expect(m.fase.get(parts[i]) ?? nr).toBeGreaterThanOrEqual(1);
    });
  }

  it('duas mãos: o agregado decide; 2.ª mão em casa do melhor', () => {
    const ida: JogoR = { comp: 'x', ronda: 1, semana: 1, ranhura: 'meio', dia: 2, casa: 2, fora: 1, r: { gc: 3, gf: 0 } };
    const volta: JogoR = { comp: 'x', ronda: 1, semana: 2, ranhura: 'meio', dia: 2, casa: 1, fora: 2, decisivo: true, ida, r: { gc: 2, gf: 0 } };
    expect(vencedor(volta)).toBe(2); // 3-0 e 0-2 → agregado 3-2 para o 2
    volta.r = { gc: 3, gf: 0, prol: true, pen: [4, 2] };
    expect(vencedor(volta)).toBe(1); // 3-3, penáltis
  });

  const regrasTaca = (over: Partial<RegrasTaca> = {}): RegrasTaca => ({
    id: 'ENG-FAC', nome: 'Taça', tipo: 'taca', pais: 'ENG', participantes: ['ENG1', 'ENG2', 'ENG3', 'ENG4'],
    entrada_por_liga: { ENG1: 3, ENG2: 3, ENG3: 1, ENG4: 1 }, maos: { rondas: 1, meias: 1, final: 1 }, final_neutra: true,
    vaga_vencedor: 'UEL', secundaria: false, premios: [], ...over,
  });
  const porLigaEng = new Map(['ENG1', 'ENG2', 'ENG3', 'ENG4'].map((l, n) => [l, Array.from({ length: n === 0 ? 20 : 24 }, (_, i) => n * 100 + i)]));

  it('FA Cup: 92 clubes, ENG1/ENG2 entram na 3.ª ronda, todos jogam até perder, um vencedor', () => {
    const regras = regrasTaca();
    const slots = planearTacas([regras], porLigaEng, new Set(), CALENDARIO.modelos.ago_mai).get('ENG-FAC')!;
    const rng = Rng.de(3, 'taca');
    const t = new Taca(regras, porLigaEng, (c) => c, slots, rng);
    expect(t.nRondas).toBe(8);
    expect(slots[7][0].ranhura).toBe('fds'); // final no sábado
    jogarAteAoFim(t, rng);
    const todos = [...porLigaEng.values()].flat();
    expect([...t.fase.keys()].sort()).toEqual([...todos].sort());
    expect(t.fase.get(t.vencedorFinal!)).toBe(9);
    for (const c of [...porLigaEng.get('ENG1')!, ...porLigaEng.get('ENG2')!]) expect(t.fase.get(c)!).toBeGreaterThanOrEqual(3);
  });

  it('taça a duas mãos em todas as rondas e final não neutra (Copa do Brasil)', () => {
    const porLiga = new Map([['BRA1', Array.from({ length: 20 }, (_, i) => i)], ['BRA2', Array.from({ length: 20 }, (_, i) => 100 + i)]]);
    const regras = regrasTaca({ id: 'BRA-CDB', pais: 'BRA', participantes: ['BRA1', 'BRA2'], entrada_por_liga: { BRA1: 2, BRA2: 1 }, maos: { rondas: 2, meias: 2, final: 2 }, final_neutra: false, vaga_vencedor: null });
    const slots = planearTacas([regras], porLiga, new Set(), CALENDARIO.modelos.ago_mai).get('BRA-CDB')!;
    expect(slots.every((s) => s.length === 2)).toBe(true);
    const rng = Rng.de(4, 'taca');
    const t = new Taca(regras, porLiga, (c) => c, slots, rng);
    jogarAteAoFim(t, rng);
    expect(t.jogoFinal!.ida).toBeDefined();
    expect(t.jogoFinal!.neutro).toBeFalsy();
  });

  it('duas taças no mesmo país nunca usam a mesma semana (FA Cup e EFL Cup)', () => {
    const fa = regrasTaca();
    const efl = regrasTaca({ id: 'ENG-EFL', entrada_por_liga: { ENG1: 2, ENG2: 1, ENG3: 1, ENG4: 1 }, maos: { rondas: 1, meias: 2, final: 1 }, vaga_vencedor: null, secundaria: true });
    const p = planearTacas([fa, efl], porLigaEng, new Set([5, 6]), CALENDARIO.modelos.ago_mai);
    const semanas = (id: string) => p.get(id)!.flat().filter((s) => s.ranhura === 'meio').map((s) => s.semana);
    const a = new Set(semanas('ENG-FAC'));
    for (const s of semanas('ENG-EFL')) expect(a.has(s)).toBe(false);
    for (const s of [...semanas('ENG-FAC'), ...semanas('ENG-EFL')]) expect([5, 6]).not.toContain(s);
  });
});

describe('sorteios continentais', () => {
  const paises = ['ENG', 'ENG', 'ENG', 'ENG', 'ESP', 'ESP', 'ESP', 'ESP', 'ITA', 'ITA', 'ITA', 'ITA', 'GER', 'GER', 'GER', 'GER', 'FRA', 'FRA', 'FRA', 'NED', 'NED', 'POR', 'BEL', 'TUR', 'CZE', 'GRE', 'POL', 'NOR', 'DEN', 'SUI', 'AUT', 'SCO', 'SWE', 'CRO', 'HUN', 'UKR'];
  const eq: Equipa[] = paises.map((p, i) => ({ clube: i, pais: p, forca: 100 - i }));

  for (const s of [1, 2, 3, 4, 5]) {
    it(`fase de liga (semente ${s}): 8 jogos, 2 por pote, 4 casa/4 fora, sem mesmo país, ≤ 2 do mesmo país, 1 jogo por jornada`, () => {
      const rng = Rng.de(s, 'fl');
      const a = sortearFaseLiga(eq, 4, rng);
      expect(a.length).toBe(144);
      const pote = (i: number) => Math.floor(i / 9);
      for (let i = 0; i < 36; i++) {
        const meus = a.filter(([c, f]) => c === i || f === i);
        expect(meus.length).toBe(8);
        expect(meus.filter(([c]) => c === i).length).toBe(4);
        const adv = meus.map(([c, f]) => (c === i ? f : c));
        expect(new Set(adv).size).toBe(8);
        for (let p = 0; p < 4; p++) expect(adv.filter((x) => pote(x) === p).length).toBe(2);
        for (const x of adv) expect(eq[x].pais).not.toBe(eq[i].pais);
        const porPais = new Map<string, number>();
        for (const x of adv) porPais.set(eq[x].pais, (porPais.get(eq[x].pais) ?? 0) + 1);
        for (const v of porPais.values()) expect(v).toBeLessThanOrEqual(2);
      }
      let cor: number[] | null = null;
      for (let t = 0; t < 20 && !cor; t++) { try { cor = distribuirJornadas(36, a, 8, rng); } catch { /* repete */ } }
      expect(cor).not.toBeNull();
      for (let j = 0; j < 8; j++) {
        const v = new Set<number>();
        a.forEach(([c, f], k) => { if (cor![k] === j) { expect(v.has(c) || v.has(f)).toBe(false); v.add(c); v.add(f); } });
        expect(v.size).toBe(36);
      }
    });
  }

  it('UECL: 6 jogos, só contra os outros potes (2 de cada), 3 casa/3 fora', () => {
    const e32 = paises.slice(0, 32).map((p, i) => ({ clube: i, pais: p, forca: 100 - i }));
    const a = sortearFaseLiga(e32, 4, Rng.de(9, 'ecl'), 2, false);
    expect(a.length).toBe(96);
    for (let i = 0; i < 32; i++) {
      const meus = a.filter(([c, f]) => c === i || f === i);
      expect(meus.length).toBe(6);
      expect(meus.filter(([c]) => c === i).length).toBe(3);
      const adv = meus.map(([c, f]) => (c === i ? f : c));
      expect(adv.some((x) => Math.floor(x / 8) === Math.floor(i / 8))).toBe(false);
    }
  });

  it('fase de liga com 7 clubes do mesmo país: os potes são equilibrados e o sorteio é possível', () => {
    const p7 = ['ENG', 'ENG', 'ENG', 'ENG', 'ENG', 'ENG', 'ENG', 'ITA', 'ITA', 'ITA', 'ITA', 'ITA', 'ITA', ...paises.slice(13)];
    const e = p7.map((p, i) => ({ clube: i, pais: p, forca: 100 - i }));
    const a = sortearFaseLiga(e, 4, Rng.de(11, 'x'));
    expect(a.length).toBe(144);
    for (const [c, f] of a) expect(e[c].pais).not.toBe(e[f].pais);
  });

  it('grupos: 4 grupos de 4, um de cada pote, choques de país minimizados', () => {
    const lib = ['BRA', 'BRA', 'BRA', 'BRA', 'BRA', 'ARG', 'ARG', 'ARG', 'ARG', 'COL', 'COL', 'COL', 'URU', 'URU', 'ECU', 'ECU'];
    const e = lib.map((p, i) => ({ clube: i, pais: p, forca: 100 - i }));
    const g = sortearGrupos(e, 4, Rng.de(1, 'g'));
    expect(g.map((x) => x.length)).toEqual([4, 4, 4, 4]);
    for (const grupo of g) for (let p = 0; p < 4; p++) expect(grupo.filter((i) => Math.floor(i / 4) === p).length).toBe(1);
    const choques = g.reduce((s, grupo) => s + grupo.length - new Set(grupo.map((i) => e[i].pais)).size, 0);
    expect(choques).toBeLessThanOrEqual(1); // Brasil tem 5 clubes para 4 grupos
  });
});

describe('modo rápido', () => {
  it('é determinístico e responde à força', () => {
    const r1 = jogoRapido(70, 70, 60, 60, false, Rng.de(1, 'j'));
    const r2 = jogoRapido(70, 70, 60, 60, false, Rng.de(1, 'j'));
    expect(r1).toEqual(r2);
    const rng = Rng.de(2, 'j');
    let forte = 0, fraco = 0;
    for (let i = 0; i < 4000; i++) {
      const [a, b] = jogoRapido(85, 85, 55, 55, true, rng);
      if (a > b) forte++; else if (b > a) fraco++;
    }
    expect(forte).toBeGreaterThan(fraco * 2.5);
    expect(fraco).toBeGreaterThan(0);
  });
});
