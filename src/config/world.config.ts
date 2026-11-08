// World configuration: 29 countries, 64 leagues.
// All numbers here are TUNING values for the game / fictional generator, not real data.
// Club counts are defaults; when you load your own files the real number of clubs comes from them.

import type { CalendarKind, CountryConfig, LeagueConfig, NameRegion, TransferWindow } from '../engine/types';

/** Default transfer windows by calendar kind ("MM-DD", inclusive). */
export const DEFAULT_WINDOWS: Record<CalendarKind, TransferWindow[]> = {
  'aug-may': [
    { start: '07-01', end: '08-31' },
    { start: '01-02', end: '01-31' },
  ],
  'calendar-year': [
    { start: '01-10', end: '03-10' },
    { start: '07-01', end: '07-31' },
  ],
};

/** Compact per-tier description used to build LeagueConfig objects. */
interface TierSpec {
  name: string;
  clubs: number;
  /** clubs relegated to the next tier (ignored on the lowest tier) */
  down?: number;
  tv: number; // EUR million per season
  quality: number;
  spread: number;
}

interface CountrySpec {
  id: string;
  name: string;
  region: NameRegion;
  calendar: CalendarKind;
  promotionRelegation?: boolean; // default true
  youth: number; // 1–20
  tiers: TierSpec[];
}

const M = 1_000_000;

