// Validação do motor 2D (docs/tactics/MOTOR_2D.md, secção 12): simula N jogos entre duas equipas iguais (força média,
// estilo neutro) e compara com as faixas reais; com --estilos, também cada estilo contra o neutro.
// Uso: npx tsx scripts/validar-motor2d.ts [N=200] [--estilos] [--processos=4]
// Corre em paralelo: empacota este ficheiro com o esbuild e lança processos Node que jogam partes do lote.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Motor2D } from '../src/engine/match2d/Motor2D.ts';
import { gerarEquipa2D } from '../src/engine/match2d/equipas.ts';
import { candidatos, seleccionar } from '../src/engine/match2d/lances.ts';

const FORMACAO: Record<string, string> = { tiki_taka: '4-3-3', gegenpressen: '4-2-3-1', contra_ataque: '4-4-2', catenaccio: '5-3-2', jogo_direto: '4-4-2', pelas_alas: '4-4-2', futebol_total: '4-3-3', bloco_medio_baixo: '4-4-2', neutro: '4-3-3' };

/** Métricas por equipa (índice 0 = a equipa do estilo; num jogo neutro × neutro contam as duas). */
interface Linha { estilo: string; golosJogo: number; remates: number; aBaliza: number; passes: number; certos: number; cruzamentos: number; cantos: number; faltas: number; foras: number; km: number; posse: number; sequencias: number[]; amarelos: number; vermelhos: number; penaltis: number; seg: number; lances?: { alargados_min: number; chave_min: number; n: number; golos: number; golosVistos: number; corridoPct: number } }

function jogar(estilo: string, k: number): Linha[] {
  const t0 = Date.now();
  const m = new Motor2D({ semente: `validar|${estilo}|${k}`, posse: (k % 2) as 0 | 1, equipas: [
    { nome: estilo, formacao: FORMACAO[estilo], estilo: estilo as never, jogadores: gerarEquipa2D(`v${k}a`, 70, FORMACAO[estilo]) },
    { nome: 'neutro', formacao: '4-3-3', estilo: 'neutro', jogadores: gerarEquipa2D(`v${k}b`, 70, '4-3-3') }] });
  for (let i = 0; i < 54000; i++) m.passo();
  const e = m.estado.estat, seg = (Date.now() - t0) / 1000;
  const linha = (q: 0 | 1): Linha => ({ estilo: q === 0 ? estilo : 'neutro', golosJogo: e.golos[0] + e.golos[1], remates: e.remates[q], aBaliza: e.aBaliza[q], passes: e.passes[q], certos: e.certos[q], cruzamentos: e.cruzamentos[q], cantos: e.cantos[q], faltas: e.faltas[q], foras: e.forasDeJogo[q], km: e.distancia[q] / 10000, posse: e.posse[q] / (e.posse[0] + e.posse[1]), sequencias: q === 0 ? e.sequencias : [], amarelos: e.amarelos[q], vermelhos: e.vermelhos[q], penaltis: e.penaltis[q], seg });
  if (estilo !== 'neutro') return [linha(0)];
  // Lances (secção 2.2): duração do nível Alargados, golos vistos e jogo corrido.
  const c = candidatos(m.registo, m.posses), al = seleccionar(c, 'alargados'), ch = seleccionar(c, 'chave');
  const golos = m.registo.filter((x) => x.tipo === 'golo').map((x) => x.tick);
  const l0 = linha(0);
  l0.lances = { alargados_min: al.duracao_s / 60, chave_min: ch.duracao_s / 60, n: al.lances.length, golos: golos.length, golosVistos: golos.filter((t) => al.lances.some((l) => l.inicio <= t && t <= l.fim)).length, corridoPct: (100 * al.corrido_s) / al.mostrado_s };
  return [l0, linha(1)];
}

const FAIXAS: [string, (l: Linha[]) => number, number, number, number][] = [
  ['Golos (total do jogo)', (l) => med(l.map((x) => x.golosJogo)), 2.5, 3.0, 2],
  ['Remates', (l) => med(l.map((x) => x.remates)), 10, 15, 1],
  ['Remates enquadrados', (l) => med(l.map((x) => x.aBaliza)), 3.5, 5.5, 1],
  ['Passes', (l) => med(l.map((x) => x.passes)), 350, 650, 0],
  ['Precisão de passe (%)', (l) => (100 * soma(l.map((x) => x.certos))) / soma(l.map((x) => x.passes)), 75, 89, 0],
  ['Cruzamentos', (l) => med(l.map((x) => x.cruzamentos)), 12, 22, 1],
  ['Cantos', (l) => med(l.map((x) => x.cantos)), 4, 6, 1],
  ['Faltas', (l) => med(l.map((x) => x.faltas)), 10, 14, 1],
  ['Foras-de-jogo', (l) => med(l.map((x) => x.foras)), 1, 3, 1],
  ['Distância por jogador (km)', (l) => med(l.map((x) => x.km)), 9, 12, 1],
  // Sequências com pelo menos um passe certo (uma bola cortada logo a seguir a ganhá-la não é uma sequência de posse).
  ['Passes por sequência (mediana)', (l) => mediana(l.flatMap((x) => x.sequencias).filter((n) => n > 0)), 3, 5, 1],
];
const FAIXAS_ESTILO: Record<string, [number, number, number, number]> = {
  tiki_taka: [60, 70, 600, 800], gegenpressen: [52, 58, 450, 600], contra_ataque: [35, 42, 280, 400], catenaccio: [30, 38, 250, 350],
  jogo_direto: [40, 48, 300, 420], pelas_alas: [50, 56, 450, 550], futebol_total: [58, 66, 550, 700], bloco_medio_baixo: [38, 45, 300, 420],
};
const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
const med = (v: number[]) => soma(v) / Math.max(1, v.length);
const mediana = (v: number[]) => { const o = [...v].sort((a, b) => a - b); return o.length ? o[Math.floor(o.length / 2)] : 0; };

