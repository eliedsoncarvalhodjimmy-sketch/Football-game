// Prompt 4, Paragem A: relato de uma negociação com contra-proposta e leilão, 5 preços pedidos, uma cláusula activada, benchmark.
// Uso: npx tsx scripts/demo-mercado.ts → docs/relatorios/fase4_paragemA_mercado.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { Rng } from '../src/core/rng.ts';
import { precoPedido, valorMercado } from '../src/mercado/valor.ts';
import { NOME_ARQUETIPO } from '../src/config/arquetipos.ts';
import type { Negocio } from '../src/mercado/mercado.ts';

const w = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente: 2026, modo: 'teste' });
const st = w.jogadores!, e = w.economia!, m = w.mercado!;
const dia = Math.floor(Date.UTC(2026, 6, 10) / 864e5);
const M = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)} M€` : `${Math.round(x / 1e3)} mil €`);
const data = (d: number) => new Date(d * 864e5).toISOString().slice(0, 10);
const L: string[] = [];
const p = (...x: string[]) => L.push(...x);
const ordenar = (c: number) => m.plantel(c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
const idade = (j: number) => Math.floor(st.idade(j, dia));
const desc = (j: number) => `${st.nomes[j]} (${idade(j)} anos, OVR ${st.ovrNat(j)}, potencial ${st.pot[j]}, ${w.clubes[st.clube[j]].nome}, contrato até ${data(st.fimContrato[j])})`;

p('# Prompt 4 — Paragem A: valor, contratos e negociação', '', '> DADOS DE TESTE. Mundo fictício, semente 2026, janela de Verão de 2026.', '');

// 1. Negociação com contra-proposta e leilão entre 2 clubes.
const esp = [...w.ligaPorId('ESP1').clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
const vend = esp[6];
const alvo = ordenar(vend)[1];
const eng = [...w.ligaPorId('ENG1').clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
const [c1, c2] = [eng[3], eng[5]];
for (const c of [c1, c2]) e.clubes.caixa[c] = Math.max(e.clubes.caixa[c], 300e6);
const pp0 = precoPedido(w, m, alvo, c1, dia, 2);
p('## 1. Negociação com contra-proposta e leilão', '', `Alvo: ${desc(alvo)}. Valor de mercado ${M(pp0.valor)}; preço pedido com dois interessados ${M(pp0.preco)}.`, '');
const rng = Rng.de(1, 'demo');
const n1 = m.abrir('transferencia', alvo, c1, dia, Math.round(pp0.valor * 0.75), pp0.preco * 1.3, rng)!;
const n2 = m.abrir('transferencia', alvo, c2, dia + 1, Math.round(pp0.valor * 0.8), pp0.preco * 1.1, rng)!;
for (let k = 0; k < 14 && [n1, n2].some((n) => n.estado !== 'concluido' && n.estado !== 'falhou'); k++) {
  for (const n of [n1, n2]) if (n.estado !== 'concluido' && n.estado !== 'falhou') { m.ronda(n, rng); n.dia += rng.int(1, 2); }
}
const relato = (n: Negocio) => n.rondas.map((r) => `- ${data(r.dia)} — ${r.texto}`);
p(`**${w.clubes[c1].nome}** (máximo ${M(n1.maximo)}):`, '', ...relato(n1), '', `**${w.clubes[c2].nome}** (máximo ${M(n2.maximo)}):`, '', ...relato(n2), '');
// 2. Cinco preços pedidos com os factores.
p('## 2. Cinco preços pedidos e os factores', '', '| Jogador | Vendedor | Comprador | Valor | Factores | Preço pedido | Preço ÷ valor |', '|---|---|---|---:|---|---:|---:|');
const casos: { j: number; comp: number; nota: string }[] = [];
const usados = new Set<number>();
const porArq = (a: string) => { const c = [...Array(w.clubes.length).keys()].find((c) => !usados.has(c) && w.liga[c] >= 0 && e.ia.arquetipo[c] === a && w.ligas[w.liga[c]].regras.nivel === 1 && m.plantel(c).length > 15)!; usados.add(c); return c; };
// a) jogador-chave de um clube em crise
const crise = [...Array(w.clubes.length).keys()].find((c) => w.liga[c] >= 0 && m.plantel(c).length > 15 && w.ligas[w.liga[c]].regras.nivel === 1 && w.reputacao[c] > 40 && e.ia.arquetipo[c] === 'analitico') ?? 0;
usados.add(crise);
e.clubes.saude[crise] = 2;
casos.push({ j: ordenar(crise)[0], comp: eng[0], nota: 'vendedor em crise, jogador-chave' });
// b) jovem da casa num clube formador
const form = porArq('formador');
const jovem = ordenar(form).find((j) => st.idade(j, dia) <= 21) ?? ordenar(form)[5];
m.contratos.formadoClube[jovem] = form;
casos.push({ j: jovem, comp: eng[1], nota: 'jovem da casa, clube formador' });
// c) clube-vendedor
const vd = porArq('vendedor');
casos.push({ j: ordenar(vd)[0], comp: eng[2], nota: 'clube-vendedor' });
// d) ídolo de um clube tradicional
const tr = porArq('tradicional');
const idolo = ordenar(tr)[1];
m.contratos.chegada[idolo] = dia - 7 * 365;
casos.push({ j: idolo, comp: eng[4], nota: 'ídolo de um clube tradicional' });
// e) rival, com contrato a acabar
const rivA = w.clubes.findIndex((c, i) => !usados.has(i) && w.liga[i] >= 0 && c.rivais.length > 0 && w.ligas[w.liga[i]].regras.nivel === 1 && e.clubes.saude[i] === 0);
const rivB = w.idx(w.clubes[rivA].rivais[0]);
const ult = ordenar(rivA)[4];
st.fimContrato[ult] = dia + 200;
casos.push({ j: ult, comp: rivB, nota: 'rival, contrato a acabar em < 1 ano' });
for (const x of casos) {
  const pp = precoPedido(w, m, x.j, x.comp, dia, 1);
  p(`| ${st.nomes[x.j]} (${idade(x.j)}, OVR ${st.ovrNat(x.j)}) — ${x.nota} | ${w.clubes[st.clube[x.j]].nome} (${NOME_ARQUETIPO[e.ia.arquetipo[st.clube[x.j]]]}) | ${w.clubes[x.comp].nome} | ${M(pp.valor)} | ${Object.entries(pp.factores).filter(([, v]) => Math.abs(v - 1) > 0.001).map(([k, v]) => `${k} ×${v.toFixed(2)}`).join(', ') || '—'} | ${M(pp.preco)} | ${(pp.preco / pp.valor).toFixed(2)} |`);
}
p('');

// 3. Cláusula de rescisão activada (clube formador numa liga mais fraca, jovem de potencial enorme).
p('## 3. Cláusula de rescisão activada', '');
const fracos = [...Array(w.clubes.length).keys()].filter((c) => w.liga[c] >= 0 && e.ia.arquetipo[c] === 'formador' && w.ligas[w.liga[c]].regras.forca_desportiva < 70 && m.plantel(c).length > 15);
const cf = fracos[0];
const talento = ordenar(cf).filter((j) => st.idade(j, dia) <= 21).sort((a, b) => st.pot[b] - st.pot[a])[0] ?? ordenar(cf)[0];
st.pot[talento] = Math.max(st.pot[talento], 88);
if (!m.contratos.clausula[talento]) { m.contratos.clausula[talento] = 0; m.talvezClausula(talento, cf, dia, Rng.de(9)); }
if (!m.contratos.clausula[talento]) m.contratos.clausula[talento] = Math.round(valorMercado(w, talento, dia, e.inflacao) * 3);
const clau = m.contratos.clausula[talento];
const pc = precoPedido(w, m, talento, eng[0], dia, 1);
p(`${desc(talento)}, no ${w.clubes[cf].nome} (${w.ligas[w.liga[cf]].regras.nome}, ${NOME_ARQUETIPO[e.ia.arquetipo[cf]]}). Valor ${M(pc.valor)}; preço pedido ${M(pc.preco)}; cláusula de rescisão ${M(clau)} (${(clau / pc.valor).toFixed(1)}× o valor).`, '');
e.clubes.caixa[eng[0]] = Math.max(e.clubes.caixa[eng[0]], clau * 2);
const nc = m.abrir('clausula', talento, eng[0], dia + 2, clau, clau, rng)!;
for (let k = 0; k < 6 && nc.estado !== 'concluido' && nc.estado !== 'falhou'; k++) { m.ronda(nc, rng); nc.dia += 1; }
p(...relato(nc), '');

// 4. Benchmark: janela de Verão de 2026 (8 semanas) e uma semana fora da janela.
const w2 = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente: 2026, modo: 'teste' });
const sim = new Simulador(w2);
const sem: { d: string; ms: number; janela: boolean }[] = [];
for (let k = 0; k < 20; k++) {
  const d = sim.segunda;
  const t = performance.now(); sim.simularSemana();
  sem.push({ d: data(d), ms: performance.now() - t, janela: w2.mercado!.janelaAberta(w2.ligaPorId('ENG1').clubes[0], d + 3) });
}
const jan = sem.filter((x) => x.janela).map((x) => x.ms), fora = sem.filter((x) => !x.janela).map((x) => x.ms);
const med = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
p('## 4. Benchmark (Node; tablet × 3 a 6)', '', '| Medida | Valor | Alvo |', '|---|---|---|');
p(`| Semanas de janela (média / máx.) | ${med(jan).toFixed(0)} / ${Math.max(...jan).toFixed(0)} ms → tablet pior ${(Math.max(...jan) * 6 / 1000).toFixed(2)} s | < 5 s |`);
p(`| Semanas fora da janela (média / máx.) | ${med(fora).toFixed(0)} / ${Math.max(...fora).toFixed(0)} ms → tablet pior ${(Math.max(...fora) * 6 / 1000).toFixed(2)} s | < 2 s |`);
const es = w2.mercado!.estat;
p(`| Negócios na janela de Verão de 2026 | ${es.transferencias} transferências, ${es.emprestimos} empréstimos, ${es.livres} livres, ${es.clausulas} cláusulas, ${es.preContratos} pré-contratos, ${es.renovacoes} renovações; ${es.falhados} falhados (${es.faltaTempo} por falta de tempo) | — |`);
p(`| Memória do mercado (contratos, parcelas, livres) | ${(w2.mercado!.bytes() / 1024).toFixed(0)} KB | — |`);
writeFileSync(new URL('../docs/relatorios/fase4_paragemA_mercado.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
