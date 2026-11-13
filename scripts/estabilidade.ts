// Bloco C (secção 3.4): estabilidade de 20 épocas sem interface e benchmark.
// Uso: npx tsx scripts/estabilidade.ts [épocas] [semente]  → docs/relatorios/fase2_estabilidade_benchmark.md
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, diaInicioMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { evoluirMes, parteMinutosPorOrdem } from '../src/players/evolucao.ts';
import { PlayerStore } from '../src/players/store.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { serializarHistorico } from '../src/storage/serializar.ts';

const N = Number(process.argv[2] ?? 20);
const semente = Number(process.argv[3] ?? 2026);
const MB = (b: number) => (b / 1024 / 1024).toFixed(1);
const h0 = process.memoryUsage().heapUsed;
const dados = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const tg0 = performance.now();
const w = construirMundo(dados, { semente, modo: 'teste' });
const tGerar = performance.now() - tg0;
const st = w.jogadores!;
const hMundo = process.memoryUsage().heapUsed;
// Custo da evolução mensal, medido à parte (numa cópia do estado: repõe-se a seguir).
const copia = st.exportar();
const te0 = performance.now();
evoluirMes(w, st, diaInicioMundo() + 30, { parteMinutos: parteMinutosPorOrdem(w, st), desenvolvimentoTreinador: () => 10 });
const tEvol = performance.now() - te0;
w.jogadores = PlayerStore.importar(copia);
w.motor!.cache.limpar();

const ligas = w.ligas.filter((l) => l.regras.nivel === 1);
const ovrLiga = () => Object.fromEntries(ligas.map((l) => {
  const s = w.jogadores!;
  const js = l.clubes.flatMap((c) => w.plantel[c].filter((j) => s.clube[j] === c));
  return [l.regras.id, js.reduce((a, j) => a + s.ovrNat(j), 0) / Math.max(1, js.length)];
}));
const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
const MINIMO: Record<string, number> = { GR: 2, DEF: 6, MED: 6, AVA: 4 };
const faltas = () => {
  const s = w.jogadores!;
  let n = 0, tamanhoMin = 99;
  for (let c = 0; c < w.clubes.length; c++) {
    if (w.liga[c] < 0) continue;
    const g: Record<string, number> = { GR: 0, DEF: 0, MED: 0, AVA: 0 };
    for (const j of w.plantel[c]) g[GRUPO[POSICOES[s.posNat[j]]]]++;
    for (const k of Object.keys(MINIMO)) if (g[k] < MINIMO[k]) n++;
    tamanhoMin = Math.min(tamanhoMin, w.plantel[c].length);
  }
  return { n, tamanhoMin };
};

