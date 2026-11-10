// Invented person names from syllable pools (test data only).

import { NAME_POOLS } from '../../config/names.config';
import type { NameRegion } from '../types';
import type { Rng } from '../rng';

const cap = (s: string): string => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

export function personName(rng: Rng, region: NameRegion): { first: string; last: string } {
  const p = NAME_POOLS[region];
  const first = cap(rng.pick(p.firstStart) + rng.pick(p.firstEnd));
  const last = cap(rng.pick(p.lastStart) + rng.pick(p.lastEnd));
  return { first, last };
}
