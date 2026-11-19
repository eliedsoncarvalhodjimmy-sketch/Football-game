// Montagem de um estado de jogo para o motor de decisão: 22 jogadores nos lugares da formação (src/config/tacticas.ts),
// bola ao centro, tácticas das duas equipas. Inclui um gerador determinístico de plantéis (para testes, exemplo e
// protótipo), com atributos pelo nível e pela posição.
import { CAMPO } from '../../config/decisao.ts';
import { FORMACAO_POR_ID } from '../../config/tacticas.ts';
import { ATRIBUTOS, type IdAtributo } from '../../config/atributos.ts';
import { PAPEIS, IDX_PAPEL, type Posicao } from '../../config/papeis.ts';
import type { IdEstilo } from '../../config/estilos.ts';
import { mulberry32, hashTexto } from './rng.ts';
import type { MatchState, PlayerState, TeamTactic, Equipa } from './types.ts';

export interface JogadorBase { id: string; name: string; number: number; role: Posicao; attrs: Partial<Record<IdAtributo, number>>; morale?: number; condition?: number }

/** Lugares da formação na ordem do config (GR primeiro). */
export function lugares(formacao: string) {
  const f = FORMACAO_POR_ID[formacao] ?? FORMACAO_POR_ID['4-3-3'];
  return f.lugares.map((l) => ({ role: l.pos, papel: l.papel, slot: { x: l.x / 100, y: l.y / 100 } }));
}

/** Posição de pontapé de saída: a formação comprimida no próprio meio-campo. */
export function posicaoInicial(team: Equipa, slot: { x: number; y: number }) {
  const xEq = 3 + slot.x * 44; // 0–1 → 3–47 m (antes da linha do meio)
  return { x: team === 0 ? xEq : CAMPO.comprimento - xEq, y: (team === 0 ? slot.y : 1 - slot.y) * CAMPO.largura };
}

export function criarEstado(eq: [JogadorBase[], JogadorBase[]], tacticas: [TeamTactic, TeamTactic], inicio: Equipa = 0): MatchState {
  const players: PlayerState[] = [];
  ([0, 1] as Equipa[]).forEach((team) => {
    const ls = lugares(tacticas[team].formation);
    eq[team].slice(0, 11).forEach((j, k) => {
      const l = ls[k] ?? ls[ls.length - 1];
      // A equipa 1 ataca para x = 0: o seu y é espelhado para a mesma "esquerda" relativa à direcção de ataque.
      const slot = { x: l.slot.x, y: team === 0 ? l.slot.y : 1 - l.slot.y };
      players.push({ id: j.id, team, number: j.number, name: j.name, role: j.role, slot, pos: posicaoInicial(team, l.slot), vel: { x: 0, y: 0 },
        attrs: j.attrs, morale: j.morale ?? 60, condition: j.condition ?? 1, yellow: false, onPitch: true });
    });
  });
  // Pontapé de saída: a bola no centro, com o avançado da equipa que começa.
  const pl = players.find((p) => p.team === inicio && p.role === 'PL') ?? players.find((p) => p.team === inicio && p.role !== 'GR')!;
  pl.pos = { x: CAMPO.comprimento / 2 - (inicio === 0 ? 0.5 : -0.5), y: CAMPO.largura / 2 };
  return {
    tick: 0, minute: 0, score: [0, 0], players, tactics: tacticas,
    ball: { pos: { ...pl.pos }, z: 0, vel: { x: 0, y: 0 }, ownerId: pl.id, lastTeam: inicio },
    possessionTeam: inicio, possessionChangeTick: 0, lastShotMinute: [0, 0],
  };
}

export function tactica(style: IdEstilo, formation = '4-3-3', o: Partial<TeamTactic> = {}): TeamTactic {
  return { style, formation, mentality: 0, defensiveLine: 0.5, width: 0.5, pressing: 0.5, ...o };
}

/** Atributos de um jogador gerado: nível (OVR aproximado 40–90) e a ênfase do papel do lugar. */
export function gerarAtributos(seed: string, ovr: number, role: Posicao, papel?: string): Partial<Record<IdAtributo, number>> {
  const r = mulberry32(hashTexto(seed));
  const base = 1 + (19 * (ovr - 1)) / 99;
  const pes = papel && IDX_PAPEL[papel] !== undefined ? PAPEIS[IDX_PAPEL[papel]].pesos : {};
  const gr = role === 'GR';
  const out: Partial<Record<IdAtributo, number>> = {};
  for (const a of ATRIBUTOS) {
    const peso = (pes as Record<string, number | undefined>)[a.id] ?? 0;
    let v = base + (peso ? 1 + peso * 0.5 : -1.5) + (r() - 0.5) * 3;
    if (a.grupo === 'guarda_redes') v = gr ? base + 1 + (r() - 0.5) * 2 : 2 + r() * 4;
    else if (gr && a.grupo === 'tecnico') v -= 3;
    out[a.id] = Math.max(1, Math.min(20, Math.round(v)));
  }
  return out;
}

/** Plantel gerado de 11 + suplentes para uma formação (nomes e números simples). */
export function gerarEquipa(prefixo: string, ovr: number, formacao = '4-3-3', nomes?: string[], suplentes = 7): { onze: JogadorBase[]; banco: JogadorBase[] } {
  const ls = lugares(formacao);
  const onze = ls.map((l, k) => ({ id: `${prefixo}${k + 1}`, name: nomes?.[k] ?? `${prefixo.toUpperCase()} ${k + 1}`, number: k + 1, role: l.role,
    attrs: gerarAtributos(`${prefixo}|${k}`, ovr + ((k * 7) % 5) - 2, l.role, l.papel) }));
  const papeisBanco: Posicao[] = ['GR', 'DC', 'DD', 'MC', 'MO', 'ED', 'PL'];
  const banco = papeisBanco.slice(0, suplentes).map((role, k) => ({ id: `${prefixo}s${k + 1}`, name: nomes?.[11 + k] ?? `${prefixo.toUpperCase()} ${12 + k}`, number: 12 + k, role,
    attrs: gerarAtributos(`${prefixo}|s${k}`, ovr - 3, role) }));
  return { onze, banco };
}
