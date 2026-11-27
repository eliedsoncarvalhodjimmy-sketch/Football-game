// Prompt 11, Bloco 4: cena da Liga Europa, portada tal como estava de `cutscene-realista/index.html`
// (função `cenaEL`) — sem mudar o aspecto. Imagens e escudo em falta: nunca lança (ver `cover`/`logo`/`desenharEscudo`).
import { clamp, easeInOut, easeOut, lerp, prog } from '../utilitarios.ts';
import { cover, glow, logo, particulas, raios, streak } from '../efeitos.ts';
import { escudosEVS, rodape, textoFase, type Desenho, type EscudosCena, type ImagensCena } from './comum.ts';

let bandCache: { w: number; h: number; cv: HTMLCanvasElement } | null = null;

/** Faixa de multidão (estádio) com máscara de transparência no topo. Cache por tamanho de ecrã, tal como no
 *  protótipo (a faixa cobre só os últimos 40% da altura). */
function bandaMultidao(img: HTMLImageElement | null, W: number, H: number, dpr: number): HTMLCanvasElement | null {
  if (!img) return null;
  const bh = Math.round(H * 0.4);
  if (bandCache && bandCache.w === W && bandCache.h === bh) return bandCache.cv;
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr); c.height = Math.round(bh * dpr);
  const x = c.getContext('2d');
  if (!x) return null;
  x.scale(dpr, dpr);
  const r = Math.max(W / img.width, bh / img.height), iw = img.width * r, ih = img.height * r;
  x.drawImage(img, (W - iw) / 2, bh - ih, iw, ih);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, 0, bh);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g; x.fillRect(0, 0, W, bh);
  bandCache = { w: W, h: bh, cv: c };
  return c;
}

export function desenharCenaEuropa(d: Desenho, imagens: ImagensCena, escudos: EscudosCena) {
  const { ctx, t, dur, actos: c, P, g, W, H, dpr, modoLeve } = d;
  const k = t / dur;
  const clim = easeOut(prog(t, c.climax)), aF = easeOut(prog(t, c.fundo)), pn = easeOut(prog(t, c.painel));
  const dim = easeInOut(prog(t, [c.marca[0], c.marca[0] + 4]));

  let bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050201'); bg.addColorStop(1, '#1c0802');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // troféu em fotografia (herói) e escurecimento progressivo
  cover(ctx, imagens['el_trofeu.jpg'], 0, 0, W, H, { zoom: 1.02 + 0.2 * k, fx: 0.52, fy: 0.5, ay: lerp(0.5, 0.68, dim), alpha: aF * (1 - 0.6 * dim) * (1 - 0.2 * pn) });
  let gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(5,2,1,.5)'); gr.addColorStop(0.45, 'rgba(5,2,1,.1)'); gr.addColorStop(1, 'rgba(5,2,1,.85)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

  // linhas laranja angulares (como o troféu) — Bloco 6: saltadas no modo leve
  if (c.faixas && !modoLeve) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const p = easeInOut(prog(t, [c.faixas[0] + i * 0.4, c.faixas[0] + i * 0.4 + 3.4]));
      if (p <= 0 || p >= 1) continue;
      const x = lerp(-W * 0.7, W * 1.2, p), y = H * (0.1 + i * 0.12), w = W * 0.6, a = 0.5 * Math.sin(p * Math.PI), th = H * (0.006 + 0.004 * (i % 3));
      ctx.fillStyle = `rgba(255,150,40,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - H * 0.07, y + th); ctx.lineTo(x - H * 0.07, y + th); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // faixa de multidão (estádio)
  const ep = easeOut(prog(t, c.estadio));
  const band = bandaMultidao(imagens['el_multidao.jpg'], W, H, dpr);
  const bandA = Math.max(0.45 * pn, ep);
  if (band && bandA > 0) { ctx.save(); ctx.globalAlpha = bandA; ctx.drawImage(band, 0, H - Math.round(H * 0.4), W, Math.round(H * 0.4)); ctx.restore(); }
  if (!modoLeve) particulas(ctx, W, H, t, (0.5 + 0.5 * aF) * (1 + clim * 2), P.glow, 1.6);

  // logótipo
  const mi = easeOut(prog(t, c.marca)), Lk = g.L;
  if (mi > 0) {
    if (!modoLeve) {
      glow(ctx, W / 2, g.yL - Lk * 0.1, Lk * 1.1, '255,138,31', 0.4 * mi);
      streak(ctx, W / 2, g.yL - Lk * 0.1, W, Math.max(2, g.m * 0.008), Math.sin(Math.PI * clamp(prog(t, [c.marca[0], c.marca[0] + 1]))) * 0.8, '255,160,60');
    }
    logo(ctx, imagens['el_logo.png'], W / 2, g.yL, Lk * (0.85 + 0.15 * mi) * (1 + 0.05 * clim), mi);
  }

  // painel de jogo (preto com linhas laranja e chevrons)
  if (pn > 0) {
    const hh = g.S * 1.85 * pn, y0 = g.yE + g.S * 0.15 - hh / 2, lw = Math.max(2, g.m * 0.006);
    ctx.save();
    ctx.fillStyle = `rgba(4,2,2,${(0.78 * pn).toFixed(2)})`; ctx.fillRect(0, y0, W, hh);
    ctx.fillStyle = `rgba(255,106,0,${pn.toFixed(2)})`; ctx.fillRect(0, y0, W, lw); ctx.fillRect(0, y0 + hh - lw, W, lw);
    // blocos inclinados nas pontas
    ([[0, 1], [W, -1]] as [number, number][]).forEach(([x0, s]) => {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + s * W * 0.045, y0); ctx.lineTo(x0 + s * W * 0.02, y0 + hh); ctx.lineTo(x0, y0 + hh); ctx.closePath(); ctx.fill();
    });
    // chevrons ▲ ao longo da base
    const tz = g.S * 0.13, n = Math.ceil(W / (tz * 1.6)) + 1;
    ctx.fillStyle = `rgba(255,106,0,${(0.9 * pn).toFixed(2)})`;
    for (let q = 0; q < n; q++) {
      const x = q * tz * 1.6 + ((t * 18) % (tz * 1.6));
      ctx.beginPath(); ctx.moveTo(x, y0 + hh); ctx.lineTo(x + tz * 0.8, y0 + hh - tz); ctx.lineTo(x + tz * 1.6, y0 + hh); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  textoFase(d);
  escudosEVS(d, escudos, 1);
  rodape(d);
  if (!modoLeve) raios(ctx, W, H, W / 2, g.yL, t, clim, P.glow, 12);
}
