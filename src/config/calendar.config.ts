// Season calendar (prompt v2.4 §4.3). Dates are "MM-DD". Used from phase 3 on.

import type { TransferWindow } from '../engine/types';

export const CALENDAR = {
  seasonStart: '02-05',
  seasonEnd: '11-30',
  /** Transfer windows: one before the season (January) and one mid-season (June). */
  transferWindows: [
    { start: '01-02', end: '01-31' },
    { start: '06-01', end: '06-30' },
  ] as TransferWindow[],
  /** Champions League play-off (February). */
  championsPlayoff: { start: '02-05', end: '02-28' },
  /** Group stages of Champions League I and II start in April. */
  championsGroupsStart: '04-01',
  /** Knock-out rounds from mid-September. */
  championsKnockoutStart: '09-15',
  /** Matchdays: weekend always, midweek when the calendar needs it. */
  weekendDay: 6, // Saturday (0 = Sunday)
  midweekDay: 3, // Wednesday
  allowMidweek: true,
} as const;
