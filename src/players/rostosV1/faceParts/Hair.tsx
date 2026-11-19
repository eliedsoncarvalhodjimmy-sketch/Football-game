// VERSÃO v1 CONGELADA — não alterar (ver ../faceGenerator.ts).
// Cabelo: 34 estilos e 7 cores (preto, castanho escuro, castanho claro, loiro, loiro platinado, ruivo, grisalho).
// Três camadas: atrás da cabeça (cabelo comprido, coques, dreads), à frente dos ombros (dreads e tranças pendentes)
// e por cima da cabeça (a "calote" com a linha do cabelo, texturas, degradê e brilhos).
import type { Ctx, HairColorId, PaletaCabelo } from './contexto.ts';
import { P, arcoPontos, caminho, contornoBolhas, contornoPontas, curvaAberta, curvaFechada, n, subRand, tom, traco, type Pt, type Rand } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

export const CORES_CABELO: Record<HairColorId, { nome: string; base: string }> = {
  preto: { nome: 'Preto', base: '#1f1b1a' },
  castanho_escuro: { nome: 'Castanho escuro', base: '#3d2719' },
  castanho_claro: { nome: 'Castanho claro', base: '#7d5434' },
  loiro: { nome: 'Loiro', base: '#c8a25c' },
  loiro_platinado: { nome: 'Loiro platinado', base: '#e9e0c6' },
  ruivo: { nome: 'Ruivo', base: '#a9502b' },
  grisalho: { nome: 'Grisalho', base: '#8e8c89' },
};

export function paletaCabelo(id: HairColorId): PaletaCabelo {
  const base = CORES_CABELO[id].base;
  const claro = id === 'loiro_platinado' || id === 'loiro' || id === 'grisalho';
  return { base, sombra: tom(base, claro ? -0.3 : -0.42), luz: tom(base, id === 'preto' ? 0.2 : claro ? 0.35 : 0.25) };
}

export type Textura = 'liso' | 'ondulado' | 'cacheado' | 'crespo' | 'careca';
export interface EstiloCabelo { id: string; nome: string; textura: Textura; corForcada?: HairColorId }

/** Os 34 estilos (o id é o que fica guardado nos traços do rosto). */
export const ESTILOS_CABELO: EstiloCabelo[] = [
  { id: 'fade_curto', nome: 'Curto com degradê', textura: 'liso' },
  { id: 'fade_top_crespo', nome: 'Degradê com topo crespo', textura: 'crespo' },
  { id: 'black_power', nome: 'Black power', textura: 'crespo' },
  { id: 'cacheado_medio', nome: 'Cacheado médio', textura: 'cacheado' },
  { id: 'liso_curto', nome: 'Liso curto', textura: 'liso' },
  { id: 'liso_tras', nome: 'Liso penteado para trás', textura: 'liso' },
  { id: 'ondulado_medio', nome: 'Ondulado médio', textura: 'ondulado' },
  { id: 'moicano', nome: 'Moicano', textura: 'liso' },
  { id: 'moicano_risca', nome: 'Moicano com risca', textura: 'crespo' },
  { id: 'careca', nome: 'Careca', textura: 'careca' },
  { id: 'raspado', nome: 'Rapado', textura: 'careca' },
  { id: 'dreads_compridos', nome: 'Dreads compridos', textura: 'crespo' },
  { id: 'dreads_presos', nome: 'Dreads presos', textura: 'crespo' },
  { id: 'trancas', nome: 'Tranças', textura: 'crespo' },
  { id: 'cornrows', nome: 'Tranças cornrows', textura: 'crespo' },
  { id: 'rabo_cavalo', nome: 'Rabo de cavalo', textura: 'liso' },
  { id: 'top_knot', nome: 'Coque no topo', textura: 'ondulado' },
  { id: 'loiro_descolorido', nome: 'Loiro descolorido', textura: 'crespo', corForcada: 'loiro_platinado' },
  { id: 'ruivo', nome: 'Ruivo ondulado', textura: 'ondulado', corForcada: 'ruivo' },
  { id: 'grisalho', nome: 'Grisalho clássico', textura: 'liso', corForcada: 'grisalho' },
  { id: 'comprido_liso', nome: 'Comprido liso', textura: 'liso' },
  { id: 'comprido_ondulado', nome: 'Comprido ondulado', textura: 'ondulado' },
  { id: 'franja', nome: 'Franja', textura: 'liso' },
  { id: 'militar', nome: 'Corte militar', textura: 'liso' },
  { id: 'risca_lateral', nome: 'Risca ao lado', textura: 'liso' },
  { id: 'topete', nome: 'Topete', textura: 'liso' },
  { id: 'crespo_curto', nome: 'Crespo curto', textura: 'crespo' },
  { id: 'twists', nome: 'Twists', textura: 'crespo' },
  { id: 'entradas', nome: 'Calvície com entradas', textura: 'liso' },
  { id: 'desgrenhado', nome: 'Desgrenhado', textura: 'liso' },
  { id: 'caracois_compridos', nome: 'Caracóis compridos', textura: 'cacheado' },
  { id: 'texturizado', nome: 'Texturizado com franja curta', textura: 'liso' },
  { id: 'cortina', nome: 'Risca ao meio', textura: 'ondulado' },
  { id: 'ondas_360', nome: 'Ondas 360', textura: 'crespo' },
];
export const ESTILO_POR_ID: Record<string, EstiloCabelo> = Object.fromEntries(ESTILOS_CABELO.map((e) => [e.id, e]));