const COUNTRY_SPECS: CountrySpec[] = [
  // --- 2 divisions ---
  { id: 'ESP', name: 'Espanha', region: 'iberian', calendar: 'aug-may', youth: 18, tiers: [
    { name: 'Primera División', clubs: 20, down: 3, tv: 1500, quality: 77, spread: 14 },
    { name: 'Segunda División', clubs: 22, tv: 90, quality: 66, spread: 8 } ] },
  { id: 'BEL', name: 'Bélgica', region: 'dutch', calendar: 'aug-may', youth: 15, tiers: [
    { name: 'Eerste Klasse', clubs: 16, down: 2, tv: 90, quality: 68, spread: 10 },
    { name: 'Tweede Klasse', clubs: 16, tv: 8, quality: 58, spread: 7 } ] },
  { id: 'KSA', name: 'Arábia Saudita', region: 'arabic', calendar: 'aug-may', youth: 9, tiers: [
    { name: 'Dawri Al-Awal', clubs: 18, down: 3, tv: 150, quality: 68, spread: 14 },
    { name: 'Dawri Al-Thani', clubs: 18, tv: 10, quality: 56, spread: 7 } ] },
  { id: 'DEN', name: 'Dinamarca', region: 'nordic', calendar: 'aug-may', youth: 13, tiers: [
    { name: 'Første Liga', clubs: 12, down: 2, tv: 50, quality: 65, spread: 9 },
    { name: 'Anden Liga', clubs: 12, tv: 5, quality: 56, spread: 6 } ] },
  { id: 'AUT', name: 'Áustria', region: 'germanic', calendar: 'aug-may', youth: 13, tiers: [
    { name: 'Erste Liga', clubs: 12, down: 1, tv: 45, quality: 65, spread: 10 },
    { name: 'Zweite Liga', clubs: 16, tv: 4, quality: 55, spread: 7 } ] },
  { id: 'USA', name: 'EUA', region: 'anglo', calendar: 'calendar-year', promotionRelegation: false, youth: 11, tiers: [
    { name: 'National League', clubs: 29, down: 0, tv: 300, quality: 67, spread: 9 },
    { name: 'Second League', clubs: 24, tv: 6, quality: 57, spread: 6 } ] },
  { id: 'CZE', name: 'República Checa', region: 'slavic', calendar: 'aug-may', youth: 12, tiers: [
    { name: 'První Liga', clubs: 16, down: 2, tv: 30, quality: 63, spread: 10 },
    { name: 'Druhá Liga', clubs: 16, tv: 3, quality: 54, spread: 6 } ] },
  { id: 'NOR', name: 'Noruega', region: 'nordic', calendar: 'calendar-year', youth: 12, tiers: [
    { name: 'Første Divisjon', clubs: 16, down: 2, tv: 40, quality: 63, spread: 9 },
    { name: 'Andre Divisjon', clubs: 16, tv: 4, quality: 54, spread: 6 } ] },
  { id: 'SCO', name: 'Escócia', region: 'anglo', calendar: 'aug-may', youth: 11, tiers: [
    { name: 'Premier Division', clubs: 12, down: 1, tv: 35, quality: 63, spread: 14 },
    { name: 'First Division', clubs: 10, tv: 3, quality: 54, spread: 6 } ] },
  { id: 'CRO', name: 'Croácia', region: 'balkan', calendar: 'aug-may', youth: 16, tiers: [
    { name: 'Prva Liga', clubs: 10, down: 1, tv: 15, quality: 63, spread: 11 },
    { name: 'Druga Liga', clubs: 12, tv: 1.5, quality: 53, spread: 6 } ] },
  { id: 'ARG', name: 'Argentina', region: 'latam', calendar: 'calendar-year', youth: 19, tiers: [
    { name: 'Primera División', clubs: 28, down: 2, tv: 120, quality: 69, spread: 10 },
    { name: 'Primera Nacional', clubs: 36, tv: 8, quality: 59, spread: 7 } ] },
  { id: 'JPN', name: 'Japão', region: 'japanese', calendar: 'calendar-year', youth: 13, tiers: [
    { name: 'Ichibu League', clubs: 20, down: 3, tv: 140, quality: 66, spread: 8 },
    { name: 'Nibu League', clubs: 20, tv: 12, quality: 58, spread: 6 } ] },
  { id: 'KOR', name: 'Coreia do Sul', region: 'korean', calendar: 'calendar-year', youth: 12, tiers: [
    { name: 'Il-bu League', clubs: 12, down: 1, tv: 30, quality: 64, spread: 8 },
    { name: 'I-bu League', clubs: 13, tv: 3, quality: 56, spread: 6 } ] },
  { id: 'ECU', name: 'Equador', region: 'latam', calendar: 'calendar-year', youth: 13, tiers: [
    { name: 'Serie A', clubs: 16, down: 2, tv: 25, quality: 63, spread: 10 },
    { name: 'Serie B', clubs: 10, tv: 2, quality: 54, spread: 6 } ] },
  { id: 'URU', name: 'Uruguai', region: 'latam', calendar: 'calendar-year', youth: 16, tiers: [
    { name: 'Primera División', clubs: 16, down: 2, tv: 15, quality: 63, spread: 11 },
    { name: 'Segunda División', clubs: 14, tv: 1, quality: 54, spread: 6 } ] },
  { id: 'COL', name: 'Colômbia', region: 'latam', calendar: 'calendar-year', youth: 15, tiers: [
    { name: 'Primera A', clubs: 20, down: 2, tv: 40, quality: 64, spread: 9 },
    { name: 'Primera B', clubs: 16, tv: 3, quality: 55, spread: 6 } ] },
  { id: 'NED', name: 'Países Baixos', region: 'dutch', calendar: 'aug-may', youth: 17, tiers: [
    { name: 'Eerste Divisie', clubs: 18, down: 2, tv: 110, quality: 70, spread: 13 },
    { name: 'Tweede Divisie', clubs: 20, tv: 10, quality: 59, spread: 7 } ] },
  { id: 'HUN', name: 'Hungria', region: 'hungarian', calendar: 'aug-may', youth: 10, tiers: [
    { name: 'Első Osztály', clubs: 12, down: 2, tv: 20, quality: 61, spread: 10 },
    { name: 'Második Osztály', clubs: 16, tv: 2, quality: 52, spread: 6 } ] },
  { id: 'UKR', name: 'Ucrânia', region: 'slavic', calendar: 'aug-may', youth: 14, tiers: [
    { name: 'Persha Liha', clubs: 16, down: 2, tv: 20, quality: 63, spread: 12 },
    { name: 'Druha Liha', clubs: 18, tv: 2, quality: 54, spread: 6 } ] },
  { id: 'SUI', name: 'Suíça', region: 'germanic', calendar: 'aug-may', youth: 14, tiers: [
    { name: 'Super Liga', clubs: 12, down: 1, tv: 40, quality: 65, spread: 9 },
    { name: 'Challenge Liga', clubs: 10, tv: 3, quality: 56, spread: 6 } ] },
  { id: 'TUR', name: 'Turquia', region: 'turkish', calendar: 'aug-may', youth: 13, tiers: [
    { name: 'Birinci Lig', clubs: 18, down: 3, tv: 200, quality: 69, spread: 13 },
    { name: 'İkinci Lig', clubs: 20, tv: 15, quality: 59, spread: 7 } ] },
  { id: 'GRE', name: 'Grécia', region: 'greek', calendar: 'aug-may', youth: 11, tiers: [
    { name: 'Proti Kategoria', clubs: 14, down: 2, tv: 40, quality: 65, spread: 12 },
    { name: 'Defteri Kategoria', clubs: 16, tv: 3, quality: 55, spread: 6 } ] },
  { id: 'POL', name: 'Polónia', region: 'slavic', calendar: 'aug-may', youth: 12, tiers: [
    { name: 'Pierwsza Liga', clubs: 18, down: 3, tv: 60, quality: 64, spread: 9 },
    { name: 'Druga Liga', clubs: 18, tv: 6, quality: 56, spread: 6 } ] },
  { id: 'SWE', name: 'Suécia', region: 'nordic', calendar: 'calendar-year', youth: 13, tiers: [
    { name: 'Första Ligan', clubs: 16, down: 2, tv: 40, quality: 63, spread: 9 },
    { name: 'Andra Ligan', clubs: 16, tv: 4, quality: 55, spread: 6 } ] },
  // --- 3 divisions ---
  { id: 'GER', name: 'Alemanha', region: 'germanic', calendar: 'aug-may', youth: 18, tiers: [
    { name: 'Erste Liga', clubs: 18, down: 2, tv: 1300, quality: 76, spread: 13 },
    { name: 'Zweite Liga', clubs: 18, down: 2, tv: 200, quality: 67, spread: 8 },
    { name: 'Dritte Liga', clubs: 20, tv: 30, quality: 60, spread: 7 } ] },
  { id: 'BRA', name: 'Brasil', region: 'lusophone', calendar: 'calendar-year', youth: 20, tiers: [
    { name: 'Série A', clubs: 20, down: 4, tv: 500, quality: 71, spread: 10 },
    { name: 'Série B', clubs: 20, down: 4, tv: 40, quality: 62, spread: 7 },
    { name: 'Série C', clubs: 20, tv: 5, quality: 56, spread: 6 } ] },
  { id: 'POR', name: 'Portugal', region: 'lusophone', calendar: 'aug-may', youth: 18, tiers: [
    { name: 'Primeira Divisão', clubs: 18, down: 2, tv: 200, quality: 70, spread: 15 },
    { name: 'Segunda Divisão', clubs: 18, down: 2, tv: 15, quality: 60, spread: 7 },
    { name: 'Terceira Divisão', clubs: 20, tv: 2, quality: 53, spread: 6 } ] },
  { id: 'FRA', name: 'França', region: 'french', calendar: 'aug-may', youth: 20, tiers: [
    { name: 'Première Division', clubs: 18, down: 2, tv: 600, quality: 74, spread: 13 },
    { name: 'Deuxième Division', clubs: 18, down: 2, tv: 60, quality: 65, spread: 8 },
    { name: 'Troisième Division', clubs: 18, tv: 8, quality: 58, spread: 7 } ] },
  // --- 4 divisions ---
  { id: 'ENG', name: 'Inglaterra', region: 'anglo', calendar: 'aug-may', youth: 17, tiers: [
    { name: 'Premier Division', clubs: 20, down: 3, tv: 3200, quality: 79, spread: 12 },
    { name: 'Championship Division', clubs: 24, down: 3, tv: 250, quality: 69, spread: 8 },
    { name: 'Division One', clubs: 24, down: 4, tv: 30, quality: 63, spread: 7 },
    { name: 'Division Two', clubs: 24, tv: 15, quality: 58, spread: 6 } ] },
];

