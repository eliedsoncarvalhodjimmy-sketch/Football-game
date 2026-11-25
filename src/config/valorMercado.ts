// Prompt 6B: fórmula própria de valor de mercado (actualização trimestral). Todos os números aqui; os valores abaixo
// são as HIPÓTESES INICIAIS do Bloco 1, a calibrar no Bloco 2 contra data/referencia/ (dataset público do
// Transfermarkt, CC0). Os dados de referência só servem para calibrar: não entram no jogo.
//
//   Qefectiva = OVR + w(idade) × (POT − OVR)
//   V_base    = V_ref × exp(β × (Qefectiva − Q_ref)) × convexidade_topo(Qefectiva)
//   Valor     = V_base × F_idade × F_contrato × F_liga × F_clube × F_posição × F_visibilidade × F_forma × F_lesão
//               × F_inflação × (1 + ruído determinístico)
import type { Posicao } from './papeis.ts';

/** Tabela (idade → valor) com interpolação linear entre pontos e extrapolação constante nas pontas. */
export type Curva = [number, number][];

export const VALOR_MERCADO = {
  /** Qualidade: V_ref (€) em Q_ref, β por ponto de Qefectiva (+17% ≈ 0,157; +20% ≈ 0,182). */
  v_ref: 45_000_000,
  q_ref: 86,
  beta: 0.17,
  /** Convexidade do topo: × exp(γ × max(0, Q − q_topo)), para os melhores do mundo chegarem a 150–200 M€. */
  topo: { q: 90, gama: 0.04 },
  /** Tecto absoluto (€) e mínimo. */
  tecto: 250_000_000,
  minimo: 10_000,
  /** w(idade): peso do potencial na qualidade efectiva (os jovens valem pelo que podem ser). */
  peso_potencial: [[16, 0.8], [18, 0.65], [20, 0.5], [22, 0.3], [24, 0.12], [26, 0]] as Curva,
  /** F_idade para a mesma qualidade; os GR envelhecem ~2 anos mais tarde; extremos e avançados ~1 ano mais cedo. */
  idade: [[26, 1], [27, 0.97], [28, 0.9], [29, 0.8], [30, 0.68], [31, 0.55], [32, 0.42], [33, 0.32], [34, 0.24], [35, 0.17]] as Curva,
  desvio_idade: { GR: 2, ED: -1, EE: -1, PL: -1 } as Partial<Record<Posicao, number>>,
  /** Curva própria dos guarda-redes (se existir, substitui a curva geral com o desvio). */
  idade_gr: undefined as Curva | undefined,
  /** F_contrato (anos restantes); efeito mais fraco a partir de idade_fraco (só metade do desconto). */
  contrato: [[0.25, 0.5], [0.5, 0.62], [1, 0.8], [2, 0.93], [3, 0.98], [4, 1]] as Curva,
  contrato_idade_fraco: 32,
  /** Sem clube (livre): × x. */
  livre: 0.3,
  /** F_liga por liga (as que não estão: pela riqueza da liga, de liga_min a 1). */
  liga: { ENG1: 1.25, ESP1: 1, ITA1: 1, GER1: 1, FRA1: 0.92, KSA1: 1.1, POR1: 0.75, NED1: 0.75, BEL1: 0.7, TUR1: 0.75, BRA1: 0.7, ARG1: 0.6, USA1: 0.75, MEX1: 0.7, ENG2: 0.7 } as Record<string, number>,
  liga_min: 0.35,
  liga_riqueza_ref: 50,
  /** F_clube pela reputação do clube (escalões), a qualidade constante; mais forte em jovens, mais fraco em veteranos. */
  clube: { gigante: { rep: 88, f: 1.12 }, grande: { rep: 78, f: 1.05 }, medio: { rep: 65, f: 1 }, pequeno: 0.93 },
  clube_idade: [[21, 1.3], [24, 1], [30, 0.5]] as Curva,
  /** F_posição. */
  posicao: { GR: 0.75, DC: 0.95, DD: 0.95, DE: 0.95, ALD: 0.95, ALE: 0.95, MDC: 1, MC: 1, MO: 1.1, ED: 1.1, EE: 1.1, PL: 1.1 } as Record<Posicao, number>,
  /** F_visibilidade (0 a +máximo): internacionalizações (até max_int com int_ref jogos) e competição continental do clube. */
  visibilidade: { maximo: 0.15, max_int: 0.1, int_ref: 60, europa: 0.05 },
  /** F_forma (± maximo): nota média da época face à esperada (com ≥ jogos_min jogos); poucos minutos descem. */
  forma: { maximo: 0.12, jogos_min: 5, nota_ref: 6.7, por_ponto_nota: 0.2, minutos_baixos: 0.25, desconto_minutos: 0.06 },
  /** F_lesão: só durante lesões longas (dias de baixa que faltam → factor). */
  lesao: [[28, 1], [42, 0.9], [90, 0.82], [180, 0.75]] as Curva,
  /** F_inflação: crescimento anual (alinhado com receitas e salários). */
  inflacao_anual: 0.06,
  /** Ruído determinístico (por jogador e trimestre): ±x. */
  ruido: 0.03,
  /** Âncora do mercado (Bloco 3): na actualização seguinte a uma transferência, o valor aproxima-se x do preço pago. */
  ancora: 0.3,
};

/** Internacionalizações (Prompt 6B): estimativa inicial quando os ficheiros não trazem o número, e convocatórias nas
 *  paragens de selecções (os melhores de cada país por OVR somam jogos). */
export const SELECOES = {
  convocados: 23,
  jogos_por_paragem: 2,
  idade_minima: 17,
  /** Estimativa inicial: (idade − idade_inicio) × jogos por ano, pelo lugar no país (1.º–11.º, 12.º–23.º, 24.º–40.º). */
  estimativa: { idade_inicio: 20, por_ano: [7, 4, 1.5] as [number, number, number], lugares: [11, 23, 40] as [number, number, number], maximo: 180 },
};