// ---------------------------------------------------------------- formas base

interface OpCapa {
  /** Volume acima do crânio (px) e afastamento nos lados. */
  vol: number;
  lado: number;
  /** Linha do cabelo ao centro (px abaixo do topo do crânio) e entradas nas têmporas. */
  linha?: number;
  entradas?: number;
  /** Até onde descem os lados (y). */
  baixo: number;
  /** Contorno exterior: liso, bolhas grandes (caracóis), bolhas pequenas (crespo) ou pontas. */
  borda: 'liso' | 'bolhas' | 'bolhasPeq' | 'pontas';
  /** Franja: a linha do cabelo passa a ser uma franja (madeixas em ponta) que desce até este y. */
  franja?: number;
  /** Os lados descem a enquadrar a cara (cabelo comprido): x a partir da cara. */
  enquadra?: boolean;
  pontas?: number;
  /** Tufos na linha do cabelo (altura, px): quebra a linha lisa de "capacete". */
  tufos?: number;
}

/** Pontos do contorno exterior (da base do lado esquerdo, por cima, até à base do lado direito). */
function exterior(c: Ctx, o: OpCapa, k: number): Pt[] {
  const { g } = c;
  const cyE = g.temporaY + 4;
  // Cabelo com corpo: soma volume e largura, menos nos cortes rentes ao couro cabeludo.
  const rente = o.vol <= 2.5;
  const vol = o.vol + (rente ? 0 : 4), lado = o.lado + (rente ? 0 : 1.5);
  const rx = g.w(cyE) + lado, ry = cyE - (g.topo - vol);
  const arco = arcoPontos(g.cx, cyE, rx, ry, 180, 360, k);
  const lx = g.w(o.baixo) + lado * 0.35 + (o.enquadra ? 3 : 0);
  return [P(g.cx - lx, o.baixo), ...arco, P(g.cx + lx, o.baixo)];
}

/** Pontos da linha do cabelo (da base do lado direito à base do lado esquerdo). */
function interior(c: Ctx, o: OpCapa): Pt[] {
  const { g } = c;
  const hl = g.topo + (o.linha ?? 20), e = o.entradas ?? 0;
  const dir: Pt[] = [];
  if (o.enquadra) {
    dir.push(P(g.cx + g.w(o.baixo) - 1.5, o.baixo), P(g.cx + g.w(g.olhoY) - 2.5, g.olhoY), P(g.cx + g.w(g.temporaY + 6) - 4, g.temporaY + 6));
  } else {
    dir.push(P(g.cx + g.w(o.baixo) - 4, o.baixo), P(g.cx + g.w(g.temporaY + 3) - 2.2, g.temporaY + 3));
  }
  dir.push(P(g.cx + g.testaW - 8 - e, hl + 3 - e * 1.6), P(g.cx + 11, hl + 0.8), P(g.cx, hl));
  const esq = dir.slice(0, -1).reverse().map((p) => P(2 * g.cx - p.x, p.y));
  return [...dir, ...esq];
}

/** Calote do cabelo (path d). */
function capa(c: Ctx, o: OpCapa, r: Rand): string {
  const ext = exterior(c, o, o.borda === 'bolhasPeq' ? 26 : o.borda === 'bolhas' ? 15 : o.borda === 'pontas' ? 11 : 8);
  let d: string;
  if (o.borda === 'liso') d = curvaAberta(ext, 1);
  else if (o.borda === 'pontas') d = contornoPontas(ext, o.pontas ?? 6, r);
  else d = contornoBolhas(ext, false, r, o.borda === 'bolhas' ? 0.55 : 0.5);
  let di: string;
  if (o.franja !== undefined) {
    // Franja com madeixas em ponta: lados até à franja e, entre eles, pontas viradas para baixo.
    const { g } = c, f = o.franja;
    const W = g.w(f) - 3;
    const dir = [P(g.cx + g.w(o.baixo) - 4, o.baixo), P(g.cx + W, f - 1)];
    const fr: Pt[] = [];
    for (let k = 0; k <= 6; k++) { const u = 1 - (2 * k) / 6; fr.push(P(g.cx + u * W, f + 1.5 * (1 - u * u))); }
    const esq = [P(g.cx - W, f - 1), P(g.cx - g.w(o.baixo) + 4, o.baixo)];
    di = curvaAberta(dir, 1).replace(/^M/, 'L') + contornoPontas(fr, o.pontas ? 3.5 : 2.6, r).replace(/^M[-\d. ]+/, '') + curvaAberta(esq, 1).replace(/^M/, 'L');
  } else if (o.tufos) {
    // Linha do cabelo com tufos: lados lisos, testa em pontas pequenas viradas para baixo.
    const int = interior(c, o);
    const m = Math.floor(int.length / 2), a = m - 2, b = m + 2;
    const testa: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8, p0 = int[a], p1 = int[m], p2 = int[b];
      const x = (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x, y = (1 - u) * (1 - u) * p0.y + 2 * u * (1 - u) * (p1.y + 1.5) + u * u * p2.y;
      testa.push(P(x, y));
    }
    di = curvaAberta(int.slice(0, a + 1), 1).replace(/^M/, 'L') + contornoPontas(testa, o.tufos, r).replace(/^M[-\d. ]+/, '') + curvaAberta(int.slice(b), 1).replace(/^M/, 'L');
  } else di = curvaAberta(interior(c, o), 1).replace(/^M/, 'L');
  return d + di + 'Z';
}

