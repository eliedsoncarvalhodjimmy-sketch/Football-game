// Prompt 6, Bloco A: auditoria dos direitos futuros (venda futura e recompra) numa simulação sem interface de várias
// épocas com o mundo completo. Liga a verificação das invariantes em cada negócio e escreve o relatório.
// Uso: npx tsx scripts/auditar-direitos.ts [--seasons 3] [--seed 2026]
import { writeFileSync, mkdirSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { args, RAIZ_PACKS } from '../src/cli/args.ts';

const a = args();
const N = Number(a.seasons ?? 3), semente = Number(a.seed ?? 2026);
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
const sim = new Simulador(w, true);
const m = w.mercado!;
m.direitos.verificar = true;
const semanas: number[] = [];
let vendasComDireitos = 0, maxBeneficiarios = 0;
const exemplos: string[] = [];
const t0 = performance.now();
for (let e = 0; e < N; e++) for (let s = 0; s < 52; s++) {
  const antes = m.concluidos.length;
  const ts = performance.now();
  sim.simularSemana();
  semanas.push(performance.now() - ts);
  for (const n of m.concluidos.slice(antes)) {
    const pagos = n.rondas.filter((r) => r.texto.includes('de venda futura) para o'));
    if (pagos.length) { vendasComDireitos++; maxBeneficiarios = Math.max(maxBeneficiarios, pagos.length); if (exemplos.length < 4 || pagos.length > 1 && exemplos.length < 6) exemplos.push(n.rondas.map((r) => `- ${r.texto}`).join('\n')); }
  }
}
const seg = (performance.now() - t0) / 1000;
// Contagens da simulação (antes dos exemplos, que também passam pela auditoria).
const porEpoca = structuredClone(m.direitos.porEpoca), porLiga = structuredClone(m.direitos.porLiga);
const activos = [...m.direitos.porJogador.values()].flat();

// Fluxos de exemplo (no fim da simulação, no mesmo mundo): o caso do Real Madrid, dois beneficiários no limite de 50%
// e uma recompra com notificação ao titular.
import { Rng } from '../src/core/rng.ts';
import type { Negocio } from '../src/mercado/mercado.ts';
const dia1 = w.epoca ? sim.temporadas.values().next().value!.base : 0;
const clube = (liga: string, k: number) => [...w.ligaPorId(liga).clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x])[k];
const st = w.jogadores!;
const jovem = (c: number, d: number) => m.plantel(c).filter((j) => st.posNat[j] !== 0).sort((x, y) => st.idade(x, d) - st.idade(y, d) || st.ovrNat(y) - st.ovrNat(x))[0];
const VISTA = { parcelas: 'vista', vendaFutura: 0, troca: null, premio: 0, agente: 0, anos: 3, clausula: 0, bonus: null };
let seq = 9e6;
const vender = (j: number, de: number, para: number, preco: number, d: number, vf = 0) => {
  const n: Negocio = { id: ++seq, tipo: 'transferencia', jogador: j, vendedor: de, comprador: para, estado: 'registo', oferta: preco, pedido: preco, maximo: preco, salario: st.salario[j], estatuto: 'rotacao', dia: d, inicio: d, rondas: [], util: { ...VISTA, vendaFutura: vf } };
  m.concluir(n, Rng.de(1, 'exemplo', n.id));
  return n;
};
const fluxos: string[] = [];
{
  const real = clube('ESP1', 0), medio = clube('ITA1', 12), grande = clube('ENG1', 0), outro = clube('GER1', 3);
  const j = jovem(real, dia1);
  const a1 = vender(j, real, medio, 10e6, dia1, 20), a2 = vender(j, medio, grande, 50e6, dia1 + 3 * 365), a3 = vender(j, grande, outro, 60e6, dia1 + 4 * 365);
  fluxos.push(`### Real Madrid (${w.clubes[real].nome}): jovem vendido por 10 M€ com 20% de venda futura\n\n**Venda 1** (${w.clubes[real].nome} → ${w.clubes[medio].nome}, 10 M€):\n${a1.rondas.map((r) => `- ${r.texto}`).join('\n')}\n\n**Venda 2, 3 anos depois** (${w.clubes[medio].nome} → ${w.clubes[grande].nome}, 50 M€):\n${a2.rondas.map((r) => `- ${r.texto}`).join('\n')}\n\n**Venda 3** (${w.clubes[grande].nome} → ${w.clubes[outro].nome}, 60 M€): sem pagamento ao ${w.clubes[real].nome}.\n${a3.rondas.map((r) => `- ${r.texto}`).join('\n')}`);
}
{
  const a = clube('POR1', 0), b = clube('POR1', 1), c = clube('POR1', 2), comp = clube('ENG1', 2), vend = clube('POR1', 5);
  const j = jovem(vend, dia1);
  const d1 = m.direitos.criar(j, 'venda_futura', a, 0.3, dia1, 1e6, 5), d2 = m.direitos.criar(j, 'venda_futura', b, 0.25, dia1, 1e6, 5), d3 = m.direitos.criar(j, 'venda_futura', c, 0.15, dia1, 1e6, 5);
  const n = vender(j, vend, comp, 20e6, dia1 + 100);
  fluxos.push(`### Dois beneficiários no limite de 50%\n\n- ${w.clubes[a].nome} pede 30% → fica com ${Math.round(100 * d1!.pct)}%\n- ${w.clubes[b].nome} pede 25% → cortado para ${Math.round(100 * d2!.pct)}% (o que sobra dos 50%)\n- ${w.clubes[c].nome} pede 15% → ${d3 ? 'criado' : 'não nasce (limite atingido)'}\n\n**Venda** (${w.clubes[vend].nome} → ${w.clubes[comp].nome}, 20 M€):\n${n.rondas.map((r) => `- ${r.texto}`).join('\n')}`);
}
{
  let d = dia1; while (!m.janelaAberta(clube('ENG1', 0), d) && d < dia1 + 400) d++;
  const titular = clube('ENG1', 19), vend = clube('ENG1', 2), comp = clube('ESP1', 1);
  const j = [...m.plantel(vend)].filter((x) => st.posNat[x] !== 0 && !m.podeInscrever(x, titular)).sort((x, y) => st.ovrNat(y) - st.ovrNat(x))[0];
  w.economia!.clubes.caixa[titular] = Math.max(w.economia!.clubes.caixa[titular], 1e9);
  m.direitos.criar(j, 'recompra', titular, 30e6, d - 300, 20e6, 2);
  const n: Negocio = { id: ++seq, tipo: 'transferencia', jogador: j, vendedor: vend, comprador: comp, estado: 'oferta', oferta: 9e7, pedido: 0, maximo: 9e7, salario: 0, estatuto: 'rotacao', dia: d, inicio: d, rondas: [{ dia: d, texto: `${w.clubes[comp].nome} oferece 90 M€ por ${st.nomes[j]}` }], contra: 1 };
  m.negocios.push(n);
  const r = Rng.de(3, 'recompra-exemplo');
  m.ronda(n, r); m.ronda(n, r);
  const rc = m.negocios.find((x) => x.deRecompra && x.jogador === j);
  for (let k = 0; rc && k < 6 && rc.estado !== 'concluido' && rc.estado !== 'falhou'; k++) m.ronda(rc, r);
  fluxos.push(`### Recompra com notificação ao titular\n\nO ${w.clubes[titular].nome} tem a recompra de ${st.nomes[j]} por 30 M€ (preço fixo, 1,5 × os 20 M€ que pagou).\n\n**Oferta do ${w.clubes[comp].nome}:**\n${n.rondas.map((x) => `- ${x.texto}`).join('\n')}\n\n**Recompra:**\n${(rc?.rondas ?? []).map((x) => `- ${x.texto}`).join('\n')}`);
}
const media = semanas.reduce((x, y) => x + y, 0) / semanas.length, max = Math.max(...semanas);
const linhas = (mp: Map<string, { criados: number; pagos: number; caducados: number; recomprasExercidas: number; recomprasRecusadas: number; euros: number }>, rot: string, top = 99) =>
  `| ${rot} | Criados | Pagos | Caducados | Recompras exercidas | Recompras recusadas | € pagos |\n|---|---|---|---|---|---|---|\n` +
  [...mp.entries()].sort((x, y) => y[1].criados - x[1].criados).slice(0, top).map(([k, c]) => `| ${k} | ${c.criados} | ${c.pagos} | ${c.caducados} | ${c.recomprasExercidas} | ${c.recomprasRecusadas} | ${(c.euros / 1e6).toFixed(1)} M€ |`).join('\n');