function buildCountry(spec: CountrySpec): CountryConfig {
  const promo = spec.promotionRelegation ?? true;
  const leagues: LeagueConfig[] = spec.tiers.map((t, i) => {
    const isLast = i === spec.tiers.length - 1;
    const above = i > 0 ? spec.tiers[i - 1] : undefined;
    const down = promo && !isLast ? (t.down ?? 2) : 0;
    const up = promo && above ? (above.down ?? 2) : 0;
    return {
      id: `${spec.id}${i + 1}`,
      countryId: spec.id,
      name: t.name,
      tier: i + 1,
      clubs: t.clubs,
      format: { kind: 'double-round-robin' },
      calendar: spec.calendar,
      windows: DEFAULT_WINDOWS[spec.calendar].map((w) => ({ ...w })),
      promotionSlots: up,
      relegationSlots: down,
      tvRevenuePool: t.tv * M,
      quality: t.quality,
      qualitySpread: t.spread,
    };
  });
  return {
    id: spec.id,
    name: spec.name,
    nameRegion: spec.region,
    promotionRelegation: promo,
    youthStrength: spec.youth,
    leagues,
  };
}

/** The default world configuration (deep-cloned on every call so callers can mutate freely). */
export function defaultCountries(): CountryConfig[] {
  return COUNTRY_SPECS.map(buildCountry);
}

export const EXPECTED_COUNTRIES = 29;
export const EXPECTED_LEAGUES = 64;
