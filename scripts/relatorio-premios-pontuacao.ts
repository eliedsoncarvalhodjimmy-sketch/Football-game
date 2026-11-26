// Prompt 8, Bloco B (PARAGEM B): pontuação por componentes e júri simulado numa janela completa do mundo de teste.
// Decomposição de 5 candidatos, top 10 do júri com a distribuição dos votos, antes/depois dos três prémios e o viés de
// posição ligado/desligado. Uso: npx tsx scripts/relatorio-premios-pontuacao.ts → docs/relatorios/premios_blocoB_pontuacao.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { calcularPremios, titulosDaJanela, GRUPO, type Candidato, type ResultadoPremio } from '../src/premios/premios.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';

const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const w = construirMundo(dados, { semente: 2026, modo: 'teste' });
const sim = new Simulador(w, true);
const st = w.jogadores!;
const tempos: number[] = [];
while (new Date(sim.segunda * 864e5).toISOString().slice(0, 10) < '2027-07-19') { const t0 = performance.now(); sim.simularSemana(); tempos.push(performance.now() - t0); }
const tit = titulosDaJanela(sim.historico.filter((r) => r.epoca === 2026));
let t0 = performance.now();
const res = calcularPremios(w, tit, 2027)!;
const tCalc = performance.now() - t0;
const semVies = calcularPremios(w, tit, 2027, { viesPosicao: false })!;
const L: string[] = [];
const p = (...s: string[]) => L.push(...s);
const liga = (c: Candidato) => w.ligas[w.liga[c.clubeIdx]]?.regras.id ?? '—';
const pos = (c: Candidato) => POSICOES[st.posNat[c.idx]];
const pais = (c: Candidato) => st.paises[st.pais[c.idx]];
const nomes: Record<string, string> = { melhor_do_mundo: 'Bola de Ouro', golden_boy: 'Golden Boy', guarda_redes: 'Melhor GR' };
p('# Prompt 8, Bloco B — pontuação e júri (PARAGEM B)', '', '> Mundo de teste, semente 2026, janela 1/8/2026 a 28/7/2027 (prémios de 2027). Gerado por `npx tsx scripts/relatorio-premios-pontuacao.ts`.', '');
p('## 1. Antes / depois', '', '| Prémio | Antes (pontuação do Prompt 4; Bloco B 1.ª versão: Galato, Sangaroré, Valujo) | Depois (Bloco B) | Top 3 depois |', '|---|---|---|---|');
const antes: Record<string, string> = { melhor_do_mundo: 'Stefano Galato (top 3: Galato, Sarani, Marardi — um GR)', golden_boy: 'Jack Fairstone (top 3: Fairstone, Sangaroré, Penley)', guarda_redes: 'Lorenzo Marardi (top 3: Marardi, Perašević, Valinho)' };
for (const k of Object.keys(nomes) as (keyof typeof res)[]) { const c = res[k].candidatos; p(`| ${nomes[k]} | ${antes[k]} | **${c[0].jogador}** (${c[0].clube}, ${pos(c[0])}) | ${c.slice(0, 3).map((x) => `${x.jogador} (${pos(x)})`).join(', ')} |`); }
p('');
p('## 2. Decomposição: os 5 primeiros da Bola de Ouro', '', '| # | Jogador | Pos. | Clube (liga) | Minutos | Golos | Assist. | Desempenho | Colectivo | Classe | Fama | Aura | Liga × | Total |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
res.melhor_do_mundo.candidatos.slice(0, 5).forEach((c, i) => p(`| ${i + 1} | ${c.jogador} | ${pos(c)} | ${c.clube} (${liga(c)}) | ${st.wMinutos[c.idx]} | ${st.wGolos[c.idx]} | ${st.wAssist[c.idx]} | ${c.comp.desempenho} | ${c.comp.colectivo} | ${c.comp.classe} | ${c.comp.fama} | ${(c.comp.aura * 100).toFixed(1)}% | ${c.comp.visibilidade} | ${c.comp.total} |`));
p('');
const juri = (k: keyof typeof res, r: ResultadoPremio, n: number) => {
  p(`## ${k === 'melhor_do_mundo' ? 3 : k === 'golden_boy' ? 4 : 5}. Júri — ${nomes[k]} (top ${n})`, '', '| # | Jogador | Pos. | Clube (liga) | País | Total | Pontos | 1.º lugares |', '|---|---|---|---|---|---|---|---|');
  r.candidatos.slice(0, n).forEach((c, i) => p(`| ${i + 1} | ${c.jogador} | ${pos(c)} | ${c.clube} (${liga(c)}) | ${pais(c)} | ${c.comp.total} | ${c.pontos} | ${c.primeiros} |`));
  const v = r.votacao, pp = Object.entries(v.porPais).sort((a, b) => b[1] - a[1]);
  p('', `Boletins: ${v.boletins}. Margem: ${v.margem} pontos. Unânime (≥ 80% dos 1.º lugares): ${v.unanime ? 'sim' : 'não'}.`, `Pontos do vencedor por país do jurado: ${pp.map(([k2, x]) => `${k2} ${x}`).join(', ')}.`, '');
};
juri('melhor_do_mundo', res.melhor_do_mundo, 10);
juri('golden_boy', res.golden_boy, 10);
juri('guarda_redes', res.guarda_redes, 5);
p('## 6. Viés de posição (Bola de Ouro)', '', '| | Ligado (config) | Desligado |', '|---|---|---|');
const grupos = (r: ResultadoPremio) => { const g: Record<string, number> = {}; for (const c of r.candidatos.slice(0, 30)) { const k = GRUPO[pos(c)]; g[k] = (g[k] ?? 0) + 1; } return Object.entries(g).map(([k, n]) => `${k} ${n}`).join(', '); };
p(`| Vencedor | ${res.melhor_do_mundo.candidatos[0].jogador} (${pos(res.melhor_do_mundo.candidatos[0])}) | ${semVies.melhor_do_mundo.candidatos[0].jogador} (${pos(semVies.melhor_do_mundo.candidatos[0])}) |`);
p(`| 30 finalistas por posição | ${grupos(res.melhor_do_mundo)} | ${grupos(semVies.melhor_do_mundo)} |`, '');
// Big 5: jogadores de fora no top 20 / top 30 da Bola de Ouro, em várias sementes.
p('## 7. Big 5 na Bola de Ouro (várias sementes)', '', '| Semente | Fora das Big 5 no top 20 | Fora das Big 5 no top 30 | Melhor de fora (lugar, liga) |', '|---|---|---|---|');
const linhaBig5 = (sem: number, r: ResultadoPremio, wx: typeof w) => {
  const lg = (c: Candidato) => wx.ligas[wx.liga[c.clubeIdx]]?.regras.id ?? '—';
  const fora = r.candidatos.map((c, i) => ({ c, i })).filter(({ c }) => c.comp.visibilidade < 1); // pela liga da passagem principal (não a do clube actual)
  p(`| ${sem} | ${fora.filter((x) => x.i < 20).length} | ${fora.filter((x) => x.i < 30).length} | ${fora[0] ? `${fora[0].c.jogador} (${fora[0].i + 1}.º, ${lg(fora[0].c)})` : '—'} |`);
};
linhaBig5(2026, res.melhor_do_mundo, w);
for (const sem of [7, 11]) {
  const wx = construirMundo(dados, { semente: sem, modo: 'teste' }), sx = new Simulador(wx, true);
  while (new Date(sx.segunda * 864e5).toISOString().slice(0, 10) < '2027-07-19') sx.simularSemana();
  linhaBig5(sem, calcularPremios(wx, titulosDaJanela(sx.historico.filter((r) => r.epoca === 2026)), 2027)!.melhor_do_mundo, wx);
}
p('');
const med = tempos.reduce((a, b) => a + b, 0) / tempos.length;
p('## 8. Benchmark (Node; tablet × 3 a 6)', '', `Cálculo dos três prémios com o júri: ${tCalc.toFixed(0)} ms (uma vez por ano). Semana mundial: média ${med.toFixed(0)} ms, máximo ${Math.max(...tempos).toFixed(0)} ms.`, '');
writeFileSync(new URL('../docs/relatorios/premios_blocoB_pontuacao.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
