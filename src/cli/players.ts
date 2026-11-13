// npm run players [-- --export [--para-pacotes]]
// Relatório da Paragem A (Fase 2): atributos, pesos dos papéis, 10 jogadores de exemplo,
// curvas de evolução, distribuição de OVR por idade e benchmark de memória.
// Com --export, escreve players.csv de cada pacote em out/players/ (ou em packs/ com --para-pacotes).
import { mkdirSync, writeFileSync } from 'node:fs';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo, diaInicioMundo, type World } from '../engine/world.ts';
import { ATRIBUTOS, OCULTOS, N_ATR } from '../config/atributos.ts';
import { PAPEIS, POSICOES, PAPEIS_DA_POSICAO, IDX_POS, NOME_POSICAO, type Posicao } from '../config/papeis.ts';
import { PlayerStore } from '../players/store.ts';
import { gerarJogador } from '../players/gerador.ts';
import { aplicarVariacao, variacaoEsperada, evoluirMes, parteMinutosPorOrdem } from '../players/evolucao.ts';
import { exportarPacote } from '../players/csv.ts';
import { EVOLUCAO } from '../config/evolucao.ts';
import { Rng } from '../core/rng.ts';
import { MUNDO } from '../config/mundo.ts';
import { args, RAIZ_PACKS } from './args.ts';

const a = args();
const semente = Number(a.seed ?? MUNDO.semente_padrao);
const h0 = process.memoryUsage().heapUsed;
const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const tW = performance.now();
const wSem = construirMundo(dados, { semente, modo: 'teste', jogadores: false });
const tSem = performance.now() - tW;
const h1 = process.memoryUsage().heapUsed;
const t0 = performance.now();
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
const tCom = performance.now() - t0;
void wSem;
const st = w.jogadores!;
const h2 = process.memoryUsage().heapUsed;
const dia0 = diaInicioMundo();

if (a.export) {
  const base = a['para-pacotes'] ? RAIZ_PACKS : new URL('../../out/players/', import.meta.url).pathname;
  for (const p of w.pacotes) {
    mkdirSync(`${base}${p.manifest.id}`, { recursive: true });
    writeFileSync(`${base}${p.manifest.id}/players.csv`, exportarPacote(w, st, p.manifest.id));
  }
  console.log(`players.csv exportados para ${base}`);
}

const L: string[] = [];
const p = (s = '') => L.push(s);
const r1 = (x: number) => x.toFixed(1);
p('# Fase 2 — Paragem A: jogadores');
p();
p(`> DADOS DE TESTE. Semente ${semente}. ${st.n.toLocaleString('pt-PT')} jogadores gerados para ${w.clubes.length} clubes (25 por clube).`);
p();

