// Typed messages between the UI and the simulation worker.

import type { DataIssue } from '../data/DataSource';
import type { ImportSummary } from '../data/attributesIO';
import type { SlotMeta } from '../persistence/db';

export interface WorldSummary {
  name: string;
  isTestData: boolean;
  seed: number;
  countries: number;
  leagues: number;
  clubs: number;
  players: number;
  freeAgents: number;
  overrideCells: number;
  buildMs: number;
}

export interface CountryRow {
  id: string;
  name: string;
  leagues: { id: string; name: string; tier: number; clubs: number }[];
}

export interface ClubRow {
  id: string;
  name: string;
  shortName: string;
  city: string;
  reputation: number;
  avgOvr: number;
  squadSize: number;
  colorPrimary: string;
  colorSecondary: string;
  crest: string;
  rivals: string[];
}

export interface PlayerRow {
  id: string;
  name: string;
  position: string;
  age: number;
  ovr: number;
  nationality: string;
}

export interface PlayerDetail extends PlayerRow {
  club: string;
  foot: string;
  heightCm: number;
  attributes: { key: string; label: string; group: string; value: number; manual: boolean }[];
  familiarity: { position: string; level: number }[];
}

export type Request =
  | { type: 'generateWorld'; seed?: number }
  | { type: 'importFiles'; files: Record<string, string> }
  | { type: 'summary' }
  | { type: 'countries' }
  | { type: 'leagueClubs'; leagueId: string }
  | { type: 'clubSquad'; clubId: string }
  | { type: 'playerDetail'; playerId: string }
  | { type: 'exportAttributes'; delimiter?: ',' | ';'; clubId?: string }
  | { type: 'importAttributes'; csv: string }
  | { type: 'listSlots' }
  | { type: 'saveSlot'; slotId: string; name: string }
  | { type: 'loadSlot'; slotId: string }
  | { type: 'deleteSlot'; slotId: string };

export interface ResponseMap {
  generateWorld: WorldSummary;
  importFiles: { summary: WorldSummary | null; issues: DataIssue[]; attributes?: ImportSummary };
  summary: WorldSummary | null;
  countries: CountryRow[];
  leagueClubs: ClubRow[];
  clubSquad: PlayerRow[];
  playerDetail: PlayerDetail | null;
  exportAttributes: string;
  importAttributes: ImportSummary;
  listSlots: SlotMeta[];
  saveSlot: { slot: SlotMeta; written: number; skipped: number; ms: number };
  loadSlot: WorldSummary | null;
  deleteSlot: true;
}

export type ResponseFor<R extends Request> = ResponseMap[R['type']];

export interface Envelope {
  id: number;
  req: Request;
}

export type Reply = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };
