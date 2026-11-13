// Modo detalhado (Fase 2, Bloco B): só o jogo do utilizador. Minuto a minuto, por posses.
//  1. A posse divide-se pela construção contra a pressão adversária.
//  2. Cada ataque passa por duelos encadeados: progressão (passe/drible contra posicionamento,
//     desarme, intercepção), criação (passe/visão/cruzamento contra marcação/posicionamento) e remate.
//  3. P(duelo) = 0,5 + K × diferença efectiva, diferença limitada a ±10 (19 contra 11 → ~70%).
//  4. xG pelo tipo de ocasião; o duelo finalizador contra o guarda-redes ajusta-o no máximo ±30%.
//  5. Cada remate é golo com probabilidade igual ao seu xG final (sem Poisson por cima).
// Emite eventos (minuto, jogador, posição no campo) para o relato, as estatísticas e o futuro replay 2D.
import { IDX, N_ATR } from '../config/atributos.ts';
import { IDX_PAPEL } from '../config/papeis.ts';
import { DETALHADO as D } from '../config/motor.ts';
import { CONTRIBUICAO, SINERGIA_FALSO9 } from '../config/ratings.ts';
import { PAPEIS } from '../config/papeis.ts';
import type { Rng } from '../core/rng.ts';
import type { World } from '../engine/world.ts';
import type { PlayerStore } from '../players/store.ts';
import type { Lado } from './rapido.ts';

export type TipoEvento = 'posse' | 'passe' | 'duelo' | 'remate' | 'golo' | 'falta' | 'cartao' | 'penalti' | 'canto' | 'lesao' | 'substituicao' | 'intervalo' | 'fim';

export interface Evento {
  min: number;
  tipo: TipoEvento;
  equipa: 0 | 1;
  jogador?: number;
  /** Outro jogador envolvido (defensor do duelo, assistente, quem entra numa substituição). */
  outro?: number;
  x: number;
  y: number;
  /** Detalhe: tipo de ocasião, xG, resultado do duelo, cor do cartão... */
  info?: string;
  xg?: number;
}

export interface EstatEquipa {
  golos: number;
  remates: number;
  aBaliza: number;
  xg: number;
  posses: number;
  ataques: number;
  progressoesGanhas: number;
  progressoesPerdidas: number;
  ocasioesCriadas: number;
  grandesOcasioes: number;
  /** Remates de jogadores de papéis de médio interior (para o teste do falso 9). */
  rematesInteriores: number;
  /** Bolas perdidas pelo avançado-centro na progressão. */
  perdasDoNove: number;
  faltas: number;
  amarelos: number;
  vermelhos: number;
  cantos: number;
  penaltis: number;
}

