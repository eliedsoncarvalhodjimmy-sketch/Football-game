// npm run bench -- --seasons 50 --seed 2026
// Benchmark do mundo fictício completo: tempo por época e por semana, memória,
// crescimento do histórico e tamanho das gravações. Escreve
// docs/relatorios/benchmark_<N>_epocas.md.
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo } from '../engine/world.ts';
import { Simulador } from '../engine/simulador.ts';
import { verificarIntegridade, verificarVagas } from '../engine/verificacoes.ts';
import { serializarHistorico } from '../storage/serializar.ts';
import { MUNDO } from '../config/mundo.ts';
import { args, RAIZ_PACKS } from './args.ts';

const a = args();
const N = Number(a.seasons ?? 50);
const semente = Number(a.seed ?? MUNDO.semente_padrao);
const mb = (b: number) => (b / 1024 / 1024).toFixed(1);

const t0 = performance.now();
const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const w = construirMundo(dados, { semente, modo: 'teste' });
const tGerar = performance.now() - t0;
const sim = new Simulador(w, true);
const epocas: { epoca: number; ms: number; semMax: number; heap: number; clubes: number; problemas: number; saveKB: number; histKB: number }[] = [];
const semanas: number[] = [];
for (let e = 0; e < N; e++) {
  const ep = w.epoca;
  const te = performance.now();
  let semMax = 0;
  for (let s = 0; s < 52; s++) {
    const ts = performance.now();
    sim.simularSemana();
    const d = performance.now() - ts;
    semanas.push(d);
    semMax = Math.max(semMax, d);
  }
  const ms = performance.now() - te;
  const problemas = verificarIntegridade(w).length + verificarVagas(w).length;
  const ultimo = sim.historico[sim.historico.length - 1];
  const saveKB = gzipSync(serializarHistorico([ultimo])).length / 1024;
  const histKB = e % 10 === 9 || e === N - 1 ? gzipSync(serializarHistorico(sim.historico)).length / 1024 : NaN;
  epocas.push({ epoca: ep, ms, semMax, heap: process.memoryUsage().heapUsed, clubes: w.clubes.length, problemas, saveKB, histKB });
}
const total = performance.now() - t0;
const ord = [...semanas].sort((x, y) => x - y);
const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const totProb = epocas.reduce((s, x) => s + x.problemas, 0);
const ultimoHist = epocas[epocas.length - 1].histKB;
const i25 = Math.min(24, epocas.length - 1);
const hist25 = gzipSync(serializarHistorico(sim.historico.filter((r) => r.epoca < w.epoca - (N - 25)))).length / 1024;

const L: string[] = [];
L.push(`# Benchmark — ${N} épocas, semente ${semente}`, '');
L.push(`> DADOS DE TESTE. Mundo fictício completo (${w.ligas.length} ligas). Node ${process.version}, ${process.platform}/${process.arch}. A simulação corre sem interface; no tablet espera-se um factor de 3 a 6 vezes mais lento.`, '');
L.push('| Medida | Valor | Alvo |', '|---|---|---|');
L.push(`| Gerar o mundo | ${tGerar.toFixed(0)} ms | — |`);
L.push(`| ${N} épocas (total) | ${(total / 1000).toFixed(1)} s | — |`);
L.push(`| Época completa (média / máx.) | ${media(epocas.map((x) => x.ms)).toFixed(0)} ms / ${Math.max(...epocas.map((x) => x.ms)).toFixed(0)} ms | — |`);
L.push(`| Semana do mundo inteiro (média / p99 / máx.) | ${media(semanas).toFixed(2)} ms / ${ord[Math.floor(ord.length * 0.99)].toFixed(1)} ms / ${ord[ord.length - 1].toFixed(1)} ms | < 2 s no tablet |`);
L.push(`| Memória (heap) no início / no fim | ${mb(epocas[0].heap)} MB / ${mb(epocas[epocas.length - 1].heap)} MB | — |`);
L.push(`| Gravação de uma época (gzip) | ${media(epocas.map((x) => x.saveKB)).toFixed(0)} KB | ≤ 20 MB |`);
L.push(`| Histórico de 25 épocas, com poda (gzip) | ${(hist25 / 1024).toFixed(1)} MB | < 500 MB (com jogadores, mais tarde) |`);
L.push(`| Histórico de ${N} épocas, com poda (gzip) | ${(ultimoHist / 1024).toFixed(1)} MB | — |`);
L.push(`| Clubes criados (inclui os que entraram do exterior) | ${w.clubes.length} (activos ${w.activos()}) | — |`);
L.push(`| Problemas de integridade e vagas em ${N} passagens de época | ${totProb} | 0 |`, '');
L.push('Nota: a poda guarda o detalhe de todos os jogos nas últimas 3 épocas; nas anteriores só as ligas principais e as continentais. Classificações, campeões, movimentos, taças e continentais ficam para sempre.', '');
L.push('## Por época', '', '| Época | ms | Semana máx. (ms) | Heap (MB) | Clubes criados | Gravação (KB) | Histórico acumulado (KB) |', '|---|---:|---:|---:|---:|---:|---:|');
for (const x of epocas) L.push(`| ${x.epoca}/${String(x.epoca + 1).slice(2)} | ${x.ms.toFixed(0)} | ${x.semMax.toFixed(1)} | ${mb(x.heap)} | ${x.clubes} | ${x.saveKB.toFixed(0)} | ${Number.isNaN(x.histKB) ? '' : x.histKB.toFixed(0)} |`);
const dir = new URL('../../docs/relatorios/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}benchmark_${N}_epocas.md`, L.join('\n') + '\n');
console.log(`${N} épocas em ${(total / 1000).toFixed(1)} s; época média ${media(epocas.map((x) => x.ms)).toFixed(0)} ms; semana média ${media(semanas).toFixed(2)} ms (máx. ${ord[ord.length - 1].toFixed(1)} ms); heap final ${mb(epocas[epocas.length - 1].heap)} MB; problemas ${totProb}.`);
void i25;
