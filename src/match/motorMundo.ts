// Estado do motor de jogo no mundo: treinadores e cache de ratings.
import type { Treinador } from '../coaches/store.ts';
import { CacheRatings } from './ratings.ts';

export class MotorMundo {
  cache = new CacheRatings();
  /** Correcção provisória da deriva dos plantéis (pontos de força, por clube; ver DERIVA_PLANTEL). */
  correcao: Float32Array;
  constructor(public treinadores: Treinador[]) {
    this.correcao = new Float32Array(treinadores.length);
  }
}
