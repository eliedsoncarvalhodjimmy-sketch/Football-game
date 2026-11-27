// Prompt 11, Bloco 3: cena da Champions League, portada tal como estava de `cutscene-realista/index.html`
// (função `cenaCL`) — sem mudar o aspecto. Imagens e escudo em falta: nunca lança (ver `cover`/`logo`/`desenharEscudo`).
import { clamp, easeInOut, easeOut, lerp, prog } from '../utilitarios.ts';
import { cover, glow, logo, particulas, raios, streak } from '../efeitos.ts';
import { escudosEVS, rodape, textoFase, type Desenho, type EscudosCena, type ImagensCena } from './comum.ts';

let trCache: { w: number; h: number; cv: HTMLCanvasElement } | null = null;

/** Troféu deslocado para baixo, com máscara que esconde as asas no topo (para não tapar o texto da fase).
 *  Cache por tamanho de ecrã — refeito só quando o ecrã muda de tamanho, tal como no protótipo. */
function trofeuCL(img: HTMLImageElement | null, W: number, H: number, dpr: number): HTMLCanvasElement | null {
  if (!img) return null;
  if (trCache && trCache.w === W && trCache.h === H) return trCache.cv;
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const x = c.getContext('2d');
  if (!x) return null;
  x.scale(dpr, dpr);
  const r = Math.max(W / img.width, H / img.height) * 1.04, iw = img.width * r, ih = img.height * r;
  x.drawImage(img, (W - iw) / 2, (H - ih) / 2 + H * 0.08, iw, ih);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.34, 'rgba(0,0,0,0)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  trCache = { w: W, h: H, cv: c };
  return c;
}

export function desenharCenaChampions(d: Desenho, imagens: ImagensCena, escudos: EscudosCena) {
  const { ctx, t, dur, actos: c, P, g, W, H, dpr, modoLeve } = d;
  const k = t / dur;
  const clim = easeOut(prog(t, c.climax)), aF = easeOut(prog(t, c.fundo)), pn = easeOut(prog(t, c.painel)), tr = easeOut(prog(t, c.trofeu));

  let bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02051a'); bg.addColorStop(1, '#071447');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // fotografia do estádio com avanço de câmara
  cover(ctx, imagens['cl_estadio.jpg'], 0, 0, W, H, { zoom: 1.0 + 0.32 * k, fx: 0.46, fy: 0.5, ay: 0.62, alpha: aF * (1 - 0.2 * pn) });
  // correcção de cor: topo escuro, base escura, tom azul
  let gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(2,6,30,.72)'); gr.addColorStop(0.38, 'rgba(2,6,30,.12)'); gr.addColorStop(0.7, 'rgba(2,6,30,.2)'); gr.addColorStop(1, 'rgba(2,6,30,.8)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  if (pn > 0) { ctx.fillStyle = `rgba(4,10,60,${(0.3 * pn).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

  // feixes de luz a oscilar (Bloco 6: saltados no modo leve)
  if (!modoLeve) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ([[0.12, 1], [0.88, -1]] as [number, number][]).forEach(([fx, s], i) => {
      const an = Math.sin(t * 0.45 + i * 2) * 0.12 * s, x0 = W * fx;
      ctx.fillStyle = `rgba(${P.glow},${(0.07 + 0.08 * clim).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(x0 - W * 0.03, -10); ctx.lineTo(x0 + W * 0.03, -10);
      ctx.lineTo(W * 0.5 + Math.sin(an) * W + W * 0.2, H * 0.95); ctx.lineTo(W * 0.5 + Math.sin(an) * W - W * 0.2, H * 0.95);
      ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  // troféu a emergir (ecrã)
  if (tr > 0) {
    const tc = trofeuCL(imagens['cl_trofeu.jpg'], W, H, dpr);
    if (tc) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = tr * 0.8; ctx.drawImage(tc, 0, (1 - tr) * H * 0.06, W, H); ctx.restore(); }
    if (!modoLeve) glow(ctx, W / 2, H * 0.62, W * 0.55, '150,200,255', 0.25 * tr);
  }
  if (!modoLeve) particulas(ctx, W, H, t, (0.4 + 0.6 * aF) * (1 + clim * 2), P.glow);

  // marca: bola gigante -> logótipo no topo
  const mi = easeOut(prog(t, c.marca)), mu = easeInOut(prog(t, c.marcaSobe));
  const Lk = g.L, yL = g.yL, Rsm = (Lk * 0.46) / 2, ySm = yL - 0.24 * Lk;
  const Rbig = g.m * 0.3, yBig = H * 0.42;
  if (mi > 0) {
    const R = lerp(Rbig, Rsm, mu) * (0.5 + 0.5 * mi) * (1 + 0.06 * clim), cy = lerp(yBig, ySm, mu);
    if (!modoLeve) {
      glow(ctx, W / 2, cy, R * 2.4, '120,180,255', 0.55 * mi * (1 - 0.4 * mu));
      const pulso = Math.sin(Math.PI * clamp(prog(t, [c.marca[0], c.marca[0] + 1.3])));
      streak(ctx, W / 2, yBig, W * 1.3, Math.max(2, g.m * 0.012), pulso * 0.95 * (1 - mu), '150,200,255');
    }
    if (1 - mu > 0) logo(ctx, imagens['cl_bola.png'], W / 2, cy, R * 2, mi * (1 - mu));
    if (mu > 0) { const sz = Lk * (1 + 0.06 * clim); logo(ctx, imagens['cl_logo.png'], W / 2, yL, sz, mu); }
  }

  // painel de jogo (estilo das gráficas de resultados)
  if (pn > 0) {
    const hh = g.S * 1.85 * pn, y0 = g.yE + g.S * 0.15 - hh / 2;
    ctx.save();
    const pg = ctx.createLinearGradient(0, 0, W, 0);
    pg.addColorStop(0, `rgba(8,26,140,${(0.78 * pn).toFixed(2)})`); pg.addColorStop(1, `rgba(78,28,168,${(0.78 * pn).toFixed(2)})`);
    ctx.fillStyle = pg; ctx.fillRect(0, y0, W, hh);
    ctx.beginPath(); ctx.rect(0, y0, W, hh); ctx.clip();
    const bola = imagens['cl_bola.png'];
    if (bola) {
      const ps = g.S * 1.15; ctx.globalAlpha = 0.07 * pn; const ox = (t * 14) % ps;
      for (let r = -1; r < 3; r++) for (let q = -1; q < Math.ceil(W / ps) + 1; q++) ctx.drawImage(bola, q * ps - ox + (r % 2 ? ps / 2 : 0), y0 + r * ps * 0.9, ps, ps);
    }
    ctx.globalAlpha = 1; ctx.fillStyle = `rgba(105,240,234,${(0.85 * pn).toFixed(2)})`;
    ctx.fillRect(0, y0, W, Math.max(2, g.m * 0.006)); ctx.fillRect(0, y0 + hh - Math.max(2, g.m * 0.006), W, Math.max(2, g.m * 0.006));
    ctx.restore();
  }

  textoFase(d);
  escudosEVS(d, escudos, 1 - 0.8 * tr);
  rodape(d);
  if (!modoLeve) {
    raios(ctx, W, H, W / 2, yL, t, clim, P.glow);
    streak(ctx, W / 2, H * 0.5, W * 1.4, Math.max(2, g.m * 0.01), clim * (0.5 + 0.5 * Math.sin(t * 9)) * 0.6, '150,200,255');
  }
}
