// Gerador procedural de rostos de jogadores (estilo cartoon vectorial: contorno preto grosso, cores planas,
// sombreamento simples, cabeça e ombros de frente, fundo transparente). Sem imagens nem IA: tudo em path SVG.
//
// Determinístico: a semente é hashSeed(id + '|' + nome) e um PRNG mulberry32 escolhe cada camada; o mesmo jogador tem
// sempre a mesma cara. A nacionalidade escolhe o preset (distribuições ponderadas); a idade muda a cara (rugas, grisalho,
// cara mais redonda e sem barba nos mais novos). A posição não muda o rosto.
import type { Acessorios, ClubKit, Ctx, EyeColorId, FaceShapeId, FaceTraits, HairColorId } from './faceParts/contexto.ts';
import { clamp, entre, hashSeed, mulberry32, ponderado, type Rand } from './faceParts/shared.ts';
import { paletaPele, desenharPescoco } from './faceParts/Skin.tsx';
import { calcularGeo, desenharCabeca, desenharOrelhas, desenharRugas, desenharSombras, IDS_FORMATO } from './faceParts/FaceShape.tsx';
import { desenharOlhos, FORMAS_OLHOS } from './faceParts/Eyes.tsx';
import { desenharSobrancelhas } from './faceParts/Eyebrows.tsx';
import { desenharNariz } from './faceParts/Nose.tsx';
import { desenharBoca } from './faceParts/Mouth.tsx';
import { desenharBarba } from './faceParts/Beard.tsx';
import { desenharCabeloFrente, desenharCabeloOmbros, desenharCabeloTras, ESTILOS_CABELO, ESTILO_POR_ID, paletaCabelo } from './faceParts/Hair.tsx';
import { desenharBrincos, desenharCicatriz, desenharOculos, desenharSardas, desenharTatuagem } from './faceParts/Accessories.tsx';
import { desenharCamisola, desenharGola, GOLAS } from './faceParts/Jersey.tsx';
import { PRESET_GLOBAL, presetDe } from './nationalityPresets.ts';

export { hashSeed, mulberry32 };
export type { ClubKit, FaceTraits };

/** Jogador (o necessário para o rosto e o card). */
export interface Player {
  id: string;
  nome: string;
  /** Código ISO alfa-2 (AO, BR, PT, ...) ou o código do jogo (POR, BRA, ...). */
  nacionalidade: string;
  idade: number;
  posicao: string;
  clubeId: string;
  overall?: number;
}

/** Semente do jogador: id + nome. */
export const sementeJogador = (p: Pick<Player, 'id' | 'nome'>) => hashSeed(`${p.id}|${p.nome}`);

// ---------------------------------------------------------------- escolha dos traços

const FORMAS_OMISSAO: [FaceShapeId, number][] = [['oval', 30], ['redondo', 15], ['quadrado', 20], ['comprido', 15], ['triangular', 10], ['diamante', 10]];
const CLARO: HairColorId[] = ['loiro', 'loiro_platinado', 'ruivo'];

/** Ajusta o peso de um estilo de cabelo pela pele (textura mais comum), pela idade e pelo preset. */
function pesoCabelo(id: string, base: number, pele: number, idade: number): number {
  const e = ESTILO_POR_ID[id];
  let w = base + 0.12; // piso: qualquer estilo pode aparecer (variedade)
  const tx = e.textura;
  if (pele >= 6) w *= tx === 'crespo' ? 1.6 : tx === 'liso' ? 0.35 : tx === 'ondulado' ? 0.5 : 1;
  else if (pele === 5) w *= tx === 'crespo' ? 1.3 : tx === 'liso' ? 0.6 : 1;
  else if (pele <= 2) w *= tx === 'crespo' ? 0.25 : 1;
  if (id === 'careca' || id === 'entradas') w *= idade >= 30 ? 2.5 : idade < 20 ? 0.3 : 1;
  if (id === 'entradas' && idade < 26) w = 0;
  if (id === 'grisalho') w = idade >= 33 ? w + 1.5 : 0;
  return w;
}

