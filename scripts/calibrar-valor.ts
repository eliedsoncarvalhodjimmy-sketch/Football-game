// Prompt 6B, Bloco 2: calibração offline da fórmula de valor de mercado contra data/referencia/ (dataset público do
// Transfermarkt, CC0, até 6/7/2026). Os dados de referência só servem para calibrar: não entram no jogo e o relatório
// só tem agregados (medianas, percentis, razões). Os jogadores do jogo são fictícios: não há ligação um a um.
//
// Método (o mundo de teste, semente 2026, no início):
//   A. Qualidade, liga e posição: idades 24–28, dentro de cada (liga, posição) o percentil de Q efectiva no jogo
//      corresponde ao percentil de valor real; regressão log(valor) ~ liga + posição + β·Q + γ·max(0, Q − q_topo).
//   B. Idade: por idade, razão das medianas real / jogo (sem F_idade), dentro de cada liga; GR à parte.
//   C. Contrato: por anos restantes, razão das medianas real / jogo (idades 21–31), dentro de cada liga.
//   D. Clube: escalões de reputação no jogo; na referência, os clubes de cada liga ordenados pelo valor do plantel e
//      divididos nas mesmas proporções; razão das medianas por escalão, dentro de cada liga.
//   A–D repetem-se 3 vezes (cada passo com os outros factores fixos). Depois avalia-se a fórmula com os parâmetros novos.
// Uso: npx tsx scripts/calibrar-valor.ts [--escrever] → docs/relatorios/valor_mercado.md (e, com --escrever, a proposta
// de parâmetros em src/config/valorMercado.calibrado.json).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, diaInicioMundo } from '../src/engine/world.ts';
import { POSICOES } from '../src/config/papeis.ts';
import { VALOR_MERCADO as VM, type Curva } from '../src/config/valorMercado.ts';
import { valorFormula, curva } from '../src/mercado/valor.ts';
import { RAIZ_PACKS } from '../src/cli/args.ts';

const REF = new URL('../data/referencia/', import.meta.url).pathname;
const ESCREVER = process.argv.includes('--escrever');
if (!existsSync(`${REF}players.csv.gz`)) throw new Error('Faltam os dados de referência em data/referencia/.');

// ---------------------------------------------------------------- CSV
function lerCsv(f: string): Record<string, string>[] {
  const txt = gunzipSync(readFileSync(f)).toString('utf8');
  const linhas: string[][] = [];
  let campo = '', linha: string[] = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const cab = linhas[0];
  return linhas.slice(1).filter((l) => l.length === cab.length).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i]])));
}

// ---------------------------------------------------------------- correspondências
/** Liga do jogo → competição da referência. */
const LIGA_REF: Record<string, string> = {
  ENG1: 'GB1', ESP1: 'ES1', ITA1: 'IT1', GER1: 'L1', FRA1: 'FR1', POR1: 'PO1', NED1: 'NL1', BEL1: 'BE1', TUR1: 'TR1', BRA1: 'BRA1',
  ARG1: 'ARG1', USA1: 'MLS1', MEX1: 'MEX1', KSA1: 'SA1', JPN1: 'JAP1', KOR1: 'RSK1', SCO1: 'SC1', AUT1: 'A1', SUI1: 'C1', DEN1: 'DK1',
  CRO1: 'KR1', CZE1: 'TS1', GRE1: 'GR1', POL1: 'PL1', NOR1: 'NO1', COL1: 'COL1',
};
const GRUPO_REF: Record<string, string> = {
  Goalkeeper: 'GR', 'Centre-Back': 'DC', 'Left-Back': 'LAT', 'Right-Back': 'LAT', 'Defensive Midfield': 'MDC', 'Central Midfield': 'MC',
  'Left Midfield': 'MC', 'Right Midfield': 'MC', 'Attacking Midfield': 'MO', 'Left Winger': 'EXT', 'Right Winger': 'EXT', 'Centre-Forward': 'PL', 'Second Striker': 'PL',
};
const GRUPO_JOGO: Record<string, string> = { GR: 'GR', DC: 'DC', DD: 'LAT', DE: 'LAT', ALD: 'LAT', ALE: 'LAT', MDC: 'MDC', MC: 'MC', MO: 'MO', ED: 'EXT', EE: 'EXT', PL: 'PL' };
const GRUPOS = ['GR', 'DC', 'LAT', 'MDC', 'MC', 'MO', 'EXT', 'PL'];
const ESCALOES = ['gigante', 'grande', 'medio', 'pequeno'] as const;
type Escalao = (typeof ESCALOES)[number];

