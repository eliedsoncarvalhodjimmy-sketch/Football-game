// Prémios individuais anuais (config/premios.ts): Melhor do Mundo (Bola de Ouro), Golden Boy (melhor sub-21) e Melhor
// guarda-redes. Calculados a 29 de Julho com a janela de avaliação (1 de Agosto a 28 de Julho; Prompt 8, Bloco A).
// Bloco B: pontuação por componentes (desempenho corrigido pela liga e pelos adversários, resultados colectivos, classe,
// fama, aura) e um júri simulado que vota; cada candidato guarda a decomposição e os pontos do júri.
import { Rng } from '../core/rng.ts';
import { POSICOES } from '../config/papeis.ts';
import {
  PONTUACAO as PT, FINALISTAS, ELEGIBILIDADE as EL, GOLDEN_BOY, CALENDARIO_PREMIOS as CAL, CATEGORIAS, CATEGORIA_CONTINENTAL,
  DESEMPENHO as DS, COLECTIVO as CO, VISIBILIDADE_LIGA as VL, CLASSE as CL, FAMA, AURA, VIES_POSICAO, GUARDA_REDES as GRC, JURI,
} from '../config/premios.ts';
import { IDX_CAT } from './janela.ts';
import type { World } from '../engine/world.ts';
import type { RegistoEpoca } from '../engine/history.ts';
import type { LinhaPremio } from '../historico/historico.ts';

export const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };

export interface Componentes { desempenho: number; colectivo: number; classe: number; fama: number; aura: number; /** Factor da liga (1 nas Big 5). */ visibilidade: number; total: number }
export interface Candidato {
  idx: number; jogador: string; clube: string; clubeIdx: number;
  /** Pontos do júri (a classificação final); `comp.total` é a pontuação antes do júri. */
  pontos: number;
  comp: Componentes;
  /** Boletins em que ficou em 1.º. */
  primeiros: number;
}
export interface Votacao { boletins: number; unanime: boolean; margem: number; porPais: Record<string, number> }
export type IdPremio = 'melhor_do_mundo' | 'golden_boy' | 'guarda_redes';
export interface ResultadoPremio { candidatos: Candidato[]; votacao: Votacao }

/** Um título colectivo da janela: categoria da competição, clube vencedor e peso. */
export interface TituloJanela { cat: number; clube: number; peso: number }

/** Títulos colectivos e fases continentais dos registos de época cujo fecho cai na janela (`regs`), com os pesos do config. */
export function titulosDaJanela(regs: RegistoEpoca[]): TituloJanela[] {
  const out: TituloJanela[] = [];
  for (const reg of regs) {
    for (const c of Object.values(reg.campeoes)) out.push({ cat: IDX_CAT.liga, clube: c, peso: PT.titulos.liga });
    for (const t of Object.values(reg.tacas)) if (t.vencedor !== undefined && t.vencedor >= 0) out.push({ cat: IDX_CAT.taca, clube: t.vencedor, peso: PT.titulos.taca });
    for (const [id, x] of Object.entries(reg.continentais)) {
      const cat = CATEGORIA_CONTINENTAL[id] ?? 'continental_3';
      out.push({ cat: IDX_CAT[cat], clube: x.vencedor, peso: PT.titulos[cat] ?? 0 });
      // Fase atingida (pontos por fase × peso da competição), para todos os participantes.
      for (const [c, f] of Object.entries(x.fases ?? {})) { const v = (CO.fase[f] ?? 0) * (CO.peso_competicao[cat] ?? 0.25); if (v) out.push({ cat: IDX_CAT[cat], clube: Number(c), peso: v }); }
    }
  }
  return out;
}

interface Base { j: number; g: string; liga: number; clube: number; min: number; z: number; zgr: number }

/** Clube e liga principais do jogador na janela: a passagem com mais minutos. */
function principal(w: World, j: number): number {
  const st = w.jogadores!, N = CATEGORIAS.length;
  let melhor = st.clube[j], m = -1;
  for (let k = 0; k < 2; k++) {
    const c = st.wClube[j * 2 + k];
    if (c < 0) continue;
    let s = 0; for (let x = 0; x < N; x++) s += st.wMinCat[(j * 2 + k) * N + x];
    if (s > m) { m = s; melhor = c; }
  }
  return melhor;
}

