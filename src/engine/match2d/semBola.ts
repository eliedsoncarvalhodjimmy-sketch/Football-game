// Camada 4 (secção 6): acções sem bola. Cada jogador pontua as acções permitidas ao seu papel:
//   pontuação(acção) = pesoPapel × pesoEstilo × pesoFase × utilidade(acção, situação) × atributoFactor
// e escolhe a melhor com compromisso (decide a cada 0,33–0,66 s, mantém ≥ 1 s, só troca se ≥ 1,25×). A coordenação
// faz-se por ordem: só os mais próximos pressionam (até ao limite do estilo), o seguinte cobre, no máximo 2 atacam a
// profundidade e um mínimo fica em equilíbrio defensivo.
import { SEM_BOLA as SB, PESO_PAPEL, PESO_ESTILO, PESO_FASE, ATRIBUTOS_SEM_BOLA, ESTADO_JOGO, TRANSICAO, MARCAS } from '../../config/match2d/fase3.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { melhorApoio, desvioMaximo } from './apoio.ts';
import { ameaca } from './passe.ts';
import { linhaForaDeJogo } from './bloco.ts';
import { paraEquipa, paraAbsoluto, dist, hyp } from './referencial.ts';
import type { AccaoSemBola, Equipa, Estado2D, Jogador2D, V2 } from './tipos.ts';

const C = CAMPO_2D;
const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
const dentro = (p: V2, m = 2): V2 => ({ x: Math.max(m, Math.min(C.comprimento - m, p.x)), y: Math.max(m, Math.min(C.largura - m, p.y)) });

/** O que a equipa sabe num tick (calculado uma vez por equipa). */
export interface ContextoEquipa {
  e: Equipa; comPosse: boolean;
  /** Portador de referência (a nossa bola: o portador ou o receptor do passe no destino; a deles: o mesmo do lado deles). */
  ref: Jogador2D | null; refP: V2 | null;
  /** Ordem dos jogadores de campo por distância à bola (para pressão e cobertura). */
  ordemBola: string[];
  /** Quantos estão em cada acção agora. */
  contagem: Partial<Record<AccaoSemBola, number>>;
  /** Linha do fora de jogo (no nosso referencial), x médio das linhas de defesas e médios adversários. */
  foraDeJogo: number; linhaDefAdv: number; linhaMedAdv: number;
  /** Os N mais recuados (âncora), para o equilíbrio defensivo; e a posição da bola no nosso referencial. */
  maisRecuados: string[]; bola: V2;
  /** Portador com tempo, de frente e com visão (para a profundidade). */
  portadorPronto: boolean;
  /** Zona de cruzamento (a nossa bola larga no último terço). */
  bolaCruzamento: boolean;
  /** Receptores perigosos do adversário (para fechar linhas de passe). */
  perigosos: Jogador2D[];
  /** Pressão: distância de activação (com contrapressão) e máximo de pressionantes. */
  dAct: number; maxPress: number;
  /** Gatilhos de pressão activos. */
  gatilhos: number;
}

