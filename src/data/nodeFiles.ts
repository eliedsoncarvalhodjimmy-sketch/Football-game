// Node-only FileProvider (scripts and tests). Not imported by browser code.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileProvider } from './DataSource';

export class NodeFileProvider implements FileProvider {
  constructor(private dir: string) {}
  async readText(name: string): Promise<string | null> {
    try {
      return await readFile(join(this.dir, name), 'utf8');
    } catch {
      return null;
    }
  }
}
