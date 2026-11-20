// Motor 2D táctico — apresentação por lances (secção 2.2, modelo FM). O motor simula os 90 minutos em tempo real; aqui
// escolhe-se o que se mostra: cada posse recebe uma pontuação de importância, o lance começa antes do momento-chave e
// acaba depois dele, e três níveis (Lances-chave, Alargados, Jogo completo) decidem o que entra. Entre lances o jogo
// passa em avanço rápido (16×). Lógica pura: funciona sobre o registo de eventos e de posses de um Motor2D.
import { LANCES as L } from '../../config/match2d/fase5.ts';
import { TICK_S } from '../../config/match2d/fisica.ts';
import type { Evento2D, Posse2D, Equipa } from './tipos.ts';

export type NivelLances = 'chave' | 'alargados' | 'completo';
export type Prioridade = 'sempre' | 'alta' | 'media' | 'corrido';

export interface Lance {
  inicio: number; fim: number; momento: number; equipa: Equipa;
  prioridade: Prioridade; tipo: string; pontos: number;
  /** Replay a 0,5× (golos): o intervalo de ticks repetido. */
  replay?: { inicio: number; fim: number };
}

export interface Seleccao { lances: Lance[]; duracao_s: number; mostrado_s: number; corrido_s: number }

const T = (s: number) => Math.round(s / TICK_S);

/** Candidatos: um por posse (o momento mais importante dela) e as posses de construção para o jogo corrido. */
export function candidatos(registo: Evento2D[], posses: Posse2D[], ate = Infinity): Lance[] {
  const out: Lance[] = [];
  let k = 0;
  const P = L.pontos;
  for (const p of posses) {
    if (p.inicio >= ate) break;
    const fim = Math.min(p.fim, ate);
    // Eventos da posse (com uma folga de 1 s: o golo e a defesa chegam depois do último toque).
    while (k < registo.length && registo[k].tick < p.inicio) k++;
    const evs: Evento2D[] = [];
    for (let i = k; i < registo.length && registo[i].tick <= fim + T(1); i++) evs.push(registo[i]);
    let melhor: { e: Evento2D; pr: Prioridade; tipo: string; pts: number } | null = null;
    const propor = (e: Evento2D, pr: Prioridade, tipo: string, pts: number) => { if (!melhor || pts > melhor.pts) melhor = { e, pr, tipo, pts }; };
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      switch (e.tipo) {
        case 'golo': propor(e, 'sempre', 'golo', P.golo); break;
        case 'penalti': propor(e, 'sempre', 'penalti', P.penalti); break;
        case 'expulsao': propor(e, 'sempre', 'vermelho', P.vermelho); break;
        case 'cartao': if (e.subtipo === 'AMARELO') propor(e, 'media', 'amarelo', P.amarelo); break;
        case 'remate': {
          const xg = e.previsto ?? 0;
          if (e.subtipo === 'LIVRE') propor(e, 'alta', 'livre_directo', P.livre_directo);
          else if (xg >= L.xg_alto) propor(e, 'alta', 'remate_perigoso', P.remate_perigoso + 40 * xg);
          const defesa = evs.slice(i + 1, i + 4).find((x) => x.tipo === 'defesa' && x.tick - e.tick < T(2));
          if (defesa && xg >= L.xg_defesa) propor(e, 'alta', 'defesa_dificil', P.defesa_dificil + 20 * xg);
          else if (defesa) propor(e, 'media', 'remate_enquadrado', P.remate_enquadrado);
          break;
        }
        case 'cruzamento': if (evs.slice(i + 1, i + 3).some((x) => x.tipo === 'cabeceamento' && x.equipa === e.equipa)) propor(e, 'media', 'cruzamento_perigoso', P.cruzamento_perigoso); break;
        case 'desarme': {
          // Corte na própria área (x absoluto perto da baliza de quem desarma).
          const xd = e.equipa === 0 ? e.x : 105 - e.x;
          if (xd < 16.5) propor(e, 'media', 'corte_area', P.corte_area);
          break;
        }
        case 'reposicao': if (isCanto(e)) propor(e, 'media', 'canto', P.canto); break;
      }
    }
    // Contra-ataque que chega à área.
    // Contra-ataque: recupera no próprio meio-campo e chega à área com remate ou cruzamento em poucos segundos.
    if (p.recuperacao && p.xMax > 88 && p.xInicio < L.contra_x && (!melhor || (melhor as { pts: number }).pts < P.contra_ataque)) {
      const e = evs.find((x) => x.equipa === p.equipa && (x.tipo === 'remate' || x.tipo === 'cruzamento') && x.tick - p.inicio <= T(L.contra_s));
      if (e) propor(e, 'alta', 'contra_ataque', P.contra_ataque);
    }
    const m = melhor as { e: Evento2D; pr: Prioridade; tipo: string; pts: number } | null;
    if (m) {
      const golo = m.tipo === 'golo';
      const bolaParada = m.tipo === 'canto' || m.tipo === 'livre_directo' || m.tipo === 'penalti';
      const antes = bolaParada ? L.antes_bola_parada : L.antes_max;
      const inicio = Math.max(m.e.tick - T(antes), Math.min(p.inicio - T(1), m.e.tick - T(L.antes_min)));
      const lance: Lance = { inicio: Math.max(0, inicio), fim: m.e.tick + T(golo ? L.depois_golo : L.depois), momento: m.e.tick, equipa: m.e.equipa, prioridade: m.pr, tipo: m.tipo, pontos: m.pts };
      if (golo) lance.replay = { inicio: m.e.tick - T(L.replay_s), fim: m.e.tick + T(1) };
      out.push(lance);
    } else if (p.passes >= L.corrido_passes) {
      out.push({ inicio: p.inicio, fim: Math.min(fim, p.inicio + T(L.corrido_max_s)), momento: p.inicio, equipa: p.equipa, prioridade: 'corrido', tipo: 'construcao', pontos: p.passes });
    }
  }
  return out;
}

