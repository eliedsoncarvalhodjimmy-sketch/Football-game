// File formats accepted by the local file adapter (documented in data/schema/README.md).

export const CLUB_COLUMNS = [
  'id', 'name', 'short_name', 'country', 'league', 'city', 'reputation', 'stadium_capacity',
  'transfer_budget', 'wage_budget', 'facilities', 'youth_facilities', 'crest', 'rivals',
  'color_primary', 'color_secondary',
] as const;
export const CLUB_REQUIRED = ['id', 'name', 'league'] as const;

export const PLAYER_COLUMNS = [
  'id', 'first_name', 'last_name', 'club', 'nationality', 'birth_date', 'position',
  'other_positions', 'ovr', 'foot', 'height_cm',
] as const;
export const PLAYER_REQUIRED = ['id', 'last_name', 'birth_date', 'position', 'ovr'] as const;

/** Well-known file names inside the data folder. */
export const FILES = {
  world: 'world.json',
  clubs: 'clubs.csv',
  players: 'players.csv',
  attributes: 'attributes.csv',
} as const;

/** Optional world.json */
export interface WorldFile {
  name?: string;
  seed?: number;
  referenceDate?: string;
  /** Partial overrides of league configuration, keyed by league id (e.g. "POR1"). */
  leagues?: Record<string, Partial<{
    name: string; clubs: number; calendar: 'aug-may' | 'calendar-year';
    windows: { start: string; end: string }[]; promotionSlots: number; relegationSlots: number;
    tvRevenuePool: number; quality: number; qualitySpread: number;
  }>>;
  /** Partial overrides of countries, keyed by country id (e.g. "USA"). */
  countries?: Record<string, Partial<{ name: string; promotionRelegation: boolean; youthStrength: number }>>;
}
