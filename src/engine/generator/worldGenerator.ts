// Fictional world generator (TEST DATA): the real list of 213 countries, with invented players,
// invented economy (population/GDP flagged "test") and invented reputation.

import { BASE_COUNTRIES } from '../../config/countries.base';
import { defaultConfederations } from '../../config/confederations.config';
import { ECONOMY } from '../../config/economy.config';
import { GENERATOR as G } from '../../config/generator.config';
import { TEAM_COLORS } from '../../config/names.config';
import { DEFAULT_RIVALRIES } from '../../config/rivals.config';
import { SQUADS } from '../../config/squads.config';
import { Rng, clamp } from '../rng';
import type { ConfederationId, CountryRecord, RawWorld, WorldIssue } from '../types';
import { assembleWorld, type AssembleResult } from '../world/assemble';

export interface GenerateOptions {
  seed?: number;
  referenceDate?: string;
  confirmedTransfers?: Record<string, ConfederationId>;
}

/** Base country records (no economy), with default rivalries. */
export function baseCountryRecords(): CountryRecord[] {
  const recs: CountryRecord[] = BASE_COUNTRIES.map((b) => ({
    id: b.id, name: b.name, confederation: b.confederation, gameConfederation: b.confederation, division: 0,
    population: null, gdpUsd: null, economyStatus: 'missing', reputation: 30, footballCulture: 10, youthStrength: 10,
    flag: '', colorPrimary: '#888888', colorSecondary: '#ffffff', rivals: [],
  }));
  const byId = new Map(recs.map((c) => [c.id, c]));
  for (const [a, b] of DEFAULT_RIVALRIES) {
    const ca = byId.get(a), cb = byId.get(b);
    if (!ca || !cb) continue;
    if (!ca.rivals.includes(b)) ca.rivals.push(b);
    if (!cb.rivals.includes(a)) cb.rivals.push(a);
  }
  return recs;
}

export function testCountryRecords(seed: number): CountryRecord[] {
  const E = ECONOMY;
  return baseCountryRecords().map((c) => {
    const rng = Rng.from(seed, `country:${c.id}`);
    const population = Math.round(clamp(Math.exp(rng.normal(E.testPopulation.mu, E.testPopulation.sigma)), E.testPopulation.min, E.testPopulation.max));
    const gdpPc = clamp(Math.exp(rng.normal(E.testGdpPerCapita.mu, E.testGdpPerCapita.sigma)), E.testGdpPerCapita.min, E.testGdpPerCapita.max);
    const c1 = rng.pick(TEAM_COLORS);
    let c2 = rng.pick(TEAM_COLORS);
    while (c2 === c1) c2 = rng.pick(TEAM_COLORS);
    return {
      ...c,
      population,
      gdpUsd: Math.round(population * gdpPc),
      economyStatus: 'test' as const,
      reputation: Math.round(clamp(rng.normal(G.country.reputationMean[c.confederation] ?? 40, G.country.reputationSd), 1, 100)),
      footballCulture: rng.int(4, 20),
      youthStrength: rng.int(4, 20),
      colorPrimary: c1,
      colorSecondary: c2,
      isTestData: true,
    };
  });
}

export function generateWorldFull(opts: GenerateOptions = {}): AssembleResult & { issues: WorldIssue[] } {
  const seed = opts.seed ?? G.defaultSeed;
  return assembleWorld({
    meta: {
      name: 'Mundo de teste (fictício)', isTestData: true, seed,
      referenceDate: opts.referenceDate ?? G.referenceDate, source: 'generator',
      createdAt: new Date(0).toISOString(), // fixed for determinism; the save slot records real time
    },
    confederations: defaultConfederations(),
    countries: testCountryRecords(seed),
    players: [],
    fill: true,
    fillIdPrefix: 'T',
    freeAgents: SQUADS.freeAgents,
    confirmedTransfers: opts.confirmedTransfers,
  });
}

export function generateWorld(opts: GenerateOptions = {}): RawWorld {
  return generateWorldFull(opts).raw;
}
