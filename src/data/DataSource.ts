// DataSource: where the world comes from. v1 has a local-files adapter and the fictional generator.
// Future adapters (APIs) only need to implement this interface.

import type { RawWorld, WorldIssue } from '../engine/types';
import type { AttributeOverrides } from '../engine/store/overrides';

export type DataIssue = WorldIssue;

export interface LoadResult {
  world: RawWorld;
  /** Hand-edited attribute values, if the source has any (attributes.csv). */
  attributeCsv?: string;
  issues: DataIssue[];
}

export interface DataSource {
  readonly kind: string;
  load(): Promise<LoadResult>;
}

/** Minimal file access so the same adapter works with Node fs and the browser File API. */
export interface FileProvider {
  /** Returns the file's text, or null if it does not exist. */
  readText(name: string): Promise<string | null>;
}

/** FileProvider over an in-memory map (browser uploads, tests). */
export class MemoryFileProvider implements FileProvider {
  constructor(private files: Record<string, string>) {}
  async readText(name: string): Promise<string | null> {
    const key = Object.keys(this.files).find((k) => k.toLowerCase() === name.toLowerCase() || k.toLowerCase().endsWith('/' + name.toLowerCase()));
    return key === undefined ? null : this.files[key];
  }
}
