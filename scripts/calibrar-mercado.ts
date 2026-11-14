// Prompt 4, Bloco B (2.4): calibração do mercado — várias janelas sem interface, histogramas e fluxos entre ligas.
// Uso: npx tsx scripts/calibrar-mercado.ts [épocas] [semente] → docs/relatorios/fase4_paragemB_mercado.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { CONFEDERACAO_PAIS } from '../src/config/paises.ts';

const N = Number(process.argv[2] ?? 2);
const semente = Number(process.argv[3] ?? 2026);
const w = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente, modo: 'teste' });
const m = w.mercado!, st = w.jogadores!;
const ligaDe = new Map<number, string>();
const sim = new Simulador(w);
const semanas: { ms: number; janela: boolean; fecho: boolean }[] = [];
const grupos = [...sim.temporadas.keys()];
const n0 = m.registo.length;
const regLiga = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.id : 'exterior');
// A liga de cada clube no momento do negócio: guardamos ao registar (o registo só tem clubes).
const origLen = { v: 0 };
while (grupos.some((g) => sim.historico.filter((r) => r.grupo === g).length < N)) {
  // Semana de janela: alguma liga tem a janela aberta (as de ano civil têm datas próprias).
  const jan = w.ligas.some((L) => L.clubes.length > 0 && m.janelaAberta(L.clubes[0], sim.segunda + 3));
  const h0 = sim.historico.length;
  const t = performance.now(); sim.simularSemana(); semanas.push({ ms: performance.now() - t, janela: jan, fecho: sim.historico.length > h0 });
  for (; origLen.v < m.registo.length; origLen.v++) { const r = m.registo[origLen.v]; ligaDe.set(origLen.v, `${regLiga(r.de)}>${regLiga(r.para)}`); }
}
const R = m.registo.slice(n0).map((r, i) => ({ ...r, ld: (ligaDe.get(i + n0) ?? '>').split('>')[0], lp: (ligaDe.get(i + n0) ?? '>').split('>')[1] }));
const M = (x: number) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(0)} M€` : `${Math.round(x / 1e3)} mil €`);
const pais = (lid: string) => (lid === 'exterior' || !lid ? 'EXT' : (w.ligaPorId(lid).regras.pais ?? lid.slice(0, 3)));
const conf = (lid: string) => (lid === 'exterior' || !lid ? 'EXT' : (w.pacotes.find((p) => p.ligas.includes(w.ligas.indexOf(w.ligaPorId(lid))))?.manifest.confederacao ?? '?'));
void CONFEDERACAO_PAIS;
const L: string[] = [];
const p = (...x: string[]) => L.push(...x);
function histograma(titulo: string, valores: number[], limites: number[], fmt: (x: number) => string): string[] {
  const n = new Array(limites.length + 1).fill(0);
  for (const v of valores) { let k = 0; while (k < limites.length && v >= limites[k]) k++; n[k]++; }
  const max = Math.max(1, ...n);
  const out = [`**${titulo}** (${valores.length})`, '', '```'];
  for (let k = 0; k <= limites.length; k++) out.push(`${(k === 0 ? `< ${fmt(limites[0])}` : k === limites.length ? `≥ ${fmt(limites[k - 1])}` : `${fmt(limites[k - 1])}–${fmt(limites[k])}`).padStart(13)} | ${'█'.repeat(Math.round((40 * n[k]) / max))} ${n[k]}`);
  out.push('```', '');
  return out;
}
const pagos = R.filter((r) => r.fee > 0);
const livres = R.filter((r) => r.tipo === 'livre'), emp = R.filter((r) => r.tipo === 'emprestimo'), clau = R.filter((r) => r.tipo === 'clausula');
p(`# Prompt 4 — Paragem B: calibração do mercado (${N} épocas, semente ${semente})`, '', '> DADOS DE TESTE. Mundo completo sem interface, IA de mercado com nevoeiro de informação e scouting.', '');
p('## 1. Resumo', '', '| Medida | Valor | Faixa proposta |', '|---|---|---|');
const porJanela = R.length / (2 * N);
p(`| Negócios por janela (média, todas as ligas) | ${porJanela.toFixed(0)} | emergente (necessidade, vontade do jogador, dinheiro) |`);
p(`| Transferências pagas / livres / empréstimos / cláusulas | ${pagos.length - clau.length} / ${livres.length} / ${emp.length} / ${clau.length} | — |`);
p(`| % livres e % empréstimos | ${((100 * livres.length) / R.length).toFixed(0)}% / ${((100 * emp.length) / R.length).toFixed(0)}% | emergente |`);
p(`| Idade média dos transferidos (pagos) | ${(pagos.reduce((a, r) => a + r.idade, 0) / Math.max(1, pagos.length)).toFixed(1)} | 24–27 |`);
const razoes = pagos.map((r) => r.fee / Math.max(1, r.valor)).sort((a, b) => a - b);
p(`| Razão preço/valor (mediana; p5–p95) | ${razoes[Math.floor(razoes.length / 2)]?.toFixed(2)} (${razoes[Math.floor(razoes.length * 0.05)]?.toFixed(2)}–${razoes[Math.floor(razoes.length * 0.95)]?.toFixed(2)}) | 0,6–2,5, extremos raros |`);
p(`| Cláusulas activadas por época | ${(clau.length / N).toFixed(1)} | 5–30 |`);
p(`| Gasto total em transferências por época | ${M(pagos.reduce((a, r) => a + r.fee, 0) / N)} | — |`);
// Gasto e saldo por liga.
const gasto = new Map<string, number>(), receita = new Map<string, number>(), n = new Map<string, number>();
for (const r of pagos) { gasto.set(r.lp, (gasto.get(r.lp) ?? 0) + r.fee); receita.set(r.ld, (receita.get(r.ld) ?? 0) + r.fee); }
for (const r of R) n.set(r.lp, (n.get(r.lp) ?? 0) + 1);
p('', '## 2. Gasto e saldo por liga (por época)', '', '| Liga | Gasto | Receita | Saldo líquido | Entradas (todas) |', '|---|---:|---:|---:|---:|');
for (const id of [...new Set([...gasto.keys(), ...receita.keys()])].sort((a, b) => (gasto.get(b) ?? 0) - (gasto.get(a) ?? 0)).slice(0, 25)) p(`| ${id} | ${M((gasto.get(id) ?? 0) / N)} | ${M((receita.get(id) ?? 0) / N)} | ${M(((receita.get(id) ?? 0) - (gasto.get(id) ?? 0)) / N)} | ${((n.get(id) ?? 0) / N).toFixed(0)} |`);
// Histogramas.
p('', '## 3. Histogramas', '');
p(...histograma('Razão preço pago / valor (transferências pagas)', razoes, [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 4], (x) => x.toFixed(2)));
p(...histograma('Idade dos transferidos (pagos)', pagos.map((r) => r.idade), [19, 21, 23, 25, 27, 29, 31, 33], (x) => `${x}`));
p(...histograma('Preço das transferências pagas', pagos.map((r) => r.fee), [250e3, 1e6, 3e6, 10e6, 30e6, 60e6, 100e6], (x) => M(x)));
const porJan = new Map<string, number>();
for (const r of R) { const d = new Date(r.dia * 864e5); const k = `${d.getUTCFullYear()}-${d.getUTCMonth() < 4 ? 'Inverno' : 'Verão'}`; porJan.set(k, (porJan.get(k) ?? 0) + 1); }
p('Negócios por janela: ' + [...porJan].sort().map(([k, v]) => `${k} ${v}`).join(', ') + '.', '');
// Fluxos (país da liga de origem → destino), transferências pagas e livres.
p('## 4. Fluxos entre países (pagas + livres, por época)', '');
const fl = new Map<string, number>();
for (const r of R.filter((x) => x.tipo !== 'emprestimo')) { const k = `${pais(r.ld)}>${pais(r.lp)}`; fl.set(k, (fl.get(k) ?? 0) + 1); }
const paises = [...new Set([...fl.keys()].flatMap((k) => k.split('>')))].sort((a, b) => [...fl].filter(([k]) => k.endsWith('>' + b)).reduce((s, x) => s + x[1], 0) - [...fl].filter(([k]) => k.endsWith('>' + a)).reduce((s, x) => s + x[1], 0)).slice(0, 14);
p('| Origem \\ destino | ' + paises.join(' | ') + ' |', '|---|' + paises.map(() => '---:').join('|') + '|');
for (const a of paises) p(`| ${a} | ${paises.map((b) => (fl.get(`${a}>${b}`) ?? 0) / N >= 1 ? ((fl.get(`${a}>${b}`) ?? 0) / N).toFixed(0) : '·').join(' | ')} |`);
// Comportamentos esperados (teste).
p('', '## 5. Comportamentos esperados (teste, não regra)', '', '| Comportamento | Medida | Resultado |', '|---|---|---|');
const saidas = (pp: string[]) => R.filter((r) => pp.includes(pais(r.ld)) && r.tipo !== 'emprestimo');
const sa = saidas(['BRA', 'ARG']);
const paraEur = sa.filter((r) => conf(r.lp) === 'UEFA').length;
p(`| Brasil e Argentina exportam para a Europa | ${paraEur} de ${sa.length} saídas para a UEFA; vendas à Europa ${M(sa.filter((r) => conf(r.lp) === 'UEFA').reduce((a, r) => a + r.fee, 0) / N)}/época | ${paraEur >= 0.2 * sa.length ? '✅' : '⚠️'} |`);
const ksa = R.filter((r) => pais(r.lp) === 'KSA' && r.fee > 0 && pais(r.ld) !== 'KSA');
const ksaV = ksa.filter((r) => r.idade >= 28 && r.idade <= 33).length;
p(`| Arábia compra estrelas de 28–33 | ${ksaV} de ${ksa.length} compras ao estrangeiro com 28–33 anos; OVR médio ${(ksa.reduce((a, r) => a + r.ovr, 0) / Math.max(1, ksa.length)).toFixed(0)} | ${ksa.length && ksaV >= 0.4 * ksa.length ? '✅' : '⚠️'} |`);
const usa = R.filter((r) => pais(r.lp) === 'USA' && pais(r.ld) !== 'USA' && r.tipo !== 'emprestimo');
p(`| MLS compra veteranos | ${usa.filter((r) => r.idade >= 30).length} de ${usa.length} entradas do estrangeiro com 30+ | ${usa.length && usa.filter((r) => r.idade >= 30).length >= 0.3 * usa.length ? '✅' : '⚠️'} |`);
for (const pp of ['POR', 'NED', 'BEL']) {
  const rec = R.filter((r) => pais(r.ld) === pp && pais(r.lp) !== pp).reduce((a, r) => a + r.fee, 0), gas = R.filter((r) => pais(r.lp) === pp && pais(r.ld) !== pp).reduce((a, r) => a + r.fee, 0);
  p(`| ${pp} vende para ligas mais ricas | saldo com o estrangeiro ${M((rec - gas) / N)}/época | ${rec > gas ? '✅' : '⚠️'} |`);
}
// Nevoeiro: alvos de um clube (estimativa vs real).
const clube = [...w.ligaPorId('ENG1').clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x])[8];
const dia = sim.segunda;
const sc = m.scouting;
const conh = sc.conhecidos(clube).filter((j) => st.clube[j] >= 0 && st.clube[j] !== clube && sc.nivel(clube, j, dia) >= 35).map((j) => ({ j, o: sc.estimarOVR(clube, j, dia), pt: sc.estimarPotencial(clube, j, dia) })).sort((a, b) => b.o.estimado - a.o.estimado).slice(0, 12);
p('', `## 6. Nevoeiro: o que o ${w.clubes[clube].nome} vê dos seus possíveis alvos (${sc.conhecidos(clube).length} jogadores conhecidos; mostram-se os 12 de melhor OVR estimado entre os que a IA pode alvejar, com conhecimento ≥ 35%)`, '', '| Jogador | Clube (liga) | Idade | Conhecimento | OVR estimado (intervalo) | OVR real | Potencial estimado (intervalo) | Potencial real |', '|---|---|---:|---:|---|---:|---|---:|');
for (const x of conh) p(`| ${st.nomes[x.j]} | ${w.clubes[st.clube[x.j]].nome} (${regLiga(st.clube[x.j])}) | ${Math.floor(st.idade(x.j, dia))} | ${x.o.conhecimento}% | ${x.o.estimado} (${x.o.min}–${x.o.max}) | ${st.ovrNat(x.j)} | ${x.pt.estimado} (${x.pt.min}–${x.pt.max}) | ${st.pot[x.j]} |`);
// Evolução do conhecimento de um jogador em 10 semanas (mundo novo: um scout atribuído à liga do jogador).
const w2 = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente, modo: 'teste' });
const s2 = w2.mercado!.scouting, st2 = w2.jogadores!;
const obs = [...w2.ligaPorId('ENG1').clubes].sort((x, y) => w2.reputacao[y] - w2.reputacao[x])[2];
const ligaBra = w2.ligas.indexOf(w2.ligaPorId('BRA1'));
const alvoC = w2.ligaPorId('BRA1').clubes[0];
const alvoJ = (w2.plantel[alvoC] ?? []).filter((j) => st2.clube[j] === alvoC && st2.idade(j, dia) <= 22).sort((a, b) => st2.pot[b] - st2.pot[a])[0] ?? w2.plantel[alvoC][0];
s2.atribuicao[obs] = (w2.economia!.staff.porClube[obs] ?? []).filter((x) => x.cargo === 'scout').map(() => ligaBra);
p('', `## 7. Evolução do conhecimento de ${st2.nomes[alvoJ]} (${Math.floor(st2.idade(alvoJ, dia))} anos, ${w2.clubes[alvoC].nome}) pelo ${w2.clubes[obs].nome} em 10 semanas`, '', `Valores reais: OVR ${st2.ovrNat(alvoJ)}, potencial ${st2.pot[alvoJ]}. Os scouts do clube passam a cobrir o Brasileirão; na semana 4 o clube pede um relatório (observação dedicada).`, '', '| Semana | Conhecimento | OVR (intervalo) | Potencial (intervalo) | Estrelas | Ocultos visíveis | Familiaridade com a liga |', '|---:|---:|---|---|---|---|---:|');
const d0 = Math.floor(Date.UTC(2026, 8, 7) / 864e5);
for (let k = 0; k <= 10; k++) {
  const d = d0 + k * 7;
  if (k > 0) { s2.semana(d, []); s2.conhecer(obs, alvoJ, k === 4 ? 20 : 4, d); }
  const r = s2.relatorio(obs, alvoJ, d);
  p(`| ${k} | ${r.conhecimento}% | ${r.ovr.estimado} (${r.ovr.min}–${r.ovr.max}) | ${r.potencial.estimado} (${r.potencial.min}–${r.potencial.max}) | ${r.estrelas[0]}–${r.estrelas[1]} | ${r.ocultos ? 'sim' : 'não'} | ${s2.fam[obs * s2.nLigas + ligaBra].toFixed(2)} |`);
}
const jan = semanas.filter((x) => x.janela && !x.fecho).map((x) => x.ms), fora = semanas.filter((x) => !x.janela && !x.fecho).map((x) => x.ms), fecho = semanas.filter((x) => x.fecho).map((x) => x.ms);
p('', '## 8. Benchmark (Node; tablet × 3 a 6)', '', '| Medida | Valor | Alvo |', '|---|---|---|');
p(`| Semana com alguma janela aberta (média / máx.) | ${(jan.reduce((a, b) => a + b, 0) / jan.length).toFixed(0)} / ${Math.max(...jan).toFixed(0)} ms → tablet pior ${(Math.max(...jan) * 6 / 1000).toFixed(2)} s | < 5 s |`);
p(`| Semana sem janelas abertas (média / máx.) | ${(fora.reduce((a, b) => a + b, 0) / fora.length).toFixed(0)} / ${Math.max(...fora).toFixed(0)} ms → tablet pior ${(Math.max(...fora) * 6 / 1000).toFixed(2)} s | < 2 s |`);
p(`| Semana de fecho de época (rollover; ${fecho.length}) (máx.) | ${Math.max(...fecho).toFixed(0)} ms → tablet ${(Math.max(...fecho) * 6 / 1000).toFixed(2)} s | ecrã de fim de época |`);
p(`| Conhecimento guardado (scouting) | ${(m.scouting.bytes() / 1048576).toFixed(1)} MB | — |`);
writeFileSync(new URL('../docs/relatorios/fase4_paragemB_mercado.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
