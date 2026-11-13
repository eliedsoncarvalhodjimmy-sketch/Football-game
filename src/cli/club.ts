// npm run club -- [--epocas 2] [--seed 2026] [--ficha ID] [--relatorio] [--export [--para-pacotes]]
// Camada do clube (Prompt 3): fichas, balanço mundial por liga e benchmark da economia.
//   --ficha ID     imprime a ficha de um clube depois de N épocas
//   --relatorio    escreve docs/relatorios/fase3_paragemA_financas.md
//   --export       escreve financas.csv de cada pacote em out/financas/ (ou em packs/ com --para-pacotes)
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo } from '../engine/world.ts';
import { Simulador } from '../engine/simulador.ts';
import { MUNDO } from '../config/mundo.ts';
import { fichaClube, linhasFinancas, CABECALHO_FINANCAS, M } from '../club/ficha.ts';
import { SAUDES } from '../club/store.ts';
import { args, RAIZ_PACKS } from './args.ts';

const a = args();
const semente = Number(a.seed ?? MUNDO.semente_padrao);
const N = Number(a.epocas ?? (a.export ? 0 : 2));
const t0 = performance.now();
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
const tGerar = performance.now() - t0;
const e = w.economia!;
// Custo da economia medido à parte (embrulha as chamadas semanais e mensais).
let msEco = 0;
const semanaOrig = e.semana.bind(e), mesOrig = e.mes.bind(e);
e.semana = (s, j) => { const t = performance.now(); semanaOrig(s, j); msEco += performance.now() - t; };
e.mes = (d) => { const t = performance.now(); mesOrig(d); msEco += performance.now() - t; };
const sim = new Simulador(w, true);
const semanas: number[] = [];
const grupos = [...sim.temporadas.keys()];
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) {
  const t = performance.now();
  sim.simularSemana();
  semanas.push(performance.now() - t);
}
const s = e.clubes;

if (a.ficha) {
  const c = w.idx(String(a.ficha));
  console.log(fichaClube(w, c).join('\n'));
}

