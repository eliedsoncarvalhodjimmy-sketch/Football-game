// Prompt 8, Bloco A (PARAGEM A): a janela dos prémios numa época completa do mundo de teste. Custo em memória e na
// gravação, um jogador transferido a meio da época com os números repartidos, um guarda-redes com as estatísticas novas,
// os prémios dessa janela e o tempo da semana. Uso: npx tsx scripts/relatorio-premios-janela.ts → docs/relatorios/premios_blocoA_janela.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { CATEGORIAS } from '../src/config/premios.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { N_CAT } from '../src/players/store.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';

const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente: 2026, modo: 'teste' });
const sim = new Simulador(w, true);
const st = w.jogadores!, m = w.mercado!;
const tempos: number[] = [];
// Até ao dia 28 de Julho do ano seguinte (antes do cálculo de 29/7), guardando o estado da janela.
let fotoAntes: { n: number; wJogos: Uint16Array; wClube: Int32Array; wMinCat: Uint16Array; wGolos: Uint16Array; wAssist: Uint16Array; wMinutos: Uint16Array } | null = null;
for (let k = 0; k < 60; k++) {
  const t0 = performance.now(); sim.simularSemana(); tempos.push(performance.now() - t0);
  const d = sim.segunda, x = new Date(d * 864e5);
  if (!fotoAntes && x.getUTCFullYear() === 2027 && x.getUTCMonth() === 6 && x.getUTCDate() >= 22) fotoAntes = { n: st.n, wJogos: st.wJogos.slice(), wClube: st.wClube.slice(), wMinCat: st.wMinCat.slice(), wGolos: st.wGolos.slice(), wAssist: st.wAssist.slice(), wMinutos: st.wMinutos.slice() };
  if (w.historico!.premiosJogo.length) break;
}
const f = fotoAntes!;
const L: string[] = [];
const p = (...s: string[]) => L.push(...s);
// Custo: bytes dos arrays novos (capacidade alocada) e na exportação binária (n jogadores).
const novos = Object.entries(st).filter(([k, v]) => ArrayBuffer.isView(v) && (/^w[A-Z]/.test(k) || /^h[A-Z]/.test(k) || k === 'internacionalizacoes' || k === 'intEstimada'));
const porJog = novos.reduce((a, [, v]) => a + (v as Uint8Array).byteLength / st.cap, 0);
p('# Prompt 8, Bloco A — janela dos prémios (PARAGEM A)', '', '> Mundo de teste, semente 2026, uma janela completa (1/8/2026 a 28/7/2027). Gerado por `npx tsx scripts/relatorio-premios-janela.ts`.', '');
p('## 1. Dados guardados e custo', '', '| Campos por jogador | Bytes por jogador | Memória (capacidade) | Exportação binária (n jogadores) |', '|---|---|---|---|',
  `| ${novos.map(([k]) => k).join(', ')} | ${porJog.toFixed(0)} | ${(porJog * st.cap / 1e6).toFixed(1)} MB | ${(porJog * st.n / 1e6).toFixed(1)} MB |`, '',
  `Mais, no \`World\`: os jogos de cada clube por categoria (${w.janelaPremios!.jogos.size} entradas). O save é a repetição dos comandos: não cresce.`, '');
// Jogador transferido a meio da época (duas passagens na janela).
const cands = [];
for (let j = 0; j < f.n; j++) if (f.wClube[j * 2 + 1] >= 0 && f.wJogos[j] >= 20) cands.push(j);
cands.sort((a, b) => f.wMinutos[b] - f.wMinutos[a]);
const nomeC = (c: number) => (c >= 0 ? w.clubes[c].nome : '—');
p('## 2. Jogadores transferidos a meio da época (números repartidos)', '', `${cands.length} jogadores com duas passagens e 20+ jogos na janela. Os três com mais minutos:`, '');
for (const j of cands.slice(0, 3)) {
  p(`**${st.nomes[j]}** (${POSICOES[st.posNat[j]]}): ${f.wJogos[j]} jogos, ${f.wMinutos[j]} minutos, ${f.wGolos[j]} golos, ${f.wAssist[j]} assistências na janela.`, '', '| Passagem | Clube | ' + CATEGORIAS.join(' | ') + ' |', '|---|---|' + CATEGORIAS.map(() => '---|').join(''));
  for (let k = 0; k < 2; k++) p(`| ${k + 1} | ${nomeC(f.wClube[j * 2 + k])} | ${CATEGORIAS.map((_, c) => f.wMinCat[(j * 2 + k) * N_CAT + c]).join(' | ')} |`);
  const neg = m.registo.filter((r) => r.jogador === j && r.dia >= w.janelaPremios!.inicio - 400).map((r) => `${new Date(r.dia * 864e5).toISOString().slice(0, 10)} ${r.tipo} ${nomeC(r.de)} → ${nomeC(r.para)}`);
  p('', `Movimentos: ${neg.join('; ') || '—'}.`, '');
}
// Guarda-redes.
const grs = []; for (let j = 0; j < f.n; j++) if (st.posNat[j] === 0 && st.wJogos[j] >= 30) grs.push(j);
grs.sort((a, b) => st.wJogos[b] - st.wJogos[a]);
p('## 3. Guarda-redes (estatísticas novas)', '', '| GR | Jogos | Remates à baliza sofridos | Defesas | Golos sofridos | xG sofrido | Golos evitados (xG − golos) | Sem sofrer | Penáltis defendidos | Erros |', '|---|---|---|---|---|---|---|---|---|---|');
for (const j of grs.slice(0, 5)) { const gs = st.wRematesSofridos[j] - st.wDefesas[j], xg = st.wXgSofrido[j] / 10; p(`| ${st.nomes[j]} | ${st.wJogos[j]} | ${st.wRematesSofridos[j]} | ${st.wDefesas[j]} | ${gs} | ${xg.toFixed(1)} | ${(xg - gs).toFixed(1)} | ${st.wSemSofrer[j]} | ${st.wPenaltisDefendidos[j]} | ${st.wErros[j]} |`); }
p('');
// Prémios da janela.
p('## 4. Prémios desta janela (cálculo a 29 de Julho; pontuação ainda a do Prompt 4, o Bloco B muda-a)', '');
for (const pr of w.historico!.premiosJogo) p(`- **${pr.premio}** ${pr.ano}: ${pr.jogador} (${pr.clube}); top 3: ${pr.finalistas!.slice(0, 3).map((x) => `${x.jogador} ${x.pontos}`).join(', ')}`);
if (sim.avisosPremios.length) p('', `Avisos: ${sim.avisosPremios.join(' ')}`);
const med = tempos.reduce((a, b) => a + b, 0) / tempos.length;
p('', '## 5. Benchmark (Node; tablet × 3 a 6)', '', `Semana mundial: média ${med.toFixed(0)} ms, máximo ${Math.max(...tempos).toFixed(0)} ms (${tempos.length} semanas).`, '');
writeFileSync(new URL('../docs/relatorios/premios_blocoA_janela.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
