// Team strength targets and squad fill-in with generated players.
// Used for the whole test world, and to complete real squads (missing youth, short senior squads).

import { POSITIONS, type Position } from '../../config/attributes.config';
import { BASE_COUNTRIES } from '../../config/countries.base';
import { GENERATOR as G } from '../../config/generator.config';
import { SQUADS } from '../../config/squads.config';
import { personName } from '../generator/nameGenerator';
import { referenceValue } from '../generator/value';
import { Rng, clamp } from '../rng';
import {
  SQUAD_LEVELS, type ConfederationConfig, type CountryRecord, type NameRegion, type PlayerRecord,
  type PreferredFoot, type SquadLevel,
} from '../types';

const REGION = new Map<string, NameRegion>(BASE_COUNTRIES.map((c) => [c.id, c.nameRegion]));
export const regionOf = (countryId: string): NameRegion => REGION.get(countryId) ?? 'anglo';
const LEVEL_CODE: Record<SquadLevel, string> = { senior: 'S', u23: 'A', u19: 'B', u17: 'C' };

/** Mean first-XI OVR each country should have, from its division and reputation rank inside it. */
export function teamTargetOvr(countries: CountryRecord[], confederations: ConfederationConfig[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const conf of confederations) {
    for (const d of conf.divisions) {
      const members = countries
        .filter((c) => c.gameConfederation === conf.id && c.division === d.tier)
        .sort((a, b) => b.reputation - a.reputation || a.id.localeCompare(b.id));
      const n = members.length;
      const s = members.map((_, r) => Math.pow(1 - r / Math.max(1, n - 1), G.country.strengthCurve));
      const meanS = s.reduce((a, b) => a + b, 0) / Math.max(1, n);
      members.forEach((c, r) => out.set(c.id, d.quality + d.qualitySpread * (s[r] - meanS)));
    }
  }
  return out;
}

/** Position counts for a squad of `size`, scaled from the 25-man template (largest remainder). */
export function positionTemplate(size: number): Record<Position, number> {
  const base = SQUADS.positionTemplate;
  const total = POSITIONS.reduce((s, p) => s + base[p], 0);
  const exact = POSITIONS.map((p) => (base[p] * size) / total);
  const counts = exact.map(Math.floor);
  let rest = size - counts.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (rest <= 0) break; counts[i]++; rest--; }
  return Object.fromEntries(POSITIONS.map((p, i) => [p, counts[i]])) as Record<Position, number>;
}

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

export interface FillOptions {
  seed: number;
  referenceDate: string;
  /** Id prefix: "T" for the test world, "G" for fill-ins next to real data. */
  idPrefix: string;
  freeAgents: number;
}