// ---------------------------------------------------------------- referência
const DIA_REF = Math.floor(Date.UTC(2026, 6, 6) / 864e5);
const diaDe = (s: string) => { const [a, m, d] = s.slice(0, 10).split('-').map(Number); return Math.floor(Date.UTC(a, m - 1, d) / 864e5); };
const clubesRef = lerCsv(`${REF}clubs.csv.gz`);
const valorPlantel = new Map(clubesRef.map((c) => [c.club_id, Number(c.total_market_value) || 0]));
interface Ref { liga: string; grupo: string; idade: number; anos: number; valor: number; clube: string; escalao?: Escalao }
const ref: Ref[] = lerCsv(`${REF}players.csv.gz`).filter((r) => r.last_season === '2025' && Number(r.market_value_in_eur) > 0 && GRUPO_REF[r.sub_position] && r.date_of_birth)
  .map((r) => ({ liga: r.current_club_domestic_competition_id, grupo: GRUPO_REF[r.sub_position], idade: (DIA_REF - diaDe(r.date_of_birth)) / 365.25,
    anos: r.contract_expiration_date ? Math.max(0, (diaDe(r.contract_expiration_date) - DIA_REF) / 365.25) : NaN, valor: Number(r.market_value_in_eur), clube: r.current_club_id }))
  .filter((r) => Object.values(LIGA_REF).includes(r.liga));

// ---------------------------------------------------------------- jogo
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente: 2026, modo: 'teste' });
const st = w.jogadores!, dia = diaInicioMundo();
const C = VM.clube;
const escalaoRep = (rep: number): Escalao => (rep >= C.gigante.rep ? 'gigante' : rep >= C.grande.rep ? 'grande' : rep >= C.medio.rep ? 'medio' : 'pequeno');
interface Jog { j: number; liga: string; ligaJogo: string; grupo: string; pos: string; idade: number; anos: number; ovr: number; pot: number; escalao: Escalao; vis: number }
const jog: Jog[] = [];
for (const [lj, lr] of Object.entries(LIGA_REF)) for (const c of w.ligaPorId(lj).clubes) for (const j of w.plantel[c]) {
  if (st.clube[j] !== c) continue;
  const pos = POSICOES[st.posNat[j]];
  const f = valorFormula(w, j, dia, { factores: true, diaBase: dia }).f!;
  jog.push({ j, liga: lr, ligaJogo: lj, grupo: GRUPO_JOGO[pos], pos, idade: st.idade(j, dia), anos: Math.max(0, (st.fimContrato[j] - dia) / 365.25), ovr: st.ovrNat(j), pot: Math.max(st.ovrNat(j), st.pot[j]), escalao: escalaoRep(w.reputacao[c]), vis: f.visibilidade });
}
// Escalões dos clubes da referência: por liga, pelo valor do plantel, nas mesmas proporções dos escalões do jogo.
for (const lr of Object.values(LIGA_REF)) {
  const ljogo = Object.entries(LIGA_REF).find(([, v]) => v === lr)![0];
  const cj = w.ligaPorId(ljogo).clubes.map((c) => escalaoRep(w.reputacao[c]));
  const cr = [...new Set(ref.filter((r) => r.liga === lr).map((r) => r.clube))].sort((a, b) => (valorPlantel.get(b) ?? 0) - (valorPlantel.get(a) ?? 0));
  const esc = new Map<string, Escalao>();
  let k = 0;
  for (const e of ESCALOES) { const n = Math.round((cj.filter((x) => x === e).length / cj.length) * cr.length); for (let i = 0; i < n && k < cr.length; i++) esc.set(cr[k++], e); }
  while (k < cr.length) esc.set(cr[k++], 'pequeno');
  for (const r of ref) if (r.liga === lr) r.escalao = esc.get(r.clube);
}