function isCanto(rep: Evento2D) {
  // A reposição de um canto é feita junto à bandeirola (x perto de 0 ou 105, y perto de 0 ou 68).
  return (rep.x < 2 || rep.x > 103) && (rep.y < 2 || rep.y > 66);
}

/** Entre lances: avanço rápido no campo (16×) ou só relato (salta, uns segundos por intervalo). */
export type EntreLances = 'avanco' | 'relato';
export const ENTRE_POR_NIVEL: Record<NivelLances, EntreLances> = { chave: 'relato', alargados: 'avanco', completo: 'avanco' };

/** Duração a 1× (s): lances + replays + o resto do intervalo [t0, t1] em avanço rápido (ou só relato). */
export function duracao(lances: Lance[], t0 = 0, t1 = T(90 * 60), entre: EntreLances = 'avanco'): { duracao_s: number; mostrado_s: number; corrido_s: number } {
  let mostrado = 0, corrido = 0, replay = 0;
  for (const l of lances) {
    const d = (l.fim - l.inicio) * TICK_S;
    mostrado += d;
    if (l.prioridade === 'corrido') corrido += d;
    if (l.replay) replay += ((l.replay.fim - l.replay.inicio) * TICK_S) / L.replay_vel;
  }
  const resto = Math.max(0, (t1 - t0) * TICK_S - mostrado);
  const entreS = entre === 'avanco' ? resto / L.avanco_rapido : (lances.length + 1) * L.relato_s;
  return { duracao_s: mostrado + replay + entreS, mostrado_s: mostrado + replay, corrido_s: corrido };
}

/** Junta lances que se sobrepõem (fica a prioridade e o momento do mais importante). */
function juntar(lances: Lance[]): Lance[] {
  const o = [...lances].sort((a, b) => a.inicio - b.inicio), out: Lance[] = [];
  for (const l of o) {
    const u = out[out.length - 1];
    if (u && l.inicio <= u.fim) {
      const princ = l.pontos > u.pontos && u.prioridade !== 'sempre' ? l : u;
      out[out.length - 1] = { ...princ, inicio: u.inicio, fim: Math.max(u.fim, l.fim), replay: u.replay ?? l.replay, prioridade: princ.prioridade === 'corrido' && (u.prioridade !== 'corrido' || l.prioridade !== 'corrido') ? (princ === u ? l.prioridade : u.prioridade) : princ.prioridade };
    } else out.push({ ...l });
  }
  return out;
}

