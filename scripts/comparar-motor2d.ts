// Fase 6 do motor 2D (docs/tactics/MOTOR_2D.md, secção 13): compara o jogo detalhado no motor 2D com o modo rápido,
// nos mesmos jogos entre clubes reais de 8 ligas: média de golos, vitórias em casa, empates, 0–0, e a distribuição dos
// resultados pela diferença de força (força do onze com os modificadores, casa − fora).
// Uso: npx tsx scripts/comparar-motor2d.ts [N=200] [--processos=4]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, diaInicioMundo, type World } from '../src/engine/world.ts';
import { prepararLados, golosRapido, type Lado } from '../src/match/rapido.ts';
import { configJogo2D, jogarResumir } from '../src/match/jogo2d.ts';
import { Rng } from '../src/core/rng.ts';

const LIGAS = ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'NED1', 'BRA1'];
interface Jogo { dif: number; rapido: [number, number]; d2: [number, number] }

async function mundo(): Promise<World> {
  const raiz = fileURLToPath(new URL('../packs/', import.meta.url));
  return construirMundo(await carregarDados(new LocalFileSource(raiz)), { semente: 2026, modo: 'teste' });
}

function pares(w: World, N: number): [number, number][] {
  const rng = Rng.de(5, 'comparar-2d'), out: [number, number][] = [];
  const ligas = LIGAS.map((id) => w.ligaPorId(id));
  for (let i = 0; i < N; i++) {
    const cl = ligas[i % ligas.length].clubes;
    const a = rng.pick(cl); let b = rng.pick(cl);
    while (b === a) b = rng.pick(cl);
    out.push([a, b]);
  }
  return out;
}

async function jogar(indices: number[], N: number): Promise<Jogo[]> {
  const w = await mundo(), dia = diaInicioMundo() + 40, ps = pares(w, N), out: Jogo[] = [];
  for (const i of indices) {
    const [a, b] = ps[i];
    const [casa, fora]: [Lado, Lado] = prepararLados(w, a, b, dia, Rng.de(9, 'lados', i));
    const r = golosRapido(w, casa, fora, false, Rng.de(77, 'rapido', i));
    const d = jogarResumir(configJogo2D(w, casa, fora, false, dia, `comparar|${i}`));
    out.push({ dif: casa.forcaAtaque + casa.forcaDefesa - fora.forcaAtaque - fora.forcaDefesa, rapido: [r.gc, r.gf], d2: d.golos });
  }
  return out;
}

function resumo(js: Jogo[], k: 'rapido' | 'd2') {
  const n = js.length || 1;
  let g = 0, casa = 0, emp = 0, zero = 0;
  for (const j of js) { const [a, b] = j[k]; g += a + b; if (a > b) casa++; else if (a === b) emp++; if (a + b === 0) zero++; }
  return { golos: g / n, casa: casa / n, emp: emp / n, fora: (n - casa - emp) / n, zero: zero / n };
}

async function principal() {
  const args = process.argv.slice(2);
  const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
  const procs = Number(args.find((a) => a.startsWith('--processos='))?.split('=')[1] ?? Math.max(1, cpus().length));
  const { buildSync } = await import('esbuild');
  const pacote = join(mkdtempSync(join(tmpdir(), 'futceo-comparar-')), 'comparar.mjs');
  buildSync({ entryPoints: [fileURLToPath(import.meta.url)], bundle: true, platform: 'node', format: 'esm', outfile: pacote, logLevel: 'error', external: ['esbuild'],
    define: { 'import.meta.url': JSON.stringify(import.meta.url) } });
  const t0 = Date.now();
  const partes = Array.from({ length: procs }, (_, p) => Array.from({ length: N }, (_, i) => i).filter((i) => i % procs === p));
  const js = (await Promise.all(partes.map((parte) => new Promise<Jogo[]>((ok, falha) => {
    const c = spawn(process.execPath, [pacote], { env: { ...process.env, FUTCEO_COMPARAR: JSON.stringify({ parte, N }) }, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = ''; c.stdout.on('data', (d) => (out += d));
    c.on('close', (code) => (code === 0 ? ok(JSON.parse(out)) : falha(new Error(`processo terminou com ${code}`))));
  })))).flat();
  const f = (x: number, d = 2) => x.toFixed(d);
  const pct = (x: number) => `${Math.round(100 * x)}%`;
  console.log(`\nMotor 2D × modo rápido: ${N} jogos de liga (8 ligas), ${((Date.now() - t0) / 1000).toFixed(0)} s em ${procs} processos.\n`);
  console.log('| | Golos/jogo | Vitória casa | Empate | Vitória fora | 0–0 |\n|---|---|---|---|---|---|');
  for (const [k, nome] of [['rapido', 'Modo rápido'], ['d2', 'Motor 2D']] as const) { const r = resumo(js, k); console.log(`| ${nome} | ${f(r.golos)} | ${pct(r.casa)} | ${pct(r.emp)} | ${pct(r.fora)} | ${pct(r.zero)} |`); }
  // Por diferença de força (tercis e extremos da amostra).
  const ord = [...js].sort((a, b) => a.dif - b.dif), q = (p: number) => ord[Math.min(ord.length - 1, Math.floor(p * ord.length))].dif;
  const cortes = [-Infinity, q(0.2), q(0.4), q(0.6), q(0.8), Infinity];
  console.log('\n| Diferença de força (casa − fora) | Jogos | Rápido: V/E/D · golos | 2D: V/E/D · golos |\n|---|---|---|---|');
  for (let k = 0; k < 5; k++) {
    const g = js.filter((j) => j.dif >= cortes[k] && j.dif < cortes[k + 1]);
    const r = resumo(g, 'rapido'), d = resumo(g, 'd2');
    const rot = `${k === 0 ? '<' : f(cortes[k], 1)} … ${k === 4 ? '>' : f(cortes[k + 1], 1)}`;
    console.log(`| ${rot} | ${g.length} | ${pct(r.casa)}/${pct(r.emp)}/${pct(r.fora)} · ${f(r.golos)} | ${pct(d.casa)}/${pct(d.emp)}/${pct(d.fora)} · ${f(d.golos)} |`);
  }
}

if (process.env.FUTCEO_COMPARAR) {
  const { parte, N } = JSON.parse(process.env.FUTCEO_COMPARAR) as { parte: number[]; N: number };
  void jogar(parte, N).then((r) => process.stdout.write(JSON.stringify(r)));
} else {
  void principal();
}