// ---------------------------------------------------------------- utilidades
const mediana = (a: number[]) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const quantil = (b: number[], p: number) => { const x = p * (b.length - 1), i = Math.floor(x), f = x - i; return b[i] + (b[Math.min(b.length - 1, i + 1)] - b[i]) * f; };
/** Resolve (XᵀX) β = Xᵀy (eliminação de Gauss com pivô parcial). */
function minimosQuadrados(X0: number[][], y: number[]): number[] {
  // Colunas sem informação (ligas sem amostra, limiar acima de todos): ficam com coeficiente 0.
  const usar = X0[0].map((_, k) => X0.some((r) => r[k] !== 0));
  const X = X0.map((r) => r.filter((_, k) => usar[k]));
  const sol = resolver(X, y);
  let i = 0;
  return usar.map((u) => (u ? sol[i++] : 0));
}
function resolver(X: number[][], y: number[]): number[] {
  const k = X[0].length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < X.length; i++) for (let a = 0; a < k; a++) { A[a][k] += X[i][a] * y[i]; for (let b = 0; b < k; b++) A[a][b] += X[i][a] * X[i][b]; }
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let q = c; q <= k; q++) A[r][q] -= f * A[c][q]; }
  }
  return A.map((r, i) => r[k] / r[i]);
}

// ---------------------------------------------------------------- parâmetros a estimar
const LIGAS = Object.values(LIGA_REF), LREF = 'ES1', GREF = 'MC';
let par = {
  beta: VM.beta, q_topo: VM.topo.q, gama: VM.topo.gama, vref: VM.v_ref, liga: Object.fromEntries(LIGAS.map((l) => [l, 1])) as Record<string, number>,
  grupo: Object.fromEntries(GRUPOS.map((g) => [g, 1])) as Record<string, number>,
  idade: new Map<number, number>(), idadeGR: new Map<number, number>(), contrato: [1, 1, 1, 1, 1, 1], escalao: { gigante: 1, grande: 1, medio: 1, pequeno: 1 } as Record<Escalao, number>,
};
const IDADES = Array.from({ length: 23 }, (_, k) => 16 + k); // 16..38
const BAL_CONTRATO = [0.5, 1, 2, 3, 4]; // limites: <0,5 | 0,5–1 | 1–2 | 2–3 | 3–4 | 4+
const balde = (anos: number) => { let k = 0; while (k < BAL_CONTRATO.length && anos >= BAL_CONTRATO[k]) k++; return k; };
const qef = (x: Jog) => x.ovr + curva(VM.peso_potencial, x.idade) * (x.pot - x.ovr);
const fIdadeJ = (x: Jog) => { const a = Math.min(38, Math.max(16, Math.round(x.idade))); return (x.grupo === 'GR' ? par.idadeGR : par.idade).get(a) ?? 1; };
/** log do valor previsto (sem ruído), com os factores que se pedem. */
function logPrev(x: Jog, sem: { idade?: boolean; contrato?: boolean; escalao?: boolean } = {}) {
  const q = qef(x);
  let v = Math.log(par.vref) + par.beta * (q - VM.q_ref) + par.gama * Math.max(0, q - par.q_topo) + Math.log(par.liga[x.liga]) + Math.log(par.grupo[x.grupo]) + Math.log(x.vis);
  if (!sem.idade) v += Math.log(fIdadeJ(x));
  if (!sem.contrato) v += Math.log(par.contrato[balde(x.anos)]);
  if (!sem.escalao) v += Math.log(par.escalao[x.escalao]);
  return v;
}
/** Razão real / jogo por célula (liga × chave), agregada pela mediana ponderada pelo n das células. */
function razao(chaveJ: (x: Jog) => string | null, chaveR: (r: Ref) => string | null, sem: Parameters<typeof logPrev>[1]): Map<string, number> {
  const cel = new Map<string, { j: number[]; r: number[] }>();
  for (const x of jog) { const k = chaveJ(x); if (k === null) continue; const id = `${x.liga}|${k}`; (cel.get(id) ?? cel.set(id, { j: [], r: [] }).get(id)!).j.push(logPrev(x, sem)); }
  for (const r of ref) { const k = chaveR(r); if (k === null) continue; const id = `${r.liga}|${k}`; cel.get(id)?.r.push(Math.log(r.valor)); }
  const por = new Map<string, { d: number; n: number }[]>();
  for (const [id, c] of cel) { if (c.j.length < 6 || c.r.length < 6) continue; const k = id.split('|')[1]; (por.get(k) ?? por.set(k, []).get(k)!).push({ d: mediana(c.r) - mediana(c.j), n: Math.min(c.j.length, c.r.length) }); }
  const out = new Map<string, number>();
  for (const [k, xs] of por) { const tot = xs.reduce((a, x) => a + x.n, 0); out.set(k, Math.exp(xs.reduce((a, x) => a + x.d * x.n, 0) / tot)); }
  return out;
}

