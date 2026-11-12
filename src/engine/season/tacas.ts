// Planeador das taças de um país: distribui as rondas pelas semanas de meio da
// semana que ficam livres depois das continentais, das selecções e das jornadas
// de liga a meio da semana desse país. A final de jogo único da taça principal
// é no sábado da semana `final_taca`; a final das taças secundárias e as finais a
// duas mãos jogam-se a meio da semana.
import { CALENDARIO, type ModeloCalendario } from '../../config/calendario.ts';
import type { RegrasTaca } from '../../data/types.ts';
import { semanasMeioLiga } from '../calendar/scheduler.ts';
import type { Slot } from '../competitions/matamata.ts';
import { contarRondas, entrantesPorRonda, maosRonda } from '../competitions/taca.ts';

/** Divide `livres` em segmentos consecutivos de tamanhos dados, espaçados uniformemente. */
export function distribuirSegmentos(livres: number[], tamanhos: number[]): number[][] {
  const S = tamanhos.reduce((a, b) => a + b, 0);
  if (S > livres.length) throw new Error(`faltam semanas: precisa de ${S}, há ${livres.length}`);
  const folga = livres.length - S;
  const R = tamanhos.length;
  const out: number[][] = [];
  let acum = 0;
  for (let i = 0; i < R; i++) {
    const inicio = (R === 1 ? folga : Math.floor((i * folga) / (R - 1))) + acum;
    out.push(livres.slice(inicio, inicio + tamanhos[i]));
    acum += tamanhos[i];
  }
  return out;
}

export function planearTacas(tacas: RegrasTaca[], porLiga: Map<string, number[]>, semanasLigaMeio: Set<number>, m: ModeloCalendario): Map<string, Slot[][]> {
  let livres = semanasMeioLiga(m).filter((s) => !semanasLigaMeio.has(s));
  const out = new Map<string, Slot[][]>();
  const meio = (s: number): Slot => ({ semana: s, ranhura: 'meio', dias: CALENDARIO.dias.meio });
  // A principal primeiro.
  for (const t of [...tacas].sort((a, b) => Number(a.secundaria) - Number(b.secundaria))) {
    const nR = contarRondas(entrantesPorRonda(t, porLiga).map((e) => e.length));
    const finalFds = !t.secundaria && t.maos.final === 1;
    const tamanhos: number[] = [];
    for (let r = 0; r < nR; r++) if (!(finalFds && r === nR - 1)) tamanhos.push(maosRonda(t, r, nR));
    let segs: number[][];
    try {
      segs = distribuirSegmentos(livres, tamanhos);
    } catch (e) {
      throw new Error(`${t.id}: ${(e as Error).message}`);
    }
    const slots: Slot[][] = segs.map((ws) => ws.map(meio));
    if (finalFds) slots.push([{ semana: m.final_taca, ranhura: 'fds', dias: [5] }]);
    out.set(t.id, slots);
    const usadas = new Set(segs.flat());
    livres = livres.filter((s) => !usadas.has(s));
  }
  return out;
}
