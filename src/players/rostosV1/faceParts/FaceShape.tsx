// VERSÃO v1 CONGELADA — não alterar (ver ../faceGenerator.ts).
// Formato do rosto: 6 formatos (oval, redondo, quadrado, comprido, triangular, diamante) com pequenas variações contínuas.
// Também desenha as orelhas (sempre visíveis), a cabeça com contorno grosso, o sombreamento simples e as rugas da idade.
import type { Ctx, FaceShapeId, FaceTraits, Geo } from './contexto.ts';
import { P, caminho, curvaFechada, n, traco, type Pt } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** Meias-larguras e alturas de cada formato (antes das variações). */
export const FORMATOS: Record<FaceShapeId, { nome: string; testa: number; macas: number; maxilar: number; queixo: number; queixoY: number; topo: number }> = {
  oval: { nome: 'Oval', testa: 39.5, macas: 41, maxilar: 35, queixo: 15, queixoY: 152, topo: 31 },
  redondo: { nome: 'Redondo', testa: 41, macas: 43, maxilar: 39, queixo: 20, queixoY: 149, topo: 32 },
  quadrado: { nome: 'Quadrado', testa: 40.5, macas: 41.5, maxilar: 40, queixo: 21, queixoY: 151, topo: 31 },
  comprido: { nome: 'Comprido', testa: 37, macas: 38.5, maxilar: 33, queixo: 14.5, queixoY: 157, topo: 28 },
  triangular: { nome: 'Triangular', testa: 39.5, macas: 40.5, maxilar: 31.5, queixo: 10, queixoY: 155, topo: 31 },
  diamante: { nome: 'Diamante', testa: 36, macas: 43, maxilar: 33, queixo: 12.5, queixoY: 153, topo: 32 },
};
export const IDS_FORMATO = Object.keys(FORMATOS) as FaceShapeId[];

/** Geometria da cabeça a partir do formato, das variações e da idade (os mais novos têm a cara mais redonda e curta). */
export function calcularGeo(t: FaceTraits): Geo {
  const f = FORMATOS[t.forma], a = t.ajuste;
  const jovem = t.idade < 18 ? (18 - Math.max(15, t.idade)) / 3 : 0; // 0–1
  const cx = 100;
  const topo = f.topo + a.topo;
  const queixoY = f.queixoY + a.altura - jovem * 3;
  const testaW = f.testa + a.testa;
  const macasW = f.macas + a.macas + jovem * 0.8;
  const maxilarW = f.maxilar + a.maxilar + jovem * 2;
  const queixoW = f.queixo + a.queixo + jovem * 3;
  const temporaY = topo + 29;
  const macasY = 101;
  const maxilarY = queixoY - 23;
  const olhoY = 98 + a.altOlhos - jovem;
  const narizY = olhoY + (queixoY - olhoY) * 0.4;
  const bocaY = olhoY + (queixoY - olhoY) * 0.665;
  const contorno: Pt[] = [
    P(cx, topo), P(cx + testaW * 0.6, topo + 2.2), P(cx + testaW * 0.9, topo + 10), P(cx + testaW, temporaY), P(cx + macasW, macasY - 8),
    P(cx + macasW - 1.2, macasY + 9), P(cx + maxilarW, maxilarY), P(cx + queixoW, queixoY - 4.5), P(cx, queixoY),
  ];
  const w = (y: number) => {
    if (y <= contorno[0].y) return 0;
    for (let i = 1; i < contorno.length; i++) {
      const p = contorno[i - 1], q = contorno[i];
      if (y <= q.y) { const u = (y - p.y) / (q.y - p.y || 1); const s = Math.sin((u * Math.PI) / 2); return p.x - cx + (q.x - p.x) * (i <= 2 ? s : u); }
    }
    return 0;
  };
  return {
    cx, topo, temporaY, macasY, maxilarY, queixoY, testaW, macasW, maxilarW, queixoW,
    olhoY, olhoDX: 20.5 + a.olhos, sobrancelhaY: olhoY - 12.5, narizY, bocaY,
    orelhaTopo: olhoY - 8, orelhaBase: narizY + 2.5, pescocoW: 23.5 + a.pescoco, contorno, w,
  };
}

/** Caminho da cabeça inteira (contorno direito + espelho). */
export function caminhoCabeca(g: Geo): string {
  const dir = g.contorno;
  const esq = dir.slice(1, -1).reverse().map((p) => P(2 * g.cx - p.x, p.y));
  return curvaFechada([...dir, ...esq], 1);
}

/** Orelhas (atrás da cabeça), com o desenho interior. */
export function desenharOrelhas(c: Ctx): string {
  const { g, pele } = c;
  let s = '';
  for (const lado of [-1, 1]) {
    const xa = g.cx + lado * (g.w(g.orelhaTopo + 8) - 2.5), t0 = g.orelhaTopo, t1 = g.orelhaBase;
    const X = (dx: number) => n(xa + lado * dx);
    const d = `M${X(0)} ${n(t0 + 1)}C${X(9)} ${n(t0 - 5)} ${X(15)} ${n(t0 + 4)} ${X(12.5)} ${n(t0 + 14)}C${X(11.5)} ${n(t1 - 5)} ${X(7)} ${n(t1 + 2.5)} ${X(-1)} ${n(t1)}Z`;
    s += caminho(d, pele.base, traco(2.1));
    // Concha interior: sombra em "C" e hélice.
    s += caminho(`M${X(2)} ${n(t0 + 5)}C${X(7)} ${n(t0 + 1.5)} ${X(10)} ${n(t0 + 7)} ${X(8.5)} ${n(t0 + 13)}C${X(7.5)} ${n(t1 - 6)} ${X(5)} ${n(t1 - 3)} ${X(2)} ${n(t1 - 4)}C${X(5)} ${n(t1 - 8)} ${X(6)} ${n(t0 + 12)} ${X(2)} ${n(t0 + 5)}Z`, pele.sombra);
    s += `<path d="M${X(3)} ${n(t0 + 6)}C${X(7.5)} ${n(t0 + 4)} ${X(8.5)} ${n(t0 + 10)} ${X(6.5)} ${n(t0 + 15)}" fill="none" ${traco(1.1, pele.linha)}/>`;
  }
  return s;
}

