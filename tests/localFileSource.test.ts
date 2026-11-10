import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { LocalFileSource } from '../src/data/adapters/LocalFileSource';
import { MemoryFileProvider } from '../src/data/DataSource';
import { NodeFileProvider } from '../src/data/nodeFiles';
import { countriesToCsv, playersToCsv } from '../src/data/worldExport';
import { buildWorld } from '../src/engine/store/worldStore';
import { fullWorld } from './helpers';

const fixtures = join(import.meta.dirname, 'fixtures', 'small');

describe('LocalFileSource', async () => {
  const src = new LocalFileSource(new NodeFileProvider(fixtures));
  const { world, issues } = await src.load();
  const err = (file: string, col: string) => issues.find((i) => i.level === 'error' && i.file === file && i.column === col);
  const warn = (file: string, col: string) => issues.find((i) => i.level === 'warning' && i.file === file && i.column === col);

  it('merges countries.csv into the fixed list of 213 countries', () => {
    expect(world.countries).toHaveLength(213);
    const por = world.countries.find((c) => c.id === 'POR')!;
    expect(por.population).toBe(1_000_000);
    expect(por.economyStatus).toBe('real');
    expect(por.reputation).toBe(85);
    expect(por.flag).toBe('por.svg');
    expect(world.countries.find((c) => c.id === 'ESP')!.name).toBe('Espanha'); // empty name keeps the default
    expect(world.countries.find((c) => c.id === 'SMR')!.economyStatus).toBe('missing'); // no GDP
    expect(err('countries.csv', 'id')?.line).toBe(4); // XXX unknown
    expect(warn('countries.csv', 'confederation')).toBeDefined(); // BRA listed as CONCACAF
    expect(world.countries.find((c) => c.id === 'BRA')!.confederation).toBe('CONMEBOL');
    expect(warn('countries.csv', 'rivals')).toBeDefined(); // ZZZ
    expect(world.countries.find((c) => c.id === 'ARG')!.rivals).toContain('BRA');
  });

  it('parses players, keeps nationality (formation) separate from team, applies exceptions', () => {
    const p = (id: string) => world.players.find((x) => x.id === id);
    expect(p('P1')!.team).toBe('KSA'); // initial_country.csv wins
    expect(p('P1')!.nationality).toBe('POR');
    expect(p('P1')!.valueEur).toBe(45_000_000);
    expect(p('P1')!.otherPositions).toEqual(['AM', 'RW']);
    expect(p('P3')!.team).toBe(''); // empty team = free agent
    expect(p('P3')!.squad).toBe('u19');
    expect(p('P4')!.nationality).toBe('BRA');
    expect(p('P8')!.squad).toBe('senior'); // invalid level → warning
    expect(p('P5')).toBeUndefined();
    expect(err('players.csv', 'position')?.line).toBe(6);
    expect(err('players.csv', 'ovr')?.line).toBe(7);
    expect(err('players.csv', 'nationality')?.line).toBe(8);
    expect(warn('initial_country.csv', 'player_id')).toBeDefined(); // P9
  });

  it('fills the missing squad places with generated players, real players untouched', () => {
    const por = world.players.filter((x) => x.team === 'POR' && x.squad === 'senior');
    expect(por).toHaveLength(25);
    expect(por.filter((x) => !x.generated).map((x) => x.id).sort()).toEqual(['P2', 'P4']);
    expect(world.players.filter((x) => x.team === 'KSA' && x.squad === 'senior')).toHaveLength(25); // P1 + 24 generated
    expect(world.players.every((x) => x.generated || !x.id.startsWith('G-'))).toBe(true);
  });

  it('reports the confederation table (213 = 213)', () => {
    const t = src.assignment!.table;
    expect(t.reduce((s, r) => s + r.final, 0)).toBe(213);
    expect(t.every((r) => r.ok)).toBe(true);
  });

  it('with no files at all, still builds a complete (generated) world with warnings', async () => {
    const r = await new LocalFileSource(new MemoryFileProvider({})).load();
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(r.world.countries).toHaveLength(213);
    expect(r.world.countries.every((c) => c.economyStatus === 'missing')).toBe(true);
  });

  it('the full test world exported to CSV re-imports with identical attributes', async () => {
    const { raw, world: w } = fullWorld();
    const files = {
      'countries.csv': countriesToCsv(raw, ';'),
      'players.csv': playersToCsv(raw),
      'world.json': JSON.stringify({ seed: raw.meta.seed, referenceDate: raw.meta.referenceDate }),
    };
    const res = await new LocalFileSource(new MemoryFileProvider(files)).load();
    expect(res.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(res.world.players).toHaveLength(raw.players.length); // squads already full: nothing generated
    const again = buildWorld(res.world);
    expect(again.players.count).toBe(w.players.count);
    expect(again.players.attrs).toEqual(w.players.attrs);
    expect(again.players.potential).toEqual(w.players.potential);
  });
});
