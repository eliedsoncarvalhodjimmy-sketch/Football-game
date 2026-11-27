// Prompt 11, Bloco 2: efeitos visuais, portados tal como estavam de `cutscene-realista/index.html` (cover, logo,
// glow, streak, raios, partículas, vinheta) — só a assinatura muda (recebem `ctx`, `W`, `H` em vez de globais do
// protótipo). Não alterar o aspecto sem aprovação do utilizador.
import { clamp, rnd } from './utilitarios.ts';

export interface OpcoesCover { zoom?: number; fx?: number; fy?: number; ax?: number; ay?: number; alpha?: number; px?: number; py?: number }

/** Desenha uma imagem a cobrir um rectângulo, com zoom e ponto de foco (fx,fy) colocado em (ax,ay). */
export function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, o: OpcoesCover = {}) {
  const { zoom = 1, fx = 0.5, fy = 0.5, ax = 0.5, ay = 0.5, alpha = 1, px = 0, py = 0 } = o;
  if (!img || alpha <= 0) return;
  const r = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * r, ih = img.height * r;
  let dx = x + ax * w - fx * iw + px * w, dy = y + ay * h - fy * ih + py * h;
  dx = Math.min(x, Math.max(x + w - iw, dx)); dy = Math.min(y, Math.max(y + h - ih, dy));
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalAlpha = alpha; ctx.drawImage(img, dx, dy, iw, ih); ctx.restore();
}

/** Desenha um logótipo/imagem centrado em (cx,cy), quadrado de lado `size`. */
export function logo(ctx: CanvasRenderingContext2D, img: CanvasImageSource | null, cx: number, cy: number, size: number, alpha: number) {
  if (!img || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size); ctx.restore();
}

export function glow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rgb: string, a: number) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function streak(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, th: number, a: number, rgb: string) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(cx - len / 2, cy - th / 2, len, th); ctx.restore();
}

export function raios(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, t: number, a: number, rgb: string, n = 14) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy);
  const R0 = Math.max(w, h) * 1.2;
  for (let i = 0; i < n; i++) {
    const an = (i * Math.PI * 2) / n + t * 0.16;
    ctx.fillStyle = `rgba(${rgb},${(0.1 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an - 0.045) * R0, Math.sin(an - 0.045) * R0); ctx.lineTo(Math.cos(an + 0.045) * R0, Math.sin(an + 0.045) * R0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function particulas(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, mult: number, rgb: string, vel = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const N = 70;
  for (let i = 0; i < N; i++) {
    const x0 = rnd(i), y0 = rnd(i + 100), v = (0.012 + 0.04 * rnd(i + 200)) * vel, s = 0.7 + 2.2 * rnd(i + 300);
    const y = (((y0 - v * t) % 1) + 1) % 1, x = x0 + 0.02 * Math.sin(t * 0.7 + i);
    const a = clamp((0.1 + 0.45 * rnd(i + 400)) * mult, 0, 0.85);
    ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x * w, y * h, s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function vinheta(ctx: CanvasRenderingContext2D, w: number, h: number, a: number) {
  const g = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export const fnt = (s: number, weight = 800) => `${weight} ${Math.round(s)}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;

/** Maior tamanho de letra (até `size`) que cabe em `maxW`, para o texto `txt` no tipo de letra `fnt(s,weight)`. */
export function fitText(ctx: CanvasRenderingContext2D, txt: string, maxW: number, size: number, weight = 800): number {
  let s = size;
  ctx.font = fnt(s, weight);
  while (ctx.measureText(txt).width > maxW && s > 8) { s -= 1; ctx.font = fnt(s, weight); }
  return s;
}
