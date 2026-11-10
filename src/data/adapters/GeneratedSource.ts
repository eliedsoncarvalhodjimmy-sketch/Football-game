// The fictional world generator, exposed as a DataSource.

import { generateWorld, type GenerateOptions } from '../../engine/generator/worldGenerator';
import type { DataSource, LoadResult } from '../DataSource';

export class GeneratedSource implements DataSource {
  readonly kind = 'generator';
  constructor(private opts: GenerateOptions = {}) {}
  async load(): Promise<LoadResult> {
    return { world: generateWorld(this.opts), issues: [] };
  }
}
