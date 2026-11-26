// Prompt 8, Bloco D: provas de justiça dos prémios em 50 épocas. Duas corridas (viés de posição ligado e desligado) que
// gravam, no momento de cada prémio, o contexto de cada finalista (liga e clube da passagem principal, posição, calendário
// da liga, nacionalidade, desempenho bruto); depois um relatório que junta as duas.
// Uso: VIES=1|0 npx tsx scripts/justica-premios.ts <semente> <épocas> <saida.json>
//      npx tsx scripts/justica-premios.ts --relatorio <ligado.json> <desligado.json> → docs/relatorios/premios_blocoD_justica.md
import { readFileSync, writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { VIES_POSICAO, CATEGORIAS, ELEGIBILIDADE } from '../src/config/premios.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { GRUPO, calcularPremios, titulosDaJanela, type Componentes } from '../src/premios/premios.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';
import type { LinhaPremio } from '../src/historico/historico.ts';

interface F { idx: number; liga: string; clube: string; grupo: string; pais: string; calendario: string; bruto: number; total: number }
interface Ano { ano: number; premio: string; fin: F[] }
interface Pool { ano: number; c: { idx: number; g: string; liga: string; d: number; col: number; cla: number; fa: number; au: number; vi: number }[] }
interface Corrida { pools?: Pool[]; vies: boolean; semente: number; epocas: number; segundos: number; anos: Ano[]; elegiveis: { ano: number; calendario: Record<string, number>; liga: Record<string, number> }[] }

if (process.argv[2] !== '--relatorio') {
  const semente = Number(process.argv[2] ?? 2026), N = Number(process.argv[3] ?? 50), saida = process.argv[4] ?? 'justica.json';
  const vies = process.env.VIES !== '0';
  VIES_POSICAO.ligado = vies;
  // Variantes para afinar (opcionais): VIES_DEF, VIES_GR, VIES_MED.
  for (const [g, k] of [['DEF', 'VIES_DEF'], ['GR', 'VIES_GR'], ['MED', 'VIES_MED']] as const) if (process.env[k]) VIES_POSICAO.factor[g] = Number(process.env[k]);
  const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
  const st = w.jogadores!, h = w.historico!, NC = CATEGORIAS.length;
  const principal = (j: number) => {
    let melhor = st.clube[j], m = -1;
    for (let k = 0; k < 2; k++) { const c = st.wClube[j * 2 + k]; if (c < 0) continue; let s = 0; for (let x = 0; x < NC; x++) s += st.wMinCat[(j * 2 + k) * NC + x]; if (s > m) { m = s; melhor = c; } }
    return melhor;
  };
  const ligaDe = (c: number) => (c >= 0 && w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras : null);
  const r: Corrida = { vies, semente, epocas: N, segundos: 0, anos: [], elegiveis: [], pools: [] };
  const sim = new Simulador(w);
  const original = h.registarPremio.bind(h);
  h.registarPremio = (p: LinhaPremio) => {
    original(p);
    const fin = (p.finalistas ?? []).map((f) => {
      const c = principal(f.idx), L = ligaDe(c), pos = POSICOES[st.posNat[f.idx]], g = GRUPO[pos];
      const fac = !vies ? 1 : p.premio === 'melhor_do_mundo' ? VIES_POSICAO.factor[g] ?? 1 : p.premio === 'golden_boy' ? VIES_POSICAO.golden_boy[g] ?? 1 : 1;
      return { idx: f.idx, liga: L?.id ?? '—', clube: c >= 0 ? w.clubes[c].nome : '—', grupo: g, pais: st.paises[st.pais[f.idx]], calendario: L?.epoca.calendario ?? '—', bruto: (f.comp?.desempenho ?? 0) / fac, total: f.comp?.total ?? 0 };
    });
    r.anos.push({ ano: p.ano, premio: p.premio, fin });
    if (p.premio === 'melhor_do_mundo') {
      // Todos os elegíveis da Bola de Ouro sem viés (para afinar as regras de posição fora do jogo): os 15 melhores de cada grupo.
      const todos = new Map<string, Componentes>();
      calcularPremios(w, titulosDaJanela(sim.historico.filter((x) => x.epoca === p.ano - 1)), p.ano, { viesPosicao: false, todos });
      const xs = [...todos.entries()].filter(([k]) => k.startsWith('melhor_do_mundo|')).map(([k, c]) => { const idx = Number(k.split('|')[1]); const L = ligaDe(principal(idx)); return { idx, g: GRUPO[POSICOES[st.posNat[idx]]], liga: L?.id ?? '—', d: c.desempenho, col: c.colectivo, cla: c.classe, fa: c.fama, au: c.aura, vi: c.visibilidade }; });
      const pool: Pool['c'] = [];
      for (const g of ['AVA', 'MED', 'DEF', 'GR']) pool.push(...xs.filter((x) => x.g === g).sort((a, b) => b.d + b.col - a.d - a.col).slice(0, 15));
      r.pools!.push({ ano: p.ano, c: pool });
      // Universo de elegíveis da Bola de Ouro nesse ano (minutos mínimos), por calendário e por liga.
      const cal: Record<string, number> = {}, lig: Record<string, number> = {};
      for (let j = 0; j < st.n; j++) { if (st.clube[j] < 0 || st.wMinutos[j] < ELEGIBILIDADE.minutos_minimos) continue; const L = ligaDe(principal(j)); if (!L) continue; cal[L.epoca.calendario] = (cal[L.epoca.calendario] ?? 0) + 1; lig[L.id] = (lig[L.id] ?? 0) + 1; }
      r.elegiveis.push({ ano: p.ano, calendario: cal, liga: lig });
    }
  };
  const t0 = performance.now();
  sim.simularEpocas(N);
  r.segundos = (performance.now() - t0) / 1000;
  writeFileSync(saida, JSON.stringify(r));
  console.log(`${saida}: ${r.anos.length} prémios em ${r.segundos.toFixed(0)} s`);
} else {
  const [A, B] = [process.argv[3], process.argv[4]].map((f) => JSON.parse(readFileSync(f, 'utf8')) as Corrida);
  const L: string[] = [];
  const p = (...s: string[]) => L.push(...s);
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const conta = <T,>(xs: T[], k: (x: T) => string) => { const m: Record<string, number> = {}; for (const x of xs) m[k(x)] = (m[k(x)] ?? 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const anos = (c: Corrida, pr: string) => c.anos.filter((a) => a.premio === pr && a.fin.length).sort((a, b) => a.ano - b.ano);
  const BIG5 = new Set(['ENG1', 'ESP1', 'ITA1', 'GER1', 'FRA1']);
  const seq = (xs: string[]) => { let max = 1, cur = 1, bi = 0, tri = 0; for (let i = 1; i < xs.length; i++) { if (xs[i] === xs[i - 1]) { cur++; if (cur === 2) bi++; if (cur === 3) tri++; } else cur = 1; max = Math.max(max, cur); } return { max, bi, tri }; };
  p('# Prompt 8, Bloco D — provas de justiça dos prémios (50 épocas)', '', `> Mundo de teste, semente ${A.semente}, ${A.epocas} épocas por corrida (${Math.round(A.segundos / 60)} e ${Math.round(B.segundos / 60)} min). Viés de posição ligado (config) e desligado. Gerado por \`scripts/justica-premios.ts\`.`, '');
  for (const pr of ['melhor_do_mundo', 'golden_boy', 'guarda_redes'] as const) {
    const nome = { melhor_do_mundo: 'Bola de Ouro', golden_boy: 'Golden Boy', guarda_redes: 'Melhor guarda-redes' }[pr];
    p(`## ${nome}`, '');
    const linhas: [string, (c: Corrida) => string][] = [];
    const v = (c: Corrida) => anos(c, pr).map((a) => a.fin[0]);
    linhas.push(['Anos atribuídos', (c) => String(anos(c, pr).length)]);
    if (pr !== 'guarda_redes') {
      linhas.push(['Vencedores por posição (AVA / MED / DEF / GR)', (c) => { const x = v(c), n = x.length; return ['AVA', 'MED', 'DEF', 'GR'].map((g) => pct(x.filter((f) => f.grupo === g).length, n)).join(' / '); }]);
      linhas.push(['Top 3 por posição (AVA / MED / DEF / GR)', (c) => { const x = anos(c, pr).flatMap((a) => a.fin.slice(0, 3)), n = x.length; return ['AVA', 'MED', 'DEF', 'GR'].map((g) => pct(x.filter((f) => f.grupo === g).length, n)).join(' / '); }]);
    }
    if (pr === 'melhor_do_mundo') linhas.push(['Top 30 por posição (AVA / MED / DEF / GR)', (c) => { const x = anos(c, pr).flatMap((a) => a.fin.slice(0, 30)), n = x.length; return ['AVA', 'MED', 'DEF', 'GR'].map((g) => pct(x.filter((f) => f.grupo === g).length, n)).join(' / '); }]);
    linhas.push(['Vencedores por liga', (c) => conta(v(c), (f) => f.liga).map(([k, n]) => `${k} ${n}`).join(', ')]);
    linhas.push(['Liga com mais vitórias (fracção)', (c) => { const x = conta(v(c), (f) => f.liga); return x.length ? `${x[0][0]} ${pct(x[0][1], v(c).length)}` : '—'; }]);
    linhas.push(['Ligas diferentes / clubes diferentes', (c) => `${new Set(v(c).map((f) => f.liga)).size} / ${new Set(v(c).map((f) => f.clube)).size}`]);
    linhas.push(['Clube com mais vitórias', (c) => { const x = conta(v(c), (f) => f.clube); return x.length ? `${x[0][0]} ${x[0][1]}` : '—'; }]);
    linhas.push(['Jogadores diferentes; bicampeões / tricampeões seguidos; maior série', (c) => { const s = seq(v(c).map((f) => String(f.idx))); return `${new Set(v(c).map((f) => f.idx)).size}; ${s.bi} / ${s.tri}; ${s.max}`; }]);
    linhas.push(['Mais vitórias do mesmo jogador', (c) => { const x = conta(v(c), (f) => String(f.idx)); return x.length ? String(x[0][1]) : '—'; }]);
    linhas.push(['Dinastias de clube (3+ vitórias em 5 anos)', (c) => { const x = v(c).map((f) => f.clube); let d = 0; const vistos = new Set<string>(); for (let i = 0; i + 5 <= x.length; i++) for (const k of new Set(x.slice(i, i + 5))) if (x.slice(i, i + 5).filter((y) => y === k).length >= 3 && !vistos.has(k)) { vistos.add(k); d++; } return `${d} (${[...vistos].join(', ') || '—'})`; }]);
    linhas.push(['O melhor desempenho bruto ganha / fica no top 3', (c) => { const xs = anos(c, pr); const melhor = (a: Ano) => a.fin.reduce((m, f, i) => (f.bruto > a.fin[m].bruto ? i : m), 0); return `${pct(xs.filter((a) => melhor(a) === 0).length, xs.length)} / ${pct(xs.filter((a) => melhor(a) < 3).length, xs.length)}`; }]);
    if (pr === 'melhor_do_mundo') {
      linhas.push(['Fora das Big 5: no top 20 / no top 30 (por ano, média)', (c) => { const xs = anos(c, pr); const n = (k: number) => (xs.reduce((s, a) => s + a.fin.slice(0, k).filter((f) => !BIG5.has(f.liga)).length, 0) / Math.max(1, xs.length)).toFixed(2); return `${n(20)} / ${n(30)}`; }]);
      linhas.push(['Calendário: ano civil no top 30 / nos elegíveis', (c) => { const xs = anos(c, pr); const t30 = xs.flatMap((a) => a.fin.slice(0, 30)); const el = c.elegiveis.reduce((s, e) => ({ a: s.a + (e.calendario.ano_civil ?? 0), t: s.t + Object.values(e.calendario).reduce((x, y) => x + y, 0) }), { a: 0, t: 0 }); return `${pct(t30.filter((f) => f.calendario === 'ano_civil').length, t30.length)} / ${pct(el.a, el.t)}`; }]);
      linhas.push(['Nacionalidades dos vencedores (top 5)', (c) => conta(v(c), (f) => f.pais).slice(0, 5).map(([k, n]) => `${k} ${n}`).join(', ')]);
    }
    if (pr === 'golden_boy') {
      linhas.push(['Golden Boys que chegam depois ao top 30 da Bola de Ouro', (c) => { const gb = v(c), bo = anos(c, 'melhor_do_mundo'); const n = gb.filter((f, i) => bo.some((a) => a.ano > anos(c, pr)[i].ano && a.fin.slice(0, 30).some((x) => x.idx === f.idx))).length; return `${n} de ${gb.length}`; }]);
      linhas.push(['Golden Boys que ganham depois a Bola de Ouro', (c) => { const gb = v(c), bo = anos(c, 'melhor_do_mundo'); return String(gb.filter((f, i) => bo.some((a) => a.ano > anos(c, pr)[i].ano && a.fin[0]?.idx === f.idx)).length); }]);
    }
    p('| Medida | Viés ligado | Viés desligado |', '|---|---|---|', ...linhas.map(([k, f]) => `| ${k} | ${f(A)} | ${f(B)} |`), '');
  }
  writeFileSync(new URL('../docs/relatorios/premios_blocoD_justica.md', import.meta.url), L.join('\n') + '\n');
  console.log(L.join('\n'));
}