/** Escolhe os traços de um jogador (determinístico). */
export function gerarTracos(p: Player): FaceTraits {
  const seed = sementeJogador(p);
  const r: Rand = mulberry32(seed);
  const pr = presetDe(p.nacionalidade);
  const idade = clamp(Math.round(p.idade || 25), 15, 45);
  const jovem = idade < 18;

  // Pele (4% fora do padrão do país: variedade real).
  const pele = r() < 0.04 ? ponderado(r, PRESET_GLOBAL.skinTones) : ponderado(r, pr.skinTones);
  const escura = pele >= 5;

  // Formato e pequenas variações.
  const formas = (pr.faceShapes ?? FORMAS_OMISSAO).map(([f, w]) => [f, jovem ? (f === 'redondo' ? w * 3 + 10 : f === 'quadrado' ? w * 0.6 : w) : w] as [FaceShapeId, number]);
  const forma = ponderado(r, formas);
  const ajuste = {
    testa: entre(r, -1.5, 1.5), macas: entre(r, -1.5, 1.5), maxilar: entre(r, -1.8, 1.8), queixo: entre(r, -2, 2), altura: entre(r, -2.5, 2.5),
    topo: entre(r, -1.5, 1.5), pescoco: entre(r, -1, 2.5), olhos: entre(r, -1.2, 1.2), altOlhos: entre(r, -1.5, 1.5),
  };

  // Olhos.
  const formasOlhos = pr.eyeShapes ?? FORMAS_OLHOS.map((_, i) => [i, i === 6 || i === 7 ? 0.15 : 1] as [number, number]);
  const olhos = ponderado(r, formasOlhos);
  const coresOlhos = pr.eyeColors.map(([c, w]) => [c, escura && c !== 'castanho' && c !== 'preto' ? (c === 'mel' ? w * 0.6 : w * 0.08) : w] as [EyeColorId, number]);
  const corOlhos = ponderado(r, coresOlhos);
  const sobrancelhas = ponderado(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [i, i === 8 || i === 9 ? 0.6 : 1] as [number, number]));

  // Nariz e boca com as tendências do preset.
  const nl = pr.narizLargo ?? 0.4, lg = pr.labiosGrossos ?? 0.4;
  const nariz = ponderado(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [i, [0, 4, 7].includes(i) ? 1 + 3 * nl : [1, 5, 8].includes(i) ? 1 + 3 * (1 - nl) : 1.5] as [number, number]));
  const boca = ponderado(r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [i, [1, 6, 9].includes(i) ? 1 + 3 * lg : i === 0 ? 1 + 2 * (1 - lg) : i === 7 ? 0.7 : 1.5] as [number, number]));

  // Cabelo: estilo (pesos do preset ajustados pela pele e pela idade) e cor.
  const estilos = ESTILOS_CABELO.map((e) => [e.id, pesoCabelo(e.id, pr.hairStyles[e.id] ?? 0, pele, idade)] as [string, number]);
  const cabelo = ponderado(r, estilos);
  let corCabelo = ponderado(r, pr.hairColors.map(([c, w]) => [c, escura ? (CLARO.includes(c) ? w * 0.1 : c === 'castanho_claro' ? w * 0.4 : w) : w] as [HairColorId, number]));
  const grisalhoIdade = r() < (idade >= 36 ? 0.5 : idade > 30 ? 0.3 : 0);
  if (grisalhoIdade) corCabelo = 'grisalho';
  const forcada = ESTILO_POR_ID[cabelo].corForcada;
  if (forcada) corCabelo = forcada;

  // Barba (mais novos: quase sempre sem barba ou muito leve).
  const tem = r();
  let barba = 0;
  if (jovem) barba = tem < 0.2 ? 1 : 0;
  else if (tem < pr.beardProbability * (idade < 21 ? 0.6 : 1)) barba = ponderado(r, pr.beardStyles ?? [[1, 2], [2, 1], [3, 1.2], [4, 1.2], [5, 0.5], [6, 1.5], [7, 0.6], [8, 0.6], [9, 0.3], [10, 1], [11, 1]]);
  let corBarba: HairColorId = corCabelo === 'loiro_platinado' ? (escura ? 'preto' : 'loiro') : corCabelo;
  if (corCabelo === 'grisalho' && !grisalhoIdade && !forcada) corBarba = 'castanho_escuro';
  const barbaGrisalha = idade > 30 && r() < 0.2;
  if (corCabelo === 'grisalho') corBarba = 'grisalho';

  // Rugas.
  const rugas: 0 | 1 | 2 = idade > 34 ? 2 : idade > 30 ? 1 : 0;

  // Acessórios.
  const ap = pr.accessoryProbability;
  const brincos = (r() < ap * 0.7 ? (r() < 0.55 ? 1 : 2) : 0) as Acessorios['brincos'];
  const brincoTipo = ponderado(r, [['brilhante', 6], ['dourado', 2], ['argola', 2]] as const);
  const tatuagem = (!jovem && r() < ap * 0.4 ? (r() < 0.7 ? 1 : 2) : 0) as Acessorios['tatuagem'];
  const cicatriz = (r() < 0.05 ? (r() < 0.5 ? 1 : 2) : 0) as Acessorios['cicatriz'];
  const sardas = pele <= 2 && r() < (corCabelo === 'ruivo' ? 0.55 : corCabelo === 'loiro' || corCabelo === 'castanho_claro' ? 0.2 : 0.06);
  const oculos = (r() < 0.02 ? (r() < 0.5 ? 1 : 2) : 0) as Acessorios['oculos'];
  const aparelho = boca === 7 && idade < 23 && r() < 0.35;

  return {
    seed, nacionalidade: p.nacionalidade, idade, pele, forma, ajuste, olhos, corOlhos, sobrancelhas, nariz, boca, cabelo, corCabelo, barba, corBarba, barbaGrisalha, rugas,
    acessorios: { brincos, brincoTipo, tatuagem, cicatriz, sardas, oculos, aparelho },
  };
}

