// Campo 3D do ecrã do jogo (Anexo C, C1/C5): vista em perspectiva com Canvas 2D (sem WebGL), porte do protótipo
// "Campo FutCEO 3D". Só desenha — as posições, a altura da bola e a orientação dos jogadores vêm das fotografias do
// Motor2D (o resultado do jogo é sempre o do motor). Relvado com faixas, bancadas e painéis em cores lisas (sem
// marcas), balizas com rede, jogadores como bolinhas 3D com número e seta de orientação, bola com sombra e rasto.
import type { Motor2D } from '../engine/match2d/Motor2D.ts';
import { TICK_S } from '../config/match2d/fisica.ts';

type Foto = ReturnType<Motor2D['fotografia']>;
export type ModoCamara = 0 | 1 | 2;
export const NOMES_CAMARA = ['lateral', 'baliza', 'campo todo'] as const;

const PW = 105, PH = 68, GH = 3.66, GBAR = 2.44, GD = 2.2, BR = 0.11, TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hyp = Math.hypot;
type P3 = [number, number, number];
type Proj = [number, number, number, number]; // x, y no ecrã; profundidade; píxeis por metro

/** Câmaras (C5): lateral 74 m / 53°, baliza 38 m / 31°, campo todo ~140 m; suavização exponencial de 0,5 s. */
const CAMARAS = [
  { D: 74, th: 0.92 },
  { D: 38, th: 0.55 },
  { D: 142, th: 1.1 },
];
const SUAVIZAR_S = 0.5;
/** Rasto da bola a partir de 9 m/s (C1). */
const RASTO_V = 9;

/** Gerador determinístico (as bancadas têm sempre o mesmo aspecto). */
function rndSemente(s: number) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

interface Bancada { a: P3; l: P3; s: P3; d: [number, number, string][] }
const PALETA_ADEPTOS = ['#d7263d', '#2457c5', '#f4f1de', '#f2c94c', '#6d597a', '#2a9d8f', '#f28482', '#1d3557'];
const CORES_PAINEIS = ['#e63946', '#f1c40f', '#2a9d8f', '#f4f1de', '#1d3557', '#ff7f11'];

export interface Equipamento { cor: string; escuro: string; gr: string; grEscuro: string }

