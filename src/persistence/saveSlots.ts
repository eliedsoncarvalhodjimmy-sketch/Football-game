// Save slots with incremental (chunked) writes.
// The world is split into chunks; each chunk carries a content hash, and on save only the chunks
// whose hash changed since the last save of that slot are written.

import { WorldStore, type WorldSnapshot } from '../engine/store/worldStore';
import type { PlayerStoreSnapshot } from '../engine/store/playerStore';
import { SAVE_FORMAT, type ChunkRecord, type Database, type SlotMeta } from './db';

type Chunks = Record<string, unknown>;

const PLAYER_ARRAY_KEYS = [
  'teamIndex', 'squadLevel', 'valueEur', 'generated', 'nationality', 'birthDate', 'position', 'foot', 'heightCm', 'ovrInput', 'potential',
  'seed', 'attrs', 'hidden', 'familiarity',
] as const satisfies readonly (keyof PlayerStoreSnapshot)[];

/** Split a world snapshot into independently-saved chunks. */
export function snapshotToChunks(s: WorldSnapshot): Chunks {
  const c: Chunks = {
    meta: { version: s.version, meta: s.meta },
    confederations: s.confederations,
    countries: s.countries,
    'players:strings': {
      count: s.players.count, ids: s.players.ids, firstNames: s.players.firstNames,
      lastNames: s.players.lastNames, nationalityCodes: s.players.nationalityCodes,
    },
    otherPositions: s.otherPositions,
    overrides: s.overrides,
  };
  for (const k of PLAYER_ARRAY_KEYS) c[`players:${k}`] = s.players[k];
  return c;
}

export function chunksToSnapshot(c: Chunks): WorldSnapshot {
  const m = c.meta as { version: 2; meta: WorldSnapshot['meta'] };
  const strings = c['players:strings'] as Pick<PlayerStoreSnapshot, 'count' | 'ids' | 'firstNames' | 'lastNames' | 'nationalityCodes'>;
  const players = { ...strings } as PlayerStoreSnapshot;
  for (const k of PLAYER_ARRAY_KEYS) (players as unknown as Record<string, unknown>)[k] = c[`players:${k}`];
  return {
    version: m.version,
    meta: m.meta,
    confederations: c.confederations as WorldSnapshot['confederations'],
    countries: c.countries as WorldSnapshot['countries'],
    players,
    otherPositions: c.otherPositions as WorldSnapshot['otherPositions'],
    overrides: c.overrides as WorldSnapshot['overrides'],
  };
}

/** Cheap 32-bit content hash (FNV-1a over bytes / JSON). */
export function chunkHash(data: unknown): number {
  let h = 0x811c9dc5;
  if (ArrayBuffer.isView(data)) {
    const b = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); }
  } else {
    const s = JSON.stringify(data);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  }
  return h >>> 0;
}

function approxBytes(data: unknown): number {
  return ArrayBuffer.isView(data) ? data.byteLength : JSON.stringify(data).length;
}

export interface SaveResult {
  slot: SlotMeta;
  written: string[];
  skipped: string[];
}

export class SaveManager {
  /** Last saved hash per slot per chunk (in memory, rebuilt on load). */
  private hashes = new Map<string, Map<string, number>>();

  constructor(private db: Database) {}

  listSlots(): Promise<SlotMeta[]> {
    return this.db.getAll('slots').then((s) => s.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async save(slotId: string, name: string, world: WorldStore): Promise<SaveResult> {
    const chunks = snapshotToChunks(world.toSnapshot());
    const prev = this.hashes.get(slotId);
    const existing = await this.db.get('slots', slotId);
    const now = new Date().toISOString();
    const written: string[] = [];
    const skipped: string[] = [];
    const next = new Map<string, number>();
    let bytes = 0;
    const tx = this.db.transaction(['slots', 'chunks'], 'readwrite');
    const store = tx.objectStore('chunks');
    for (const [key, data] of Object.entries(chunks)) {
      const h = chunkHash(data);
      next.set(key, h);
      bytes += approxBytes(data);
      if (existing && prev?.get(key) === h) { skipped.push(key); continue; }
      const rec: ChunkRecord = { slotId, key, version: 1, data };
      void store.put(rec);
      written.push(key);
    }
    // remove chunks that no longer exist
    for (const old of existing?.chunkKeys ?? []) if (!(old in chunks)) void store.delete([slotId, old]);
    const slot: SlotMeta = {
      slotId,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      worldName: world.meta.name,
      isTestData: world.meta.isTestData,
      seed: world.meta.seed,
      countries: world.countries.length,
      players: world.players.count,
      chunkKeys: Object.keys(chunks),
      bytes,
    };
    void tx.objectStore('slots').put(slot);
    await tx.done;
    this.hashes.set(slotId, next);
    return { slot, written, skipped };
  }

  async load(slotId: string): Promise<WorldStore | null> {
    const slot = await this.db.get('slots', slotId);
    if (!slot) return null;
    const recs = await this.db.getAllFromIndex('chunks', 'bySlot', slotId);
    const chunks: Chunks = {};
    const hashes = new Map<string, number>();
    for (const r of recs) {
      chunks[r.key] = r.data;
      hashes.set(r.key, chunkHash(r.data));
    }
    this.hashes.set(slotId, hashes);
    const version = (chunks.meta as { version?: number } | undefined)?.version;
    if (version !== SAVE_FORMAT) throw new Error(`Gravação antiga (formato ${version ?? '?'}) incompatível com o mundo de países-clube`);
    return WorldStore.fromSnapshot(chunksToSnapshot(chunks));
  }

  async delete(slotId: string): Promise<void> {
    const tx = this.db.transaction(['slots', 'chunks'], 'readwrite');
    const keys = await tx.objectStore('chunks').index('bySlot').getAllKeys(slotId);
    for (const k of keys) void tx.objectStore('chunks').delete(k);
    void tx.objectStore('slots').delete(slotId);
    await tx.done;
    this.hashes.delete(slotId);
  }
}
