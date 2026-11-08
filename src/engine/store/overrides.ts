// Hand-edited attribute values. They always win over generated values.
// Stored sparsely: only the cells that differ from what the generator produces.

import { HIDDEN_ATTRIBUTES, VISIBLE_ATTRIBUTES } from '../../config/attributes.config';

/** Editable columns, in CSV order: visible attributes, hidden attributes, potential. */
export const EDITABLE_COLUMNS: readonly string[] = [
  ...VISIBLE_ATTRIBUTES.map((a) => a.key),
  ...HIDDEN_ATTRIBUTES.map((a) => a.key),
  'potential',
];

/** playerId → (column → value) */
export type AttributeOverrides = Map<string, Map<string, number>>;

export function overridesToJSON(o: AttributeOverrides): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [pid, cols] of o) out[pid] = Object.fromEntries(cols);
  return out;
}

export function overridesFromJSON(j: Record<string, Record<string, number>>): AttributeOverrides {
  const o: AttributeOverrides = new Map();
  for (const [pid, cols] of Object.entries(j)) o.set(pid, new Map(Object.entries(cols)));
  return o;
}

export function countOverrideCells(o: AttributeOverrides): number {
  let n = 0;
  for (const cols of o.values()) n += cols.size;
  return n;
}
