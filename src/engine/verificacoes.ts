// Verificações da secção 11 (usadas nos testes e no relatório).
import type { World } from './world.ts';
import type { Temporada } from './season/temporada.ts';
import type { RegistoEpoca } from './history.ts';
import { verificarCalendario, type ProblemaCalendario } from './calendar/verificar.ts';
import type { Jogo } from './calendar/types.ts';
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

/** Vagas continentais: tamanhos certos (contando os play-offs de acesso), sem duplicados, só ligas com direito. */
export function verificarVagas(w: World): string[] {
  const out: string[] = [];
  const c = w.continental;
  if (!c) return ['sem dados continentais'];
  const todos = new Set<number>();
  const n = (id: string) => (w.qualificados.get(id) ?? []).length;
  for (const [comp, q] of w.qualificados) {
    for (const x of q) {
      if (todos.has(x.clube)) out.push(`${w.clubes[x.clube].id} qualificado duas vezes`);
      todos.add(x.clube);
      if (w.clubes[x.clube].pais !== x.pais) out.push(`${w.clubes[x.clube].id}: país incoerente`);
      const temDireito = !!c.vagas.vagas[x.liga]?.[comp] || x.via.includes('campeão em título') || x.via.includes('vaga extra');
      if (!temDireito) out.push(`${x.liga} sem direito a ${comp} (${w.clubes[x.clube].id})`);
      // Um clube de liga de ano civil pode descer para fora do jogo a meio da campanha europeia (qualificou-se
      // antes); só é erro se a liga dele for do mesmo calendário da competição.
      const calComp = c.competicoes.find((cc) => cc.id === comp.replace(/_PO$/, ''))?.calendario ?? 'ago_mai';
      const calLiga = w.ligas.find((l) => l.regras.id === x.liga)?.regras.epoca.calendario ?? 'ago_mai';
      if (w.liga[x.clube] < 0 && calComp === calLiga) out.push(`${w.clubes[x.clube].id} qualificado mas fora do jogo`);
    }
  }
  for (const comp of c.competicoes) {
    let total = n(comp.id) + n(`${comp.id}_PO`) / 2;
    for (const pp of c.vagas.especiais?.perdedores_po ?? []) if (pp.para === comp.id) total += n(pp.de) / 2;
    if (total !== comp.equipas) out.push(`${comp.id}: ${total} vagas para ${comp.equipas} equipas`);
  }
  return out;
}

/** Calendário de todas as competições de uma época jogada. */
export function verificarCalendarioEpoca(t: Temporada): ProblemaCalendario[] {
  const cont = new Set<string>();
  for (const id of t.continentais.keys()) cont.add(id).add(`${id}_pe`).add(`${id}_ko`);
  for (const id of t.acesso.keys()) cont.add(id);
  return verificarCalendario(t.jogos, cont, new Set(t.ligas.keys()));
}

/** Calendário de várias épocas, de todos os calendários, por data absoluta: apanha choques entre uma liga
 *  de ano civil e uma competição de Agosto–Maio (ex.: clubes noruegueses na UEFA). */
export function verificarCalendarioMundo(ts: Temporada[]): ProblemaCalendario[] {
  const cont = new Set<string>();
  const ligas = new Set<string>();
  const jogos: Jogo[] = [];
  for (const t of ts) {
    const suf = `@${t.grupo}${t.ano}`;
    for (const id of t.continentais.keys()) cont.add(id + suf).add(`${id}_pe${suf}`).add(`${id}_ko${suf}`);
    for (const id of t.acesso.keys()) cont.add(id + suf);
    for (const id of t.ligas.keys()) ligas.add(id + suf);
    for (const j of t.jogos) {
      const d = j.diaAbs ?? t.base + j.semana * 7 + j.dia;
      // Semana absoluta a começar à segunda-feira (1970-01-01 foi uma quinta-feira).
      jogos.push({ ...j, comp: j.comp + suf, semana: Math.floor((d + 3) / 7), dia: (d + 3) % 7 });
    }
  }
  return verificarCalendario(jogos, cont, ligas);
}

/** Impressão digital de todos os resultados (determinismo). */
export function impressaoDigital(hist: RegistoEpoca[]): number {
  let h = 0;
  for (const r of hist) h = hash32(h, r.impressao, JSON.stringify(r.campeoes), r.estatLiga.golos);
  return h;
}
