// Relatórios markdown da simulação de várias épocas (Paragem 3).
import type { World } from '../engine/world.ts';
import type { RegistoEpoca } from '../engine/history.ts';
import type { Estatisticas } from '../engine/season/temporada.ts';
import type { LinhaTabela } from '../engine/competitions/table.ts';
import { SIMULACAO } from '../config/simulacao.ts';

export interface DadosRelatorio {
  semente: number;
  epocas: number;
  w: World;
  historico: RegistoEpoca[];
  integridade: { epoca: number; problemas: string[] }[];
  vagas: { epoca: number; problemas: string[] }[];
  calendario: { epoca: number; problemas: string[]; jogos: number }[];
  semanasMs: number[];
  epocasMs: number[];
  calib10k: Estatisticas;
  favoritos: { epoca: number; liga: string; top1: number; top3: number[] }[];
  memoriaMB: number;
  saveKB: number[];
  pacotes: number;
  determinismo?: { mesma: boolean; outra: boolean; hash: number };
}

const NOMES_COMP: Record<string, string> = {
  uefa_cl: 'Liga dos Campeões', uefa_el: 'Liga Europa', uefa_ecl: 'Liga Conferência', libertadores: 'Libertadores', afc_cl: 'Liga dos Campeões Asiática',
};
const pct = (x: number, n: number) => (n ? ((100 * x) / n).toFixed(1) + '%' : '—');
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const ep = (e: number) => `${e}/${String(e + 1).slice(2)}`;
const ok = (b: boolean) => (b ? '✅' : '❌');

function nome(w: World, c: number, pais = false): string {
  const x = w.clubes[c];
  return pais ? `${x.nome} (${x.pais})` : x.nome;
}

function nomeLiga(w: World, id: string): string {
  const l = w.ligas.find((x) => x.regras.id === id);
  if (!l) return id;
  const p = w.pacotes.find((x) => x.manifest.id === l.pacote)!;
  return `${p.manifest.nome} — ${l.regras.nome}`;
}

function linhaEstat(e: Estatisticas): string[] {
  return [
    `${(e.golos / e.jogos).toFixed(2)}`, pct(e.casa, e.jogos), pct(e.empates, e.jogos), pct(e.fora, e.jogos),
    pct(e.zero, e.jogos), pct(e.cincoMais, e.jogos), pct(e.seteMais, e.jogos),
  ];
}

function somaEstat(hs: RegistoEpoca[]): Estatisticas {
  const e: Estatisticas = { jogos: 0, golos: 0, casa: 0, empates: 0, fora: 0, zero: 0, cincoMais: 0, seteMais: 0 };
  for (const r of hs) for (const k of Object.keys(e) as (keyof Estatisticas)[]) e[k] += r.estatLiga[k];
  return e;
}

