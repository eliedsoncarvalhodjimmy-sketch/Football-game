// Invented names from syllable pools (test data only).

import { NAME_POOLS } from '../../config/names.config';
import type { NameRegion } from '../types';
import type { Rng } from '../rng';

const cap = (s: string): string => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

export function personName(rng: Rng, region: NameRegion): { first: string; last: string } {
  const p = NAME_POOLS[region];
  const first = cap(rng.pick(p.firstStart) + rng.pick(p.firstEnd));
  const last = rng.pick(p.lastStart) + rng.pick(p.lastEnd);
  return { first, last: cap(last) };
}

export function cityName(rng: Rng, region: NameRegion): string {
  const p = NAME_POOLS[region];
  return cap(rng.pick(p.cityStart) + rng.pick(p.cityEnd));
}

export function clubName(rng: Rng, region: NameRegion, city: string): string {
  return rng.pick(NAME_POOLS[region].clubPatterns).replace('{city}', city);
}

/** Short name: up to 3 uppercase letters from the city. */
export function shortName(city: string): string {
  const letters = city.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.slice(0, 3).padEnd(3, 'X');
}
