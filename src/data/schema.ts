// File formats accepted by the local file adapter (documented in data/schema/README.md).

export const COUNTRY_COLUMNS = [
  'id', 'name', 'confederation', 'population', 'gdp_usd', 'reputation', 'football_culture',
  'youth_strength', 'division', 'flag', 'rivals', 'color_primary', 'color_secondary',
] as const;
export const COUNTRY_REQUIRED = ['id'] as const;

export const PLAYER_COLUMNS = [
  'id', 'first_name', 'last_name', 'nationality', 'team', 'squad', 'birth_date', 'position',
  'other_positions', 'ovr', 'value_eur', 'foot', 'height_cm',
] as const;
export const PLAYER_REQUIRED = ['id', 'last_name', 'nationality', 'birth_date', 'position', 'ovr'] as const;

export const EXCEPTION_COLUMNS = ['player_id', 'country', 'note'] as const;

/** Well-known file names inside the data folder. */
export const FILES = {
  world: 'world.json',
  countries: 'countries.csv',
  players: 'players.csv',
  exceptions: 'initial_country.csv',
  attributes: 'attributes.csv',
} as const;

/** Optional world.json */
export interface WorldFile {
  name?: string;
  seed?: number;
  referenceDate?: string;
  /** Complete missing squad places (youth, short senior squads) with generated players. Default true. */
  fillSquads?: boolean;
}
