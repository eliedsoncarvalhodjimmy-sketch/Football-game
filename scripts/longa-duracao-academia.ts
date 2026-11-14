// Prompt 4, Bloco C (3.5): teste de longa duração com a academia, sem interface, e os dados da Paragem C.
// Uso: npx tsx scripts/longa-duracao-academia.ts [épocas] [semente] → docs/relatorios/fase4_paragemC_academia.md
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { serializarHistorico } from '../src/storage/serializar.ts';
import { NOME_ESCALAO } from '../src/academia/academia.ts';

const N = Number(process.argv[2] ?? 20);
const semente = Number(process.argv[3] ?? 2026);
const MB = (b: number) => (b / 1024 / 1024).toFixed(1);
const h0 = process.memoryUsage().heapUsed;
const dados = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const tg0 = performance.now();
const w = construirMundo(dados, { semente, modo: 'teste' });
const tGerar = performance.now() - tg0;
const ac = w.academia!;
// Referência: SEM_ACADEMIA=1 corre com a reposição gerada do Prompt 2 (para comparação).
if (process.env.SEM_ACADEMIA) w.academia = null;
const st = w.jogadores!, e = w.economia!;
(globalThis as { gc?: () => void }).gc?.();
const hMundo = process.memoryUsage().heapUsed;
const L: string[] = [];
const p = (...x: string[]) => L.push(...x);

const ligas = w.ligas.filter((l) => l.regras.nivel === 1 && l.clubes.length);
const doClube = (c: number) => w.plantel[c].filter((j) => st.clube[j] === c);
const ovrLiga = () => Object.fromEntries(ligas.map((l) => { const js = l.clubes.flatMap(doClube); return [l.regras.id, js.reduce((a, j) => a + st.ovrNat(j), 0) / Math.max(1, js.length)]; }));
const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
const MINIMO: Record<string, number> = { GR: 2, DEF: 6, MED: 6, AVA: 4 };
const faltas = () => {
  let n = 0, tamanhoMin = 99;
  for (let c = 0; c < w.clubes.length; c++) {
    if (w.liga[c] < 0) continue;
    const g: Record<string, number> = { GR: 0, DEF: 0, MED: 0, AVA: 0 };
    const js = doClube(c);
    for (const j of js) g[GRUPO[POSICOES[st.posNat[j]]]]++;
    for (const k of Object.keys(MINIMO)) if (g[k] < MINIMO[k]) n++;
    tamanhoMin = Math.min(tamanhoMin, js.length);
  }
  return { n, tamanhoMin };
};
// Formados no clube na equipa principal, por arquétipo.
const formadosPorArq = () => {
  const r: Record<string, { clubes: number; formados: number; titulares: number }> = {};
  for (let c = 0; c < w.clubes.length; c++) {
    if (w.liga[c] < 0) continue;
    const a = e.ia?.arquetipo[c] ?? '?';
    const js = doClube(c).sort((x, y) => st.ovrNat(y) - st.ovrNat(x));
    const x = (r[a] ??= { clubes: 0, formados: 0, titulares: 0 });
    x.clubes++;
    x.formados += js.filter((j) => w.mercado!.contratos.formadoClube[j] === c).length;
    x.titulares += js.slice(0, 11).filter((j) => w.mercado!.contratos.formadoClube[j] === c).length;
  }
  return r;
};

// Geração a seguir: os prospectos de 15 anos de um clube formador médio de uma liga média.
const formadores = [...w.ligaPorId('POR1').clubes, ...w.ligaPorId('NED1').clubes].filter((c) => e.ia?.arquetipo[c] === 'formador').sort((a, b) => w.reputacao[b] - w.reputacao[a]);
const clubeG = formadores[0] ?? w.ligaPorId('POR1').clubes[0];
const dia0 = Math.floor(Date.UTC(2026, 7, 1) / 864e5);
const geracao = [...ac.prospectos[clubeG], ...ac.sub18[clubeG]].filter((j) => st.idade(j, dia0) < 16.5).slice(0, 8);
const percurso = new Map<number, string[]>(geracao.map((j) => [j, []]));
const estadoJ = (j: number) => {
  const c = st.clube[j];
  if (c === -2) return 'deixou';
  if (c === -3) return 'livre';
  if (c < 0) return '—';
  const esc = ac.escalao[j];
  const onde = c === clubeG ? '' : ` (${w.clubes[c].nome})`;
  return `${esc ? NOME_ESCALAO[esc] : 'principal'} ${st.ovrNat(j)}/${st.pot[j]}${onde}`;
};
for (const j of geracao) percurso.get(j)!.push(estadoJ(j));

