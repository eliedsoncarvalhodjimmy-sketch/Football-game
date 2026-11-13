// Tipos comuns das competições em execução.
import type { Jogo } from '../calendar/types.ts';

export interface Resultado {
  gc: number;
  gf: number;
  /** Houve prolongamento (golos do prolongamento já incluídos em gc/gf). */
  prol?: boolean;
  /** Penáltis [casa, fora]. */
  pen?: [number, number];
}

export interface JogoR extends Jogo {
  /** Jogo que tem de ter vencedor (jogo único a eliminar ou 2.ª mão). */
  decisivo?: boolean;
  /** Na 2.ª mão: a 1.ª mão (casa/fora trocados). */
  ida?: JogoR;
  r?: Resultado;
  /** Golos esperados e remates de cada equipa (modo com jogadores). */
  est?: { xg: [number, number]; remates: [number, number] };
  /** Dia absoluto (dias desde 1970-01-01), preenchido quando o jogo é simulado. */
  diaAbs?: number;
}

export interface Competicao {
  id: string;
  nome: string;
  tipo: 'liga' | 'playoff' | 'barragem' | 'taca' | 'continental';
  /** Jogos marcados para a semana (pode criar a ronda seguinte quando a anterior terminou). */
  jogosDaSemana(semana: number): JogoR[];
  /** Regista um jogo já simulado. */
  registar(j: JogoR): void;
  terminada(): boolean;
}

/** Vencedor de um jogo decisivo (considera a 1.ª mão, prolongamento e penáltis). */
export function vencedor(j: JogoR): number {
  const r = j.r!;
  let c = r.gc;
  let f = r.gf;
  if (j.ida) {
    // Na ida, a equipa da casa da 2.ª mão jogou fora.
    c += j.ida.r!.gf;
    f += j.ida.r!.gc;
  }
  if (c !== f) return c > f ? j.casa : j.fora;
  if (!r.pen) throw new Error(`jogo decisivo sem vencedor: ${j.comp} ${j.casa}-${j.fora}`);
  return r.pen[0] > r.pen[1] ? j.casa : j.fora;
}

export function perdedor(j: JogoR): number {
  return vencedor(j) === j.casa ? j.fora : j.casa;
}