/** Degradê nos lados (das têmporas à patilha), com gradiente vertical. */
function degrade(c: Ctx, forte = 0.9, risca = false): string {
  const { g, id, cabelo } = c;
  const y0 = g.temporaY - 10, y1 = g.orelhaTopo + 9;
  let s = `<linearGradient id="${id}fd" x1="0" y1="${n(y0)}" x2="0" y2="${n(y1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${cabelo.base}" stop-opacity="${n(forte)}"/><stop offset="1" stop-color="${cabelo.base}" stop-opacity=".12"/></linearGradient>`;
  for (const lado of [-1, 1]) {
    const fora: Pt[] = [], dentro: Pt[] = [];
    for (let y = y0; y <= y1; y += 4) { fora.push(P(g.cx + lado * (g.w(y) + 0.8), y)); dentro.push(P(g.cx + lado * (g.w(y) - 5.5), y + 1)); }
    s += `<path d="${curvaFechada([...fora, ...dentro.reverse()], 0.6)}" fill="url(#${id}fd)"/>`;
    if (risca && lado === 1) s += `<path d="M${n(g.cx + g.w(g.temporaY) - 4)} ${n(g.temporaY - 3)}l3 6" fill="none" ${traco(1, c.pele.luz)}/>`;
  }
  return s;
}

/** Texturas (recortadas pela calote). */
function fiosLisos(c: Ctx, o: OpCapa, r: Rand, tras = false): string {
  const { g, cabelo } = c;
  const hl = g.topo + (o.linha ?? 20);
  let d = '', l = '';
  for (let k = 0; k < 15; k++) {
    const u = -0.95 + (k / 14) * 1.9 + (r() - 0.5) * 0.1;
    const x0 = g.cx + u * (g.testaW - 4), y0 = hl + 2 + Math.abs(u) * 7;
    const x1 = g.cx + u * (tras ? 10 : g.testaW * 0.5) + (r() - 0.5) * 4, y1 = g.topo - o.vol * (tras ? 0.3 : 0.6) + r() * 4;
    const cx1 = g.cx + u * (g.testaW + 4), cy1 = (y0 + y1) / 2 - 3;
    d += `M${n(x0)} ${n(y0)}Q${n(cx1)} ${n(cy1)} ${n(x1)} ${n(y1)}`;
    // Mechas claras ao lado de algumas linhas (dão volume).
    if (k % 3 === 1) l += `M${n(x0 + 1.4)} ${n(y0 - 2)}Q${n(cx1 + 1.4)} ${n(cy1)} ${n(x1 + 1.2)} ${n(y1 + 3)}`;
  }
  const brilho = `M${n(g.cx - g.testaW * 0.62)} ${n(g.topo + 12)}Q${n(g.cx - 12)} ${n(g.topo - o.vol + 1.5)} ${n(g.cx + 8)} ${n(g.topo - o.vol * 0.7 + 3)}`;
  return `<path d="${d}" fill="none" ${traco(1, cabelo.sombra)}/><path d="${l}" fill="none" ${traco(1.4, cabelo.luz)} opacity=".55"/><path d="${brilho}" fill="none" ${traco(3.2, cabelo.luz)} opacity=".45"/>`;
}

function fiosOndulados(c: Ctx, o: OpCapa, r: Rand): string {
  const { g, cabelo } = c;
  const hl = g.topo + (o.linha ?? 20);
  let d = '', l = '';
  for (let k = 0; k < 8; k++) {
    const u = -0.85 + (k / 7) * 1.7;
    const x0 = g.cx + u * (g.testaW - 4), y0 = hl + 2 + Math.abs(u) * 5;
    const y1 = g.topo - o.vol * 0.7, x1 = g.cx + u * g.testaW * 0.4;
    d += `M${n(x0)} ${n(y0)}C${n(x0 + 6 + r() * 3)} ${n(y0 - 8)} ${n(x0 - 5 - r() * 3)} ${n(y1 + 9)} ${n(x1)} ${n(y1)}`;
    if (k % 2) l += `M${n(x0 + 2)} ${n(y0 - 4)}c4 -4 -3 -8 1 -13`;
  }
  return `<path d="${d}" fill="none" ${traco(1, cabelo.sombra)} opacity=".85"/><path d="${l}" fill="none" ${traco(1.6, cabelo.luz)} opacity=".55"/>`;
}

