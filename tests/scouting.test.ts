// Prompt 4, Bloco B: nevoeiro de informação e scouting.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { CONHECIMENTO } from '../src/config/scouting.ts';

let w: World;
const dia = Math.floor(Date.UTC(2026, 8, 1) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('conhecimento e estimativas', () => {
  it('jogador desconhecido: conhecimento 0 e intervalo largo; conhecido: intervalo estreita e contém o real quase sempre', () => {
    const sc = w.mercado!.scouting, st = w.jogadores!;
    const c = w.ligaPorId('ENG1').clubes[0];
    const outros = w.ligaPorId('BRA1').clubes.flatMap((x) => w.plantel[x]).filter((j) => st.clube[j] >= 0).slice(0, 200);
    let dentro = 0;
    for (const j of outros) {
      const e0 = sc.estimarOVR(c, j, dia);
      expect(e0.conhecimento).toBe(0);
      sc.conhecer(c, j, 80, dia);
      const e1 = sc.estimarOVR(c, j, dia);
      expect(e1.max - e1.min).toBeLessThan(e0.max - e0.min);
      if (st.ovrNat(j) >= e1.min - 1 && st.ovrNat(j) <= e1.max + 1) dentro++;
    }
    expect(dentro / outros.length).toBeGreaterThan(0.8);
  });

  it('o potencial é mais impreciso do que o OVR; os ocultos só aparecem com conhecimento alto', () => {
    const sc = w.mercado!.scouting, st = w.jogadores!;
    const c = w.ligaPorId('ESP1').clubes[0];
    const j = w.plantel[w.ligaPorId('POR1').clubes[0]].find((x) => st.clube[x] >= 0)!;
    sc.conhecer(c, j, 40, dia);
    const o = sc.estimarOVR(c, j, dia), p = sc.estimarPotencial(c, j, dia);
    // O intervalo do potencial é cortado em baixo pelo OVR: compara-se a metade de cima.
    expect(p.max - p.estimado).toBeGreaterThanOrEqual(Math.min(99 - p.estimado, o.max - o.estimado));
    expect(sc.relatorio(c, j, dia).ocultos).toBeNull();
    sc.conhecer(c, j, 50, dia);
    expect(sc.relatorio(c, j, dia).ocultos).not.toBeNull();
  });

  it('o conhecimento decai com o tempo; o próprio plantel é conhecido por inteiro', () => {
    const sc = w.mercado!.scouting, st = w.jogadores!;
    const c = w.ligaPorId('GER1').clubes[0];
    const j = w.plantel[w.ligaPorId('NED1').clubes[0]].find((x) => st.clube[x] >= 0)!;
    sc.conhecer(c, j, 60, dia);
    expect(sc.nivel(c, j, dia + 100)).toBeLessThan(sc.nivel(c, j, dia));
    const meu = w.plantel[c].find((x) => st.clube[x] === c)!;
    expect(sc.nivel(c, meu, dia + 60)).toBe(100);
  });

  it('a IA só alveja jogadores que conhece', () => {
    const m = w.mercado!, sc = m.scouting;
    const c = w.ligaPorId('ITA1').clubes[3];
    for (const x of m.alvos(c, 'MED', 1, 99, 16, 40, dia, { int: (a: number) => a, next: () => 0 } as never)) expect(sc.nivel(c, x.j, dia)).toBeGreaterThanOrEqual(CONHECIMENTO.minimo_alvo);
  });

  it('o limite de jogadores conhecidos por clube é respeitado', () => {
    const sc = w.mercado!.scouting, st = w.jogadores!;
    const c = w.ligaPorId('FRA1').clubes[0];
    for (let j = 0; j < 800; j++) if (st.clube[j] >= 0) sc.conhecer(c, j, 30, dia);
    expect(sc.conhecidos(c).length).toBeLessThanOrEqual(CONHECIMENTO.maximo_por_clube + 1);
  });
});
