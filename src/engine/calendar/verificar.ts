// Verificações testáveis do calendário (secção 9).
import { diaAbsoluto } from './datas.ts';
import type { Jogo } from './types.ts';

export interface ProblemaCalendario {
  tipo: 'mesmo_dia' | 'mais_de_2_por_semana' | 'sequencia' | 'continental_fora_do_meio';
  msg: string;
}

export const LIMITES_CALENDARIO = {
  max_jogos_semana: 2,
  /** Máximo de jogos seguidos em casa (ou fora) numa liga. */
  max_sequencia: 3,
};

/** `ligas`: competições onde se verificam as sequências casa/fora (por defeito, todas as não continentais). */
export function verificarCalendario(jogos: Jogo[], continentais: Set<string> = new Set(), ligas?: Set<string>): ProblemaCalendario[] {
  const out: ProblemaCalendario[] = [];
  const dias = new Map<string, number>();
  const semanas = new Map<string, number>();
  for (const j of jogos) {
    for (const c of [j.casa, j.fora]) {
      const kd = `${c}|${diaAbsoluto(j.semana, j.dia)}`;
      dias.set(kd, (dias.get(kd) ?? 0) + 1);
      const ks = `${c}|${j.semana}`;
      semanas.set(ks, (semanas.get(ks) ?? 0) + 1);
    }
    if (continentais.has(j.comp) && j.ranhura !== 'meio' && !j.neutro) {
      out.push({ tipo: 'continental_fora_do_meio', msg: `${j.comp} ronda ${j.ronda} na semana ${j.semana} ao fim-de-semana` });
    }
  }
  for (const [k, v] of dias) if (v > 1) out.push({ tipo: 'mesmo_dia', msg: `clube ${k.split('|')[0]} joga ${v} vezes no dia ${k.split('|')[1]}` });
  for (const [k, v] of semanas) if (v > LIMITES_CALENDARIO.max_jogos_semana) out.push({ tipo: 'mais_de_2_por_semana', msg: `clube ${k.split('|')[0]} joga ${v} vezes na semana ${k.split('|')[1]}` });
  // Sequências casa/fora por competição de liga.
  const porComp = new Map<string, Jogo[]>();
  for (const j of jogos) if (ligas ? ligas.has(j.comp) : !continentais.has(j.comp)) porComp.set(j.comp, [...(porComp.get(j.comp) ?? []), j]);
  for (const [comp, js] of porComp) {
    const seq = new Map<number, { ultimo: number; run: number }>();
    for (const j of [...js].sort((a, b) => a.ronda - b.ronda)) {
      for (const [c, casa] of [[j.casa, 1], [j.fora, 0]] as const) {
        const s = seq.get(c) ?? { ultimo: -1, run: 0 };
        s.run = s.ultimo === casa ? s.run + 1 : 1;
        s.ultimo = casa;
        seq.set(c, s);
        if (s.run > LIMITES_CALENDARIO.max_sequencia) out.push({ tipo: 'sequencia', msg: `${comp}: clube ${c} com ${s.run} jogos seguidos ${casa ? 'em casa' : 'fora'}` });
      }
    }
  }
  return out;
}
