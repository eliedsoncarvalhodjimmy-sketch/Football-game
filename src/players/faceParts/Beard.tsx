// Barba: 12 variações (sem barba, 3 dias, pera, cavanhaque, barba cheia, bigode, barba curta, contorno fino, bigode + pera,
// barba comprida, barba aparada, 3 dias com bigode). Fios brancos nos mais velhos (20%).
// A barba é desenhada antes da boca: os lábios ficam por cima.
import type { Ctx } from './contexto.ts';
import { P, curvaFechada, n, subRand, tom, traco, type Pt } from './shared.ts';
import { FORMAS_BOCA } from './Mouth.tsx';
import { SvgLayer } from './Layer.tsx';

export const TIPOS_BARBA = [
  'Sem barba', 'Barba de 3 dias', 'Pera', 'Cavanhaque', 'Barba cheia', 'Bigode', 'Barba curta', 'Contorno fino',
  'Bigode e pera', 'Barba comprida', 'Barba aparada', 'Barba de 3 dias com bigode',
] as const;

/** Região da barba cheia (patilhas, bochechas, queixo e bigode). comp = quanto desce abaixo do queixo; bochecha = quanto sobe nas bochechas (0–1). */
function regiaoCheia(c: Ctx, comp: number, bochecha = 1): Pt[] {
  const { g } = c;
  const mw = FORMAS_BOCA[c.t.boca % FORMAS_BOCA.length].w * 1.08;
  const cx = g.cx, sy = g.orelhaTopo + 9;
  const r = subRand(c.t.seed, 'barba-borda');
  const dir: Pt[] = [];
  // Exterior: patilha → maxilar → queixo.
  for (let y = sy; y < g.maxilarY; y += 6) dir.push(P(cx + g.w(y) + 0.7, y));
  dir.push(P(cx + g.maxilarW + 0.8 + comp * 0.15, g.maxilarY + comp * 0.25));
  dir.push(P(cx + g.queixoW + 3 + comp * 0.35, g.queixoY - 3 + comp * 0.7));
  const fundo = P(cx, g.queixoY + comp);
  // Interior (de baixo para cima): bigode, lado da boca, linha da bochecha (irregular), patilha.
  const yB = g.narizY + (1 - bochecha) * 10;
  const inter: Pt[] = [
    P(cx + 3, g.narizY + 5.2), P(cx + 10, g.narizY + 6.2), P(cx + mw + 3, g.bocaY - 0.5),
    P(cx + mw + 5 + 3 * bochecha, yB + 6 + r() * 1.5), P(cx + g.w(yB) - 9 + r() * 1.5, yB + 1),
    P(cx + g.w(sy + 12) - 6 + r(), sy + 12), P(cx + g.w(sy) - 4.5, sy),
  ];
  const esq = (ps: Pt[]) => ps.map((p) => P(2 * cx - p.x, p.y));
  // Ordem: patilha dir. (exterior) ↓ fundo ↑ patilha esq. (exterior), interior esq. ↓ bigode → interior dir. ↑
  return [...dir, fundo, ...esq(dir).reverse(), ...esq(inter).reverse(), ...inter];
}

function regiaoCavanhaque(c: Ctx, comp: number, largo = false): Pt[] {
  const { g } = c;
  const mw = FORMAS_BOCA[c.t.boca % FORMAS_BOCA.length].w * 1.08;
  const cx = g.cx;
  const dir: Pt[] = [
    P(cx + 3, g.narizY + 5.2), P(cx + 10, g.narizY + 6.2), P(cx + mw + 3, g.bocaY - 0.5), P(cx + mw + 2.5 + (largo ? 3 : 0), g.bocaY + 6),
    P(cx + g.queixoW + (largo ? 5 : 1.5), g.queixoY - 5), P(cx + g.queixoW * 0.5, g.queixoY + comp * 0.8),
  ];
  return [...dir, P(cx, g.queixoY + comp), ...dir.slice().reverse().map((p) => P(2 * cx - p.x, p.y))];
}

function regiaoBigode(c: Ctx): Pt[] {
  const { g } = c;
  const mw = FORMAS_BOCA[c.t.boca % FORMAS_BOCA.length].w * 1.08, cima = FORMAS_BOCA[c.t.boca % FORMAS_BOCA.length].cima;
  const cx = g.cx;
  const dir: Pt[] = [P(cx + 2.5, g.narizY + 5), P(cx + 9, g.narizY + 5.8), P(cx + mw + 2.5, g.bocaY + 0.6), P(cx + mw - 0.5, g.bocaY - 0.6), P(cx + 6, g.bocaY - cima - 1.2)];
  return [...dir, P(cx, g.bocaY - cima - 0.6), ...dir.slice().reverse().map((p) => P(2 * cx - p.x, p.y))];
}

function regiaoPera(c: Ctx, tufo: boolean): Pt[] {
  const { g } = c;
  const cx = g.cx, y = g.bocaY + FORMAS_BOCA[c.t.boca % FORMAS_BOCA.length].baixo * 1.9 + 1.5;
  return tufo
    ? [P(cx - 3.2, y), P(cx + 3.2, y), P(cx + 6, g.queixoY - 3), P(cx + 3, g.queixoY + 2.5), P(cx, g.queixoY + 3.2), P(cx - 3, g.queixoY + 2.5), P(cx - 6, g.queixoY - 3)]
    : [P(cx - 3, y), P(cx + 3, y), P(cx + 1.2, y + 6), P(cx, y + 7), P(cx - 1.2, y + 6)];
}

