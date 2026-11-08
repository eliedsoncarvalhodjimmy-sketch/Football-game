// In-memory world: configuration, clubs and the compact player store.

import { HIDDEN_INDEX, N_HIDDEN, N_POSITIONS, N_VISIBLE, POSITIONS, POSITION_INDEX, VISIBLE_INDEX } from '../../config/attributes.config';
import { generateAttributes, type AttributeGenInput, type AttributeGenOutput } from '../generator/attributeGenerator';
import { ageAt } from '../ids';
import { hashString } from '../rng';
import type { ClubRecord, CountryConfig, LeagueConfig, PlayerRecord, RawWorld, WorldMeta } from '../types';
import { type AttributeOverrides } from './overrides';
import { FOOT_CODES, PlayerStore, dateToInt, intToDate, type PlayerStoreSnapshot } from './playerStore';

/** Reputation assumed for free agents when generating attributes. */
const FREE_AGENT_REPUTATION = 30;
const FREE_AGENT_LEAGUE_QUALITY = 60;

export class WorldStore {
  meta: WorldMeta;
  countries: CountryConfig[];
  leagues: LeagueConfig[];
  leagueIndexById = new Map<string, number>();
  clubs: ClubRecord[];
  clubIndexById = new Map<string, number>();
  players: PlayerStore;
  playerIndexById = new Map<string, number>();
  overrides: AttributeOverrides = new Map();
  /** Secondary positions as given by the data source (kept to regenerate familiarity). */
  otherPositions = new Map<number, string[]>();
  private squadIndex: number[][] | null = null;

  constructor(meta: WorldMeta, countries: CountryConfig[], clubs: ClubRecord[], players: PlayerStore) {
    this.meta = meta;
    this.countries = countries;
    this.leagues = countries.flatMap((c) => c.leagues);
    this.leagues.forEach((l, i) => this.leagueIndexById.set(l.id, i));
    this.clubs = clubs;
    clubs.forEach((c, i) => this.clubIndexById.set(c.id, i));
    this.players = players;
    for (let i = 0; i < players.count; i++) this.playerIndexById.set(players.ids[i], i);
  }

  league(id: string): LeagueConfig | undefined {
    const i = this.leagueIndexById.get(id);
    return i === undefined ? undefined : this.leagues[i];
  }

  clubsInLeague(leagueId: string): ClubRecord[] {
    return this.clubs.filter((c) => c.leagueId === leagueId);
  }

  /** Player indices of a club's senior squad (lazy index, rebuilt after transfers via invalidate()). */
  squad(clubIndex: number): number[] {
    if (!this.squadIndex) {
      const idx: number[][] = this.clubs.map(() => []);
      const ci = this.players.clubIndex;
      for (let i = 0; i < this.players.count; i++) if (ci[i] >= 0) idx[ci[i]].push(i);
      this.squadIndex = idx;
    }
    return this.squadIndex[clubIndex] ?? [];
  }

