// Camisola até ao fundo do SVG, com as cores e o padrão do clube (lisa, riscas, xadrez, metade) e a gola
// (redonda, polo ou em V). O corpo tem o decote recortado: o pescoço fica por baixo e a gola por cima.
import type { ClubKit, CollarType, Ctx } from './contexto.ts';
import { corSegura, n, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

/** Altura do decote (a gola assenta aqui). */
const GOLA_Y = 165;

export const PADROES = ['lisa', 'riscas', 'xadrez', 'metade'] as const;
export const GOLAS: CollarType[] = ['redonda', 'polo', 'v'];

/** Decote: pontos onde o corpo encontra o pescoço (depende da gola). */
function decote(c: Ctx, gola: CollarType): { d: string; fundo: number } {
  const { g } = c;
  const w = g.pescocoW + 6, y = GOLA_Y;
  if (gola === 'v') return { d: `L${n(g.cx - w)} ${n(y)}L${n(g.cx)} ${n(y + 22)}L${n(g.cx + w)} ${n(y)}`, fundo: y + 22 };
  if (gola === 'polo') return { d: `L${n(g.cx - w)} ${n(y)}L${n(g.cx)} ${n(y + 16)}L${n(g.cx + w)} ${n(y)}`, fundo: y + 16 };
  return { d: `L${n(g.cx - w)} ${n(y)}Q${n(g.cx)} ${n(y + 17)} ${n(g.cx + w)} ${n(y)}`, fundo: y + 9 };
}

export function desenharCamisola(c: Ctx, kit: ClubKit): string {
  const { g, id } = c;
  const prim = corSegura(kit.primaryColor, '#c62828'), sec = corSegura(kit.secondaryColor, '#ffffff');
  const gola = kit.collar ?? 'redonda';
  const dc = decote(c, gola);
  // Corpo: ombros largos e caídos, até ao fundo.
  const corpo = `M0 240L0 196C7 184 24 177 44 173C58 170 70 168 ${n(g.cx - g.pescocoW - 9)} ${GOLA_Y}${dc.d}L${n(g.cx + g.pescocoW + 9)} ${GOLA_Y}C130 168 142 170 156 173C176 177 193 184 200 196L200 240Z`;
  let s = `<clipPath id="${id}cam"><path d="${corpo}"/></clipPath><path d="${corpo}" fill="${prim}"/><g clip-path="url(#${id}cam)">`;
  // Padrão.
  if (kit.pattern === 'riscas') for (let x = -4; x < 200; x += 22) s += `<rect x="${n(x + 11)}" y="160" width="11" height="80" fill="${sec}"/>`;
  else if (kit.pattern === 'xadrez') for (let y = 160; y < 240; y += 11) for (let x = 0; x < 200; x += 11) { if (((x + y - 160) / 11) % 2 < 1) s += `<rect x="${x}" y="${y}" width="11" height="11" fill="${sec}"/>`; }
  else if (kit.pattern === 'metade') s += `<rect x="100" y="160" width="100" height="80" fill="${sec}"/>`;
  // Sombra do lado direito, costuras raglan e sombra sob a gola.
  s += `<path d="M150 177C176 182 196 190 200 200L200 240L164 240C162 220 158 196 150 177Z" fill="#000000" opacity=".14"/>`;
  s += `<path d="M44 178C36 198 33 222 32 240M156 178C164 198 167 222 168 240" fill="none" ${traco(1.1, '#000000')} opacity=".28"/>`;
  s += `<path d="M${n(g.cx - g.pescocoW - 12)} ${GOLA_Y + 2}Q${n(g.cx)} ${n(dc.fundo + 12)} ${n(g.cx + g.pescocoW + 12)} ${GOLA_Y + 2}" fill="none" ${traco(5, '#000000')} opacity=".12"/>`;
  s += `</g><path d="${corpo}" fill="none" ${traco(2.3)}/>`;
  return s;
}

/** Gola por cima do pescoço (cor secundária; numa camisola lisa da mesma cor, um tom acima). */
export function desenharGola(c: Ctx, kit: ClubKit): string {
  const { g } = c;
  const prim = corSegura(kit.primaryColor, '#c62828'), sec0 = corSegura(kit.secondaryColor, '#ffffff');
  const sec = sec0.toLowerCase() === prim.toLowerCase() ? tom(prim, -0.25) : sec0;
  const gola = kit.collar ?? 'redonda';
  const w = g.pescocoW + 6, y = GOLA_Y;
  if (gola === 'redonda') {
    // Gola redonda canelada, com espessura (como nos exemplos).
    const d = `M${n(g.cx - w - 2)} ${n(y - 1)}Q${n(g.cx)} ${n(y + 19)} ${n(g.cx + w + 2)} ${n(y - 1)}L${n(g.cx + w - 4)} ${n(y - 6)}Q${n(g.cx)} ${n(y + 8)} ${n(g.cx - w + 4)} ${n(y - 6)}Z`;
    return `<path d="${d}" fill="${sec}" ${traco(1.9)}/><path d="M${n(g.cx - w - 0.5)} ${n(y - 3)}Q${n(g.cx)} ${n(y + 14)} ${n(g.cx + w + 0.5)} ${n(y - 3)}" fill="none" ${traco(0.8, tom(sec, -0.25))}/>`;
  }
  if (gola === 'v') {
    const d = `M${n(g.cx - w - 1)} ${n(y - 1)}L${n(g.cx)} ${n(y + 23)}L${n(g.cx + w + 1)} ${n(y - 1)}L${n(g.cx + w - 3.5)} ${n(y - 4)}L${n(g.cx)} ${n(y + 16)}L${n(g.cx - w + 3.5)} ${n(y - 4)}Z`;
    return `<path d="${d}" fill="${sec}" ${traco(1.8)}/>`;
  }
  // Polo: duas abas e a carcela com botão.
  let s = '';
  for (const lado of [-1, 1]) {
    const d = `M${n(g.cx + lado * (w - 2))} ${n(y - 6)}C${n(g.cx + lado * (w + 6))} ${n(y - 2)} ${n(g.cx + lado * (w + 14))} ${n(y + 8)} ${n(g.cx + lado * (w + 17))} ${n(y + 17)}L${n(g.cx + lado * 5)} ${n(y + 23)}L${n(g.cx + lado * 1)} ${n(y + 16)}Z`;
    s += `<path d="${d}" fill="${sec}" ${traco(1.8)}/>`;
  }
  s += `<path d="M${n(g.cx)} ${n(y + 16)}L${n(g.cx)} ${n(y + 34)}" fill="none" ${traco(1.4)}/><circle cx="${n(g.cx - 2.5)}" cy="${n(y + 26)}" r="1.2" fill="${sec}" ${traco(0.7)}/>`;
  return s;
}

export function Jersey({ ctx, kit }: { ctx: Ctx; kit: ClubKit }) {
  return <SvgLayer markup={desenharCamisola(ctx, kit) + desenharGola(ctx, kit)} />;
}
