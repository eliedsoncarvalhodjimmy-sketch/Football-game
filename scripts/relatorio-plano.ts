// Prompt 6, Bloco B: relatório do plano de plantel. O plano de 6 clubes de perfis diferentes no início da janela de
// Verão e a janela inteira de um deles explicada por necessidade (compras, vendas, empréstimos, rescisões, pedidos do
// treinador). Uso: npx tsx scripts/relatorio-plano.ts [--seed 2026] → docs/relatorios/prompt6_blocoB_plano.md (secções 1–2)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { args, RAIZ_PACKS } from '../src/cli/args.ts';

const a = args();
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente: Number(a.seed ?? 2026), modo: 'teste' });
const sim = new Simulador(w, true);
const m = w.mercado!, st = w.jogadores!, e = w.economia!;
const t0 = sim.temporadas.values().next().value!;
const dia0 = t0.base + t0.semana * 7;
const nomeJ = (j: number) => `${st.nomes[j]} (${POSICOES[st.posNat[j]]}, ${Math.floor(st.idade(j, dia0))} anos, ${st.ovrNat(j)})`;
// Seis perfis: o maior clube de Inglaterra, um formador, um clube pequeno numa liga forte, treinadores de Catenaccio e
// de Tiki-Taka, e um "magnata" / comprador de estrelas.
const nasLigas = (ids: string[]) => ids.flatMap((id) => w.ligaPorId(id).clubes);
const top = nasLigas(['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1', 'POR1', 'NED1', 'BRA1']);
const porRep = [...top].sort((x, y) => w.reputacao[y] - w.reputacao[x]);
const arq = (c: number) => e.ia?.arquetipo[c];
const estilo = (c: number) => w.motor!.treinadores[c]?.perfil;
const usados = new Set<number>();
const unico = (cs: (number | undefined)[]) => { const c = cs.find((x) => x !== undefined && !usados.has(x)); if (c !== undefined) usados.add(c); return c; };
const escolhidos: [string, number | undefined][] = [
  ['Grande (o maior de Inglaterra)', unico([...w.ligaPorId('ENG1').clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x]))],
  ['Formador', unico(porRep.filter((c) => arq(c) === 'formador'))],
  ['Pequeno numa liga forte', unico([...w.ligaPorId('ESP1').clubes].sort((x, y) => w.reputacao[x] - w.reputacao[y]))],
  ['Treinador de Catenaccio', unico(porRep.filter((c) => estilo(c) === 'catenaccio'))],
  ['Treinador de Tiki-Taka', unico(porRep.filter((c) => estilo(c) === 'tiki_taka'))],
  ['Comprador de estrelas / magnata', unico(porRep.filter((c) => arq(c) === 'comprador_estrelas' || arq(c) === 'magnata_impaciente'))],
];
const NOME_ESTILO: Record<string, string> = { tiki_taka: 'Tiki-Taka', gegenpressen: 'Gegenpressen', contra_ataque: 'Contra-ataque', catenaccio: 'Catenaccio', jogo_direto: 'Jogo Directo', pelas_alas: 'Pelas Alas', futebol_total: 'Futebol Total', bloco_medio_baixo: 'Bloco Médio-Baixo' };
const secPlano = (rot: string, c: number) => {
  const p = m.planos.calcular(c, dia0), t = w.motor!.treinadores[c];
  const pd = t.pedidos;
  return `### ${rot}: ${w.clubes[c].nome} (${w.ligas[w.liga[c]].regras.id}, reputação ${w.reputacao[c]}, arquétipo ${arq(c)})

- Treinador ${t.nome}: ${NOME_ESTILO[p.estilo] ?? p.estilo}, ${p.formacao}; pedidos: ${pd ? `${pd.reforcos} reforço(s), autonomia ${Math.round(100 * pd.autonomia)}%` : '—'}; moral ${t.moral ?? '—'}.
- Plantel ${m.plantel(c).length}; nível dos titulares no sistema ${p.nivel.toFixed(1)}.
- **Necessidades** (${p.necessidades.length} aceites de ${p.todas.length}):
${p.necessidades.map((n) => `  - ${n.pos} — ${n.motivo}${n.pedido ? ' (pedido do treinador)' : ''}: ${n.texto}; urgência ${n.urgencia.toFixed(2)}; nível mínimo ${n.nivelMin}; idade ${n.idade[0]}–${n.idade[1]}`).join('\n') || '  - nenhuma'}
- **Excedentes** (${p.excedentes.length}): ${p.excedentes.slice(0, 8).map((x) => `${nomeJ(x.j)} — ${x.motivo}`).join('; ') || 'nenhum'}${p.excedentes.length > 8 ? '; …' : ''}
- **A emprestar** (jovens sem lugar): ${p.emprestar.map(nomeJ).join('; ') || 'nenhum'}
- **Insubstituíveis**: ${[...p.insubstituiveis].map(nomeJ).join('; ') || 'nenhum'}
`;
};
const planos = escolhidos.filter(([, c]) => c !== undefined).map(([r, c]) => secPlano(r, c!));
// A janela de Verão dos seis clubes; no relatório, a do clube com mais negócios, explicada pelo plano.
const seis = escolhidos.map(([, c]) => c).filter((c): c is number => c !== undefined);
const ini = new Map(seis.map((c) => { const p = m.planos.calcular(c, dia0); return [c, { nec: p.necessidades.map((n) => ({ ...n })), exc: new Map(p.excedentes.map((x) => [x.j, x.motivo])), emp: new Set(p.emprestar), moral: w.motor!.treinadores[c].moral }]; }));
const linhasDe = new Map<number, string[]>(seis.map((c) => [c, []]));
const fecho = new Map<number, { moral: number; pedidos: string[]; feitos: string[] }>();
const vistos = new Set<number>();
for (let s = 0; s < 12; s++) {
  const tt = sim.temporadas.values().next().value!, dd = tt.base + tt.semana * 7;
  // Na semana do fecho mensal de Setembro (dia 8): a moral e os pedidos tal como estavam.
  if ([0, 1, 2, 3, 4, 5, 6].some((k) => { const x = new Date((dd + k) * 864e5); return x.getUTCMonth() === 8 && x.getUTCDate() === 8; }))
    for (const c of seis) fecho.set(c, { moral: w.motor!.treinadores[c].moral ?? 70, pedidos: (m.planos.porClube.get(c)?.necessidades ?? []).filter((n) => n.pedido).map((n) => n.pos), feitos: m.reforcosJanela.get(c) ?? [] });
  sim.simularSemana();
  for (const n of m.concluidos) {
    if (vistos.has(n.id)) continue;
    vistos.add(n.id);
    if (n.estado !== 'concluido') continue;
    for (const c of seis) {
      if (n.comprador !== c && n.vendedor !== c) continue;
      const I = ini.get(c)!, d = new Date(n.dia * 864e5).toISOString().slice(0, 10), j = n.jogador;
      const preco = n.oferta ? `, ${(n.oferta / 1e6).toFixed(1)} M€` : '';
      if (n.comprador === c) {
        const nec = I.nec.find((x) => POSICOES[st.posNat[j]] === x.pos);
        linhasDe.get(c)!.push(`- ${d} — **entra** ${nomeJ(j)} (${n.tipo}${preco}) → ${nec ? `necessidade ${nec.pos} (${nec.motivo}${nec.pedido ? ', pedido do treinador' : ''}: ${nec.texto})` : 'necessidade surgida durante a janela (plano recalculado)'}`);
      } else linhasDe.get(c)!.push(`- ${d} — **sai** ${nomeJ(j)} (${n.tipo}${preco}) → ${I.exc.has(j) ? `excedente: ${I.exc.get(j)}` : I.emp.has(j) ? 'jovem sem lugar no plano: emprestado' : n.tipo === 'clausula' ? 'cláusula de rescisão paga' : 'oferta aceite (não era insubstituível)'}`);
    }
  }
}
const alvo = [...seis].sort((x, y) => linhasDe.get(y)!.length - linhasDe.get(x)!.length)[0];
const I = ini.get(alvo)!, F = fecho.get(alvo);
const linhas = linhasDe.get(alvo)!;
const necIni = I.nec, excIni = I.exc, moral0 = I.moral;
const moralAntesFecho = F?.moral ?? moral0, pedidosNoFecho = F?.pedidos ?? [], feitosNoFecho = F?.feitos ?? [];
const resc = m.estat.rescisoes;
const janela = `## 2. A janela de Verão de ${w.clubes[alvo].nome}, explicada pelo plano

Necessidades no início: ${necIni.map((n) => `${n.pos} (${n.motivo})`).join(', ') || 'nenhuma'}. Excedentes no início: ${excIni.size}.

${linhas.join('\n') || '- (sem negócios)'}

Pedidos do treinador no fecho da janela: ${pedidosNoFecho.map((p) => `${p} ${feitosNoFecho.includes(p) ? '(cumprido)' : '(por cumprir)'}`).join(', ') || 'nenhum'}.
Moral do treinador: ${moral0} no início; ${moralAntesFecho} antes do fecho (+2 por mês, a regra que já existia); ${w.motor!.treinadores[alvo].moral} depois (−${6} por pedido por cumprir).
Rescisões de excedentes no mundo nesta janela: ${resc}.
`;
const cab = `# Prompt 6, Bloco B — plano de plantel e IA por necessidade

Semente ${a.seed ?? 2026}, mundo completo. Gerado por \`npx tsx scripts/relatorio-plano.ts\` (secções 1–2) e
\`npx tsx scripts/comparar-mercado.ts\` (secção 3).

## 1. O plano de plantel de 6 clubes (início da janela de Verão de ${new Date(dia0 * 864e5).getUTCFullYear()})

${planos.join('\n')}
${janela}`;
const f = 'docs/relatorios/prompt6_blocoB_plano.md';
const resto = existsSync(f) ? readFileSync(f, 'utf8').split('## 3.')[1] : undefined;
writeFileSync(f, cab + (resto ? `\n## 3.${resto}` : ''));
console.log(cab);
