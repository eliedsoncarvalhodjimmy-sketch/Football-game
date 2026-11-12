// Calendário de liga de toda a época, para todas as ligas do mundo.
import { Rng } from '../../core/rng.ts';
import type { World } from '../world.ts';
import { agendarLiga } from './scheduler.ts';
import type { Jogo } from './types.ts';

export function calendarioLigas(w: World): Map<string, Jogo[]> {
  const out = new Map<string, Jogo[]>();
  for (const l of w.ligas) {
    const rng = Rng.de(w.semente, 'calendario', l.regras.id, w.epoca);
    out.set(l.regras.id, agendarLiga(l.regras.id, l.clubes, l.regras.formato.voltas, l.regras.epoca.calendario, rng, !!l.regras.jogam_nas_paragens));
  }
  return out;
}
