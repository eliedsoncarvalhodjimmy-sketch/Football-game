import { describe, expect, it } from 'vitest';
import { N_VISIBLE, VISIBLE_INDEX } from '../src/config/attributes.config';
import { attributeCsvHeaders, exportAttributesCsv, importAttributesCsv } from '../src/data/attributesIO';
import { parseCsv, toCsv } from '../src/data/csv';
import { generateWorld } from '../src/engine/generator/worldGenerator';
import { buildWorld } from '../src/engine/store/worldStore';

function smallWorld() {
  const raw = generateWorld({ seed: 5 });
  // keep the players of a few countries only, to make the test fast
  const keep = new Set(['POR', 'ESP', 'BRA']);
  raw.players = raw.players.filter((p) => keep.has(p.team));
  return { raw, world: buildWorld(raw) };
}

describe('attributes export / re-import', () => {
  it('exports one row per player with all editable columns', () => {
    const { world } = smallWorld();
    const csv = parseCsv(exportAttributesCsv(world));
    expect(csv.headers).toEqual(attributeCsvHeaders());
    expect(csv.rows).toHaveLength(world.players.count);
  });

  it('re-importing an unedited export changes nothing', () => {
    const { world } = smallWorld();
    const before = world.players.attrs.slice();
    const s = importAttributesCsv(world, exportAttributesCsv(world, { delimiter: ';' }));
    expect(s.overridesSet).toBe(0);
    expect(world.overrides.size).toBe(0);
    expect(world.players.attrs).toEqual(before);
  });

  it('hand-edited values win, survive regeneration, and are cleared by an empty cell', () => {
    const { world } = smallWorld();
    const csv = parseCsv(exportAttributesCsv(world));
    const row = csv.rows[0];
    const pid = row.player_id;
    const i = world.playerIndexById.get(pid)!;
    const genFinishing = Number(row.finishing);
    const edited = genFinishing === 20 ? 19 : genFinishing + 1;
    row.finishing = String(edited);
    row.professionalism = '20';
    row.potential = '99';
    const headers = csv.headers;
    const text = toCsv(headers, csv.rows.map((r) => headers.map((h) => r[h])));

    const s = importAttributesCsv(world, text);
    expect(s.playersTouched).toBe(1);
    expect(world.players.attrs[i * N_VISIBLE + VISIBLE_INDEX.finishing]).toBe(edited);
    expect(world.players.potential[i]).toBe(99);
    expect(world.overrides.get(pid)?.get('finishing')).toBe(edited);

    // regenerating everything (e.g. after changing generator config) keeps the manual values
    world.regenerateAll();
    expect(world.players.attrs[i * N_VISIBLE + VISIBLE_INDEX.finishing]).toBe(edited);
    expect(world.players.potential[i]).toBe(99);

    // the exported file marks the manual cells
    const again = parseCsv(exportAttributesCsv(world)).rows.find((r) => r.player_id === pid)!;
    expect(again.manual_cells.split('|').sort()).toContain('finishing');

    // an empty cell reverts to the generated value
    const revert = toCsv(['player_id', 'finishing'], [[pid, '']]);
    const s2 = importAttributesCsv(world, revert);
    expect(s2.overridesCleared).toBe(1);
    expect(world.players.attrs[i * N_VISIBLE + VISIBLE_INDEX.finishing]).toBe(genFinishing);
    expect(world.overrides.get(pid)?.has('finishing')).toBe(false);
  });

  it('reports unknown players and out-of-range values', () => {
    const { world } = smallWorld();
    const pid = world.players.ids[0];
    const s = importAttributesCsv(world, toCsv(['player_id', 'pace'], [['NOPE', '10'], [pid, '35']]));
    expect(s.unknownPlayers).toBe(1);
    expect(s.issues.some((i) => i.column === 'pace')).toBe(true);
    expect(world.players.attrs[0 * N_VISIBLE + VISIBLE_INDEX.pace]).toBe(20); // clamped
  });
});
