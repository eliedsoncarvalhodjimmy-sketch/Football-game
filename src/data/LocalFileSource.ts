// Adaptador de ficheiros locais para Node (CLI, testes, benchmark).
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DataSource } from './DataSource.ts';

export class LocalFileSource implements DataSource {
  constructor(private raiz: string) {}

  async listarPacotes(): Promise<string[]> {
    const nomes = await readdir(this.raiz);
    const out: string[] = [];
    for (const n of nomes) {
      if ((await stat(join(this.raiz, n))).isDirectory() && !n.startsWith('.')) out.push(n);
    }
    return out.sort();
  }

  async lerTexto(pacote: string, caminho: string): Promise<string | null> {
    try {
      return await readFile(join(this.raiz, pacote, caminho), 'utf8');
    } catch {
      return null;
    }
  }

  async listarFicheiros(pacote: string, subpasta: string): Promise<string[]> {
    try {
      return (await readdir(join(this.raiz, pacote, subpasta))).sort();
    } catch {
      return [];
    }
  }
}
