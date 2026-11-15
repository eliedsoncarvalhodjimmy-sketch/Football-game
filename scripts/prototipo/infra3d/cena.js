// Gerador das ilustrações 3D das infraestruturas (protótipo). Cenas determinísticas (semente por tipo/nível/tamanho),
// texturas geradas em canvas, luz do sol com sombras. Renderiza para imagem: o ecrã da app só mostra imagens.
import * as THREE from 'three';

// ---------- utilitários ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
let R = rng(1);
const rr = (a, b) => a + (b - a) * R();
const pick = (a) => a[Math.floor(R() * a.length)];

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ruido(g, w, h, amt, grao = 1) {
  const d = g.getImageData(0, 0, w, h), a = d.data;
  for (let y = 0; y < h; y += grao) for (let x = 0; x < w; x += grao) {
    const n = (R() - 0.5) * amt;
    for (let yy = y; yy < Math.min(h, y + grao); yy++) for (let xx = x; xx < Math.min(w, x + grao); xx++) { const i = (yy * w + xx) * 4; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
  }
  g.putImageData(d, 0, 0);
}
function textura(c, rep = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
const cache = new Map();
const uma = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
function sombra(m, cast = true, rec = true) { m.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = rec; } }); return m; }
function mistura(hex, outro, t) { return '#' + new THREE.Color(hex).lerp(new THREE.Color(outro), t).getHexString(); }