// ---------------------------------------------------------------- ajuste
let residuoClube: Record<Escalao, number> = { gigante: 1, grande: 1, medio: 1, pequeno: 1 };
// Uma só passagem (cada passo com os anteriores fixos; repetir os passos com os outros como compensação divergia).
const limitar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
// Contrato: fica a hipótese do Bloco 1 (na referência, os contratos a acabar são sobretudo de jogadores mais fracos: o
// resíduo mede essa selecção, não o efeito do contrato). Mostra-se só como diagnóstico (secção 2).
par.contrato = [0.25, 0.75, 1.5, 2.5, 3.5, 4.5].map((a) => curva(VM.contrato, a));
{
  // A. Qualidade, liga e posição (24–28): percentil de Q no jogo ↔ percentil de valor real, dentro de (liga, grupo).
  let melhor: { sse: number; coef: number[]; qt: number } | null = null;
  for (const qt of [84, 86, 88, 90, 92]) {
    const X: number[][] = [], y: number[] = [];
    for (const l of LIGAS) for (const g of GRUPOS) {
      const js = jog.filter((x) => x.liga === l && x.grupo === g && x.idade >= 24 && x.idade < 29).sort((a, b) => qef(a) - qef(b));
      const rs = ref.filter((r) => r.liga === l && r.grupo === g && r.idade >= 24 && r.idade < 29).map((r) => Math.log(r.valor)).sort((a, b) => a - b);
      if (js.length < 8 || rs.length < 8) continue;
      js.forEach((x, i) => {
        const q = qef(x);
        X.push([1, q - VM.q_ref, Math.max(0, q - qt), ...LIGAS.filter((L) => L !== LREF).map((L) => (L === l ? 1 : 0)), ...GRUPOS.filter((G) => G !== GREF).map((G) => (G === g ? 1 : 0))]);
        y.push(quantil(rs, (i + 0.5) / js.length) - Math.log(x.vis) - Math.log(par.contrato[balde(x.anos)]));
      });
    }
    const coef = minimosQuadrados(X, y);
    const sse = X.reduce((a, xi, i) => a + (y[i] - xi.reduce((s, v, k) => s + v * coef[k], 0)) ** 2, 0);
    if (!melhor || sse < melhor.sse) melhor = { sse, coef, qt };
  }
  const c = melhor!.coef, LS = LIGAS.filter((L) => L !== LREF), GS = GRUPOS.filter((G) => G !== GREF);
  par.vref = Math.exp(c[0]); par.beta = c[1]; par.gama = Math.max(0, c[2]); par.q_topo = melhor!.qt;
  par.liga = { [LREF]: 1, ...Object.fromEntries(LS.map((L, k) => [L, Math.exp(c[3 + k])])) };
  par.grupo = { [GREF]: 1, ...Object.fromEntries(GS.map((G, k) => [G, Math.exp(c[3 + LS.length + k])])) };
}
// O F_clube fica na hipótese do Prompt 6B (ver o passo D): entra já nos passos seguintes.
par.escalao = { gigante: VM.clube.gigante.f, grande: VM.clube.grande.f, medio: 1, pequeno: VM.clube.pequeno };
{
  // B. Idade (por idade inteira; GR à parte), suavizada (mediana móvel de 3), normalizada a 1 entre os 24 e os 26, e
  // dentro de 0,1–1,5.
  for (const gr of [false, true]) {
    const rz = razao((x) => ((x.grupo === 'GR') === gr ? String(Math.round(x.idade)) : null), (r) => ((r.grupo === 'GR') === gr ? String(Math.round(r.idade)) : null), { idade: true });
    const bruto = IDADES.map((a) => rz.get(String(a)) ?? NaN);
    for (let k = 0; k < bruto.length; k++) if (Number.isNaN(bruto[k])) bruto[k] = k ? bruto[k - 1] : 1;
    const suave = bruto.map((_, k) => mediana([bruto[Math.max(0, k - 1)], bruto[k], bruto[Math.min(bruto.length - 1, k + 1)]]));
    const norma = (suave[8] + suave[9] + suave[10]) / 3; // 24, 25, 26
    const m = new Map(IDADES.map((a, k) => [a, limitar(suave[k] / norma, 0.1, 1.5)]));
    if (gr) par.idadeGR = m; else par.idade = m;
  }
}
{
  // D. Escalão do clube (dentro de cada liga, com a qualidade, a idade e o contrato fixos), normalizado a 1 no médio,
  // dentro de 0,85–1,25.
  const rz = razao((x) => x.escalao, (r) => r.escalao ?? null, { escalao: true });
  const med = rz.get('medio') ?? 1;
  residuoClube = Object.fromEntries(ESCALOES.map((e) => [e, (rz.get(e) ?? med) / med])) as Record<Escalao, number>;
}
{
  // F. Liga: correcção pela mediana de todas as idades (o passo A só via os 24–28), dentro de 0,5–2 × o valor de A.
  const rz = razao(() => 'todas', () => 'todas', {});
  void rz;
  for (const l of LIGAS) {
    const js = jog.filter((x) => x.liga === l).map((x) => logPrev(x)), rs = ref.filter((r) => r.liga === l).map((r) => Math.log(r.valor));
    if (js.length < 20 || rs.length < 20) continue;
    par.liga[l] *= limitar(Math.exp(mediana(rs) - mediana(js)), 0.5, 2);
  }
  // Normaliza: Espanha = 1 (o V_ref absorve).
  const e = par.liga[LREF]; par.vref *= e; for (const l of LIGAS) par.liga[l] /= e;
}
// ---------------------------------------------------------------- parâmetros para a config
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const CODIGO: Record<string, string> = Object.fromEntries(Object.entries(LIGA_REF).map(([j, r]) => [r, j]));
const curvaIdade = (m: Map<number, number>): Curva => IDADES.filter((a) => a >= 18 && a <= 37).map((a) => [a, r3(m.get(a)!)]);
const novo: { v_ref: number; beta: number; topo: { q: number; gama: number }; liga: Record<string, number>; posicao: Record<string, number>; idade: Curva; idade_gr: Curva; contrato: Curva; clube: { gigante: number; grande: number; medio: number; pequeno: number }; residuo_clube: Record<string, number> } = {
  v_ref: Math.round(par.vref / 1000) * 1000, beta: r3(par.beta), topo: { q: par.q_topo, gama: r3(par.gama) },
  liga: Object.fromEntries(Object.entries(par.liga).map(([l, v]) => [CODIGO[l], r3(v)])),
  posicao: Object.fromEntries(POSICOES.map((p) => [p, r3(par.grupo[GRUPO_JOGO[p]])])),
  idade: curvaIdade(par.idade), idade_gr: IDADES.filter((a) => a >= 18 && a <= 37).map((a) => [a, r3(par.idade.get(Math.max(16, a - 2)) ?? 1)]) as Curva,
  contrato: [[0.25, r3(par.contrato[0])], [0.75, r3(par.contrato[1])], [1.5, r3(par.contrato[2])], [2.5, r3(par.contrato[3])], [3.5, r3(par.contrato[4])], [4, r3(par.contrato[5])]] as Curva,
  // F_clube: hipótese do Prompt 6B (o resíduo por escalão fica como diagnóstico: sem medida de qualidade na referência,
  // mede a distribuição da qualidade pelos clubes, não o efeito do clube).
  clube: { gigante: VM.clube.gigante.f, grande: VM.clube.grande.f, medio: 1, pequeno: VM.clube.pequeno },
  residuo_clube: { gigante: r3(residuoClube.gigante), grande: r3(residuoClube.grande), medio: 1, pequeno: r3(residuoClube.pequeno) },
};