/** Generate the players missing from every squad level of every country (plus free agents). */
export function fillSquads(
  countries: CountryRecord[], confederations: ConfederationConfig[], existing: PlayerRecord[], opts: FillOptions,
): PlayerRecord[] {
  const target = teamTargetOvr(countries, confederations);
  const out: PlayerRecord[] = [];
  const usedIds = new Set(existing.map((p) => p.id));
  const byConf = new Map<string, CountryRecord[]>();
  for (const c of countries) byConf.set(c.gameConfederation, [...(byConf.get(c.gameConfederation) ?? []), c]);

  const make = (rng: Rng, id: string, team: string, nationality: string, squad: SquadLevel, pos: Position, age: number, ovr: number): PlayerRecord => {
    const { first, last } = personName(rng, regionOf(nationality));
    const o = Math.round(clamp(ovr, G.ovrMin, G.ovrMax));
    const hMean = G.heightMean[pos] ?? G.heightMeanDefault;
    return {
      id, firstName: first, lastName: last, nationality, team, squad,
      birthDate: birthDateFor(rng, age, opts.referenceDate), position: pos, otherPositions: [], ovr: o,
      valueEur: Math.round(referenceValue(o, age) * Math.exp(rng.normal(0, G.value.testNoiseSd)) / 1000) * 1000,
      foot: footFor(rng, pos), heightCm: Math.round(clamp(rng.normal(hMean, G.heightSd), 160, 205)), generated: true,
    };
  };

  for (const c of countries) {
    const rng = Rng.from(opts.seed, `squads:${c.id}`);
    const teamOvr = target.get(c.id) ?? 60;
    const sameConf = (byConf.get(c.gameConfederation) ?? []).filter((x) => x.id !== c.id);
    const nearby = sameConf.filter((x) => regionOf(x.id) === regionOf(c.id));
    for (const level of SQUAD_LEVELS) {
      const spec = SQUADS.levels[level];
      const have = existing.filter((p) => p.team === c.id && p.squad === level);
      const need = spec.size - have.length;
      if (need <= 0) continue;
      const tmpl = positionTemplate(spec.size);
      const perPos = new Map<string, number>();
      for (const p of have) perPos.set(p.position, (perPos.get(p.position) ?? 0) + 1);
      const slots: Position[] = [];
      for (const p of POSITIONS) for (let k = perPos.get(p) ?? 0; k < tmpl[p]; k++) slots.push(p);
      for (let k = 0; slots.length < need; k++) slots.push(POSITIONS[k % POSITIONS.length]);
      let foreigners = have.filter((p) => p.nationality !== c.id).length;
      const maxForeign = level === 'senior' ? spec.size - SQUADS.minHomeGrown : Infinity;
      const ages = spec.ages.map(([a]) => a);
      const ageW = spec.ages.map(([, w]) => w);
      let n = 0;
      for (const pos of slots.slice(0, need)) {
        const rank = perPos.get(pos) ?? 0;
        perPos.set(pos, rank + 1);
        const age = ages[rng.weightedIndex(ageW)];
        let ovr = teamOvr + spec.ovrOffset + G.depthOffset[Math.min(rank, G.depthOffset.length - 1)] + rng.normal(0, G.ovrNoiseSd);
        if (level === 'senior' && age < G.youngPenaltyAge) ovr -= (G.youngPenaltyAge - age) * G.youngPenaltyPerYear;
        if (age > G.oldPenaltyAge) ovr -= (age - G.oldPenaltyAge) * G.oldPenaltyPerYear;
        let nationality = c.id;
        if (level === 'senior') {
          if (foreigners < maxForeign && rng.chance(SQUADS.foreignSeniorShare)) {
            const pool = rng.chance(0.7) && sameConf.length ? sameConf : countries.filter((x) => x.id !== c.id);
            nationality = rng.pick(pool).id;
            foreigners++;
          }
        } else if (rng.chance(SQUADS.nearbyYouthShare)) {
          const pool = nearby.length ? nearby : sameConf;
          if (pool.length) nationality = rng.pick(pool).id;
        }
        let id: string;
        do { id = `${opts.idPrefix}-${c.id}-${LEVEL_CODE[level]}${String(++n).padStart(2, '0')}`; } while (usedIds.has(id));
        usedIds.add(id);
        out.push(make(rng, id, c.id, nationality, level, pos, age, ovr));
      }
    }
  }

  const frng = Rng.from(opts.seed, 'free-agents');
  for (let k = 0; k < opts.freeAgents; k++) {
    const nat = frng.pick(countries);
    const id = `${opts.idPrefix}-FA-${String(k + 1).padStart(4, '0')}`;
    if (usedIds.has(id)) continue;
    out.push(make(frng, id, '', nat.id, 'senior', frng.pick(POSITIONS), frng.int(21, 34), frng.int(45, 70)));
  }
  return out;
}

/** Home-grown check: senior squads with fewer than the minimum players formed in the country. */
export function homeGrownViolations(countries: CountryRecord[], players: PlayerRecord[]): { country: string; homeGrown: number }[] {
  const out: { country: string; homeGrown: number }[] = [];
  for (const c of countries) {
    const seniors = players.filter((p) => p.team === c.id && p.squad === 'senior');
    const hg = seniors.filter((p) => p.nationality === c.id).length;
    if (hg < SQUADS.minHomeGrown) out.push({ country: c.id, homeGrown: hg });
  }
  return out;
}
