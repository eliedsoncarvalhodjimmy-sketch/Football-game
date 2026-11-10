// Convert parsed CSV rows into records, collecting readable errors and warnings (file/line/column).
// Errors drop the offending row; warnings fix the value with a safe default.

import { POSITION_INDEX } from '../config/attributes.config';
import { SQUAD_LEVELS, type CountryRecord, type PlayerRecord, type PreferredFoot, type SquadLevel } from '../engine/types';
import { splitList, type ParsedCsv } from './csv';
import type { DataIssue } from './DataSource';
import { COUNTRY_REQUIRED, FILES, PLAYER_REQUIRED } from './schema';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function missingColumns(csv: ParsedCsv, required: readonly string[], file: string, issues: DataIssue[]): boolean {
  const missing = required.filter((c) => !csv.headers.includes(c));
  for (const c of missing) issues.push({ level: 'error', file, column: c, message: `Coluna obrigatória em falta: ${c}` });
  return missing.length > 0;
}

/**
 * Merge countries.csv into the base list of 213 countries (mutates `countries`).
 * Unknown ids are errors: the list of countries is fixed by the game.
 */
export function mergeCountries(csv: ParsedCsv, countries: CountryRecord[], issues: DataIssue[]): void {
  const file = FILES.countries;
  if (missingColumns(csv, COUNTRY_REQUIRED, file, issues)) return;
  const byId = new Map(countries.map((c) => [c.id, c]));
  const seen = new Set<string>();
  csv.rows.forEach((r, k) => {
    const line = csv.lines[k];
    const err = (column: string, message: string) => issues.push({ level: 'error', file, line, column, message });
    const warn = (column: string, message: string) => issues.push({ level: 'warning', file, line, column, message });
    const id = (r.id ?? '').toUpperCase();
    const c = byId.get(id);
    if (!c) return err('id', `país desconhecido: ${r.id} (a lista dos 213 está em src/config/countries.base.ts)`);
    if (seen.has(id)) return err('id', `país duplicado: ${id}`);
    seen.add(id);
    if (r.confederation && r.confederation.toUpperCase() !== c.confederation) {
      warn('confederation', `${id}: confederação ${r.confederation} diferente da original ${c.confederation}; ignorada (as transferências são calculadas pelo jogo)`);
    }
    if (r.name) c.name = r.name;
    const pop = num(r.population);
    const gdp = num(r.gdp_usd);
    if (pop !== null && pop > 0) c.population = Math.round(pop);
    else if (r.population) warn('population', `população inválida: ${r.population}`);
    if (gdp !== null && gdp > 0) c.gdpUsd = gdp;
    else if (r.gdp_usd) warn('gdp_usd', `PIB inválido: ${r.gdp_usd}`);
    c.economyStatus = c.population !== null && c.gdpUsd !== null ? 'real' : 'missing';
    const intIn = (col: string, min: number, max: number, cur: number): number => {
      const v = num(r[col]);
      if (v === null) return cur;
      if (v < min || v > max) { warn(col, `${col}=${v} fora de [${min}, ${max}]; ajustado`); return Math.min(max, Math.max(min, Math.round(v))); }
      return Math.round(v);
    };
    c.reputation = intIn('reputation', 1, 100, c.reputation);
    c.footballCulture = intIn('football_culture', 1, 20, c.footballCulture);
    c.youthStrength = intIn('youth_strength', 1, 20, c.youthStrength);
    c.division = intIn('division', 0, 3, c.division);
    if (r.flag) c.flag = r.flag;
    if (r.rivals !== undefined && r.rivals !== '') {
      const rivals = splitList(r.rivals).map((x) => x.toUpperCase());
      const bad = rivals.filter((x) => !byId.has(x) || x === id);
      if (bad.length) warn('rivals', `rivais desconhecidos ignorados: ${bad.join(', ')}`);
      c.rivals = rivals.filter((x) => !bad.includes(x));
    }
    for (const [col, key] of [['color_primary', 'colorPrimary'], ['color_secondary', 'colorSecondary']] as const) {
      const v = r[col];
      if (!v) continue;
      if (HEX.test(v)) c[key] = v.toLowerCase();
      else warn(col, `cor inválida "${v}" (use #rrggbb)`);
    }
  });
  // rivalries are symmetric
  for (const c of countries) for (const r of c.rivals) {
    const o = byId.get(r);
    if (o && !o.rivals.includes(c.id)) o.rivals.push(c.id);
  }
  const missing = countries.filter((c) => c.economyStatus !== 'real').map((c) => c.id);
  if (missing.length) {
    issues.push({ level: 'warning', file, column: 'population', message: `${missing.length} países sem população/PIB (a preencher): ${missing.slice(0, 30).join(', ')}${missing.length > 30 ? '…' : ''}` });
  }
}