export function contextoEquipa(s: Estado2D, e: Equipa, gatilhosExtra: { passeAtras: boolean; mauToque: boolean }): ContextoEquipa {
  const eq = s.equipas[e], P = ESTILOS_2D[eq.estilo], b = s.bola;
  let ref: Jogador2D | null = b.dono ? s.jogadores.find((o) => o.id === b.dono) ?? null : null, refP = ref?.p ?? null;
  if (!ref && b.passe) { ref = s.jogadores.find((o) => o.id === b.passe!.para) ?? null; refP = b.passe.destino; }
  const comPosse = s.posse === e;
  const bolaP = refP ?? b.p;
  const meus = s.jogadores.filter((o) => o.equipa === e);
  const campo = meus.filter((o) => o.chave !== 'GR');
  const ordemBola = [...campo].sort((a, c) => dist(a.p, bolaP) - dist(c.p, bolaP)).map((o) => o.id);
  const contagem: Partial<Record<AccaoSemBola, number>> = {};
  for (const o of meus) contagem[o.accao] = (contagem[o.accao] ?? 0) + 1;
  const advT = s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR').map((o) => paraEquipa(e, o.p).x).sort((a, c) => c - a);
  const linhaDefAdv = advT.slice(0, 4).reduce((a, x) => a + x, 0) / Math.max(1, Math.min(4, advT.length));
  const linhaMedAdv = advT.slice(4, 8).reduce((a, x) => a + x, 0) / Math.max(1, Math.min(4, advT.length - 4));
  // Estado do jogo: a ganhar ficam mais atrás da bola; a perder, menos.
  const nEq = Math.max(1, Math.min(8, P.equilibrioMinimo + Math.round(-eq.mentalidade * ESTADO_JOGO.equilibrio)));
  const maisRecuados = [...campo].sort((a, c) => paraEquipa(e, a.ancora).x - paraEquipa(e, c.ancora).x).slice(0, nEq).map((o) => o.id);
  const bolaT = paraEquipa(e, bolaP);
  let portadorPronto = false;
  if (comPosse && ref && b.dono === ref.id) {
    const livre = !s.jogadores.some((o) => o.equipa !== e && dist(o.p, ref!.p) < SB.profundidade_tempo_m);
    const frente = Math.cos(ref.corpo - (e === 0 ? 0 : Math.PI)) > 0.5;
    portadorPronto = livre && frente && at(ref, 'vis') >= SB.profundidade_visao;
  }
  const bolaCruzamento = comPosse && bolaT.x > 68 && Math.abs(bolaT.y - C.largura / 2) > 14;
  // Perigosos do adversário: quem o portador deles pode servir com mais ameaça (no referencial deles).
  const perigosos = !comPosse && ref ? s.jogadores.filter((o) => o.equipa !== e && o !== ref && o.chave !== 'GR' && dist(o.p, bolaP) < 32)
    .sort((a, c) => ameaca(paraEquipa(c.equipa, c.p)) - ameaca(paraEquipa(a.equipa, a.p))).slice(0, 4) : [];
  const tFase = (s.tick - eq.faseDesde) * 0.1;
  const contra = eq.fase === 'TRANS_ATQ_DEF' && tFase < P.contrapressaoS;
  // Perto da própria baliza qualquer estilo sai ao portador (secção 9.3: defender a área).
  const perigoBaliza = bolaT.x < SB.perigo_x ? SB.perigo_extra * (1 - bolaT.x / SB.perigo_x) : 0;
  // Gegenpressen: o desgaste cobra-se depois do minuto 65 (pressão mais curta e menos coordenada).
  const fadiga = eq.estilo === 'gegenpressen' && s.tick * 0.1 > MARCAS.fadiga_min * 60;
  // Estado do jogo: a perder pressiona-se mais longe e com mais gente (não se deixa o adversário guardar a bola atrás).
  const arriscar = Math.max(0, eq.mentalidade);
  const dAct = ((contra ? P.pressaoDistancia + SB.contrapressao_extra : P.pressaoDistancia) + perigoBaliza + arriscar * ESTADO_JOGO.pressao_m) * (fadiga ? MARCAS.fadiga_alcance : 1);
  const maxPress = Math.max(1, (contra ? P.pressionantes[1] : P.pressionantes[0]) - (fadiga ? 1 : 0) + (eq.mentalidade > 0.5 ? ESTADO_JOGO.pressionantes_extra : 0));
  // Gatilhos (secção 9.2): passe para trás, de costas para a baliza dele, mau toque, junto à linha, fraco tecnicamente.
  let gatilhos = 0;
  if (!comPosse && ref && b.dono === ref.id) {
    const g = SB.gatilho, deCostas = Math.cos(ref.corpo - (ref.equipa === 0 ? 0 : Math.PI)) < -0.3;
    if (gatilhosExtra.passeAtras) gatilhos += g.passe_atras;
    if (deCostas) gatilhos += g.de_costas;
    if (gatilhosExtra.mauToque) gatilhos += g.mau_toque;
    if (Math.abs(ref.p.y - C.largura / 2) > C.largura / 2 - 6) gatilhos += g.linha_lateral;
    if (at(ref, 'tec') < 10) gatilhos += g.fraco_tecnica;
  }
  return { e, comPosse, ref, refP, ordemBola, contagem, foraDeJogo: linhaForaDeJogo(s, e), linhaDefAdv, linhaMedAdv, maisRecuados, bola: bolaT,
    portadorPronto, bolaCruzamento, perigosos, dAct, maxPress, gatilhos };
}

