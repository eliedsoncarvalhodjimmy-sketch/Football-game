import { describe, expect, it } from 'vitest';
import { FAMILIARITY, N_HIDDEN, N_POSITIONS, N_VISIBLE, POSITION_INDEX, VISIBLE_INDEX } from '../src/config/attributes.config';
import { generateAttributes, weightedOvr } from '../src/engine/generator/attributeGenerator';
import { fullWorld } from './helpers';

const base = { seed: 1, ovr: 75, position: 'ST' as const, age: 25, leagueQuality: 70, clubReputation: 60 };

describe('attribute generator', () => {
  it('is deterministic', () => {
    const a = generateAttributes(base);
    const b = generateAttributes(base);
    expect([...a.visible]).toEqual([...b.visible]);
    expect([...a.hidden]).toEqual([...b.hidden]);
    expect(a.potential).toBe(b.potential);
  });

  it('weighted OVR matches the input OVR (±1) across the whole world', () => {
    const { world } = fullWorld();
    const p = world.players;
    let worst = 0;
    for (let i = 0; i < p.count; i++) worst = Math.max(worst, Math.abs(weightedOvr(p.attrs, p.position[i], i * N_VISIBLE) - p.ovrInput[i]));
    expect(worst).toBeLessThanOrEqual(1);
  });

  it('all values are within 1–20 and potential ≥ OVR', () => {
    const { world } = fullWorld();
    const p = world.players;
    for (let k = 0; k < p.count * N_VISIBLE; k++) { expect(p.attrs[k]).toBeGreaterThanOrEqual(1); expect(p.attrs[k]).toBeLessThanOrEqual(20); }
    for (let k = 0; k < p.count * N_HIDDEN; k++) { expect(p.hidden[k]).toBeGreaterThanOrEqual(1); expect(p.hidden[k]).toBeLessThanOrEqual(20); }
    for (let i = 0; i < p.count; i++) { expect(p.potential[i]).toBeGreaterThanOrEqual(p.ovrInput[i]); expect(p.potential[i]).toBeLessThanOrEqual(99); }
  });

  it('position shapes the profile: strikers finish, centre-backs mark, keepers save', () => {
    const st = generateAttributes({ ...base, position: 'ST' }).visible;
    const dc = generateAttributes({ ...base, position: 'DC' }).visible;
    const gk = generateAttributes({ ...base, position: 'GK' }).visible;
    expect(st[VISIBLE_INDEX.finishing]).toBeGreaterThan(dc[VISIBLE_INDEX.finishing]);
    expect(dc[VISIBLE_INDEX.marking]).toBeGreaterThan(st[VISIBLE_INDEX.marking]);
    expect(gk[VISIBLE_INDEX.reflexes]).toBeGreaterThan(10);
    expect(st[VISIBLE_INDEX.reflexes]).toBeLessThan(7);
  });

  it('young players have more remaining growth than veterans', () => {
    const avgPot = (age: number) => {
      let s = 0;
      for (let k = 0; k < 300; k++) s += generateAttributes({ ...base, seed: k, ovr: 65, age }).potential - 65;
      return s / 300;
    };
    expect(avgPot(17)).toBeGreaterThan(avgPot(21));
    expect(avgPot(21)).toBeGreaterThan(avgPot(25));
    expect(avgPot(31)).toBeLessThan(1);
  });

  it('familiarity: natural position, plus explicit other positions as competent', () => {
    const f = generateAttributes({ ...base, otherPositions: ['AM', 'RW'] }).familiarity;
    expect(f).toHaveLength(N_POSITIONS);
    expect(f[POSITION_INDEX.ST]).toBe(FAMILIARITY.NATURAL);
    expect(f[POSITION_INDEX.AM]).toBe(FAMILIARITY.COMPETENT);
    expect(f[POSITION_INDEX.RW]).toBe(FAMILIARITY.COMPETENT);
    expect(f[POSITION_INDEX.GK]).toBe(FAMILIARITY.UNCOMFORTABLE);
  });
});
