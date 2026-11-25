// Prompt 6B: os dados de referência (data/referencia/, dataset público do Transfermarkt) só servem para calibrar
// offline. Nenhum ficheiro do jogo os importa, não vão para o build da PWA nem para a cache do service worker.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
function ficheiros(d: string): string[] {
  return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? ficheiros(p) : [p]; });
}

describe('dados de referência fora do jogo', () => {
  it('nenhum ficheiro de src/ nem de public/ usa data/referencia (só o service worker, para a excluir)', () => {
    const maus = [...ficheiros(join(raiz, 'src')), ...ficheiros(join(raiz, 'public'))]
      .filter((f) => /\.(ts|tsx|js|json|html|webmanifest)$/.test(f) && !f.endsWith('sw.js'))
      // Só usos reais (import, fetch, glob, URL); os comentários que explicam a regra não contam.
      .filter((f) => readFileSync(f, 'utf8').split('\n').some((l) => l.includes('data/referencia') && !/^\s*(\/\/|\*|\/\*)/.test(l)));
    expect(maus).toEqual([]);
  });

  it('o service worker não põe data/referencia na cache; a pasta está no .gitignore', () => {
    expect(readFileSync(join(raiz, 'public/sw.js'), 'utf8')).toContain("includes('/data/referencia/')");
    expect(readFileSync(join(raiz, '.gitignore'), 'utf8')).toContain('data/referencia/');
  });
});
