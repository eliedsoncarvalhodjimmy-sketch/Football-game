// Prompt 11, Blocos 3-4: elementos comuns à Champions e à Liga Europa (geometria do ecrã, texto da fase, escudos
// com "VS", rodapé com estádio/data) — portados tal como estavam de `cutscene-realista/index.html` (`geometria`,
// `textoFase`, `escudosEVS`, `rodape`).
import type { DadosCutscene, IdCompeticao } from '../tipos.ts';
import { clamp, easeOut, lerp, prog } from '../utilitarios.ts';
import { fitText, fnt } from '../efeitos.ts';
import { desenharEscudo } from '../escudo.ts';

export interface Paleta { readonly nome: string; readonly glow: string; readonly acc: string }
export interface Geometria { m: number; L: number; yL: number; yFase: number; S: number; yE: number }

/** As fotografias/logótipos de uma competição, por nome de ficheiro (ver `FICHEIROS_COMPETICAO`); em falta
 *  (ainda a carregar, ou nunca fornecida) fica a `null` — a cena usa um fundo simples, nunca lança. */
export interface ImagensCena { [ficheiro: string]: HTMLImageElement | null }

/** Os escudos reais dos dois clubes, já carregados; `null` usa o escudo genérico (`src/cutscene/escudo.ts`). */
export interface EscudosCena { casa: HTMLImageElement | null; fora: HTMLImageElement | null }

/** Tudo o que os desenhos da cena (`desenharCenaChampions`/`desenharCenaEuropa`) e os elementos comuns precisam
 *  num instante `t`; construído uma vez por frame em `src/cutscene/cena.ts`. */
export interface Desenho {
  ctx: CanvasRenderingContext2D;
  t: number;
  dur: number;
  actos: Record<string, [number, number]>;
  dados: DadosCutscene;
  P: Paleta;
  g: Geometria;
  W: number;
  H: number;
  dpr: number;
}

export function geometria(idComp: IdCompeticao, W: number, H: number): Geometria {
  const m = Math.min(W, H * 0.62), L = m * (idComp === 'champions' ? 0.4 : 0.36);
  const yL = H * 0.1 + L / 2; // centro do logótipo (lockup) no topo
  const bottomL = yL + L * 0.47;
  return { m, L, yL, yFase: bottomL + m * 0.1, S: Math.min(W * 0.28, H * 0.17), yE: H * 0.57 };
}

export function textoFase(d: Desenho) {
  const { ctx, t, actos: c, dados, P, g, W, H } = d;
  const fp = easeOut(prog(t, c.fase));
  if (fp <= 0) return;
  const partes = dados.fase.split('·').map((s) => s.trim());
  ctx.save(); ctx.globalAlpha = fp; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 10;
  const y = g.yFase + (1 - fp) * H * 0.025;
  ctx.fillStyle = '#fff';
  const s1 = fitText(ctx, partes[0].toUpperCase(), W * 0.88, g.m * 0.064, 700);
  ctx.fillText(partes[0].toUpperCase(), W / 2, y);
  ctx.shadowBlur = 0; ctx.fillStyle = P.acc;
  ctx.fillRect(W / 2 - fp * g.m * 0.22, y + s1 * 0.38, fp * g.m * 0.44, Math.max(2, g.m * 0.005));
  if (partes[1]) {
    ctx.fillStyle = P.acc;
    fitText(ctx, partes[1].toUpperCase(), W * 0.8, g.m * 0.042, 600);
    ctx.fillText(partes[1].toUpperCase(), W / 2, y + s1 * 1.3);
  }
  ctx.restore();
}

export function escudosEVS(d: Desenho, escudos: EscudosCena, vsFade = 1) {
  const { ctx, t, actos: c, dados, P, g, W } = d;
  const hp = easeOut(prog(t, c.home)), ap = easeOut(prog(t, c.away)), nomeMax = W * 0.4;
  if (hp > 0) desenharEscudo(ctx, escudos.casa, lerp(-g.S, W * 0.25, hp), g.yE, g.S * (0.7 + 0.3 * hp), dados.casa, hp, nomeMax);
  if (ap > 0) desenharEscudo(ctx, escudos.fora, lerp(W + g.S, W * 0.75, ap), g.yE, g.S * (0.7 + 0.3 * ap), dados.fora, ap, nomeMax);
  const vp = prog(t, c.vs);
  if (vp > 0 && vsFade > 0) {
    const pop = vp < 0.3 ? easeOut(vp / 0.3) * 1.25 : lerp(1.25, 1, easeOut((vp - 0.3) / 0.7));
    ctx.save(); ctx.translate(W / 2, g.yE); ctx.scale(pop, pop); ctx.globalAlpha = clamp(vp * 4) * vsFade;
    ctx.shadowColor = P.acc; ctx.shadowBlur = g.m * 0.06; ctx.fillStyle = '#fff'; ctx.font = fnt(g.S * 0.5, 900);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VS', 0, 0); ctx.restore();
  }
}

export function rodape(d: Desenho) {
  const { ctx, t, actos: c, dados, g, W, H } = d;
  const ep = easeOut(prog(t, c.estadio));
  if (ep <= 0) return;
  const bg2 = ctx.createLinearGradient(0, H * 0.76, 0, H);
  bg2.addColorStop(0, 'rgba(0,0,0,0)'); bg2.addColorStop(1, `rgba(0,0,0,${(0.72 * ep).toFixed(2)})`);
  ctx.fillStyle = bg2; ctx.fillRect(0, H * 0.76, W, H * 0.24);
  ctx.save(); ctx.globalAlpha = ep; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 8;
  const y = H * 0.885 + (1 - ep) * H * 0.03, txt = dados.estadio.toUpperCase();
  ctx.fillStyle = '#fff';
  fitText(ctx, txt, W * 0.9, g.m * 0.052, 700);
  ctx.fillText(txt, W / 2, y);
  ctx.restore();
}
