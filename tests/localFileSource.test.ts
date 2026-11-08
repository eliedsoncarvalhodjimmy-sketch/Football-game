import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { LocalFileSource } from '../src/data/adapters/LocalFileSource';
import { MemoryFileProvider } from '../src/data/DataSource';
import { NodeFileProvider } from '../src/data/nodeFiles';
import { clubsToCsv, playersToCsv } from '../src/data/worldExport';
import { buildWorld } from '../src/engine/store/worldStore';
import { fullWorld } from './helpers';

const fixtures = join(import.meta.dirname, 'fixtures', 'small');

describe('LocalFileSource', () => {
  it('loads valid rows, reports errors/warnings with line numbers', async () => {
    const { world, issues } = await new LocalFileSource(new NodeFileProvider(fixtures)).load();
    expect(world.meta.isTestData).toBe(false);
    expect(world.meta.seed).toBe(42);
    expect(world.clubs.map((c) => c.id)).toEqual(['C1', 'C2']); // C3 has an unknown league
    expect(world.clubs[1].name).toBe('Clube "Sul" Exemplo');
    expect(world.clubs[1].rivals).toEqual(['C1']); // C9 dropped
    expect(world.players.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7']);
    expect(world.players.find((p) => p.id === 'P1')!.otherPositions).toEqual(['AM', 'RW']);
    expect(world.players.find((p) => p.id === 'P3')!.nationality).toBe('POR'); // defaulted from club
    expect(world.players.find((p) => p.id === 'P7')!.clubId).toBe(''); // unknown club → free agent

    const err = (col: string) => issues.find((i) => i.level === 'error' && i.column === col);
    expect(err('league')?.line).toBe(4);
    expect(err('position')?.line).toBe(6);
    expect(err('ovr')?.line).toBe(7);
    expect(issues.some((i) => i.level === 'warning' && i.column === 'rivals')).toBe(true);
  });

  it('applies world.json overrides and takes club counts from the files', async () => {
    const { world } = await new LocalFileSource(new NodeFileProvider(fixtures)).load();
    const por1 = world.countries.flatMap((c) => c.leagues).find((l) => l.id === 'POR1')!;
    expect(por1.relegationSlots).toBe(3);
    expect(por1.clubs).toBe(2);
  });

  it('reports missing files as errors', async () => {
    const { issues } = await new LocalFileSource(new MemoryFileProvider({})).load();
    expect(issues.filter((i) => i.level === 'error').map((i) => i.file).sort()).toEqual(['clubs.csv', 'players.csv']);
  });

  it('a full world exported to CSV re-imports identically (same attributes)', async () => {
    const { raw, world } = fullWorld();
    const files = {
      'clubs.csv': clubsToCsv(raw, ';'),
      'players.csv': playersToCsv(raw),
      'world.json': JSON.stringify({ seed: raw.meta.seed, referenceDate: raw.meta.referenceDate }),
    };
    const res = await new LocalFileSource(new MemoryFileProvider(files)).load();
    expect(res.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(res.world.clubs).toHaveLength(raw.clubs.length);
    expect(res.world.players).toHaveLength(raw.players.length);
    const again = buildWorld(res.world);
    expect(again.players.attrs).toEqual(world.players.attrs);
    expect(again.players.potential).toEqual(world.players.potential);
  });
});
