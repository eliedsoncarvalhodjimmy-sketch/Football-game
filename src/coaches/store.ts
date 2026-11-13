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
  origem: 'gerado' | 'real' | 'manual';
  // ---- Mercado de treinadores (Prompt 3, Bloco C) ----
  idade?: number;
  /** Reputação 1–100 (evolui com os resultados). */
  reputacao?: number;
  /** Contrato: salário anual (€), fim (dia), cláusula de rescisão (€). */
  salario?: number;
  contratoFim?: number;
  clausula?: number;
  /** Pedidos do contrato: orçamento de transferências (fracção da receita), reforços (nº), autonomia (0–1). */
  pedidos?: { orcamento: number; reforcos: number; autonomia: number };
  /** Moral do treinador (0–100) e se já entrou em conflito público. */
  moral?: number;
  conflito?: boolean;
  /** Livre, empregado ou reformado; clubes por onde passou. */
  estado?: 'livre' | 'empregado' | 'reformado';
  carreira?: { clube: number; desde: number; ate?: number; saida?: string }[];
}
