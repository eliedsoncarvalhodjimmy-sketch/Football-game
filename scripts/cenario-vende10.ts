// Prompt 6, Bloco B: cenário forçado. Um clube de Inglaterra vende os 10 melhores no início da janela de Verão;
// mostra as necessidades do plano e as entradas da janela. Uso: npx tsx scripts/cenario-vende10.ts
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente: 2026, modo: 'teste' });
const sim = new Simulador(w, true); const m = w.mercado!, st = w.jogadores!, e = w.economia!;
const t0 = sim.temporadas.values().next().value!; const dia = t0.base + t0.semana * 7;
const eng = w.ligaPorId('ENG1').clubes; const c = [...eng].sort((a, b) => w.reputacao[b] - w.reputacao[a])[8];
const comp = w.ligaPorId('ESP1').clubes;
const vend = m.plantel(c).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 10);
let receita = 0;
vend.forEach((j, i) => { const d = comp[i % comp.length]; const v = 20e6; receita += v; (m as any).mover(j, c, d, dia); e.clubes.lancar?.(c, 'transferencias', -v); });
e.clubes.caixa[c] += receita; (m as any).vendasJanela.set(c, ((m as any).vendasJanela.get(c) ?? 0) + receita);
m.planos.invalidar(c);
const p = m.planos.obter(c, dia);
console.log(`${w.clubes[c].nome} vendeu 10 (${vend.map((j) => POSICOES[st.posNat[j]]).join(' ')}); plantel ${m.plantel(c).length}; necessidades ${p.necessidades.length}: ${p.necessidades.map((n) => n.pos + ':' + n.motivo).join(', ')}`);
const vistos = new Set<number>(); const entradas: string[] = [];
for (let s = 0; s < 10; s++) { sim.simularSemana(); for (const n of m.concluidos) { if (vistos.has(n.id)) continue; vistos.add(n.id); if (n.estado === 'concluido' && n.comprador === c && n.tipo !== 'pre_contrato') entradas.push(`${new Date(n.dia * 864e5).toISOString().slice(5, 10)} ${POSICOES[st.posNat[n.jogador]]} ${st.ovrNat(n.jogador)} (${n.tipo})`); } }
const p2 = m.planos.obter(c, dia + 70);
console.log(`entradas ${entradas.length}: ${entradas.join('; ')}\nplantel no fim ${m.plantel(c).length}; necessidades no fim: ${p2.necessidades.map((n) => n.pos + ':' + n.motivo).join(', ') || 'nenhuma'}`);