const inicio = ovrLiga();
const linhas: { epoca: number; ovr: Record<string, number>; faltas: number; tamanhoMin: number; idade: number; jogadores: number }[] = [];
const sim = new Simulador(w, true);
const semanas: number[] = [];
sim.aoFechar = (t) => {
  if (t.grupo !== 'ago_mai') return;
  const s = w.jogadores!;
  const activos = w.plantel.flatMap((js, c) => (w.liga[c] >= 0 ? js.filter((j) => s.clube[j] === c) : []));
  const f = faltas();
  linhas.push({ epoca: t.ano, ovr: ovrLiga(), faltas: f.n, tamanhoMin: f.tamanhoMin, idade: activos.reduce((a, j) => a + s.idade(j, sim.segunda), 0) / activos.length, jogadores: activos.length });
};
const grupos = [...sim.temporadas.keys()];
const ts0 = performance.now();
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) {
  const t = performance.now();
  sim.simularSemana();
  semanas.push(performance.now() - t);
}
const tTotal = performance.now() - ts0;
const hFim = process.memoryUsage().heapUsed;
const saveJog = gzipSync(w.jogadores!.exportar()).length;
const ultimo = sim.historico[sim.historico.length - 1];
const saveEpoca = gzipSync(serializarHistorico([ultimo])).length;
const saveHist = gzipSync(serializarHistorico(sim.historico)).length;
const ord = [...semanas].sort((a, b) => a - b);
const media = semanas.reduce((a, b) => a + b, 0) / semanas.length;
const fim = linhas[linhas.length - 1].ovr;
const deriva = Object.keys(inicio).map((id) => ({ id, a: inicio[id], b: fim[id], d: fim[id] - inicio[id] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
const maxDeriva = Math.max(...linhas.flatMap((l) => Object.keys(inicio).map((id) => Math.abs(l.ovr[id] - inicio[id]))));

const L: string[] = [];
L.push(`# Fase 2 — estabilidade de ${N} épocas e benchmark (semente ${semente})`, '');
L.push('> DADOS DE TESTE. Mundo fictício completo, sem interface. Node ' + process.version + '. Para o tablet alvo conta-se um factor de 3 a 6 (estimativa).', '');
L.push('## 1. Estabilidade', '');
L.push(`| Medida | Valor | Alvo |`, '|---|---|---|');
L.push(`| Maior deriva do OVR médio de uma 1.ª liga em ${N} anos (em qualquer época) | ${maxDeriva.toFixed(2)} | ≤ 3 |`);
L.push(`| Clubes com um grupo de posições abaixo do mínimo (GR 2, DEF 6, MED 6, AVA 4), pior época | ${Math.max(...linhas.map((l) => l.faltas))} | 0 |`);
L.push(`| Plantel mais curto, pior época | ${Math.min(...linhas.map((l) => l.tamanhoMin))} | ≥ 22 |`);
L.push(`| Idade média dos jogadores (início → fim) | ${linhas[0].idade.toFixed(1)} → ${linhas[linhas.length - 1].idade.toFixed(1)} | estável |`);
L.push(`| Jogadores nos plantéis dos clubes em jogo (1.ª → última época) | ${linhas[0].jogadores} → ${linhas[linhas.length - 1].jogadores} | estável |`, '');
L.push('OVR médio das 10 primeiras ligas com maior deriva (início → fim):', '', '| Liga | Início | Fim | Δ |', '|---|---:|---:|---:|');
for (const x of deriva.slice(0, 10)) L.push(`| ${x.id} | ${x.a.toFixed(1)} | ${x.b.toFixed(1)} | ${x.d >= 0 ? '+' : ''}${x.d.toFixed(2)} |`);
L.push('', 'OVR médio por época (ligas principais):', '', '| Época | ' + ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'BRA1', 'KSA1'].join(' | ') + ' |', '|---|' + '---:|'.repeat(8));
L.push(`| início | ${['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'BRA1', 'KSA1'].map((id) => inicio[id]?.toFixed(1) ?? '—').join(' | ')} |`);
for (const l of linhas) L.push(`| ${l.epoca}/${String(l.epoca + 1).slice(2)} | ${['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'BRA1', 'KSA1'].map((id) => l.ovr[id]?.toFixed(1) ?? '—').join(' | ')} |`);
L.push('', '## 2. Benchmark', '');
L.push('| Medida | Node (esta máquina) | Tablet (estimativa ×3 a ×6) | Alvo |', '|---|---|---|---|');
L.push(`| Gerar o mundo (clubes, ${st.n} jogadores, treinadores, afinação) | ${tGerar.toFixed(0)} ms | ${(tGerar * 3 / 1000).toFixed(1)}–${(tGerar * 6 / 1000).toFixed(1)} s | — |`);
L.push(`| Evolução mensal de todos os jogadores (medida à parte) | ${tEvol.toFixed(0)} ms | ${(tEvol * 3).toFixed(0)}–${(tEvol * 6).toFixed(0)} ms | — |`);
L.push(`| Semana mundial completa (média) | ${media.toFixed(0)} ms | ${(media * 3).toFixed(0)}–${(media * 6).toFixed(0)} ms | < 2 s |`);
L.push(`| Semana mundial (p99 / máx.) | ${ord[Math.floor(ord.length * 0.99)].toFixed(0)} / ${ord[ord.length - 1].toFixed(0)} ms | ${(ord[ord.length - 1] * 6).toFixed(0)} ms no pior caso | < 2 s |`);
L.push(`| ${N} épocas | ${(tTotal / 1000).toFixed(0)} s | — | — |`);
L.push(`| Memória (heap): só dados → mundo gerado → fim | ${MB(h0)} → ${MB(hMundo)} → ${MB(hFim)} MB | — | — |`);
L.push(`| Arrays dos jogadores (${w.jogadores!.n} jogadores, com os já retirados) | ${MB(w.jogadores!.bytes())} MB | — | — |`);
L.push(`| Gravação: estado dos jogadores (gzip) | ${(saveJog / 1024).toFixed(0)} KB | — | — |`);
L.push(`| Gravação: uma época de jogos (gzip) | ${(saveEpoca / 1024).toFixed(0)} KB | — | — |`);
L.push(`| Gravação: histórico de ${N} épocas (gzip, com poda) | ${(saveHist / 1024).toFixed(0)} KB | — | ≤ 20 MB por época |`);
writeFileSync(new URL('../docs/relatorios/fase2_estabilidade_benchmark.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
