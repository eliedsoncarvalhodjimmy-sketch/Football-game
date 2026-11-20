// Motor 2D táctico — jogadas-padrão por estilo (secção 11). Não são guiões: quando o gatilho aparece, a jogada sobe
// durante uns segundos os pesos de certas acções sem bola (por grupo de lugar), de certas opções do portador e dos passes
// para certos colegas. Se a situação deixar de servir (perde-se/ganha-se a bola), é abandonada.
import { JOGADAS, type Jogada, type GrupoLugar } from '../../config/match2d/fase5.ts';
import { CAMPO_2D, TICK_S } from '../../config/match2d/fisica.ts';
import { aleatorio } from '../decision/rng.ts';
import { paraEquipa, dist } from './referencial.ts';
import type { Estado2D, Jogador2D, Equipa } from './tipos.ts';

const C = CAMPO_2D, MEIO = C.largura / 2;
const POR_ID = new Map(JOGADAS.map((j) => [j.id, j]));

export function grupo(chave: string): GrupoLugar | null {
  if (/^DC/.test(chave)) return 'DC';
  if (/^(DD|DE|AD|AE)$/.test(chave)) return 'LAT';
  if (/^MDC/.test(chave)) return 'MDC';
  if (/^MC/.test(chave)) return 'MC';
  if (chave === 'MO') return 'MO';
  if (/^(ED|EE|MD|ME)$/.test(chave)) return 'EXT';
  if (/^PL/.test(chave)) return 'PL';
  return null;
}

/** Jogada activa da equipa (ou null). */
export function jogadaActiva(s: Estado2D, e: Equipa): Jogada | null {
  const a = s.equipas[e].jogada;
  return a && s.tick < a.ate ? POR_ID.get(a.id) ?? null : null;
}

/** Peso extra de uma acção sem bola para j (1 sem jogada). */
export function pesoJogadaAccao(s: Estado2D, j: Jogador2D, accao: string): number {
  const jg = jogadaActiva(s, j.equipa), g = grupo(j.chave);
  return (jg && g && jg.accoes?.[g]?.[accao]) || 1;
}

/** Peso extra de uma opção do portador (e do receptor do passe). */
export function pesoJogadaOpcao(s: Estado2D, e: Equipa, tipo: string, receptor?: Jogador2D): number {
  const jg = jogadaActiva(s, e);
  if (!jg) return 1;
  const g = receptor ? grupo(receptor.chave) : null;
  return (jg.opcoes?.[tipo] ?? 1) * ((g && jg.receptores?.[g]) || 1);
}

/** Contexto para os gatilhos. */
export interface ContextoJogada { passeAtrasAdv: boolean; bolaLongaNoAr: boolean }

