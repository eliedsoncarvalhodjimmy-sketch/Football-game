// Treinadores (Fase 2). Atributos 1–20, perfis com formações e instruções preferidas.
import type { Instrucoes } from './tacticas.ts';

export const ATRIBUTOS_TREINADOR = ['tactica', 'motivacao', 'desenvolvimento', 'disciplina', 'adaptabilidade', 'gestao', 'autoridade'] as const;
export type AtributoTreinador = (typeof ATRIBUTOS_TREINADOR)[number];

export interface Perfil {
  id: string;
  nome: string;
  formacoes: string[]; // a primeira é a preferida
  instrucoes: Instrucoes;
  /** Atributos que este perfil tende a ter mais altos (+3). */
  fortes: AtributoTreinador[];
}

export const PERFIS: Perfil[] = [
  { id: 'ofensivo', nome: 'Ofensivo / posse', formacoes: ['4-3-3', '4-2-3-1', '4-3-3F9'], instrucoes: { mentalidade: 1, pressao: 0, linha: 0, largura: 1, ritmo: -1 }, fortes: ['tactica'] },
  { id: 'contra_ataque', nome: 'Contra-ataque', formacoes: ['4-4-2', '4-2-3-1', '5-3-2'], instrucoes: { mentalidade: -1, pressao: 0, linha: -1, largura: 0, ritmo: 1 }, fortes: ['disciplina'] },
  { id: 'pragmatico', nome: 'Pragmático / defensivo', formacoes: ['4-1-4-1', '4-4-2', '5-3-2'], instrucoes: { mentalidade: -1, pressao: 0, linha: 0, largura: -1, ritmo: 0 }, fortes: ['disciplina', 'tactica'] },
  { id: 'pressao_alta', nome: 'Pressão alta', formacoes: ['4-3-3', '4-2-3-1', '3-4-3'], instrucoes: { mentalidade: 1, pressao: 1, linha: 1, largura: 0, ritmo: 1 }, fortes: ['tactica', 'motivacao'] },
  { id: 'formador', nome: 'Formador de jovens', formacoes: ['4-3-3', '4-4-2', '4-2-3-1'], instrucoes: { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 0 }, fortes: ['desenvolvimento'] },
  { id: 'gestor', nome: 'Gestor de balneário', formacoes: ['4-4-2', '4-2-3-1', '4-1-4-1'], instrucoes: { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 0 }, fortes: ['gestao', 'motivacao', 'autoridade'] },
];

export const TREINADORES = {
  /** Nível médio dos atributos = base + peso × reputação do clube / 100 (σ = desvio). */
  nivel_base: 6,
  nivel_por_reputacao: 9,
  desvio: 2.5,
  bonus_fortes: 3,
  /** Escolha do plano: o treinador adaptável muda se o melhor plano alternativo for melhor do que isto (fracção). */
  limiar_mudanca: 0.015,
  /** Probabilidade de mudar de plano = (adaptabilidade / 20) ^ expoente (teimoso ≈ nunca). */
  expoente_adaptabilidade: 2,
  /** Rotação: jogadores abaixo desta condição valem menos na escolha do onze. */
  condicao_rotacao: 75,
  penalizacao_rotacao: 0.12,
  /** Na escolha do onze, um jogador numa posição desconfortável (familiaridade < 10) vale só esta fracção: último recurso. */
  aversao_desconfortavel: 0.5,
};
