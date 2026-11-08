// Convert parsed CSV rows into records, collecting readable errors and warnings (file/line/column).
// Errors drop the offending row; warnings fix the value with a safe default.

import { POSITION_INDEX } from '../config/attributes.config';
import type { ClubRecord, CountryConfig, PlayerRecord, PreferredFoot } from '../engine/types';
import { splitList, type ParsedCsv } from './csv';
import type { DataIssue } from './DataSource';
import { CLUB_REQUIRED, FILES, PLAYER_REQUIRED } from './schema';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function missingColumns(csv: ParsedCsv, required: readonly string[], file: string, issues: DataIssue[]): boolean {
  const missing = required.filter((c) => !csv.headers.includes(c));
  for (const c of missing) issues.push({ level: 'error', file, column: c, message: `Coluna obrigatória em falta: ${c}` });
  return missing.length > 0;
}

export function parseClubs(csv: ParsedCsv, countries: CountryConfig[], issues: DataIssue[]): ClubRecord[] {
  const file = FILES.clubs;
  if (missingColumns(csv, CLUB_REQUIRED, file, issues)) return [];
  const leagueCountry = new Map(countries.flatMap((c) => c.leagues.map((l) => [l.id, c.id] as const)));
  const seen = new Set<string>();
  const clubs: ClubRecord[] = [];
  csv.rows.forEach((r, k) => {
    const line = csv.lines[k];
    const err = (column: string, message: string) => issues.push({ level: 'error', file, line, column, message });
    const warn = (column: string, message: string) => issues.push({ level: 'warning', file, line, column, message });
    const id = r.id;
    if (!id) return err('id', 'id vazio');
    if (seen.has(id)) return err('id', `id duplicado: ${id}`);
    const country = leagueCountry.get(r.league);
    if (!country) return err('league', `liga desconhecida: ${r.league}`);
    if (r.country && r.country !== country) warn('country', `país ${r.country} não corresponde à liga ${r.league}; usado ${country}`);
    seen.add(id);
    const intIn = (col: string, min: number, max: number, def: number): number => {
      const v = num(r[col]);
      if (v === null) return def;
      if (v < min || v > max) { warn(col, `${col}=${v} fora de [${min}, ${max}]; ajustado`); return Math.min(max, Math.max(min, Math.round(v))); }
      return Math.round(v);
    };
    const color = (col: string, def: string) => {
      const v = r[col];
      if (!v) return def;
      if (!HEX.test(v)) { warn(col, `cor inválida "${v}" (use #rrggbb)`); return def; }
      return v.toLowerCase();
    };
    const reputation = intIn('reputation', 1, 100, 50);
    clubs.push({
      id,
      name: r.name,
      shortName: r.short_name || r.name.slice(0, 3).toUpperCase(),
      countryId: country,
      leagueId: r.league,
      city: r.city ?? '',
      reputation,
      stadiumCapacity: intIn('stadium_capacity', 0, 200_000, 5_000 + reputation * reputation * 6),
      transferBudget: intIn('transfer_budget', 0, 5e9, 0),
      wageBudget: intIn('wage_budget', 0, 5e9, 0),
      facilities: intIn('facilities', 1, 20, Math.max(1, Math.round(reputation / 5))),
      youthFacilities: intIn('youth_facilities', 1, 20, Math.max(1, Math.round(reputation / 5))),
      crest: r.crest ?? '',
      rivals: splitList(r.rivals),
      colorPrimary: color('color_primary', '#888888'),
      colorSecondary: color('color_secondary', '#ffffff'),
    });
  });
  // rivals must reference known clubs
  for (const c of clubs) {
    const bad = c.rivals.filter((x) => !seen.has(x) || x === c.id);
    if (bad.length) {
      issues.push({ level: 'warning', file, column: 'rivals', message: `${c.id}: rivais desconhecidos ignorados: ${bad.join(', ')}` });
      c.rivals = c.rivals.filter((x) => !bad.includes(x));
    }
  }
  return clubs;
}

export function parsePlayers(csv: ParsedCsv, clubs: ClubRecord[], issues: DataIssue[]): PlayerRecord[] {
  const file = FILES.players;
  if (missingColumns(csv, PLAYER_REQUIRED, file, issues)) return [];
  const clubById = new Map(clubs.map((c) => [c.id, c]));
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
    seen.add(id);
    let clubId = r.club ?? '';
    if (clubId && !clubById.has(clubId)) { warn('club', `clube desconhecido ${clubId}; jogador fica livre`); clubId = ''; }
    let nationality = (r.nationality ?? '').toUpperCase();
    if (!nationality) {
      nationality = clubId ? clubById.get(clubId)!.countryId : 'UNK';
      warn('nationality', `nacionalidade em falta; usado ${nationality}`);
    }
    const others = splitList(r.other_positions).map((p) => p.toUpperCase());
    const badOthers = others.filter((p) => POSITION_INDEX[p] === undefined);
    if (badOthers.length) warn('other_positions', `posições ignoradas: ${badOthers.join(', ')}`);
    const footRaw = (r.foot ?? '').toUpperCase();
    const foot: PreferredFoot = footRaw === 'L' || footRaw === 'B' ? footRaw : 'R';
    if (footRaw && !['R', 'L', 'B'].includes(footRaw)) warn('foot', `pé inválido "${r.foot}" (R/L/B); usado R`);
    const h = num(r.height_cm);
    players.push({
      id,
      firstName: r.first_name ?? '',
      lastName: r.last_name,
      clubId,
      nationality,
      birthDate: r.birth_date,
      position,
      otherPositions: others.filter((p) => POSITION_INDEX[p] !== undefined && p !== position),
      ovr: Math.round(ovr),
      foot,
      heightCm: h !== null && h >= 140 && h <= 220 ? Math.round(h) : 180,
    });
  });
  return players;
}