/** O gatilho de cada jogada (secção 11), para a equipa e. */
function gatilho(id: string, s: Estado2D, e: Equipa, cx: ContextoJogada): boolean {
  const eq = s.equipas[e], adv = s.equipas[e === 0 ? 1 : 0], comBola = s.posse === e;
  const dono = s.bola.dono ? s.jogadores.find((j) => j.id === s.bola.dono) ?? null : null;
  const b = paraEquipa(e, s.bola.p), largo = Math.abs(b.y - MEIO);
  const g = dono ? grupo(dono.chave) : null, meu = !!dono && dono.equipa === e, deles = !!dono && dono.equipa !== e;
  const advPerto = (r: number) => s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR' && dist(o.p, s.bola.p) < r).length;
  const trans = eq.fase === 'TRANS_DEF_ATQ';
  switch (id) {
    case 'saida_3': return meu && (dono!.chave === 'GR' || g === 'DC') && b.x < 30 && advPerto(30) >= 2;
    case 'terceiro_homem': return meu && (g === 'MC' || g === 'MDC') && s.jogadores.some((p) => p.equipa === e && grupo(p.chave) === 'PL' && s.jogadores.some((o) => o.equipa !== e && dist(o.p, p.p) < 3));
    case 'atrair_mudar': return meu && b.x > 35 && s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR' && Math.sign(paraEquipa(e, o.p).y - MEIO) === Math.sign(b.y - MEIO) && dist(o.p, s.bola.p) < 25).length >= 4;
    case 'tabela_area': return meu && (g === 'MO' || g === 'EXT' || g === 'PL') && b.x > 75 && b.x < 90 && largo < 18;
    case 'recuperar_atacar': return comBola && trans && eq.xRecuperacao > C.comprimento - 40;
    case 'armadilha_linha': return deles && g === 'LAT' && largo > MEIO - 8;
    case 'pressao_passe_atras': return deles && cx.passeAtrasAdv && (g === 'DC' || dono!.chave === 'GR');
    case 'profundidade_imediata': return comBola && trans && eq.xRecuperacao < C.comprimento / 2;
    case 'saida_extremo': return comBola && trans && largo > 18;
    case 'isca_explosao': return !comBola && s.jogadores.filter((o) => o.equipa !== e && paraEquipa(o.equipa, o.p).x > C.comprimento / 2).length >= 7;
    case 'alivio_orientado': return comBola && trans && b.x < 35;
    case 'marcar_libertar': return deles && b.x < 37 && largo > 14;
    case 'bola_pivo': return meu && b.x < C.comprimento / 2 && eq.fase === 'ATQ_CONSTRUCAO';
    case 'segunda_bola': return cx.bolaLongaNoAr && s.bola.equipaUltima === e;
    case 'costas_linha': return meu && adv.bloco.linhaDefX > 40;
    case 'sobreposicao': return meu && g === 'EXT' && largo > 16 && b.x > 50;
    case 'segundo_poste': return meu && b.x > 70 && largo > 14;
    case 'linha_fundo': return meu && (g === 'EXT' || g === 'LAT') && b.x > 76 && largo > 10;
    case 'mudanca_flanco': return meu && Math.abs(adv.bloco.centroY - MEIO) > 6;
    case 'central_sobe': return meu && g === 'DC' && b.x < 50 && advPerto(10) === 0;
    case 'rotacao_ala': return meu && g === 'EXT' && advPerto(2.5) > 0;
    case 'falso9_invasao': return meu && g === 'PL' && b.x > 55 && b.x < 80;
    case 'fechar_saltar': return deles && (g === 'MC' || g === 'MO' || g === 'MDC') && largo < 12 && b.x > 35 && b.x < 65;
    case 'saida_3_passes': return comBola && trans && b.x < 35;
    case 'empurrar_fora': return deles && largo < 12 && b.x > 40 && b.x < 70;
    default: return false;
  }
}

/** Avalia as jogadas da equipa e (a cada 0,5 s): termina a activa se deixou de servir; activa uma nova no início de um
 *  gatilho (uma vez por gatilho, com a probabilidade da jogada). Devolve a jogada activada, se houver. */
export function avaliarJogadas(s: Estado2D, e: Equipa, cx: ContextoJogada, semente: string, antes: Set<string>): Jogada | null {
  const eq = s.equipas[e];
  const act = jogadaActiva(s, e);
  if (act && (act.comBola ? s.posse !== e : s.posse === e)) eq.jogada = null;
  else if (!act && eq.jogada) eq.jogada = null;
  const agora = new Set<string>();
  let nova: Jogada | null = null;
  for (const jg of JOGADAS) {
    if (!jg.estilos.includes(eq.estilo)) continue;
    if (!gatilho(jg.id, s, e, cx)) continue;
    agora.add(jg.id);
    if (antes.has(jg.id) || eq.jogada || nova) continue;
    if (aleatorio(`${semente}|jogada|${e}|${jg.id}|${s.tick}`) < jg.prob) nova = jg;
  }
  antes.clear(); for (const k of agora) antes.add(k);
  if (nova) eq.jogada = { id: nova.id, ate: s.tick + Math.round(nova.duracao_s / TICK_S), desde: s.tick };
  return nova;
}

/** Linha defensiva: ajuste da jogada activa (m). */
export function linhaJogada(s: Estado2D, e: Equipa): number {
  return jogadaActiva(s, e)?.linha_m ?? 0;
}
