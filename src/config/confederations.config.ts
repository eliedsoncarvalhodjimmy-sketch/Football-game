// Confederations = the game's "countries": divisions, cups, TV pools and overflow rules.
// Division sizes and overflow destinations are your decisions (prompt v2.4, §4.1).
// quality / qualitySpread / tvPool / tvShare are TUNING values, not real data.

import type { ConfederationConfig, ConfederationId, DivisionConfig } from '../engine/types';

const M = 1_000_000;

interface DivSpec { name: string; teams: number; quality: number; spread: number; tvShare: number }
interface ConfSpec {
  id: ConfederationId;
  name: string;
  cup: { name: string; legs: 1 | 2 };
  tvPool: number;
  overflowTo?: ConfederationId;
  /** Teams moving between consecutive tiers (index 0 = between tier 1 and 2). */
  movement: number[];
  divisions: DivSpec[];
}

const SPECS: ConfSpec[] = [
  { id: 'UEFA', name: 'UEFA', cup: { name: 'Copa UEFA', legs: 1 }, tvPool: 3000 * M, overflowTo: 'AFC', movement: [2, 3],
    divisions: [
      { name: 'Liga UEFA', teams: 16, quality: 80, spread: 12, tvShare: 0.7 },
      { name: '2.ª Liga UEFA', teams: 20, quality: 71, spread: 8, tvShare: 0.2 },
      { name: '3.ª Liga UEFA', teams: 20, quality: 62, spread: 10, tvShare: 0.1 },
    ] },
  { id: 'CAF', name: 'CAF', cup: { name: 'Copa CAF', legs: 1 }, tvPool: 300 * M, movement: [2, 3],
    divisions: [
      { name: 'Liga CAF', teams: 16, quality: 73, spread: 9, tvShare: 0.7 },
      { name: '2.ª Liga CAF', teams: 18, quality: 65, spread: 6, tvShare: 0.2 },
      { name: '3.ª Liga CAF', teams: 20, quality: 57, spread: 8, tvShare: 0.1 },
    ] },
  { id: 'AFC', name: 'AFC', cup: { name: 'Copa Ásia', legs: 1 }, tvPool: 600 * M, movement: [2, 3],
    divisions: [
      { name: 'Liga AFC', teams: 16, quality: 70, spread: 10, tvShare: 0.7 },
      { name: '2.ª Liga AFC', teams: 16, quality: 61, spread: 6, tvShare: 0.2 },
      { name: '3.ª Liga AFC', teams: 15, quality: 52, spread: 8, tvShare: 0.1 },
    ] },
  { id: 'CONCACAF', name: 'CONCACAF', cup: { name: 'Copa Gold', legs: 2 }, tvPool: 500 * M, overflowTo: 'OFC', movement: [3],
    divisions: [
      { name: 'Liga CONCACAF', teams: 16, quality: 68, spread: 12, tvShare: 0.75 },
      { name: '2.ª Liga CONCACAF', teams: 18, quality: 55, spread: 8, tvShare: 0.25 },
    ] },
  { id: 'CONMEBOL', name: 'CONMEBOL', cup: { name: 'Taça CONMEBOL', legs: 2 }, tvPool: 600 * M, movement: [],
    divisions: [
      { name: 'Liga CONMEBOL', teams: 10, quality: 75, spread: 9, tvShare: 1 },
    ] },
  { id: 'OFC', name: 'OFC', cup: { name: 'Copa OFC', legs: 2 }, tvPool: 30 * M, movement: [],
    divisions: [
      { name: 'Liga OFC', teams: 12, quality: 54, spread: 10, tvShare: 1 },
    ] },
];

function build(spec: ConfSpec): ConfederationConfig {
  const divisions: DivisionConfig[] = spec.divisions.map((d, i) => ({
    id: `${spec.id}${i + 1}`,
    confederation: spec.id,
    tier: i + 1,
    name: d.name,
    teams: d.teams,
    format: { kind: 'double-round-robin' },
    promotionSlots: i > 0 ? spec.movement[i - 1] ?? 0 : 0,
    relegationSlots: i < spec.divisions.length - 1 ? spec.movement[i] ?? 0 : 0,
    tvShare: d.tvShare,
    quality: d.quality,
    qualitySpread: d.spread,
  }));
  return {
    id: spec.id,
    name: spec.name,
    divisions,
    cup: { id: `${spec.id}-CUP`, name: spec.cup.name, legs: spec.cup.legs },
    tvPool: spec.tvPool,
    overflowTo: spec.overflowTo,
  };
}

/** Default confederation configuration (fresh copy on every call). */
export function defaultConfederations(): ConfederationConfig[] {
  return SPECS.map(build);
}

export const CONFEDERATION_IDS: readonly ConfederationId[] = SPECS.map((s) => s.id);
export const EXPECTED_COUNTRIES = 213;

/**
 * Confederation transfers YOU confirmed (country → destination). While empty, the game computes the
 * candidates (weakest by the criterion below) and shows them as "pendente de confirmação".
 * Example after confirming: { SMR: 'AFC', AIA: 'OFC' }
 */
export const CONFIRMED_TRANSFERS: Record<string, ConfederationId> = {};

/** Weakest-country criterion: weights of the within-confederation percentiles (decided: 50/50). */
export const WEAKEST_CRITERION = { populationWeight: 0.5, reputationWeight: 0.5 } as const;
