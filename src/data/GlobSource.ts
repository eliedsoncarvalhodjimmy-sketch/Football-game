// Adaptador para o browser: os pacotes são empacotados pelo Vite no build.
import type { DataSource } from './DataSource.ts';

const ficheiros = import.meta.glob('/packs/**/*.{json,csv}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export class GlobSource implements DataSource {
  async listarPacotes(): Promise<string[]> {
    const s = new Set<string>();
    for (const k of Object.keys(ficheiros)) s.add(k.split('/')[2]);
    return [...s].sort();
  }
  async lerTexto(pacote: string, caminho: string): Promise<string | null> {
    return ficheiros[`/packs/${pacote}/${caminho}`] ?? null;
  }
  async listarFicheiros(pacote: string, subpasta: string): Promise<string[]> {
    const pref = `/packs/${pacote}/${subpasta}/`;
    return Object.keys(ficheiros).filter((k) => k.startsWith(pref)).map((k) => k.slice(pref.length)).sort();
  }
}
