// Tipos comuns do gerador de rostos: traços escolhidos (a "receita" de uma cara), geometria da cabeça e contexto de desenho.
import type { Pt } from './shared.ts';

export type FaceShapeId = 'oval' | 'redondo' | 'quadrado' | 'comprido' | 'triangular' | 'diamante';
export type HairColorId = 'preto' | 'castanho_escuro' | 'castanho_claro' | 'loiro' | 'loiro_platinado' | 'ruivo' | 'grisalho';
export type EyeColorId = 'castanho' | 'preto' | 'azul' | 'verde' | 'mel';
export type KitPattern = 'lisa' | 'riscas' | 'xadrez' | 'metade';
export type CollarType = 'redonda' | 'polo' | 'v';

/** Equipamento do clube (cores #rrggbb). */
export interface ClubKit {
  primaryColor: string;
  secondaryColor: string;
  pattern: KitPattern;
  collar?: CollarType;
}

/** Acessórios e marcas. */
export interface Acessorios {
  /** 0 = nenhum; 1 = orelha esquerda; 2 = as duas. */
  brincos: 0 | 1 | 2;
  brincoTipo: 'brilhante' | 'argola' | 'dourado';
  /** 0 = nenhuma; 1 = lado do pescoço; 2 = frente do pescoço. */
  tatuagem: 0 | 1 | 2;
  /** 0 = nenhuma; 1 = sobrancelha; 2 = bochecha. */
  cicatriz: 0 | 1 | 2;
  sardas: boolean;
  /** 0 = sem óculos; 1 = armação fina; 2 = armação grossa. */
  oculos: 0 | 1 | 2;
  aparelho: boolean;
}

/** Receita completa de um rosto (determinística a partir da semente). */
export interface FaceTraits {
  seed: number;
  nacionalidade: string;
  idade: number;
  pele: number; // 0–7
  forma: FaceShapeId;
  /** Pequenas variações contínuas da cabeça (tornam cada cara única dentro do mesmo formato). */
  ajuste: { testa: number; macas: number; maxilar: number; queixo: number; altura: number; topo: number; pescoco: number; olhos: number; altOlhos: number };
  olhos: number; // 0–11
  corOlhos: EyeColorId;
  sobrancelhas: number; // 0–9
  nariz: number; // 0–9
  boca: number; // 0–9
  cabelo: string; // id do estilo (Hair.tsx)
  corCabelo: HairColorId;
  barba: number; // 0–11
  corBarba: HairColorId;
  barbaGrisalha: boolean;
  rugas: 0 | 1 | 2;
  acessorios: Acessorios;
}

/** Geometria da cabeça (viewBox 0 0 200 240). */
export interface Geo {
  cx: number;
  topo: number;
  temporaY: number;
  macasY: number;
  maxilarY: number;
  queixoY: number;
  testaW: number;
  macasW: number;
  maxilarW: number;
  queixoW: number;
  olhoY: number;
  olhoDX: number;
  sobrancelhaY: number;
  narizY: number;
  bocaY: number;
  orelhaTopo: number;
  orelhaBase: number;
  pescocoW: number;
  /** Meio contorno direito da cabeça, do topo ao queixo. */
  contorno: Pt[];
  /** Meia-largura da cabeça à altura y (interpolada no contorno). */
  w: (y: number) => number;
}

export interface PaletaPele { base: string; sombra: string; sombraForte: string; luz: string; labio: string; labioClaro: string; linha: string }
export interface PaletaCabelo { base: string; sombra: string; luz: string }

/** Contexto de desenho de um rosto. */
export interface Ctx {
  t: FaceTraits;
  g: Geo;
  /** Prefixo único dos ids (clipPath, gradientes, padrões) deste SVG. */
  id: string;
  pele: PaletaPele;
  cabelo: PaletaCabelo;
  barba: PaletaCabelo;
}
