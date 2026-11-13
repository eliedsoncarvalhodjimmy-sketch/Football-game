// Treinadores (um por clube nesta fase; o mercado de treinadores chega no Prompt 3).
import type { AtributoTreinador } from '../config/treinadores.ts';
import type { Instrucoes } from '../config/tacticas.ts';

export interface Treinador {
  id: string;
  nome: string;
  pais: string;
  clube: number;
  perfil: string;
  atributos: Record<AtributoTreinador, number>;
  /** Formação preferida e alternativas (por ordem). */
  formacoes: string[];
  instrucoes: Instrucoes;
  /** Papéis preferidos por lugar da formação preferida (substituem os da formação). */
  papeis: Record<number, string>;
  /** Autoridade restante junto do utilizador (Bloco C). */
  origem: 'gerado' | 'real' | 'manual';
}