/** Métricas de realismo estrutural, partilhadas com os testes. */
export function metricasRealismo(w: World, hist: RegistoEpoca[], favoritos: DadosRelatorio['favoritos']) {
  const ppgCamp: number[] = [];
  const ppgUlt: number[] = [];
  const porLiga = new Map<string, { camp: number[]; ult: number[]; jogos: number; campeoes: Set<number> }>();
  for (const r of hist) {
    for (const [id, t] of Object.entries(r.tabelas)) {
      const pj = t[0].pj;
      const x = porLiga.get(id) ?? { camp: [], ult: [], jogos: pj, campeoes: new Set<number>() };
      x.camp.push(t[0].pts);
      x.ult.push(t[t.length - 1].pts);
      x.campeoes.add(r.campeoes[id]);
      porLiga.set(id, x);
      ppgCamp.push(t[0].pts / pj);
      ppgUlt.push(t[t.length - 1].pts / pj);
    }
  }
  const distintos = [...porLiga.values()].map((x) => x.campeoes.size);
  let fav1 = 0, fav3 = 0, nFav = 0;
  for (const f of favoritos) {
    const r = hist.find((h) => h.epoca === f.epoca);
    if (!r) continue;
    nFav++;
    if (r.campeoes[f.liga] === f.top1) fav1++;
    if (f.top3.includes(r.campeoes[f.liga])) fav3++;
  }
  // Mobilidade.
  const subidas = hist.flatMap((r) => r.movimentos.filter((m) => m.via !== 'exterior' && m.para !== 'exterior' && m.de !== 'exterior' && nivel(w, m.para) < nivel(w, m.de)));
  const descidas = hist.flatMap((r) => r.movimentos.filter((m) => m.para !== 'exterior' && m.de !== 'exterior' && nivel(w, m.para) > nivel(w, m.de)));
  const saidas = hist.flatMap((r) => r.movimentos.filter((m) => m.para === 'exterior'));
  const entradas = hist.flatMap((r) => r.movimentos.filter((m) => m.de === 'exterior'));
  // Clubes que subiram e desceram logo a seguir ("ioiô").
  let ioio = 0, subidasComSeguinte = 0;
  for (let i = 0; i + 1 < hist.length; i++) {
    for (const m of hist[i].movimentos) {
      if (m.via === 'exterior' || m.de === 'exterior' || nivel(w, m.para) >= nivel(w, m.de)) continue;
      subidasComSeguinte++;
      if (hist[i + 1].movimentos.some((x) => x.clube === m.clube && x.de === m.para)) ioio++;
    }
  }
  const ganhos = new Map<number, number>();
  for (const m of subidas) ganhos.set(m.clube, (ganhos.get(m.clube) ?? 0) + 1);
  const duplaSubida = [...ganhos.values()].filter((v) => v >= 2).length;
  return { ppgCamp, ppgUlt, porLiga, distintos, fav1, fav3, nFav, subidas: subidas.length, descidas: descidas.length, saidas: saidas.length, entradas: entradas.length, ioio, subidasComSeguinte, duplaSubida };
}

function nivel(w: World, liga: string): number {
  return w.ligas.find((l) => l.regras.id === liga)?.regras.nivel ?? 99;
}

