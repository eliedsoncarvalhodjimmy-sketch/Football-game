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
  /** Papéis preferidos por lugar (índice) da formação preferida, quando diferem dos da formação. */
  papeis: Record<number, string>;
}

export const PERFIS: Perfil[] = [
  { id: 'ofensivo', nome: 'Ofensivo / posse', formacoes: ['4-3-3', '4-2-3-1', '4-3-3F9'], instrucoes: { mentalidade: 1, pressao: 0, linha: 0, largura: 1, ritmo: -1 }, fortes: ['tactica'], papeis: { 0: 'gr_lib', 4: 'lat_ofe' } },
  { id: 'contra_ataque', nome: 'Contra-ataque', formacoes: ['4-4-2', '4-2-3-1', '5-3-2'], instrucoes: { mentalidade: -1, pressao: 0, linha: -1, largura: 0, ritmo: 1 }, fortes: ['disciplina'], papeis: { 1: 'lat_def', 5: 'ext_inv', 8: 'ext_inv' } },
  { id: 'pragmatico', nome: 'Pragmático / defensivo', formacoes: ['4-1-4-1', '4-4-2', '5-3-2'], instrucoes: { mentalidade: -1, pressao: 0, linha: 0, largura: -1, ritmo: 0 }, fortes: ['disciplina', 'tactica'], papeis: { 1: 'lat_def', 7: 'mc_cob' } },
  { id: 'pressao_alta', nome: 'Pressão alta', formacoes: ['4-3-3', '4-2-3-1', '3-4-3'], instrucoes: { mentalidade: 1, pressao: 1, linha: 1, largura: 0, ritmo: 1 }, fortes: ['tactica', 'motivacao'], papeis: { 0: 'gr_lib', 10: 'pl_pre' } },
  { id: 'formador', nome: 'Formador de jovens', formacoes: ['4-3-3', '4-4-2', '4-2-3-1'], instrucoes: { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 0 }, fortes: ['desenvolvimento'], papeis: {} },
  { id: 'gestor', nome: 'Gestor de balneário', formacoes: ['4-4-2', '4-2-3-1', '4-1-4-1'], instrucoes: { mentalidade: 0, pressao: 0, linha: 0, largura: 0, ritmo: 0 }, fortes: ['gestao', 'motivacao', 'autoridade'], papeis: {} },
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

/** Efeitos dos atributos do treinador fora dos ratings (os de táctica, motivação e adequação estão em MODIFICADORES.treinador). */
export const EFEITOS_TREINADOR = {
  /** Cartões: × (1 + (10 − disciplina) × isto). Disciplina 20 → −20%; 1 → +18%. */
  cartoes_por_disciplina: 0.02,
  /** Moral: referência para onde a moral regressa = 13 + (gestão − 10) × isto. */
  moral_por_gestao: 0.2,
  /** Derrota: a perda de moral fica × (1 − (gestão − 10) × isto). */
  derrota_por_gestao: 0.03,
};

/**
 * Interferência do utilizador no seu clube (Bloco C): sugestões de onze e táctica antes do jogo.
 * Cada sugestão gasta capital do utilizador junto do treinador e autoridade do treinador no balneário.
 * O treinador aceita, aceita em parte ou ignora, consoante a personalidade, a autoridade e a relação.
 * Os abusos fazem crescer o conflito (a consequência final chega no Prompt 3).
 */
export const INTERFERENCIA = {
  capital_inicial: 50,
  /** Autoridade do treinador no balneário (0–100) = atributo autoridade × isto, no início. */
  autoridade_por_ponto: 5,
  /** Decisão: s = abertura − resistência + base; P(aceita) = σ(2s − 0,5), P(ignora) = σ(−2s − 0,5), resto parcial. */
  base: 0.6,
  peso_capital: 1.0,
  peso_autoridade_atributo: 0.8,
  peso_autoridade_balneario: 0.6,
  peso_adaptabilidade: 0.4,
  peso_conflito: 1.0,
  peso_por_alteracao: 0.12,
  peso_recentes: 0.25,
  /** Custos por alteração sugerida (formação = 2 alterações; cada instrução ou jogador = 1). */
  custo_capital: 3,
  /** Fracção do custo de capital quando ignora (o pedido foi feito na mesma) e quando aceita em parte. */
  custo_ignora: 0.34,
  custo_parcial: 0.5,
  /** Autoridade do treinador perdida por alteração aceite (é desautorizado perante o plantel). */
  custo_autoridade: 2,
  /** Conflito por alteração: aceita / parcial / ignora. */
  conflito: { aceita: 1, parcial: 2, ignora: 3 },
  /** Mais de isto sugestões recentes = abuso: o conflito cresce a dobrar. */
  limiar_abuso: 3,
  /** Por semana: capital +, autoridade + (até ao máximo), conflito −, sugestões recentes ×. */
  recuperacao: { capital: 1, autoridade: 2, conflito: 1, recentes: 0.7 },
  /** Conflito ≥ isto = crise (consequência no Prompt 3: demissão ou conflito público). */
  crise: 70,
  tenso: 40,
};