function caracois(c: Ctx, o: OpCapa, r: Rand, tamanho: number): string {
  const { g, cabelo } = c;
  let d = '', l = '';
  const y0 = g.topo - o.vol + tamanho, y1 = Math.max(g.topo + (o.linha ?? 20), o.baixo - 4);
  for (let y = y0; y < y1; y += tamanho * 1.6) {
    const meia = g.w(Math.max(y, g.topo + 6)) + o.lado;
    for (let x = g.cx - meia; x < g.cx + meia; x += tamanho * 1.9) {
      const xx = x + (r() - 0.5) * tamanho, yy = y + (r() - 0.5) * tamanho;
      d += `M${n(xx)} ${n(yy)}a${n(tamanho * 0.75)} ${n(tamanho * 0.75)} 0 1 1 ${n(tamanho * 1.2)} ${n(tamanho * 0.55)}`;
      if (r() < 0.45) l += `M${n(xx + tamanho * 0.3)} ${n(yy - tamanho * 0.5)}a${n(tamanho * 0.5)} ${n(tamanho * 0.5)} 0 0 1 ${n(tamanho * 0.8)} 0`;
    }
  }
  return `<path d="${d}" fill="none" ${traco(tamanho > 2.8 ? 1.1 : 0.85, cabelo.sombra)}/><path d="${l}" fill="none" ${traco(0.9, cabelo.luz)} opacity=".7"/>`;
}

/** Padrão de textura crespa (miúda) usado como preenchimento. */
function padraoCrespo(c: Ctx): string {
  const { id, cabelo } = c;
  return `<pattern id="${id}cr" width="5" height="4.6" patternUnits="userSpaceOnUse"><path d="M.6 2.4a1.2 1.2 0 1 1 2.3.3M2.9 4.4a1 1 0 1 1 1.9-.2" fill="none" stroke="${cabelo.sombra}" stroke-width=".75" stroke-linecap="round"/><circle cx="3.9" cy="1.2" r=".55" fill="${cabelo.luz}" opacity=".7"/></pattern>`;
}

/** Desenha uma calote: forma, contorno, textura recortada. */
function desenharCapa(c: Ctx, o: OpCapa, textura: 'lisos' | 'tras' | 'ondulados' | 'caracois' | 'crespo' | 'nada', r: Rand, nome = 'c'): string {
  const { id, cabelo } = c;
  const d = capa(c, o, r);
  let s = `<clipPath id="${id}h${nome}"><path d="${d}"/></clipPath><path d="${d}" fill="${cabelo.base}"/><g clip-path="url(#${id}h${nome})">`;
  if (textura === 'lisos') s += fiosLisos(c, o, r);
  else if (textura === 'tras') s += fiosLisos(c, o, r, true);
  else if (textura === 'ondulados') s += fiosOndulados(c, o, r);
  else if (textura === 'caracois') s += caracois(c, o, r, 3.4);
  else if (textura === 'crespo') s += padraoCrespo(c) + `<path d="${d}" fill="url(#${id}cr)"/><path d="M${n(c.g.cx - 22)} ${n(c.g.topo - o.vol + 6)}q22 -6 40 2" fill="none" ${traco(3, cabelo.luz)} opacity=".3"/>`;
  s += `</g><path d="${d}" fill="none" ${traco(2.1)}/>`;
  return s;
}

// ---------------------------------------------------------------- elementos pendentes (dreads, tranças, cabelo comprido)

/** Um dread ou trança: tubo com contorno e marcas. */
function tubo(pts: Pt[], larg: number, cor: PaletaCabelo, tipo: 'dread' | 'tranca'): string {
  const d = curvaAberta(pts, 1);
  let marcas = '';
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i];
    for (let t = 0.25; t < 1; t += 0.5) {
      const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
      marcas += tipo === 'tranca' ? `M${n(x - larg * 0.45)} ${n(y - 1)}l${n(larg * 0.45)} 1.6l${n(larg * 0.45)} -1.6` : `M${n(x - larg * 0.4)} ${n(y)}l${n(larg * 0.8)} .6`;
    }
  }
  return `<path d="${d}" fill="none" ${traco(larg + 2.2)}/><path d="${d}" fill="none" ${traco(larg, cor.base)}/><path d="${marcas}" fill="none" ${traco(0.7, cor.sombra)}/>`;
}

