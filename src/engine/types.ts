// Domain types shared by the engine, data layer and UI.
// Premise (v2.4): only national teams exist. Each of the 213 countries is a "club" (country-club),
// and each confederation works like a "country" with its own divisions and cup.
// The engine is pure: no DOM, no I/O. Everything here must be structured-cloneable.

export type ConfederationId = 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';
export type CountryId = string; // e.g. "POR"
export type DivisionId = string; // e.g. "UEFA1"
export type PlayerId = string;

export type NameRegion =
  | 'iberian' | 'catalan' | 'basque' | 'lusophone' | 'latam' | 'french' | 'italian' | 'germanic'
  | 'dutch' | 'nordic' | 'baltic' | 'anglo' | 'slavic' | 'balkan' | 'romanian' | 'hungarian'
  | 'greek' | 'turkish' | 'caucasian' | 'hebrew' | 'arabic' | 'persian' | 'centralasian'
  | 'southasian' | 'chinese' | 'japanese' | 'korean' | 'seasian' | 'pacific' | 'caribbean'
  | 'westafrican' | 'eastafrican' | 'southernafrican';

/** A transfer window, as month-day strings "MM-DD" (inclusive). */
export interface TransferWindow {
  start: string;
  end: string;
}

export interface DivisionConfig {
  id: DivisionId;
  confederation: ConfederationId;
  tier: number; // 1 = top division
  name: string;
  teams: number;
  format: { kind: 'double-round-robin' };
  /** Teams promoted to the tier above (0 for tier 1). */
  promotionSlots: number;
  /** Teams relegated to the tier below (0 for the lowest tier). */
  relegationSlots: number;
  /** Share of the confederation TV pool paid to this division (shares of a confederation sum to 1). */
  tvShare: number;
  /** Tuning: mean OVR of a typical first XI in this division (fictional generator). */
  quality: number;
  /** Tuning: OVR difference between the strongest and the weakest team of the division. */
  qualitySpread: number;
}

export interface CupConfig {
  id: string;
  name: string;
  /** 1 = single match, 2 = two legs. */
  legs: 1 | 2;
}

export interface ConfederationConfig {
  id: ConfederationId;
  name: string;
  divisions: DivisionConfig[];
  cup: CupConfig;
  /** TV pool per season (EUR). */
  tvPool: number;
  /** Where the weakest surplus countries go when there are more countries than slots. */
  overflowTo?: ConfederationId;
}

export type DataStatus = 'real' | 'test' | 'missing';

/** A country-club, as it comes from a DataSource. */
export interface CountryRecord {
  id: CountryId;
  name: string;
  /** Original (real) confederation. Never changes; keeps the "nationality" identity. */
  confederation: ConfederationId;
  /** Confederation used in the game (differs only for transferred countries). */
  gameConfederation: ConfederationId;
  /** Initial division tier inside gameConfederation (0 = not assigned yet). */
  division: number;
  /** Real population (whole country). The game uses 10% of it (see economy config). */
  population: number | null;
  /** Real GDP in USD. */
  gdpUsd: number | null;
  /** Where population/GDP come from: your file ("real"), the test generator ("test") or nowhere ("missing"). */
  economyStatus: DataStatus;
  /** 1–100. */
  reputation: number;
  /** Football culture 1–20 (stadium demand, youth). */
  footballCulture: number;
  /** Youth production strength 1–20. */
  youthStrength: number;
  /** File name inside public/assets/flags/ (may be empty). */
  flag: string;
  colorPrimary: string;
  colorSecondary: string;
  rivals: CountryId[];
  isTestData?: boolean;
}

export type PreferredFoot = 'R' | 'L' | 'B';
export const SQUAD_LEVELS = ['senior', 'u23', 'u19', 'u17'] as const;
export type SquadLevel = (typeof SQUAD_LEVELS)[number];

/** Player record, as it comes from a DataSource. */
export interface PlayerRecord {
  id: PlayerId;
  firstName: string;
  lastName: string;
  /** Country where the player was formed (nationality). Never changes. */
  nationality: CountryId;
  /** Country-club where the player plays. Empty = free agent. */
  team: CountryId;
  squad: SquadLevel;
  birthDate: string; // YYYY-MM-DD
  position: string; // one of POSITIONS
  otherPositions: string[];
  ovr: number; // 1–99
  /** Market value in EUR, if the source has it. */
  valueEur: number | null;
  foot: PreferredFoot;
  heightCm: number;
  /** True for players created by the generator (test world or squad fill-in). */
  generated?: boolean;
}

export interface ConfederationTransfer {
  country: CountryId;
  from: ConfederationId;
  to: ConfederationId;
  /** Confirmed by you in config (true), or only a computed candidate (false). */
  confirmed: boolean;
}

export interface WorldMeta {
  name: string;
  /** True when anything in the world was produced by the fictional generator. */
  isTestData: boolean;
  seed: number;
  /** Reference date used to compute ages (YYYY-MM-DD), normally the season start. */
  referenceDate: string;
  source: string;
  createdAt: string;
  transfers: ConfederationTransfer[];
}

/** What every DataSource returns. */
export interface RawWorld {
  meta: WorldMeta;
  confederations: ConfederationConfig[];
  countries: CountryRecord[];
  players: PlayerRecord[];
}

/** A problem found while loading/assembling the world (shown to you with file/line/column). */
export interface WorldIssue {
  level: 'error' | 'warning';
  file: string;
  line?: number;
  column?: string;
  message: string;
}
