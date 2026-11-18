// Acessórios e marcas: brincos, tatuagem no pescoço, cicatriz, sardas e óculos.
// Cada um tem a sua posição na ordem das camadas (ver faceGenerator.ts).
import type { Ctx } from './contexto.ts';
import { n, subRand, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** Sardas (bochechas e nariz). */
export function desenharSardas(c: Ctx): string {
  if (!c.t.acessorios.sardas) return '';
  const { g, pele } = c;
  const r = subRand(c.t.seed, 'sardas');
  let s = '';
  for (let k = 0; k < 34; k++) {
    const lado = k % 2 ? 1 : -1;
    const x = g.cx + lado * (4 + r() * (g.olhoDX + 6)), y = g.olhoY + 6 + r() * 12;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.45 + r() * 0.35)}" fill="${tom(pele.base, -0.32)}" opacity=".75"/>`;
  }
  return s;
}

/** Cicatriz: na sobrancelha (corta-a) ou na bochecha, com pontos. */
export function desenharCicatriz(c: Ctx): string {
  const { g, pele, t } = c;
  if (!t.acessorios.cicatriz) return '';
  if (t.acessorios.cicatriz === 1) {
    const x = g.cx + g.olhoDX + 3, y = g.sobrancelhaY;
    return `<path d="M${n(x)} ${n(y - 4)}l2 8" fill="none" ${traco(1.6, pele.base)}/><path d="M${n(x - 0.6)} ${n(y - 4)}l2 8" fill="none" ${traco(0.7, pele.linha)}/>`;
  }
  const x = g.cx - g.olhoDX - 4, y = g.macasY + 5;
  return `<path d="M${n(x - 5)} ${n(y - 2)}l10 5" fill="none" ${traco(1.4, tom(pele.base, 0.12))}/><path d="M${n(x - 5)} ${n(y - 2)}l10 5M${n(x - 3)} ${n(y - 2.2)}l-.8 2M${n(x)} ${n(y - 0.7)}l-.8 2M${n(x + 3)} ${n(y + 0.8)}l-.8 2" fill="none" ${traco(0.7, pele.linha)}/>`;
}

/** Tatuagem no pescoço: lado (escrita e rosa) ou frente (asas). Desenhada sobre o pescoço, antes da gola. */
export function desenharTatuagem(c: Ctx): string {
  const { g, t } = c;
  const tipo = t.acessorios.tatuagem;
  if (!tipo) return '';
  const cor = '#1f2a33', op = t.pele >= 6 ? '.55' : '.75';
  if (tipo === 1) {
    const x = g.cx + g.pescocoW - 9, y = g.queixoY + 10;
    return `<g opacity="${op}"><path d="M${n(x)} ${n(y)}c3 1 4 4 2 7c-2 3 1 5 3 6M${n(x - 2)} ${n(y + 3)}q2 4 0 8" fill="none" ${traco(0.9, cor)}/>` +
      `<circle cx="${n(x + 2)}" cy="${n(y + 19)}" r="3" fill="none" ${traco(0.9, cor)}/><path d="M${n(x + 2)} ${n(y + 16)}q-2 3 0 6q2 -3 0 -6" fill="none" ${traco(0.8, cor)}/>` +
      `<path d="M${n(x - 4)} ${n(y + 25)}l3 -2l2 3l3 -2" fill="none" ${traco(0.8, cor)}/></g>`;
  }
  const y = g.queixoY + 26;
  return `<g opacity="${op}"><path d="M${n(g.cx)} ${n(y)}c-4 -4 -10 -4 -14 -1c4 0 7 2 9 4c-3 -1 -7 0 -9 2c4 -1 9 0 14 2zM${n(g.cx)} ${n(y)}c4 -4 10 -4 14 -1c-4 0 -7 2 -9 4c3 -1 7 0 9 2c-4 -1 -9 0 -14 2z" fill="none" ${traco(0.8, cor)}/></g>`;
}

/** Brincos (nos lóbulos). */
export function desenharBrincos(c: Ctx): string {
  const { g, t } = c;
  const k = t.acessorios.brincos;
  if (!k) return '';
  const cor = t.acessorios.brincoTipo === 'dourado' ? '#d9b44a' : '#f2f4f7';
  let s = '';
  for (const lado of k === 2 ? [-1, 1] : [-1]) {
    const x = g.cx + lado * (g.w(g.orelhaBase - 2) + 4.5), y = g.orelhaBase - 1.5;
    s += t.acessorios.brincoTipo === 'argola'
      ? `<circle cx="${n(x)}" cy="${n(y + 2.6)}" r="2.4" fill="none" stroke="${CORES_METAL.argola}" stroke-width="1.1"/>`
      : `<circle cx="${n(x)}" cy="${n(y)}" r="1.6" fill="${cor}" stroke="#2b2b2b" stroke-width=".6"/><circle cx="${n(x - 0.5)}" cy="${n(y - 0.5)}" r=".5" fill="#ffffff"/>`;
  }
  return s;
}
const CORES_METAL = { argola: '#c9ccd2' };

/** Óculos (raros): armação fina ou grossa, lentes transparentes. */
export function desenharOculos(c: Ctx): string {
  const { g, t } = c;
  const k = t.acessorios.oculos;
  if (!k) return '';
  const w = k === 2 ? 2.2 : 1.2, cor = k === 2 ? '#1c1c1c' : '#5a4a3a';
  let s = '';
  for (const lado of [-1, 1]) {
    const x = g.cx + lado * g.olhoDX;
    s += `<rect x="${n(x - 10)}" y="${n(g.olhoY - 6.5)}" width="20" height="13" rx="4" fill="#ffffff" fill-opacity=".12" ${traco(w, cor)}/>`;
    s += `<path d="M${n(x + lado * 10)} ${n(g.olhoY - 3)}L${n(g.cx + lado * (g.w(g.olhoY) + 1))} ${n(g.olhoY - 4.5)}" fill="none" ${traco(w, cor)}/>`;
  }
  return s + `<path d="M${n(g.cx - g.olhoDX + 10)} ${n(g.olhoY - 2.5)}q${n(g.olhoDX - 10)} -3 ${n(2 * (g.olhoDX - 10))} 0" fill="none" ${traco(w, cor)}/>`;
}

/** Componente React: acessórios por cima do rosto (sardas, cicatriz, brincos, óculos). */
export function Accessories({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharSardas(ctx) + desenharCicatriz(ctx) + desenharBrincos(ctx) + desenharOculos(ctx)} />;
}