const media = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const desvio = (a: number[], m: number) => Math.max(1e-6, Math.sqrt(media(a.map((x) => (x - m) ** 2))));

/** Pontuação e votação dos três prémios do ano `ano` (janela 1/8 de ano − 1 a 28/7 de ano). `null` se a janela não
 *  estiver completa (não se inventa). `viesPosicao` liga/desliga o viés de posição da Bola de Ouro (por defeito, o config); `todos`, se dado, recebe a
 *  decomposição de todos os elegíveis (chave `premio|jogador`), não só dos que vão a votos. */
export function calcularPremios(w: World, titulos: TituloJanela[], ano: number, opc: { viesPosicao?: boolean; todos?: Map<string, Componentes> } = {}): Record<IdPremio, ResultadoPremio> | null {
  const st = w.jogadores!, jp = w.janelaPremios;
  const inicio = Math.floor(Date.UTC(ano - 1, CAL.inicio.mes - 1, CAL.inicio.dia) / 864e5);
  if (!jp || jp.inicio < 0 || jp.inicio > inicio) return null;
  const vies = opc.viesPosicao ?? VIES_POSICAO.ligado;
  // 1. Jogadores com minutos suficientes para a referência das médias (metade do mínimo) e os seus números por 90.
  const ref = Math.min(EL.minutos_minimos_golden_boy, EL.minutos_minimos) / 2;
  const B: Base[] = [];
  const por90 = (x: number, j: number) => (x * 90) / Math.max(1, st.wMinutos[j]);
  const nota = (j: number) => st.wNotas[j] / Math.max(1, st.wJogos[j]) / 10;
  for (let j = 0; j < st.n; j++) {
    if (st.clube[j] < 0 || st.wMinutos[j] < ref) continue;
    const c = principal(w, j);
    if (c < 0 || w.liga[c] < 0) continue;
    B.push({ j, g: GRUPO[POSICOES[st.posNat[j]]] ?? 'MED', liga: w.liga[c], clube: c, min: st.wMinutos[j], z: 0, zgr: 0 });
  }
  // 2. Desempenho: z das métricas por 90 dentro de (liga, grupo), combinado pelos pesos do grupo, mais a força da liga,
  //    a dos adversários e os jogos grandes.
  const celulas = new Map<string, Base[]>();
  for (const b of B) { const k = `${b.liga}|${b.g}`; (celulas.get(k) ?? celulas.set(k, []).get(k)!).push(b); }
  const repLiga = new Map<number, number>();
  for (let l = 0; l < w.ligas.length; l++) repLiga.set(l, media(w.ligas[l].clubes.map((c) => w.reputacao[c])));
  for (const xs of celulas.values()) {
    const met = { nota: xs.map((b) => nota(b.j)), golos: xs.map((b) => por90(st.wGolos[b.j], b.j)), assist: xs.map((b) => por90(st.wAssist[b.j], b.j)) };
    const est = Object.fromEntries(Object.entries(met).map(([k, v]) => { const m = media(v); return [k, { m, s: desvio(v, m) }]; })) as Record<keyof typeof met, { m: number; s: number }>;
    xs.forEach((b, i) => {
      const P = DS.pesos[b.g];
      let z = P.nota * (met.nota[i] - est.nota.m) / est.nota.s + P.golos * (met.golos[i] - est.golos.m) / est.golos.s + P.assist * (met.assist[i] - est.assist.m) / est.assist.s;
      z += DS.liga_por_20 * (w.ligas[b.liga].regras.forca_desportiva - DS.liga_ref) / 20;
      z += DS.adversario_por_10 * (st.wRepAdv[b.j] / Math.max(1, st.wJogos[b.j]) - (repLiga.get(b.liga) ?? 50)) / 10;
      const ng = st.wGrandes[b.j];
      if (ng) z += DS.grandes_por_jogo * Math.min(DS.grandes_tecto, ng) * (st.wNotasGrandes[b.j] / ng / 10 - nota(b.j));
      b.z = z;
    });
  }
  // 3. Guarda-redes: golos evitados, defesas, penáltis, jogos sem sofrer acima do esperado pela defesa, erros, jogos grandes
  //    (z entre todos os GR do mundo), mais a força da liga.
  const grs = B.filter((b) => b.g === 'GR');
  const mGR = (b: Base) => {
    const j = b.j, jogos = Math.max(1, st.wJogos[j]), xg = st.wXgSofrido[j] / 10, golos = st.wRematesSofridos[j] - st.wDefesas[j];
    const esperadoSem = jogos * Math.exp(-xg / jogos);
    return [por90(xg - golos, j), por90(st.wDefesas[j], j), st.wPenaltisDefendidos[j], st.wSemSofrer[j] - esperadoSem, -st.wErros[j], st.wGrandes[j] ? st.wNotasGrandes[j] / st.wGrandes[j] / 10 - nota(j) : 0];
  };
  const pesosGR = [GRC.evitados_por_90, GRC.defesas_por_90, GRC.penalti, GRC.sem_sofrer_acima, GRC.erro, GRC.grandes];
  const matGR = grs.map(mGR);
  const estGR = pesosGR.map((_, k) => { const v = matGR.map((r) => r[k]); const m = media(v); return { m, s: desvio(v, m) }; });
  grs.forEach((b, i) => {
    b.zgr = pesosGR.reduce((a, p, k) => a + p * (matGR[i][k] - estGR[k].m) / estGR[k].s, 0) / pesosGR.reduce((a, p) => a + p, 0) * 2
      + DS.liga_por_20 * (w.ligas[b.liga].regras.forca_desportiva - DS.liga_ref) / 20;
  });
  // 4. Colectivo (títulos e fases, pelos minutos de cada passagem), classe, fama e aura.
  const pesoTitulo = new Map<string, number>();
  for (const t of titulos) pesoTitulo.set(`${t.cat}|${t.clube}`, (pesoTitulo.get(`${t.cat}|${t.clube}`) ?? 0) + t.peso);
  const CONT = new Set([IDX_CAT.continental_1, IDX_CAT.continental_2, IDX_CAT.continental_3]);
  const colectivo = (j: number, soContinental = false) => {
    let s = 0;
    for (let k = 0; k < 2; k++) { const cl = st.wClube[j * 2 + k]; if (cl < 0) continue; for (let cat = 0; cat < CATEGORIAS.length; cat++) { if (soContinental && !CONT.has(cat)) continue; const p = pesoTitulo.get(`${cat}|${cl}`); if (p) s += p * jp.participacao(j, cat, cl); } }
    return s + (soContinental ? 0 : CO.selecao);
  };
  const big5 = new Set(VL.big5);
  const visibilidade = (b: Base, premio: IdPremio) => (big5.has(w.ligas[b.liga].regras.id) ? 1 : Math.min(1, (VL.fora_big5[premio] ?? 1) + Math.min(VL.continental.tecto, VL.continental.por_ponto * colectivo(b.j, true))));
  const classe = (j: number) => -Math.min(CL.tecto, CL.amarelo * st.wAmarelos[j] + CL.vermelho * st.wVermelhos[j]);
  const fama = (j: number) => FAMA.peso * Math.max(0, Math.min(100, (st.ovrNat(j) - 55) * 2.6));
  const aura = (premio: IdPremio, j: number) => {
    const h = w.historico?.premiosJogo ?? [];
    const ganhou = (a: number) => h.some((p) => p.premio === premio && p.ano === a && p.idx === j);
    return ganhou(ano - 1) ? AURA.ano_1 : ganhou(ano - 2) ? AURA.ano_2 : 0;
  };
  const cand = (b: Base, premio: IdPremio, desempenho: number, comFama: boolean): Candidato => {
    const col = (CO.peso[premio] ?? 0.5) * colectivo(b.j), cla = classe(b.j), fa = comFama ? fama(b.j) : 0, au = aura(premio, b.j);
    const vi = visibilidade(b, premio);
    const total = (desempenho + col + cla + fa) * vi * (1 + au);
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const comp = { desempenho: r1(desempenho), colectivo: r1(col), classe: r1(cla), fama: r1(fa), aura: au, visibilidade: Math.round(vi * 1000) / 1000, total: r1(total) };
    opc.todos?.set(`${premio}|${b.j}`, comp);
    return { idx: b.j, jogador: st.nomes[b.j], clube: w.clubes[st.clube[b.j]]?.nome ?? '', clubeIdx: st.clube[b.j], pontos: 0, primeiros: 0, comp };
  };
  const pts = (z: number) => DS.base + DS.escala * z;
  const ptsGR = (z: number) => GRC.base + GRC.escala * z;
  const bo: Candidato[] = [], gb: Candidato[] = [], gr: Candidato[] = [];
  const dBruto = (b: Base) => (b.g === 'GR' ? ptsGR(b.zgr) : pts(b.z));
  // Época histórica: o melhor defesa ou GR do mundo, destacado e com um título a sério, perde o viés de posição.
  const historicos = new Set<number>();
  if (vies) for (const [g, H] of Object.entries(VIES_POSICAO.historica)) {
    const xs = B.filter((b) => b.g === g && b.min >= EL.minutos_minimos).sort((a, c) => dBruto(c) - dBruto(a) || a.j - c.j);
    if (xs.length >= 2 && dBruto(xs[0]) - dBruto(xs[1]) >= H.margem && (CO.peso.melhor_do_mundo ?? 0.5) * colectivo(xs[0].j) >= H.colectivo) historicos.add(xs[0].j);
  }
  for (const b of B) {
    const d = dBruto(b);
    if (b.min >= EL.minutos_minimos) bo.push(cand(b, 'melhor_do_mundo', d * (vies && !historicos.has(b.j) ? VIES_POSICAO.factor[b.g] ?? 1 : 1), true));
    if (b.g === 'GR' && b.min >= EL.minutos_minimos_gr) gr.push(cand(b, 'guarda_redes', ptsGR(b.zgr), true));
    // Golden Boy: só o rendimento real (o potencial não entra; sem fama), com o ajuste pela força da liga.
    if (st.idade(b.j, inicio) <= GOLDEN_BOY.idade_maxima && b.min >= EL.minutos_minimos_golden_boy) gb.push(cand(b, 'golden_boy', d * (vies ? VIES_POSICAO.golden_boy[b.g] ?? 1 : 1), false));
  }
  // Nomeação garantida (decisão do utilizador: tem de haver GR entre os 30, raríssimos): os 2 melhores GR do mundo pela
  // sua própria pontuação entram sempre na lista de nomeados da Bola de Ouro, sem qualquer ajuda no júri.
  const grTop2 = B.filter((b) => b.g === 'GR' && b.min >= EL.minutos_minimos).map((b) => bo.find((c) => c.idx === b.j)).filter((c): c is Candidato => !!c).sort((a, b) => b.comp.total - a.comp.total).slice(0, 2).map((c) => c.idx);
  return { melhor_do_mundo: votar(w, 'melhor_do_mundo', bo, ano, grTop2), golden_boy: votar(w, 'golden_boy', gb, ano), guarda_redes: votar(w, 'guarda_redes', gr, ano) };
}

