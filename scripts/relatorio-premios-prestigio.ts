// Prompt 8, Bloco C (PARAGEM C): o selo dos prémios na carreira. O vencedor da Bola de Ouro de 2027 no mundo de teste,
// antes e depois (preço pedido, salário, quem o conhece e quem o procura), o efeito nas receitas comerciais do clube e o
// Verão seguinte com e sem prestígio (o mesmo mundo, a mesma semente). Uso: npx tsx scripts/relatorio-premios-prestigio.ts
// → docs/relatorios/premios_blocoC_prestigio.md
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, type World } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { precoPedido, valorMercado } from '../src/mercado/valor.ts';
import { salarioPedido } from '../src/mercado/decisaoJogador.ts';
import { CONHECIMENTO } from '../src/config/scouting.ts';
import { PRESTIGIO as PR } from '../src/config/premios.ts';
import { Prestigio, type Selo } from '../src/premios/prestigio.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';

const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const iso = (d: number) => new Date(d * 864e5).toISOString().slice(0, 10);
const M = (x: number) => `${(x / 1e6).toFixed(1)} M€`;

/** Simula até aos prémios de 2027 (e, com `comPrestigio` falso, apaga os selos e não regista mais nenhum). */
function correr(comPrestigio: boolean) {
  const w = construirMundo(dados, { semente: 2026, modo: 'teste' });
  if (!comPrestigio) w.prestigio!.registar = () => {};
  const sim = new Simulador(w, true);
  while (!w.historico!.premiosJogo.length) sim.simularSemana();
  return { w, sim };
}
const A = correr(true), B = correr(false);
const w = A.w, st = w.jogadores!, m = w.mercado!, p = w.prestigio!;
const vencedores = (['melhor_do_mundo', 'golden_boy'] as const).map((k) => w.historico!.premiosJogo.find((x) => x.premio === k)!.idx!);
const dia = A.sim.segunda;
const L: string[] = [];
const out = (...s: string[]) => L.push(...s);
const nomeP: Record<string, string> = { melhor_do_mundo: 'Bola de Ouro', golden_boy: 'Golden Boy' };
out('# Prompt 8, Bloco C — o selo dos prémios na carreira (PARAGEM C)', '', '> Mundo de teste, semente 2026, prémios de 2027. Gerado por `npx tsx scripts/relatorio-premios-prestigio.ts`.', '');

// 1. Antes e depois, no mesmo dia (a semana dos prémios): com os selos tirados por um momento.
vencedores.forEach((j, iv) => {
  const compradores = w.clubes.map((_, c) => c).filter((c) => c !== st.clube[j] && w.liga[c] >= 0).sort((a, b) => w.reputacao[b] - w.reputacao[a]).slice(0, 5);
  const foto = () => ({
    valor: valorMercado(w, j, dia, w.economia!.inflacao),
    precos: compradores.map((c) => precoPedido(w, m, j, c, dia).preco),
    marca: precoPedido(w, m, j, compradores[0], dia).factores.marca ?? 1,
    salario: salarioPedido(w, j, m.salarioMercado(j, compradores[0], dia), dia),
    conhecem: w.clubes.filter((_, c) => c !== st.clube[j] && m.scouting.nivel(c, j, dia) >= CONHECIMENTO.minimo_alvo).length,
    prestigio: p.valor(j, dia),
  });
  const guardados = p.selos.get(j)!;
  p.selos.delete(j);
  const antes = foto();
  p.selos.set(j, guardados);
  const depois = foto();
  out(`## 1.${iv + 1} ${nomeP[iv ? 'golden_boy' : 'melhor_do_mundo']}: ${st.nomes[j]} (${w.clubes[st.clube[j]].nome}), antes e depois`, '',
    `${Math.floor(st.idade(j, dia))} anos, OVR ${st.ovrNat(j)}, POT ${st.pot[j]}, contrato até ${iso(st.fimContrato[j])}, salário actual ${M(st.salario[j])}/ano. O mesmo dia, sem e com o selo.`, '',
    '| | Antes | Depois |', '|---|---|---|',
    `| Prestígio (0–100) | ${antes.prestigio.toFixed(0)} | ${depois.prestigio.toFixed(0)} |`,
    `| Valor de mercado | ${M(antes.valor)} | ${M(depois.valor)} (não muda) |`,
    `| Factor de marca no preço | ${antes.marca.toFixed(3)} | ${depois.marca.toFixed(3)} |`,
    ...compradores.map((c, i) => `| Preço pedido a ${w.clubes[c].nome} | ${M(antes.precos[i])} | ${M(depois.precos[i])} (+${((depois.precos[i] / antes.precos[i] - 1) * 100).toFixed(1)}%; razão preço/valor ${(depois.precos[i] / depois.valor).toFixed(2)}) |`),
    `| Pedido salarial (a ${w.clubes[compradores[0]].nome}) | ${M(antes.salario)}/ano | ${M(depois.salario)}/ano (+${((depois.salario / antes.salario - 1) * 100).toFixed(1)}%) |`,
    `| Clubes que o conhecem o bastante para o seguir (conhecimento ≥ ${CONHECIMENTO.minimo_alvo}) | ${antes.conhecem} | ${depois.conhecem} |`, '');
});