/**
 * Escolhe os lances do intervalo [t0, t1] (ticks) para o nível. "Alargados" cumpre o orçamento (15 min a 1× para 90 min,
 * proporcional para um bloco): primeiro tudo o que é sempre/alta/média mais 1 jogo corrido por janela de 7 min; se passar
 * do orçamento corta os de prioridade média menos importantes; se faltar, acrescenta jogo corrido.
 */
export function seleccionar(cands: Lance[], nivel: NivelLances, t0 = 0, t1 = T(90 * 60), alvoS?: number): Seleccao {
  const dentro = cands.filter((l) => l.momento >= t0 && l.momento < t1);
  if (nivel === 'completo') {
    const l: Lance = { inicio: t0, fim: t1, momento: t0, equipa: 0, prioridade: 'corrido', tipo: 'jogo_completo', pontos: 0 };
    return { lances: [l], ...duracao([l], t0, t1) };
  }
  let base = dentro.filter((l) => l.prioridade === 'sempre' || l.prioridade === 'alta' || (nivel === 'alargados' && l.prioridade === 'media'));
  if (nivel === 'chave') { const lances = juntar(base); return { lances, ...duracao(lances, t0, t1, 'relato') }; }
  // Jogo corrido obrigatório: a mais longa de cada janela.
  const corridos = dentro.filter((l) => l.prioridade === 'corrido').sort((a, b) => b.pontos - a.pontos);
  const jan = T(L.corrido_janela_s), escolhidos = new Set<Lance>();
  for (let a = t0; a < t1; a += jan) {
    const c = corridos.find((l) => l.momento >= a && l.momento < a + jan);
    if (c) escolhidos.add(c);
  }
  const alvo = alvoS ?? (L.orcamento_min * 60 * (t1 - t0)) / T(90 * 60), tol = (L.tolerancia_min * 60 * (t1 - t0)) / T(90 * 60);
  let lances = juntar([...base, ...escolhidos]);
  // Acima do orçamento: corta os de prioridade média, do menos importante para o mais.
  const medias = base.filter((l) => l.prioridade === 'media').sort((a, b) => a.pontos - b.pontos);
  while (duracao(lances, t0, t1).duracao_s > alvo && medias.length) {
    const fora = medias.shift()!;
    base = base.filter((l) => l !== fora);
    lances = juntar([...base, ...escolhidos]);
  }
  // Ainda acima: corta os de prioridade alta menos importantes (nunca os "sempre").
  const altas = base.filter((l) => l.prioridade === 'alta').sort((a, b) => a.pontos - b.pontos);
  while (duracao(lances, t0, t1).duracao_s > alvo + tol / 2 && altas.length) {
    const fora = altas.shift()!;
    base = base.filter((l) => l !== fora);
    lances = juntar([...base, ...escolhidos]);
  }
  // Jogo corrido mínimo (secção 2.2: ≥ 20% do mostrado): acrescenta construção e, para caber no orçamento, corta os
  // lances de prioridade média menos importantes.
  const quota = () => { const d = duracao(lances, t0, t1); return d.mostrado_s > 0 ? d.corrido_s / d.mostrado_s : 1; };
  for (const c of corridos) {
    if (quota() >= L.corrido_min) break;
    if (escolhidos.has(c)) continue;
    escolhidos.add(c);
    lances = juntar([...base, ...escolhidos]);
    while (duracao(lances, t0, t1).duracao_s > alvo + tol && medias.length) {
      const fora = medias.shift()!;
      base = base.filter((l) => l !== fora);
      lances = juntar([...base, ...escolhidos]);
    }
  }
  // Abaixo: acrescenta jogo corrido (os de mais passes).
  for (const c of corridos) {
    if (duracao(lances, t0, t1).duracao_s >= alvo - tol) break;
    if (escolhidos.has(c)) continue;
    escolhidos.add(c);
    lances = juntar([...base, ...escolhidos]);
  }
  return { lances, ...duracao(lances, t0, t1) };
}
