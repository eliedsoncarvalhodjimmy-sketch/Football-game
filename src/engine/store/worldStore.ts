// In-memory world: confederations, the 213 country-clubs and the compact player store.

import { HIDDEN_INDEX, N_HIDDEN, N_POSITIONS, N_VISIBLE, POSITIONS, POSITION_INDEX, VISIBLE_INDEX } from '../../config/attributes.config';
import { generateAttributes, type AttributeGenInput, type AttributeGenOutput } from '../generator/attributeGenerator';
import { ageAt } from '../ids';
import { hashString } from '../rng';
import {
  SQUAD_LEVELS, type ConfederationConfig, type CountryRecord, type DivisionConfig, type PlayerRecord,
  type RawWorld, type SquadLevel, type WorldMeta,
} from '../types';
import { type AttributeOverrides } from './overrides';
import { FOOT_CODES, PlayerStore, dateToInt, intToDate, type PlayerStoreSnapshot } from './playerStore';

/** Context assumed for free agents when generating attributes. */
const FREE_AGENT_REPUTATION = 30;
const FREE_AGENT_QUALITY = 60;

export class WorldStore {
  meta: WorldMeta;
  confederations: ConfederationConfig[];
  divisions: DivisionConfig[];
  countries: CountryRecord[];
  countryIndexById = new Map<string, number>();
  players: PlayerStore;
  playerIndexById = new Map<string, number>();
  overrides: AttributeOverrides = new Map();
  /** Secondary positions as given by the data source (kept to regenerate familiarity). */
  otherPositions = new Map<number, string[]>();
  private squadIndex: number[][] | null = null;

  constructor(meta: WorldMeta, confederations: ConfederationConfig[], countries: CountryRecord[], players: PlayerStore) {
    this.meta = meta;
    this.confederations = confederations;
    this.divisions = confederations.flatMap((c) => c.divisions);
    this.countries = countries;
    countries.forEach((c, i) => this.countryIndexById.set(c.id, i));
    this.players = players;
    for (let i = 0; i < players.count; i++) this.playerIndexById.set(players.ids[i], i);
  }

  divisionOf(country: CountryRecord): DivisionConfig | undefined {
    return this.divisions.find((d) => d.confederation === country.gameConfederation && d.tier === country.division);
  }

  countriesInDivision(divisionId: string): CountryRecord[] {
    const d = this.divisions.find((x) => x.id === divisionId);
    if (!d) return [];
    return this.countries.filter((c) => c.gameConfederation === d.confederation && c.division === d.tier);
  }

  /** Player indices playing for a country (optionally one squad level). Lazy index; invalidate after moves. */
  squad(countryIndex: number, level?: SquadLevel): number[] {
    if (!this.squadIndex) {
      const idx: number[][] = this.countries.map(() => []);
      const ti = this.players.teamIndex;
      for (let i = 0; i < this.players.count; i++) if (ti[i] >= 0) idx[ti[i]].push(i);
      this.squadIndex = idx;
    }
    const all = this.squadIndex[countryIndex] ?? [];
    if (level === undefined) return all;
    const l = SQUAD_LEVELS.indexOf(level);
    return all.filter((i) => this.players.squadLevel[i] === l);
  }

  freeAgents(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.players.count; i++) if (this.players.teamIndex[i] < 0) out.push(i);
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
    const ti = p.teamIndex[i];
    const team = ti >= 0 ? this.countries[ti] : undefined;
    const division = team ? this.divisionOf(team) : undefined;
    return {
      seed: p.seed[i],
      ovr: p.ovrInput[i],
      position: POSITIONS[p.position[i]],
      otherPositions: this.otherPositions.get(i),
      age: this.ageOf(i),
      leagueQuality: division?.quality ?? FREE_AGENT_QUALITY,
      teamReputation: team?.reputation ?? FREE_AGENT_REPUTATION,
      valueEur: p.valueEur[i] || null,
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
    const ti = p.teamIndex[i];
    return {
      id: p.ids[i],
      firstName: p.firstNames[i],
      lastName: p.lastNames[i],
      nationality: p.nationalityCodes[p.nationality[i]],
      team: ti >= 0 ? this.countries[ti].id : '',
      squad: SQUAD_LEVELS[p.squadLevel[i]],
      birthDate: intToDate(p.birthDate[i]),
      position: POSITIONS[p.position[i]],
      otherPositions: this.otherPositions.get(i) ?? [],
      ovr: p.ovrInput[i],
      valueEur: p.valueEur[i] || null,
      foot: FOOT_CODES[p.foot[i]],
      heightCm: p.heightCm[i],
      generated: p.generated[i] === 1,
    };
  }

  toSnapshot(): WorldSnapshot {
    return {
      version: 2,
      meta: this.meta,
      confederations: this.confederations,
      countries: this.countries,
      players: this.players.toSnapshot(),
      otherPositions: [...this.otherPositions.entries()],
      overrides: [...this.overrides.entries()].map(([k, v]) => [k, [...v.entries()]]),
    };
  }

  static fromSnapshot(s: WorldSnapshot): WorldStore {
    const w = new WorldStore(s.meta, s.confederations, s.countries, PlayerStore.fromSnapshot(s.players));
    w.otherPositions = new Map(s.otherPositions);
    w.overrides = new Map(s.overrides.map(([k, v]) => [k, new Map(v)]));
    return w;
  }
}

export interface WorldSnapshot {
  version: 2;
  meta: WorldMeta;
  confederations: ConfederationConfig[];
  countries: CountryRecord[];
  players: PlayerStoreSnapshot;
  otherPositions: [number, string[]][];
  overrides: [string, [string, number][]][];
}

/** Build the in-memory world from raw records and run the deterministic attribute generator. */
export function buildWorld(raw: RawWorld, overrides?: AttributeOverrides): WorldStore {
  const store = new PlayerStore(raw.players.length);
  const countryIndexById = new Map(raw.countries.map((c, i) => [c.id, i]));
  const otherPositions = new Map<number, string[]>();
  for (const r of raw.players) {
    const i = store.add(r.id, r.firstName, r.lastName);
    store.teamIndex[i] = r.team ? (countryIndexById.get(r.team) ?? -1) : -1;
    store.squadLevel[i] = Math.max(0, SQUAD_LEVELS.indexOf(r.squad));
    store.valueEur[i] = r.valueEur ?? 0;
    store.generated[i] = r.generated ? 1 : 0;
    store.nationality[i] = store.nationalityIndex(r.nationality);
    store.birthDate[i] = dateToInt(r.birthDate);
    store.position[i] = POSITION_INDEX[r.position];
    store.foot[i] = Math.max(0, FOOT_CODES.indexOf(r.foot));
    store.heightCm[i] = r.heightCm;
    store.ovrInput[i] = r.ovr;
    store.seed[i] = hashString(r.id, raw.meta.seed);
    if (r.otherPositions.length) otherPositions.set(i, r.otherPositions.slice());
  }
  const world = new WorldStore(raw.meta, raw.confederations, raw.countries, store);
  world.otherPositions = otherPositions;
  if (overrides) world.overrides = overrides;
  world.regenerateAll();
  return world;
}