// ---------- texturas ----------
const T = {
  relva: () => uma('relva', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#5d8c3a'; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 4000; k++) { g.fillStyle = pick(['#6a9944', '#527e33', '#73a24c', '#4d7630']); g.fillRect(R() * 256, R() * 256, 1, 2); } ruido(g, 256, 256, 18); return textura(c, [1, 1]); }),
  asfalto: () => uma('asfalto', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#4a4d52'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 30); return textura(c); }),
  betao: () => uma('betao', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#c9c6bf'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 16);
    g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 1; for (let k = 0; k <= 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); } return textura(c); }),
  telhado: () => uma('telhado', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#b9bec4'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, 0, 2, 256); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 5, 0, 2, 256); } ruido(g, 256, 256, 8); return textura(c); }),
  cobertura: () => uma('cobertura', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#8d9298'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 22, 2); return textura(c); }),
  madeira: () => uma('madeira', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#8a6544'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) { g.fillStyle = `rgba(0,0,0,${0.08 + R() * 0.1})`; g.fillRect(0, y, 256, 1); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(60,35,15,.12)'; g.fillRect(R() * 256, y + 2 + R() * 12, 40 + R() * 80, 1); } } ruido(g, 256, 256, 14); return textura(c); }),
};
// Fachada: um vão (largura) × um piso (altura). tipo: vidro | painel | tijolo
function fachada(tipo, cor = '#e9ebee') {
  return uma('fach' + tipo + cor, () => {
    const [c, g] = canvas(128, 128);
    const vidro = g.createLinearGradient(0, 0, 0, 128); vidro.addColorStop(0, '#9fc3dc'); vidro.addColorStop(0.5, '#4d6f88'); vidro.addColorStop(1, '#2b4153');
    if (tipo === 'vidro') { g.fillStyle = vidro; g.fillRect(0, 0, 128, 128); g.fillStyle = '#d7dce2'; g.fillRect(0, 0, 128, 8); g.fillRect(0, 0, 5, 128); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(10, 120); g.lineTo(60, 10); g.lineTo(80, 10); g.lineTo(30, 120); g.fill(); }
    else if (tipo === 'tijolo') { g.fillStyle = '#9b5a43'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 128; x += 16) { g.fillStyle = mistura('#9b5a43', R() > 0.5 ? '#7d4533' : '#b06a50', R() * 0.6); g.fillRect(x + 1, y + 1, 14, 6); } g.fillStyle = vidro; g.fillRect(34, 30, 60, 62); g.fillStyle = '#eee'; g.fillRect(34, 92, 60, 5); }
    else { g.fillStyle = cor; g.fillRect(0, 0, 128, 128); ruido(g, 128, 128, 10); g.fillStyle = vidro; g.fillRect(10, 40, 108, 52); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(10, 92, 108, 3); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 126, 128, 2); }
    return textura(c);
  });
}
// Bancadas: um "módulo" de 11,2 m com 20 lugares por fila e uma escada; 1 degrau = 1 fila.
function texBancada(cor) {
  return uma('banc' + cor, () => {
    const [c, g] = canvas(448, 32);
    g.fillStyle = '#9a9a96'; g.fillRect(0, 0, 448, 32);
    for (let s = 0; s < 20; s++) { const x = 4 + s * 20; g.fillStyle = mistura(cor, '#000', 0.25); g.fillRect(x, 6, 17, 20); g.fillStyle = cor; g.fillRect(x, 6, 17, 12); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, 6, 17, 2); }
    g.fillStyle = '#b5b3ad'; g.fillRect(404, 0, 44, 32); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(404, 16, 44, 2);
    return textura(c);
  });
}
// Relvado (campo de futebol) com riscas de corte e linhas. L × W do terreno de jogo; m = margem à volta (metros).
function texCampo(L, W, m, { sintetico = false, riscas = 12 } = {}) {
  return uma(`campo${L}x${W}x${m}${sintetico}${riscas}`, () => {
    const px = 10, TW = (L + 2 * m) * px, TH = (W + 2 * m) * px;
    const [c, g] = canvas(TW, TH);
    const a = sintetico ? '#3f8a43' : '#4f9a3a', b = sintetico ? '#3a8040' : '#5aa743';
    g.fillStyle = sintetico ? '#3a7a3e' : '#4a8f37'; g.fillRect(0, 0, TW, TH);
    for (let k = 0; k < riscas; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(m * px + (k * L * px) / riscas, 0, (L * px) / riscas + 1, TH); }
    for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},.05)`; g.fillRect(R() * TW, R() * TH, 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 2.5; const X = (x) => (m + x) * px, Y = (y) => (m + y) * px;
    g.strokeRect(X(0), Y(0), L * px, W * px);
    g.beginPath(); g.moveTo(X(L / 2), Y(0)); g.lineTo(X(L / 2), Y(W)); g.stroke();
    g.beginPath(); g.arc(X(L / 2), Y(W / 2), 9.15 * px, 0, Math.PI * 2); g.stroke();
    const area = Math.min(16.5, L * 0.157), aw = Math.min(40.3, W * 0.59), pe = Math.min(5.5, L * 0.05), pw = Math.min(18.3, W * 0.27);
    for (const s of [0, 1]) {
      const x0 = s ? X(L - area) : X(0); g.strokeRect(x0, Y((W - aw) / 2), area * px, aw * px);
      const x1 = s ? X(L - pe) : X(0); g.strokeRect(x1, Y((W - pw) / 2), pe * px, pw * px);
      g.beginPath(); g.arc(s ? X(L - 11) : X(11), Y(W / 2), 9.15 * px, s ? Math.PI * 0.705 : -Math.PI * 0.295, s ? Math.PI * 1.295 : Math.PI * 0.295); g.stroke();
    }
    ruido(g, TW, TH, 8, 2);
    const t = textura(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  });
}
function texPista() {
  return uma('pista', () => {
    const px = 6, Lr = 84.4, Rr = 36.5, faixas = 6, lw = 1.22, TW = Math.ceil((Lr + 2 * (Rr + faixas * lw) + 6) * px), TH = Math.ceil((2 * (Rr + faixas * lw) + 6) * px);
    const [c, g] = canvas(TW, TH); g.fillStyle = '#5d8c3a'; g.fillRect(0, 0, TW, TH);
    const cx = TW / 2, cy = TH / 2;
    const oval = (r) => { g.beginPath(); g.moveTo(cx - (Lr / 2) * px, cy - r * px); g.lineTo(cx + (Lr / 2) * px, cy - r * px); g.arc(cx + (Lr / 2) * px, cy, r * px, -Math.PI / 2, Math.PI / 2); g.lineTo(cx - (Lr / 2) * px, cy + r * px); g.arc(cx - (Lr / 2) * px, cy, r * px, Math.PI / 2, (3 * Math.PI) / 2); g.closePath(); };
    oval(Rr + faixas * lw + 1); g.fillStyle = '#c4573d'; g.fill();
    oval(Rr); g.fillStyle = '#4f9a3a'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.2; for (let k = 0; k <= faixas; k++) { oval(Rr + k * lw); g.stroke(); }
    ruido(g, TW, TH, 12, 2);
    const t = textura(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return { t, w: TW / px, h: TH / px };
  });
}
function texCampoAgricola(raio, zonaLivre) {
  // Mosaico de campos agrícolas com sebes; devolve a textura e as arestas (para sebes 3D).
  const N = 3072, esc = N / (2 * raio), [c, g] = canvas(N, N);
  g.fillStyle = '#6f9a48'; g.fillRect(0, 0, N, N);
  const passo = 120, n = Math.ceil((2 * raio) / passo) + 2, P = [];
  for (let i = 0; i < n; i++) { P.push([]); for (let j = 0; j < n; j++) P[i].push([-raio - passo / 2 + i * passo + rr(-30, 30), -raio - passo / 2 + j * passo + rr(-30, 30)]); }
  const cores = ['#7ba64e', '#6c9a44', '#8bb05a', '#a9b867', '#c7b77a', '#d4c393', '#5f8f3e', '#93b562', '#7aa04a'];
  const arestas = [];
  const toPx = ([x, z]) => [(x + raio) * esc, (z + raio) * esc];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
    const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]];
    g.beginPath(); q.forEach((p, k) => { const [x, y] = toPx(p); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    const cor = pick(cores); g.fillStyle = cor; g.fill();
    if (R() < 0.45) { g.save(); g.clip(); const ang = R() * Math.PI; g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; const [x0, y0] = toPx(q[0]); for (let k = -60; k < 60; k++) { g.beginPath(); g.moveTo(x0 + Math.cos(ang) * -900 + Math.sin(ang) * k * 6, y0 + Math.sin(ang) * -900 - Math.cos(ang) * k * 6); g.lineTo(x0 + Math.cos(ang) * 900 + Math.sin(ang) * k * 6, y0 + Math.sin(ang) * 900 - Math.cos(ang) * k * 6); g.stroke(); } g.restore(); }
    arestas.push([q[0], q[1]], [q[0], q[3]]);
  }
  g.strokeStyle = '#3f5f2c'; g.lineWidth = 3 * esc;
  for (const [a, b] of arestas) { g.beginPath(); g.moveTo(...toPx(a)); g.lineTo(...toPx(b)); g.stroke(); }
  // Zona do recinto: relva cortada.
  const [x0, z0, x1, z1] = zonaLivre; g.fillStyle = '#5f8e3c'; g.fillRect((x0 + raio) * esc, (z0 + raio) * esc, (x1 - x0) * esc, (z1 - z0) * esc);
  ruido(g, N, N, 14, 3);
  const t = textura(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { t, arestas };
}

// ---------- construtores ----------
function plano(cena, x, z, w, d, material, y = 0.05, rot = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.receiveShadow = true; cena.add(m); return m;
}
function matRep(base, w, d, tile) { const t = base.clone(); t.needsUpdate = true; t.repeat.set(w / tile, d / tile); return t; }
function chao(cena, w, d, x = 0, z = 0, tipo = 'betao', y = 0.06) {
  const t = matRep(tipo === 'asfalto' ? T.asfalto() : tipo === 'relva' ? T.relva() : T.betao(), w, d, tipo === 'relva' ? 6 : 8);
  return plano(cena, x, z, w, d, mat({ map: t }), y);
}
function estacionamento(cena, x, z, w, d, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; cena.add(g);
  const [c, cx] = canvas(Math.round(w * 8), Math.round(d * 8));
  cx.fillStyle = '#4a4d52'; cx.fillRect(0, 0, c.width, c.height); ruido(cx, c.width, c.height, 26, 2);
  cx.strokeStyle = 'rgba(255,255,255,.75)'; cx.lineWidth = 1.2;
  const filas = Math.floor(d / 16);
  const lugares = [];
  for (let f = 0; f < filas; f++) { const y0 = f * 16 + 1; for (const lado of [0, 1]) { const yy = y0 + lado * 9.5; for (let k = 0; k * 2.6 < w - 2; k++) { cx.beginPath(); cx.moveTo((1 + k * 2.6) * 8, yy * 8); cx.lineTo((1 + k * 2.6) * 8, (yy + 5) * 8); cx.stroke(); lugares.push([1 + k * 2.6 + 1.3 - w / 2, yy + 2.5 - d / 2, lado]); } } }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat({ map: textura(c) })); m.rotation.x = -Math.PI / 2; m.position.y = 0.07; m.receiveShadow = true; g.add(m);
  const cores = ['#d8dadd', '#1c1f24', '#8a9099', '#b02a2a', '#2a4f8a', '#f2f2f0', '#4a4f55', '#c9b28f', '#1e3a5f'];
  const corpo = new THREE.BoxGeometry(1.8, 0.8, 4.3), cabine = new THREE.BoxGeometry(1.6, 0.6, 2.2);
  const vidro = mat({ color: '#28323c', roughness: 0.2, metalness: 0.4 });
  for (const [lx, lz, lado] of lugares) {
    if (R() < 0.3) continue;
    const car = new THREE.Group(); const cor = mat({ color: pick(cores), roughness: 0.35, metalness: 0.3 });
    const b = new THREE.Mesh(corpo, cor); b.position.y = 0.55; const t = new THREE.Mesh(cabine, vidro); t.position.set(0, 1.2, -0.2);
    car.add(b, t); car.position.set(lx, 0, lz); car.rotation.y = rr(-0.05, 0.05) + (lado ? Math.PI : 0); g.add(sombra(car));
  }
  return g;
}
function estrada(cena, pts, larg = 7, y = 0.08) {
  const curva = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const n = 160, P = curva.getSpacedPoints(n), pos = [], uv = [], idx = [];
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const t = curva.getTangentAt(i / n); const nx = -t.z, nz = t.x; if (i) s += P[i].distanceTo(P[i - 1]);
    pos.push(P[i].x + (nx * larg) / 2, y, P[i].z + (nz * larg) / 2, P[i].x - (nx * larg) / 2, y, P[i].z - (nz * larg) / 2);
    uv.push(0, s / 12, 1, s / 12);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const t = uma('estrada', () => { const [c, g] = canvas(64, 256); g.fillStyle = '#4b4e53'; g.fillRect(0, 0, 64, 256); ruido(g, 64, 256, 26); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(2, 0, 2, 256); g.fillRect(60, 0, 2, 256); g.fillRect(31, 0, 2, 120); return textura(c); });
  const m = new THREE.Mesh(geo, mat({ map: t, side: THREE.DoubleSide })); m.receiveShadow = true; cena.add(m);
  return m;
}
function edificio(cena, { x, z, w, d, pisos = 2, tipo = 'painel', cor = '#e9ebee', rot = 0, vao = 4, alturaPiso = 3.6 }) {
  const h = pisos * alturaPiso, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  const fx = matRep(fachada(tipo, cor), w, h, 1); fx.repeat.set(Math.max(1, Math.round(w / vao)), pisos);
  const fz = matRep(fachada(tipo, cor), d, h, 1); fz.repeat.set(Math.max(1, Math.round(d / vao)), pisos);
  const topo = mat({ map: matRep(T.cobertura(), w, d, 10) });
  const mx = mat({ map: fx, roughness: tipo === 'vidro' ? 0.25 : 0.8, metalness: tipo === 'vidro' ? 0.3 : 0 }), mz = mat({ map: fz, roughness: tipo === 'vidro' ? 0.25 : 0.8, metalness: tipo === 'vidro' ? 0.3 : 0 });
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mz, mz, topo, topo, mx, mx]); corpo.position.y = h / 2; g.add(corpo);
  const platib = mat({ color: tipo === 'tijolo' ? '#d9d4cc' : '#dfe2e6' });
  for (const [px, pz, pw, pd] of [[0, d / 2, w, 0.4], [0, -d / 2, w, 0.4], [w / 2, 0, 0.4, d], [-w / 2, 0, 0.4, d]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.9, pd), platib); p.position.set(px, h + 0.45, pz); g.add(p); }
  for (let k = 0; k < Math.max(1, Math.floor((w * d) / 220)); k++) { const u = new THREE.Mesh(new THREE.BoxGeometry(rr(1.5, 3), rr(0.8, 1.6), rr(1.5, 3)), mat({ color: '#a9adb3' })); u.position.set(rr(-w / 2 + 2, w / 2 - 2), h + 0.6, rr(-d / 2 + 2, d / 2 - 2)); g.add(u); }
  cena.add(sombra(g)); return g;
}
function pavilhao(cena, { x, z, w, d, h, rot = 0, cor = '#c9ced4' }) {
  // Nave com cobertura em abóbada (pavilhão / campo coberto).
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
  const parede = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, d), mat({ map: matRep(fachada('painel', '#e3e6ea'), w, 4, 1) })); parede.material.map.repeat.set(Math.round(w / 5), 1); parede.position.y = (h * 0.45) / 2; g.add(parede);
  const geo = new THREE.CylinderGeometry(1, 1, w, 40, 1, true, 0, Math.PI); const t = T.telhado().clone(); t.needsUpdate = true; t.repeat.set(10, 4);
  const ab = new THREE.Mesh(geo, mat({ color: cor, map: t, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.25 })); ab.rotation.set(0, 0, Math.PI / 2); ab.scale.set(h * 0.55, 1, d / 2);
  ab.position.y = h * 0.45; g.add(ab);
  for (const s of [-1, 1]) { const tampa = new THREE.Mesh(new THREE.CircleGeometry(1, 40, 0, Math.PI), mat({ map: fachada('vidro'), side: THREE.DoubleSide })); tampa.scale.set(d / 2, h * 0.55, 1); tampa.position.set((s * w) / 2, h * 0.45, 0); tampa.rotation.y = Math.PI / 2; g.add(tampa); }
  cena.add(sombra(g)); return g;
}
function cupula(cena, { x, z, w, d, h, rot = 0 }) {
  // Insuflável branco (campo coberto de inverno).
  const geo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const t = uma('cupula', () => { const [c, g] = canvas(256, 64); g.fillStyle = '#eef0f3'; g.fillRect(0, 0, 256, 64); g.fillStyle = 'rgba(0,0,0,.06)'; for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 2, 64); return textura(c, [6, 1]); });
  const m = new THREE.Mesh(geo, mat({ map: t, roughness: 0.6 })); m.scale.set(w / 2, h, d / 2); m.position.set(x, 0, z); m.rotation.y = rot; cena.add(sombra(m)); return m;
}
function holofote(cena, x, z, h, alvo = [0, 0]) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, h, 8), mat({ color: '#9aa0a8', metalness: 0.5, roughness: 0.4 })); poste.position.y = h / 2; g.add(poste);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 0.6), [mat({ color: '#555' }), mat({ color: '#555' }), mat({ color: '#555' }), mat({ color: '#555' }), mat({ color: '#fffbe8', emissive: '#fff3c4', emissiveIntensity: 0.6 }), mat({ color: '#555' })]);
  cab.position.y = h + 1; cab.lookAt(alvo[0] - x, 0, alvo[1] - z); cab.rotateX(0.2); g.add(cab);
  cena.add(sombra(g)); return g;
}
function campo(cena, { x, z, L = 105, W = 68, m = 4, rot = 0, sintetico = false, balizas = true, rede = true }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; cena.add(g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(L + 2 * m, W + 2 * m), mat({ map: texCampo(L, W, m, { sintetico, riscas: L > 80 ? 14 : 8 }), roughness: 0.95 }));
  p.rotation.x = -Math.PI / 2; p.position.y = 0.1; p.receiveShadow = true; g.add(p);
  const branco = mat({ color: '#ffffff', roughness: 0.4 });
  if (balizas) for (const s of [-1, 1]) {
    const gw = L > 80 ? 7.32 : 5, gh = L > 80 ? 2.44 : 2;
    const baliza = new THREE.Group();
    for (const zz of [-gw / 2, gw / 2]) { const poste = new THREE.Mesh(new THREE.BoxGeometry(0.14, gh, 0.14), branco); poste.position.set(0, gh / 2, zz); baliza.add(poste); }
    const trave = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, gw), branco); trave.position.y = gh; baliza.add(trave);
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh * 1.1), mat({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide })); rd.rotation.y = Math.PI / 2; rd.position.set(s * 1.4, gh / 2, 0); baliza.add(rd);
    baliza.position.set((s * L) / 2, 0.1, 0); g.add(sombra(baliza));
  }
  if (rede) for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, 6), mat({ color: '#20262c', transparent: true, opacity: 0.22, side: THREE.DoubleSide })); r.rotation.y = Math.PI / 2; r.position.set(s * (L / 2 + m - 0.3), 3, 0); g.add(r); }
  return g;
}
function arvores(cena, lista) {
  // lista: [x, z, escala]
  if (!lista.length) return;
  const copa = new THREE.IcosahedronGeometry(1, 1), tronco = new THREE.CylinderGeometry(0.25, 0.35, 1, 6);
  const pos = copa.attributes.position; for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * rr(0.85, 1.15), pos.getY(i) * rr(0.85, 1.1), pos.getZ(i) * rr(0.85, 1.15)); copa.computeVertexNormals();
  const n = lista.length * 3;
  const mc = new THREE.InstancedMesh(copa, mat({ color: '#ffffff', roughness: 0.9, flatShading: true }), n), mt = new THREE.InstancedMesh(tronco, mat({ color: '#5b4632' }), lista.length);
  const o = new THREE.Object3D(), cor = new THREE.Color(); let k = 0;
  lista.forEach(([x, z, e = 1], i) => {
    const h = 3.2 * e; o.position.set(x, h / 2, z); o.scale.set(e, h, e); o.rotation.set(0, 0, 0); o.updateMatrix(); mt.setMatrixAt(i, o.matrix);
    const base = pick(['#3f6b2c', '#4a7a32', '#36602a', '#55823a', '#2f5626']);
    for (let b = 0; b < 3; b++) { const s = e * rr(2.2, 3.4); o.position.set(x + rr(-1.4, 1.4) * e, h + s * 0.7 + rr(-0.5, 1.2) * e, z + rr(-1.4, 1.4) * e); o.scale.set(s, s * rr(0.85, 1.1), s); o.rotation.set(R() * 3, R() * 3, R() * 3); o.updateMatrix(); mc.setMatrixAt(k, o.matrix); mc.setColorAt(k, cor.set(mistura(base, '#88a85a', rr(0, 0.25)))); k++; }
  });
  mc.castShadow = mt.castShadow = true; mc.receiveShadow = true; cena.add(mc, mt);
}
function sebes(cena, arestas, livre, raio) {
  const geo = new THREE.IcosahedronGeometry(1, 0), pts = [];
  const [x0, z0, x1, z1] = livre;
  for (const [a, b] of arestas) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (R() < 0.25) continue;
    for (let s = 0; s < len; s += 2.6) { const t = s / len, x = a[0] + (b[0] - a[0]) * t + rr(-0.6, 0.6), z = a[1] + (b[1] - a[1]) * t + rr(-0.6, 0.6);
      if (x > x0 - 6 && x < x1 + 6 && z > z0 - 6 && z < z1 + 6) continue; if (Math.hypot(x, z) > raio * 0.7) continue; pts.push([x, z]); }
  }
  const m = new THREE.InstancedMesh(geo, mat({ color: '#ffffff', flatShading: true, roughness: 1 }), pts.length), o = new THREE.Object3D(), cor = new THREE.Color();
  pts.forEach(([x, z], i) => { const s = rr(1.4, 2.2); o.position.set(x, s * 0.6, z); o.scale.set(s, s * rr(0.7, 1), s); o.rotation.set(R() * 3, R() * 3, R() * 3); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cor.set(pick(['#365a28', '#3f652d', '#2f5023', '#47703a']))); });
  m.castShadow = true; m.receiveShadow = true; cena.add(m);
  // Algumas árvores nos cruzamentos das sebes.
  const lista = []; for (const [a] of arestas) { if (R() < 0.18) { const [x, z] = a; if (!(x > x0 - 10 && x < x1 + 10 && z > z0 - 10 && z < z1 + 10) && Math.hypot(x, z) < raio * 0.7) for (let k = 0; k < 1 + Math.floor(R() * 4); k++) lista.push([x + rr(-6, 6), z + rr(-6, 6), rr(1.2, 2)]); } }
  arvores(cena, lista);
}
function casas(cena, lista) {
  for (const [x, z, rot] of lista) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const w = rr(8, 11), d = rr(7, 9), h = rr(5, 6.5);
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat({ map: matRep(fachada('painel', pick(['#efe9df', '#e8e2d6', '#f3f0ea', '#e2d6c4'])), w, h, 1) })); corpo.material.map.repeat.set(Math.round(w / 3.5), 2); corpo.position.y = h / 2; g.add(corpo);
    const tel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.62, w + 0.6, 4, 1), mat({ color: pick(['#8e4b36', '#7a3f2e', '#5a5f66', '#9b5a40']) }));
    tel.rotation.z = Math.PI / 2; tel.rotation.x = Math.PI / 4; tel.scale.set(1, 1, 0.55); tel.position.y = h + d * 0.18; g.add(tel);
    cena.add(sombra(g));
  }
}

// Bancadas ao longo de um caminho (borda interior). camadas: [{filas, alt(espelho), prof(degrau), salto}]
function bancada(cena, caminho, fechado, centro, o) {
  const pts = caminho.map(([x, z]) => new THREE.Vector2(x, z));
  const n = pts.length, N = [];
  for (let i = 0; i < n; i++) {
    const a = pts[fechado ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[fechado ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const t = b.clone().sub(a).normalize(); let nn = new THREE.Vector2(t.y, -t.x);
    if (nn.dot(pts[i].clone().sub(centro)) < 0) nn.negate();
    N.push(nn);
  }
  const off = (i, d) => pts[i].clone().add(N[i].clone().multiplyScalar(d));
  const L = [0]; for (let i = 1; i < n + (fechado ? 1 : 0); i++) L.push(L[i - 1] + pts[i % n].distanceTo(pts[i - 1]));
  const segs = fechado ? n : n - 1;
  const geo = { assento: [], betao: [], vidro: [], fachada: [], tecto: [], led: [] };
  const quad = (lst, p, u) => { lst.push([p, u]); };
  // perfil: lista de pontos (d, y) da frente para trás.
  const perfil = [[0, o.base]]; let d = 0, y = o.base; const degraus = [];
  for (const c of o.camadas) {
    if (c.salto) { perfil.push([d, y + c.salto]); degraus.push({ tipo: 'vidro', d, y0: y, y1: y + c.salto }); y += c.salto; d -= c.recuo ?? 0; perfil.push([d, y]); }
    for (let k = 0; k < c.filas; k++) { degraus.push({ tipo: 'espelho', d, y0: y, y1: y + c.alt }); y += c.alt; perfil.push([d, y]); degraus.push({ tipo: 'piso', d0: d, d1: d + c.prof, y }); d += c.prof; perfil.push([d, y]); }
  }
  const D = d, H = y;
  for (let s = 0; s < segs; s++) {
    const i = s, j = (s + 1) % n, u0 = L[s] / 11.2, u1 = L[s + 1] / 11.2;
    const P = (k, dd, yy) => { const v = off(k, dd); return [v.x, yy, v.y]; };
    for (const g of degraus) {
      if (g.tipo === 'piso') quad(geo.assento, [P(i, g.d0, g.y), P(j, g.d0, g.y), P(j, g.d1, g.y), P(i, g.d1, g.y)], [[u0, 1], [u1, 1], [u1, 0], [u0, 0]]);
      else quad(g.tipo === 'vidro' ? geo.vidro : geo.betao, [P(i, g.d, g.y0), P(j, g.d, g.y0), P(j, g.d, g.y1), P(i, g.d, g.y1)], [[u0 * 3, 0], [u1 * 3, 0], [u1 * 3, 1], [u0 * 3, 1]]);
    }
    // Muro da frente e fachada de trás.
    quad(geo.betao, [P(i, 0, 0), P(j, 0, 0), P(j, 0, o.base), P(i, 0, o.base)], [[u0, 0], [u1, 0], [u1, 1], [u0, 1]]);
    const topoF = o.cobertura ? o.cobertura.altura : H + 1.2;
    quad(geo.fachada, [P(j, D, 0), P(i, D, 0), P(i, D, topoF), P(j, D, topoF)], [[u1 * 2.8, 0], [u0 * 2.8, 0], [u0 * 2.8, 1], [u1 * 2.8, 1]]);
    if (o.led) quad(geo.led, [P(j, D + 0.08, topoF * 0.72), P(i, D + 0.08, topoF * 0.72), P(i, D + 0.08, topoF * 0.72 + 1.6), P(j, D + 0.08, topoF * 0.72 + 1.6)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (topoF > 14) quad(geo.vidro, [P(j, D + 0.06, 2.5), P(i, D + 0.06, 2.5), P(i, D + 0.06, 6), P(j, D + 0.06, 6)], [[u1 * 5, 0], [u0 * 5, 0], [u0 * 5, 1], [u1 * 5, 1]]);
    if (!o.cobertura) quad(geo.betao, [P(i, D - 0.01, H + 1.2), P(j, D - 0.01, H + 1.2), P(j, D + 0.4, H + 1.2), P(i, D + 0.4, H + 1.2)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (o.cobertura) {
      const c = o.cobertura, f = c.inicio != null ? D * c.inicio : -c.balanco, yb = c.altura, yf = c.altura - c.queda;
      quad(geo.tecto, [P(i, f, yf), P(j, f, yf), P(j, D + 0.6, yb), P(i, D + 0.6, yb)], [[u0 * 2, 0], [u1 * 2, 0], [u1 * 2, (D - f) / 12], [u0 * 2, (D - f) / 12]]);
      quad(geo.tecto, [P(i, D + 0.6, yb - 0.35), P(j, D + 0.6, yb - 0.35), P(j, f, yf - 0.35), P(i, f, yf - 0.35)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      quad(geo.fachada, [P(i, f, yf - 1.6), P(j, f, yf - 1.6), P(j, f, yf), P(i, f, yf)], [[u0 * 2.8, 0], [u1 * 2.8, 0], [u1 * 2.8, 0.4], [u0 * 2.8, 0.4]]);
    }
  }
  // Topos laterais (só abertas).
  const tampas = [];
  if (!fechado) for (const k of [0, n - 1]) {
    const forma = [[0, 0], ...perfil, [D, perfil[perfil.length - 1][1]], [D, o.cobertura ? o.cobertura.altura : H + 1.2], [D, 0]];
    const tri = THREE.ShapeUtils.triangulateShape(forma.map(([a, b]) => new THREE.Vector2(a, b)), []);
    for (const [a, b, c] of tri) tampas.push(...[forma[a], forma[b], forma[c]].map(([dd, yy]) => { const v = off(k, dd); return [v.x, yy, v.y]; }));
  }
  const fazer = (lst, material) => {
    if (!lst.length) return;
    const pos = [], uv = [];
    for (const [p, u] of lst) { for (const t of [0, 1, 2, 0, 2, 3]) { pos.push(...p[t]); uv.push(...u[t]); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; cena.add(m);
  };
  const corF = o.fachadaCor ?? '#d7dade';
  fazer(geo.assento, mat({ map: texBancada(o.cor), side: THREE.DoubleSide, roughness: 0.7 }));
  fazer(geo.betao, mat({ color: '#b9b7b1', side: THREE.DoubleSide }));
  fazer(geo.vidro, mat({ map: fachada('vidro'), side: THREE.DoubleSide, roughness: 0.2, metalness: 0.35 }));
  const tf = uma('fachEst' + corF, () => { const [c, g] = canvas(128, 128); g.fillStyle = corF; g.fillRect(0, 0, 128, 128); for (let x = 0; x < 128; x += 16) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x, 0, 3, 128); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 3, 0, 2, 128); } ruido(g, 128, 128, 8); return textura(c); });
  fazer(geo.fachada, mat({ map: tf, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.1 }));
  if (o.led) fazer(geo.led, mat({ color: o.led, emissive: o.led, emissiveIntensity: 0.45, side: THREE.DoubleSide }));
  fazer(geo.tecto, mat({ map: T.telhado(), color: o.tectoCor ?? '#e8eaed', side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 }));
  if (tampas.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tampas.flat(), 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat({ color: corF, side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true; cena.add(m); }
  return { D, H };
}
function rectArred(a, b, r, segs = 10) {
  const p = []; const cantos = [[a - r, b - r, 0], [-(a - r), b - r, Math.PI / 2], [-(a - r), -(b - r), Math.PI], [a - r, -(b - r), (3 * Math.PI) / 2]];
  for (const [cx, cz, a0] of cantos) for (let k = 0; k <= segs; k++) { const t = a0 + (k / segs) * (Math.PI / 2); p.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]); }
  return p;
}

// ---------- cenas ----------
function base(cena, livre, raio = 900) {
  const { t, arestas } = texCampoAgricola(raio, livre);
  const solo = new THREE.Mesh(new THREE.PlaneGeometry(2 * raio, 2 * raio), mat({ map: t, roughness: 1 })); solo.rotation.x = -Math.PI / 2; solo.receiveShadow = true; cena.add(solo);
  const longe = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat({ color: '#6f9450', roughness: 1 })); longe.rotation.x = -Math.PI / 2; longe.position.y = -0.3; cena.add(longe);
  sebes(cena, arestas, livre, raio);
}

function cenaEstadio(cena, nivel, tam, cor) {
  const L = 105, W = 68, gap = 2 + (nivel >= 8 ? 1 : 0), ax = L / 2 + 6, az = W / 2 + 5;
  const esc = 0.7 + 0.15 * tam;
  const filas = Math.round((5 + nivel * 3.1) * esc);
  const livre = [-150 - nivel * 6, -110 - nivel * 5, 150 + nivel * 6, 120 + nivel * 6];
  base(cena, livre);
  chao(cena, livre[2] - livre[0], livre[3] - livre[1], (livre[0] + livre[2]) / 2, (livre[1] + livre[3]) / 2, 'relva', 0.03);
  campo(cena, { x: 0, z: 0, L, W, m: 5, rede: false });
  const cinza = '#8c949c', principal = cor, outras = nivel >= 5 ? cor : cinza;
  const camadas = (f, alt = 0.42, prof = 0.8) => f > 30 && nivel >= 9 ? [{ filas: Math.round(f * 0.5), alt, prof }, { salto: 4, recuo: 3, filas: Math.round(f * 0.5), alt: alt * 1.25, prof }] : [{ filas: f, alt, prof }];
  const alturaDe = (cs) => 1.2 + cs.reduce((s, c) => s + (c.salto ?? 0) + c.filas * c.alt, 0);
  const profDe = (cs) => cs.reduce((s, c) => s - (c.recuo ?? 0) + c.filas * c.prof, 0);
  let fora = { x: ax, z: az };
  if (nivel >= 8) {
    // Estádio fechado (bacia) com cobertura contínua.
    const cs = camadas(filas);
    const caminho = rectArred(ax + gap, az + gap, 16 + nivel, 8);
    const H = alturaDe(cs), D = profDe(cs);
    bancada(cena, caminho, true, new THREE.Vector2(0, 0), { cor: principal, base: 1.2, camadas: cs, cobertura: { altura: H + 6, queda: 0.8, inicio: 0.35 }, fachadaCor: '#e4e7ea', led: nivel >= 9 ? cor : null, tectoCor: '#f1f3f5' });
    fora = { x: ax + gap + D, z: az + gap + D };
    // Luzes no anel da cobertura.
    for (let k = 0; k < 4; k++) { const s = k < 2 ? 1 : -1, t = k % 2 ? 1 : -1; const l = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 1.2), mat({ color: '#fff', emissive: '#fff4c8', emissiveIntensity: 0.8 })); l.position.set(t * ax * 0.55, H + 6.3, s * (az + gap - 4)); cena.add(l); }
  } else {
    const fP = filas, fO = Math.round(filas * (nivel >= 3 ? 0.8 : 0.45)), fT = Math.round(filas * 0.65);
    const cobre = (lado) => nivel >= 6 || (lado === 'P' && nivel >= 2) || (lado === 'O' && nivel >= 4) || (lado === 'T' && nivel >= 5);
    const lados = [['P', [[-L / 2 - 2, az + gap], [L / 2 + 2, az + gap]], fP, principal]];
    if (nivel >= 2) lados.push(['O', [[L / 2 + 2, -az - gap], [-L / 2 - 2, -az - gap]], fO, outras]);
    if (nivel >= 3) for (const s of [-1, 1]) lados.push(['T', [[s * (ax + gap), (-W / 2 - 1) * s], [s * (ax + gap), (W / 2 + 1) * s]], nivel >= 4 ? fT : 4, outras]);
    for (const [lado, cam, f, c] of lados) {
      const cs = camadas(f), H = alturaDe(cs);
      const r = bancada(cena, cam, false, new THREE.Vector2(0, 0), { cor: c, base: 1.2, camadas: cs, cobertura: cobre(lado) ? { altura: H + 4.5, queda: 0.6, inicio: 0.4 } : null, fachadaCor: lado === 'P' ? '#e2e5e8' : '#cfd3d8' });
      if (lado === 'P') fora.z = az + gap + r.D;
    }
    if (nivel >= 7) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bancada(cena, [[sx * (L / 2 + 2), sz * (az + gap)], [sx * (ax + gap), sz * (W / 2 + 1)]], false, new THREE.Vector2(0, 0), { cor: outras, base: 1.2, camadas: camadas(Math.round(filas * 0.6)), fachadaCor: '#cfd3d8' });
    }
    if (nivel < 7) { const hh = 20 + nivel * 3; for (const sx of [-1, 1]) for (const sz of [-1, 1]) holofote(cena, sx * (ax + gap + 10), sz * (az + gap + 8), hh); }
  }
  // Envolvente: praça, estacionamentos, estrada, árvores, edifícios.
  const px = Math.max(fora.x, ax) + 12, pz = Math.max(fora.z, az) + 12;
  chao(cena, 2 * px, 2 * pz, 0, 0, 'betao', 0.05);
  const pk = 50 + nivel * 6;
  estacionamento(cena, -px - pk / 2 - 6, 0, pk, Math.min(2 * pz, 32 + nivel * 8), Math.PI / 2);
  if (nivel >= 4) estacionamento(cena, 0, -pz - 26, Math.min(2 * px, 60 + nivel * 10), 32);
  if (nivel >= 7) estacionamento(cena, px + 40, -pz - 20, 64, 48);
  estrada(cena, [[-700, 140 + nivel * 4], [-300, 120 + nivel * 6], [-60, pz + 22], [200, pz + 30], [500, 60], [800, -120]], 9);
  estrada(cena, [[-px - pk - 10, pz + 26], [-px - pk - 10, 0], [-px - pk - 10, -pz - 10]], 7);
  if (nivel >= 6) { edificio(cena, { x: px + 26, z: pz - 10, w: 34, d: 20, pisos: 3, tipo: 'vidro', rot: 0 }); edificio(cena, { x: px + 26, z: pz + 22, w: 18, d: 14, pisos: 1, tipo: 'painel', cor: '#f0f1f3' }); }
  else edificio(cena, { x: px + 18, z: pz - 6, w: 16, d: 10, pisos: 1, tipo: 'tijolo' });
  if (tam >= 2 && nivel >= 5) campo(cena, { x: px + 40 + 50, z: 40, L: 90, W: 60, m: 3 });
  if (nivel <= 5) casas(cena, Array.from({ length: 10 }, (_, k) => [-px - 30 + k * 18 + rr(-3, 3), pz + 55 + rr(-4, 4), rr(-0.1, 0.1)]));
  const lista = [];
  for (let k = 0; k < 26; k++) lista.push([rr(-px - 20, px + 20), pz + rr(36, 48), rr(1, 1.6)]);
  for (let k = 0; k < 18; k++) lista.push([px + rr(8, 14), rr(-pz, pz - 30), rr(1, 1.5)]);
  for (let k = 0; k < 14; k++) lista.push([rr(-px, px), -pz - rr(52, 64), rr(1, 1.6)]);
  arvores(cena, lista);
  return { alvo: [0, 0, 6], dist: 300 + nivel * 13 + tam * 10, raio: Math.max(px, pz) + 60 };
}

function cenaTreino(cena, nivel) {
  const livre = [-170, -130, 180, 130]; base(cena, livre);
  chao(cena, 350, 260, 5, 0, 'relva', 0.03);
  const n = Math.min(5, 1 + Math.floor(nivel / 2));
  const pos = [[-95, -60], [-95, 18], [5, -60], [5, 18], [-45, 90]];
  for (let k = 0; k < n; k++) { const [x, z] = pos[k]; campo(cena, { x, z, L: k === 4 ? 70 : 92, W: k === 4 ? 46 : 62, m: 3, sintetico: k === 3 && nivel >= 6 }); if (nivel >= 4) for (const [hx, hz] of [[x - 50, z - 35], [x + 50, z - 35], [x - 50, z + 35], [x + 50, z + 35]]) if (k !== 4 || nivel >= 7) holofote(cena, hx, hz, 15, [x, z]); }
  if (nivel >= 3) { const g = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat({ map: matRep(T.betao(), 40, 30, 8), color: '#4a7fe0' })); g.rotation.x = -Math.PI / 2; g.position.set(110, 0.08, -70); g.receiveShadow = true; cena.add(g); }
  edificio(cena, { x: 110, z: 5, w: 40, d: 22, pisos: 1 + Math.floor(nivel / 3), tipo: nivel >= 5 ? 'vidro' : 'painel' });
  if (nivel >= 5) edificio(cena, { x: 110, z: 45, w: 26, d: 18, pisos: 2, tipo: 'painel', cor: '#e8e9ec' });
  if (nivel >= 7) cupula(cena, { x: 60, z: 90, w: 70, d: 45, h: 14 });
  if (nivel >= 8) pavilhao(cena, { x: 130, z: 95, w: 48, d: 30, h: 14 });
  estacionamento(cena, 125, -30, 50, 32 + nivel * 2);
  estrada(cena, [[-800, 170], [-200, 150], [100, 150], [180, 120], [400, -60], [800, -200]], 8);
  estrada(cena, [[155, 140], [158, 60], [160, -25]], 6);
  const lista = []; for (let k = 0; k < 40; k++) lista.push([rr(-165, 175), pick([-125, 128]) + rr(-4, 4), rr(1, 1.6)]); for (let k = 0; k < 16; k++) lista.push([pick([-160, 170]) + rr(-4, 4), rr(-120, 120), rr(1, 1.5)]);
  arvores(cena, lista);
  return { alvo: [15, 0, 20], dist: 390, raio: 230 };
}

function cenaAcademia(cena, nivel) {
  const livre = [-150, -120, 160, 120]; base(cena, livre);
  chao(cena, 310, 240, 5, 0, 'relva', 0.03);
  const n = Math.min(4, 1 + Math.floor(nivel / 3));
  const pos = [[-80, -55], [5, -55], [-80, 15], [5, 15]];
  for (let k = 0; k < n; k++) { const [x, z] = pos[k]; campo(cena, { x, z, L: k ? 68 : 82, W: k ? 46 : 54, m: 3, sintetico: k === 1 }); if (nivel >= 5) for (const [hx, hz] of [[x - 40, z - 28], [x + 40, z + 28]]) holofote(cena, hx, hz, 12, [x, z]); }
  if (nivel >= 7) { const { t, w, h } = texPista(); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat({ map: t })); p.rotation.x = -Math.PI / 2; p.position.set(-30, 0.09, 85); p.receiveShadow = true; cena.add(p); campo(cena, { x: -30, z: 85, L: 82, W: 54, m: 0, rede: false }); }
  if (nivel >= 6) bancada(cena, [[-120, 39], [-40, 39]], false, new THREE.Vector2(-80, 15), { cor: '#8c949c', base: 0.8, camadas: [{ filas: 6, alt: 0.4, prof: 0.8 }], cobertura: { altura: 6.5, queda: 0.6, balanco: 1.5 } });
  edificio(cena, { x: 100, z: -50, w: 34, d: 20, pisos: 1 + Math.floor(nivel / 4), tipo: 'painel', cor: '#eceef1' });
  if (nivel >= 5) edificio(cena, { x: 100, z: 5, w: 22, d: 34, pisos: Math.min(5, 2 + Math.floor((nivel - 5) / 2)), tipo: 'tijolo' });
  if (nivel >= 8) pavilhao(cena, { x: 100, z: 70, w: 44, d: 28, h: 12 });
  estacionamento(cena, 100, -95, 46, 26);
  estrada(cena, [[-800, -150], [-200, -140], [130, -125], [400, -60], [800, 60]], 8);
  const lista = []; for (let k = 0; k < 34; k++) lista.push([rr(-145, 155), pick([-115, 116]) + rr(-4, 4), rr(1, 1.5)]); for (let k = 0; k < 10; k++) lista.push([pick([-146, 152]) + rr(-3, 3), rr(-110, 110), rr(1, 1.4)]);
  arvores(cena, lista);
  return { alvo: [0, 0, 15], dist: 345, raio: 210 };
}

function cenaMedico(cena, nivel) {
  const livre = [-110, -90, 110, 90]; base(cena, livre);
  chao(cena, 220, 180, 0, 0, 'relva', 0.03);
  chao(cena, 120, 70, -10, -5, 'betao', 0.05);
  const pisos = 1 + Math.floor(nivel / 2);
  edificio(cena, { x: -20, z: -10, w: 50, d: 26, pisos, tipo: nivel >= 4 ? 'vidro' : 'painel' });
  // Cruz no telhado.
  const tc = uma('cruz', () => { const [c, g] = canvas(128, 128); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#d23a3a'; g.fillRect(48, 16, 32, 96); g.fillRect(16, 48, 96, 32); return textura(c); });
  plano(cena, -20, -10, 12, 12, mat({ map: tc }), pisos * 3.6 + 0.2);
  if (nivel >= 3) campo(cena, { x: 55, z: 45, L: 40, W: 26, m: 2, balizas: false, rede: false, sintetico: true });
  if (nivel >= 4) { // piscina de recuperação exterior
    const agua = mat({ color: '#3fa7d6', roughness: 0.08, metalness: 0.1 }); plano(cena, 45, -30, 24, 12, mat({ color: '#e8e5df' }), 0.06); plano(cena, 45, -30, 20, 8, agua, 0.08);
  }
  if (nivel >= 6) { const th = uma('heli', () => { const [c, g] = canvas(256, 256); g.fillStyle = '#4a4d52'; g.fillRect(0, 0, 256, 256); ruido(g, 256, 256, 20); g.strokeStyle = '#f2c230'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 140px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 128, 136); return textura(c); }); plano(cena, -75, 50, 26, 26, mat({ map: th }), 0.07); }
  if (nivel >= 7) edificio(cena, { x: 40, z: -5, w: 22, d: 16, pisos: 1, tipo: 'vidro' });
  if (nivel >= 9) edificio(cena, { x: -20, z: 35, w: 30, d: 16, pisos: 2, tipo: 'painel', cor: '#eef0f2' });
  estacionamento(cena, -70, -55, 40, 26);
  // Ambulância
  const amb = new THREE.Group(); const corpo = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.6, 6), mat({ map: uma('amb', () => { const [c, g] = canvas(64, 64); g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e8b21a'; g.fillRect(0, 34, 64, 6); g.fillStyle = '#2c63c9'; g.fillRect(0, 42, 64, 4); return textura(c); }) })); corpo.position.y = 1.5; amb.add(corpo); amb.position.set(10, 0, 12); cena.add(sombra(amb));
  estrada(cena, [[-700, -100], [-150, -95], [100, -85], [400, -20], [700, 80]], 8);
  const lista = []; for (let k = 0; k < 30; k++) lista.push([rr(-105, 105), pick([-85, 86]) + rr(-3, 3), rr(0.9, 1.4)]); for (let k = 0; k < 10; k++) lista.push([pick([-104, 104]), rr(-80, 80), rr(1, 1.4)]);
  arvores(cena, lista);
  return { alvo: [-10, 0, 5], dist: 235, raio: 150 };
}

function cenaScout(cena, nivel) {
  // Escritório de scouting em corte (interior).
  const W = 22, D = 16, Hp = 4.2;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat({ map: matRep(T.madeira(), W, D, 4) })); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; cena.add(piso);
  const tapete = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), mat({ color: '#3a4a5c', roughness: 1 })); tapete.rotation.x = -Math.PI / 2; tapete.position.set(1, 0.02, 1); tapete.receiveShadow = true; cena.add(tapete);
  const parede = mat({ color: '#e4e2dc' }), paredeEsc = mat({ color: '#3d4b5a' });
  const pf = new THREE.Mesh(new THREE.BoxGeometry(W, Hp, 0.3), parede); pf.position.set(0, Hp / 2, -D / 2); cena.add(sombra(pf));
  const pe = new THREE.Mesh(new THREE.BoxGeometry(0.3, Hp, D), paredeEsc); pe.position.set(-W / 2, Hp / 2, 0); cena.add(sombra(pe));
  const rodape = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.34), mat({ color: '#6b5a4a' })); rodape.position.set(0, 0.06, -D / 2 + 0.02); cena.add(rodape);
  // Mapa-mundo com pinos.
  const tm = uma('mapa' + nivel, () => { const [c, g] = canvas(512, 256); g.fillStyle = '#16354d'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#3f7f58';
    const blobs = [[95, 80, 60, 40], [130, 175, 28, 50], [250, 75, 30, 22], [262, 145, 34, 50], [360, 80, 80, 40], [420, 185, 30, 18]];
    for (const [x, y, rx, ry] of blobs) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.08)'; for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    for (let k = 0; k < Math.min(18, 4 + nivel * 1.5); k++) { g.fillStyle = k % 3 ? '#f2b632' : '#e0565b'; g.beginPath(); g.arc(40 + R() * 430, 50 + R() * 160, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#111'; g.stroke(); }
    return textura(c); });
  const mapa = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), mat({ map: tm, emissive: '#ffffff', emissiveMap: tm, emissiveIntensity: 0.15 })); mapa.position.set(-4, 2.3, -D / 2 + 0.17); cena.add(mapa);
  // Quadro táctico na parede esquerda.
  const tq = texCampo(40, 26, 2, { riscas: 6 });
  const quadro = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.2), mat({ map: tq })); quadro.rotation.y = Math.PI / 2; quadro.position.set(-W / 2 + 0.17, 2.2, -1); cena.add(quadro);
  // Janela (parede do fundo, à direita).
  const tj = uma('janela', () => { const [c, g] = canvas(256, 128); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#bfe0f5'); gr.addColorStop(1, '#e9f4fb'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.fillStyle = '#7fae6a'; g.fillRect(0, 96, 256, 32); g.fillStyle = '#e8ebee'; for (const x of [0, 84, 170, 252]) g.fillRect(x, 0, 4, 128); g.fillRect(0, 0, 256, 4); g.fillRect(0, 124, 256, 4); return textura(c); });
  const jan = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), mat({ map: tj, emissive: '#ffffff', emissiveMap: tj, emissiveIntensity: 0.9 })); jan.position.set(5.5, 2.4, -D / 2 + 0.17); cena.add(jan);
  // Ecrãs.
  const telas = ['#2f7a45', '#3b6fd1', '#c0841f', '#7a3fb0'].map((c, i) => uma('tela' + i, () => { const [cv, g] = canvas(128, 80); g.fillStyle = '#0f1620'; g.fillRect(0, 0, 128, 80); g.fillStyle = c; g.fillRect(6, 6, 116, 14); for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(8, 26 + k * 7, 40 + R() * 70, 3); } g.fillStyle = c; for (let k = 0; k < 6; k++) { const h = 8 + R() * 30; g.fillRect(70 + k * 9, 76 - h, 6, h); } return textura(cv); }));
  const madeira = mat({ map: matRep(T.madeira(), 2, 2, 2), color: '#c9a27a' }), preto = mat({ color: '#1b1e22', roughness: 0.4 }), cadeira = mat({ color: '#2a2f37', roughness: 0.6 });
  const postos = Math.min(6, 1 + Math.floor(nivel / 2));
  const lugares = [[-5, -3.5], [1.5, -3.5], [-5, 1.5], [1.5, 1.5], [7, -1], [7, 4]];
  for (let k = 0; k < postos; k++) {
    const [x, z] = lugares[k]; const g = new THREE.Group(); g.position.set(x, 0, z);
    const tampo = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 1.6), madeira); tampo.position.y = 0.76; g.add(tampo);
    for (const [lx, lz] of [[-2, -0.7], [2, -0.7], [-2, 0.7], [2, 0.7]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.76, 0.06), preto); p.position.set(lx, 0.38, lz); g.add(p); }
    const ec = nivel >= 7 ? 3 : nivel >= 4 ? 2 : 1;
    for (let e = 0; e < ec; e++) { const ex = (e - (ec - 1) / 2) * 1.25; const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.05), preto); m.position.set(ex, 1.25, -0.5); g.add(m); const tt = telas[(k + e) % 4]; const s = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.63), mat({ map: tt, emissive: '#ffffff', emissiveMap: tt, emissiveIntensity: 0.9 })); s.position.set(ex, 1.25, -0.47); g.add(s); const pe2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), preto); pe2.position.set(ex, 0.98, -0.52); g.add(pe2); }
    const tecl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.3), preto); tecl.position.set(0, 0.81, 0.1); g.add(tecl);
    const ch = new THREE.Group(); const as = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), cadeira); as.position.y = 0.5; const co = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.08), cadeira); co.position.set(0, 0.9, 0.3); const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45), preto); ps.position.y = 0.25; const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 10), preto); pb.position.y = 0.03; ch.add(as, co, ps, pb); ch.position.set(rr(-0.4, 0.4), 0, 1.25); ch.rotation.y = rr(-0.3, 0.3); g.add(ch);
    cena.add(sombra(g));
  }
  // Arquivos.
  for (let k = 0; k < 2 + Math.floor(nivel / 4); k++) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.6), mat({ color: '#6b7480', metalness: 0.3, roughness: 0.5 })); a.position.set(W / 2 - 1 - k * 1, 0.7, -D / 2 + 0.5); cena.add(sombra(a)); }
  // Plantas.
  for (const [x, z] of [[-W / 2 + 0.8, -D / 2 + 0.8], [W / 2 - 0.8, D / 2 - 3]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 12), mat({ color: '#e8e4dc' })); v.position.set(x, 0.25, z); cena.add(sombra(v)); const l = []; arvores(cena, [[x, z, 0.25]]); }
  if (nivel >= 5) { const mesa = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.08, 32), madeira); mesa.position.set(-5.5, 0.75, 5.5); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 0.75, 12), preto); p.position.set(-5.5, 0.37, 5.5); cena.add(sombra(mesa), sombra(p)); }
  if (nivel >= 8) { const vw = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 0.12), preto); vw.position.set(-W / 2 + 0.25, 2.2, 5); vw.rotation.y = Math.PI / 2; cena.add(vw); const tt = telas[1]; const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), mat({ map: tt, emissive: '#fff', emissiveMap: tt, emissiveIntensity: 1 })); s.rotation.y = Math.PI / 2; s.position.set(-W / 2 + 0.33, 2.2, 5); cena.add(s); }
  const lp = new THREE.PointLight('#fff1d8', 25, 30, 1.5); lp.position.set(0, 3.8, 0); cena.add(lp);
  return { alvo: [0, 0, 0.5], dist: 23, raio: 16, interior: true };
}

// ---------- render ----------
let renderer;
export function render(tipo, nivel, tam = 2, cor = '#c8102e', largura = 1100, altura = 776) {
  R = rng((tipo.length * 1000 + nivel * 37 + tam * 7) | 0); cache.clear();
  if (!renderer) { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; }
  renderer.setSize(largura, altura, false);
  const cena = new THREE.Scene();
  const ceu = '#cfdde8'; cena.background = new THREE.Color(ceu);
  const r = tipo === 'estadio' ? cenaEstadio(cena, nivel, tam, cor) : tipo === 'treino' ? cenaTreino(cena, nivel) : tipo === 'academia' ? cenaAcademia(cena, nivel) : tipo === 'medico' ? cenaMedico(cena, nivel) : cenaScout(cena, nivel);
  renderer.toneMappingExposure = r.interior ? 1.0 : 1.05;
  if (!r.interior) cena.fog = new THREE.Fog(ceu, r.dist * 1.6, r.dist * 4.2);
  cena.add(new THREE.HemisphereLight('#dcecff', '#4d5e36', r.interior ? 1.2 : 1.1));
  const sol = new THREE.DirectionalLight('#fff3e0', r.interior ? 1.6 : 3.0);
  const [ax, ay, az] = r.alvo;
  sol.position.set(ax - r.raio * 0.9, r.raio * 1.6, az - r.raio * 0.5); sol.target.position.set(ax, 0, az); cena.add(sol, sol.target);
  sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
  const sc = sol.shadow.camera; sc.left = -r.raio * 1.3; sc.right = r.raio * 1.3; sc.top = r.raio * 1.3; sc.bottom = -r.raio * 1.3; sc.near = 1; sc.far = r.raio * 5;
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = r.interior ? 0.02 : 0.4; sol.shadow.radius = 3;
  const cam = new THREE.PerspectiveCamera(r.interior ? 38 : 30, largura / altura, r.interior ? 0.5 : 5, 6000);
  const az0 = (r.interior ? 38 : 34) * Math.PI / 180, el = (r.interior ? 40 : 36) * Math.PI / 180;
  cam.position.set(ax + r.dist * Math.cos(el) * Math.sin(az0), r.dist * Math.sin(el), az + r.dist * Math.cos(el) * Math.cos(az0));
  cam.lookAt(ax, ay, az);
  renderer.render(cena, cam);
  const url = renderer.domElement.toDataURL('image/webp', 0.82);
  cena.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
  return url;
}
