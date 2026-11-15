// Renderiza as ilustrações 3D das infraestruturas para docs/prototipo/infra/*.webp.
// Uso: node scripts/prototipo/infra3d/render.cjs [tipo nivel tam]   (sem argumentos: todas)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = __dirname, saida = path.join(dir, '../../../docs/prototipo/infra');
(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.error('erro:', e.message)); p.on('console', (m) => m.type() === 'error' && console.error(m.text()));
  await p.route('http://infra.local/**', (r) => { const f = path.join(dir, new URL(r.request().url()).pathname); r.fulfill({ path: f, contentType: f.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  await p.goto('http://infra.local/pagina.html'); await p.waitForFunction(() => window.pronto);
  const lista = [];
  const a = process.argv.slice(2);
  if (a.length) lista.push([a[0], +a[1], +(a[2] ?? 2)]);
  else { for (let v = 1; v <= 10; v++) { for (const t of [1, 2, 3]) lista.push(['estadio', v, t]); for (const k of ['treino', 'academia', 'medico', 'recrutamento']) lista.push([k, v, 2]); } }
  for (const [tipo, nivel, tam] of lista) {
    const t0 = Date.now();
    const [w, h] = tipo === 'estadio' ? [1100, 776] : [760, 536];
    const url = await p.evaluate(([tipo, nivel, tam, w, h]) => window.renderInfra(tipo, nivel, tam, '#d63a3a', w, h), [tipo, nivel, tam, w, h]);
    const nome = tipo === 'estadio' ? `estadio-${nivel}-${tam}.webp` : `${tipo}-${nivel}.webp`;
    fs.writeFileSync(path.join(saida, nome), Buffer.from(url.split(',')[1], 'base64'));
    console.log(nome, Date.now() - t0, 'ms');
  }
  await b.close();
})();
