// VERSÃO v1 CONGELADA — não alterar (ver ../faceGenerator.ts).
// Camisola até ao fundo do SVG, com as cores e o padrão do clube (lisa, riscas, xadrez, metade) e a gola
// (redonda, polo ou em V). O corpo tem o decote recortado: o pescoço fica por baixo e a gola por cima.
import type { ClubKit, CollarType, Ctx } from './contexto.ts';
import { corSegura, n, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

export const PADROES = ['lisa', 'riscas', 'xadrez', 'metade'] as const;
export const GOLAS: CollarType[] = ['redonda', 'polo', 'v'];

/** Decote: pontos onde o corpo encontra o pescoço (depende da gola). */
function decote(c: Ctx, gola: CollarType): { d: string; fundo: number } {
  const { g } = c;
  const w = g.pescocoW + 6, y = 178;
  if (gola === 'v') return { d: `L${n(g.cx - w)} ${n(y)}L${n(g.cx)} ${n(y + 22)}L${n(g.cx + w)} ${n(y)}`, fundo: y + 22 };
  if (gola === 'polo') return { d: `L${n(g.cx - w)} ${n(y)}L${n(g.cx)} ${n(y + 16)}L${n(g.cx + w)} ${n(y)}`, fundo: y + 16 };
  return { d: `L${n(g.cx - w)} ${n(y)}Q${n(g.cx)} ${n(y + 15)} ${n(g.cx + w)} ${n(y)}`, fundo: y + 8 };
}

export function desenharCamisola(c: Ctx, kit: ClubKit): string {
  const { g, id } = c;
  const prim = corSegura(kit.primaryColor, '#c62828'), sec = corSegura(kit.secondaryColor, '#ffffff');
  const gola = kit.collar ?? 'redonda';
  const dc = decote(c, gola);
  // Corpo: ombros largos e caídos, até ao fundo.
  const corpo = `M0 240L0 210C6 197 22 190 42 186C58 183 70 181 ${n(g.cx - g.pescocoW - 9)} 178${dc.d}L${n(g.cx + g.pescocoW + 9)} 178C130 181 142 183 158 186C178 190 194 197 200 210L200 240Z`;
  let s = `<clipPath id="${id}cam"><path d="${corpo}"/></clipPath><path d="${corpo}" fill="${prim}"/><g clip-path="url(#${id}cam)">`;
  // Padrão.
  if (kit.pattern === 'riscas') for (let x = -4; x < 200; x += 22) s += `<rect x="${n(x + 11)}" y="160" width="11" height="80" fill="${sec}"/>`;
  else if (kit.pattern === 'xadrez') for (let y = 168; y < 240; y += 11) for (let x = 0; x < 200; x += 11) { if (((x + y - 168) / 11) % 2 < 1) s += `<rect x="${x}" y="${y}" width="11" height="11" fill="${sec}"/>`; }
  else if (kit.pattern === 'metade') s += `<rect x="100" y="160" width="100" height="80" fill="${sec}"/>`;
  // Sombra do lado direito, costuras raglan e sombra sob a gola.
  s += `<path d="M150 186C176 190 196 198 200 210L200 240L164 240C162 220 158 200 150 186Z" fill="#000000" opacity=".14"/>`;
  s += `<path d="M44 186C36 204 33 224 32 240M156 186C164 204 167 224 168 240" fill="none" ${traco(1.1, '#000000')} opacity=".28"/>`;
  s += `<path d="M${n(g.cx - g.pescocoW - 12)} 180Q${n(g.cx)} ${n(dc.fundo + 12)} ${n(g.cx + g.pescocoW + 12)} 180" fill="none" ${traco(5, '#000000')} opacity=".12"/>`;
  s += `</g><path d="${corpo}" fill="none" ${traco(2.3)}/>`;
  return s;
}

/** Gola por cima do pescoço (cor secundária; numa camisola lisa da mesma cor, um tom acima). */
export function desenharGola(c: Ctx, kit: ClubKit): string {
  const { g } = c;
  const prim = corSegura(kit.primaryColor, '#c62828'), sec0 = corSegura(kit.secondaryColor, '#ffffff');
  const sec = sec0.toLowerCase() === prim.toLowerCase() ? tom(prim, -0.25) : sec0;
  const gola = kit.collar ?? 'redonda';
  const w = g.pescocoW + 6, y = 178;
  if (gola === 'redonda') {
    const d = `M${n(g.cx - w - 1)} ${n(y - 1)}Q${n(g.cx)} ${n(y + 16)} ${n(g.cx + w + 1)} ${n(y - 1)}L${n(g.cx + w - 3)} ${n(y - 4)}Q${n(g.cx)} ${n(y + 9)} ${n(g.cx - w + 3)} ${n(y - 4)}Z`;
    return `<path d="${d}" fill="${sec}" ${traco(1.8)}/>`;
  }
  if (gola === 'v') {
    const d = `M${n(g.cx - w - 1)} ${n(y - 1)}L${n(g.cx)} ${n(y + 23)}L${n(g.cx + w + 1)} ${n(y - 1)}L${n(g.cx + w - 3.5)} ${n(y - 4)}L${n(g.cx)} ${n(y + 16)}L${n(g.cx - w + 3.5)} ${n(y - 4)}Z`;
    return `<path d="${d}" fill="${sec}" ${traco(1.8)}/>`;
  }
  // Polo: duas abas e a carcela com botão.
  let s = '';
  for (const lado of [-1, 1]) {
    const d = `M${n(g.cx + lado * (w - 1))} ${n(y - 5)}L${n(g.cx + lado * (w + 12))} ${n(y + 13)}L${n(g.cx + lado * 4)} ${n(y + 17)}L${n(g.cx + lado * 1)} ${n(y + 15)}Z`;
    s += `<path d="${d}" fill="${sec}" ${traco(1.8)}/>`;
  }
  s += `<path d="M${n(g.cx)} ${n(y + 16)}L${n(g.cx)} ${n(y + 34)}" fill="none" ${traco(1.4)}/><circle cx="${n(g.cx - 2.5)}" cy="${n(y + 26)}" r="1.2" fill="${sec}" ${traco(0.7)}/>`;
  return s;
}

export function Jersey({ ctx, kit }: { ctx: Ctx; kit: ClubKit }) {
  return <SvgLayer markup={desenharCamisola(ctx, kit) + desenharGola(ctx, kit)} />;
}
