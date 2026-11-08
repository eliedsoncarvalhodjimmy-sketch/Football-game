// Domain types shared by the engine, data layer and UI.
// The engine is pure: no DOM, no I/O. Everything here must be structured-cloneable.

export type CountryId = string; // e.g. "POR"
export type LeagueId = string; // e.g. "POR1"
export type ClubId = string; // stable external id (from files or generator)
export type PlayerId = string; // stable external id (from files or generator)

/** Season calendar: European style (Aug–May) or calendar year (Feb–Nov/Dec). */
export type CalendarKind = 'aug-may' | 'calendar-year';

/** A transfer window, as month-day strings "MM-DD" (inclusive). */
export interface TransferWindow {
  start: string;
  end: string;
}

export interface LeagueFormat {
  /** v1 only supports the double round robin. Other formats are reserved for later phases. */
  kind: 'double-round-robin';
}

export interface LeagueConfig {
  id: LeagueId;
  countryId: CountryId;
  name: string; // generic name, e.g. "Primeira Divisão" — never a real brand
  tier: number; // 1 = top division
  clubs: number; // expected number of clubs (real number comes from files)
  format: LeagueFormat;
  calendar: CalendarKind;
  windows: TransferWindow[];
  /** Clubs promoted to the tier above (0 for tier 1). */
  promotionSlots: number;
  /** Clubs relegated to the tier below (0 for the lowest tier). */
  relegationSlots: number;
  /** Total TV revenue pool per season in EUR, before distribution by final position. */
  tvRevenuePool: number;
  /** Tuning: mean OVR of a typical first XI in this league (fictional world generator). */
  quality: number;
  /** Tuning: OVR difference between the strongest and weakest club in this league. */
  qualitySpread: number;
}

export interface CountryConfig {
  id: CountryId;
  name: string;
  /** Name region used by the fictional name generator. */
  nameRegion: NameRegion;
  /** Whether promotion/relegation is applied between this country's tiers. */
  promotionRelegation: boolean;
  /** Youth production strength 1–20 (tuning, used by the academy in phase 6). */
  youthStrength: number;
  leagues: LeagueConfig[];
}

export type NameRegion =
  | 'iberian'
  | 'lusophone'
  | 'latam'
  | 'french'
  | 'germanic'
  | 'dutch'
  | 'nordic'
  | 'anglo'
  | 'slavic'
  | 'balkan'
  | 'hungarian'
  | 'turkish'
  | 'greek'
  | 'arabic'
  | 'japanese'
  | 'korean';

export type PreferredFoot = 'R' | 'L' | 'B';

/** Raw club record, as it comes from a DataSource (files or generator). */
export interface ClubRecord {
  id: ClubId;
  name: string;
  shortName: string;
  countryId: CountryId;
  leagueId: LeagueId;
  city: string;
  /** 1–100. */
  reputation: number;
  stadiumCapacity: number;
  transferBudget: number; // EUR
  wageBudget: number; // EUR per year
  /** 1–20. */
  facilities: number;
  /** 1–20. */
  youthFacilities: number;
  /** File name inside crests/ (may be empty). */
  crest: string;
  rivals: ClubId[];
  colorPrimary: string; // "#rrggbb"
  colorSecondary: string;
  isTestData?: boolean;
}

/** Raw player record, as it comes from a DataSource. Only the "free source" fields. */
export interface PlayerRecord {
  id: PlayerId;
  firstName: string;
  lastName: string;
  /** Empty string = free agent. */
  clubId: ClubId;
  nationality: CountryId;
  birthDate: string; // YYYY-MM-DD
  position: string; // one of POSITIONS
  otherPositions: string[];
  ovr: number; // 1–99 input rating
  foot: PreferredFoot;
  heightCm: number;
}

export interface WorldMeta {
  /** Name shown to the user. */
  name: string;
  /** True when the world was produced by the fictional generator. */
  isTestData: boolean;
  /** Seed used for every derived/generated value. */
  seed: number;
  /** Reference date used to compute ages (YYYY-MM-DD), normally the season start. */
  referenceDate: string;
  source: string;
  createdAt: string;
}

/** What every DataSource returns. */
export interface RawWorld {
  meta: WorldMeta;
  countries: CountryConfig[];
  clubs: ClubRecord[];
  players: PlayerRecord[];
}
