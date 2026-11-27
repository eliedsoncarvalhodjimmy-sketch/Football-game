// Prompt 11: utilitários de animação (do protótipo `cutscene-realista/index.html`, tal como estavam).
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
/** Progresso 0–1 de `t` dentro do intervalo `r` ([início, fim]); 0 se `r` não existir (acto em falta na linha de tempo). */
export const prog = (t: number, r?: [number, number]) => (r ? clamp((t - r[0]) / (r[1] - r[0])) : 0);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** Ruído determinístico (não aleatório): mesmo índice → mesmo valor, sempre. */
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Claridade (0–1) de uma cor hex, para escolher texto escuro ou claro por cima. */
export function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