function pendentes(c: Ctx, r: Rand, tipo: 'dread' | 'tranca', frente: boolean): string {
  const { g, cabelo } = c;
  const larg = tipo === 'dread' ? 4.6 : 3.2;
  let s = '';
  if (!frente) {
    // Atrás da cabeça: leque de dreads até aos ombros.
    for (let k = -6; k <= 6; k++) {
      const x0 = g.cx + k * 5.6, y0 = g.temporaY;
      const x1 = g.cx + k * 6.4 + (r() - 0.5) * 4, y1 = 176 + r() * 12;
      s += tubo([P(x0, y0), P(x0 + k * 1.2, (y0 + y1) / 2), P(x1, y1)], larg, cabelo, tipo);
    }
    return s;
  }
  // À frente dos ombros: 3 de cada lado, por fora da cara.
  for (const lado of [-1, 1]) for (let k = 0; k < 3; k++) {
    // Por fora da cara: seguem o contorno da cabeça (orelha incluída) e caem para os ombros.
    const off = 3 + k * (larg + 0.6);
    const y0 = g.temporaY + 2 + k * 2, ym = g.orelhaTopo + 6, yb = g.orelhaBase + 8;
    const y1 = 184 + r() * 12 - k * 3;
    s += tubo([P(g.cx + lado * (g.w(y0) + off - 2), y0), P(g.cx + lado * (g.w(ym) + off + 9), ym), P(g.cx + lado * (g.w(yb) + off + 8), yb), P(g.cx + lado * (g.macasW + off + 7 + r() * 2), y1)], larg, cabelo, tipo);
  }
  return s;
}

/** Cabelo comprido atrás da cabeça (até aos ombros), liso, ondulado ou encaracolado. */
function compridoTras(c: Ctx, r: Rand, tipo: 'liso' | 'ondulado' | 'cacheado', fim = 178): string {
  const { g, cabelo } = c;
  const ext = g.macasW + (tipo === 'cacheado' ? 13 : 9);
  const pts: Pt[] = [P(g.cx - ext + 4, g.temporaY - 6), P(g.cx - ext, g.macasY + 10), P(g.cx - ext + 1, fim - 12), P(g.cx - ext + 6, fim), P(g.cx, fim + 3), P(g.cx + ext - 6, fim), P(g.cx + ext - 1, fim - 12), P(g.cx + ext, g.macasY + 10), P(g.cx + ext - 4, g.temporaY - 6), P(g.cx, g.topo)];
  const d = tipo === 'liso' ? curvaFechada(pts, 0.9) : contornoBolhas([...arcoPontos(g.cx, g.temporaY, ext - 3, g.temporaY - g.topo + 4, 180, 360, 8), P(g.cx + ext, g.macasY + 18), P(g.cx + ext - 2, fim - 10), P(g.cx + ext - 10, fim), P(g.cx, fim + 2), P(g.cx - ext + 10, fim), P(g.cx - ext + 2, fim - 10), P(g.cx - ext, g.macasY + 18)], true, r, tipo === 'cacheado' ? 0.5 : 0.25);
  let fios = '';
  for (let k = 0; k < 10; k++) { const x = g.cx - ext + 5 + k * ((2 * ext - 10) / 9); fios += `M${n(x)} ${n(g.macasY)}q${n((r() - 0.5) * 6)} ${n((fim - g.macasY) / 2)} ${n((r() - 0.5) * 4)} ${n(fim - g.macasY - 6)}`; }
  return `<path d="${d}" fill="${tom(cabelo.base, -0.12)}" ${traco(2.1)}/><path d="${fios}" fill="none" ${traco(0.9, cabelo.sombra)} opacity=".8"/>`;
}

/** Coque (top knot / dreads presos): bola por cima da cabeça, atrás da calote. */
function coque(c: Ctx, r: Rand, dreads: boolean): string {
  const { g, cabelo } = c;
  const x = g.cx + 1, y = g.topo - 9, rr = dreads ? 12 : 9.5;
  let s = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${cabelo.base}" ${traco(2.1)}/>`;
  if (dreads) for (let k = 0; k < 6; k++) s += `<path d="M${n(x - rr + 3 + k * 3.6)} ${n(y - rr * 0.6)}q${n((r() - 0.5) * 3)} ${n(rr * 0.6)} 0 ${n(rr * 1.3)}" fill="none" ${traco(0.8, cabelo.sombra)}/>`;
  else s += `<path d="M${n(x - 6)} ${n(y - 2)}q6 -6 12 0M${n(x - 5)} ${n(y + 3)}q5 -4 10 0" fill="none" ${traco(0.9, cabelo.sombra)}/><path d="M${n(x - 4)} ${n(y - 6)}q4 -2 7 0" fill="none" ${traco(1.6, cabelo.luz)} opacity=".6"/>`;
  return s + `<path d="M${n(x - rr * 0.7)} ${n(y + rr * 0.8)}q${n(rr * 0.7)} 3 ${n(rr * 1.4)} 0" fill="none" ${traco(2.4, '#2a2a2a')}/>`;
}

// ---------------------------------------------------------------- estilos