const peso = (s: Estado2D, j: Jogador2D, a: AccaoSemBola) => {
  const eq = s.equipas[j.equipa];
  return (PESO_PAPEL[j.papel]?.[a] ?? 1) * (PESO_ESTILO[eq.estilo]?.[a] ?? 1) * (PESO_FASE[eq.fase]?.[a] ?? 1);
};
const factorAttr = (j: Jogador2D, a: AccaoSemBola) => { const l = ATRIBUTOS_SEM_BOLA[a]; return 0.7 + (0.03 * l.reduce((x, k) => x + at(j, k), 0)) / l.length; };
const largo = (j: Jogador2D) => /^(DD|DE|AD|AE|ED|EE|ME|MD)$/.test(j.chave);

/** Alvo de pressão: a 1,2 m do portador, do lado que fecha a baliza e a linha de passe mais perigosa (curva). */
export function alvoPressao(s: Estado2D, j: Jogador2D, c: Jogador2D, cP: V2, perigoso: Jogador2D | null): V2 {
  const baliza = { x: j.equipa === 0 ? 0 : C.comprimento, y: C.largura / 2 };
  let ux = baliza.x - cP.x, uy = baliza.y - cP.y; const l = hyp(ux, uy) || 1; ux /= l; uy /= l;
  if (perigoso) { let px = perigoso.p.x - cP.x, py = perigoso.p.y - cP.y; const lp = hyp(px, py) || 1; px /= lp; py /= lp; ux = ux + px * 0.8; uy = uy + py * 0.8; const n = hyp(ux, uy) || 1; ux /= n; uy /= n; }
  void s;
  return { x: cP.x + ux * SB.pressao_aproximacao_m, y: cP.y + uy * SB.pressao_aproximacao_m };
}

/** Alvo de cobertura: 5–8 m atrás e ao lado de quem pressiona (entre ele e a baliza, puxado para o meio). */
export function alvoCobertura(j: Jogador2D, pressor: V2): V2 {
  const baliza = { x: j.equipa === 0 ? 0 : C.comprimento, y: C.largura / 2 };
  const l = dist(baliza, pressor) || 1;
  return dentro({ x: pressor.x + ((baliza.x - pressor.x) / l) * SB.cobrir_m, y: pressor.y + ((baliza.y - pressor.y) / l) * SB.cobrir_m + (pressor.y < C.largura / 2 ? 2 : -2) });
}

/** Alvo de marcação: a 1,5 m do adversário, entre ele e a baliza mas puxado para o lado da bola (vê a bola e o homem,
 *  corta o passe para ele). */
export function alvoMarcacao(j: Jogador2D, o: Jogador2D, bola?: V2): V2 {
  const baliza = { x: j.equipa === 0 ? 0 : C.comprimento, y: C.largura / 2 };
  const l = dist(baliza, o.p) || 1;
  let ux = (baliza.x - o.p.x) / l, uy = (baliza.y - o.p.y) / l;
  if (bola) { const lb = dist(bola, o.p) || 1; ux = ux * (1 - SB.marcar_lado_bola) + ((bola.x - o.p.x) / lb) * SB.marcar_lado_bola; uy = uy * (1 - SB.marcar_lado_bola) + ((bola.y - o.p.y) / lb) * SB.marcar_lado_bola; const n = hyp(ux, uy) || 1; ux /= n; uy /= n; }
  return { x: o.p.x + ux * SB.marcar_m, y: o.p.y + uy * SB.marcar_m };
}

