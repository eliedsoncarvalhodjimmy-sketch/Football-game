// Pele: 8 tons (do muito claro ao muito escuro) e o pescoço com sombra simples.
import type { Ctx, PaletaPele } from './contexto.ts';
import { caminho, misturar, n, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** 8 tons de pele (base). */
export const TONS_PELE: { id: string; nome: string; base: string }[] = [
  { id: 'muito_clara', nome: 'Muito clara', base: '#f7dfcf' },
  { id: 'clara', nome: 'Clara', base: '#f0c9ad' },
  { id: 'clara_quente', nome: 'Clara quente', base: '#e4b48d' },
  { id: 'media', nome: 'Média', base: '#d29c70' },
  { id: 'morena', nome: 'Morena / oliva', base: '#b98055' },
  { id: 'castanha', nome: 'Castanha', base: '#93603c' },
  { id: 'castanho_escuro', nome: 'Castanho escuro', base: '#6d4229' },
  { id: 'muito_escura', nome: 'Muito escura', base: '#4b2c1b' },
];

/** Paleta derivada de um tom: sombras, luz, lábios e linhas internas. */
export function paletaPele(i: number): PaletaPele {
  const base = TONS_PELE[Math.max(0, Math.min(7, i))].base;
  const escura = i >= 5;
  return {
    base,
    sombra: tom(base, escura ? -0.2 : -0.13),
    sombraForte: tom(base, escura ? -0.36 : -0.27),
    luz: tom(base, escura ? 0.1 : 0.16),
    labio: misturar(tom(base, escura ? -0.12 : -0.1), escura ? '#7a3b33' : '#b8615a', escura ? 0.3 : 0.38),
    labioClaro: misturar(base, escura ? '#8d4c43' : '#c9776d', escura ? 0.25 : 0.3),
    linha: tom(base, escura ? -0.48 : -0.42),
  };
}

/** Pescoço (desenhado antes da camisola: a gola tapa a base), com a sombra do queixo e, aos mais velhos, os tendões. */
export function desenharPescoco(c: Ctx): string {
  const { g, pele, t } = c;
  const w = g.pescocoW, y0 = g.maxilarY - 10, y1 = 206;
  const lados = `M${n(g.cx - w)} ${n(y0)}C${n(g.cx - w - 0.5)} ${n(y0 + 30)} ${n(g.cx - w - 2)} ${n(y1 - 26)} ${n(g.cx - w - 5)} ${n(y1)}L${n(g.cx + w + 5)} ${n(y1)}C${n(g.cx + w + 2)} ${n(y1 - 26)} ${n(g.cx + w + 0.5)} ${n(y0 + 30)} ${n(g.cx + w)} ${n(y0)}Z`;
  let s = caminho(lados, pele.base);
  // Sombra do queixo sobre o pescoço (meia-lua) e lado direito mais escuro.
  s += caminho(`M${n(g.cx - w - 1)} ${n(y0 + 8)}Q${n(g.cx)} ${n(g.queixoY + 18)} ${n(g.cx + w + 1)} ${n(y0 + 8)}L${n(g.cx + w + 1)} ${n(y0)}L${n(g.cx - w - 1)} ${n(y0)}Z`, pele.sombra);
  s += caminho(`M${n(g.cx + w - 6)} ${n(g.queixoY + 6)}C${n(g.cx + w - 4)} ${n(g.queixoY + 30)} ${n(g.cx + w - 2)} ${n(y1 - 20)} ${n(g.cx + w + 2)} ${n(y1)}L${n(g.cx + w + 5)} ${n(y1)}C${n(g.cx + w + 2)} ${n(y1 - 26)} ${n(g.cx + w)} ${n(y0 + 20)} ${n(g.cx + w)} ${n(y0)}Z`, pele.sombra, 'opacity=".8"');
  // Tendões / maçã de Adão discretos.
  if (t.idade >= 26) s += `<path d="M${n(g.cx - 7)} ${n(g.queixoY + 14)}Q${n(g.cx - 9)} ${n(g.queixoY + 30)} ${n(g.cx - 4)} ${n(g.queixoY + 42)}M${n(g.cx + 8)} ${n(g.queixoY + 14)}Q${n(g.cx + 9)} ${n(g.queixoY + 30)} ${n(g.cx + 5)} ${n(g.queixoY + 42)}" fill="none" ${traco(0.9, pele.sombraForte)} opacity=".55"/>`;
  s += `<path d="M${n(g.cx - 2)} ${n(g.queixoY + 22)}q2 3 4 0" fill="none" ${traco(0.9, pele.sombraForte)} opacity=".6"/>`;
  // Contorno lateral do pescoço.
  s += `<path d="M${n(g.cx - w)} ${n(y0)}C${n(g.cx - w - 0.5)} ${n(y0 + 30)} ${n(g.cx - w - 2)} ${n(y1 - 26)} ${n(g.cx - w - 5)} ${n(y1)}M${n(g.cx + w)} ${n(y0)}C${n(g.cx + w + 0.5)} ${n(y0 + 30)} ${n(g.cx + w + 2)} ${n(y1 - 26)} ${n(g.cx + w + 5)} ${n(y1)}" fill="none" ${traco(2.2)}/>`;
  return s;
}

/** Componente React: pescoço de um contexto já calculado. */
export function Skin({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharPescoco(ctx)} />;
}
