import { describe, expect, it } from 'vitest';
import { POSITION_WEIGHTS, VISIBLE_INDEX, POSITIONS } from '../src/config/attributes.config';
import { BASE_COUNTRIES, PROTECTED_COUNTRIES } from '../src/config/countries.base';
import { EXPECTED_COUNTRIES, defaultConfederations } from '../src/config/confederations.config';
import { QUALIFICATION, CHAMPIONS } from '../src/config/champions.config';
import { SQUADS } from '../src/config/squads.config';
import { generateWorld, generateWorldFull, testCountryRecords } from '../src/engine/generator/worldGenerator';
import { assignConfederations, slotsOf } from '../src/engine/world/confederations';
import { SQUAD_LEVELS } from '../src/engine/types';
import { fullWorld } from './helpers';

describe('countries and confederations (config)', () => {
  const confs = defaultConfederations();

  it('has 213 unique countries: 211 FIFA members + Catalunya + País Basco', () => {
    expect(BASE_COUNTRIES).toHaveLength(EXPECTED_COUNTRIES);
    expect(new Set(BASE_COUNTRIES.map((c) => c.id)).size).toBe(213);
    expect(BASE_COUNTRIES.find((c) => c.id === 'CAT')?.confederation).toBe('UEFA');
    expect(BASE_COUNTRIES.find((c) => c.id === 'EUS')?.confederation).toBe('UEFA');
  });

  it('original counts per confederation', () => {
    const count = (id: string) => BASE_COUNTRIES.filter((c) => c.confederation === id).length;
    expect({ UEFA: count('UEFA'), CAF: count('CAF'), AFC: count('AFC'), CONCACAF: count('CONCACAF'), CONMEBOL: count('CONMEBOL'), OFC: count('OFC') })
      .toEqual({ UEFA: 57, CAF: 54, AFC: 46, CONCACAF: 35, CONMEBOL: 10, OFC: 11 });
  });

  it('division sizes and slots match the prompt (213 slots in total)', () => {
    const sizes = Object.fromEntries(confs.map((c) => [c.id, c.divisions.map((d) => d.teams)]));
    expect(sizes).toEqual({ UEFA: [16, 20, 20], CAF: [16, 18, 20], AFC: [16, 16, 15], CONCACAF: [16, 18], CONMEBOL: [10], OFC: [12] });
    expect(confs.reduce((s, c) => s + slotsOf(c), 0)).toBe(213);
  });

  it('promotion slots of a tier equal relegation slots of the tier above; TV shares sum to 1', () => {
    for (const c of confs) {
      for (let i = 1; i < c.divisions.length; i++) expect(c.divisions[i].promotionSlots).toBe(c.divisions[i - 1].relegationSlots);
      expect(c.divisions[0].promotionSlots).toBe(0);
      expect(c.divisions[c.divisions.length - 1].relegationSlots).toBe(0);
      expect(c.divisions.reduce((s, d) => s + d.tvShare, 0)).toBeCloseTo(1);
    }
  });

  it('cups: single match for UEFA, CAF, AFC; two legs for OFC, CONMEBOL, CONCACAF', () => {
    expect(Object.fromEntries(confs.map((c) => [c.id, c.cup.legs]))).toEqual({ UEFA: 1, CAF: 1, AFC: 1, CONCACAF: 2, CONMEBOL: 2, OFC: 2 });
  });

  it('Champions League slots add up: 11 + 2 holders + 3 play-off = 16; CL II 13 + 3 = 16', () => {
    const count = (route: string) => Object.values(QUALIFICATION).reduce((s, r) => s + r.filter((x) => x === route).length, 0);
    expect(count('direct') + CHAMPIONS.titleHolderSlots + CHAMPIONS.playoff.teams / 2).toBe(16);
    expect(count('playoff')).toBe(6);
    expect(count('cl2') + CHAMPIONS.playoff.teams / 2).toBe(16);
  });

  it('position weights only reference existing attributes', () => {
    for (const p of POSITIONS) for (const k of Object.keys(POSITION_WEIGHTS[p])) expect(VISIBLE_INDEX[k], `${p}.${k}`).toBeDefined();
  });
});