export interface ResultadoDetalhado {
  golos: [number, number];
  remates: [number, number];
  xg: [number, number];
  posse: [number, number];
  estat: [EstatEquipa, EstatEquipa];
  eventos: Evento[];
  marcadores: { equipa: 0 | 1; jogador: number; min: number; assist?: number }[];
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const novoEstat = (): EstatEquipa => ({ golos: 0, remates: 0, aBaliza: 0, xg: 0, posses: 0, ataques: 0, progressoesGanhas: 0, progressoesPerdidas: 0, ocasioesCriadas: 0, grandesOcasioes: 0, rematesInteriores: 0, perdasDoNove: 0, faltas: 0, amarelos: 0, vermelhos: 0, cantos: 0, penaltis: 0 });

/** Valores (1–20) de um jogador nas acções do motor. */
interface Actor {
  j: number;
  slot: number;
  papel: number;
  x: number;
  y: number;
  prog: number; // passe, primeiro toque, drible, decisões
  pen: number; // drible, aceleração, agilidade, primeiro toque, movimentação
  press: number; // posicionamento, desarme, antecipação, capacidade de trabalho
  cria: number; // passe, visão, cruzamento, técnica, movimentação
  marc: number; // marcação, posicionamento, concentração, antecipação
  fin: number; // finalização, compostura, movimentação
  rld: number; // remate de longe
  cab: number; // cabeceamento, impulsão, força
  gk: number; // reflexos, um-contra-um, pega, comando da área
  agr: number;
  bpa: number;
  // Pesos de escolha para cada acção.
  wProg: number;
  wPress: number;
  wCria: number;
  wMarc: number;
  wFin: number;
  ativo: boolean;
}

const INTERIORES = new Set([IDX_PAPEL.mc_b2b, IDX_PAPEL.mo_che, IDX_PAPEL.mc_cri]);
const F9 = IDX_PAPEL.pl_f9;
const NOVE = new Set([IDX_PAPEL.pl_fin, IDX_PAPEL.pl_f9, IDX_PAPEL.pl_piv, IDX_PAPEL.pl_pre]);

function m(st: PlayerStore, j: number, ks: (keyof typeof IDX)[]): number {
  let s = 0;
  for (const k of ks) s += st.atr[j * N_ATR + IDX[k]];
  return s / ks.length;
}

function actores(st: PlayerStore, lado: Lado, mod: number, casa: boolean): Actor[] {
  const e = lado.escolha;
  const bonus = casa ? D.casa_pontos : 0;
  // Sinergia do falso 9 (interiores rematam mais quando há um falso 9 adequado).
  let sinergia = 0;
  e.onze.papeis.forEach((p, s) => { if (p === F9) sinergia = clamp((st.adequacao(e.onze.jogadores[s], F9) - SINERGIA_FALSO9.adequacao_minima) / (SINERGIA_FALSO9.adequacao_referencia - SINERGIA_FALSO9.adequacao_minima), 0, 1.2); });
  return e.onze.jogadores.map((j, s) => {
    const papel = e.onze.papeis[s];
    const l = e.onze.formacao.lugares[s];
    const f = lado.ratings.factores[s] * (1 + mod);
    const c = CONTRIBUICAO[PAPEIS[papel].id] ?? {};
    const v = (x: number) => x * f + bonus;
    const interior = INTERIORES.has(papel) ? SINERGIA_FALSO9.finalizacao_interiores * sinergia : 0;
    return {
      j, slot: s, papel, x: l.x, y: l.y,
      prog: v(m(st, j, ['pas', 'ptq', 'dri', 'dec'])),
      pen: v(m(st, j, ['dri', 'ace', 'agi', 'ptq', 'msb'])),
      press: v(m(st, j, ['pos', 'des', 'ant', 'ctr'])),
      cria: v(m(st, j, ['pas', 'vis', 'cru', 'tec', 'msb'])),
      marc: v(m(st, j, ['mar', 'pos', 'con', 'ant'])),
      fin: v(m(st, j, ['fin', 'cmp', 'msb'])),
      rld: v(m(st, j, ['rld', 'tec'])),
      cab: v(m(st, j, ['cab', 'imp', 'for'])),
      gk: v(m(st, j, ['ref', 'uco', 'peg', 'cma'])),
      agr: st.atr[j * N_ATR + IDX.agr],
      bpa: v(st.atr[j * N_ATR + IDX.bpa]),
      wProg: (c.construcao ?? 0) + 0.6 * (c.criacao ?? 0) + 0.05,
      wPress: (c.pressao ?? 0) + 0.4 * (c.transicao ?? 0) + 0.02,
      wCria: (c.criacao ?? 0) + 0.3 * (c.construcao ?? 0) + 0.02,
      wMarc: (c.defesa_area ?? 0) + 0.5 * (c.transicao ?? 0) + 0.02,
      wFin: (c.finalizacao ?? 0) + interior + 0.03,
      ativo: true,
    };
  });
}

function escolher(rng: Rng, as: Actor[], peso: (a: Actor) => number, excluir?: Actor): Actor {
  let s = 0;
  for (const a of as) if (a.ativo && a !== excluir && a.papel !== IDX_PAPEL.gr_cla && a.papel !== IDX_PAPEL.gr_lib) s += peso(a);
  let r = rng.next() * s;
  for (const a of as) if (a.ativo && a !== excluir && a.papel !== IDX_PAPEL.gr_cla && a.papel !== IDX_PAPEL.gr_lib && (r -= peso(a)) < 0) return a;
  return as[as.length - 1];
}

/** Sinergia do falso 9 (0–1,2) de um lado: adequação do jogador no papel de falso 9. */
function sinergiaF9(st: PlayerStore, lado: Lado): number {
  const e = lado.escolha;
  let s = 0;
  e.onze.papeis.forEach((p, k) => { if (p === F9) s = clamp((st.adequacao(e.onze.jogadores[k], F9) - SINERGIA_FALSO9.adequacao_minima) / (SINERGIA_FALSO9.adequacao_referencia - SINERGIA_FALSO9.adequacao_minima), 0, 1.2); });
  return s;
}

/** Probabilidade de o atacante ganhar o duelo. */
export function probDuelo(atacante: number, defensor: number): number {
  return 0.5 + D.K * clamp(atacante - defensor, -D.diferenca_max, D.diferenca_max);
}

export function jogoDetalhado(w: World, casa: Lado, fora: Lado, neutro: boolean, rng: Rng, opts: { eventos?: boolean } = {}): ResultadoDetalhado {
  const st = w.jogadores!;
  const comEventos = opts.eventos !== false;
  const lados = [casa, fora];
  const nivel = (l: Lado) => (1 + l.mod) * (1 + (l.parcelas.forma_epoca ?? 0)) - 1;
  const eq = [actores(st, casa, nivel(casa), !neutro), actores(st, fora, nivel(fora), false)];
  const est: [EstatEquipa, EstatEquipa] = [novoEstat(), novoEstat()];
  const sin = [sinergiaF9(st, casa), sinergiaF9(st, fora)];
  const ev: Evento[] = [];
  const marcadores: ResultadoDetalhado['marcadores'] = [];
  const emitir = (e: Evento) => { if (comEventos) ev.push(e); };
  const gr = (t: number) => eq[t][0];
  // Divisão da posse: construção da equipa contra a pressão do adversário (ratings 1–20).
  const posseCasa = clamp(0.5 + (neutro ? 0 : D.posse_casa) + D.k_posse * ((casa.ratings.r.construcao - fora.ratings.r.pressao) - (fora.ratings.r.construcao - casa.ratings.r.pressao)) / 2, 0.3, 0.7);
  const golos: [number, number] = [0, 0];
  const nPosses = D.posses_por_jogo;
  // Ritmo do jogo (partilhado pelas duas equipas): há jogos mais abertos e mais fechados.
  const sr = D.ritmo_jogo_desvio;
  const ritmoJogo = Math.exp(rng.normal(0, sr) - (sr * sr) / 2);
  let subsFeitas = [0, 0];

  for (let k = 0; k < nPosses; k++) {
    const min = Math.min(90, Math.floor((k * 90) / nPosses) + 1);
    if (k === Math.floor(nPosses / 2)) emitir({ min: 45, tipo: 'intervalo', equipa: 0, x: 50, y: 50 });
    // Substituições automáticas do treinador entre os 60 e os 80 minutos (até 3 por equipa no modo detalhado).
    if (min >= 60 && min <= 80 && k % 6 === 0) {
      for (const t of [0, 1] as const) {
        if (subsFeitas[t] >= 3 || !rng.chance(0.25)) continue;
        const banco = lados[t].escolha.banco.filter((b) => !eq[t].some((a) => a.j === b));
        if (!banco.length) continue;
        const sai = eq[t].filter((a) => a.ativo && a.slot > 0)[rng.int(0, 9)];
        if (!sai) continue;
        const entra = banco[0];
        subsFeitas[t]++;
        emitir({ min, tipo: 'substituicao', equipa: t, jogador: entra, outro: sai.j, x: 50, y: t ? 100 : 0 });
        sai.j = entra; // o suplente herda o lugar e o papel (valores do titular, simplificação)
      }
    }
    const t: 0 | 1 = rng.next() < posseCasa ? 0 : 1;
    const o: 0 | 1 = t === 0 ? 1 : 0;
    const A = eq[t], B = eq[o];
    // Termo de equipa (ratings do onze, os mesmos do modo rápido): alinha a sensibilidade à diferença de qualidade.
    const termo = (D.peso_forca_equipa * (lados[t].forcaAtaque - lados[o].forcaDefesa)) / 10;
    const dir = t === 0 ? 1 : -1;
    const X = (x: number) => (t === 0 ? x : 100 - x);
    est[t].posses++;
    // Estado do jogo: quem ganha recua (ataca menos), quem perde arrisca mais.
    const vant = golos[t] - golos[o];
    const fEstado = vant > 0 ? 1 - D.estado_jogo.lider * Math.min(vant, 3) : vant < 0 ? 1 + D.estado_jogo.perdedor * Math.min(-vant, 2) : 1;
    // Jogo já com muitos golos: as duas equipas gerem mais (amortece as goleadas, como no modo rápido).
    const fTotal = Math.max(0.3, 1 - D.amortecimento_golos * Math.max(0, golos[0] + golos[1] - 3))
      // Empatados na última meia hora: os dois treinadores ficam mais cautelosos.
      * (vant === 0 && min >= D.cautela_empate.minuto ? 1 - D.cautela_empate.reducao : 1);
    if (!rng.chance(Math.min(0.98, D.inicio_ataque * fEstado * ritmoJogo * fTotal))) continue;
    est[t].ataques++;
    // 1. Progressão.
    const port = escolher(rng, A, (a) => a.wProg);
    const pres = escolher(rng, B, (a) => a.wPress);
    const pProg = probDuelo(port.prog + termo, pres.press) + (D.base_progressao - 0.5);
    if (rng.next() >= pProg) {
      est[t].progressoesPerdidas++;
      if (NOVE.has(port.papel)) est[t].perdasDoNove++;
      emitir({ min, tipo: 'duelo', equipa: t, jogador: port.j, outro: pres.j, x: X(port.x + 10 * dir * 0), y: port.y, info: 'progressão perdida' });
      // Falta do defensor ao ganhar o duelo?
      if (rng.chance(D.falta_por_duelo * (pres.agr / 10))) {
        est[o].faltas++;
        emitir({ min, tipo: 'falta', equipa: o, jogador: pres.j, outro: port.j, x: X(port.x), y: port.y });
        if (rng.chance(D.amarelo_por_falta)) { est[o].amarelos++; emitir({ min, tipo: 'cartao', equipa: o, jogador: pres.j, x: X(port.x), y: port.y, info: 'amarelo' }); }
      }
      // Remate de longe apressado.
      if (rng.chance(D.remate_apos_falha)) rematar('longe', escolher(rng, A, (a) => a.rld * (a.wFin + 0.2)), undefined);
      continue;
    }
    est[t].progressoesGanhas++;
    emitir({ min, tipo: 'passe', equipa: t, jogador: port.j, x: X(55), y: port.y, info: 'progressão' });
    // 1b. Penetração no último terço (drible/velocidade contra marcação/posicionamento).
    const pen = escolher(rng, A, (a) => a.wCria + 0.5 * a.wFin);
    const def = escolher(rng, B, (a) => a.wMarc + 0.3 * a.wPress);
    if (rng.next() >= probDuelo(pen.pen + termo, def.marc) + (D.base_penetracao - 0.5)) {
      emitir({ min, tipo: 'duelo', equipa: t, jogador: pen.j, outro: def.j, x: X(68), y: pen.y, info: 'penetração travada' });
      if (rng.chance(D.remate_apos_falha)) rematar('longe', escolher(rng, A, (a) => a.rld * (a.wFin + 0.2)), undefined);
      continue;
    }
    // 2. Criação.
    const criador = escolher(rng, A, (a) => a.wCria, undefined);
    const marcador = escolher(rng, B, (a) => a.wMarc);
    const pCria = probDuelo(criador.cria + termo, marcador.marc) + (D.base_criacao - 0.5);
    let criou = rng.next() < pCria;
    // Tabelinha com o falso 9 (se houver um adequado): segunda tentativa de criação.
    if (!criou && sin[t] > 0 && rng.chance(SINERGIA_FALSO9.tabelinha * sin[t])) {
      const nove = A.find((a) => a.papel === F9 && a.ativo)!;
      emitir({ min, tipo: 'passe', equipa: t, jogador: criador.j, outro: nove.j, x: X(72), y: 50, info: 'tabelinha com o falso 9' });
      criou = rng.next() < probDuelo(nove.cria + termo, marcador.marc) + (D.base_criacao - 0.5);
    }
    if (!criou) {
      emitir({ min, tipo: 'duelo', equipa: t, jogador: criador.j, outro: marcador.j, x: X(75), y: criador.y, info: 'criação travada' });
      if (rng.chance(D.falta_por_duelo * (marcador.agr / 10))) {
        est[o].faltas++;
        if (rng.chance(D.falta_na_area)) {
          est[t].penaltis++;
          emitir({ min, tipo: 'penalti', equipa: t, jogador: criador.j, outro: marcador.j, x: X(88), y: 50 });
          rematar('penalti', [...A].filter((a) => a.ativo && a.slot > 0).sort((a, b) => b.fin - a.fin)[0], undefined);
          continue;
        }
        if (rng.chance(D.amarelo_por_falta)) { est[o].amarelos++; emitir({ min, tipo: 'cartao', equipa: o, jogador: marcador.j, x: X(75), y: criador.y, info: 'amarelo' }); }
        // Livre perigoso.
        if (rng.chance(0.3)) rematar('livre', [...A].filter((a) => a.ativo && a.slot > 0).sort((a, b) => b.bpa - a.bpa)[0], undefined);
        continue;
      }
      if (rng.chance(D.canto_por_ataque_falhado)) {
        est[t].cantos++;
        emitir({ min, tipo: 'canto', equipa: t, x: X(100), y: rng.chance(0.5) ? 0 : 100 });
        rematar('canto', escolher(rng, A, (a) => a.cab), undefined);
      }
      continue;
    }
    est[t].ocasioesCriadas++;
    // 3. Remate.
    const u = rng.next();
    const tipo = u < D.ocasioes.grande.p ? 'grande' : u < D.ocasioes.grande.p + D.ocasioes.normal.p ? 'normal' : 'longe';
    const remata = tipo === 'longe' ? escolher(rng, A, (a) => a.rld * (a.wFin + 0.3), criador) : escolher(rng, A, (a) => a.wFin, criador);
    rematar(tipo, remata, criador);

    function rematar(tipoR: string, quem: Actor, assist?: Actor) {
      let xg: number;
      let ataque: number;
      if (tipoR === 'penalti') { xg = D.penalti_xg; ataque = (quem.fin + quem.bpa) / 2; }
      else if (tipoR === 'canto') { xg = D.xg_canto[0] + rng.next() * (D.xg_canto[1] - D.xg_canto[0]); ataque = quem.cab; }
      else if (tipoR === 'livre') { xg = 0.04 + rng.next() * 0.04; ataque = quem.bpa; }
      else {
        const oc = D.ocasioes[tipoR as 'grande' | 'normal' | 'longe'];
        xg = oc.xg[0] + rng.next() * (oc.xg[1] - oc.xg[0]);
        ataque = tipoR === 'longe' ? quem.rld : quem.fin;
      }
      // Duelo finalizador contra o guarda-redes: ajuste moderado (±30% no máximo).
      const ajuste = clamp((probDuelo(ataque, gr(o).gk) - 0.5) * 2, -1, 1) * D.ajuste_gr_max;
      if (tipoR !== 'penalti') xg = clamp(xg * (1 + ajuste), 0.01, 0.95);
      est[t].remates++;
      est[t].xg += xg;
      if (tipoR === 'grande') est[t].grandesOcasioes++;
      if (INTERIORES.has(quem.papel)) est[t].rematesInteriores++;
      const golo = rng.next() < xg;
      if (golo || rng.chance(0.42)) est[t].aBaliza++;
      emitir({ min, tipo: 'remate', equipa: t, jogador: quem.j, outro: assist?.j, x: X(tipoR === 'longe' ? 72 : 88), y: quem.y, info: tipoR, xg: Math.round(xg * 100) / 100 });
      if (golo) {
        golos[t]++;
        est[t].golos++;
        marcadores.push({ equipa: t, jogador: quem.j, min, assist: assist && tipoR !== 'penalti' ? assist.j : undefined });
        emitir({ min, tipo: 'golo', equipa: t, jogador: quem.j, outro: assist?.j, x: X(97), y: 50, info: tipoR });
      }
    }
  }
  emitir({ min: 90, tipo: 'fim', equipa: 0, x: 50, y: 50 });
  const tp = est[0].posses + est[1].posses;
  return {
    golos, remates: [est[0].remates, est[1].remates], xg: [est[0].xg, est[1].xg],
    posse: [Math.round((100 * est[0].posses) / tp), Math.round((100 * est[1].posses) / tp)], estat: est, eventos: ev, marcadores,
  };
}
