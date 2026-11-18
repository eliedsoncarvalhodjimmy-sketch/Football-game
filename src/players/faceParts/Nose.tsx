// Nariz: 10 variações (largo, fino, arrebitado, comprido, achatado, aquilino, médio, redondo, estreito comprido, curto).
// Linha da cana de um lado, sombra do outro, asas e ponta com contorno, narinas e um brilho na ponta.
import type { Ctx } from './contexto.ts';
import { n, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** w: meia-largura das asas; dy: desloca a base (+ mais comprido); ponta: tamanho da ponta; arrebitado: narinas visíveis; cana: força da linha da cana; bossa: bossa (aquilino). */
export const FORMAS_NARIZ: { nome: string; w: number; dy: number; ponta: number; arrebitado: number; cana: number; bossa: number }[] = [
  { nome: 'Largo', w: 9.6, dy: 0, ponta: 3.6, arrebitado: 0.2, cana: 0.6, bossa: 0 },
  { nome: 'Fino', w: 6, dy: 0.5, ponta: 2.6, arrebitado: 0, cana: 0.9, bossa: 0 },
  { nome: 'Arrebitado', w: 7.2, dy: -2.2, ponta: 3, arrebitado: 1, cana: 0.6, bossa: 0 },
  { nome: 'Comprido', w: 7.2, dy: 3.2, ponta: 3, arrebitado: 0, cana: 1, bossa: 0 },
  { nome: 'Achatado', w: 10.2, dy: -1.2, ponta: 3.8, arrebitado: 0.5, cana: 0.35, bossa: 0 },
  { nome: 'Aquilino', w: 7, dy: 1.8, ponta: 2.8, arrebitado: 0, cana: 1, bossa: 1 },
  { nome: 'Médio', w: 7.8, dy: 0, ponta: 3.1, arrebitado: 0.2, cana: 0.7, bossa: 0 },
  { nome: 'Redondo', w: 8.6, dy: 0.5, ponta: 4.4, arrebitado: 0.2, cana: 0.6, bossa: 0 },
  { nome: 'Estreito comprido', w: 5.8, dy: 3, ponta: 2.5, arrebitado: 0, cana: 1, bossa: 0.4 },
  { nome: 'Curto', w: 7.4, dy: -3, ponta: 3, arrebitado: 0.6, cana: 0.5, bossa: 0 },
];

export function desenharNariz(c: Ctx): string {
  const { g, t, pele } = c;
  const f = FORMAS_NARIZ[t.nariz % FORMAS_NARIZ.length];
  const cx = g.cx, y = g.narizY + f.dy, w = f.w * 1.08, topo = g.olhoY + 2;
  let s = '';
  // Sombra do lado direito da cana e da asa.
  s += `<path d="M${n(cx + 3)} ${n(topo)}C${n(cx + 4.5)} ${n(topo + 9)} ${n(cx + w * 0.55)} ${n(y - 9)} ${n(cx + w - 0.5)} ${n(y - 3.5)}C${n(cx + w * 0.6)} ${n(y - 5)} ${n(cx + 3)} ${n(y - 6)} ${n(cx + 1.5)} ${n(y - 9)}C${n(cx + 1.2)} ${n(topo + 8)} ${n(cx + 2)} ${n(topo + 4)} ${n(cx + 3)} ${n(topo)}Z" fill="${pele.sombra}"/>`;
  // Linha da cana (lado esquerdo), com bossa no aquilino.
  const bx = f.bossa ? -1.6 * f.bossa : 0;
  s += `<path d="M${n(cx - 4)} ${n(topo + 2)}C${n(cx - 4.5 + bx)} ${n(topo + 8)} ${n(cx - w * 0.5)} ${n(y - 10)} ${n(cx - w + 1)} ${n(y - 5.5)}" fill="none" ${traco(1.1, pele.linha)} opacity="${n(0.4 + 0.5 * f.cana)}"/>`;
  // Asas, ponta e base (contorno).
  const wl = cx - w, wr = cx + w, pt = f.ponta;
  const base = `M${n(wl + 1)} ${n(y - 6)}C${n(wl - 2.2)} ${n(y - 3)} ${n(wl - 1)} ${n(y + 1.5)} ${n(wl + 2.6)} ${n(y + 1.2)}` +
    `C${n(cx - pt - 1)} ${n(y + 1)} ${n(cx - pt)} ${n(y + 2.8 + pt * 0.3)} ${n(cx)} ${n(y + 2.6 + pt * 0.3)}` +
    `C${n(cx + pt)} ${n(y + 2.8 + pt * 0.3)} ${n(cx + pt + 1)} ${n(y + 1)} ${n(wr - 2.6)} ${n(y + 1.2)}` +
    `C${n(wr + 1)} ${n(y + 1.5)} ${n(wr + 2.2)} ${n(y - 3)} ${n(wr - 1)} ${n(y - 6)}`;
  s += `<path d="${base}" fill="none" ${traco(1.6)}/>`;
  // Narinas.
  const ny = y + 0.4 - f.arrebitado * 0.4, nr = 1.3 + f.arrebitado * 0.5;
  s += `<ellipse cx="${n(cx - w * 0.42)}" cy="${n(ny)}" rx="${n(nr + 0.6)}" ry="${n(nr * 0.7)}" fill="${pele.sombraForte}" transform="rotate(-18 ${n(cx - w * 0.42)} ${n(ny)})"/>`;
  s += `<ellipse cx="${n(cx + w * 0.42)}" cy="${n(ny)}" rx="${n(nr + 0.6)}" ry="${n(nr * 0.7)}" fill="${pele.sombraForte}" transform="rotate(18 ${n(cx + w * 0.42)} ${n(ny)})"/>`;
  // Brilho na ponta.
  s += `<ellipse cx="${n(cx - 0.5)}" cy="${n(y - 3.2)}" rx="${n(pt * 0.55)}" ry="${n(pt * 0.4)}" fill="${pele.luz}"/>`;
  return s;
}

export function Nose({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharNariz(ctx)} />;
}