// ---------------------------------------------------------------- avaliação com a fórmula (parâmetros novos em memória)
const VMm = VM as unknown as Record<string, unknown>;
const antigo = JSON.parse(JSON.stringify({ v_ref: VM.v_ref, beta: VM.beta, topo: VM.topo, liga: VM.liga, posicao: VM.posicao, idade: VM.idade, contrato: VM.contrato, clube: VM.clube, desvio_idade: VM.desvio_idade, idade_gr: null }));
function valores(): Float64Array { const v = new Float64Array(jog.length); jog.forEach((x, i) => { v[i] = valorFormula(w, x.j, dia, { diaBase: dia }).valor; }); return v; }
const vAntes = valores();
const refTop = lerCsv(`${REF}players.csv.gz`).filter((r) => r.last_season === '2025').map((r) => Number(r.market_value_in_eur) || 0).sort((a, b) => b - a);
const RANKS = [1, 5, 10, 20, 30, 50, 100];
const topoMundo = (): number[] => { const t: number[] = []; for (let j = 0; j < st.n; j++) if (st.clube[j] >= 0) t.push(valorFormula(w, j, dia, { diaBase: dia }).valor); return t.sort((a, b) => b - a); };
function aplicar() {
  Object.assign(VMm, { v_ref: novo.v_ref, beta: novo.beta, topo: novo.topo, liga: { ...VM.liga, ...novo.liga }, posicao: novo.posicao, idade: novo.idade, contrato: novo.contrato, desvio_idade: {} });
  (VMm.clube as Record<string, unknown>) = { gigante: { rep: C.gigante.rep, f: novo.clube.gigante }, grande: { rep: C.grande.rep, f: novo.clube.grande }, medio: { rep: C.medio.rep, f: 1 }, pequeno: novo.clube.pequeno };
  (VMm as { idade_gr?: Curva }).idade_gr = novo.idade_gr;
}
// E. Topo do mundo: a convexidade (limiar e γ) ajusta-se ao ranking mundial da referência (posições 1–100).
{
  let melhor = { e: Infinity, q: novo.topo.q, g: novo.topo.gama };
  for (const q of [86, 88, 90, 92]) for (const g of [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12]) {
    novo.topo = { q, gama: g }; aplicar();
    const t = topoMundo();
    const e = RANKS.reduce((a, k) => a + Math.log(Math.min(t[k - 1], VM.tecto) / refTop[k - 1]) ** 2, 0);
    if (e < melhor.e) melhor = { e, q, g };
    Object.assign(VMm, antigo);
  }
  novo.topo = { q: melhor.q, gama: melhor.g };
}
aplicar();
const vDepois = valores();
const todos = topoMundo();
Object.assign(VMm, antigo);

