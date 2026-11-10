// Confederation redistribution (prompt v2.4 §4.1) and initial division assignment.
//
// Each confederation has a fixed number of slots (sum of its division sizes). When it has more
// countries than slots, the weakest surplus countries move to its `overflowTo` confederation.
// Weakest = lowest score, score = wPop × percentile(population) + wRep × percentile(reputation),
// percentiles computed inside the original confederation. Protected countries never move.

import { PROTECTED_COUNTRIES } from '../../config/countries.base';
import type { ConfederationConfig, ConfederationId, ConfederationTransfer, CountryRecord, WorldIssue } from '../types';

export interface ConfederationCountRow {
  confederation: ConfederationId;
  own: number;
  slots: number;
  surplus: number;
  outgoing: string[];
  incoming: string[];
  final: number;
  ok: boolean;
}

export interface WeakestCandidate {
  country: string;
  name: string;
  score: number;
  populationPct: number | null;
  reputationPct: number;
}

export interface AssignmentResult {
  transfers: ConfederationTransfer[];
  table: ConfederationCountRow[];
  /** Ranking of the weakest countries per overflowing confederation (for you to confirm). */
  ranking: Record<string, WeakestCandidate[]>;
  issues: WorldIssue[];
}

export const slotsOf = (c: ConfederationConfig): number => c.divisions.reduce((s, d) => s + d.teams, 0);

function percentiles(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const pct = new Array<number>(values.length);
  const n = values.length;
  order.forEach(([, i], rank) => (pct[i] = n > 1 ? rank / (n - 1) : 0.5));
  return pct;
}

/** Rank the countries of one confederation from weakest to strongest. */
export function weakestRanking(
  countries: CountryRecord[], criterion: { populationWeight: number; reputationWeight: number },
): WeakestCandidate[] {
  const withPop = countries.filter((c) => c.population !== null);
  const popPct = new Map(withPop.map((c, k) => [c.id, percentiles(withPop.map((x) => x.population!))[k]]));
  const repPct = percentiles(countries.map((c) => c.reputation));
  return countries
    .map((c, k) => {
      const p = popPct.get(c.id) ?? null;
      const score = p === null
        ? repPct[k] // no population data: reputation only (flagged in the report)
        : criterion.populationWeight * p + criterion.reputationWeight * repPct[k];
      return { country: c.id, name: c.name, score, populationPct: p, reputationPct: repPct[k] };
    })
    .sort((a, b) => a.score - b.score || a.country.localeCompare(b.country));
}

/**
 * Sets `gameConfederation` on every country. Mutates `countries`.
 * `confirmed`: transfers you confirmed (country → destination). Otherwise the computed candidates are used.
 */
export function assignConfederations(
  countries: CountryRecord[],
  confederations: ConfederationConfig[],
  confirmed: Record<string, ConfederationId>,
  criterion: { populationWeight: number; reputationWeight: number },
): AssignmentResult {
  const issues: WorldIssue[] = [];
  const transfers: ConfederationTransfer[] = [];
  const ranking: Record<string, WeakestCandidate[]> = {};
  const byId = new Map(countries.map((c) => [c.id, c]));
  for (const c of countries) c.gameConfederation = c.confederation;

  for (const conf of confederations) {
    const own = countries.filter((c) => c.confederation === conf.id);
    const surplus = own.length - slotsOf(conf);
    if (surplus <= 0 || !conf.overflowTo) continue;
    const movable = own.filter((c) => !(PROTECTED_COUNTRIES as readonly string[]).includes(c.id));
    ranking[conf.id] = weakestRanking(movable, criterion);
    const confirmedHere = Object.entries(confirmed).filter(([id]) => byId.get(id)?.confederation === conf.id);
    let chosen: { id: string; confirmed: boolean }[];
    if (confirmedHere.length > 0) {
      for (const [id, to] of confirmedHere) {
        if ((PROTECTED_COUNTRIES as readonly string[]).includes(id)) issues.push({ level: 'error', file: 'confederations.config.ts', message: `${id} é protegido e não pode mudar de confederação` });
        if (to !== conf.overflowTo) issues.push({ level: 'warning', file: 'confederations.config.ts', message: `${id}: destino ${to} diferente do previsto (${conf.overflowTo})` });
      }
      if (confirmedHere.length !== surplus) {
        issues.push({ level: 'error', file: 'confederations.config.ts', message: `${conf.id}: ${confirmedHere.length} transferência(s) confirmada(s) mas sobram ${surplus}` });
      }
      chosen = confirmedHere.map(([id]) => ({ id, confirmed: true }));
    } else {
      chosen = ranking[conf.id].slice(0, surplus).map((c) => ({ id: c.country, confirmed: false }));
      issues.push({ level: 'warning', file: 'confederations.config.ts', message: `${conf.id}: transferência pendente de confirmação: ${chosen.map((c) => c.id).join(', ')} → ${conf.overflowTo}` });
    }
    for (const ch of chosen) {
      const country = byId.get(ch.id);
      if (!country) continue;
      const to = (confirmed[ch.id] ?? conf.overflowTo) as ConfederationId;
      country.gameConfederation = to;
      transfers.push({ country: ch.id, from: conf.id, to, confirmed: ch.confirmed });
    }
  }

  const table: ConfederationCountRow[] = confederations.map((conf) => {
    const own = countries.filter((c) => c.confederation === conf.id).length;
    const slots = slotsOf(conf);
    const outgoing = transfers.filter((t) => t.from === conf.id).map((t) => t.country);
    const incoming = transfers.filter((t) => t.to === conf.id).map((t) => t.country);
    const final = countries.filter((c) => c.gameConfederation === conf.id).length;
    return { confederation: conf.id, own, slots, surplus: own - slots, outgoing, incoming, final, ok: final === slots };
  });
  for (const r of table) {
    if (!r.ok) issues.push({ level: 'error', file: 'confederations.config.ts', message: `${r.confederation}: ${r.final} países para ${r.slots} vagas` });
  }
  return { transfers, table, ranking, issues };
}

/**
 * Initial divisions. If every country of a confederation has a valid `division` and the counts match
 * the division sizes, they are kept. Otherwise the confederation is filled by reputation (strongest first).
 */
export function assignDivisions(countries: CountryRecord[], confederations: ConfederationConfig[]): WorldIssue[] {
  const issues: WorldIssue[] = [];
  for (const conf of confederations) {
    const members = countries.filter((c) => c.gameConfederation === conf.id);
    const given = conf.divisions.every((d) => members.filter((c) => c.division === d.tier).length === d.teams)
      && members.every((c) => c.division >= 1 && c.division <= conf.divisions.length);
    if (given) continue;
    if (members.some((c) => c.division > 0)) {
      issues.push({ level: 'warning', file: 'countries.csv', column: 'division', message: `${conf.id}: divisões iniciais incompletas ou com contagens erradas; usada a reputação` });
    }
    const sorted = [...members].sort((a, b) => b.reputation - a.reputation || a.id.localeCompare(b.id));
    let k = 0;
    for (const d of conf.divisions) for (let i = 0; i < d.teams && k < sorted.length; i++) sorted[k++].division = d.tier;
  }
  return issues;
}
