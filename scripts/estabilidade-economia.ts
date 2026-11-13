// Prompt 3, Bloco B: teste de estabilidade da economia (5 épocas, mundo completo, sem interface).
// Uso: npx tsx scripts/estabilidade-economia.ts [épocas] [semente] → docs/relatorios/fase3_paragemB_estabilidade.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { SAUDES } from '../src/club/store.ts';
import { NOME_TIPO_DONO } from '../src/config/donos.ts';

const N = Number(process.argv[2] ?? 5);
const semente = Number(process.argv[3] ?? 2026);
const w = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente, modo: 'teste' });
const e = w.economia!, s = e.clubes, st = w.jogadores!;
const sim = new Simulador(w);
const M = (x: number) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1)} M€` : `${Math.round(x / 1e3)} mil €`);
const nome = (c: number) => `${w.clubes[c].nome} (${w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.id : 'exterior'})`;

/** Salário médio dos plantéis por grupo de ligas (nível 1 / inferiores). */
function salarios() {
  let a = 0, na = 0, b = 0, nb = 0;
  for (const L of w.ligas) for (const c of L.clubes) for (const j of w.plantel[c]) {
    if (st.clube[j] !== c) continue;
    if (L.regras.nivel === 1) { a += st.salario[j]; na++; } else { b += st.salario[j]; nb++; }
  }
  return [a / na, b / nb];
}
const sal0 = salarios();
/** Escala do salário de mercado (média das ligas de cada grupo): mede a inflação salarial sem o efeito da composição dos plantéis. */
function escalas() {
  const a: number[] = [], b: number[] = [];
  for (const L of w.ligas) for (const c of L.clubes) (L.regras.nivel === 1 ? a : b).push(e.escala(c));
  return [a.reduce((x, y) => x + y, 0) / a.length, b.reduce((x, y) => x + y, 0) / b.length];
}
const esc0 = escalas();
const porEpoca: { ano: number; sal: number[]; esc: number[]; adm: number; ffp: number; rj: number; ban: number; avisos: number; vendas: number; raros: number; crise: number; apertado: number; prejuizo: number; activos: number }[] = [];
let ev0 = 0;
const grupos = [...sim.temporadas.keys()];
sim.aoFechar = (t) => {
  if (t.grupo !== 'ago_mai') return;
  const evs = e.eventos.slice(ev0);
  ev0 = e.eventos.length;
  let crise = 0, apertado = 0, prejuizo = 0, activos = 0;
  for (let c = 0; c < s.n; c++) {
    if (w.liga[c] < 0) continue;
    activos++;
    if (s.saude[c] >= 2) crise++; else if (s.saude[c] === 1) apertado++;
    if ((s.balancos[c].at(-1)?.resultado ?? 0) < 0) prejuizo++;
  }
  porEpoca.push({
    ano: t.ano, sal: salarios(), esc: escalas(), adm: evs.filter((x) => x.tipo === 'administracao').length, ffp: evs.filter((x) => x.tipo === 'pontos').length, rj: evs.filter((x) => x.tipo === 'recuperacao_judicial').length, ban: evs.filter((x) => x.tipo === 'limite_divida' && x.texto.startsWith('dívida')).length,
    avisos: evs.filter((x) => x.tipo === 'aviso_ffp' || x.tipo === 'aviso').length, vendas: evs.filter((x) => x.tipo === 'venda').length, raros: evs.filter((x) => x.tipo === 'evento_raro').length, crise, apertado, prejuizo, activos,
  });
};
const t0 = performance.now();
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) sim.simularSemana();
const seg = (performance.now() - t0) / 1000;

// ---------------------------------------------------------------- histogramas
function histograma(titulo: string, valores: number[], limites: number[], fmt: (x: number) => string): string[] {
  const n = new Array(limites.length + 1).fill(0);
  for (const v of valores) { let k = 0; while (k < limites.length && v >= limites[k]) k++; n[k]++; }
  const max = Math.max(...n);
  const L = [`**${titulo}** (${valores.length} clubes)`, '', '```'];
  for (let k = 0; k <= limites.length; k++) {
    const rot = k === 0 ? `< ${fmt(limites[0])}` : k === limites.length ? `≥ ${fmt(limites[k - 1])}` : `${fmt(limites[k - 1])}–${fmt(limites[k])}`;
    L.push(`${rot.padStart(14)} | ${'█'.repeat(Math.round((40 * n[k]) / Math.max(1, max)))} ${n[k]}`);
  }
  L.push('```', '');
  return L;
}
const activos = [...Array(s.n).keys()].filter((c) => w.liga[c] >= 0 && s.balancos[c].length);
const ult = (c: number) => s.balancos[c].at(-1)!;
const receitas = activos.map((c) => ult(c).receita);
const massa = activos.map((c) => ult(c).massaSalarial / Math.max(1, ult(c).receita));
const divida = activos.map((c) => s.divida(c) / Math.max(1, ult(c).receita));
const caixa = activos.map((c) => s.caixa[c] / Math.max(1, ult(c).receita));
const resultado = activos.map((c) => ult(c).resultado / Math.max(1, ult(c).receita));
const pct = (x: number) => `${Math.round(100 * x)}%`;

