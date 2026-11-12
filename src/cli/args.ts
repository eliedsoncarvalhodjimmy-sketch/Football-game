// Leitura simples de argumentos --chave valor / --flag.
export function args(): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) { out._ = a[i]; continue; }
    const k = a[i].slice(2);
    if (a[i + 1] && !a[i + 1].startsWith('--')) out[k] = a[++i];
    else out[k] = true;
  }
  return out;
}

export const RAIZ_PACKS = new URL('../../packs/', import.meta.url).pathname;
