// Olhos: 12 formas e 5 cores de íris (castanho, preto, azul, verde, mel).
// Cada olho: esclera branca, íris recortada pela esclera, pupila, brilho, pálpebra superior grossa, prega e linha inferior.
import type { Ctx, EyeColorId } from './contexto.ts';
import { n, tom, traco } from './shared.ts';
import { SvgLayer } from './Layer.tsx';

export const CORES_OLHOS: Record<EyeColorId, { nome: string; cor: string }> = {
  castanho: { nome: 'Castanho', cor: '#6e4425' },
  preto: { nome: 'Castanho muito escuro', cor: '#2f1d14' },
  azul: { nome: 'Azul', cor: '#4d86c4' },
  verde: { nome: 'Verde', cor: '#5f8d4c' },
  mel: { nome: 'Mel', cor: '#a7752e' },
};

/** Formas: meia-largura, altura de cima e de baixo, inclinação do canto exterior, pálpebra, prega, tamanho da íris. */
export const FORMAS_OLHOS: { nome: string; w: number; cima: number; baixo: number; incl: number; palpebra: number; prega: boolean; iris: number; capuz: number }[] = [
  { nome: 'Amêndoa', w: 8.2, cima: 4.4, baixo: 2.6, incl: 0, palpebra: 2, prega: true, iris: 3.6, capuz: 0 },
  { nome: 'Amêndoa grande', w: 8.8, cima: 5.1, baixo: 3, incl: -0.3, palpebra: 2.1, prega: true, iris: 3.9, capuz: 0 },
  { nome: 'Redondo', w: 7.6, cima: 5.3, baixo: 3.6, incl: 0, palpebra: 1.9, prega: true, iris: 3.7, capuz: 0 },
  { nome: 'Encapuzado', w: 8.3, cima: 3.6, baixo: 2.4, incl: 0.2, palpebra: 2.3, prega: true, iris: 3.6, capuz: 1.2 },
  { nome: 'Caído', w: 8.2, cima: 4.2, baixo: 2.5, incl: 1.4, palpebra: 2.1, prega: true, iris: 3.6, capuz: 0.4 },
  { nome: 'Subido', w: 8.2, cima: 4.2, baixo: 2.4, incl: -1.5, palpebra: 2.1, prega: true, iris: 3.5, capuz: 0 },
  { nome: 'Estreito (pálpebra única)', w: 8.4, cima: 3.1, baixo: 2, incl: -0.6, palpebra: 2.4, prega: false, iris: 3.4, capuz: 0 },
  { nome: 'Estreito subido', w: 8.6, cima: 3, baixo: 1.9, incl: -1.6, palpebra: 2.4, prega: false, iris: 3.3, capuz: 0 },
  { nome: 'Profundo', w: 8, cima: 3.9, baixo: 2.5, incl: 0.3, palpebra: 2.2, prega: true, iris: 3.5, capuz: 0.8 },
  { nome: 'Grande redondo', w: 8.6, cima: 5.6, baixo: 3.4, incl: 0, palpebra: 2, prega: true, iris: 4, capuz: 0 },
  { nome: 'Pequeno', w: 7.2, cima: 3.7, baixo: 2.2, incl: 0, palpebra: 2, prega: true, iris: 3.2, capuz: 0 },
  { nome: 'Sonolento', w: 8.3, cima: 3.2, baixo: 2.6, incl: 0.6, palpebra: 2.4, prega: true, iris: 3.6, capuz: 1.6 },
];

