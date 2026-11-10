// Squads (prompt v2.4 §2, §6, §7, §12).

import type { Position } from './attributes.config';
import type { SquadLevel } from '../engine/types';

export interface SquadLevelSpec {
  size: number;
  /** [age, relative weight] */
  ages: [number, number][];
  /** OVR offset relative to the senior first XI of the country (before age penalties). */
  ovrOffset: number;
}

export const SQUADS = {
  /** Minimum players formed in the country inside the senior squad. */
  minHomeGrown: 12,
  /** Position template for a 25-man senior squad; youth squads scale it. */
  positionTemplate: {
    GK: 3, DR: 2, DC: 4, DL: 2, DM: 2, MC: 3, MR: 1, ML: 1, AM: 2, RW: 1, LW: 1, ST: 3,
  } as Record<Position, number>,
  levels: {
    senior: { size: 25, ovrOffset: 0, ages: [
      [19, 3], [20, 5], [21, 6], [22, 7], [23, 8], [24, 9], [25, 9], [26, 9], [27, 9], [28, 8],
      [29, 7], [30, 6], [31, 5], [32, 4], [33, 3], [34, 2], [35, 1], [36, 0.5]] },
    u23: { size: 20, ovrOffset: -6, ages: [[19, 3], [20, 3], [21, 2.5], [22, 2]] },
    u19: { size: 18, ovrOffset: -12, ages: [[17, 1], [18, 1]] },
    u17: { size: 18, ovrOffset: -18, ages: [[15, 1], [16, 1]] },
  } as Record<SquadLevel, SquadLevelSpec>,
  /** Test world: share of senior players formed in another country (always ≥ minHomeGrown home-grown). */
  foreignSeniorShare: 0.2,
  /** Youth: share from nearby countries of the same confederation (max 10%). */
  nearbyYouthShare: 0.1,
  /** Free agents in the test world. */
  freeAgents: 300,
} as const;