// ---------------------------------------------------------------- relatório
const M = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(x >= 1e7 ? 0 : 1)} M€` : `${Math.round(x / 1e3)} mil €`);
const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
const L: string[] = [];
const p = (...s: string[]) => L.push(...s);
function tabela(titulo: string, chaveJ: (x: Jog) => string | null, chaveR: (r: Ref) => string | null, ordem: string[]) {
  p(`### ${titulo}`, '', '| Grupo | n jogo / ref | Mediana ref | Mediana antes | Mediana depois | Diferença depois | p10 ref / depois | p90 ref / depois |', '|---|---|---|---|---|---|---|---|');
  let ok = 0, tot = 0;
  for (const k of ordem) {
    const ij = jog.map((x, i) => [x, i] as const).filter(([x]) => chaveJ(x) === k).map(([, i]) => i);
    const rv = ref.filter((r) => chaveR(r) === k).map((r) => r.valor).sort((a, b) => a - b);
    if (ij.length < 10 || rv.length < 10) continue;
    const a = ij.map((i) => vAntes[i]), d = ij.map((i) => vDepois[i]).sort((x, y) => x - y);
    const mr = mediana(rv), md = mediana(d), dif = md / mr;
    tot++; if (Math.abs(dif - 1) <= 0.2) ok++;
    p(`| ${k} | ${ij.length} / ${rv.length} | ${M(mr)} | ${M(mediana(a))} | ${M(md)} | ${pct(dif)}${Math.abs(dif - 1) <= 0.2 ? '' : ' ⚠️'} | ${M(quantil(rv, 0.1))} / ${M(quantil(d, 0.1))} | ${M(quantil(rv, 0.9))} / ${M(quantil(d, 0.9))} |`);
  }
  p('', `Dentro de ±20%: ${ok} de ${tot}.`, '');
  return { ok, tot };
}
const bandaIdade = (a: number) => (a < 20 ? '16–19' : a < 23 ? '20–22' : a < 26 ? '23–25' : a < 29 ? '26–28' : a < 31 ? '29–30' : a < 33 ? '31–32' : a < 35 ? '33–34' : '35+');
const bandaAnos = (a: number) => (Number.isNaN(a) ? null : a < 0.5 ? '< 6 meses' : a < 1 ? '6–12 meses' : a < 2 ? '1–2 anos' : a < 3 ? '2–3 anos' : a < 4 ? '3–4 anos' : '4+ anos');
const NOME: Record<string, string> = { GB1: 'Premier League', ES1: 'Espanha', IT1: 'Itália', L1: 'Alemanha', FR1: 'França', PO1: 'Portugal', NL1: 'Países Baixos', BE1: 'Bélgica', TR1: 'Turquia', BRA1: 'Brasil', ARG1: 'Argentina', MLS1: 'MLS', MEX1: 'México', SA1: 'Arábia', JAP1: 'Japão', RSK1: 'Coreia', SC1: 'Escócia', A1: 'Áustria', C1: 'Suíça', DK1: 'Dinamarca', KR1: 'Croácia', TS1: 'Chéquia', GR1: 'Grécia', PL1: 'Polónia', NO1: 'Noruega', COL1: 'Colômbia' };
p('# Valor de mercado: calibração da fórmula (Prompt 6B, Bloco 2)', '',
  '> Referência: dataset público do Transfermarkt (CC0, até 6/7/2026), só para calibrar. Nada dele entra no jogo; aqui só há agregados.',
  '> Jogo: mundo de teste (semente 2026), plantéis principais das ligas com correspondência na referência, no início do mundo.',
  `> Amostra: ${jog.length} jogadores do jogo e ${ref.length} da referência (activos em 2025, com valor, nas mesmas ligas).`, '',
  '"Antes" são as hipóteses do Bloco 1; "depois" os parâmetros calibrados (secção 1).', '');
