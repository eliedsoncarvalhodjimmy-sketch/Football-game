import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.ts';
import { Tabela } from '../src/engine/competitions/table.ts';
import { MataMata } from '../src/engine/competitions/matamata.ts';
import { Taca } from '../src/engine/competitions/taca.ts';
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

  it('taça inglesa: 92 clubes, entrada escalonada, todos jogam até perder, um vencedor', () => {
    const porNivel = [0, 1, 2, 3].map((n) => Array.from({ length: n === 0 ? 20 : 24 }, (_, i) => n * 100 + i));
    const regras = { id: 'eng_taca', nome: 'Taça', tipo: 'taca' as const, pais: 'ENG', entrada_por_nivel: { '1': 3, '2': 2, '3': 1, '4': 1 }, jogo_unico: true as const, final_neutra: true };
    const rng = Rng.de(3, 'taca');
    const t = new Taca(regras, porNivel, (c) => c, CALENDARIO.modelos.ago_mai, rng);
    expect(t.nRondas).toBe(8);
    jogarAteAoFim(t, rng);
    const todos = porNivel.flat();
    // Cada clube perdeu exactamente uma vez, excepto o vencedor.
    expect([...t.fase.keys()].sort()).toEqual([...todos].sort());
    expect(t.fase.get(t.vencedorFinal!)).toBe(9);
    // Os de cima entram mais tarde: nenhum clube do 1.º nível foi eliminado antes da 3.ª ronda.
    for (const c of porNivel[0]) expect(t.fase.get(c)!).toBeGreaterThanOrEqual(3);
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
