import type { Ranhura } from '../../config/calendario.ts';

export interface Jogo {
  comp: string;
  /** Ronda/jornada dentro da competição (1..). */
  ronda: number;
  semana: number;
  ranhura: Ranhura;
  /** 0 = segunda ... 6 = domingo. */
  dia: number;
  casa: number;
  fora: number;
  neutro?: boolean;
}