if (a.export) {
  const base = a['para-pacotes'] ? RAIZ_PACKS : new URL('../../out/financas/', import.meta.url).pathname;
  for (const p of w.pacotes) {
    mkdirSync(`${base}${p.manifest.id}`, { recursive: true });
    const linhas = [CABECALHO_FINANCAS, ...linhasFinancas(w, p.manifest.id)];
    writeFileSync(`${base}${p.manifest.id}/financas.csv`, linhas.map((l) => l.map((x) => (/[",]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',')).join('\n') + '\n');
  }
  console.log(`financas.csv escritos em ${base}`);
}

if (a.relatorio) {
  const L: string[] = [];
  const p = (...x: string[]) => L.push(...x);
  p(`# Prompt 3 — Paragem A: o clube e as finanças (semente ${semente}, ${N} épocas)`, '');
  p('> DADOS DE TESTE. Mundo fictício, valores em euros (escala real). Os valores iniciais são "gerado" (financas.csv editável por pacote). As despesas incluem 20–24% de impostos e outros custos operacionais.', '');
  // 1. Seis clubes de ligas e níveis diferentes.
  const escolher = (id: string, pos: number) => { const cl = [...w.ligaPorId(id).clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x]); return cl[Math.min(cl.length - 1, pos)]; };
  const seis = [escolher('ENG1', 0), escolher('ESP1', 7), escolher('POR1', 0), escolher('ENG2', 10), escolher('BRA1', 6), escolher('ENG4', 30)];
  p('## 1. Fichas de 6 clubes', '');
  for (const c of seis) p(...fichaClube(w, c), '');
  // 2. Balanço mundial por liga (última época fechada de cada clube).
  p('## 2. Balanço anual por liga (última época fechada)', '');
  p('| Liga | Clubes | Receita total | Receita média | Maior / menor | Massa salarial | Massa/receita | Resultado total | Clubes com prejuízo | Apertado / crise |', '|---|---:|---:|---:|---|---:|---:|---:|---:|---:|');
  const linhas: { id: string; aperto: number; n: number }[] = [];
  let recMundo = 0, salMundo = 0, resMundo = 0;
  for (const Lg of w.ligas) {
    const todos = [...Array(s.n).keys()].map((c) => ({ c, b: s.balancos[c].at(-1) })).filter((x) => x.b && x.b.liga === Lg.regras.id);
    const ultima = Math.max(...todos.map((x) => x.b!.epoca));
    const bs = todos.filter((x) => x.b!.epoca === ultima);
    if (!bs.length) continue;
    const rec = bs.reduce((x, y) => x + y.b!.receita, 0), sal = bs.reduce((x, y) => x + y.b!.massaSalarial, 0), res = bs.reduce((x, y) => x + y.b!.resultado, 0);
    recMundo += rec; salMundo += sal; resMundo += res;
    const recs = bs.map((x) => x.b!.receita).sort((x, y) => y - x);
    const neg = bs.filter((x) => x.b!.resultado < 0).length;
    const aperto = Lg.clubes.filter((c) => s.saude[c] >= 1).length;
    linhas.push({ id: Lg.regras.id, aperto, n: Lg.clubes.length });
    p(`| ${Lg.regras.id} | ${bs.length} | ${M(rec)} | ${M(rec / bs.length)} | ${M(recs[0])} / ${M(recs[recs.length - 1])} | ${M(sal)} | ${Math.round((100 * sal) / rec)}% | ${M(res)} | ${neg} | ${aperto} |`);
  }
  p(`| **Mundo** | | ${M(recMundo)} | | | ${M(salMundo)} | ${Math.round((100 * salMundo) / recMundo)}% | ${M(resMundo)} | | |`, '');
  // 3. Onde ficam mais apertados.
  p('## 3. Onde os clubes ficam mais apertados', '');
  const contagem = [0, 0, 0, 0];
  for (let c = 0; c < s.n; c++) if (w.liga[c] >= 0) contagem[s.saude[c]]++;
  p(`Saúde financeira agora: ${SAUDES.map((x, k) => `${x} ${contagem[k]}`).join(', ')}.`, '');
  p('Ligas com mais clubes apertados ou em crise:', '');
  for (const l of linhas.sort((x, y) => y.aperto / y.n - x.aperto / x.n).slice(0, 10)) p(`- ${l.id}: ${l.aperto} de ${l.n}`);
  p('', 'Os 15 clubes com menos folga (caixa ÷ despesa mensal):', '', '| Clube | Liga | Caixa | Dívida | Despesa anual | Meses de caixa | Resultado da última época | Saúde |', '|---|---|---:|---:|---:|---:|---:|---|');
  const folga = [...Array(s.n).keys()].filter((c) => w.liga[c] >= 0).map((c) => ({ c, m: s.caixa[c] / Math.max(1, e.despesaAnual(c) / 12) })).sort((x, y) => x.m - y.m).slice(0, 15);
  for (const { c, m } of folga) p(`| ${w.clubes[c].nome} | ${w.ligas[w.liga[c]].regras.id} | ${M(s.caixa[c])} | ${M(s.divida(c))} | ${M(e.despesaAnual(c))} | ${m.toFixed(1)} | ${M(s.balancos[c].at(-1)?.resultado ?? 0)} | ${SAUDES[s.saude[c]]} |`);
  // 4. Benchmark.
  const ord = [...semanas].sort((x, y) => x - y);
  const media = semanas.reduce((x, y) => x + y, 0) / semanas.length;
  const balancosKB = gzipSync(Buffer.from(JSON.stringify(s.balancos))).length / 1024;
  const arraysKB = Object.values(s).filter((v) => ArrayBuffer.isView(v)).reduce((x, v) => x + gzipSync(new Uint8Array((v as Uint8Array).buffer)).length, 0) / 1024;
  p('', '## 4. Benchmark (Node; tablet estimado × 3 a 6)', '', '| Medida | Valor |', '|---|---|');
  p(`| Gerar o mundo (com jogadores, treinadores e economia) | ${tGerar.toFixed(0)} ms |`);
  p(`| Semana mundial (média / p99 / máx.) | ${media.toFixed(0)} / ${ord[Math.floor(ord.length * 0.99)].toFixed(0)} / ${ord[ord.length - 1].toFixed(0)} ms |`);
  p(`| Custo da economia por semana (média) | ${(msEco / semanas.length).toFixed(2)} ms |`);
  p(`| Memória dos arrays dos clubes | ${(s.bytes() / 1024).toFixed(0)} KB |`);
  p(`| Gravação: estado dos clubes + balanços de 10 anos (gzip, estimativa) | ${(arraysKB + balancosKB).toFixed(0)} KB (arrays ${arraysKB.toFixed(0)} KB, balanços ${balancosKB.toFixed(0)} KB) |`);
  p(`| Jogadores na lista de livres (contratos não renovados) | ${e.livres.length} |`);
  writeFileSync(new URL('../../docs/relatorios/fase3_paragemA_financas.md', import.meta.url), L.join('\n') + '\n');
  console.log('docs/relatorios/fase3_paragemA_financas.md');
}
