// Atribui as jornadas de liga a semanas e dias, segundo o modelo de calendário.
import { CALENDARIO, type ModeloCalendario, type Ranhura } from '../../config/calendario.ts';
import type { Rng } from '../../core/rng.ts';
import { rondasBerger } from '../competitions/roundRobin.ts';
import type { Jogo } from './types.ts';

export function modelo(id: string): ModeloCalendario {
  const m = CALENDARIO.modelos[id];
  if (!m) throw new Error(`modelo de calendário desconhecido: ${id}`);
  return m;
}

/** Fins-de-semana com jornadas de liga. As divisões inferiores podem jogar nas paragens de selecções. */
export function semanasFds(m: ModeloCalendario, jogamNasParagens = false): number[] {
  const out: number[] = [];
  for (let s = m.primeira_semana; s <= m.ultima_semana; s++) if (jogamNasParagens || !m.paragens_selecoes.includes(s)) out.push(s);
  return out;
}

/** Semanas reservadas às competições continentais (meio da semana). */
export function semanasContinentais(m: ModeloCalendario): Set<number> {
  const c = m.continentais;
  return new Set([...c.acesso, ...c.fase_liga, ...c.playoff, ...c.oitavos, ...c.quartos, ...c.meias, ...c.grupos, ...c.quartos_grupos, ...c.meias_grupos]);
}

/** Semanas de meio da semana livres para ligas e taças (sem continentais nem selecções). */
export function semanasMeioLiga(m: ModeloCalendario): number[] {
  const ocupadas = new Set([...m.paragens_selecoes, ...semanasContinentais(m)]);
  const out: number[] = [];
  for (let s = m.primeira_semana; s <= m.ultima_semana; s++) if (!ocupadas.has(s)) out.push(s);
  return out;
}

/** Escolhe k elementos espaçados uniformemente de uma lista ordenada. */
export function espacar<T>(lista: T[], k: number): T[] {
  if (k > lista.length) throw new Error(`pedidos ${k} de ${lista.length}`);
  if (k === 0) return [];
  if (k === 1) return [lista[Math.floor(lista.length / 2)]];
  const out: T[] = [];
  for (let i = 0; i < k; i++) out.push(lista[Math.round((i * (lista.length - 1)) / (k - 1))]);
  return out;
}

export interface Slot {
  semana: number;
  ranhura: Ranhura;
}

/** Slots (semana, ranhura) para R jornadas de liga, por ordem cronológica. */
export function slotsLiga(m: ModeloCalendario, R: number, jogamNasParagens = false): Slot[] {
  const fds = semanasFds(m, jogamNasParagens);
  let slots: Slot[];
  if (R <= fds.length) slots = espacar(fds, R).map((semana) => ({ semana, ranhura: 'fds' as const }));
  else {
    const meio = semanasMeioLiga(m);
    const extra = R - fds.length;
    if (extra > meio.length) throw new Error(`liga com ${R} jornadas não cabe no calendário (${fds.length} fds + ${meio.length} meio)`);
    slots = [
      ...fds.map((semana) => ({ semana, ranhura: 'fds' as const })),
      ...espacar(meio, extra).map((semana) => ({ semana, ranhura: 'meio' as const })),
    ];
  }
  // Na mesma semana o meio da semana (terça/quarta) vem antes do fim-de-semana.
  return slots.sort((a, b) => a.semana - b.semana || (a.ranhura === 'meio' ? -1 : 1));
}

/** Calendário completo de uma liga. `clubes` são índices globais. */
export function agendarLiga(compId: string, clubes: number[], voltas: number, modeloId: string, rng: Rng, jogamNasParagens = false): Jogo[] {
  const m = modelo(modeloId);
  const ordem = rng.shuffle([...clubes]);
  const rondas = rondasBerger(ordem.length, voltas);
  const slots = slotsLiga(m, rondas.length, jogamNasParagens);
  const jogos: Jogo[] = [];
  rondas.forEach((rd, r) => {
    const { semana, ranhura } = slots[r];
    const dias = CALENDARIO.dias[ranhura];
    for (const [h, a] of rd) {
      jogos.push({ comp: compId, ronda: r + 1, semana, ranhura, dia: rng.pick(dias), casa: ordem[h], fora: ordem[a] });
    }
  });
  return jogos;
}
