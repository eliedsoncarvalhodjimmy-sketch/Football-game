// VERSÃO v1 CONGELADA — não alterar (ver ../faceGenerator.ts).
// Utilitários partilhados pelo gerador de rostos: PRNG determinístico, escolhas ponderadas, cores e curvas.
// Tudo produz texto SVG (sem DOM), para ser rápido e funcionar também num Web Worker.

/** Gerador pseudo-aleatório mulberry32: devolve números em [0, 1). */
export type Rand = () => number;

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash de texto para semente de 32 bits (variante do cyrb53, reduzida a 32 bits). */
export function hashSeed(texto: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Sub-gerador com semente própria (para os detalhes de uma camada não mexerem nas escolhas das outras). */
export const subRand = (seed: number, camada: string): Rand => mulberry32(seed ^ hashSeed(camada));

/** Escolha ponderada: [valor, peso][]. */
export function ponderado<T>(r: Rand, itens: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, p] of itens) total += Math.max(0, p);
  let x = r() * total;
  for (const [v, p] of itens) {
    x -= Math.max(0, p);
    if (x < 0) return v;
  }
  return itens[itens.length - 1][0];
}

export const entre = (r: Rand, a: number, b: number) => a + (b - a) * r();
export const inteiro = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Número compacto para o SVG (1 casa decimal). */
export const n = (x: number): string => {
  const v = Math.round(x * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};

// ---------------------------------------------------------------- cores

const hexRgb = (h: string): [number, number, number] => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const rgbHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');

/** Mistura duas cores hex (t = 0 → a; t = 1 → b). */
export function misturar(a: string, b: string, t: number): string {
  const x = hexRgb(a), y = hexRgb(b);
  return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
/** Escurece (q < 0) ou clareia (q > 0) uma cor. */
export const tom = (c: string, q: number) => (q < 0 ? misturar(c, '#000000', -q) : misturar(c, '#ffffff', q));

/** Só aceita cores #rrggbb (as cores dos clubes chegam de fora). */
export const corSegura = (c: string, omissao: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : omissao);

// ---------------------------------------------------------------- geometria

export interface Pt { x: number; y: number }
export const P = (x: number, y: number): Pt => ({ x, y });

/** Curva suave fechada por pontos (Catmull-Rom → Bézier cúbicas). */
export function curvaFechada(ps: Pt[], tensao = 1): string {
  const k = ps.length;
  let d = `M${n(ps[0].x)} ${n(ps[0].y)}`;
  for (let i = 0; i < k; i++) {
    const p0 = ps[(i - 1 + k) % k], p1 = ps[i], p2 = ps[(i + 1) % k], p3 = ps[(i + 2) % k];
    const t = tensao / 6;
    d += `C${n(p1.x + (p2.x - p0.x) * t)} ${n(p1.y + (p2.y - p0.y) * t)} ${n(p2.x - (p3.x - p1.x) * t)} ${n(p2.y - (p3.y - p1.y) * t)} ${n(p2.x)} ${n(p2.y)}`;
  }
  return d + 'Z';
}

/** Curva suave aberta por pontos. */
export function curvaAberta(ps: Pt[], tensao = 1): string {
  const k = ps.length;
  let d = `M${n(ps[0].x)} ${n(ps[0].y)}`;
  for (let i = 0; i < k - 1; i++) {
    const p0 = ps[Math.max(0, i - 1)], p1 = ps[i], p2 = ps[i + 1], p3 = ps[Math.min(k - 1, i + 2)];
    const t = tensao / 6;
    d += `C${n(p1.x + (p2.x - p0.x) * t)} ${n(p1.y + (p2.y - p0.y) * t)} ${n(p2.x - (p3.x - p1.x) * t)} ${n(p2.y - (p3.y - p1.y) * t)} ${n(p2.x)} ${n(p2.y)}`;
  }
  return d;
}

/** Contorno com "bolhas" (caracóis, afro): arcos entre pontos consecutivos, abaulados para fora. */
export function contornoBolhas(ps: Pt[], fechar = true, r: Rand | null = null, abaulamento = 0.62): string {
  let d = `M${n(ps[0].x)} ${n(ps[0].y)}`;
  const k = ps.length;
  for (let i = 0; i < (fechar ? k : k - 1); i++) {
    const a = ps[i], b = ps[(i + 1) % k];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // Normal para fora (sentido horário em coordenadas de ecrã).
    const nx = dy / len, ny = -dx / len;
    const f = abaulamento * (r ? 0.75 + 0.5 * r() : 1);
    d += `Q${n((a.x + b.x) / 2 + nx * len * f)} ${n((a.y + b.y) / 2 + ny * len * f)} ${n(b.x)} ${n(b.y)}`;
  }
  return fechar ? d + 'Z' : d;
}

/** Contorno com pontas (cabelo espetado): entre pontos consecutivos sobe uma ponta para fora. */
export function contornoPontas(ps: Pt[], altura: number, r: Rand): string {
  let d = `M${n(ps[0].x)} ${n(ps[0].y)}`;
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i], b = ps[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = dy / len, ny = -dx / len, h = altura * (0.6 + 0.8 * r());
    const t = 0.35 + 0.4 * r();
    d += `Q${n(a.x + dx * 0.2 + nx * h * 0.4)} ${n(a.y + dy * 0.2 + ny * h * 0.4)} ${n(a.x + dx * t + nx * h)} ${n(a.y + dy * t + ny * h)}`;
    d += `Q${n(a.x + dx * 0.8 + nx * h * 0.3)} ${n(a.y + dy * 0.8 + ny * h * 0.3)} ${n(b.x)} ${n(b.y)}`;
  }
  return d;
}

/** Pontos de uma elipse (de ângulo a até b, em graus; 0 = direita, 90 = baixo). */
export function arcoPontos(cx: number, cy: number, rx: number, ry: number, a: number, b: number, k: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= k; i++) {
    const t = ((a + ((b - a) * i) / k) * Math.PI) / 180;
    out.push(P(cx + rx * Math.cos(t), cy + ry * Math.sin(t)));
  }
  return out;
}

/** Atributos de traço preto habituais. */
export const CONTORNO = '#1c1514';
export const traco = (w: number, cor = CONTORNO) => `stroke="${cor}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"`;
export const caminho = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
