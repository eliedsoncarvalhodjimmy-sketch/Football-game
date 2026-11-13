// Prompt 3, Bloco C: estabilidade de 20 épocas com economia, donos, IA do clube, treinadores e staff; benchmark e save.
// Uso: node --expose-gc --import tsx scripts/estabilidade-clubes.ts [épocas] [semente] → docs/relatorios/fase3_paragemC_estabilidade.md
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { serializarHistorico } from '../src/storage/serializar.ts';
import { NOME_ARQUETIPO } from '../src/config/arquetipos.ts';
import { NOME_TIPO_DONO } from '../src/config/donos.ts';

const N = Number(process.argv[2] ?? 20);
const semente = Number(process.argv[3] ?? 2026);
const MB = (b: number) => (b / 1024 / 1024).toFixed(1);
const M = (x: number) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1)} M€` : `${Math.round(x / 1e3)} mil €`);
const h0 = process.memoryUsage().heapUsed;
const tg = performance.now();
const w = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente, modo: 'teste' });
const tGerar = performance.now() - tg;
const e = w.economia!, s = e.clubes;
const sim = new Simulador(w);
const G8 = ['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'NED1', 'BEL1'];
const ano = (d: number) => new Date(d * 864e5).toISOString().slice(0, 7);
const nome = (c: number) => w.clubes[c].nome;

// Donos ao longo do tempo (para as histórias).
const historiaDonos = new Map<number, string[]>();
for (let c = 0; c < w.clubes.length; c++) historiaDonos.set(c, [`${e.donos[c].nome} (${NOME_TIPO_DONO[e.donos[c].tipo]})`]);
const recInicial = new Map(w.ligas.map((L) => [L.regras.id, L.clubes.reduce((x, c) => x + s.receitaPrevista[c], 0)]));
const repInicial = Float32Array.from(w.reputacao);

const porEpoca: { ano: number; mudancas: number; activos: number; desp: Record<string, number>; vendas: number; adm: number; rj: number; pontos: number; avisos: number; crise: number; arq: number; staff: number }[] = [];
const top4: Map<string, Set<number>[]> = new Map(G8.map((id) => [id, []]));
let ev0 = -Infinity;
sim.aoFechar = (t, reg) => {
  for (const id of G8) if (reg.tabelas[id]) top4.get(id)!.push(new Set(reg.tabelas[id].slice(0, 4).map((l) => l.clube)));
  if (t.grupo !== 'ago_mai') return;
  const fim = t.base + 52 * 7;
  const evs = e.eventos.filter((x) => x.dia > ev0 && x.dia <= fim);
  ev0 = fim;
  for (const x of evs) if (x.tipo === 'venda') historiaDonos.get(x.clube)?.push(`${ano(x.dia)}: ${e.donos[x.clube].nome} (${NOME_TIPO_DONO[e.donos[x.clube].tipo]})`);
  const activos = w.clubes.filter((_, c) => w.liga[c] >= 0).length;
  const desp: Record<string, number> = {};
  for (const x of evs.filter((x) => x.tipo === 'treinador_despedido')) { const m = x.texto.includes('resultados') ? 'resultados' : x.texto.includes('justa causa') ? 'justa causa' : 'mútuo acordo'; desp[m] = (desp[m] ?? 0) + 1; }
  desp['demissão'] = evs.filter((x) => x.tipo === 'treinador_demite').length;
  desp['fim de contrato / reforma / saída'] = evs.filter((x) => x.tipo === 'treinador_sai').length;
  let crise = 0;
  for (let c = 0; c < s.n; c++) if (w.liga[c] >= 0 && s.saude[c] >= 2) crise++;
  porEpoca.push({
    ano: t.ano, mudancas: new Set(evs.filter((x) => x.tipo === 'treinador_contratado').map((x) => x.clube)).size, activos, desp,
    vendas: evs.filter((x) => x.tipo === 'venda').length, adm: evs.filter((x) => x.tipo === 'administracao').length, rj: evs.filter((x) => x.tipo === 'recuperacao_judicial').length,
    pontos: evs.filter((x) => x.tipo === 'pontos').length, avisos: evs.filter((x) => x.tipo === 'aviso' || x.tipo === 'aviso_ffp').length, crise,
    arq: evs.filter((x) => x.tipo === 'arquetipo').length, staff: evs.filter((x) => x.tipo === 'staff').length,
  });
};

const semanas: { ms: number; janela: boolean }[] = [];
const grupos = [...sim.temporadas.keys()];
const ts0 = performance.now();
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) {
  const d = new Date(sim.segunda * 864e5);
  const m = d.getUTCMonth();
  const janela = m === 6 || m === 7 || m === 0; // Julho, Agosto, Janeiro
  const t = performance.now();
  sim.simularSemana();
  semanas.push({ ms: performance.now() - t, janela });
}
const tTotal = performance.now() - ts0;
(globalThis as { gc?: () => void }).gc?.();
const hFim = process.memoryUsage().heapUsed;

// ---------------------------------------------------------------- relatório
function histograma(titulo: string, valores: number[], limites: number[], fmt: (x: number) => string): string[] {
  const n = new Array(limites.length + 1).fill(0);
  for (const v of valores) { let k = 0; while (k < limites.length && v >= limites[k]) k++; n[k]++; }
  const max = Math.max(...n);
  const L = [`**${titulo}** (${valores.length})`, '', '```'];
  for (let k = 0; k <= limites.length; k++) {
    const rot = k === 0 ? `< ${fmt(limites[0])}` : k === limites.length ? `≥ ${fmt(limites[k - 1])}` : `${fmt(limites[k - 1])}–${fmt(limites[k])}`;
    L.push(`${rot.padStart(12)} | ${'█'.repeat(Math.round((40 * n[k]) / Math.max(1, max)))} ${n[k]}`);
  }
  L.push('```', '');
  return L;
}
const L: string[] = [];
const p = (...x: string[]) => L.push(...x);
p(`# Prompt 3 — Paragem C: estabilidade de ${N} épocas (semente ${semente})`, '');
p('> DADOS DE TESTE. Mundo completo sem interface: economia, dívida e sanções, donos, IA do clube, mercado de treinadores e staff ligados.', '');
const mud = porEpoca.map((x) => x.mudancas / x.activos);
const mediaMud = mud.reduce((a, b) => a + b, 0) / mud.length;
// Mobilidade no topo: clubes que entram no top 4 na 2.ª década sem lá terem estado na 1.ª.
const mob = G8.map((id) => {
  const ep = top4.get(id)!;
  const meio = Math.floor(ep.length / 2);
  const d1 = new Set(ep.slice(0, meio).flatMap((x) => [...x]));
  const d2 = new Set(ep.slice(meio).flatMap((x) => [...x]));
  const novos = [...d2].filter((c) => !d1.has(c)).length;
  const sempre = [...d1].filter((c) => ep.every((x) => x.has(c))).length;
  const top4ini = new Set([...w.ligaPorId(id).clubes, ...d1, ...d2].filter((c) => repInicial[c] > 0).sort((a, b) => repInicial[b] - repInicial[a]).slice(0, 4));
  const grandesNoTopo = [...top4ini].filter((c) => d2.has(c)).length;
  return { id, novos, sempre, grandesNoTopo };
});
// Colapso de liga: receita total (última época) face à inicial.
const colapso = w.ligas.map((Lg) => {
  const ult = Lg.clubes.map((c) => s.balancos[c].at(-1)?.receita ?? 0).reduce((a, b) => a + b, 0);
  return { id: Lg.regras.id, r: ult / (recInicial.get(Lg.regras.id) || 1) };
}).sort((a, b) => a.r - b.r);
// Pequenos que viram gigantes: reputação +20 em 3 épocas.
let saltos = 0;
for (let c = 0; c < s.n; c++) { const h = s.historicoReputacao(c); for (let k = 3; k < h.length; k++) if (h[k] - h[k - 3] > 20) { saltos++; break; } }
p('## 1. Resumo e faixas', '', '| Medida | Valor | Faixa |', '|---|---|---|');
p(`| Clubes que mudam de treinador por época (média; mín–máx) | ${(100 * mediaMud).toFixed(0)}% (${(100 * Math.min(...mud)).toFixed(0)}–${(100 * Math.max(...mud)).toFixed(0)}%) | 20–30% |`);
p(`| Vendas de clubes por época (média) | ${(porEpoca.reduce((a, b) => a + b.vendas, 0) / porEpoca.length).toFixed(1)} | 2–6% dos clubes |`);
p(`| Administrações / recuperações judiciais em ${N} épocas | ${porEpoca.reduce((a, b) => a + b.adm, 0)} / ${porEpoca.reduce((a, b) => a + b.rj, 0)} | raras mas existentes |`);
p(`| Deduções de pontos por época (média) | ${(porEpoca.reduce((a, b) => a + b.pontos, 0) / porEpoca.length).toFixed(1)} | 1–6% dos clubes |`);
p(`| Clubes em crise no fim | ${porEpoca.at(-1)!.crise} | ≤ 10% |`);
p(`| Mudanças de filosofia (arquétipo) por época | ${(porEpoca.reduce((a, b) => a + b.arq, 0) / porEpoca.length).toFixed(1)} | poucas (inércia) |`);
p(`| Liga com maior queda de receita total (fim ÷ início) | ${colapso[0].id}: ${colapso[0].r.toFixed(2)} | nenhum colapso (≥ 0,6) |`);
p(`| Clubes com reputação +20 em 3 épocas | ${saltos} | quase nenhum |`);
p('', '## 2. Mobilidade no topo das 8 maiores ligas', '', '| Liga | Clubes novos no top 4 na 2.ª metade | No top 4 em todas as épocas | Dos 4 maiores do arranque, no top 4 na 2.ª metade |', '|---|---:|---:|---:|');
for (const x of mob) p(`| ${x.id} | ${x.novos} | ${x.sempre} | ${x.grandesNoTopo} de 4 |`);
p('', '## 3. Por época', '', '| Época | Mudam de treinador | Despedimentos (resultados / justa causa / mútuo) | Demissões | Saídas (contrato, reforma, outro clube) | Vendas | Adm. | RJ | Deduções | Avisos | Em crise | Filosofia | Staff |', '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const x of porEpoca) p(`| ${x.ano}/${String(x.ano + 1).slice(2)} | ${x.mudancas} (${Math.round((100 * x.mudancas) / x.activos)}%) | ${x.desp.resultados ?? 0} / ${x.desp['justa causa'] ?? 0} / ${x.desp['mútuo acordo'] ?? 0} | ${x.desp['demissão']} | ${x.desp['fim de contrato / reforma / saída']} | ${x.vendas} | ${x.adm} | ${x.rj} | ${x.pontos} | ${x.avisos} | ${x.crise} | ${x.arq} | ${x.staff} |`);
// Histogramas.
const ts = w.motor!.treinadores;
const activos = [...Array(w.clubes.length).keys()].filter((c) => w.liga[c] >= 0);
const dia = sim.segunda;
p('', '## 4. Histogramas', '');
p(...histograma('Anos do treinador actual no clube', activos.map((c) => (dia - (ts[c].carreira?.at(-1)?.desde ?? dia)) / 365), [0.5, 1, 2, 3, 5, 8], (x) => `${x}`));
const trocas = new Map<number, number>();
for (const x of e.eventos) if (x.tipo === 'treinador_contratado') trocas.set(x.clube, (trocas.get(x.clube) ?? 0) + 1);
p(...histograma(`Treinadores contratados por clube em ${N} épocas`, activos.map((c) => trocas.get(c) ?? 0), [1, 2, 4, 6, 9, 13], (x) => `${x}`));
const vendasPorClube = new Map<number, number>();
for (const x of e.eventos) if (x.tipo === 'venda') vendasPorClube.set(x.clube, (vendasPorClube.get(x.clube) ?? 0) + 1);
p(...histograma(`Mudanças de dono por clube em ${N} épocas`, activos.map((c) => vendasPorClube.get(c) ?? 0), [1, 2, 3, 4], (x) => `${x}`));
p(...histograma('Reputação: variação do arranque ao fim', activos.map((c) => w.reputacao[c] - (repInicial[c] || w.reputacao[c])), [-20, -10, -5, -2, 2, 5, 10, 20], (x) => `${x}`));
p(...histograma('Massa salarial ÷ receita (última época)', activos.filter((c) => s.balancos[c].length).map((c) => s.balancos[c].at(-1)!.massaSalarial / Math.max(1, s.balancos[c].at(-1)!.receita)), [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], (x) => `${Math.round(100 * x)}%`));
p(...histograma('Reputação dos treinadores empregados', activos.map((c) => ts[c].reputacao ?? 50), [20, 35, 50, 65, 80], (x) => `${x}`));
const arq = new Map<string, number>();
for (const c of activos) arq.set(e.ia.arquetipo[c], (arq.get(e.ia.arquetipo[c]) ?? 0) + 1);
p(`Arquétipos no fim: ${[...arq].map(([k, v]) => `${NOME_ARQUETIPO[k as keyof typeof NOME_ARQUETIPO]} ${v}`).join(', ')}. Treinadores livres: ${e.mercadoT.livres.length}; reformados em ${N} épocas: ${e.mercadoT.reformados}. Intenções de venda registadas para o Prompt 4: ${e.ia.intencoes.length}.`, '');
// 5 histórias.
p('## 5. Histórias de 5 clubes', '');
const crises = new Map<number, number>();
for (const x of e.eventos) if (['administracao', 'recuperacao_judicial', 'crise', 'pontos'].includes(x.tipo)) crises.set(x.clube, (crises.get(x.clube) ?? 0) + 1);
const escolher = new Set<number>();
const add = (c?: number) => { if (c !== undefined && c >= 0) escolher.add(c); };
add([...w.ligaPorId('ENG1').clubes].sort((a, b) => repInicial[b] - repInicial[a])[0]);
add([...crises].sort((a, b) => b[1] - a[1]).find(([c]) => w.ligaPorId('ENG1').clubes.includes(c) || w.ligas[w.liga[c]]?.regras.nivel <= 2)?.[0]);
add(e.eventos.find((x) => x.tipo === 'administracao')?.clube);
add([...vendasPorClube].sort((a, b) => b[1] - a[1])[0]?.[0]);
add([...trocas].sort((a, b) => b[1] - a[1])[0]?.[0]);
for (const c of [...escolher].slice(0, 5)) {
  p(`### ${nome(c)} (${w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.id : 'exterior'}) — ${NOME_ARQUETIPO[e.ia.arquetipo[c]]}`, '');
  p(`Donos: ${historiaDonos.get(c)!.join(' → ')}`, '');
  p(`Treinadores: ${(ts[c].carreira ? e.eventos.filter((x) => x.clube === c && x.tipo === 'treinador_contratado').map((x) => `${ano(x.dia)} ${x.texto.replace(/^contrata /, '').split(' (')[0]}`) : []).join(' → ') || 'o mesmo desde o início'} (actual: ${ts[c].nome}, ${ts[c].perfil})`, '');
  const ev = e.eventos.filter((x) => x.clube === c && ['treinador_despedido', 'treinador_demite', 'conflito', 'crise', 'administracao', 'recuperacao_judicial', 'venda', 'pontos', 'arquetipo', 'limite_divida', 'saida_administracao', 'evento_raro'].includes(x.tipo));
  for (const x of ev.slice(0, 18)) p(`- ${ano(x.dia)}: ${x.texto}`);
  p('', '| Época | Liga | Pos. | Receita | Resultado | Caixa | Dívida |', '|---|---|---:|---:|---:|---:|---:|');
  for (const b of s.balancos[c]) p(`| ${b.epoca} | ${b.liga} | ${b.posicao || '—'} | ${M(b.receita)} | ${M(b.resultado)} | ${M(b.caixa)} | ${M(b.divida)} |`);
  p('');
}
// Benchmark e save.
const sem = semanas.map((x) => x.ms).sort((a, b) => a - b);
const jan = semanas.filter((x) => x.janela).map((x) => x.ms).sort((a, b) => a - b);
const med = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const saveJog = gzipSync(w.jogadores!.exportar()).length;
const saveClubes = Object.values(s).filter((v) => ArrayBuffer.isView(v)).reduce((x, v) => x + gzipSync(new Uint8Array((v as Uint8Array).buffer)).length, 0);
const saveBal = gzipSync(Buffer.from(JSON.stringify(s.balancos))).length;
const saveEv = gzipSync(Buffer.from(JSON.stringify(e.eventos))).length;
const saveTr = gzipSync(Buffer.from(JSON.stringify([...ts, ...e.mercadoT.livres]))).length;
const saveStaff = gzipSync(Buffer.from(JSON.stringify([e.staff.porClube, e.staff.livres]))).length;
const saveDonos = gzipSync(Buffer.from(JSON.stringify(e.donos))).length;
const saveHist = gzipSync(serializarHistorico(sim.historico)).length;
p('## 6. Benchmark, memória e save (Node; tablet estimado × 3 a 6)', '', '| Medida | Valor | Alvo |', '|---|---|---|');
p(`| Gerar o mundo | ${tGerar.toFixed(0)} ms | — |`);
p(`| Semana mundial (média / p99 / máx.) | ${med(sem).toFixed(0)} / ${sem[Math.floor(sem.length * 0.99)].toFixed(0)} / ${sem.at(-1)!.toFixed(0)} ms → tablet ${(med(sem) * 3).toFixed(0)}–${(med(sem) * 6).toFixed(0)} ms, pior ${(sem.at(-1)! * 6 / 1000).toFixed(2)} s | < 2 s |`);
p(`| Semanas de janela de transferências (Jul, Ago, Jan; média / máx.) | ${med(jan).toFixed(0)} / ${jan.at(-1)!.toFixed(0)} ms → tablet pior ${(jan.at(-1)! * 6 / 1000).toFixed(2)} s | < 5 s |`);
p(`| ${N} épocas | ${(tTotal / 1000).toFixed(0)} s | — |`);
p(`| Memória (heap, depois da recolha de lixo; correr com node --expose-gc): dados → fim | ${MB(h0)} → ${MB(hFim)} MB | — |`);
p(`| Save (gzip): jogadores ${(saveJog / 1024).toFixed(0)} KB + clubes ${(saveClubes / 1024).toFixed(0)} KB + balanços ${(saveBal / 1024).toFixed(0)} KB + eventos ${(saveEv / 1024).toFixed(0)} KB + treinadores ${(saveTr / 1024).toFixed(0)} KB + staff ${(saveStaff / 1024).toFixed(0)} KB + donos ${(saveDonos / 1024).toFixed(0)} KB + histórico ${(saveHist / 1024).toFixed(0)} KB | ${MB(saveJog + saveClubes + saveBal + saveEv + saveTr + saveStaff + saveDonos + saveHist)} MB | — |`);
writeFileSync(new URL('../docs/relatorios/fase3_paragemC_estabilidade.md', import.meta.url), L.join('\n') + '\n');
console.log(L.slice(0, 40).join('\n'));
