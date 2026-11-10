// IndexedDB schema. Works in the browser main thread, in Web Workers and (with fake-indexeddb) in tests.
//
// Stores:
//   slots  : one record per save slot (metadata only, cheap to list)
//   chunks : [slotId, chunkKey] → chunk payload (typed arrays are stored natively via structured clone)

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const DB_NAME = 'futceo';
export const DB_VERSION = 1;
/** Save format version (v1 = club world, v2 = country-clubs). v1 saves are not loadable. */
export const SAVE_FORMAT = 2;

export interface SlotMeta {
  slotId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  worldName: string;
  isTestData: boolean;
  seed: number;
  countries: number;
  players: number;
  /** Chunk keys that make up this save. */
  chunkKeys: string[];
  /** Total bytes (approx.) of the chunks, for display. */
  bytes: number;
}

export interface ChunkRecord {
  slotId: string;
  key: string;
  version: number;
  data: unknown;
}

interface FutCeoDB extends DBSchema {
  slots: { key: string; value: SlotMeta };
  chunks: { key: [string, string]; value: ChunkRecord; indexes: { bySlot: string } };
}

export type Database = IDBPDatabase<FutCeoDB>;

export function openDatabase(name = DB_NAME): Promise<Database> {
  return openDB<FutCeoDB>(name, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('slots', { keyPath: 'slotId' });
      const chunks = db.createObjectStore('chunks', { keyPath: ['slotId', 'key'] });
      chunks.createIndex('bySlot', 'slotId');
    },
  });
}