  freeAgents(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.players.count; i++) if (this.players.clubIndex[i] < 0) out.push(i);
    return out;
  }

  invalidateIndexes(): void {
    this.squadIndex = null;
  }

  ageOf(i: number): number {
    return ageAt(intToDate(this.players.birthDate[i]), this.meta.referenceDate);
  }

  /** Inputs of the deterministic generator for one player. */
  genInput(i: number): AttributeGenInput {
    const p = this.players;
    const ci = p.clubIndex[i];
    const club = ci >= 0 ? this.clubs[ci] : undefined;
    const league = club ? this.league(club.leagueId) : undefined;
    return {
      seed: p.seed[i],
      ovr: p.ovrInput[i],
      position: POSITIONS[p.position[i]],
      otherPositions: this.otherPositions.get(i),
      age: this.ageOf(i),
      leagueQuality: league?.quality ?? FREE_AGENT_LEAGUE_QUALITY,
      clubReputation: club?.reputation ?? FREE_AGENT_REPUTATION,
    };
  }

  /** What the generator produces for this player, ignoring hand-edited overrides. */
  generated(i: number): AttributeGenOutput {
    return generateAttributes(this.genInput(i));
  }

  /** Re-run the deterministic generator for one player (in place), then apply hand-edited overrides. */
  regeneratePlayer(i: number): void {
    const p = this.players;
    const out: AttributeGenOutput = {
      visible: p.attrs.subarray(i * N_VISIBLE, (i + 1) * N_VISIBLE),
      hidden: p.hidden.subarray(i * N_HIDDEN, (i + 1) * N_HIDDEN),
      familiarity: p.familiarity.subarray(i * N_POSITIONS, (i + 1) * N_POSITIONS),
      potential: 0,
    };
    generateAttributes(this.genInput(i), out);
    p.potential[i] = out.potential;
    this.applyOverrides(i);
  }

  applyOverrides(i: number): void {
    const cols = this.overrides.get(this.players.ids[i]);
    if (!cols) return;
    const p = this.players;
    for (const [col, val] of cols) {
      if (col === 'potential') p.potential[i] = val;
      else if (col in VISIBLE_INDEX) p.attrs[i * N_VISIBLE + VISIBLE_INDEX[col]] = val;
      else if (col in HIDDEN_INDEX) p.hidden[i * N_HIDDEN + HIDDEN_INDEX[col]] = val;
    }
  }

  regenerateAll(): void {
    for (let i = 0; i < this.players.count; i++) this.regeneratePlayer(i);
  }

  /** Convert a player back to a PlayerRecord (used by exports). */
  playerRecord(i: number): PlayerRecord {
    const p = this.players;
    const ci = p.clubIndex[i];
    return {
      id: p.ids[i],
      firstName: p.firstNames[i],
      lastName: p.lastNames[i],
      clubId: ci >= 0 ? this.clubs[ci].id : '',
      nationality: p.nationalityCodes[p.nationality[i]],
      birthDate: intToDate(p.birthDate[i]),
      position: POSITIONS[p.position[i]],
      otherPositions: this.otherPositions.get(i) ?? [],
      ovr: p.ovrInput[i],
      foot: FOOT_CODES[p.foot[i]],
      heightCm: p.heightCm[i],
    };
  }

  toSnapshot(): WorldSnapshot {
    return {
      version: 1,
      meta: this.meta,
      countries: this.countries,
      clubs: this.clubs,
      players: this.players.toSnapshot(),
      otherPositions: [...this.otherPositions.entries()],
      overrides: [...this.overrides.entries()].map(([k, v]) => [k, [...v.entries()]]),
    };
  }

  static fromSnapshot(s: WorldSnapshot): WorldStore {
    const w = new WorldStore(s.meta, s.countries, s.clubs, PlayerStore.fromSnapshot(s.players));
    w.otherPositions = new Map(s.otherPositions);
    w.overrides = new Map(s.overrides.map(([k, v]) => [k, new Map(v)]));
    return w;
  }
}

export interface WorldSnapshot {
  version: 1;
  meta: WorldMeta;
  countries: CountryConfig[];
  clubs: ClubRecord[];
  players: PlayerStoreSnapshot;
  otherPositions: [number, string[]][];
  overrides: [string, [string, number][]][];
}

/** Build the in-memory world from raw records and run the deterministic attribute generator. */
export function buildWorld(raw: RawWorld, overrides?: AttributeOverrides): WorldStore {
  const store = new PlayerStore(raw.players.length);
  const clubIndexById = new Map(raw.clubs.map((c, i) => [c.id, i]));
  const otherPositions = new Map<number, string[]>();
  for (const r of raw.players) {
    const i = store.add(r.id, r.firstName, r.lastName);
    store.clubIndex[i] = r.clubId ? (clubIndexById.get(r.clubId) ?? -1) : -1;
    store.nationality[i] = store.nationalityIndex(r.nationality);
    store.birthDate[i] = dateToInt(r.birthDate);
    store.position[i] = POSITION_INDEX[r.position];
    store.foot[i] = Math.max(0, FOOT_CODES.indexOf(r.foot));
    store.heightCm[i] = r.heightCm;
    store.ovrInput[i] = r.ovr;
    store.seed[i] = hashString(r.id, raw.meta.seed);
    if (r.otherPositions.length) otherPositions.set(i, r.otherPositions.slice());
  }
  const world = new WorldStore(raw.meta, raw.countries, raw.clubs, store);
  world.otherPositions = otherPositions;
  if (overrides) world.overrides = overrides;
  world.regenerateAll();
  return world;
}