/** Júri simulado: jurados pelos países das ligas (peso pela força desportiva), cada um ordena os seus melhores com os
 *  pontos por posição, com vieses pequenos (nacionalidade, liga, narrativa) e um ruído pessoal. Determinístico.
 *  `garantir`: índices de jogadores com nomeação garantida entre os finalistas (ex.: 2 GR na Bola de Ouro), sem qualquer
 *  ajuda no júri — entram no boletim e, se os votos não bastarem, tomam o lugar dos piores candidatos na lista final. */
function votar(w: World, premio: IdPremio, lista: Candidato[], ano: number, garantir: number[] = []): ResultadoPremio {
  const st = w.jogadores!;
  let cs = lista.sort((a, b) => b.comp.total - a.comp.total || a.idx - b.idx).slice(0, JURI.candidatos);
  if (garantir.length) {
    const presentes = new Set(cs.map((c) => c.idx));
    const faltamNoBoletim = lista.filter((c) => garantir.includes(c.idx) && !presentes.has(c.idx));
    if (faltamNoBoletim.length) cs = [...cs.slice(0, Math.max(0, JURI.candidatos - faltamNoBoletim.length)), ...faltamNoBoletim];
  }
  const rng = Rng.de(w.semente, 'juri', premio, ano);
  // Jurados: ligas de 1.ª divisão, com peso pela força desportiva.
  const ligas = w.ligas.map((l, i) => ({ i, pais: l.regras.pais ?? l.regras.id, p: l.regras.nivel === 1 ? Math.max(1, l.regras.forca_desportiva) : 0 })).filter((x) => x.p > 0);
  const tot = ligas.reduce((a, x) => a + x.p, 0);
  const narrativa = cs.map(() => 1 + JURI.vies.narrativa * (rng.next() * 2 - 1));
  const porPais: Record<string, number> = {};
  const pontosPais = new Map<number, Record<string, number>>();
  let boletins = 0;
  for (let k = 0; k < JURI.jurados; k++) {
    let u = rng.next() * tot, L = ligas[0];
    for (const x of ligas) { if ((u -= x.p) <= 0) { L = x; break; } }
    const ordem = cs.map((c, i) => {
      let f = narrativa[i] * (1 + JURI.ruido * rng.normal(0, 1));
      if (st.paises[st.pais[c.idx]] === L.pais) f += JURI.vies.nacionalidade;
      if (w.liga[c.clubeIdx] === L.i) f += JURI.vies.liga;
      return { i, v: c.comp.total * f };
    }).sort((a, b) => b.v - a.v);
    ordem.slice(0, JURI.pontos.length).forEach((o, pos) => {
      cs[o.i].pontos += JURI.pontos[pos];
      const pp = pontosPais.get(o.i) ?? {};
      pp[L.pais] = (pp[L.pais] ?? 0) + JURI.pontos[pos];
      pontosPais.set(o.i, pp);
    });
    if (ordem.length) cs[ordem[0].i].primeiros++;
    boletins++;
  }
  const iVenc = cs.reduce((m, c, i) => (c.pontos > cs[m].pontos ? i : m), 0);
  Object.assign(porPais, pontosPais.get(iVenc) ?? {});
  const ordenados = [...cs].sort((a, b) => b.pontos - a.pontos || b.comp.total - a.comp.total || a.idx - b.idx);
  let fin = ordenados.slice(0, FINALISTAS[premio]);
  if (garantir.length) {
    const faltamNaLista = garantir.map((idx) => ordenados.find((c) => c.idx === idx)).filter((c): c is Candidato => !!c && !fin.includes(c));
    if (faltamNaLista.length) fin = [...fin.slice(0, Math.max(0, FINALISTAS[premio] - faltamNaLista.length)), ...faltamNaLista].sort((a, b) => b.pontos - a.pontos || b.comp.total - a.comp.total || a.idx - b.idx);
  }
  return { candidatos: fin, votacao: { boletins, unanime: !!fin[0] && fin[0].primeiros >= JURI.unanimidade * boletins, margem: fin.length > 1 ? fin[0].pontos - fin[1].pontos : 0, porPais } };
}

/** Atribui os prémios do ano `ano` (cerimónia a 30 de Julho) e regista-os no histórico (com a decomposição e os votos).
 *  Com a janela incompleta não atribui nada e devolve o aviso. */
export function atribuirPremios(w: World, regs: RegistoEpoca[], ano: number): string | null {
  if (!w.jogadores || !w.historico) return null;
  const res = calcularPremios(w, titulosDaJanela(regs), ano);
  if (!res) return `Prémios ${ano}: janela de avaliação incompleta (não abriu a 1 de Agosto de ${ano - 1}); não há prémios este ano.`;
  for (const k of Object.keys(res) as IdPremio[]) {
    const v = res[k].candidatos[0];
    if (!v) continue;
    const linha: LinhaPremio = {
      ano, premio: k, jogador: v.jogador, clube: v.clube, nota: '', fonte: 'jogo', idx: v.idx,
      finalistas: res[k].candidatos.map((x) => ({ jogador: x.jogador, clube: x.clube, pontos: x.pontos, idx: x.idx, comp: x.comp, primeiros: x.primeiros })),
      votacao: res[k].votacao,
    };
    w.historico.registarPremio(linha);
    w.prestigio?.registar(linha);
  }
  return null;
}
