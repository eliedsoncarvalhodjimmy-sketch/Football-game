// Champions League I and II (prompt v2.4 §4.2). Implemented in phase 8; validated from phase 1.

import type { ConfederationId } from '../engine/types';

export type ChampionsRoute = 'direct' | 'playoff' | 'cl2';

/** Route by final position (1-based) in the top division of the previous season. */
export const QUALIFICATION: Record<ConfederationId, ChampionsRoute[]> = {
  UEFA: ['direct', 'direct', 'direct', 'playoff', 'cl2'],
  CONMEBOL: ['direct', 'direct', 'playoff', 'cl2', 'cl2'],
  CAF: ['direct', 'direct', 'playoff', 'cl2', 'cl2'],
  AFC: ['direct', 'direct', 'playoff', 'cl2', 'cl2'],
  CONCACAF: ['direct', 'playoff', 'cl2', 'cl2', 'cl2'],
  OFC: ['direct', 'playoff', 'cl2', 'cl2', 'cl2'],
};

export const CHAMPIONS = {
  teams: 16,
  /** Title holders of CL I and CL II enter CL I directly. */
  titleHolderSlots: 2,
  /** If a team already has a place, every team below moves up one route (cascade). */
  cascade: true,
  playoff: { teams: 6, pairing: 'free-draw' as const, legs: 2 as 1 | 2 },
  groups: { count: 4, size: 4, legs: 2, advance: 2 },
  knockout: { quarterLegs: 2, semiLegs: 2, finalLegs: 1 },
  /**
   * First season: qualification comes from your history file (decision pending — you'll send it).
   * Until then the test world uses initial reputation.
   */
  firstSeasonSource: 'history-file-pending' as const,
};
