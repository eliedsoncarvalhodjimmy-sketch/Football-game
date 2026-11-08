import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/persistence/db';
import { SaveManager } from '../src/persistence/saveSlots';
import { WorldService } from '../src/worker/service';
import { fullWorld } from './helpers';

describe('save slots (IndexedDB)', () => {
  it('saves and loads the full world identically', async () => {
    const { world } = fullWorld();
    const sm = new SaveManager(await openDatabase('test-1'));
    const r = await sm.save('slot-a', 'A', world);
    expect(r.skipped).toHaveLength(0);
    const loaded = (await sm.load('slot-a'))!;
    expect(loaded.players.count).toBe(world.players.count);
    expect(loaded.players.attrs).toEqual(world.players.attrs);
    expect(loaded.players.ids).toEqual(world.players.ids);
    expect(loaded.clubs).toEqual(world.clubs);
    expect((await sm.listSlots()).map((s) => s.slotId)).toEqual(['slot-a']);
  });

  it('second save only writes changed chunks', async () => {
    const { world } = fullWorld();
    const sm = new SaveManager(await openDatabase('test-2'));
    await sm.save('s', 'S', world);
    const unchanged = await sm.save('s', 'S', world);
    expect(unchanged.written).toEqual([]);
    world.overrides.set(world.players.ids[0], new Map([['pace', 1]]));
    const one = await sm.save('s', 'S', world);
    expect(one.written).toEqual(['overrides']);
    world.overrides.clear();
  });

  it('supports several slots and deletion', async () => {
    const { world } = fullWorld();
    const sm = new SaveManager(await openDatabase('test-3'));
    await sm.save('a', 'A', world);
    await sm.save('b', 'B', world);
    expect((await sm.listSlots()).length).toBe(2);
    await sm.delete('a');
    expect((await sm.listSlots()).map((s) => s.slotId)).toEqual(['b']);
    expect(await sm.load('a')).toBeNull();
  });
});

describe('WorldService (worker logic, run in Node)', () => {
  it('generates, queries and never exposes hidden attributes to the UI', async () => {
    const svc = new WorldService(() => openDatabase('test-svc'));
    const s = await svc.handle({ type: 'generateWorld', seed: 7 });
    expect(s.leagues).toBe(64);
    const countries = await svc.handle({ type: 'countries' });
    const clubs = await svc.handle({ type: 'leagueClubs', leagueId: countries[0].leagues[0].id });
    const squad = await svc.handle({ type: 'clubSquad', clubId: clubs[0].id });
    const d = (await svc.handle({ type: 'playerDetail', playerId: squad[0].id }))!;
    expect(d.attributes).toHaveLength(30);
    const json = JSON.stringify(d);
    for (const hidden of ['professionalism', 'ambition', 'consistency', 'injuryProneness', 'adaptability', 'pressure', 'potential']) {
      expect(json).not.toContain(hidden);
    }
  });
});