// 2. Selos atribuídos e o seu decaimento.
const selos = [...p.selos.entries()];
out('## 2. Selos de 2027 e decaimento', '', `${selos.length} jogadores com selos (${selos.reduce((a, [, xs]) => a + xs.length, 0)} selos; ${p.bytes()} bytes).`, '',
  '| Jogador | Selos | Prestígio na cerimónia | +1 ano | +2 anos | +3 anos | Marca (preço) | Salário |', '|---|---|---|---|---|---|---|---|');
const fmt = (xs: Selo[]) => xs.map((x) => `${x.premio} ${x.lugar}`).join(', ');
const d0 = Prestigio.dia(2027);
for (const [k, xs] of selos.sort((a, b) => p.valor(b[0], d0) - p.valor(a[0], d0)).slice(0, 8))
  out(`| ${st.nomes[k]} | ${fmt(xs)} | ${p.valor(k, d0).toFixed(0)} | ${p.valor(k, d0 + 365).toFixed(0)} | ${p.valor(k, d0 + 730).toFixed(0)} | ${p.valor(k, d0 + 1096).toFixed(0)} | +${((p.marca(k, d0) - 1) * 100).toFixed(1)}% | +${((p.salario(k, d0) - 1) * 100).toFixed(1)}% |`);
out('');

// 3. Receitas comerciais do clube.
const com = p.comercial(dia), e = w.economia!;
out('## 3. Receitas comerciais (patrocínio) dos clubes com premiados', '', '| Clube | Patrocínio anual | Aumento | € por ano |', '|---|---|---|---|');
for (const [c, x] of [...com.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) out(`| ${w.clubes[c].nome} | ${M(e.clubes.patrocinio[c])} | +${(x * 100).toFixed(2)}% | ${M(e.clubes.patrocinio[c] * x)} |`);
out('', `Tecto: +${PR.comercial.tecto * 100}% do patrocínio. Sem efeito desportivo nem na reputação do clube.`, '');

// 4. O Verão seguinte, com e sem prestígio (mesmo mundo e semente): quem o procura.
const verao = (x: { w: World; sim: Simulador }) => {
  const mm = x.w.mercado!, procura = vencedores.map(() => new Set<number>()), maior = vencedores.map(() => 0);
  while (iso(x.sim.segunda) < '2027-09-02') {
    x.sim.simularSemana();
    for (const n of mm.negocios) { const i = vencedores.indexOf(n.jogador); if (i >= 0 && n.comprador >= 0) { procura[i].add(n.comprador); maior[i] = Math.max(maior[i], n.oferta); } }
  }
  return vencedores.map((j, i) => ({ procura: [...procura[i]].map((c) => x.w.clubes[c].nome), maior: maior[i], mov: mm.registo.filter((r) => r.jogador === j && r.dia >= dia).map((r) => `${iso(r.dia)} ${r.tipo} → ${x.w.clubes[r.para]?.nome ?? '—'} por ${M(r.fee)}`), sal: x.w.jogadores!.salario[j], clube: x.w.clubes[x.w.jogadores!.clube[j]]?.nome ?? '—' }));
};
const va = verao(A), vb = verao(B);
out('## 4. O Verão de 2027 (até 1 de Setembro), sem e com prestígio (o mesmo mundo e a mesma semente)', '');
vencedores.forEach((j, i) => out(`**${st.nomes[j]}**`, '', '| | Sem prestígio | Com prestígio |', '|---|---|---|',
  `| Clubes que abriram negociação | ${vb[i].procura.length} (${vb[i].procura.join(', ') || '—'}) | ${va[i].procura.length} (${va[i].procura.join(', ') || '—'}) |`,
  `| Maior oferta | ${M(vb[i].maior)} | ${M(va[i].maior)} |`,
  `| Movimentos | ${vb[i].mov.join('; ') || 'fica'} | ${va[i].mov.join('; ') || 'fica'} |`,
  `| Clube e salário a 1 de Setembro | ${vb[i].clube}, ${M(vb[i].sal)}/ano | ${va[i].clube}, ${M(va[i].sal)}/ano |`, ''));
out('## 5. Hall of Fame e legado', '', ...p.hallOfFame().map((h) => `- ${h.nome}: ${Object.entries(h.contagem).map(([k, c]) => `${k} ${c.vencedor}× vencedor`).filter((s) => !s.includes(' 0×')).join(', ')}; reputação de entrada como treinador/staff: ${p.reputacaoLegado(h.idx)}`), '');
writeFileSync(new URL('../docs/relatorios/premios_blocoC_prestigio.md', import.meta.url), L.join('\n') + '\n');
console.log(L.join('\n'));