function regiaoContorno(c: Ctx): Pt[] {
  const { g } = c;
  const cx = g.cx, sy = g.orelhaTopo + 9;
  const fora: Pt[] = [], dentro: Pt[] = [];
  for (let y = sy; y < g.maxilarY; y += 6) { fora.push(P(cx + g.w(y) + 0.7, y)); dentro.push(P(cx + g.w(y) - 3.2, y + 1)); }
  fora.push(P(cx + g.queixoW + 2.5, g.queixoY - 2)); dentro.push(P(cx + g.queixoW, g.queixoY - 5.5));
  const m = (ps: Pt[]) => ps.map((p) => P(2 * cx - p.x, p.y));
  return [...fora, P(cx, g.queixoY + 1.2), ...m(fora).reverse(), ...m(dentro), P(cx, g.queixoY - 3), ...dentro.slice().reverse()];
}

/** Barba sólida: forma cheia, contorno escuro e fios (recortados pela forma). */
function solida(c: Ctx, pts: Pt[], nome: string): string {
  const { id, barba, t, g } = c;
  const d = curvaFechada(pts, 0.9);
  const cor = t.barbaGrisalha ? tom(barba.base, 0.18) : barba.base;
  const r = subRand(t.seed, 'barba-fios' + nome);
  let fios = '', claros = '';
  const ys = Math.min(...pts.map((p) => p.y)), ye = Math.max(...pts.map((p) => p.y));
  for (let k = 0; k < 70; k++) {
    const y = ys + r() * (ye - ys), lado = r() < 0.5 ? -1 : 1, x = g.cx + lado * r() * (g.w(Math.min(y, g.queixoY - 1)) + 2);
    const l = 1.6 + r() * 1.8;
    fios += `M${n(x)} ${n(y)}l${n(lado * l * 0.35)} ${n(l)}`;
    if (k % 3 === 0) claros += `M${n(x + 1)} ${n(y)}l${n(lado * l * 0.3)} ${n(l * 0.9)}`;
  }
  let brancos = '';
  if (t.barbaGrisalha) for (let k = 0; k < 40; k++) { const y = ys + r() * (ye - ys), x = g.cx + (r() * 2 - 1) * g.w(Math.min(y, g.queixoY - 1)); brancos += `M${n(x)} ${n(y)}l${n((r() - 0.5) * 1.2)} ${n(1.6 + r())}`; }
  return `<clipPath id="${id}b${nome}"><path d="${d}"/></clipPath><path d="${d}" fill="${cor}"/>` +
    `<g clip-path="url(#${id}b${nome})"><path d="${fios}" fill="none" ${traco(0.8, barba.sombra)}/><path d="${claros}" fill="none" ${traco(0.6, barba.luz)} opacity=".6"/>` +
    (brancos ? `<path d="${brancos}" fill="none" ${traco(0.7, '#e9e6e2')} opacity=".9"/>` : '') + `</g>` +
    `<path d="${d}" fill="none" ${traco(1.1, tom(cor, -0.4))} opacity=".75"/>`;
}

/** Barba por fazer: tom ligeiro e pontos (padrão), com densidade variável. */
function pontos(c: Ctx, pts: Pt[], nome: string, densidade: number): string {
  const { id, barba, t } = c;
  const d = curvaFechada(pts, 0.9);
  const cor = t.barbaGrisalha ? '#8d8a86' : barba.base;
  const jovem = t.idade < 18 ? 0.55 : 1;
  return `<pattern id="${id}p${nome}" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><circle cx=".6" cy=".7" r=".42" fill="${cor}"/><circle cx="1.8" cy="1.9" r=".38" fill="${cor}"/></pattern>` +
    `<path d="${d}" fill="${cor}" opacity="${n(0.16 * densidade * jovem)}"/><path d="${d}" fill="url(#${id}p${nome})" opacity="${n(0.75 * densidade * jovem)}"/>`;
}

export function desenharBarba(c: Ctx): string {
  const b = c.t.barba;
  switch (b) {
    case 0: return '';
    case 1: return pontos(c, regiaoCheia(c, 1, 0.9), 'tres', 1);
    case 2: return solida(c, regiaoPera(c, true), 'pera');
    case 3: return solida(c, regiaoCavanhaque(c, 3), 'cav');
    case 4: return solida(c, regiaoCheia(c, 6, 1), 'cheia');
    case 5: return solida(c, regiaoBigode(c), 'big');
    case 6: return pontos(c, regiaoCheia(c, 2, 1), 'curta', 1.6) + solida(c, regiaoCavanhaque(c, 2), 'cav');
    case 7: return solida(c, regiaoContorno(c), 'cont') + pontos(c, regiaoBigode(c), 'bigp', 1.2);
    case 8: return solida(c, regiaoBigode(c), 'big') + solida(c, regiaoPera(c, false), 'pera');
    case 9: return solida(c, regiaoCheia(c, 15, 1), 'longa');
    case 10: return solida(c, regiaoCavanhaque(c, 3, true), 'apar') + pontos(c, regiaoCheia(c, 1, 0.6), 'aparp', 1.1);
    default: return pontos(c, regiaoCheia(c, 1, 0.8), 'tres', 1) + solida(c, regiaoBigode(c), 'big');
  }
}

export function Beard({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharBarba(ctx)} />;
}