const resumo0 = ac.resumoProspectos(clubeG, dia0).slice(0, 10);
const inicio = ovrLiga();
const linhas: { epoca: number; ovr: Record<string, number>; faltas: number; tamanhoMin: number; idade: number; jogadores: number; individuais: number; agregado: number; n: number }[] = [];
const sim = new Simulador(w, true);
const semanas: number[] = [];
const promovidosAntes = { n: 0 };
const promPorArq: Record<string, number> = {};
const formados0 = formadosPorArq();
sim.aoFechar = (t) => {
  if (t.grupo !== 'ago_mai') return;
  const activos = w.plantel.flatMap((js, c) => (w.liga[c] >= 0 ? js.filter((j) => st.clube[j] === c) : []));
  const f = ultimaFalta.v ?? faltas();
  const k = ac.contagens();
  linhas.push({ epoca: t.ano, ovr: ovrLiga(), faltas: f.n, tamanhoMin: f.tamanhoMin, idade: activos.reduce((a, j) => a + st.idade(j, sim.segunda), 0) / activos.length, jogadores: activos.length, individuais: k.individuais, agregado: k.agregado, n: st.n });
  for (const j of geracao) percurso.get(j)!.push(estadoJ(j));
  for (const x of ac.promovidos.slice(promovidosAntes.n)) { const a = e.ia?.arquetipo[x.clube] ?? '?'; promPorArq[a] = (promPorArq[a] ?? 0) + 1; }
  promovidosAntes.n = ac.promovidos.length;
};
// Faltas por posição medidas depois da janela de Verão (fim de Setembro), não logo a seguir à passagem de época.
const ultimaFalta: { v: { n: number; tamanhoMin: number } | null } = { v: null };
const grupos = [...sim.temporadas.keys()];
const ts0 = performance.now();
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) {
  const t = performance.now();
  sim.simularSemana();
  semanas.push(performance.now() - t);
  const d = new Date(sim.segunda * 864e5);
  if (d.getUTCMonth() === 8 && d.getUTCDate() >= 24) ultimaFalta.v = faltas();
}
const tTotal = performance.now() - ts0;
(globalThis as { gc?: () => void }).gc?.();
const hFim = process.memoryUsage().heapUsed;
const saveJog = gzipSync(st.exportar()).length;
const ultimo = sim.historico[sim.historico.length - 1];
const saveEpoca = gzipSync(serializarHistorico([ultimo])).length;
const saveHist = gzipSync(serializarHistorico(sim.historico)).length;
const fim = linhas[linhas.length - 1].ovr;
const deriva = Object.keys(inicio).map((id) => ({ id, a: inicio[id], b: fim[id], d: fim[id] - inicio[id] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
const maxDeriva = Math.max(...linhas.flatMap((l) => Object.keys(inicio).map((id) => Math.abs(l.ovr[id] - inicio[id]))));
const ok = (b: boolean) => (b ? '✅' : '❌');
const piores = Object.keys(inicio).map((id) => { let m = 0, ep = 0; for (const l of linhas) { const d = l.ovr[id] - inicio[id]; if (Math.abs(d) > Math.abs(m)) { m = d; ep = l.epoca; } } return { id, m, ep }; }).sort((a, b) => Math.abs(b.m) - Math.abs(a.m));

p(`# Prompt 4 — Paragem C: academia e juniores (${N} épocas, semente ${semente})`, '', '> DADOS DE TESTE. Mundo completo sem interface; a reposição gerada do Prompt 2 foi substituída pela academia.', '');
const k0 = linhas[0], kN = linhas[linhas.length - 1];
p('## 1. Estabilidade', '', '| Medida | Resultado | Alvo | |', '|---|---|---|---|');
p(`| Deriva do OVR médio por liga (máx. ao longo das épocas, ${ligas.length} ligas principais) | ${maxDeriva.toFixed(2)} | ≤ 3 | ${ok(maxDeriva <= 3)} |`);
p(`| Ligas com maior deriva (liga: máx. na época) | ${piores.slice(0, 5).map((x) => `${x.id} ${x.m > 0 ? '+' : ''}${x.m.toFixed(1)} (${x.ep})`).join(', ')} | | |`);
p(`| Posições em falta (clubes × grupo abaixo de GR 2, DEF 6, MED 6, AVA 4), pior época, medidas no fim de Setembro | ${Math.max(...linhas.map((l) => l.faltas))} | 0 | ${ok(Math.max(...linhas.map((l) => l.faltas)) === 0)} |`);
p(`| Plantel mais curto (pior época) | ${Math.min(...linhas.map((l) => l.tamanhoMin))} | ≥ 18 | ${ok(Math.min(...linhas.map((l) => l.tamanhoMin)) >= 18)} |`);
const idades = linhas.map((l) => l.idade);
p(`| Idade média dos plantéis (mín.–máx.) | ${Math.min(...idades).toFixed(2)}–${Math.max(...idades).toFixed(2)} | estável (±1) | ${ok(Math.max(...idades) - Math.min(...idades) <= 1)} |`);
p(`| Juniores individuais (início → fim) | ${ac.contagens().individuais.toLocaleString('pt-PT')} (época 1: ${k0.individuais.toLocaleString('pt-PT')}) | ~40 000 | |`);
p(`| Jovens no agregado (fim) | ${kN.agregado.toLocaleString('pt-PT')} | — | |`, '');
p('| Época | ' + deriva.slice(0, 8).map((x) => x.id).join(' | ') + ' | faltas | idade | jogadores | juniores | registos |', '|---|' + deriva.slice(0, 8).map(() => '---:').join('|') + '|---:|---:|---:|---:|---:|');
p(`| início | ${deriva.slice(0, 8).map((x) => inicio[x.id].toFixed(1)).join(' | ')} | | | | | |`);
for (const l of linhas) p(`| ${l.epoca} | ${deriva.slice(0, 8).map((x) => l.ovr[x.id].toFixed(1)).join(' | ')} | ${l.faltas} | ${l.idade.toFixed(2)} | ${l.jogadores} | ${l.individuais} | ${l.n} |`);

p('', '## 2. Formador × comprador de estrelas', '', '| Arquétipo | Clubes | Formados no clube na equipa principal (início → fim, por clube) | Entre os 11 melhores (fim, por clube) | Promoções por clube por época |', '|---|---:|---:|---:|---:|');
const fN = formadosPorArq();
for (const a of Object.keys(fN).sort((x, y) => fN[y].formados / fN[y].clubes - fN[x].formados / fN[x].clubes)) {
  const x = fN[a], y = formados0[a] ?? x;
  p(`| ${a} | ${x.clubes} | ${(y.formados / y.clubes).toFixed(1)} → ${(x.formados / x.clubes).toFixed(1)} | ${(x.titulares / x.clubes).toFixed(1)} | ${((promPorArq[a] ?? 0) / x.clubes / N).toFixed(2)} |`);
}

p('', `## 3. Shortlist de prospectos do ${w.clubes[clubeG].nome} (${w.ligas[w.liga[clubeG]]?.regras.id ?? ''}, formador), no início — 10 exemplos (dados para a interface)`, '');
p('| Nome | Idade | Pos. | Escalão | Atributos principais | OVR | Potencial (estrelas) | Evolução | Estado | Conselho |', '|---|---:|---|---|---|---:|---|---:|---|---|');
for (const r of resumo0) p(`| ${r.nome} | ${r.idade} | ${r.posicao} | ${r.escalao} | ${r.atributos.map((a) => `${a.id} ${a.valor}`).join(', ')} | ${r.ovr} | ${r.estrelas[0]}–${r.estrelas[1]} | ${r.evolucao ?? '—'} | ${r.estado} | ${r.conselho.replace('_', ' ')} |`);
// O mesmo clube visto por um rival (nevoeiro).
const rival = w.ligas[w.liga[clubeG]].clubes.find((c) => c !== clubeG && ac.resumoProspectos(clubeG, sim.segunda, c).length) ?? -1;
if (rival >= 0) {
  const vis = ac.resumoProspectos(clubeG, sim.segunda, rival).slice(0, 5);
  p('', `Os prospectos do ${w.clubes[clubeG].nome} vistos pelo ${w.clubes[rival].nome} no fim (nevoeiro do scouting):`, '', '| Nome | Idade | Conhecimento | OVR (intervalo) | Potencial (estrelas) |', '|---|---:|---:|---|---|');
  for (const r of vis) p(`| ${r.nome} | ${r.idade} | ${r.conhecimento}% | ${Array.isArray(r.ovr) ? `${r.ovr[0]}–${r.ovr[1]}` : r.ovr} | ${r.estrelas[0]}–${r.estrelas[1]} |`);
}

p('', `## 4. Uma geração de prospectos do ${w.clubes[clubeG].nome} (15 anos em 2026) até à equipa principal`, '', 'Formato: escalão OVR/potencial (clube, se saiu).', '');
p('| Jogador | ' + ['início', ...linhas.map((l) => String(l.epoca))].slice(0, 10).join(' | ') + ' |', '|---|' + Array(Math.min(10, linhas.length + 1)).fill('---').join('|') + '|');
for (const [j, h] of percurso) p(`| ${st.nomes[j]} (${POSICOES[st.posNat[j]]}) | ${h.slice(0, 10).join(' | ')} |`);

p('', '## 5. Promoções fora da curva (sub-18 → sub-21 ou equipa principal)', '');
const fdc = ac.foraDaCurva;
p(`${fdc.length} casos em ${N} épocas (${(fdc.length / N / w.ligas.reduce((a, l) => a + l.clubes.length, 0)).toFixed(3)} por clube por época). Exemplos:`, '', '| Data | Clube | Jogador | Idade | OVR | Potencial | Para |', '|---|---|---|---:|---:|---:|---|');
for (const x of [...fdc].sort((a, b) => b.pot - a.pot).slice(0, 6)) p(`| ${new Date(x.dia * 864e5).toISOString().slice(0, 10)} | ${w.clubes[x.clube].nome} | ${st.nomes[x.jogador]} | ${x.idade} | ${x.ovr} | ${x.pot} | ${x.para} |`);

p('', '## 6. Aliciamento de jovens (compensação de formação)', '');
const al = ac.aliciados;
p(`${al.length} jovens aliciados em ${N} épocas; compensação média ${al.length ? Math.round(al.reduce((a, x) => a + x.compensacao, 0) / al.length / 1000) : 0} mil €. Exemplos:`, '', '| Data | Jogador | De | Para | Compensação |', '|---|---|---|---|---:|');
for (const x of al.slice(0, 6)) p(`| ${new Date(x.dia * 864e5).toISOString().slice(0, 10)} | ${st.nomes[x.jogador]} | ${w.clubes[x.de].nome} | ${w.clubes[x.para].nome} | ${Math.round(x.compensacao / 1000)} mil € |`);

const ord = [...semanas].sort((a, b) => a - b);
p('', '## 7. Memória, gravação e desempenho', '', '| Medida | Valor | Alvo |', '|---|---|---|');
p(`| Geração do mundo (com ~${(36000).toLocaleString('pt-PT')} juniores) | ${(tGerar / 1000).toFixed(1)} s | — |`);
p(`| Memória (heap) do mundo / no fim | ${MB(hMundo - h0)} / ${MB(hFim - h0)} MB | — |`);
p(`| Jogadores no PlayerStore (inclui aposentados e libertados) | ${st.n.toLocaleString('pt-PT')} | — |`);
p(`| Gravação: jogadores (gzip) | ${MB(saveJog)} MB | — |`);
p(`| Gravação: uma época de histórico (gzip) | ${MB(saveEpoca)} MB | ~20 MB |`);
p(`| Gravação: histórico de ${sim.historico.length} épocas (gzip) | ${MB(saveHist)} MB | — |`);
p(`| Estimativa para 25 épocas (jogadores + histórico) | ${MB(saveJog * (1 + (25 - N) / Math.max(1, N) * 0.5) + (saveHist / Math.max(1, N)) * 25)} MB | < 500 MB |`);
p(`| Semana (mediana / p99 / máx.) | ${ord[ord.length >> 1].toFixed(0)} / ${ord[Math.floor(ord.length * 0.99)].toFixed(0)} / ${ord[ord.length - 1].toFixed(0)} ms | tablet × 3 a 6 |`);
p(`| ${N} épocas | ${(tTotal / 1000).toFixed(0)} s | — |`);
writeFileSync(process.env.SAIDA ?? new URL('../docs/relatorios/fase4_paragemC_academia.md', import.meta.url), L.join('\n') + '\n');
console.log(L.slice(0, 12).join('\n'));