// ---------- Atributos e papéis ----------
p('## 1. Atributos (aprovados)');
p();
for (const g of ['tecnico', 'mental', 'fisico', 'guarda_redes'] as const) {
  p(`- **${{ tecnico: 'Técnicos', mental: 'Mentais', fisico: 'Físicos', guarda_redes: 'Guarda-redes' }[g]}:** ${ATRIBUTOS.filter((x) => x.grupo === g).map((x) => `${x.nome} (${x.id})`).join(', ')}`);
}
p(`- **Ocultos:** ${OCULTOS.map((o) => `${o.nome} (${o.id})`).join(', ')}`);
p();
p('## 2. Pesos dos papéis (aprovados; em `src/config/papeis.ts`)');
p();
p('| Papel | Posições | Pesos |');
p('|---|---|---|');
for (const r of PAPEIS) p(`| ${r.nome} | ${r.posicoes.join(', ')} | ${Object.entries(r.pesos).sort((x, y) => y[1]! - x[1]!).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
p();

// ---------- Exemplos ----------
p('## 3. Dez jogadores de exemplo (ligas e níveis diferentes)');
p();
const escolher = (liga: string, pos: Posicao, topo: boolean, idadeMax = 99): number => {
  const l = w.ligaPorId(liga);
  const clubes = [...l.clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x]);
  // Começa no clube pedido (topo ou meio da tabela) e avança até encontrar um jogador que sirva.
  const inicio = topo ? 0 : Math.floor(clubes.length / 2);
  for (let k = 0; k < clubes.length; k++) {
    const c = clubes[(inicio + k) % clubes.length];
    const cands = w.plantel[c].filter((j) => POSICOES[st.posNat[j]] === pos && st.idade(j, dia0) <= idadeMax).sort((x, y) => st.ovrNat(y) - st.ovrNat(x));
    if (cands.length) return cands[0];
  }
  throw new Error(`sem ${pos} em ${liga}`);
};
const exemplos: [string, number][] = [
  ['Craque do campeão inglês (ENG1, topo)', escolher('ENG1', 'PL', true)],
  ['Guarda-redes de clube grande (ESP1, topo)', escolher('ESP1', 'GR', true)],
  ['Central de meio da tabela (GER1)', escolher('GER1', 'DC', false)],
  ['Médio da Championship (ENG2, meio)', escolher('ENG2', 'MC', false)],
  ['Extremo do Brasileirão (BRA1, topo)', escolher('BRA1', 'EE', true)],
  ['Lateral da 1.ª Liga portuguesa (POR1, meio)', escolher('POR1', 'DD', false)],
  ['Jovem promessa (NED1, topo, ≤ 20 anos)', escolher('NED1', 'MO', true, 20)],
  ['Avançado da Saudi Pro League (KSA1, meio)', escolher('KSA1', 'PL', false)],
  ['Trinco da liga Resto da Europa (EUR1, meio)', escolher('EUR1', 'MDC', false)],
  ['Defesa da League Two (ENG4, meio)', escolher('ENG4', 'DC', false)],
];
p('| # | Jogador | Nac. | Idade | Clube (liga) | Pos. | OVR | Pot. | Adequação aos papéis da posição (1–20) | OVR noutras posições |');
p('|---:|---|---|---:|---|---|---:|---:|---|---|');
exemplos.forEach(([titulo, j], k) => {
  const pos = POSICOES[st.posNat[j]];
  const papeis = PAPEIS_DA_POSICAO[pos].map((r) => `${PAPEIS[r].nome} ${r1(st.adequacao(j, r))}${r === st.papelPref[j] ? '*' : ''}`).join('; ');
  const outras = POSICOES.filter((x) => x !== pos).map((x) => [x, st.ovrPos(j, x), st.fam[j * 12 + IDX_POS[x]]] as const).sort((x, y) => y[1] - x[1]).slice(0, 3)
    .map(([x, o, f]) => `${x} ${o} (fam. ${f})`).join(', ');
  const c = st.clube[j];
  p(`| ${k + 1} | **${st.nomes[j]}** — ${titulo} | ${st.paises[st.pais[j]]} | ${Math.floor(st.idade(j, dia0))} | ${w.clubes[c].nome} (${w.clubes[c].liga}) | ${pos} | **${st.ovrNat(j)}** | ${st.pot[j]} | ${papeis} | ${outras} |`);
});
p();
p('\\* papel preferido. Atributos dos 10 exemplos:');
p();
p(`| # | ${ATRIBUTOS.map((x) => x.id).join(' | ')} | ${OCULTOS.map((o) => o.id).join(' | ')} |`);
p(`|---:|${ATRIBUTOS.map(() => '---:').join('|')}|${OCULTOS.map(() => '---:').join('|')}|`);
exemplos.forEach(([, j], k) => p(`| ${k + 1} | ${Array.from(st.atr.subarray(j * N_ATR, (j + 1) * N_ATR)).join(' | ')} | ${Array.from(st.ocu.subarray(j * 6, j * 6 + 6)).join(' | ')} |`));
p();

// ---------- Hierarquia ----------
p('## 4. Qualidade dos plantéis por liga (média do melhor onze por OVR)');
p();
p('| Liga | Força desp. | Melhor clube | Média | Pior clube | Melhor jogador |');
p('|---|---:|---:|---:|---:|---:|');
const onze = (c: number) => { const o = w.plantel[c].map((j) => st.ovrNat(j)).sort((x, y) => y - x).slice(0, 11); return o.reduce((s, x) => s + x, 0) / 11; };
for (const l of [...w.ligas].sort((x, y) => onze(y.clubes.reduce((b, c) => (w.reputacao[c] > w.reputacao[b] ? c : b), y.clubes[0])) - onze(x.clubes.reduce((b, c) => (w.reputacao[c] > w.reputacao[b] ? c : b), x.clubes[0])))) {
  const v = l.clubes.map(onze);
  const melhorJ = Math.max(...l.clubes.flatMap((c) => w.plantel[c].map((j) => st.ovrNat(j))));
  p(`| ${l.regras.id} ${l.regras.nome} | ${l.regras.forca_desportiva} | ${r1(Math.max(...v))} | ${r1(v.reduce((s, x) => s + x, 0) / v.length)} | ${r1(Math.min(...v))} | ${melhorJ} |`);
}
p();

// ---------- Distribuição por idade ----------
p('## 5. Distribuição de OVR por idade (mundo gerado)');
p();
p('| Idade | Jogadores | OVR médio | Potencial médio | OVR ≥ 80 |');
p('|---|---:|---:|---:|---:|');
for (const [a0, a1] of [[17, 19], [20, 22], [23, 25], [26, 28], [29, 31], [32, 34], [35, 38]]) {
  const js = Array.from({ length: st.n }, (_, i) => i).filter((i) => { const x = st.idade(i, dia0); return x >= a0 && x < a1 + 1; });
  p(`| ${a0}–${a1} | ${js.length} | ${r1(js.reduce((s, i) => s + st.ovrNat(i), 0) / js.length)} | ${r1(js.reduce((s, i) => s + st.pot[i], 0) / js.length)} | ${js.filter((i) => st.ovrNat(i) >= 80).length} |`);
}
p();

// ---------- Curvas de evolução ----------
p('## 6. Curvas de evolução (coortes de 400 jogadores dos 17 aos 38 anos)');
p();
p(`Simulação mensal com o módulo de evolução: titulares (parte dos minutos ${EVOLUCAO.parte_minutos_padrao.titular}), treinador neutro (desenvolvimento 10), ocultos gerados. Valor = OVR médio na posição natural.`);
p();
const idades = [17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37];
const coortes: { nome: string; pot: number; pos: Posicao; prof?: number }[] = [
  { nome: 'Potencial 90 (campo)', pot: 90, pos: 'MC' },
  { nome: 'Potencial 75 (campo)', pot: 75, pos: 'MC' },
  { nome: 'Potencial 60 (campo)', pot: 60, pos: 'MC' },
  { nome: 'Potencial 80, profissionalismo 18', pot: 80, pos: 'MC', prof: 18 },
  { nome: 'Potencial 80, profissionalismo 4', pot: 80, pos: 'MC', prof: 4 },
  { nome: 'Guarda-redes potencial 80', pot: 80, pos: 'GR' },
];
p(`| Coorte | ${idades.join(' | ')} | Pico (idade) | Ultrapassou o potencial |`);
p(`|---|${idades.map(() => '---:').join('|')}|---|---:|`);
const resultadosCurvas: Record<string, number[]> = {};
for (const co of coortes) {
  const cs = new PlayerStore(512);
  const rng = Rng.de(semente, 'curva', co.nome);
  const js: number[] = [];
  for (let k = 0; k < 400; k++) {
    const i = gerarJogador(cs, rng, { id: `c${k}`, pais: 'POR', pos: co.pos, idade: 17, dia: 0, ovr: co.pot - 26 + rng.normal(0, 3), potencial: co.pot + rng.normal(0, 2), clube: 0 });
    if (co.prof) cs.ocu[i * 6] = co.prof;
    js.push(i);
  }
  const porIdade: number[] = [];
  let ultrapassou = 0;
  let pico = { ovr: 0, idade: 0 };
  for (let m = 0; m <= 21 * 12; m++) {
    const idade = 17 + m / 12;
    if (m % 12 === 0) {
      const med = js.reduce((s, i) => s + cs.ovrNat(i), 0) / js.length;
      porIdade.push(med);
      if (med > pico.ovr) pico = { ovr: med, idade };
    }
    for (const i of js) {
      const d = variacaoEsperada(idade, co.pos === 'GR', cs.ovrNat(i), cs.pot[i], cs.oculto(i, 'prof'), cs.oculto(i, 'amb'), EVOLUCAO.parte_minutos_padrao.titular, 10) + rng.normal(0, EVOLUCAO.ruido);
      aplicarVariacao(cs, i, d, idade, rng);
      if (cs.ovrNat(i) > cs.pot[i]) ultrapassou++;
    }
  }
  resultadosCurvas[co.nome] = porIdade;
  p(`| ${co.nome} | ${idades.map((x) => r1(porIdade[x - 17])).join(' | ')} | ${r1(pico.ovr)} (${Math.round(pico.idade)}) | ${ultrapassou} |`);
}
p();

// ---------- Memória e tempos ----------
const tM = performance.now();
const ctx = { parteMinutos: parteMinutosPorOrdem(w, st), desenvolvimentoTreinador: () => 10 };
evoluirMes(w, st, dia0 + 31, ctx);
const tEvo = performance.now() - tM;
p('## 7. Benchmark de memória e tempo');
p();
p('| Medida | Valor |');
p('|---|---|');
p(`| Jogadores | ${st.n.toLocaleString('pt-PT')} |`);
p(`| Arrays tipados (capacidade alocada ${st.cap.toLocaleString('pt-PT')}) | ${(st.bytes() / 1024 / 1024).toFixed(2)} MB (${Math.round(st.bytes() / st.cap)} bytes por jogador) |`);
p(`| Heap total com jogadores, nomes e ids (estimativa por diferença) | ${((h2 - h1 - (h1 - h0)) / 1024 / 1024).toFixed(1)} MB |`);
p(`| Estimativa para 23 000 jogadores | ${((st.bytes() / st.cap) * 23000 / 1024 / 1024).toFixed(2)} MB em arrays + ~${((23000 * 60) / 1024 / 1024).toFixed(1)} MB em textos |`);
p(`| Gerar o mundo sem jogadores / com jogadores | ${tSem.toFixed(0)} ms / ${tCom.toFixed(0)} ms |`);
p(`| Evolução mensal de todos os jogadores | ${tEvo.toFixed(0)} ms |`);
p();
p('Nota: a estimativa de heap por diferença inclui o segundo mundo construído; os arrays tipados são a parte que escala.');
const dir = new URL('../../docs/relatorios/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}fase2_paragemA_jogadores.md`, L.join('\n') + '\n');
console.log(`Relatório: docs/relatorios/fase2_paragemA_jogadores.md (${st.n} jogadores; arrays ${(st.bytes() / 1048576).toFixed(2)} MB; evolução mensal ${tEvo.toFixed(0)} ms).`);
for (const [k, v] of Object.entries(resultadosCurvas)) console.log(k, v.map((x) => x.toFixed(0)).join(' '));
void NOME_POSICAO; void (null as unknown as World);