export function desenharOlhos(c: Ctx): string {
  const { g, t, pele, id } = c;
  const f0 = FORMAS_OLHOS[t.olhos % FORMAS_OLHOS.length];
  // Escala geral dos olhos (proporção dos exemplos).
  // Olho amendoado dos exemplos: mais largo, aberto o suficiente para se ver a íris, pálpebra superior grossa.
  const f = { ...f0, w: f0.w * 1.18, cima: f0.cima * 1.18, baixo: f0.baixo * 1.1, iris: f0.iris * 1.18, palpebra: f0.palpebra * 1.15 };
  const cor = CORES_OLHOS[t.corOlhos].cor;
  let s = '';
  for (const lado of [-1, 1]) {
    const ex = g.cx + lado * g.olhoDX, ey = g.olhoY;
    // Canto interior (junto ao nariz) e exterior; o exterior sobe ou desce com a inclinação.
    const xi = ex - lado * f.w, xo = ex + lado * f.w, yi = ey + 0.4, yo = ey + f.incl;
    const X = (x: number) => n(x);
    const cima = `M${X(xi)} ${n(yi)}C${X(xi + lado * f.w * 0.45)} ${n(ey - f.cima * 1.25)} ${X(xo - lado * f.w * 0.55)} ${n(ey - f.cima * 1.3)} ${X(xo)} ${n(yo)}`;
    const baixo = `C${X(xo - lado * f.w * 0.5)} ${n(ey + f.baixo * 1.25)} ${X(xi + lado * f.w * 0.4)} ${n(ey + f.baixo * 1.2)} ${X(xi)} ${n(yi)}`;
    const esclera = cima + baixo + 'Z';
    const cid = `${id}o${lado > 0 ? 'd' : 'e'}`;
    // Esclera e íris recortada.
    s += `<clipPath id="${cid}"><path d="${esclera}"/></clipPath><path d="${esclera}" fill="#fbf8f4"/>`;
    const ix = ex + lado * 0.3, iy = ey - 0.5 + f.capuz * 0.3;
    s += `<g clip-path="url(#${cid})"><circle cx="${n(ix)}" cy="${n(iy)}" r="${n(f.iris)}" fill="${cor}" stroke="${tom(cor, -0.45)}" stroke-width=".9"/>`;
    s += `<circle cx="${n(ix)}" cy="${n(iy)}" r="${n(f.iris * 0.46)}" fill="#120c0a"/>`;
    // Sombra da pálpebra sobre a parte de cima do olho (e capuz).
    s += `<path d="${cima}L${X(xo)} ${n(ey - 8)}L${X(xi)} ${n(ey - 8)}Z" fill="${pele.sombraForte}" opacity=".25" transform="translate(0 ${n(1.6 + f.capuz)})"/></g>`;
    s += `<circle cx="${n(ix - 1.2)}" cy="${n(iy - 1.3)}" r="${n(0.95)}" fill="#ffffff"/>`;
    // Capuz: pele por cima da parte de cima do olho.
    if (f.capuz > 0) s += `<path d="${cima}C${X(xo - lado * f.w * 0.5)} ${n(ey - f.cima * 1.3 + f.capuz * 2.2)} ${X(xi + lado * f.w * 0.4)} ${n(ey - f.cima * 1.2 + f.capuz * 2)} ${X(xi)} ${n(yi)}Z" fill="${pele.base}"/>`;
    // Pálpebra superior grossa (mais grossa no canto exterior) e pestana.
    const yc = f.capuz ? f.capuz * 1.6 : 0;
    s += `<path d="M${X(xi)} ${n(yi)}C${X(xi + lado * f.w * 0.45)} ${n(ey - f.cima * 1.25 + yc)} ${X(xo - lado * f.w * 0.55)} ${n(ey - f.cima * 1.3 + yc)} ${X(xo)} ${n(yo)}" fill="none" ${traco(f.palpebra)}/>`;
    s += `<path d="M${X(xo - lado * 1.5)} ${n(yo - 0.9)}l${n(lado * 2.6)} ${n(-1.2)}" fill="none" ${traco(1.6)}/>`;
    // Linha inferior (fina, cor da pele escurecida) e prega da pálpebra.
    s += `<path d="M${X(xo - lado * 0.6)} ${n(yo + 0.6)}C${X(xo - lado * f.w * 0.5)} ${n(ey + f.baixo * 1.25)} ${X(xi + lado * f.w * 0.6)} ${n(ey + f.baixo * 1.15)} ${X(xi + lado * 2)} ${n(yi + 1)}" fill="none" ${traco(0.9, pele.linha)}/>`;
    if (f.prega) s += `<path d="M${X(xi + lado * 1.5)} ${n(ey - f.cima - 1.8 + f.capuz)}C${X(xi + lado * f.w * 0.6)} ${n(ey - f.cima * 1.3 - 3 + f.capuz)} ${X(xo - lado * f.w * 0.4)} ${n(ey - f.cima * 1.3 - 2.6 + f.capuz)} ${X(xo - lado * 0.5)} ${n(yo - 2.4)}" fill="none" ${traco(0.9, pele.linha)} opacity=".85"/>`;
    // Olheiras (mais velhos).
    if (t.idade >= 32) s += `<path d="M${X(xi + lado * 2)} ${n(ey + f.baixo + 3)}q${n(lado * f.w * 0.8)} 2.2 ${n(lado * f.w * 1.5)} 0" fill="none" ${traco(0.8, pele.linha)} opacity=".45"/>`;
  }
  return s;
}

export function Eyes({ ctx }: { ctx: Ctx }) {
  return <SvgLayer markup={desenharOlhos(ctx)} />;
}
