// Estado do motor de jogo no mundo: treinadores e cache de ratings.
import type { Treinador } from '../coaches/store.ts';
import { CacheRatings } from './ratings.ts';
import type { PlayerStore } from '../players/store.ts';
import type { Rng } from '../core/rng.ts';
import { novaRelacao, recuperarSemana, sugerir, type RelacaoTreinador, type Sugestao, type ResultadoSugestao } from '../coaches/interferencia.ts';

export class MotorMundo {
  cache = new CacheRatings();
  /** Correcção provisória da deriva dos plantéis (pontos de força, por clube; ver DERIVA_PLANTEL). */
  correcao: Float32Array;
  /** Clube do utilizador (−1 = nenhum: mundo sem interface) e a sua relação com o treinador. */
  clubeUtilizador = -1;
  relacao: RelacaoTreinador | null = null;
  /** Sugestão do utilizador para o próximo jogo do seu clube (consumida pelo jogo). */
  sugestao: Sugestao | null = null;
  ultimaDecisao: ResultadoSugestao | null = null;
  constructor(public treinadores: Treinador[]) {
    this.correcao = new Float32Array(treinadores.length);
  }

  definirClubeUtilizador(c: number) {
    this.clubeUtilizador = c;
    this.relacao = novaRelacao(this.treinadores[c]);
  }

  semana() {
    if (this.relacao) recuperarSemana(this.treinadores[this.clubeUtilizador], this.relacao);
  }

  /** Usada por prepararLado: aplica a sugestão pendente ao clube do utilizador. */
  consumirSugestao(st: PlayerStore, plantel: number[], dia: number, rng: Rng): ResultadoSugestao | null {
    if (!this.sugestao || !this.relacao) return null;
    const r = sugerir(st, plantel, this.treinadores[this.clubeUtilizador], this.relacao, this.sugestao, dia, rng, this.cache);
    this.sugestao = null;
    this.ultimaDecisao = r;
    return r;
  }
}