p('## 1. Parâmetros calibrados', '', '| Parâmetro | Hipótese (Bloco 1) | Calibrado |', '|---|---|---|');
p(`| V_ref (Q ${VM.q_ref}) | ${M(VM.v_ref)} | ${M(novo.v_ref)} |`, `| β por ponto de Q | ${VM.beta} (+${Math.round((Math.exp(VM.beta) - 1) * 100)}%) | ${novo.beta} (+${Math.round((Math.exp(novo.beta) - 1) * 100)}%) |`,
  `| Convexidade do topo | +${VM.topo.gama} acima de ${VM.topo.q} | +${novo.topo.gama} acima de ${novo.topo.q} |`);
p('', '**F_liga** (Espanha = 1):', '', '| Liga | Hipótese | Calibrado |', '|---|---|---|');
for (const [l, v] of Object.entries(par.liga).sort((a, b) => b[1] - a[1])) p(`| ${NOME[l]} | ${VM.liga[CODIGO[l]] ?? '—'} | ${r3(v)} |`);
p('', '**F_posição** (médio centro = 1):', '', '| Grupo | Hipótese | Calibrado |', '|---|---|---|');
for (const g of GRUPOS) p(`| ${g} | ${VM.posicao[POSICOES.find((x) => GRUPO_JOGO[x] === g)!]} | ${r3(par.grupo[g])} |`);
p('', '**F_idade** (a qualidade constante; 24–26 = 1):', '', '| Idade | ' + novo.idade.filter(([a]) => a % 2 === 0).map(([a]) => a).join(' | ') + ' |', '|---|' + novo.idade.filter(([a]) => a % 2 === 0).map(() => '---|').join(''));
p('| Campo | ' + novo.idade.filter(([a]) => a % 2 === 0).map(([, v]) => v).join(' | ') + ' |', '| GR | ' + novo.idade_gr.filter(([a]) => a % 2 === 0).map(([, v]) => v).join(' | ') + ' |');
p('', `**F_contrato** (4+ anos = 1): < 6 meses ${novo.contrato[0][1]}; 6–12 meses ${novo.contrato[1][1]}; 1–2 anos ${novo.contrato[2][1]}; 2–3 anos ${novo.contrato[3][1]}; 3–4 anos ${novo.contrato[4][1]}.`);
p('', `**F_clube** (médio = 1): fica a hipótese do Prompt 6B (gigante ${novo.clube.gigante}; grande ${novo.clube.grande}; pequeno ${novo.clube.pequeno}), com o efeito mais forte em jovens e mais fraco em veteranos.`,
  `Resíduo por escalão, dentro de cada liga e depois do F_liga (diagnóstico): gigante ${novo.residuo_clube.gigante}; grande ${novo.residuo_clube.grande}; pequeno ${novo.residuo_clube.pequeno}. Sem medida de qualidade na referência, este resíduo mede sobretudo a diferença na distribuição da qualidade pelos clubes (no jogo, os gigantes concentram mais qualidade do que os valores reais indicam), não o efeito do clube; por isso não substitui a hipótese.`,
  `**F_contrato**: fica a hipótese do Prompt 6B pela mesma razão: na referência, os jogadores com contrato a acabar são sobretudo os mais fracos (selecção), e o resíduo mede isso, não o desconto do contrato. A tabela por anos de contrato (secção 2) é diagnóstico.`,
  '**Guarda-redes**: a curva de idade própria saía muito ruidosa (poucos GR por liga e idade); fica a curva dos jogadores de campo deslocada 2 anos (hipótese do Prompt 6B).', '');
