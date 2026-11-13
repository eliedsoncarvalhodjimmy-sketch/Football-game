import { describe, expect, it } from 'vitest';
import { mundo } from './helpers.ts';
import { calendarioLigas } from '../src/engine/calendar/epoca.ts';
import { verificarCalendario } from '../src/engine/calendar/verificar.ts';
import { rondasBerger } from '../src/engine/competitions/roundRobin.ts';
import { CALENDARIO } from '../src/config/calendario.ts';

describe('round-robin', () => {
  for (const [n, v] of [[10, 2], [18, 2], [24, 2], [30, 1], [11, 2], [12, 3]] as const) {
    it(`${n} equipas, ${v} volta(s): cada par joga ${v}× e casa/fora equilibrado`, () => {
      const r = rondasBerger(n, v);
      expect(r.length).toBe((n % 2 ? n : n - 1) * v);
      const pares = new Map<string, { a: number; b: number }>();
      const porRonda = new Map<number, number>();
      r.forEach((rd, k) => {
        const vistos = new Set<number>();
        for (const [h, a] of rd) {
          expect(vistos.has(h) || vistos.has(a)).toBe(false); // ninguém joga duas vezes na mesma ronda
          vistos.add(h); vistos.add(a);
          const key = [Math.min(h, a), Math.max(h, a)].join('-');
          const p = pares.get(key) ?? { a: 0, b: 0 };
          if (h < a) p.a++; else p.b++;
          pares.set(key, p);
        }
        porRonda.set(k, vistos.size);
      });
      expect(pares.size).toBe((n * (n - 1)) / 2);
      for (const p of pares.values()) {
        expect(p.a + p.b).toBe(v);
        expect(Math.abs(p.a - p.b)).toBeLessThanOrEqual(1);
      }
      // Jogos em casa por equipa: diferença máxima de 1 entre casa e fora.
      const casa = new Array(n).fill(0);
      for (const rd of r) for (const [h] of rd) casa[h]++;
      const jogos = (n - 1) * v;
      for (const c of casa) expect(Math.abs(2 * c - jogos)).toBeLessThanOrEqual(n % 2 ? v + 1 : v);
      // Nº ímpar: folga rotativa (cada equipa folga uma vez por volta).
      if (n % 2) for (const s of porRonda.values()) expect(s).toBe(n - 1);
    });
  }
});

describe('calendário das ligas', async () => {
  const w = await mundo(2026);
  const cal = calendarioLigas(w);
  const todos = [...cal.values()].flat();
  const modeloDe = (comp: string) => CALENDARIO.modelos[w.ligaPorId(comp).regras.epoca.calendario];

  it('sem choques: mesmo dia, > 2 jogos por semana, sequências > 3', () => {
    expect(verificarCalendario(todos)).toEqual([]);
  });

  it('ligas de ano civil usam o calendário Fevereiro–Dezembro (8 ligas da folha)', () => {
    const anoCivil = w.ligas.filter((l) => l.regras.epoca.calendario === 'ano_civil').map((l) => l.regras.id).sort();
    expect(anoCivil).toEqual(['ARG1', 'BRA1', 'BRA2', 'COL1', 'ECU1', 'KOR1', 'NOR1', 'URU1', 'USA1']);
  });

  it('jornadas dentro da época; só as divisões inferiores jogam nas paragens de selecções', () => {
    const nasParagens = new Set(w.ligas.filter((l) => l.regras.jogam_nas_paragens).map((l) => l.regras.id));
    for (const j of todos) {
      const m = modeloDe(j.comp);
      expect(j.semana).toBeGreaterThanOrEqual(m.primeira_semana);
      expect(j.semana).toBeLessThanOrEqual(m.ultima_semana);
      if (!nasParagens.has(j.comp)) expect(m.paragens_selecoes).not.toContain(j.semana);
    }
  });

  it('jornadas a meio da semana não usam semanas continentais', () => {
    for (const j of todos) {
      if (j.ranhura !== 'meio') continue;
      const c = modeloDe(j.comp).continentais;
      const reservadas = new Set([...c.fase_liga, ...c.playoff, ...c.oitavos, ...c.quartos, ...c.meias, ...c.grupos, ...c.quartos_grupos, ...c.meias_grupos, ...c.acesso]);
      expect(reservadas.has(j.semana)).toBe(false);
    }
  });

  it('número de jogos por liga = n(n-1)/2 × voltas', () => {
    for (const l of w.ligas) {
      const n = l.regras.formato.equipas;
      expect(cal.get(l.regras.id)!.length).toBe((n * (n - 1) / 2) * l.regras.formato.voltas);
    }
  });
});