const rel = `# Prompt 6, Bloco A — auditoria dos direitos futuros

${N} épocas, semente ${semente}, mundo completo (${w.clubes.length} clubes), verificação das invariantes ligada em cada negócio.
Gerado por \`npx tsx scripts/auditar-direitos.ts --seasons ${N} --seed ${semente}\`.

## Invariantes

- Erros encontrados: **${m.direitos.erros.length}** (simulação e exemplos)${m.direitos.erros.length ? `\n${m.direitos.erros.slice(0, 20).map((x) => `  - ${x}`).join('\n')}` : ''}
- Verificado em cada negócio com preço: preço = vendedor + beneficiários; cada direito pago uma só vez (ou caducado);
  nenhum titular inexistente; soma das % activas por jogador ≤ 50%; quem recebeu nunca volta a receber pelo mesmo jogador.
- Vendas que pagaram venda futura: ${vendasComDireitos} (máximo de beneficiários numa venda: ${maxBeneficiarios}).
- Direitos activos no fim: ${activos.length} (${activos.filter((d) => d.tipo === 'venda_futura').length} de venda futura, ${activos.filter((d) => d.tipo === 'recompra').length} de recompra).

## Por época

${linhas(porEpoca, 'Época')}

## Por liga do titular (as 15 com mais direitos)

${linhas(porLiga, 'Liga', 15)}

## Fluxos dos exemplos do utilizador

${fluxos.join('\n\n')}

## Exemplos de negócios da simulação

${exemplos.map((x, i) => `### ${i + 1}\n${x}`).join('\n\n')}

## Desempenho

${N} épocas em ${seg.toFixed(1)} s; semana média ${media.toFixed(0)} ms (máx. ${max.toFixed(0)} ms).
`;
mkdirSync('docs/relatorios', { recursive: true });
writeFileSync('docs/relatorios/prompt6_blocoA_direitos.md', rel);
console.log(rel.split('## Exemplos')[0]);
console.log(`semana média ${media.toFixed(0)} ms, máx ${max.toFixed(0)} ms`);
