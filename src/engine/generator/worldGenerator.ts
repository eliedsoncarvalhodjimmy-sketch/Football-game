// Fictional world generator (TEST DATA). Produces the same RawWorld shape as a real DataSource,
// so the rest of the game cannot tell the difference — except that everything is flagged isTestData.

import { POSITIONS, type Position } from '../../config/attributes.config';
import { GENERATOR as G } from '../../config/generator.config';
import { CLUB_COLORS } from '../../config/names.config';
import { defaultCountries } from '../../config/world.config';
import { clubIdFor, playerIdFor } from '../ids';
import { Rng, clamp } from '../rng';
import type { ClubRecord, CountryConfig, LeagueConfig, PlayerRecord, PreferredFoot, RawWorld } from '../types';
import { cityName, clubName, personName, shortName } from './nameGenerator';

export interface GenerateOptions {
  seed?: number;
  referenceDate?: string;
  /** Override the country configuration (defaults to src/config/world.config.ts). */
  countries?: CountryConfig[];
}

const AGES = G.ageWeights.map(([a]) => a);
const AGE_W = G.ageWeights.map(([, w]) => w);

function birthDateFor(rng: Rng, age: number, referenceDate: string): string {
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  const month = rng.int(1, 12);
  const day = rng.int(1, 28);
  const afterRef = month > rm || (month === rm && day > rd);
  const year = ry - age - (afterRef ? 1 : 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function footFor(rng: Rng, pos: Position): PreferredFoot {
  if (rng.chance(0.05)) return 'B';
  const leftSided = pos === 'DL' || pos === 'ML' || pos === 'LW';
  return rng.chance(leftSided ? 0.7 : 0.2) ? 'L' : 'R';
}

function makePlayer(
  rng: Rng, id: string, clubId: string, pos: Position, age: number, ovr: number,
  nationality: CountryConfig, referenceDate: string,
): PlayerRecord {
  const { first, last } = personName(rng, nationality.nameRegion);
  const hMean = G.heightMean[pos] ?? G.heightMeanDefault;
  return {
    id,
    firstName: first,
    lastName: last,
    clubId,
    nationality: nationality.id,
    birthDate: birthDateFor(rng, age, referenceDate),
    position: pos,
    otherPositions: [],
    ovr: Math.round(clamp(ovr, G.ovrMin, G.ovrMax)),
    foot: footFor(rng, pos),
    heightCm: Math.round(clamp(rng.normal(hMean, G.heightSd), 160, 205)),
  };
}

function generateLeagueClubs(
  rng: Rng, country: CountryConfig, league: LeagueConfig, usedNames: Set<string>, cities: string[],
): { club: ClubRecord; teamOvr: number }[] {
  const n = league.clubs;
  const C = G.club;
  // strength curve: s in [0,1], few dominant clubs
  const s = Array.from({ length: n }, (_, r) => Math.pow(1 - r / Math.max(1, n - 1), C.strengthCurve));
  const meanS = s.reduce((a, b) => a + b, 0) / n;
  const out: { club: ClubRecord; teamOvr: number }[] = [];
  for (let r = 0; r < n; r++) {
    const teamOvr = league.quality + league.qualitySpread * (s[r] - meanS) + rng.normal(0, 0.8);
    let city = '';
    let name = '';
    for (let attempt = 0; attempt < 50; attempt++) {
      city = cities.length > 0 && rng.chance(C.sameCityChance) ? rng.pick(cities) : cityName(rng, country.nameRegion);
      name = clubName(rng, country.nameRegion, city);
      if (!usedNames.has(name)) break;
      name = '';
    }
    if (!name) name = `${clubName(rng, country.nameRegion, city)} ${usedNames.size}`;
    usedNames.add(name);
    if (!cities.includes(city)) cities.push(city);

    const rep = Math.round(clamp(C.reputationBase + (teamOvr - 70) * C.reputationPerOvrPoint + rng.normal(0, C.reputationNoiseSd), 1, 100));
    const c1 = rng.pick(CLUB_COLORS);
    let c2 = rng.pick(CLUB_COLORS);
    while (c2 === c1) c2 = rng.pick(CLUB_COLORS);
    out.push({
      teamOvr,
      club: {
        id: clubIdFor(league.id, r),
        name,
        shortName: shortName(city),
        countryId: country.id,
        leagueId: league.id,
        city,
        reputation: rep,
        stadiumCapacity: Math.round((C.stadiumBase + rep * rep * C.stadiumPerRep2 * rng.range(0.7, 1.3)) / 100) * 100,
        transferBudget: Math.round(C.transferBudgetBase * Math.exp(rep / C.transferBudgetScale) * rng.range(0.6, 1.4) / 1000) * 1000,
        wageBudget: Math.round(C.wageBudgetBase * Math.exp(rep / C.wageBudgetScale) * rng.range(0.8, 1.2) / 1000) * 1000,
        facilities: Math.round(clamp(rep / 5 + rng.normal(0, 1.5), 1, 20)),
        youthFacilities: Math.round(clamp(rep / 5 + rng.normal(0, 2.5), 1, 20)),
        crest: '',
        rivals: [],
        colorPrimary: c1,
        colorSecondary: c2,
        isTestData: true,
      },
    });
  }
  return out;
}

function assignRivals(rng: Rng, clubs: ClubRecord[]): void {
  const max = G.club.rivalsMax;
  const byCity = new Map<string, ClubRecord[]>();
  for (const c of clubs) {
    const list = byCity.get(c.city) ?? [];
    list.push(c);
    byCity.set(c.city, list);
  }
  const link = (a: ClubRecord, b: ClubRecord) => {
    if (a === b || a.rivals.includes(b.id) || a.rivals.length >= max || b.rivals.length >= max) return;
    a.rivals.push(b.id);
    b.rivals.push(a.id);
  };
  // same-city derbies
  for (const list of byCity.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) link(list[i], list[j]);
  // a few regional rivalries between top-tier clubs of similar reputation
  const top = clubs.filter((c) => c.leagueId.endsWith('1')).sort((a, b) => b.reputation - a.reputation);
  for (let i = 0; i + 1 < top.length; i++) if (rng.chance(0.25)) link(top[i], top[i + 1]);
}

export function generateWorld(opts: GenerateOptions = {}): RawWorld {
  const seed = opts.seed ?? G.defaultSeed;
  const referenceDate = opts.referenceDate ?? G.referenceDate;
  const countries = opts.countries ?? defaultCountries();
  const clubs: ClubRecord[] = [];
  const players: PlayerRecord[] = [];
  const template = POSITIONS.flatMap((p) => Array.from({ length: G.squadTemplate[p] }, (_, rank) => ({ p, rank })));

  for (const country of countries) {
    const rng = Rng.from(seed, `country:${country.id}`);
    const usedNames = new Set<string>();
    const cities: string[] = [];
    const countryClubs: ClubRecord[] = [];
    const others = countries.filter((c) => c.id !== country.id);
    for (const league of country.leagues) {
      const foreignShare = G.foreignShareByTier[Math.min(league.tier - 1, G.foreignShareByTier.length - 1)];
      for (const { club, teamOvr } of generateLeagueClubs(rng, country, league, usedNames, cities)) {
        countryClubs.push(club);
        const prng = Rng.from(seed, `squad:${club.id}`);
        template.forEach(({ p, rank }, k) => {
          const age = AGES[prng.weightedIndex(AGE_W)];
          let ovr = teamOvr + G.depthOffset[Math.min(rank, G.depthOffset.length - 1)] + prng.normal(0, G.ovrNoiseSd);
          if (age < G.youngPenaltyAge) ovr -= (G.youngPenaltyAge - age) * G.youngPenaltyPerYear;
          if (age > G.oldPenaltyAge) ovr -= (age - G.oldPenaltyAge) * G.oldPenaltyPerYear;
          const nat = prng.chance(foreignShare) ? prng.pick(others) : country;
          players.push(makePlayer(prng, playerIdFor(club.id, k), club.id, p, age, ovr, nat, referenceDate));
        });
      }
    }
    assignRivals(rng, countryClubs);
    clubs.push(...countryClubs);
  }

  // free agents
  const frng = Rng.from(seed, 'free-agents');
  const FA = G.freeAgents;
  for (let k = 0; k < FA.count; k++) {
    const nat = frng.pick(countries);
    const pos = frng.pick(POSITIONS);
    players.push(makePlayer(frng, `T-FA-${String(k + 1).padStart(4, '0')}`, '', pos,
      frng.int(FA.ageMin, FA.ageMax), frng.int(FA.ovrMin, FA.ovrMax), nat, referenceDate));
  }

  return {
    meta: {
      name: 'Mundo de teste (fictício)',
      isTestData: true,
      seed,
      referenceDate,
      source: 'generator',
      createdAt: new Date(0).toISOString(), // fixed for determinism; the save slot records real time
    },
    countries,
    clubs,
    players,
  };
}