export function parsePlayers(csv: ParsedCsv, countries: CountryRecord[], issues: DataIssue[]): PlayerRecord[] {
  const file = FILES.players;
  if (missingColumns(csv, PLAYER_REQUIRED, file, issues)) return [];
  const known = new Set(countries.map((c) => c.id));
  const seen = new Set<string>();
  const players: PlayerRecord[] = [];
  csv.rows.forEach((r, k) => {
    const line = csv.lines[k];
    const err = (column: string, message: string) => issues.push({ level: 'error', file, line, column, message });
    const warn = (column: string, message: string) => issues.push({ level: 'warning', file, line, column, message });
    const id = r.id;
    if (!id) return err('id', 'id vazio');
    if (seen.has(id)) return err('id', `id duplicado: ${id}`);
    const position = (r.position ?? '').toUpperCase();
    if (POSITION_INDEX[position] === undefined) return err('position', `posição inválida: ${r.position}`);
    const ovr = num(r.ovr);
    if (ovr === null || ovr < 1 || ovr > 99) return err('ovr', `ovr inválido: ${r.ovr} (1–99)`);
    if (!DATE.test(r.birth_date ?? '')) return err('birth_date', `data inválida: ${r.birth_date} (AAAA-MM-DD)`);
    const nationality = (r.nationality ?? '').toUpperCase();
    if (!known.has(nationality)) return err('nationality', `nacionalidade (país de formação) desconhecida: ${r.nationality}`);
    seen.add(id);
    // team: column absent → plays for the country where he was formed; present but empty → free agent
    let team = r.team === undefined ? nationality : r.team.toUpperCase();
    if (team && !known.has(team)) { warn('team', `país desconhecido ${team}; jogador fica livre`); team = ''; }
    let squad = (r.squad || 'senior').toLowerCase() as SquadLevel;
    if (!SQUAD_LEVELS.includes(squad)) { warn('squad', `escalão inválido "${r.squad}" (senior/u23/u19/u17); usado senior`); squad = 'senior'; }
    const others = splitList(r.other_positions).map((p) => p.toUpperCase());
    const badOthers = others.filter((p) => POSITION_INDEX[p] === undefined);
    if (badOthers.length) warn('other_positions', `posições ignoradas: ${badOthers.join(', ')}`);
    const footRaw = (r.foot ?? '').toUpperCase();
    const foot: PreferredFoot = footRaw === 'L' || footRaw === 'B' ? footRaw : 'R';
    if (footRaw && !['R', 'L', 'B'].includes(footRaw)) warn('foot', `pé inválido "${r.foot}" (R/L/B); usado R`);
    const value = num(r.value_eur);
    if (r.value_eur && (value === null || value < 0)) warn('value_eur', `valor inválido: ${r.value_eur}`);
    const h = num(r.height_cm);
    players.push({
      id,
      firstName: r.first_name ?? '',
      lastName: r.last_name,
      nationality,
      team,
      squad,
      birthDate: r.birth_date,
      position,
      otherPositions: others.filter((p) => POSITION_INDEX[p] !== undefined && p !== position),
      ovr: Math.round(ovr),
      valueEur: value !== null && value > 0 ? Math.round(value) : null,
      foot,
      heightCm: h !== null && h >= 140 && h <= 220 ? Math.round(h) : 180,
    });
  });
  return players;
}

/** initial_country.csv: move players to their initial country-club. Has priority over players.csv. */
export function applyExceptions(csv: ParsedCsv, players: PlayerRecord[], countries: CountryRecord[], issues: DataIssue[]): number {
  const file = FILES.exceptions;
  if (missingColumns(csv, ['player_id', 'country'], file, issues)) return 0;
  const byId = new Map(players.map((p) => [p.id, p]));
  const known = new Set(countries.map((c) => c.id));
  let applied = 0;
  csv.rows.forEach((r, k) => {
    const line = csv.lines[k];
    const p = byId.get(r.player_id);
    if (!p) return void issues.push({ level: 'warning', file, line, column: 'player_id', message: `jogador desconhecido: ${r.player_id}` });
    const country = (r.country ?? '').toUpperCase();
    if (country && !known.has(country)) return void issues.push({ level: 'error', file, line, column: 'country', message: `país desconhecido: ${r.country}` });
    p.team = country; // empty = free agent
    applied++;
  });
  return applied;
}
