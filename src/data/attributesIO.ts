// Export generated attributes to CSV for hand editing, and re-import them.
//
// Merge rule (see DECISIONS.md):
//  - A cell whose value differs from what the generator produces becomes a hand-edited override.
//  - A cell equal to the generated value, or left empty, has no override (it follows the generator).
//  - Overrides always win over generated values, including after the generator config changes.

import { ATTR_MAX, ATTR_MIN, HIDDEN_ATTRIBUTES, N_HIDDEN, N_VISIBLE, POSITIONS, VISIBLE_ATTRIBUTES } from '../config/attributes.config';
import { EDITABLE_COLUMNS } from '../engine/store/overrides';
import type { WorldStore } from '../engine/store/worldStore';
import { parseCsv, toCsv } from './csv';
import type { DataIssue } from './DataSource';
import { FILES } from './schema';

/** Read-only context columns (ignored on import, except player_id). */
export const CONTEXT_COLUMNS = ['player_id', 'name', 'club', 'position', 'age', 'ovr'] as const;
export const MANUAL_COLUMN = 'manual_cells';

export function attributeCsvHeaders(): string[] {
  return [...CONTEXT_COLUMNS, ...EDITABLE_COLUMNS, MANUAL_COLUMN];
}

export interface ExportOptions {
  delimiter?: ',' | ';';
  /** Restrict to these player indices (default: all). */
  players?: number[];
}

export function exportAttributesCsv(world: WorldStore, opts: ExportOptions = {}): string {
  const p = world.players;
  const idx = opts.players ?? Array.from({ length: p.count }, (_, i) => i);
  const rows: (string | number)[][] = [];
  for (const i of idx) {
    const ci = p.clubIndex[i];
    const row: (string | number)[] = [
      p.ids[i],
      `${p.firstNames[i]} ${p.lastNames[i]}`.trim(),
      ci >= 0 ? world.clubs[ci].id : '',
      POSITIONS[p.position[i]],
      world.ageOf(i),
      p.ovrInput[i],
    ];
    for (let a = 0; a < N_VISIBLE; a++) row.push(p.attrs[i * N_VISIBLE + a]);
    for (let h = 0; h < N_HIDDEN; h++) row.push(p.hidden[i * N_HIDDEN + h]);
    row.push(p.potential[i]);
    const ov = world.overrides.get(p.ids[i]);
    row.push(ov ? [...ov.keys()].join('|') : '');
    rows.push(row);
  }
  return toCsv(attributeCsvHeaders(), rows, opts.delimiter ?? ',');
}

export interface ImportSummary {
  rows: number;
  playersTouched: number;
  overridesSet: number;
  overridesCleared: number;
  unknownPlayers: number;
  issues: DataIssue[];
}

function generatedValue(gen: ReturnType<WorldStore['generated']>, col: string): number {
  if (col === 'potential') return gen.potential;
  const v = VISIBLE_ATTRIBUTES.findIndex((a) => a.key === col);
  if (v >= 0) return gen.visible[v];
  return gen.hidden[HIDDEN_ATTRIBUTES.findIndex((a) => a.key === col)];
}

/** Re-import an attributes CSV into the world. Mutates world.overrides and the player store. */
export function importAttributesCsv(world: WorldStore, text: string): ImportSummary {
  const file = FILES.attributes;
  const csv = parseCsv(text);
  const s: ImportSummary = { rows: csv.rows.length, playersTouched: 0, overridesSet: 0, overridesCleared: 0, unknownPlayers: 0, issues: [] };
  if (!csv.headers.includes('player_id')) {
    s.issues.push({ level: 'error', file, column: 'player_id', message: 'Coluna obrigatória em falta: player_id' });
    return s;
  }
  const cols = EDITABLE_COLUMNS.filter((c) => csv.headers.includes(c));
  csv.rows.forEach((r, k) => {
    const line = csv.lines[k];
    const i = world.playerIndexById.get(r.player_id);
    if (i === undefined) {
      s.unknownPlayers++;
      s.issues.push({ level: 'warning', file, line, column: 'player_id', message: `jogador desconhecido: ${r.player_id}` });
      return;
    }
    const gen = world.generated(i);
    const pid = r.player_id;
    let ov = world.overrides.get(pid);
    let changed = false;
    for (const col of cols) {
      const raw = r[col];
      const had = ov?.has(col) ?? false;
      if (raw === '') {
        if (had) { ov!.delete(col); s.overridesCleared++; changed = true; }
        continue;
      }
      let v = Number(raw.replace(',', '.'));
      if (!Number.isFinite(v)) {
        s.issues.push({ level: 'warning', file, line, column: col, message: `valor inválido "${raw}"; ignorado` });
        continue;
      }
      const [min, max] = col === 'potential' ? [1, 99] : [ATTR_MIN, ATTR_MAX];
      if (v < min || v > max) {
        s.issues.push({ level: 'warning', file, line, column: col, message: `${col}=${v} fora de [${min}, ${max}]; ajustado` });
      }
      v = Math.min(max, Math.max(min, Math.round(v)));
      if (v === generatedValue(gen, col)) {
        if (had) { ov!.delete(col); s.overridesCleared++; changed = true; }
      } else if (!had || ov!.get(col) !== v) {
        if (!ov) { ov = new Map(); world.overrides.set(pid, ov); }
        ov.set(col, v);
        s.overridesSet++;
        changed = true;
      }
    }
    if (ov && ov.size === 0) world.overrides.delete(pid);
    if (changed) {
      s.playersTouched++;
      world.regeneratePlayer(i);
    }
  });
  return s;
}
