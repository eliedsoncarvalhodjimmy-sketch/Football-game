import { describe, expect, it } from 'vitest';
import { Rng, hashString, subSeed } from '../src/engine/rng';

describe('Rng', () => {
  it('same seed gives the same sequence', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('different seeds diverge', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const same = Array.from({ length: 100 }, () => a.nextU32() === b.nextU32()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it('next() is uniform in [0,1)', () => {
    const r = new Rng(7);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]++;
    }
    for (const b of buckets) expect(Math.abs(b - 10_000)).toBeLessThan(500);
  });

  it('int() respects inclusive bounds', () => {
    const r = new Rng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(3, 6));
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('normal() has the requested mean and sd', () => {
    const r = new Rng(11);
    const n = 50_000;
    let s = 0, s2 = 0;
    for (let i = 0; i < n; i++) { const v = r.normal(10, 2); s += v; s2 += v * v; }
    const mean = s / n;
    const sd = Math.sqrt(s2 / n - mean * mean);
    expect(mean).toBeCloseTo(10, 1);
    expect(sd).toBeCloseTo(2, 1);
  });

  it('hashString and subSeed are stable', () => {
    expect(hashString('POR1')).toBe(hashString('POR1'));
    expect(hashString('POR1')).not.toBe(hashString('POR2'));
    expect(subSeed(1, 'x')).not.toBe(subSeed(2, 'x'));
    // pinned value: changing the hash breaks every existing save/seed
    expect(hashString('futceo', 0)).toMatchInlineSnapshot(`1513854543`);
  });
});