// ---------------------------------------------------------------- equipamento do clube

const PALETA_CLUBES: [string, string][] = [
  ['#c62828', '#ffffff'], ['#1565c0', '#ffffff'], ['#2e7d32', '#ffffff'], ['#f9c80e', '#1b5e20'], ['#111111', '#ffffff'], ['#6ec1ff', '#ffffff'],
  ['#7b1fa2', '#ffffff'], ['#ef6c00', '#111111'], ['#ffffff', '#0d47a1'], ['#b71c1c', '#111111'], ['#0d47a1', '#c62828'], ['#ffffff', '#c62828'],
];

/** Equipamento derivado do id do clube (para clubes sem cores definidas). */
export function kitDoClube(clubeId: string): ClubKit {
  const r = mulberry32(hashSeed('kit|' + clubeId));
  const [a, b] = PALETA_CLUBES[Math.floor(r() * PALETA_CLUBES.length)];
  return { primaryColor: a, secondaryColor: b, pattern: ponderado(r, [['lisa', 55], ['riscas', 25], ['metade', 10], ['xadrez', 10]] as const), collar: GOLAS[Math.floor(r() * GOLAS.length)] };
}

// ---------------------------------------------------------------- desenho

/** Contexto de desenho (geometria, paletas e prefixo dos ids). */
export function contextoRosto(t: FaceTraits, prefixo?: string): Ctx {
  return {
    t, g: calcularGeo(t), id: prefixo ?? `f${t.seed.toString(36)}`,
    pele: paletaPele(t.pele), cabelo: paletaCabelo(t.corCabelo), barba: paletaCabelo(t.corBarba),
  };
}

/** Todas as camadas, pela ordem: cabelo de trás, pescoço, camisola, gola, cabelo à frente dos ombros, orelhas, cabeça,
 *  sombras, marcas, rugas, olhos, sobrancelhas, nariz, barba, boca, cabelo, brincos e óculos. */
export function desenharCamadas(c: Ctx, kit: ClubKit): string {
  return desenharCabeloTras(c) + desenharPescoco(c) + desenharTatuagem(c) + desenharCamisola(c, kit) + desenharGola(c, kit) + desenharCabeloOmbros(c) +
    desenharOrelhas(c) + desenharCabeca(c) + desenharSombras(c) + desenharSardas(c) + desenharCicatriz(c) + desenharRugas(c) +
    desenharOlhos(c) + desenharSobrancelhas(c) + desenharNariz(c) + desenharBarba(c) + desenharBoca(c) + desenharCabeloFrente(c) +
    desenharBrincos(c) + desenharOculos(c);
}

export interface OpcoesRosto {
  /** Equipamento (por omissão, derivado do clubeId). */
  kit?: ClubKit;
  /** Tamanho em píxeis (largura; a altura segue 200:240). Sem tamanho, o SVG ocupa o contentor. */
  largura?: number;
}

/** Rosto completo de um jogador em SVG (texto). viewBox 0 0 200 240, fundo transparente. */
export function generatePlayerFace(player: Player, opcoes: OpcoesRosto = {}): string {
  const t = gerarTracos(player);
  const kit = opcoes.kit ?? kitDoClube(player.clubeId);
  const c = contextoRosto(t, `f${t.seed.toString(36)}${hashSeed(kit.primaryColor + kit.secondaryColor + kit.pattern + (kit.collar ?? '')).toString(36).slice(0, 4)}`);
  const tam = opcoes.largura ? ` width="${opcoes.largura}" height="${Math.round((opcoes.largura * 240) / 200)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"${tam} role="img">${desenharCamadas(c, kit)}</svg>`;
}

/** Ids dos formatos (reexportado para a página de teste). */
export { IDS_FORMATO };
