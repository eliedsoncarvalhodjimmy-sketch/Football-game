// Turn countries + players (from files or the test generator) into a complete RawWorld:
// confederation redistribution, initial divisions, squad fill-in and the home-grown check.

import { CONFIRMED_TRANSFERS, WEAKEST_CRITERION } from '../../config/confederations.config';
import { SQUADS } from '../../config/squads.config';
import type { ConfederationConfig, ConfederationId, CountryRecord, PlayerRecord, RawWorld, WorldIssue, WorldMeta } from '../types';
import { assignConfederations, assignDivisions, type AssignmentResult } from './confederations';
import { fillSquads, homeGrownViolations } from './squads';

export interface AssembleInput {
  meta: Omit<WorldMeta, 'transfers'>;
  confederations: ConfederationConfig[];
  countries: CountryRecord[];
  players: PlayerRecord[];
  /** Complete missing squad places with generated players. */
  fill: boolean;
  fillIdPrefix: string;
  freeAgents: number;
  confirmedTransfers?: Record<string, ConfederationId>;
}

export interface AssembleResult {
  raw: RawWorld;
  assignment: AssignmentResult;
  issues: WorldIssue[];
}

export function assembleWorld(input: AssembleInput): AssembleResult {
  const { countries, confederations } = input;
  const assignment = assignConfederations(countries, confederations, input.confirmedTransfers ?? CONFIRMED_TRANSFERS, WEAKEST_CRITERION);
  const issues: WorldIssue[] = [...assignment.issues, ...assignDivisions(countries, confederations)];
  let players = input.players;
  if (input.fill) {
    const extra = fillSquads(countries, confederations, players, {
      seed: input.meta.seed, referenceDate: input.meta.referenceDate, idPrefix: input.fillIdPrefix, freeAgents: input.freeAgents,
    });
    players = [...players, ...extra];
  }
  for (const v of homeGrownViolations(countries, players)) {
    issues.push({ level: 'warning', file: 'players.csv', message: `${v.country}: só ${v.homeGrown} formados no país no plantel principal (mínimo ${SQUADS.minHomeGrown})` });
  }
  return {
    raw: { meta: { ...input.meta, transfers: assignment.transfers }, confederations, countries, players },
    assignment,
    issues,
  };
}