/** Camada de trás (antes do pescoço). */
export function desenharCabeloTras(c: Ctx): string {
  const r = subRand(c.t.seed, 'cabelo-tras');
  switch (c.t.cabelo) {
    case 'dreads_compridos': return pendentes(c, r, 'dread', false);
    case 'trancas': return pendentes(c, r, 'tranca', false);
    case 'dreads_presos': return coque(c, r, true);
    case 'top_knot': return coque(c, r, false);
    case 'comprido_liso': return compridoTras(c, r, 'liso');
    case 'comprido_ondulado': return compridoTras(c, r, 'ondulado');
    case 'caracois_compridos': return compridoTras(c, r, 'cacheado', c.g.queixoY + 14);
    case 'rabo_cavalo': {
      const { g, cabelo } = c;
      const d = `M${n(g.cx + 14)} ${n(g.topo + 30)}C${n(g.cx + 40)} ${n(g.topo + 40)} ${n(g.cx + 44)} ${n(150)} ${n(g.cx + 36)} ${n(182)}C${n(g.cx + 30)} ${n(184)} ${n(g.cx + 26)} ${n(178)} ${n(g.cx + 28)} ${n(150)}C${n(g.cx + 30)} ${n(g.topo + 60)} ${n(g.cx + 20)} ${n(g.topo + 46)} ${n(g.cx + 8)} ${n(g.topo + 40)}Z`;
      return caminho(d, tom(cabelo.base, -0.1), traco(2.1));
    }
    default: return '';
  }
}

/** Camada à frente dos ombros (depois da camisola). */
export function desenharCabeloOmbros(c: Ctx): string {
  const r = subRand(c.t.seed, 'cabelo-ombros');
  if (c.t.cabelo === 'dreads_compridos') return pendentes(c, r, 'dread', true);
  if (c.t.cabelo === 'trancas') return pendentes(c, r, 'tranca', true);
  return '';
}