const L: string[] = [];
const p = (...x: string[]) => L.push(...x);
p(`# Prompt 3 — Paragem B: estabilidade da economia (${N} épocas, semente ${semente})`, '');
p(`> DADOS DE TESTE. Mundo completo sem interface, com dívida, fair play e donos ligados. ${N} épocas em ${seg.toFixed(0)} s.`, '');
p('## 1. Faixas de aceitação (proposta) e resultado', '');
const maxRec = Math.max(...receitas);
const maxDiv = Math.max(...divida);
const massaMundo = activos.reduce((x, c) => x + ult(c).massaSalarial, 0) / activos.reduce((x, c) => x + ult(c).receita, 0);
const infl = porEpoca.map((x, i) => (i === 0 ? x.sal[0] / sal0[0] : x.sal[0] / porEpoca[i - 1].sal[0]) - 1);
const inflMedia = Math.pow(porEpoca.at(-1)!.esc[0] / esc0[0], 1 / porEpoca.length) - 1;
const inflInf = Math.pow(porEpoca.at(-1)!.esc[1] / esc0[1], 1 / porEpoca.length) - 1;
const salMedia = Math.pow(porEpoca.at(-1)!.sal[0] / sal0[0], 1 / porEpoca.length) - 1;
const nAct = porEpoca.at(-1)!.activos;
const media = (k: 'adm' | 'ffp' | 'vendas' | 'rj' | 'ban') => porEpoca.reduce((x, y) => x + y[k], 0) / porEpoca.length;
const linha = (m: string, v: string, alvo: string, ok: boolean) => p(`| ${m} | ${v} | ${alvo} | ${ok ? '✅' : '⚠️'} |`);
p('| Medida | Valor | Faixa proposta | |', '|---|---|---|:---:|');
linha('Maior receita de um clube', M(maxRec), '≤ 1 200 M€', maxRec <= 1.2e9);
linha('Maior dívida ÷ receita', maxDiv.toFixed(2), '≤ 3,0 (acima de 2,5 há administração)', maxDiv <= 3);
linha('Massa salarial ÷ receita (mundo, última época)', pct(massaMundo), '45–70%', massaMundo >= 0.45 && massaMundo <= 0.7);
linha('Inflação do salário de mercado (escala), 1.as divisões', `${(100 * inflMedia).toFixed(1)}%`, '0 a +8%/ano', inflMedia >= 0 && inflMedia <= 0.08);
p(`| Salário médio pago, 1.as divisões (inclui a mudança de composição dos plantéis) | ${(100 * salMedia).toFixed(1)}%/ano | — | |`);
linha('Inflação do salário de mercado (escala), divisões inferiores', `${(100 * inflInf).toFixed(1)}%`, '−3 a +6%/ano', inflInf >= -0.03 && inflInf <= 0.06);
linha('Administrações por época (média)', `${media('adm').toFixed(1)} (${((100 * media('adm')) / nAct).toFixed(2)}% dos clubes)`, '0,2–1,5% (≈ 2–13), nunca 0 em 5 épocas', media('adm') >= 0.002 * nAct && media('adm') <= 0.015 * nAct);
linha('Deduções de pontos por época (média)', `${media('ffp').toFixed(1)} (${((100 * media('ffp')) / nAct).toFixed(1)}%)`, '1–6% dos clubes', media('ffp') >= 0.01 * nAct && media('ffp') <= 0.06 * nAct);
linha('Recuperações judiciais por época (média)', `${media('rj').toFixed(1)} (${((100 * media('rj')) / nAct).toFixed(2)}%)`, '0,2–2% dos clubes', media('rj') >= 0.002 * nAct && media('rj') <= 0.02 * nAct);
linha('Novas proibições por limite de dívida por época (média)', `${media('ban').toFixed(1)} (${((100 * media('ban')) / nAct).toFixed(1)}%)`, '0,5–5% dos clubes', media('ban') >= 0.005 * nAct && media('ban') <= 0.05 * nAct);
linha('Vendas de clubes por época (média)', `${media('vendas').toFixed(1)} (${((100 * media('vendas')) / nAct).toFixed(1)}%)`, '2–6% dos clubes', media('vendas') >= 0.02 * nAct && media('vendas') <= 0.06 * nAct);
linha('Clubes em crise no fim', `${porEpoca.at(-1)!.crise} (${((100 * porEpoca.at(-1)!.crise) / nAct).toFixed(1)}%)`, '≤ 10%', porEpoca.at(-1)!.crise <= 0.1 * nAct);
p('', '## 2. Por época', '', '| Época | Salário médio 1.as / inferiores | Escala de mercado 1.as / inferiores | Salário médio 1.as (var.) | Administrações | Rec. judiciais | Proibições (dívida) | Deduções de pontos | Avisos | Vendas | Eventos raros | Em crise | Apertados | Com prejuízo |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
porEpoca.forEach((x, i) => p(`| ${x.ano}/${String(x.ano + 1).slice(2)} | ${M(x.sal[0])} / ${M(x.sal[1])} | ${(x.esc[0] / esc0[0]).toFixed(3)} / ${(x.esc[1] / esc0[1]).toFixed(3)} | ${(100 * infl[i]).toFixed(1)}% | ${x.adm} | ${x.rj} | ${x.ban} | ${x.ffp} | ${x.avisos} | ${x.vendas} | ${x.raros} | ${x.crise} | ${x.apertado} | ${x.prejuizo} |`));
p('', '## 3. Histogramas (última época fechada de cada clube)', '');
p(...histograma('Receita anual', receitas, [1e6, 3e6, 10e6, 30e6, 100e6, 300e6, 600e6], (x) => (x >= 1e6 ? `${x / 1e6}M` : `${x / 1e3}k`)));
p(...histograma('Massa salarial ÷ receita', massa, [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], pct));
p(...histograma('Resultado ÷ receita', resultado, [-0.3, -0.15, -0.05, 0, 0.05, 0.15, 0.3], pct));
p(...histograma('Dívida ÷ receita', divida, [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2.5], (x) => x.toFixed(2)));
p(...histograma('Caixa ÷ receita', caixa, [-0.1, 0, 0.1, 0.25, 0.5, 1, 2], (x) => x.toFixed(2)));
// Clubes em crise, administrações, vendas, sanções por liga.
p('## 4. Clubes em crise no fim', '', '| Clube | Saúde | Caixa | Dívida | Receita | Resultado | Dono |', '|---|---|---:|---:|---:|---:|---|');
for (const c of activos.filter((c) => s.saude[c] >= 2).sort((a, b) => s.caixa[a] / ult(a).receita - s.caixa[b] / ult(b).receita).slice(0, 25)) p(`| ${nome(c)} | ${SAUDES[s.saude[c]]} | ${M(s.caixa[c])} | ${M(s.divida(c))} | ${M(ult(c).receita)} | ${M(ult(c).resultado)} | ${e.donos[c].nome} (${NOME_TIPO_DONO[e.donos[c].tipo]}) |`);
const ano = (d: number) => new Date(d * 864e5).toISOString().slice(0, 7);
p('', '## 5. Administrações', '');
for (const x of e.eventos.filter((x) => x.tipo === 'administracao')) p(`- ${ano(x.dia)} — ${nome(x.clube)}: ${x.texto}`);
p('', '## 6. Vendas de clubes e eventos raros', '');
for (const x of e.eventos.filter((x) => x.tipo === 'venda' || x.tipo === 'evento_raro')) p(`- ${ano(x.dia)} — ${nome(x.clube)}: ${x.texto}`);
p('', '## 7. Sanções e avisos por liga (todas as épocas)', '', '| Liga | Avisos (dívida, caixa, fair play) | Deduções de pontos | Pontos deduzidos | Rec. judiciais | Administrações | Proibições por dívida |', '|---|---:|---:|---:|---:|---:|---:|');
const porLiga = new Map<string, number[]>();
for (const x of e.eventos) {
  const l = w.liga[x.clube];
  const id = l >= 0 ? w.ligas[l].regras.id : 'exterior';
  const o = porLiga.get(id) ?? [0, 0, 0, 0, 0, 0];
  if (x.tipo === 'aviso' || x.tipo === 'aviso_ffp') o[0]++;
  else if (x.tipo === 'pontos') { o[1]++; o[2] += x.valor ?? 0; }
  else if (x.tipo === 'recuperacao_judicial') o[3]++;
  else if (x.tipo === 'administracao') o[4]++;
  else if (x.tipo === 'limite_divida' && x.texto.startsWith('dívida')) o[5]++;
  else continue;
  porLiga.set(id, o);
}
for (const [id, o] of [...porLiga].sort((a, b) => b[1][1] + b[1][4] - a[1][1] - a[1][4]).slice(0, 25)) p(`| ${id} | ${o[0]} | ${o[1]} | ${o[2]} | ${o[3]} | ${o[4]} | ${o[5]} |`);
p('', '## 7b. Recuperações judiciais e deduções de pontos', '');
for (const x of e.eventos.filter((x) => x.tipo === 'recuperacao_judicial' || x.tipo === 'pontos').slice(0, 60)) p(`- ${ano(x.dia)} — ${nome(x.clube)}: ${x.texto}`);
p('', '## 8. Donos (estado actual)', '', '| Tipo | Clubes | Reputação média |', '|---|---:|---:|');
const tipos = new Map<string, number[]>();
for (const c of activos) { const t = e.donos[c].tipo; tipos.set(t, [...(tipos.get(t) ?? []), w.reputacao[c]]); }
for (const [t, r] of [...tipos].sort((a, b) => b[1].length - a[1].length)) p(`| ${NOME_TIPO_DONO[t as keyof typeof NOME_TIPO_DONO]} | ${r.length} | ${(r.reduce((x, y) => x + y, 0) / r.length).toFixed(1)} |`);
const fin = e.eventos.reduce((m, x) => m.set(x.tipo, (m.get(x.tipo) ?? 0) + 1), new Map<string, number>());
p('', `Movimentos financeiros em ${N} épocas: ${[...fin].map(([k, v]) => `${k} ${v}`).join(', ')}.`);
writeFileSync(new URL('../docs/relatorios/fase3_paragemB_estabilidade.md', import.meta.url), L.join('\n') + '\n');
console.log(L.slice(0, 30).join('\n'));
