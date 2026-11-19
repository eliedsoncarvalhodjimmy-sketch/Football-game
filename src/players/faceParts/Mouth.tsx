// Boca: 10 variações (lábios finos, grossos, sorriso leve, sério, largo, pequeno, lábio inferior cheio, sorriso aberto,
// meio sorriso, grossos com sorriso). Lábio de cima mais escuro, de baixo mais claro, linha da boca preta, sombra por baixo.
import type { Ctx } from './contexto.ts';
import { n, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** w: meia-largura; cima/baixo: espessura dos lábios; sorriso: curvatura (+ cantos para cima); assim: assimetria; aberta: mostra dentes. */
export const FORMAS_BOCA: { nome: string; w: number; cima: number; baixo: number; sorriso: number; assim: number; aberta: boolean }[] = [
  { nome: 'Lábios finos', w: 10.5, cima: 1.7, baixo: 2.2, sorriso: 0.2, assim: 0, aberta: false },
  { nome: 'Lábios grossos', w: 11.5, cima: 3.4, baixo: 4.4, sorriso: 0.2, assim: 0, aberta: false },
  { nome: 'Sorriso leve', w: 11.5, cima: 2.2, baixo: 3, sorriso: 1.6, assim: 0, aberta: false },
  { nome: 'Sério', w: 10.8, cima: 2.2, baixo: 2.9, sorriso: -0.6, assim: 0, aberta: false },
  { nome: 'Largo', w: 13.2, cima: 2.4, baixo: 3.2, sorriso: 0.5, assim: 0, aberta: false },
  { nome: 'Pequeno', w: 8.8, cima: 2.2, baixo: 2.9, sorriso: 0.2, assim: 0, aberta: false },
  { nome: 'Lábio inferior cheio', w: 11, cima: 2, baixo: 4.4, sorriso: 0, assim: 0, aberta: false },
  { nome: 'Sorriso aberto', w: 13, cima: 2.2, baixo: 3.2, sorriso: 3, assim: 0, aberta: true },
  { nome: 'Meio sorriso', w: 11, cima: 2.2, baixo: 3, sorriso: 0.6, assim: 1.6, aberta: false },
  { nome: 'Grossos com sorriso', w: 12, cima: 3.2, baixo: 4, sorriso: 1.3, assim: 0, aberta: false },
];

export function desenharBoca(c: Ctx): string {
  const { g, t, pele } = c;
  let f = FORMAS_BOCA[t.boca % FORMAS_BOCA.length];
  const cx = g.cx, y = g.bocaY, w = f.w * 1.32;
  // Lábios mais cheios (proporção dos exemplos).
  f = { ...f, cima: f.cima * 2.1, baixo: f.baixo * 1.85 };
  // Cantos: sobem com o sorriso; no meio sorriso só o direito sobe.
  const ye = y - f.sorriso * 0.6, yd = y - f.sorriso * 0.6 - f.assim;
  const meio = y + f.sorriso * 0.35;
  let s = '';
  // Filtro (sulco por cima do lábio).
  s += `<path d="M${n(cx - 1.6)} ${n(g.narizY + 4)}L${n(cx - 2)} ${n(y - f.cima - 1)}M${n(cx + 1.6)} ${n(g.narizY + 4)}L${n(cx + 2)} ${n(y - f.cima - 1)}" fill="none" ${traco(0.8, pele.sombra)}/>`;
  const linha = `M${n(cx - w)} ${n(ye)}C${n(cx - w * 0.5)} ${n(meio + 0.4)} ${n(cx + w * 0.5)} ${n(meio + 0.4)} ${n(cx + w)} ${n(yd)}`;
  if (f.aberta) {
    // Sorriso aberto: lábio de cima, dentes, lábio de baixo.
    const ab = 5.5;
    s += `<path d="M${n(cx - w)} ${n(ye)}C${n(cx - w * 0.6)} ${n(y + 0.5)} ${n(cx + w * 0.6)} ${n(y + 0.5)} ${n(cx + w)} ${n(yd)}C${n(cx + w * 0.55)} ${n(y + ab + 2.5)} ${n(cx - w * 0.55)} ${n(y + ab + 2.5)} ${n(cx - w)} ${n(ye)}Z" fill="#3b1c1a" ${traco(1.5)}/>`;
    s += `<path d="M${n(cx - w + 2)} ${n(ye + 0.7)}C${n(cx - w * 0.5)} ${n(y + 1.4)} ${n(cx + w * 0.5)} ${n(y + 1.4)} ${n(cx + w - 2)} ${n(yd + 0.7)}L${n(cx + w * 0.7)} ${n(y + 3.4)}C${n(cx + w * 0.3)} ${n(y + 4.4)} ${n(cx - w * 0.3)} ${n(y + 4.4)} ${n(cx - w * 0.7)} ${n(y + 3.4)}Z" fill="#fbf7f0"/>`;
    if (t.acessorios.aparelho) s += `<path d="M${n(cx - w * 0.75)} ${n(y + 2.2)}C${n(cx - w * 0.3)} ${n(y + 3.1)} ${n(cx + w * 0.3)} ${n(y + 3.1)} ${n(cx + w * 0.75)} ${n(y + 2.2)}" fill="none" ${traco(0.9, '#9aa3ad')}/>` +
      [-0.55, -0.2, 0.2, 0.55].map((k) => `<rect x="${n(cx + k * w - 0.9)}" y="${n(y + 1.8)}" width="1.8" height="1.6" fill="#c4ccd4"/>`).join('');
    s += `<path d="M${n(cx - 4)} ${n(g.narizY + 6)}" fill="none"/>`;
    s += `<path d="M${n(cx - w)} ${n(ye)}C${n(cx - w * 0.55)} ${n(y - f.cima * 1.3)} ${n(cx + w * 0.55)} ${n(y - f.cima * 1.3)} ${n(cx + w)} ${n(yd)}C${n(cx + w * 0.6)} ${n(y + 0.2)} ${n(cx - w * 0.6)} ${n(y + 0.2)} ${n(cx - w)} ${n(ye)}Z" fill="${pele.labio}" ${traco(1.2)}/>`;
    s += `<path d="M${n(cx - w * 0.85)} ${n(ye + 3)}C${n(cx - w * 0.4)} ${n(y + ab + 5)} ${n(cx + w * 0.4)} ${n(y + ab + 5)} ${n(cx + w * 0.85)} ${n(yd + 3)}" fill="none" ${traco(1.3, pele.linha)}/>`;
    return s;
  }
  // Lábio de cima (com arco de cupido) e de baixo.
  const cima = `M${n(cx - w)} ${n(ye)}C${n(cx - w * 0.6)} ${n(y - f.cima * 0.9)} ${n(cx - 3.5)} ${n(y - f.cima * 1.25)} ${n(cx)} ${n(y - f.cima * 0.75)}C${n(cx + 3.5)} ${n(y - f.cima * 1.25)} ${n(cx + w * 0.6)} ${n(y - f.cima * 0.9)} ${n(cx + w)} ${n(yd)}C${n(cx + w * 0.5)} ${n(meio + 0.4)} ${n(cx - w * 0.5)} ${n(meio + 0.4)} ${n(cx - w)} ${n(ye)}Z`;
  const baixo = `M${n(cx - w + 1)} ${n(ye + 0.3)}C${n(cx - w * 0.5)} ${n(meio + 0.4)} ${n(cx + w * 0.5)} ${n(meio + 0.4)} ${n(cx + w - 1)} ${n(yd + 0.3)}C${n(cx + w * 0.55)} ${n(y + f.baixo * 1.9)} ${n(cx - w * 0.55)} ${n(y + f.baixo * 1.9)} ${n(cx - w + 1)} ${n(ye + 0.3)}Z`;
  s += `<path d="${baixo}" fill="${pele.labioClaro}"/>`;
  s += `<path d="${cima}" fill="${pele.labio}"/>`;
  // Brilho no lábio de baixo e contorno inferior suave.
  s += `<ellipse cx="${n(cx - 1)}" cy="${n(y + f.baixo * 0.85)}" rx="${n(w * 0.3)}" ry="${n(f.baixo * 0.22)}" fill="#ffffff" opacity=".1"/>`;
  s += `<path d="M${n(cx - w * 0.55)} ${n(y + f.baixo * 1.45)}C${n(cx - w * 0.2)} ${n(y + f.baixo * 1.75)} ${n(cx + w * 0.2)} ${n(y + f.baixo * 1.75)} ${n(cx + w * 0.55)} ${n(y + f.baixo * 1.45)}" fill="none" ${traco(1, pele.linha)} opacity=".8"/>`;
  // Linha da boca e cantos.
  s += `<path d="${linha}" fill="none" ${traco(1.6)}/>`;
  if (f.sorriso > 0.8) s += `<path d="M${n(cx - w - 1.6)} ${n(ye - 1.2)}q.9 1.4 1.6 1.2M${n(cx + w + 1.6)} ${n(yd - 1.2)}q-.9 1.4 -1.6 1.2" fill="none" ${traco(1, pele.linha)}/>`;
  return s;
}

export function Mouth({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharBoca(ctx)} />;
}