/** Camada da frente (por cima da cabeça). */
export function desenharCabeloFrente(c: Ctx): string {
  const { g, cabelo, pele, id } = c;
  const r = subRand(c.t.seed, 'cabelo');
  const ot = g.orelhaTopo;
  switch (c.t.cabelo) {
    case 'fade_curto': return degrade(c) + desenharCapa(c, { vol: 4.5, lado: 1.5, linha: 19, baixo: g.temporaY + 2, borda: 'pontas', pontas: 2.2, tufos: 2.4 }, 'lisos', r);
    case 'fade_top_crespo': case 'loiro_descolorido':
      return degrade(c) + desenharCapa(c, { vol: 9, lado: 2.5, linha: 20, baixo: g.temporaY + 1, borda: 'bolhasPeq' }, 'crespo', r);
    case 'black_power': return desenharCapa(c, { vol: 21, lado: 13, linha: 20, baixo: ot + 2, borda: 'bolhasPeq' }, 'crespo', r);
    case 'cacheado_medio': return desenharCapa(c, { vol: 13, lado: 7, linha: 21, baixo: ot + 10, borda: 'bolhas', tufos: 3 }, 'caracois', r);
    case 'liso_curto': return desenharCapa(c, { vol: 5.5, lado: 2.5, linha: 22, baixo: ot + 4, borda: 'pontas', pontas: 2, tufos: 3 }, 'lisos', r);
    case 'liso_tras': case 'rabo_cavalo': return desenharCapa(c, { vol: 7, lado: 2, linha: 17, entradas: 1, baixo: ot + 3, borda: 'liso', tufos: 1.2 }, 'tras', r);
    case 'ondulado_medio': case 'ruivo': return desenharCapa(c, { vol: 10, lado: 4.5, linha: 20, baixo: ot + 10, borda: 'bolhas', tufos: 3.5 }, 'ondulados', r);
    case 'moicano': case 'moicano_risca': {
      const crespo = c.t.cabelo === 'moicano_risca';
      const base = degrade(c, 0.55, crespo);
      const d = `M${n(g.cx - 9)} ${n(g.topo + 20)}C${n(g.cx - 12)} ${n(g.topo + 4)} ${n(g.cx - 10)} ${n(g.topo - 8)} ${n(g.cx)} ${n(g.topo - 14)}C${n(g.cx + 10)} ${n(g.topo - 8)} ${n(g.cx + 12)} ${n(g.topo + 4)} ${n(g.cx + 9)} ${n(g.topo + 20)}Q${n(g.cx)} ${n(g.topo + 22)} ${n(g.cx - 9)} ${n(g.topo + 20)}Z`;
      const tex = crespo ? padraoCrespo(c) + `<path d="${d}" fill="url(#${id}cr)"/>` : `<path d="M${n(g.cx - 4)} ${n(g.topo + 18)}l-1 -26M${n(g.cx + 3)} ${n(g.topo + 18)}l1 -26" fill="none" ${traco(0.9, cabelo.sombra)}/>`;
      const lados = `<path d="${curvaFechada([P(g.cx - g.testaW - 0.5, g.temporaY), ...arcoPontos(g.cx, g.temporaY + 4, g.w(g.temporaY + 4) + 0.5, g.temporaY + 4 - g.topo + 0.5, 180, 360, 8), P(g.cx + g.testaW + 0.5, g.temporaY), P(g.cx + g.testaW - 6, g.topo + 22), P(g.cx - g.testaW + 6, g.topo + 22)], 0.6)}" fill="${cabelo.base}" opacity=".35"/>`;
      return base + lados + caminho(d, cabelo.base) + tex + caminho(d, 'none', traco(2));
    }
    case 'careca': {
      const sombra = r() < 0.4 ? `<path d="${curvaAberta(arcoPontos(g.cx, g.temporaY + 6, g.w(g.temporaY + 6) + 0.3, g.temporaY + 6 - g.topo, 180, 360, 10), 1)}" fill="none" ${traco(5, cabelo.base)} opacity=".12"/>` : '';
      return sombra + `<ellipse cx="${n(g.cx - 8)}" cy="${n(g.topo + 10)}" rx="13" ry="5" fill="#ffffff" opacity=".22"/>`;
    }
    case 'raspado': {
      const d = capa(c, { vol: 0.8, lado: 0.6, linha: 19, baixo: ot + 4, borda: 'liso' }, r);
      return padraoCrespo(c) + `<path d="${d}" fill="${cabelo.base}" opacity=".5"/><path d="${d}" fill="url(#${id}cr)" opacity=".6"/><ellipse cx="${n(g.cx - 8)}" cy="${n(g.topo + 9)}" rx="12" ry="4" fill="#ffffff" opacity=".12"/>`;
    }
    case 'dreads_compridos': case 'trancas': case 'dreads_presos': {
      const o: OpCapa = { vol: 4, lado: 2, linha: 19, baixo: ot + 2, borda: 'liso' };
      const d = capa(c, o, r);
      let raizes = '';
      for (let k = -5; k <= 5; k++) raizes += `M${n(g.cx + k * 6)} ${n(g.topo + 19 + Math.abs(k) * 0.8)}Q${n(g.cx + k * 7.5)} ${n(g.topo + 4)} ${n(g.cx + k * 3)} ${n(g.topo - 3)}`;
      return caminho(d, cabelo.base) + `<g clip-path="url(#${id}hdr)"><clipPath id="${id}hdr"><path d="${d}"/></clipPath><path d="${raizes}" fill="none" ${traco(1.4, cabelo.sombra)}/><path d="${raizes}" fill="none" ${traco(0.6, cabelo.luz)} opacity=".5" transform="translate(1.5 0)"/></g>` + caminho(d, 'none', traco(2.1));
    }
    case 'cornrows': {
      const o: OpCapa = { vol: 2.5, lado: 1, linha: 19, baixo: ot + 2, borda: 'liso' };
      const d = capa(c, o, r);
      let linhas = '', marcas = '';
      for (let k = -4; k <= 4; k++) {
        const x0 = g.cx + k * 7.2, y0 = g.topo + 19 + Math.abs(k) * 1.4;
        linhas += `M${n(x0 + 3.6)} ${n(y0)}Q${n(g.cx + k * 9.5 + 3.6)} ${n(g.topo + 6)} ${n(g.cx + k * 6 + 3)} ${n(g.topo - 4)}`;
        for (let t = 0; t < 4; t++) { const y = y0 - 4 - t * 6.5; marcas += `M${n(x0 - 2 + k * t * 0.4)} ${n(y)}l2 1.6l2 -1.6`; }
      }
      return degrade(c, 0.4) + caminho(d, cabelo.base) + `<clipPath id="${id}hcr"><path d="${d}"/></clipPath><g clip-path="url(#${id}hcr)"><path d="${linhas}" fill="none" ${traco(1.2, pele.sombraForte)}/><path d="${marcas}" fill="none" ${traco(0.7, cabelo.luz)} opacity=".6"/></g>` + caminho(d, 'none', traco(2.1));
    }
    case 'top_knot': return degrade(c, 0.6) + desenharCapa(c, { vol: 5, lado: 1.5, linha: 18, baixo: g.temporaY + 1, borda: 'liso' }, 'tras', r);
    case 'grisalho': case 'risca_lateral': {
      const o: OpCapa = { vol: 7, lado: 2.5, linha: 20, entradas: c.t.idade > 32 ? 2 : 0.5, baixo: ot + 4, borda: 'pontas', pontas: 1.6, tufos: 1.6 };
      const risca = `M${n(g.cx - 13)} ${n(g.topo + 19)}Q${n(g.cx - 14)} ${n(g.topo + 8)} ${n(g.cx - 11)} ${n(g.topo - 2)}`;
      return desenharCapa(c, o, 'lisos', r) + `<path d="${risca}" fill="none" ${traco(1.4, pele.sombraForte)}/>`;
    }
    case 'comprido_liso': return desenharCapa(c, { vol: 6, lado: 3, linha: 19, baixo: ot + 14, borda: 'liso', tufos: 1.5 }, 'lisos', r) + `<path d="M${n(g.cx)} ${n(g.topo + 19)}L${n(g.cx + 1)} ${n(g.topo - 4)}" fill="none" ${traco(1.2, pele.sombraForte)}/>`;
    case 'comprido_ondulado': return desenharCapa(c, { vol: 8, lado: 5, linha: 19, baixo: ot + 16, borda: 'bolhas', tufos: 2.5 }, 'ondulados', r);
    case 'caracois_compridos': return desenharCapa(c, { vol: 13, lado: 8, linha: 20, baixo: g.narizY + 4, borda: 'bolhas', enquadra: true, tufos: 3 }, 'caracois', r);
    case 'cortina': return desenharCapa(c, { vol: 7, lado: 4, linha: 18, baixo: ot + 12, borda: 'bolhas' }, 'ondulados', r) + `<path d="M${n(g.cx)} ${n(g.topo + 18)}C${n(g.cx - 4)} ${n(g.topo + 26)} ${n(g.cx - 16)} ${n(g.topo + 28)} ${n(g.cx - g.testaW + 6)} ${n(g.temporaY + 6)}M${n(g.cx)} ${n(g.topo + 18)}C${n(g.cx + 4)} ${n(g.topo + 26)} ${n(g.cx + 16)} ${n(g.topo + 28)} ${n(g.cx + g.testaW - 6)} ${n(g.temporaY + 6)}" fill="none" ${traco(1.8)}/>`;
    case 'franja': return desenharCapa(c, { vol: 8, lado: 4, baixo: ot + 7, borda: 'liso', franja: g.sobrancelhaY - 4 }, 'lisos', r);
    case 'militar': return degrade(c, 0.5) + desenharCapa(c, { vol: 2.2, lado: 0.8, linha: 20, baixo: g.temporaY + 3, borda: 'liso', tufos: 1 }, 'lisos', r);
    case 'topete': return degrade(c) + desenharCapa(c, { vol: 12, lado: 2, linha: 18, baixo: g.temporaY + 1, borda: 'pontas', pontas: 4.5, tufos: 1.5 }, 'tras', r);
    case 'crespo_curto': return desenharCapa(c, { vol: 5.5, lado: 2.5, linha: 20, baixo: ot + 3, borda: 'bolhasPeq' }, 'crespo', r);
    case 'twists': {
      let s = degrade(c) + desenharCapa(c, { vol: 9, lado: 2.5, linha: 20, baixo: g.temporaY + 1, borda: 'bolhas' }, 'nada', r);
      let k = '';
      for (let y = g.topo - 5; y < g.topo + 18; y += 5.5) for (let x = g.cx - g.testaW + 5; x < g.cx + g.testaW - 4; x += 5.5) {
        if (Math.hypot((x - g.cx) / (g.testaW + 2), (y - g.temporaY) / (g.temporaY - g.topo + 9)) > 1) continue;
        k += `M${n(x + (r() - 0.5) * 2)} ${n(y + 2)}q-1.6 -3.4 0 -5q1.6 1.6 0 5`;
      }
      s += `<path d="${k}" fill="${cabelo.luz}" opacity=".35" ${traco(0.8, cabelo.sombra)}/>`;
      return s;
    }
    case 'entradas': {
      const o: OpCapa = { vol: 2, lado: 2, linha: 9, entradas: 7, baixo: ot + 4, borda: 'liso' };
      const d = capa(c, o, r);
      // Topo ralo (transparente) e lados mais cheios.
      return `<path d="${d}" fill="${cabelo.base}" opacity=".35"/>` + degrade(c, 0.95) + `<ellipse cx="${n(g.cx - 6)}" cy="${n(g.topo + 12)}" rx="11" ry="4" fill="#ffffff" opacity=".18"/>`;
    }
    case 'desgrenhado': return desenharCapa(c, { vol: 11, lado: 6, baixo: ot + 6, borda: 'pontas', pontas: 7, franja: g.sobrancelhaY - 6 }, 'lisos', r);
    case 'texturizado': return degrade(c) + desenharCapa(c, { vol: 6, lado: 2, baixo: g.temporaY + 1, borda: 'pontas', pontas: 3, franja: g.topo + 17 }, 'lisos', r);
    case 'ondas_360': {
      const d = capa(c, { vol: 2.2, lado: 1, linha: 19, baixo: ot + 3, borda: 'liso' }, r);
      let ondas = '';
      for (let k = 1; k <= 5; k++) ondas += `M${n(g.cx - k * 6)} ${n(g.topo + 8 + k)}q${n(k * 3)} -3 ${n(k * 6)} 0q${n(k * 3)} 3 ${n(k * 6)} 0`;
      return caminho(d, cabelo.base) + `<clipPath id="${id}hw"><path d="${d}"/></clipPath><g clip-path="url(#${id}hw)"><path d="${ondas}" fill="none" ${traco(1, cabelo.luz)} opacity=".45"/></g>` + caminho(d, 'none', traco(2));
    }
    default: return desenharCapa(c, { vol: 5, lado: 2, linha: 20, baixo: ot + 3, borda: 'liso' }, 'lisos', r);
  }
}

export function Hair({ ctx, camada }: { ctx: Ctx; camada: 'tras' | 'ombros' | 'frente' }) {
  const m = camada === 'tras' ? desenharCabeloTras(ctx) : camada === 'ombros' ? desenharCabeloOmbros(ctx) : desenharCabeloFrente(ctx);
  return <SvgLayer markup={m} />;
}
