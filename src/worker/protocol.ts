// Typed messages between the UI and the simulation worker.

import type { DataIssue } from '../data/DataSource';
import type { ImportSummary } from '../data/attributesIO';
import type { ConfederationCountRow, WeakestCandidate } from '../engine/world/confederations';
import type { ConfederationTransfer, SquadLevel } from '../engine/types';
import type { SlotMeta } from '../persistence/db';

export interface WorldSummary {
  name: string;
  isTestData: boolean;
  seed: number;
  confederations: number;
  divisions: number;
  countries: number;
  players: number;
  freeAgents: number;
  generatedPlayers: number;
  overrideCells: number;
  buildMs: number;
  transfers: ConfederationTransfer[];
  economyMissing: number;
}

export interface CountsReport {
  table: ConfederationCountRow[];
  ranking: Record<string, WeakestCandidate[]>;
  transfers: ConfederationTransfer[];
  total: number;
  /** True when the ranking uses the test world's invented population/reputation. */
  basedOnTestData: boolean;
}

export interface ConfederationRow {
  id: string;
  name: string;
  cup: string;
  divisions: { id: string; name: string; tier: number; teams: number }[];
}

export interface CountryRow {
  id: string;
  name: string;
  reputation: number;
  avgOvr: number;
  squadSize: number;
  homeGrown: number;
  populationGame: number | null;
  economyStatus: string;
  colorPrimary: string;
  colorSecondary: string;
  flag: string;
  rivals: string[];
  transferredFrom?: string;
}

export interface PlayerRow {
  id: string;
  name: string;
  position: string;
  age: number;
  ovr: number;
  nationality: string;
  squad: SquadLevel;
  valueEur: number;
}

export interface PlayerDetail extends PlayerRow {
  team: string;
  foot: string;
  heightCm: number;
  generated: boolean;
  attributes: { key: string; label: string; group: string; value: number; manual: boolean }[];
  familiarity: { position: string; level: number }[];
}

export type Request =
  | { type: 'generateWorld'; seed?: number }
  | { type: 'importFiles'; files: Record<string, string> }
  | { type: 'summary' }
  | { type: 'counts' }
  | { type: 'confederations' }
  | { type: 'divisionCountries'; divisionId: string }
  | { type: 'countrySquad'; countryId: string; level: SquadLevel }
  | { type: 'playerDetail'; playerId: string }
  | { type: 'exportAttributes'; delimiter?: ',' | ';'; countryId?: string }
  | { type: 'importAttributes'; csv: string }
  | { type: 'listSlots' }
  | { type: 'saveSlot'; slotId: string; name: string }
  | { type: 'loadSlot'; slotId: string }
  | { type: 'deleteSlot'; slotId: string };

export interface ResponseMap {
  generateWorld: WorldSummary;
  importFiles: { summary: WorldSummary | null; issues: DataIssue[]; attributes?: ImportSummary };
  summary: WorldSummary | null;
  counts: CountsReport | null;
  confederations: ConfederationRow[];
  divisionCountries: CountryRow[];
  countrySquad: PlayerRow[];
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