export function relatorioResumo(d: DadosRelatorio): string {
  const { w, historico: H } = d;
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  p(`# Simulação de ${d.epocas} épocas — semente ${d.semente}`);
  p();
  p(`> **DADOS DE TESTE.** Mundo fictício (${w.ligas.length} ligas, ${d.pacotes} pacotes). Épocas ${ep(H[0].epoca)} a ${ep(H[H.length - 1].epoca)}. Uma página por época em [epocas/](epocas/), com todas as classificações finais.`);
  p();

  // ---------- Testes ----------
  const mr = metricasRealismo(w, H, d.favoritos);
  const integ = d.integridade.reduce((s, x) => s + x.problemas.length, 0);
  const vagas = d.vagas.reduce((s, x) => s + x.problemas.length, 0);
  const cal = d.calendario.reduce((s, x) => s + x.problemas.length, 0);
  const totJogos = d.calendario.reduce((s, x) => s + x.jogos, 0);
  const c = d.calib10k;
  const e = somaEstat(H);
  const rC = (x: number, a: number, b: number) => x >= a && x <= b;
  const ppgCampOk = d.epocas ? pct(mr.ppgCamp.filter((x) => rC(x, 1.9, 2.85)).length, mr.ppgCamp.length) : '';
  const ppgUltOk = pct(mr.ppgUlt.filter((x) => rC(x, 0.25, 1.15)).length, mr.ppgUlt.length);
  const mediaDist = media(mr.distintos);
  const semMs = [...d.semanasMs].sort((a, b) => a - b);
  p('## 1. Testes da secção 11');
  p();
  p('| Teste | Resultado | Valor | Alvo |');
  p('|---|:---:|---|---|');
  p(`| Integridade: cada clube numa só divisão; nº de clubes por divisão igual todas as épocas | ${ok(integ === 0)} | ${integ} problemas em ${d.integridade.length} passagens de época | 0 |`);
  p(`| Vagas continentais preenchidas, sem duplicados, só países com direito | ${ok(vagas === 0)} | ${vagas} problemas em ${d.vagas.length} sorteios de vagas | 0 |`);
  p(`| Calendário: mesmo dia, > 2 jogos/semana, > 3 seguidos casa/fora (ligas), continentais a meio da semana | ${ok(cal === 0)} | ${cal} problemas em ${totJogos.toLocaleString('pt-PT')} jogos | 0 |`);
  const [g10, c10, e10, f10, z10, cinco10, sete10] = linhaEstat(c);
  const alvoOk = (x: Estatisticas) => rC(x.golos / x.jogos, 2.5, 2.7) && rC(x.casa / x.jogos, 0.43, 0.47) && rC(x.empates / x.jogos, 0.24, 0.28) && rC(x.fora / x.jogos, 0.27, 0.31) && rC(x.zero / x.jogos, 0.065, 0.085) && rC(x.cincoMais / x.jogos, 0.095, 0.125) && x.seteMais / x.jogos < 0.015;
  p(`| Calibração, primeiros 10.000 jogos de liga | ${ok(alvoOk(c))} | ${g10} golos; casa ${c10}, empate ${e10}, fora ${f10}; 0-0 ${z10}; 5+ ${cinco10}; 7+ ${sete10} | 2,6; 45/26/29; 7–8%; 10–12%; < 1,5% |`);
  const [gT, cT, eT, fT, zT, cincoT, seteT] = linhaEstat(e);
  p(`| Calibração, todos os jogos de liga (${e.jogos.toLocaleString('pt-PT')}) | ${ok(alvoOk(e))} | ${gT} golos; casa ${cT}, empate ${eT}, fora ${fT}; 0-0 ${zT}; 5+ ${cincoT}; 7+ ${seteT} | idem |`);
  p(`| Pontos do campeão (pontos por jogo) | ${ok(mr.ppgCamp.filter((x) => rC(x, 1.9, 2.85)).length / mr.ppgCamp.length >= 0.9)} | média ${media(mr.ppgCamp).toFixed(2)}; ${ppgCampOk} dentro da faixa | 1,9–2,85 por jogo (≈ 72–108 pts em 38 jogos) |`);
  p(`| Pontos do último (pontos por jogo) | ${ok(mr.ppgUlt.filter((x) => rC(x, 0.25, 1.15)).length / mr.ppgUlt.length >= 0.9)} | média ${media(mr.ppgUlt).toFixed(2)}; ${ppgUltOk} dentro da faixa | 0,25–1,15 por jogo (≈ 10–44 pts em 38 jogos) |`);
  const nUm = mr.distintos.filter((x) => x === 1).length;
  const nTodos = mr.distintos.filter((x) => x === d.epocas).length;
  p(`| Campeões diferentes por liga em ${d.epocas} épocas | ${ok(mediaDist >= 2.5 && mediaDist <= 7 && nUm <= mr.distintos.length * 0.1 && nTodos <= mr.distintos.length * 0.15)} | média ${mediaDist.toFixed(1)}; ${nUm} ligas com sempre o mesmo; ${nTodos} com sempre diferente | média 2,5–7; poucas nos extremos |`);
  p(`| Os mais fortes ganham mais, mas não sempre | ${ok(mr.fav1 / mr.nFav >= 0.2 && mr.fav1 / mr.nFav <= 0.7 && mr.fav3 / mr.nFav >= 0.5)} | favorito (maior reputação no início) campeão em ${pct(mr.fav1, mr.nFav)}; um dos 3 favoritos em ${pct(mr.fav3, mr.nFav)} | 20–70%; top 3 ≥ 50% |`);
  p(`| Mobilidade entre divisões | ${ok(mr.subidas > 0 && mr.ioio > 0 && mr.duplaSubida > 0)} | ${mr.subidas} subidas, ${mr.descidas} descidas, ${mr.saidas} saídas para o exterior, ${mr.entradas} entradas; ${pct(mr.ioio, mr.subidasComSeguinte)} dos que sobem descem logo; ${mr.duplaSubida} clubes subiram 2+ vezes | movimento em todos os sentidos |`);
  p(`| Determinismo (mesma semente → mesmos resultados; outra semente → diferentes) | ${ok(!!d.determinismo?.mesma && !!d.determinismo?.outra)} | impressão digital ${d.determinismo?.hash.toString(16)} | iguais / diferentes |`);
  p();
  p('### Desempenho (Node, esta máquina)');
  p();
  p('| Medida | Valor |');
  p('|---|---|');
  p(`| Época completa do mundo (média / máx.) | ${media(d.epocasMs).toFixed(0)} ms / ${Math.max(...d.epocasMs).toFixed(0)} ms |`);
  p(`| Uma semana de calendário (média / p95 / máx.) | ${media(semMs).toFixed(1)} ms / ${(semMs[Math.floor(semMs.length * 0.95)] ?? 0).toFixed(1)} ms / ${(semMs[semMs.length - 1] ?? 0).toFixed(1)} ms |`);
  p(`| Memória (heap) no fim | ${d.memoriaMB.toFixed(0)} MB |`);
  p(`| Gravação por época (todos os jogos, gzip) | ${media(d.saveKB).toFixed(0)} KB (alvo ≤ 20 MB) |`);
  p(`| Jogos por época (todas as competições) | ${Math.round(totJogos / d.epocas).toLocaleString('pt-PT')} |`);
  p();
  p(`Parâmetros do modo rápido: base ${SIMULACAO.base}, casa ${SIMULACAO.casa}, gama ${SIMULACAO.gama}, rho ${SIMULACAO.rho}, empates ×${SIMULACAO.empate_fator}, goleadas ×${SIMULACAO.goleada_fator} acima de ${SIMULACAO.goleada_limiar} golos.`);
  p();

  // ---------- Campeões ----------
  p('## 2. Campeões por liga');
  p();
  p(`| Liga | ${H.map((r) => ep(r.epoca)).join(' | ')} | Diferentes |`);
  p(`|---|${H.map(() => '---').join('|')}|---:|`);
  for (const l of w.ligas) {
    const id = l.regras.id;
    const camps = H.map((r) => r.campeoes[id]);
    p(`| ${nomeLiga(w, id)} | ${camps.map((x) => w.clubes[x].nome_curto).join(' | ')} | ${new Set(camps).size} |`);
  }
  p();
  p('Siglas: ver as classificações em cada página de época. Ligas com play-off de campeão (Argentina, MLS): campeão = vencedor do play-off.');
  p();

  // ---------- Pontos ----------
  p('## 3. Pontos do campeão e do último');
  p();
  p('| Liga | Jogos | Campeão (méd. / mín. / máx.) | Último (méd. / mín. / máx.) |');
  p('|---|---:|---|---|');
  for (const [id, x] of mr.porLiga) {
    p(`| ${nomeLiga(w, id)} | ${x.jogos} | ${media(x.camp).toFixed(1)} / ${Math.min(...x.camp)} / ${Math.max(...x.camp)} | ${media(x.ult).toFixed(1)} / ${Math.min(...x.ult)} / ${Math.max(...x.ult)} |`);
  }
  p();

  // ---------- Continentais ----------
  p('## 4. Competições continentais');
  p();
  p('| Época | Competição | Vencedor | Finalista | Final |');
  p('|---|---|---|---|---|');
  for (const r of H) for (const [id, c2] of Object.entries(r.continentais)) p(`| ${ep(r.epoca)} | ${NOMES_COMP[id] ?? id} | ${nome(w, c2.vencedor, true)} | ${nome(w, c2.finalista, true)} | ${c2.final} |`);
  p();
  const titulos = new Map<string, number>();
  for (const r of H) for (const [id, c2] of Object.entries(r.continentais)) {
    const k = `${NOMES_COMP[id]}|${w.clubes[c2.vencedor].pais}`;
    titulos.set(k, (titulos.get(k) ?? 0) + 1);
  }
  p('Títulos por país: ' + [...titulos].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.replace('|', ' — ')}: ${n}`).join('; ') + '.');
  p();

  // ---------- Taças ----------
  p('## 5. Taças nacionais (vencedores)');
  p();
  p(`| País | ${H.map((r) => ep(r.epoca)).join(' | ')} |`);
  p(`|---|${H.map(() => '---').join('|')}|`);
  for (const pk of w.pacotes) {
    if (!pk.taca) continue;
    p(`| ${pk.manifest.nome} | ${H.map((r) => (r.tacas[pk.manifest.id] ? w.clubes[r.tacas[pk.manifest.id].vencedor].nome_curto : '')).join(' | ')} |`);
  }
  p();

  // ---------- Movimentos ----------
  p('## 6. Subidas, descidas e exterior por época');
  p();
  p('| Época | Subidas | Descidas | Barragens ganhas pela divisão de baixo | Saídas para o exterior | Entradas do exterior |');
  p('|---|---:|---:|---:|---:|---:|');
  for (const r of H) {
    const sub = r.movimentos.filter((m) => m.de !== 'exterior' && m.para !== 'exterior' && nivel(w, m.para) < nivel(w, m.de)).length;
    const des = r.movimentos.filter((m) => m.de !== 'exterior' && m.para !== 'exterior' && nivel(w, m.para) > nivel(w, m.de)).length;
    const bar = r.movimentos.filter((m) => m.via === 'barragem' && nivel(w, m.para) < nivel(w, m.de)).length;
    p(`| ${ep(r.epoca)} | ${sub} | ${des} | ${bar} | ${r.movimentos.filter((m) => m.para === 'exterior').length} | ${r.movimentos.filter((m) => m.de === 'exterior').length} |`);
  }
  p();
  p('Detalhe (clube a clube) em cada página de época.');
  return L.join('\n') + '\n';
}

// ===================== Página de uma época =====================

function tabelaMd(w: World, t: LinhaTabela[], notas: Map<number, string>): string[] {
  const L = ['| # | Clube | J | V | E | D | GM | GS | DG | Pts | Rep. | Nota |', '|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  t.forEach((l, i) => {
    L.push(`| ${i + 1} | ${w.clubes[l.clube].nome} | ${l.pj} | ${l.v} | ${l.e} | ${l.d} | ${l.gm} | ${l.gs} | ${l.gm - l.gs > 0 ? '+' : ''}${l.gm - l.gs} | **${l.pts}** | ${REP_ANTES.get(l.clube)?.toFixed(0) ?? ''} | ${notas.get(l.clube) ?? ''} |`);
  });
  return L;
}
let REP_ANTES = new Map<number, number>();

export function relatorioEpoca(d: DadosRelatorio, r: RegistoEpoca): string {
  const w = d.w;
  REP_ANTES = new Map(r.repAntes.map((x, i) => [i, x]));
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  p(`# Época ${ep(r.epoca)} — semente ${d.semente}`);
  p();
  p('> DADOS DE TESTE. Notas: **C** campeão; **↑** sobe; **↓** desce; **↓ ext.** sai para o exterior; **PO** play-off; **Barr.** barragem; siglas das competições para a época seguinte: **LC** Liga dos Campeões, **LE** Liga Europa, **LConf** Liga Conferência, **Lib** Libertadores, **LCA** Liga dos Campeões Asiática. Rep. = reputação no fim da época, antes da actualização.');
  p();
  const SIG: Record<string, string> = { uefa_cl: 'LC', uefa_el: 'LE', uefa_ecl: 'LConf', libertadores: 'Lib', afc_cl: 'LCA' };
  const qual = new Map<number, string>();
  for (const [comp, q] of Object.entries(r.qualificadosProxima)) for (const x of q) qual.set(x.clube, `${SIG[comp]} (${x.via})`);

  p('## Ligas');
  for (const pk of w.pacotes) {
    p();
    p(`### ${pk.manifest.nome}`);
    for (const li of pk.ligas) {
      const id = w.ligas[li].regras.id;
      const t = r.tabelas[id];
      if (!t) continue;
      const notas = new Map<number, string>();
      const add = (c: number, s: string) => notas.set(c, [notas.get(c), s].filter(Boolean).join('; '));
      add(r.campeoes[id], 'C');
      for (const m of r.movimentos) {
        if (m.de !== id) continue;
        if (m.para === 'exterior') add(m.clube, '↓ ext.');
        else if (nivel(w, m.para) < nivel(w, m.de)) add(m.clube, `↑${m.via === 'directa' ? '' : ' (' + m.via + ')'}`);
        else add(m.clube, `↓${m.via === 'directa' ? '' : ' (' + m.via + ')'}`);
      }
      const po = r.playoffsSubida[id];
      if (po) for (const c of po.participantes) if (!notas.get(c)?.includes('↑')) add(c, 'PO');
      const bar = r.barragens[id];
      if (bar) add(bar.participantes[0], notas.get(bar.participantes[0])?.includes('↓') ? '' : 'Barr. (fica)');
      // Clube da divisão de baixo que jogou a barragem com a divisão de cima (e não subiu).
      const cima = w.pacotes.find((x) => x.manifest.id === pk.manifest.id)!.ligas.map((k) => w.ligas[k].regras.id)[w.ligas[li].regras.nivel - 2];
      const barCima = cima ? r.barragens[cima] : undefined;
      if (barCima && !notas.get(barCima.participantes[1])?.includes('↑')) add(barCima.participantes[1], 'Barr. (não sobe)');
      if (w.ligas[li].regras.nivel === 1) for (const l of t) if (qual.has(l.clube)) add(l.clube, qual.get(l.clube)!);
      p();
      p(`**${w.ligas[li].regras.nome}**`);
      p();
      L.push(...tabelaMd(w, t, notas));
      const extras: string[] = [];
      const pc = r.playoffsCampeao[id];
      if (pc) extras.push(`Play-off de campeão: **${nome(w, pc.vencedor)}** venceu ${nome(w, pc.finalista)} na final (${pc.final}).`);
      if (po) extras.push(`Play-off de subida (${po.participantes.length} clubes): **${nome(w, po.vencedor)}** venceu ${nome(w, po.finalista)} na final (${po.final}).`);
      if (bar) extras.push(`Barragem (${bar.participantes[0] === bar.vencedor ? 'fica' : 'troca'}): ${nome(w, bar.participantes[0])} contra ${nome(w, bar.participantes[1])} da divisão de baixo → **${nome(w, bar.vencedor)}** (${bar.final}; a 1.ª mão é em casa do clube da divisão de baixo).`);
      const ent = r.movimentos.filter((m) => m.de === 'exterior' && m.para === id);
      if (ent.length) extras.push(`Entram do exterior para a próxima época: ${ent.map((m) => `${nome(w, m.clube)} (rep. ${r.repDepois[m.clube] ?? w.reputacao[m.clube]})`).join(', ')}.`);
      if (extras.length) { p(); for (const x of extras) p(`- ${x}`); }
    }
    const tc = r.tacas[pk.manifest.id];
    if (tc) { p(); p(`**${pk.taca!.nome}:** ${nome(w, tc.vencedor)} venceu ${nome(w, tc.finalista)} na final (${tc.final}).`); }
  }
  p();
  p('## Competições continentais');
  for (const [id, c] of Object.entries(r.continentais)) {
    p();
    p(`### ${NOMES_COMP[id] ?? id}`);
    p();
    p(`**Vencedor: ${nome(w, c.vencedor, true)}**; finalista ${nome(w, c.finalista, true)}; final ${c.final}.`);
    p();
    p('Qualificados (vaga e via):');
    p();
    p('| Clube | País | Via | Fase alcançada |');
    p('|---|---|---|---|');
    const ordemFase = ['vencedor', 'final', 'meias', 'quartos', 'oitavos', 'playoff', 'liga', 'grupos'];
    for (const q of [...c.qualificados].sort((a, b) => ordemFase.indexOf(c.fases[a.clube]) - ordemFase.indexOf(c.fases[b.clube]))) {
      p(`| ${nome(w, q.clube)} | ${q.pais} | ${q.via} | ${c.fases[q.clube]} |`);
    }
    p();
    if (c.tabela.length === 1) {
      p('Fase de liga:');
      p();
      p('| # | Clube | País | J | V | E | D | GM | GS | Pts |');
      p('|---:|---|---|---:|---:|---:|---:|---:|---:|---:|');
      c.tabela[0].forEach((l, i) => p(`| ${i + 1} | ${nome(w, l.clube)} | ${w.clubes[l.clube].pais} | ${l.pj} | ${l.v} | ${l.e} | ${l.d} | ${l.gm} | ${l.gs} | ${l.pts} |`));
    } else {
      c.tabela.forEach((g, gi) => {
        p(`Grupo ${String.fromCharCode(65 + gi)}: ` + g.map((l) => `${nome(w, l.clube)} (${w.clubes[l.clube].pais}) ${l.pts}`).join(', '));
        p();
      });
    }
  }
  p();
  p(`## Vagas continentais para ${ep(r.epoca + 1)}`);
  for (const [comp, q] of Object.entries(r.qualificadosProxima)) {
    p();
    p(`**${NOMES_COMP[comp] ?? comp}** (${q.length}): ` + q.map((x) => `${nome(w, x.clube)} (${x.pais}, ${x.via})`).join('; ') + '.');
  }
  return L.join('\n') + '\n';
}
