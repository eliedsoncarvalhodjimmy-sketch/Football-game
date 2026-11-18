// Treinadores (Fase 2). Atributos 1–20, perfis com formações e instruções preferidas.
import type { Instrucoes } from './tacticas.ts';
import { ESTILOS, type IdEstilo } from './estilos.ts';

// Atributos (cargos do utilizador, data/staff/cargos.md): ids internos mantidos; nomes do utilizador. A "autoridade" saiu:
// passa a sair da gestão de pessoas. "jovens" = trabalho com jovens. A disciplina fica (pedido do utilizador).
export const ATRIBUTOS_TREINADOR = ['tactica', 'motivacao', 'desenvolvimento', 'disciplina', 'adaptabilidade', 'gestao', 'jovens'] as const;
export type AtributoTreinador = (typeof ATRIBUTOS_TREINADOR)[number];
export const NOME_ATRIBUTO_TREINADOR: Record<AtributoTreinador, string> = {
  tactica: 'Conhecimento táctico', motivacao: 'Motivação', desenvolvimento: 'Treino', disciplina: 'Disciplina',
  adaptabilidade: 'Flexibilidade e adaptabilidade táctica', gestao: 'Gestão de pessoas', jovens: 'Trabalho com jovens',
};

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

/** Os perfis dos treinadores são os 8 estilos do utilizador (src/config/estilos.ts): esquemas, instruções e atributos fortes. */
const FORTES: Record<IdEstilo, AtributoTreinador[]> = {
  tiki_taka: ['tactica'], gegenpressen: ['tactica', 'motivacao'], contra_ataque: ['disciplina'], catenaccio: ['disciplina', 'tactica'],
  jogo_direto: ['motivacao'], pelas_alas: ['tactica'], futebol_total: ['tactica', 'adaptabilidade'], bloco_medio_baixo: ['disciplina'],
};
const PAPEIS_ESTILO: Partial<Record<IdEstilo, Record<number, string>>> = {
  tiki_taka: { 0: 'gr_lib', 4: 'lat_ofe' }, gegenpressen: { 0: 'gr_lib', 10: 'pl_pre' }, contra_ataque: { 1: 'lat_def' }, catenaccio: {}, jogo_direto: { 10: 'pl_piv' }, pelas_alas: { 1: 'lat_ofe', 4: 'lat_ofe' },
};
export const PERFIS: Perfil[] = ESTILOS.map((e) => ({ id: e.id, nome: e.nome, formacoes: [...e.esquemas], instrucoes: { ...e.instrucoes }, fortes: FORTES[e.id], papeis: PAPEIS_ESTILO[e.id] ?? {} }));
/** Peso de cada estilo pela reputação do clube: grandes mais Tiki-Taka/Gegenpressen/Futebol Total; pequenos mais blocos e jogo directo. */
export const PESO_ESTILO_REPUTACAO: Record<IdEstilo, (rep: number) => number> = {
  tiki_taka: (r) => 0.3 + r / 100, gegenpressen: (r) => 0.4 + r / 110, futebol_total: (r) => 0.15 + r / 160, pelas_alas: () => 0.8,
  contra_ataque: (r) => 1.3 - r / 100, catenaccio: (r) => 0.9 - r / 140, jogo_direto: (r) => 1.1 - r / 110, bloco_medio_baixo: (r) => 1.3 - r / 100,
};
/** Treinadores com vocação além do estilo (atributos +3): formadores (treino e jovens) e gestores de balneário (gestão e motivação). */
export const VOCACAO = { prob_formador: 0.15, prob_gestor: 0.15 };

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
  /** Trabalho com jovens: o bónus de evolução do jovem titular (≤ 21) × (1 + (jovens − 10) × isto). */
  jovens_por_ponto: 0.04,
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
