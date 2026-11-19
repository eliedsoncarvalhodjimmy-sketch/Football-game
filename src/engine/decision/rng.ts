// Aleatoriedade determinística do motor de decisão: mulberry32 com semente = hash do texto (FNV-1a).
// Nunca usa Math.random, Date.now ou crypto: o mesmo estado dá sempre o mesmo resultado.

/** Hash FNV-1a de 32 bits de um texto. */
export function hashTexto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Gerador mulberry32 (devolve valores em [0, 1)). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Um número em [0, 1) para uma chave (ex.: id do jogador + tick + tipo de acção). */
export function aleatorio(chave: string): number {
  return mulberry32(hashTexto(chave))();
}

/** Um número em [−1, 1) para uma chave. */
export function aleatorioSimetrico(chave: string): number {
  return aleatorio(chave) * 2 - 1;
}