describe('confederation redistribution', () => {
  it('moves the weakest UEFA country to AFC and the weakest CONCACAF country to OFC; every slot filled', () => {
    const countries = testCountryRecords(1);
    const confs = defaultConfederations();
    const r = assignConfederations(countries, confs, {}, { populationWeight: 0.5, reputationWeight: 0.5 });
    expect(r.transfers.map((t) => [t.from, t.to, t.confirmed])).toEqual([['UEFA', 'AFC', false], ['CONCACAF', 'OFC', false]]);
    expect(r.table.every((row) => row.ok)).toBe(true);
    expect(r.transfers[0].country).toBe(r.ranking.UEFA[0].country);
    expect(r.transfers[1].country).toBe(r.ranking.CONCACAF[0].country);
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('never moves Catalunya or País Basco, even if they are the weakest', () => {
    const countries = testCountryRecords(1);
    for (const c of countries) if ((PROTECTED_COUNTRIES as readonly string[]).includes(c.id)) { c.population = 1; c.reputation = 1; }
    const r = assignConfederations(countries, defaultConfederations(), {}, { populationWeight: 0.5, reputationWeight: 0.5 });
    expect(r.transfers.map((t) => t.country)).not.toContain('CAT');
    expect(r.transfers.map((t) => t.country)).not.toContain('EUS');
  });

  it('uses confirmed transfers when given, and keeps nationality/rivals of the moved country', () => {
    const w = generateWorldFull({ seed: 3, confirmedTransfers: { SMR: 'AFC', AIA: 'OFC' } });
    expect(w.raw.meta.transfers).toEqual([
      { country: 'SMR', from: 'UEFA', to: 'AFC', confirmed: true },
      { country: 'AIA', from: 'CONCACAF', to: 'OFC', confirmed: true },
    ]);
    const smr = w.raw.countries.find((c) => c.id === 'SMR')!;
    expect(smr.confederation).toBe('UEFA');
    expect(smr.gameConfederation).toBe('AFC');
    expect(w.raw.players.filter((p) => p.team === 'SMR' && p.squad === 'senior' && p.nationality === 'SMR').length).toBeGreaterThanOrEqual(12);
  });

  it('a wrong number of confirmed transfers is an error', () => {
    const r = assignConfederations(testCountryRecords(1), defaultConfederations(), { SMR: 'AFC', GIB: 'AFC' }, { populationWeight: 0.5, reputationWeight: 0.5 });
    expect(r.issues.some((i) => i.level === 'error')).toBe(true);
  });
});

describe('fictional world generator', () => {
  const { raw } = fullWorld();

  it('213 countries, all in a division, division sizes respected, all flagged as test data', () => {
    expect(raw.countries).toHaveLength(213);
    expect(raw.meta.isTestData).toBe(true);
    for (const conf of raw.confederations) for (const d of conf.divisions) {
      expect(raw.countries.filter((c) => c.gameConfederation === conf.id && c.division === d.tier), d.id).toHaveLength(d.teams);
    }
    expect(raw.countries.every((c) => c.economyStatus === 'test' && c.isTestData)).toBe(true);
  });

  it('every country has full squads at every level, ≥12 home-grown seniors; ~17k players', () => {
    for (const c of raw.countries) {
      for (const level of SQUAD_LEVELS) {
        expect(raw.players.filter((p) => p.team === c.id && p.squad === level), `${c.id} ${level}`).toHaveLength(SQUADS.levels[level].size);
      }
      const hg = raw.players.filter((p) => p.team === c.id && p.squad === 'senior' && p.nationality === c.id).length;
      expect(hg).toBeGreaterThanOrEqual(SQUADS.minHomeGrown);
    }
    expect(raw.players.length).toBeGreaterThan(16_000);
    expect(raw.players.length).toBeLessThan(18_500);
  });

  it('youth ages and nationalities: U17 are 15–16, ≤ ~10% from other countries', () => {
    const u17 = raw.players.filter((p) => p.squad === 'u17');
    const ages = new Set(u17.map((p) => 2026 - Number(p.birthDate.slice(0, 4))));
    for (const a of ages) expect([15, 16, 17]).toContain(a);
    const foreign = raw.players.filter((p) => p.squad !== 'senior' && p.team && p.nationality !== p.team).length;
    const youth = raw.players.filter((p) => p.squad !== 'senior' && p.team).length;
    expect(foreign / youth).toBeLessThan(0.13);
  });

  it('players keep their country of formation; foreign youth come from the same confederation', () => {
    const conf = new Map(raw.countries.map((c) => [c.id, c.gameConfederation]));
    for (const p of raw.players) if (p.squad !== 'senior' && p.team && p.nationality !== p.team) expect(conf.get(p.nationality)).toBe(conf.get(p.team));
  });

  it('division strength is ordered inside each confederation', () => {
    const avg = (conf: string, tier: number) => {
      const ids = new Set(raw.countries.filter((c) => c.gameConfederation === conf && c.division === tier).map((c) => c.id));
      const ps = raw.players.filter((p) => ids.has(p.team) && p.squad === 'senior');
      return ps.reduce((s, p) => s + p.ovr, 0) / ps.length;
    };
    for (const conf of raw.confederations) for (let t = 2; t <= conf.divisions.length; t++) expect(avg(conf.id, t - 1)).toBeGreaterThan(avg(conf.id, t));
  });

  it('unique ids and symmetric rivalries', () => {
    expect(new Set(raw.players.map((p) => p.id)).size).toBe(raw.players.length);
    const byId = new Map(raw.countries.map((c) => [c.id, c]));
    for (const c of raw.countries) for (const r of c.rivals) expect(byId.get(r)?.rivals).toContain(c.id);
  });

  it('is deterministic for the same seed and different for another seed', () => {
    const a = generateWorld({ seed: 99 });
    const b = generateWorld({ seed: 99 });
    const c = generateWorld({ seed: 100 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.players.slice(0, 50))).not.toBe(JSON.stringify(c.players.slice(0, 50)));
  });
});
