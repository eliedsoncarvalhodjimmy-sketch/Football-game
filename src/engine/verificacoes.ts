// Verificações da secção 11 (usadas nos testes e no relatório).
import type { World } from './world.ts';
import type { Temporada } from './season/temporada.ts';
import type { RegistoEpoca } from './history.ts';
import { verificarCalendario, type ProblemaCalendario } from './calendar/verificar.ts';
import { hash32 } from '../core/rng.ts';

/** Cada clube activo numa só divisão e cada divisão com o nº certo de clubes. */
export function verificarIntegridade(w: World): string[] {
  const out: string[] = [];
  const visto = new Map<number, number>();
  for (const l of w.ligas) {
    if (l.clubes.length !== l.regras.formato.equipas) out.push(`${l.regras.id}: ${l.clubes.length} clubes (esperado ${l.regras.formato.equipas})`);
    for (const c of l.clubes) {
      visto.set(c, (visto.get(c) ?? 0) + 1);
      if (w.liga[c] !== l.idx) out.push(`${w.clubes[c].id}: índice de liga incoerente`);
    }
  }
  for (const [c, n] of visto) if (n > 1) out.push(`${w.clubes[c].id} está em ${n} divisões`);
  for (let i = 0; i < w.clubes.length; i++) if (w.liga[i] >= 0 && !visto.has(i)) out.push(`${w.clubes[i].id} sem divisão`);
  return out;
}

/** Vagas continentais: todas preenchidas, sem duplicados, só países com direito. */
export function verificarVagas(w: World): string[] {
  const out: string[] = [];
  const c = w.continental;
  if (!c) return ['sem dados continentais'];
  const todos = new Set<number>();
  for (const comp of c.competicoes) {
    const q = w.qualificados.get(comp.id) ?? [];
    if (q.length !== comp.equipas) out.push(`${comp.id}: ${q.length} qualificados para ${comp.equipas} vagas`);
    for (const x of q) {
      if (todos.has(x.clube)) out.push(`${w.clubes[x.clube].id} qualificado duas vezes`);
      todos.add(x.clube);
      if (w.clubes[x.clube].pais !== x.pais) out.push(`${w.clubes[x.clube].id}: país incoerente`);
      if (!c.vagas.vagas[x.pais]?.[comp.id]) out.push(`${x.pais} sem direito a ${comp.id}`);
      if (w.liga[x.clube] < 0) out.push(`${w.clubes[x.clube].id} qualificado mas fora do jogo`);
    }
  }
  return out;
}

/** Calendário de todas as competições de uma época jogada. */
export function verificarCalendarioEpoca(t: Temporada): ProblemaCalendario[] {
  const cont = new Set<string>();
  for (const id of t.continentais.keys()) cont.add(id).add(`${id}_po`).add(`${id}_ko`);
  return verificarCalendario(t.jogos, cont, new Set(t.ligas.keys()));
}

/** Impressão digital de todos os resultados (determinismo). */
export function impressaoDigital(hist: RegistoEpoca[]): number {
  let h = 0;
  for (const r of hist) h = hash32(h, r.impressao, JSON.stringify(r.campeoes), r.estatLiga.golos);
  return h;
}