/** Cabeça com o contorno grosso. */
export function desenharCabeca(c: Ctx): string {
  return caminho(caminhoCabeca(c.g), c.pele.base, traco(2.3));
}

/** Sombreamento simples (recortado pela cabeça): lado direito, maxilar, órbitas; luz na testa e na maçã esquerda. */
export function desenharSombras(c: Ctx): string {
  const { g, pele, id } = c;
  let s = `<clipPath id="${id}cab"><path d="${caminhoCabeca(g)}"/></clipPath><g clip-path="url(#${id}cab)">`;
  // Lado direito em sombra (meia-lua) e base do maxilar.
  s += `<ellipse cx="${n(g.cx + g.macasW + 17)}" cy="${n(g.macasY + 6)}" rx="${n(24)}" ry="${n(78)}" fill="${pele.sombra}"/>`;
  s += `<ellipse cx="${n(g.cx - g.macasW - 21)}" cy="${n(g.macasY + 6)}" rx="${n(24)}" ry="${n(78)}" fill="${pele.sombra}" opacity=".45"/>`;
  s += `<path d="M${n(g.cx - g.maxilarW - 4)} ${n(g.maxilarY - 2)}Q${n(g.cx)} ${n(g.queixoY + 4)} ${n(g.cx + g.maxilarW + 4)} ${n(g.maxilarY - 2)}L${n(g.cx + g.maxilarW + 4)} ${n(g.queixoY + 10)}L${n(g.cx - g.maxilarW - 4)} ${n(g.queixoY + 10)}Z" fill="${pele.sombra}" opacity=".55"/>`;
  // Órbitas (junto ao nariz) e sombra sob o lábio inferior.
  for (const lado of [-1, 1]) s += `<ellipse cx="${n(g.cx + lado * (g.olhoDX - 5))}" cy="${n(g.olhoY - 2.5)}" rx="7" ry="4.5" fill="${pele.sombra}" opacity=".45"/>`;
  s += `<ellipse cx="${n(g.cx)}" cy="${n(g.bocaY + 8.5)}" rx="6.5" ry="2.6" fill="${pele.sombra}" opacity=".7"/>`;
  // Maçãs do rosto (linha de sombra sob a maçã) e luz.
  s += `<path d="M${n(g.cx + g.macasW - 3)} ${n(g.macasY - 2)}Q${n(g.cx + g.macasW - 11)} ${n(g.macasY + 10)} ${n(g.cx + g.maxilarW - 6)} ${n(g.maxilarY + 2)}" fill="none" ${traco(3.5, pele.sombra)} opacity=".7"/>`;
  s += `<ellipse cx="${n(g.cx - 7)}" cy="${n(g.topo + 26)}" rx="15" ry="7" fill="${pele.luz}" opacity=".7"/>`;
  s += `<ellipse cx="${n(g.cx - g.olhoDX - 2)}" cy="${n(g.macasY + 6)}" rx="7" ry="4" fill="${pele.luz}" opacity=".55"/>`;
  return s + '</g>';
}

/** Rugas e linhas de expressão (mais de 30 anos): testa, pés de galinha, sulcos nasolabiais. */
export function desenharRugas(c: Ctx): string {
  const { g, t, pele } = c;
  if (!t.rugas) return '';
  const cor = pele.linha, op = t.rugas === 2 ? '.6' : '.4';
  let d = '';
  // Sulcos nasolabiais.
  for (const lado of [-1, 1]) {
    const x0 = g.cx + lado * 9, y0 = g.narizY - 1;
    d += `M${n(x0)} ${n(y0)}Q${n(x0 + lado * 6)} ${n(y0 + 9)} ${n(x0 + lado * 5)} ${n(g.bocaY + 4)}`;
    // Pés de galinha.
    const xe = g.cx + lado * (g.olhoDX + 11);
    d += `M${n(xe)} ${n(g.olhoY - 2)}l${n(lado * 3.5)} -1.5M${n(xe + lado * 0.5)} ${n(g.olhoY + 1)}l${n(lado * 3.5)} 0.8`;
  }
  // Testa.
  const linhas = t.rugas === 2 ? 3 : 2;
  for (let k = 0; k < linhas; k++) { const y = g.topo + 24 + k * 4.5; d += `M${n(g.cx - 13 + k * 2)} ${n(y)}q${n(13 - k * 2)} -2 ${n(26 - k * 4)} 0`; }
  if (t.rugas === 2) for (const lado of [-1, 1]) d += `M${n(g.cx + lado * (g.olhoDX - 3))} ${n(g.olhoY + 6.5)}q${n(lado * 5)} 2.5 ${n(lado * 10)} 0`;
  return `<path d="${d}" fill="none" ${traco(1, cor)} opacity="${op}"/>`;
}

/** Componente React: orelhas, cabeça e sombras. */
export function FaceShape({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharOrelhas(ctx) + desenharCabeca(ctx) + desenharSombras(ctx) + desenharRugas(ctx)} />;
}