export interface Candidata { a: AccaoSemBola; u: number; alvo: V2 | null; marcado?: string | null }

/** Pontuação de todas as acções permitidas a j agora (sem a coordenação de limites, que se aplica por ordem). */
export function candidatas(s: Estado2D, j: Jogador2D, cx: ContextoEquipa, outrosApoio: V2[]): Candidata[] {
  const out: Candidata[] = [], e = j.equipa, eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
  const anc = paraEquipa(e, j.ancora), pos = paraEquipa(e, j.p);
  const add = (a: AccaoSemBola, util: number, alvo: V2 | null, marcado?: string | null) => {
    const w = peso(s, j, a);
    if (w > 0 && util > 0) out.push({ a, u: w * util * factorAttr(j, a), alvo, marcado });
  };
  add('MANTER_POSICAO', 1, null);
  const lim = desvioMaximo(s, j);
  // Recuperar em sprint na transição ataque→defesa (como nas fases anteriores).
  if (eq.fase === 'TRANS_ATQ_DEF' && dist(j.p, j.ancora) > 10) add('RECUPERAR', 2, null);
  if (cx.comPosse) {
    const ref = cx.ref, refP = cx.refP;
    if (ref && refP && j !== ref) {
      // Apoio: os de âncora mais perto do portador.
      const rank = cx.ordemBola.indexOf(j.id);
      if (dist(j.ancora, refP) < 30 && rank >= 0 && rank < 4) {
        const m = melhorApoio(s, j, { ...ref, p: refP }, outrosApoio);
        if (m) add('OFERECER_APOIO', 0.8 + Math.max(0, Math.min(1.5, m.u)) * 0.5, m.p);
      }
      // Sobreposição: o portador é um colega largo do meu lado e estou atrás dele.
      const rT = paraEquipa(e, refP);
      if (largo(j) && Math.abs(rT.y - anc.y) < 15 && Math.abs(rT.y - C.largura / 2) > 15 && pos.x < rT.x - 2) {
        const yLinha = rT.y < C.largura / 2 ? SB.largura_m : C.largura - SB.largura_m;
        add('SOBREPOSICAO', 1.2, dentro(paraAbsoluto(e, { x: Math.min(rT.x + 10, cx.foraDeJogo - 1), y: yLinha })));
      }
    }
    // Largura: os jogadores das alas encostam à linha, à altura da âncora.
    if (largo(j)) add('DAR_LARGURA', 0.9 + (Math.abs(cx.bola.y - anc.y) > 25 ? 0.3 : 0), paraAbsoluto(e, { x: anc.x, y: anc.y < C.largura / 2 ? SB.largura_m : C.largura - SB.largura_m }));
    // Profundidade: nas costas da linha (com o portador pronto); senão, em linha com o último defensor.
    const espacoAtras = C.comprimento - 6 - cx.foraDeJogo;
    // No máximo 2 a atacar a profundidade ao mesmo tempo (secção 6.2); na transição com "atacar já" sobem 3–4 em sprint;
    // a perder, mais um.
    const transicao = eq.fase === 'TRANS_DEF_ATQ' && P.atacarJa >= 0.6;
    const maxProf = (transicao ? Math.min(TRANSICAO.profundidade_max, P.jogadoresAtaque[0]) : SB.profundidade_max) + (eq.mentalidade > 0.5 ? ESTADO_JOGO.profundidade_extra : 0);
    const nProf = (cx.contagem.ATACAR_PROFUNDIDADE ?? 0) - (j.accao === 'ATACAR_PROFUNDIDADE' ? 1 : 0);
    if (anc.x > cx.bola.x - 5 - (transicao ? 15 : 0) && espacoAtras > 6 && nProf < maxProf) {
      const lane = Math.max(8, Math.min(C.largura - 8, pos.y));
      const [a0, a1] = SB.profundidade_alem_m, alem = a0 + (a1 - a0) * Math.min(1, espacoAtras / 40);
      const pronto = cx.portadorPronto || transicao;
      const alvoT = pronto ? { x: Math.min(C.comprimento - 6, cx.foraDeJogo + alem), y: lane } : { x: cx.foraDeJogo - 0.8, y: lane };
      add('ATACAR_PROFUNDIDADE', (pronto ? 1.1 : 0.55) * (0.7 + at(j, 'vel') / 40) * Math.min(1.3, 0.6 + espacoAtras / 40) * (transicao ? 1 + P.atacarJa * TRANSICAO.profundidade_util : 1), paraAbsoluto(e, alvoT));
    }
    // Apoio frontal: entre as linhas de médios e defesas adversárias.
    const nFrontal = (cx.contagem.APOIO_FRONTAL ?? 0) - (j.accao === 'APOIO_FRONTAL' ? 1 : 0);
    if (cx.linhaDefAdv - cx.linhaMedAdv > 6 && anc.x > cx.bola.x - 15 && nFrontal < SB.frontal_max) {
      const alvoT = { x: (cx.linhaDefAdv + cx.linhaMedAdv) / 2, y: Math.max(C.largura / 2 - 18, Math.min(C.largura / 2 + 18, anc.y)) };
      const alvo = paraAbsoluto(e, alvoT);
      const ocupado = s.jogadores.some((o) => o !== j && o.equipa === e && o.alvoAccao && o.accao !== 'MANTER_POSICAO' && dist(o.alvoAccao, alvo) < SB.frontal_colega_m);
      if (!ocupado && dist(alvo, j.ancora) < lim * 1.2) add('APOIO_FRONTAL', 0.9 + (cx.linhaDefAdv - cx.linhaMedAdv) / 30, alvo);
    }
    // Jogo Directo — segunda bola: com a bola longa no ar, os médios cercam a zona de queda (8–12 m dela).
    const pb = s.bola.passe;
    if (eq.estilo === 'jogo_direto' && pb?.aereo && /^M/.test(j.chave)) {
      const k = s.jogadores.filter((o) => o.equipa === e && /^M/.test(o.chave)).indexOf(j);
      const queda = paraEquipa(e, pb.destino), ang = Math.PI + (k - 1) * 0.7;
      add('OCUPAR_AREA', 1.5, dentro(paraAbsoluto(e, { x: queda.x + Math.cos(ang) * MARCAS.segunda_bola_m, y: queda.y + Math.sin(ang) * MARCAS.segunda_bola_m })));
    }
    // Ocupar a área: bola larga no último terço — as 5 zonas, pela ordem dos melhores no ar.
    if (cx.bolaCruzamento && anc.x > 55) {
      const lado = cx.bola.y < C.largura / 2 ? 1 : -1; // espelha as zonas para o lado da bola
      const cand = s.jogadores.filter((o) => o.equipa === e && o.chave !== 'GR' && !/^(DC|DD|DE|AD|AE)/.test(o.chave) && paraEquipa(e, o.ancora).x > 55)
        .sort((a, c) => at(c, 'cab') + at(c, 'imp') - at(a, 'cab') - at(a, 'imp'));
      const k = cand.indexOf(j);
      if (k >= 0 && k < SB.area_max) {
        const z = SB.zonas_area[k];
        add('OCUPAR_AREA', 1.3, paraAbsoluto(e, { x: z[0], y: C.largura / 2 + (z[1] - C.largura / 2) * -lado }));
      }
    }
    // Equilíbrio defensivo: os mais recuados ficam atrás da bola.
    if (cx.maisRecuados.includes(j.id) && cx.bola.x > SB.equilibrio_bola_x) {
      const alvoT = { x: Math.max(anc.x - SB.equilibrio_recuo_max, Math.min(anc.x, cx.bola.x - SB.equilibrio_atras_m)), y: C.largura / 2 + (anc.y - C.largura / 2) * 0.7 };
      add('EQUILIBRIO_DEFENSIVO', (cx.contagem.EQUILIBRIO_DEFENSIVO ?? 0) < cx.maisRecuados.length ? 2.2 : 1.1, dentro(paraAbsoluto(e, { x: Math.max(8, alvoT.x), y: alvoT.y })));
    }
  } else {
    const c = cx.ref, cP = cx.refP;
    if (c && cP && j.chave !== 'GR') {
      const d = dist(j.p, cP), rank = cx.ordemBola.indexOf(j.id);
      // Pressionar: os mais próximos (até ao limite do estilo), dentro da distância de activação, com os gatilhos.
      const perigo = cx.bola.x < SB.perigo_x ? 1 + (SB.perigo_pressao - 1) * (1 - cx.bola.x / SB.perigo_x) * (rank === 0 ? 1 : 0.5) : 1;
      if (rank >= 0 && rank < cx.maxPress + (perigo > 1.5 ? 1 : 0) && d < cx.dAct) add('PRESSIONAR', ((1 - d / cx.dAct) * 1.6 + 0.4 + cx.gatilhos + Math.max(0, eq.mentalidade) * ESTADO_JOGO.pressao_util) * perigo, alvoPressao(s, j, c, cP, cx.perigosos[0] ?? null));
      // Cobrir: o seguinte.
      if (rank === cx.maxPress && d < cx.dAct + 12) {
        const pressor = s.jogadores.find((o) => o.id === cx.ordemBola[0]);
        if (pressor) add('COBRIR', 1.1, alvoCobertura(j, pressor.p));
      }
      // Fechar linhas de passe: o ponto na linha entre o portador e um receptor perigoso perto da minha zona.
      if (rank >= 0 && rank < cx.maxPress + 1 + SB.fechar_max && d < SB.fechar_raio_m) {
        let melhor: { p: V2; u: number } | null = null;
        for (const r of cx.perigosos) {
          const p = { x: r.p.x + (cP.x - r.p.x) * SB.fechar_fraccao, y: r.p.y + (cP.y - r.p.y) * SB.fechar_fraccao };
          if (dist(p, j.ancora) > lim) continue;
          // Cada linha de passe só é fechada por um.
          if (s.jogadores.some((o) => o !== j && o.equipa === e && o.accao === 'FECHAR_LINHA_PASSE' && o.alvoAccao && dist(o.alvoAccao, p) < 5)) continue;
          const u = 0.8 + 3 * ameaca(paraEquipa(r.equipa, r.p)) - dist(p, j.p) / 30;
          if (!melhor || u > melhor.u) melhor = { p, u };
        }
        if (melhor) add('FECHAR_LINHA_PASSE', melhor.u, melhor.p);
      }
    }
    // Marcar: individual (Catenaccio) ou um atacante na área com a bola no nosso último terço.
    if (j.chave !== 'GR') {
      const individual = P.marcacao === 'individual';
      const alvoM = individual && j.marcado && !s.jogadores.some((o) => o.equipa === e && o !== j && o.marcado === j.marcado && o.accao === 'MARCAR') ? s.jogadores.find((o) => o.id === j.marcado) : null;
      if (alvoM && dist(alvoM.p, j.ancora) < lim * SB.marcar_trela) add('MARCAR', 1.3, alvoMarcacao(j, alvoM), alvoM.id);
      else if (cx.bola.x < SB.marcar_area_bola_x) {
        // Um marcador por atacante: não escolhe quem um colega já marca.
        const jaMarcados = new Set(s.jogadores.filter((o) => o.equipa === e && o !== j && o.accao === 'MARCAR' && o.marcado).map((o) => o.marcado));
        const naArea = s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR' && !jaMarcados.has(o.id) && paraEquipa(e, o.p).x < 18 && Math.abs(paraEquipa(e, o.p).y - C.largura / 2) < 21 && dist(o.p, j.p) < SB.marcar_area_raio_m);
        const o = naArea.sort((a, b) => dist(a.p, j.p) - dist(b.p, j.p))[0];
        if (o) add('MARCAR', 1.4, alvoMarcacao(j, o), o.id);
      }
    }
  }
  return out;
}