p('## 2. Jogo contra referência', '');
const ti = tabela('Por idade', (x) => bandaIdade(x.idade), (r) => bandaIdade(r.idade), ['16–19', '20–22', '23–25', '26–28', '29–30', '31–32', '33–34', '35+']);
const tp = tabela('Por posição', (x) => x.grupo, (r) => r.grupo, GRUPOS);
const tl = tabela('Por liga', (x) => NOME[x.liga], (r) => NOME[r.liga], LIGAS.map((l) => NOME[l]));
const tc = tabela('Por anos de contrato', (x) => bandaAnos(x.anos), (r) => bandaAnos(r.anos), ['< 6 meses', '6–12 meses', '1–2 anos', '2–3 anos', '3–4 anos', '4+ anos']);
const te = tabela('Por escalão do clube', (x) => x.escalao, (r) => r.escalao ?? null, [...ESCALOES]);
// Células (idade × posição × liga) para o critério de aceitação.
let celOk = 0, celTot = 0;
for (const l of LIGAS) for (const g of GRUPOS) for (const b of ['20–22', '23–25', '26–28', '29–30', '31–32']) {
  const d = jog.map((x, i) => [x, i] as const).filter(([x]) => x.liga === l && x.grupo === g && bandaIdade(x.idade) === b).map(([, i]) => vDepois[i]);
  const rv = ref.filter((r) => r.liga === l && r.grupo === g && bandaIdade(r.idade) === b).map((r) => r.valor);
  if (d.length < 8 || rv.length < 8) continue;
  celTot++; if (Math.abs(mediana(d) / mediana(rv) - 1) <= 0.2) celOk++;
}
// Top 50 do mundo (todos os jogadores do jogo, com os parâmetros novos) contra o top 50 da referência (todas as ligas).

p('## 3. Topo do mundo', '', '| Posição no ranking | 1 | 5 | 10 | 20 | 30 | 50 | 100 |', '|---|---|---|---|---|---|---|---|');
const rk = [1, 5, 10, 20, 30, 50, 100];
p(`| Referência | ${rk.map((k) => M(refTop[k - 1])).join(' | ')} |`, `| Jogo (calibrado) | ${rk.map((k) => M(todos[k - 1])).join(' | ')} |`);
const top50ok = [0, 9, 19, 29, 49].every((k) => Math.abs(todos[k] / refTop[k] - 1) <= 0.25) && todos[0] <= VM.tecto;
p('', `Top 50 dentro de ±25% da referência (posições 1, 10, 20, 30 e 50) e nenhum acima do tecto (${M(VM.tecto)}): ${top50ok ? '✅' : '⚠️'}`, '');
p('## 4. Critérios de aceitação', '', '| Critério | Resultado |', '|---|---|',
  `| Mediana por (idade, posição, liga) a ±20% da referência | ${celOk} de ${celTot} células (${Math.round((100 * celOk) / celTot)}%) |`,
  `| Por idade / posição / liga / contrato / escalão a ±20% | ${ti.ok}/${ti.tot}; ${tp.ok}/${tp.tot}; ${tl.ok}/${tl.tot}; ${tc.ok}/${tc.tot}; ${te.ok}/${te.tot} |`,
  `| Top 50 a ±25% e nenhum acima do tecto | ${top50ok ? 'sim' : 'não'} |`,
  '| Spearman ≥ 0,90 nos jogadores ligados | não aplicável: os jogadores do jogo são fictícios (sem ligação um a um) |', '');
writeFileSync(new URL('../docs/relatorios/valor_mercado.md', import.meta.url), L.join('\n') + '\n');
if (ESCREVER) writeFileSync(new URL('../src/config/valorMercado.calibrado.json', import.meta.url), JSON.stringify(novo, null, 1) + '\n');
console.log(L.join('\n'));
