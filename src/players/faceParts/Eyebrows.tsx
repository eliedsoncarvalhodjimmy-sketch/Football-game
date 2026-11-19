// Sobrancelhas: 10 variações (grossas, finas, retas, arqueadas, juntas, angulares, densas, curtas, caídas, franzidas).
// Desenhadas como forma cheia afilada (grossa junto ao nariz, fina na ponta) com alguns pêlos marcados.
import type { Ctx } from './contexto.ts';
import { P, curvaFechada, n, subRand, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** dentro/fora: espessura; arco: altura do arco; pico: posição do arco (0–1); inicio: distância ao centro; comp: comprimento; queda: desce (+) ou sobe (−) a ponta. */
export const FORMAS_SOBRANCELHAS: { nome: string; dentro: number; fora: number; arco: number; pico: number; inicio: number; comp: number; queda: number }[] = [
  { nome: 'Grossas retas', dentro: 3.8, fora: 2.2, arco: 0.8, pico: 0.55, inicio: 6, comp: 18, queda: 0.5 },
  { nome: 'Grossas arqueadas', dentro: 3.7, fora: 2, arco: 3.2, pico: 0.55, inicio: 6, comp: 18, queda: 1.5 },
  { nome: 'Finas retas', dentro: 2, fora: 1.1, arco: 0.8, pico: 0.55, inicio: 6.5, comp: 17, queda: 0.5 },
  { nome: 'Finas arqueadas', dentro: 2, fora: 1.1, arco: 3.2, pico: 0.6, inicio: 6.5, comp: 17, queda: 1.6 },
  { nome: 'Juntas', dentro: 3.6, fora: 2.2, arco: 1.4, pico: 0.5, inicio: 2.2, comp: 21, queda: 0.8 },
  { nome: 'Angulares', dentro: 3.1, fora: 1.6, arco: 3.8, pico: 0.66, inicio: 6, comp: 18, queda: 2.4 },
  { nome: 'Densas', dentro: 4.5, fora: 2.8, arco: 1.6, pico: 0.5, inicio: 5, comp: 19, queda: 1 },
  { nome: 'Curtas', dentro: 3, fora: 1.8, arco: 1.6, pico: 0.5, inicio: 7, comp: 14, queda: 0.8 },
  { nome: 'Caídas', dentro: 3, fora: 1.8, arco: 1.6, pico: 0.4, inicio: 6, comp: 18, queda: 3.2 },
  { nome: 'Franzidas', dentro: 3.4, fora: 1.9, arco: 1.8, pico: 0.55, inicio: 5.5, comp: 18, queda: -1.6 },
];

/** Cor das sobrancelhas: a do cabelo, mais escura; os loiros e platinados ficam com castanho claro / loiro escuro. */
function corSobrancelha(c: Ctx): string {
  const b = c.t.corCabelo;
  if (b === 'loiro_platinado') return '#a88a5a';
  if (b === 'loiro') return tom('#9c7442', -0.05);
  if (b === 'grisalho') return '#6f6a66';
  return tom(c.cabelo.base, -0.15);
}

export function desenharSobrancelhas(c: Ctx): string {
  const { g, t } = c;
  const f0 = FORMAS_SOBRANCELHAS[t.sobrancelhas % FORMAS_SOBRANCELHAS.length];
  const f = { ...f0, comp: f0.comp * 1.15, inicio: f0.inicio * 0.9, dentro: f0.dentro * 1.12, fora: f0.fora * 1.05 };
  const cor = corSobrancelha(c);
  const r = subRand(t.seed, 'sobrancelhas');
  let s = '';
  for (const lado of [-1, 1]) {
    // Do canto interior para fora: linha média com arco e queda; o lado de cima e o de baixo afastam-se pela espessura.
    const x0 = g.cx + lado * f.inicio, y0 = g.sobrancelhaY + (f.queda < 0 ? 1.4 : 0);
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const arco = u < f.pico ? Math.sin((u / f.pico) * Math.PI / 2) : Math.cos(((u - f.pico) / (1 - f.pico)) * Math.PI / 2);
      const y = y0 - f.arco * arco + f.queda * u * u;
      const esp = f.dentro + (f.fora - f.dentro) * u;
      pts.push([x0 + lado * f.comp * u, y, esp]);
    }
    // Forma suave: borda de cima, ponta afilada, borda de baixo (a cabeça da sobrancelha, junto ao nariz, é arredondada).
    const cima = pts.map(([x, y, e]) => P(x, y - e / 2));
    const baixo = pts.map(([x, y, e]) => P(x, y + e / 2)).reverse();
    const ult = pts[pts.length - 1];
    const d = curvaFechada([...cima, P(ult[0] + lado * 2.2, ult[1] + 0.3), ...baixo, P(pts[0][0] - lado * 0.8, pts[0][1] + 0.3)], 0.8);
    s += `<path d="${d}" fill="${cor}" stroke="${tom(cor, -0.35)}" stroke-width=".7" stroke-linejoin="round"/>`;
    // Pêlos ao longo da sobrancelha: traços curtos inclinados para fora (claros na de cima, escuros na borda de baixo).
    let h = '', hc = '';
    for (let k = 0; k < 14; k++) {
      const u = (k + r() * 0.8) / 14, i0 = Math.min(5, Math.floor(u * 6)), [x, y, e] = pts[i0];
      const yy = y + (r() - 0.3) * e * 0.8;
      h += `M${n(x)} ${n(yy + e * 0.35)}l${n(lado * (1.6 + r()))} ${n(-1.2 - r() * 0.8)}`;
      if (k % 2 === 0) hc += `M${n(x + lado * 0.6)} ${n(yy)}l${n(lado * (1.4 + r()))} ${n(-0.9 - r() * 0.6)}`;
    }
    s += `<path d="${h}" fill="none" ${traco(0.55, tom(cor, -0.35))} opacity=".8"/><path d="${hc}" fill="none" ${traco(0.5, tom(cor, 0.3))} opacity=".55"/>`;
  }
  return s;
}

export function Eyebrows({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharSobrancelhas(ctx)} />;
}