async function principal() {
  const args = process.argv.slice(2);
  const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
  const procs = Number(args.find((a) => a.startsWith('--processos='))?.split('=')[1] ?? Math.max(1, cpus().length));
  const estilos = args.includes('--estilos') ? Object.keys(FAIXAS_ESTILO) : [];
  // O esbuild só se carrega no processo principal (os processos de trabalho correm o pacote sem ele).
  const { buildSync } = await import('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'futceo-validar-'));
  const pacote = join(dir, 'validar.mjs');
  buildSync({ entryPoints: [fileURLToPath(import.meta.url)], bundle: true, platform: 'node', format: 'esm', outfile: pacote, logLevel: 'error', external: ['esbuild'] });
  const tarefas: [string, number][] = [];
  for (let k = 0; k < N; k++) tarefas.push(['neutro', k]);
  for (const e of estilos) for (let k = 0; k < Math.max(4, Math.round(N / 10)); k++) tarefas.push([e, k]);
  const t0 = Date.now();
  const partes = Array.from({ length: procs }, (_, p) => tarefas.filter((_, i) => i % procs === p));
  const linhas = (await Promise.all(partes.map((parte) => new Promise<Linha[]>((ok, falha) => {
    const c = spawn(process.execPath, [pacote], { env: { ...process.env, FUTCEO_VALIDAR_TAREFAS: JSON.stringify(parte) }, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = ''; c.stdout.on('data', (d) => (out += d));
    c.on('close', (code) => (code === 0 ? ok(JSON.parse(out)) : falha(new Error(`processo terminou com ${code}`))));
  })))).flat();
  const neutros = linhas.filter((l) => l.estilo === 'neutro');
  console.log(`\nMotor 2D — validação (secção 12): ${N} jogos neutro × neutro (força 70), ${((Date.now() - t0) / 1000).toFixed(0)} s em ${procs} processos; ${med(linhas.map((l) => l.seg)).toFixed(1)} s por jogo.\n`);
  console.log('| Métrica (por equipa e por jogo) | Medido | Faixa | |\n|---|---|---|---|');
  let falhas = 0;
  for (const [nome, f, a, b, casas] of FAIXAS) {
    const v = f(neutros), ok = v >= a && v <= b;
    if (!ok) falhas++;
    console.log(`| ${nome} | ${v.toFixed(casas)} | ${a}–${b} | ${ok ? '✓' : '✗'} |`);
  }
  const jogos = neutros.length / 2;
  console.log(`\nOutros (por jogo, as duas equipas): amarelos ${(soma(neutros.map((l) => l.amarelos)) / jogos).toFixed(2)} · vermelhos ${(soma(neutros.map((l) => l.vermelhos)) / jogos).toFixed(2)} · penáltis ${(soma(neutros.map((l) => l.penaltis)) / jogos).toFixed(2)}`);
  // Apresentação por lances num lote de 50 jogos (secção 2.2): Alargados 12–16 min, todos os golos, jogo corrido ≥ 20%.
  const L = neutros.filter((l) => l.lances).slice(0, 50).map((l) => l.lances!);
  if (L.length) {
    const minA = Math.min(...L.map((x) => x.alargados_min)), maxA = Math.max(...L.map((x) => x.alargados_min));
    const golos = soma(L.map((x) => x.golos)), vistos = soma(L.map((x) => x.golosVistos)), corrido = Math.min(...L.map((x) => x.corridoPct));
    const ok = minA >= 12 && maxA <= 16 && vistos === golos && corrido >= 20;
    if (!ok) falhas++;
    console.log(`\nLances (${L.length} jogos): Alargados ${minA.toFixed(1)}–${maxA.toFixed(1)} min (média ${med(L.map((x) => x.alargados_min)).toFixed(1)}; ${med(L.map((x) => x.n)).toFixed(0)} lances) · golos vistos ${vistos}/${golos} · jogo corrido ≥ ${corrido.toFixed(0)}% do mostrado · Lances-chave ${med(L.map((x) => x.chave_min)).toFixed(1)} min · ${ok ? '✓' : '✗'}`);
  }
  if (estilos.length) {
    console.log('\n| Estilo × neutro | Posse | Faixa | Passes | Faixa |\n|---|---|---|---|---|');
    for (const e of estilos) {
      const l = linhas.filter((x) => x.estilo === e), [p0, p1, q0, q1] = FAIXAS_ESTILO[e];
      const posse = 100 * med(l.map((x) => x.posse)), passes = med(l.map((x) => x.passes));
      console.log(`| ${e} | ${posse.toFixed(0)}% ${posse >= p0 && posse <= p1 ? '✓' : '✗'} | ${p0}–${p1} | ${passes.toFixed(0)} ${passes >= q0 && passes <= q1 ? '✓' : '✗'} | ${q0}–${q1} |`);
    }
  }
  console.log(`\n${falhas === 0 ? 'Todas as faixas gerais passam.' : `${falhas} métrica(s) fora da faixa.`}`);
  process.exitCode = falhas === 0 ? 0 : 1;
}

if (process.env.FUTCEO_VALIDAR_TAREFAS) {
  const tarefas = JSON.parse(process.env.FUTCEO_VALIDAR_TAREFAS) as [string, number][];
  process.stdout.write(JSON.stringify(tarefas.flatMap(([e, k]) => jogar(e, k))));
} else {
  void principal();
}
