import { describe, expect, it } from 'vitest';
import { POSITION_WEIGHTS, VISIBLE_INDEX, POSITIONS } from '../src/config/attributes.config';
import { GENERATOR } from '../src/config/generator.config';
import { EXPECTED_COUNTRIES, EXPECTED_LEAGUES, defaultCountries } from '../src/config/world.config';
import { generateWorld } from '../src/engine/generator/worldGenerator';
import { fullWorld } from './helpers';

describe('world configuration', () => {
  const countries = defaultCountries();
  const leagues = countries.flatMap((c) => c.leagues);

  it('has 29 countries and 64 leagues', () => {
    expect(countries).toHaveLength(EXPECTED_COUNTRIES);
    expect(leagues).toHaveLength(EXPECTED_LEAGUES);
  });

  it('has the right number of divisions per country', () => {
    const tiers = Object.fromEntries(countries.map((c) => [c.id, c.leagues.length]));
    expect(tiers.ENG).toBe(4);
    for (const id of ['GER', 'BRA', 'POR', 'FRA']) expect(tiers[id]).toBe(3);
    expect(Object.values(tiers).filter((n) => n === 2)).toHaveLength(24);
  });

  it('promotion slots of a tier equal relegation slots of the tier above', () => {
    for (const c of countries) {
      for (let i = 1; i < c.leagues.length; i++) expect(c.leagues[i].promotionSlots).toBe(c.leagues[i - 1].relegationSlots);
      expect(c.leagues[0].promotionSlots).toBe(0);
      expect(c.leagues[c.leagues.length - 1].relegationSlots).toBe(0);
    }
  });

  it('USA has no promotion/relegation by default', () => {
    const usa = countries.find((c) => c.id === 'USA')!;
    expect(usa.promotionRelegation).toBe(false);
    for (const l of usa.leagues) expect(l.promotionSlots + l.relegationSlots).toBe(0);
  });

  it('total clubs between 1100 and 1200', () => {
    const total = leagues.reduce((s, l) => s + l.clubs, 0);
    expect(total).toBeGreaterThanOrEqual(1100);
    expect(total).toBeLessThanOrEqual(1200);
  });

  it('position weights only reference existing attributes', () => {
    for (const p of POSITIONS) for (const k of Object.keys(POSITION_WEIGHTS[p])) expect(VISIBLE_INDEX[k], `${p}.${k}`).toBeDefined();
  });
});

describe('fictional world generator', () => {
  const { raw } = fullWorld();

  it('generates every configured club, all flagged as test data', () => {
    const expected = raw.countries.flatMap((c) => c.leagues).reduce((s, l) => s + l.clubs, 0);
    expect(raw.clubs).toHaveLength(expected);
    expect(raw.meta.isTestData).toBe(true);
    expect(raw.clubs.every((c) => c.isTestData)).toBe(true);
  });

  it('gives each club a full squad and creates free agents', () => {
    const size = Object.values(GENERATOR.squadTemplate).reduce((a, b) => a + b, 0);
    const byClub = new Map<string, number>();
    for (const p of raw.players) if (p.clubId) byClub.set(p.clubId, (byClub.get(p.clubId) ?? 0) + 1);
    for (const c of raw.clubs) expect(byClub.get(c.id)).toBe(size);
    expect(raw.players.filter((p) => !p.clubId)).toHaveLength(GENERATOR.freeAgents.count);
  });

  it('has unique ids and unique club names per country', () => {
    expect(new Set(raw.clubs.map((c) => c.id)).size).toBe(raw.clubs.length);
    expect(new Set(raw.players.map((p) => p.id)).size).toBe(raw.players.length);
    for (const country of raw.countries) {
      const names = raw.clubs.filter((c) => c.countryId === country.id).map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('rivalries are symmetric and reference real clubs', () => {
    const byId = new Map(raw.clubs.map((c) => [c.id, c]));
    for (const c of raw.clubs) for (const r of c.rivals) expect(byId.get(r)?.rivals).toContain(c.id);
  });

  it('league strength is ordered: tier 1 clubs are stronger than tier 2', () => {
    const avg = (league: string) => {
      const ids = new Set(raw.clubs.filter((c) => c.leagueId === league).map((c) => c.id));
      const ps = raw.players.filter((p) => ids.has(p.clubId));
      return ps.reduce((s, p) => s + p.ovr, 0) / ps.length;
    };
    for (const country of raw.countries) {
      for (let i = 1; i < country.leagues.length; i++) expect(avg(country.leagues[i - 1].id)).toBeGreaterThan(avg(country.leagues[i].id));
    }
  });

  it('is deterministic for the same seed and different for another seed', () => {
    const a = generateWorld({ seed: 99 });
    const b = generateWorld({ seed: 99 });
    const c = generateWorld({ seed: 100 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.players[0].lastName + a.players[500].ovr).not.toBe(c.players[0].lastName + c.players[500].ovr);
  });
});