export class Campo3D {
  private g: CanvasRenderingContext2D;
  private W = 2; private H = 2;
  private cam = { fx: 52.5, fy: 34, psi: Math.PI / 2, D: 74, th: 0.92 };
  private C = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, ux: 0, uy: 0, uz: 0, fx: 0, fy: 0, fz: 0, F: 1 };
  private bancadas: Bancada[];
  private rasto: P3[] = [];
  private ultimoRastoT = -1;
  private abanar = 0;
  private golosVistos = -1;
  private rede = { gx: -1, amt: 0, y: 34, z: 1 };
  modo: ModoCamara = 0;
  nomes = true;

  constructor(private cv: HTMLCanvasElement, private kit: [Equipamento, Equipamento]) {
    this.g = cv.getContext('2d')!;
    const r = rndSemente(2026);
    const bancada = (a: P3, l: P3, s: P3, n: number): Bancada => ({ a, l, s, d: Array.from({ length: n }, () => [r(), r(), PALETA_ADEPTOS[(r() * PALETA_ADEPTOS.length) | 0]] as [number, number, string]) });
    this.bancadas = [
      bancada([-6, 72, 1], [117, 0, 0], [0, 14, 8], 700), bancada([-6, -4, 1], [117, 0, 0], [0, -14, 8], 700),
      bancada([-8, -4, 1], [0, 76, 0], [-14, 0, 8], 500), bancada([113, -4, 1], [0, 76, 0], [14, 0, 8], 500),
    ];
  }

  // ---------------------------------------------------------------- câmara e projecção
  private montarCamara() {
    const { cam, C } = this, h = [Math.cos(cam.psi), Math.sin(cam.psi)], ct = Math.cos(cam.th), st = Math.sin(cam.th);
    C.px = cam.fx - h[0] * cam.D * ct; C.py = cam.fy - h[1] * cam.D * ct; C.pz = cam.D * st; C.rx = h[1]; C.ry = -h[0];
    C.ux = h[0] * st; C.uy = h[1] * st; C.uz = ct; C.fx = h[0] * ct; C.fy = h[1] * ct; C.fz = -st; C.F = this.W * 1.05;
  }
  private pr(x: number, y: number, z: number): Proj {
    const C = this.C, dx = x - C.px, dy = y - C.py, dz = z - C.pz, zc = dx * C.fx + dy * C.fy + dz * C.fz, k = C.F / Math.max(zc, 0.5);
    return [this.W / 2 + (dx * C.rx + dy * C.ry) * k, this.H / 2 - (dx * C.ux + dy * C.uy + dz * C.uz) * k, zc, k];
  }
  private poly(pts: Proj[], fill?: string, stroke?: string) {
    const g = this.g; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); }
  }
  private quad(a: P3, b: P3, c: P3, d: P3, f: string) { this.poly([this.pr(...a), this.pr(...b), this.pr(...c), this.pr(...d)], f); }
  private path3(pts: number[][], col: string, w: number) {
    const g = this.g; g.beginPath(); pts.forEach((q, i) => { const p = this.pr(q[0], q[1], q[2] ?? 0); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }
  private arco(cx: number, cy: number, r: number, a0: number, a1: number, n = 40): P3[] {
    return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a), 0] as P3; });
  }

  /** Segue o lance: lateral (foco entre a bola e a baliza atacada), atrás de quem ataca, ou campo todo. */
  private seguir(dt: number, bx: number, by: number, gx: number) {
    const a = 1 - Math.exp(-dt / SUAVIZAR_S), c = CAMARAS[this.modo], cam = this.cam;
    let tp: number, tfx: number, tfy: number;
    if (this.modo === 0) { tp = Math.PI / 2; tfx = lerp(bx, gx, 0.35); tfy = 34 + (by - 34) * 0.3; }
    else if (this.modo === 1) { tp = gx > PW / 2 ? 0 : Math.PI; tfx = lerp(bx, gx, 0.5); tfy = 34 + (by - 34) * 0.5; }
    else { tp = Math.PI / 2; tfx = 52.5; tfy = 34; }
    let dp = tp - cam.psi; dp = Math.atan2(Math.sin(dp), Math.cos(dp));
    cam.psi += dp * a; cam.D += (c.D - cam.D) * a; cam.th += (c.th - cam.th) * a; cam.fx += (tfx - cam.fx) * a; cam.fy += (tfy - cam.fy) * a;
  }

  // ---------------------------------------------------------------- estádio
  private desenharBancada(s: Bancada) {
    const o = (u: number, w: number): P3 => [s.a[0] + s.l[0] * u + s.s[0] * w, s.a[1] + s.l[1] * u + s.s[1] * w, s.a[2] + s.l[2] * u + s.s[2] * w];
    this.quad(o(0, 0), o(1, 0), o(1, 1), o(0, 1), '#2b303b');
    const g = this.g;
    for (const d of s.d) { const p = this.pr(...o(d[0], d[1])); if (p[2] < 2) continue; const z = Math.max(1.5, 0.3 * p[3]); g.fillStyle = d[2]; g.fillRect(p[0] - z / 2, p[1] - z / 2, z, z); }
  }
  private paineis(longe: boolean) {
    const zf = this.pr(this.cam.fx, this.cam.fy, 0)[2];
    for (let i = 0; i < 24; i++) {
      const x0 = -4 + i * 4.8, c = CORES_PAINEIS[i % 6];
      for (const ay of [-3, 71]) { const zc = this.pr(x0 + 2.4, ay, 0)[2]; if ((zc >= zf) === longe) this.quad([x0, ay, 0], [x0 + 4.8, ay, 0], [x0 + 4.8, ay, 0.9], [x0, ay, 0.9], c); }
    }
    for (let j = 0; j < 16; j++) {
      const y0 = -3 + j * 4.6, c = CORES_PAINEIS[(j + 2) % 6];
      for (const x of [-4, 109]) { const zc = this.pr(x, y0, 0)[2]; if ((zc >= zf) === longe) this.quad([x, y0, 0], [x, y0 + 4.6, 0], [x, y0 + 4.6, 0.9], [x, y0, 0.9], c); }
    }
  }
  private relvado() {
    const g = this.g;
    g.fillStyle = '#0e1317'; g.fillRect(0, 0, this.W, this.H);
    this.quad([-30, -30, 0], [135, -30, 0], [135, 100, 0], [-30, 100, 0], '#2a6326');
    const zf = this.pr(this.cam.fx, this.cam.fy, 0)[2];
    for (const s of this.bancadas) {
      g.save(); if (this.abanar > 0) g.translate(0, (Math.floor(this.abanar * 14) % 2 ? -3 : 3));
      const q = this.pr(s.a[0] + s.l[0] / 2 + s.s[0] / 2, s.a[1] + s.l[1] / 2 + s.s[1] / 2, s.a[2] + s.s[2] / 2);
      if (q[2] > zf) this.desenharBancada(s);
      g.restore();
    }
    this.paineis(true);
    this.quad([-4, -4, 0], [109, -4, 0], [109, 72, 0], [-4, 72, 0], '#3a8a33');
    for (let i = 0; i < 20; i++) this.quad([i * 5.25, 0, 0], [(i + 1) * 5.25, 0, 0], [(i + 1) * 5.25, PH, 0], [i * 5.25, PH, 0], i % 2 ? '#47a73f' : '#4fb045');
    const lw = Math.max(1.3, (0.13 * this.C.F) / zf), L = 'rgba(244,247,238,.92)';
    const ret = (x1: number, y1: number, x2: number, y2: number) => this.path3([[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]], L, lw);
    ret(0, 0, PW, PH); this.path3([[52.5, 0], [52.5, PH]], L, lw);
    ret(0, 13.84, 16.5, 54.16); ret(0, 24.84, 5.5, 43.16); ret(88.5, 13.84, PW, 54.16); ret(99.5, 24.84, PW, 43.16);
    this.path3(this.arco(52.5, 34, 9.15, 0, TAU, 48), L, lw); this.path3(this.arco(11, 34, 9.15, -0.927, 0.927), L, lw); this.path3(this.arco(94, 34, 9.15, Math.PI - 0.927, Math.PI + 0.927), L, lw);
    for (const [x, y] of [[11, 34], [94, 34], [52.5, 34]]) this.path3(this.arco(x, y, 0.3, 0, TAU, 8), L, lw * 1.4);
  }
  private desenharRede(gx: number) {
    const g = this.g, s = gx > PW / 2 ? 1 : -1, y0 = 34 - GH, y1 = 34 + GH, xb = gx + s * GD, r = this.rede;
    g.strokeStyle = 'rgba(235,240,235,.38)'; g.lineWidth = 1; g.beginPath();
    const barriga = (y: number, z: number) => (r.gx === gx ? s * r.amt * Math.exp(-((y - r.y) ** 2 + (z - r.z) ** 2) / 1.6) : 0);
    const mv = (x: number, y: number, z: number) => { const p = this.pr(x, y, z); g.moveTo(p[0], p[1]); };
    const ln = (x: number, y: number, z: number) => { const p = this.pr(x, y, z); g.lineTo(p[0], p[1]); };
    for (let z = 0; z <= GBAR + 0.01; z += 0.4) { mv(xb + barriga(y0, z), y0, z); for (let y = y0; y <= y1 + 0.01; y += 0.5) ln(xb + barriga(y, z), y, z); }
    for (let y = y0; y <= y1 + 0.01; y += 0.5) { mv(xb + barriga(y, 0), y, 0); for (let z = 0; z <= GBAR + 0.01; z += 0.4) ln(xb + barriga(y, z), y, z); }
    for (let x = 0; x <= GD + 0.01; x += 0.55) { mv(gx + s * x, y0, GBAR); ln(gx + s * x, y1, GBAR); mv(gx + s * x, y0, 0); ln(gx + s * x, y0, GBAR); mv(gx + s * x, y1, 0); ln(gx + s * x, y1, GBAR); }
    mv(gx, y0, GBAR); ln(xb, y0, GBAR); ln(xb, y1, GBAR); ln(gx, y1, GBAR); g.stroke();
  }
  private desenharPostes(gx: number) {
    const k = this.pr(gx, 34, 1)[3], w = Math.max(2, 0.13 * k), g = this.g;
    g.lineCap = 'round';
    for (const y of [34 - GH, 34 + GH]) this.path3([[gx, y, 0], [gx, y, GBAR]], '#f4f6f0', w);
    this.path3([[gx, 34 - GH, GBAR], [gx, 34 + GH, GBAR]], '#f4f6f0', w);
    g.lineCap = 'butt';
  }

  // ---------------------------------------------------------------- jogadores e bola
  /** Bolinha 3D (cilindro baixo) na cor do clube, número no topo e seta de orientação; cresce com o zoom (C1). */
  private desenharJogador(x: number, y: number, fx: number, fy: number, numero: number, cor: string, escuro: string) {
    const k0 = this.pr(x, y, 0)[3], S = clamp(16 / k0, 1, 3), R = 0.5 * S, h = 1.05 * Math.sqrt(S), n = 14, g = this.g;
    this.poly(this.arco(x, y, R * 1.2, 0, TAU, n).map((q) => this.pr(q[0], q[1], 0)), 'rgba(0,0,0,.3)');
    const cx = this.C.px - x, cy = this.C.py - y;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
      if (Math.cos(am) * cx + Math.sin(am) * cy <= 0) continue;
      this.poly([this.pr(x + R * Math.cos(a0), y + R * Math.sin(a0), 0), this.pr(x + R * Math.cos(a1), y + R * Math.sin(a1), 0), this.pr(x + R * Math.cos(a1), y + R * Math.sin(a1), h), this.pr(x + R * Math.cos(a0), y + R * Math.sin(a0), h)], escuro);
    }
    g.lineWidth = 1; this.poly(this.arco(x, y, R, 0, TAU, n).map((q) => this.pr(q[0], q[1], h)), cor, 'rgba(255,255,255,.85)');
    const u = S, k = this.pr(x, y, h)[3];
    const ponta: [number, number] = [x + fx * 1.0 * u, y + fy * 1.0 * u], e: [number, number] = [x + (fx * 0.42 - fy * 0.3) * u, y + (fy * 0.42 + fx * 0.3) * u], d: [number, number] = [x + (fx * 0.42 + fy * 0.3) * u, y + (fy * 0.42 - fx * 0.3) * u];
    this.poly([this.pr(ponta[0], ponta[1], h), this.pr(e[0], e[1], h), this.pr(d[0], d[1], h)], '#fff', 'rgba(0,0,0,.6)');
    const c = this.pr(x, y, h);
    g.font = `700 ${Math.max(7, 0.62 * k * S)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText(String(numero), c[0] - fx * 0.05 * k * S, c[1]);
  }
  private desenharBola(x: number, y: number, z: number) {
    const g = this.g, s = this.pr(x, y, 0), q = this.pr(x, y, z), r = Math.max(2.6, 0.11 * q[3] * 2.1);
    this.rasto.forEach((t, i) => { const p = this.pr(t[0], t[1], t[2]); g.fillStyle = `rgba(255,255,255,${(((i + 1) / this.rasto.length) * 0.35).toFixed(3)})`; g.beginPath(); g.arc(p[0], p[1], r * 0.7, 0, TAU); g.fill(); });
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s[0], s[1], r * 1.1, r * 0.55, 0, 0, TAU); g.fill();
    g.fillStyle = '#fafafa'; g.beginPath(); g.arc(q[0], q[1], r, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#222'; g.beginPath(); g.arc(q[0] - r * 0.2, q[1] - r * 0.1, r * 0.35, 0, TAU); g.fill();
  }

  /**
   * Desenha um instante, interpolado entre duas fotografias do motor. `dt` (s reais) suaviza a câmara; `dono` é o id
   * do portador da bola (nome a dourado). Devolve nada: o resto do ecrã (cartões, etiquetas) desenha-se por cima.
   */
  desenhar(ant: Foto, act: Foto, alfa: number, dt: number) {
    const W = this.cv.width, H = this.cv.height; this.W = W; this.H = H;
    const bx = lerp(ant.bola.x, act.bola.x, alfa), by = lerp(ant.bola.y, act.bola.y, alfa), bz = Math.max(BR, lerp(ant.z ?? 0, act.z ?? 0, alfa) + BR);
    // Baliza atacada: a de quem tem a posse (a equipa 0 ataca sempre para x = 105).
    const gx = act.posse === 1 ? 0 : PW;
    this.seguir(dt, bx, by, gx);
    this.montarCamara();
    // Golo: a bancada abana e a rede faz "barriga" onde a bola entrou (C2).
    const golos = act.golos[0] + act.golos[1];
    if (this.golosVistos >= 0 && golos > this.golosVistos) this.abanar = 3.2;
    this.golosVistos = golos;
    this.abanar = Math.max(0, this.abanar - dt);
    const dentro = (bx < 0 || bx > PW) && Math.abs(by - 34) < GH && bz < GBAR;
    if (dentro) { this.rede.gx = bx < 0 ? 0 : PW; this.rede.amt = Math.min(1.1, this.rede.amt + dt * 3); this.rede.y = by; this.rede.z = bz; }
    else this.rede.amt = Math.max(0, this.rede.amt - dt * 1.5);
    // Rasto a partir de 9 m/s (velocidade entre as duas fotografias).
    const v = hyp(act.bola.x - ant.bola.x, act.bola.y - ant.bola.y) / TICK_S, tk = act.tick;
    if (tk !== this.ultimoRastoT) {
      if (v > RASTO_V) { this.rasto.push([bx, by, bz]); if (this.rasto.length > 9) this.rasto.shift(); } else if (this.rasto.length) this.rasto.shift();
      this.ultimoRastoT = tk;
    }

    this.relvado(); this.desenharRede(0); this.desenharRede(PW);
    const antes = new Map(ant.jogadores.map((j) => [j.id, j]));
    const itens: [number, () => void][] = [];
    const jogs = act.jogadores.map((j) => {
      const a = antes.get(j.id) ?? j, x = lerp(a.x, j.x, alfa), y = lerp(a.y, j.y, alfa);
      let dc = j.corpo - a.corpo; while (dc > Math.PI) dc -= TAU; while (dc < -Math.PI) dc += TAU;
      const ang = a.corpo + dc * alfa;
      return { j, x, y, fx: Math.cos(ang), fy: Math.sin(ang) };
    });
    for (const p of jogs) {
      const k = this.kit[p.j.equipa], gr = p.j.gr;
      itens.push([this.pr(p.x, p.y, 0)[2], () => this.desenharJogador(p.x, p.y, p.fx, p.fy, p.j.numero, gr ? k.gr : k.cor, gr ? k.grEscuro : k.escuro)]);
    }
    itens.push([this.pr(bx, by, 0)[2], () => this.desenharBola(bx, by, bz)]);
    for (const g of [0, PW]) itens.push([this.pr(g, 34, 1)[2], () => this.desenharPostes(g)]);
    itens.sort((a, b) => b[0] - a[0]);
    for (const it of itens) it[1]();
    this.paineis(false);
    if (this.nomes) this.desenharNomes(jogs, act.dono);
  }

  /** Apelido por cima de cada bolinha (branco com contorno; o portador a dourado, sem contorno), 7,5–12 px (C1). */
  private desenharNomes(jogs: { j: Foto['jogadores'][number]; x: number; y: number }[], dono: string | null) {
    const g = this.g, escala = this.W / 984;
    for (const p of jogs) {
      const S = clamp(16 / this.pr(p.x, p.y, 0)[3], 1, 3), q = this.pr(p.x, p.y, 1.5 + 0.5 * S);
      if (q[2] < 1) continue;
      const fs = clamp(0.42 * q[3] * Math.min(S, 1.8), 7.5 * escala, 12 * escala);
      g.font = `600 ${fs}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = p.j.nome.split(' ').pop() ?? p.j.nome;
      if (p.j.id === dono) { g.fillStyle = '#f2c94c'; g.fillText(t, q[0], q[1]); }
      else { g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, fs * 0.2); g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, q[0], q[1]); g.fillStyle = '#fff'; g.fillText(t, q[0], q[1]); }
    }
  }
}

/** Equipamento a partir da cor do clube: tom escuro para a "parede" da bolinha; guarda-redes com cor própria. */
export function equipamento(cor: string, grCor: string): Equipamento {
  return { cor, escuro: escurecer(cor, 0.62), gr: grCor, grEscuro: escurecer(grCor, 0.6) };
}
function escurecer(hex: string, f: number) {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
