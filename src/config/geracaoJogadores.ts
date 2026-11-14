// Geração de plantéis fictícios (Fase 2, Bloco A). Determinística (semente).
// A qualidade vem da mesma força da Fase 1: força = reputação × (0,7 + 0,3 × força desportiva / 100).
// O OVR-alvo dos titulares é uma função linear dessa força, numa escala realista de OVR:
//   OVR-alvo do onze = ovr_base + ovr_por_forca × força
// (ex.: força 90 → 89; força 60 → 71; força 25 → 50). No Bloco B o rating do onze é convertido
// de volta para a escala da força, para os golos esperados manterem a calibração da Fase 1.
import type { Posicao } from './papeis.ts';

export const GERACAO_JOGADORES = {
  /** Reposição ancorada (Bloco C): os novos jogadores compensam a deriva da média do plantel face à da geração
   *  (relativa ao nível do clube): alvo −= ganho × deriva, deriva limitada a ±maximo. */
  reposicao_ancora: { ganho: 2, maximo: 8 },
  ovr_base: 35,
  ovr_por_forca: 0.6,
  /** Composição do plantel (25): 3 GR, 8 defesas, 8 médios, 6 avançados. "ED|EE" = um dos dois lados. */
  composicao: ['GR', 'GR', 'GR', 'DC', 'DC', 'DC', 'DC', 'DD', 'DD', 'DE', 'DE', 'MDC', 'MDC', 'MC', 'MC', 'MC', 'MC', 'MO', 'MO', 'PL', 'PL', 'PL', 'ED', 'EE', 'ED|EE'] as (Posicao | 'ED|EE')[],
  /** Diferença de OVR face ao alvo pela ordem no plantel dentro da posição (1.º titular, 2.º, 3.º...). */
  desvio_por_ordem: [2, -3, -7, -10],
  /** Ruído do OVR de cada jogador (desvio-padrão) e probabilidade de um "craque" (+ desvio extra). */
  ruido_ovr: 3.5,
  prob_craque: 0.03,
  bonus_craque: 7,
  /** Idades 17–38: pesos por idade (pico 24–28). */
  idade_min: 17,
  idade_max: 38,
  peso_idade: (a: number) => Math.max(0.15, 1 - Math.abs(a - 26) / 10),
  /** Os jogadores jovens estão abaixo do potencial: OVR actual = alvo − atraso(idade). */
  atraso_jovem: (a: number) => Math.max(0, (24 - a) * 2.2),
  /** Os veteranos já desceram um pouco do seu nível: OVR actual = alvo − atraso_veterano(idade). */
  atraso_veterano: (a: number) => Math.max(0, (a - 31) * 1.5),
  /** Atributos sem peso na posição ficam este número de "dispersões" abaixo do nível. */
  desconto_irrelevantes: 1.3,
  /** Margem até ao potencial: média por idade e ruído. */
  margem_potencial: (a: number) => Math.max(0, (27 - a) * 2.0) + 1,
  ruido_potencial: 3,
  /** Dispersão dos atributos à volta do nível (pontos 1–20): atributos-chave acima, irrelevantes abaixo. */
  dispersao_chave: 3.2,
  ruido_atributo: 1.6,
  /** Atributos de guarda-redes de jogadores de campo (e de campo dos GR fora dos seus pesos): baixos. */
  atributos_fora_de_posicao: [1, 6] as [number, number],
  /** Ocultos: média e desvio. */
  ocultos: { media: 11, desvio: 3.5 },
  /** Estrangeiros por liga: fracção = base + peso × índice de riqueza / 100 (respeitando o mínimo de nacionais). */
  estrangeiros: { base: 0.12, peso_riqueza: 0.45 },
  /** Origem dos estrangeiros (pesos); países sem pacote também servem (só para nomes e nacionalidade). */
  paises_estrangeiros: {
    BRA: 8, ARG: 6, FRA: 6, ESP: 5, POR: 5, NED: 4, GER: 4, ENG: 3, ITA: 3, BEL: 3, CRO: 3, SEN: 3, NGA: 3, CIV: 3,
    COL: 3, URU: 3, SRB: 2, DEN: 2, SWE: 2, NOR: 2, POL: 2, CZE: 2, SUI: 2, AUT: 2, MAR: 2, GHA: 2, TUR: 2, JPN: 2,
    KOR: 2, USA: 2, MEX: 2, ECU: 2, SCO: 1, GRE: 1, UKR: 1, HUN: 1, ROU: 1, ISR: 1, CYP: 1, ALG: 1, TUN: 1, EGY: 1,
    COD: 1, RSA: 1, KSA: 0, UAE: 0, AZE: 0,
  } as Record<string, number>,
  /** Pé: direito, esquerdo, ambos. */
  pe: { direito: 0.72, esquerdo: 0.24, ambos: 0.04 },
};

/**
 * Afinação do plantel gerado (Fase 2, Bloco B): depois de gerar um plantel, a força do onze
 * (ratings → escala da Fase 1) é aproximada da força-alvo do clube (reputação × força desportiva),
 * deslocando os atributos visíveis dos jogadores gerados (arredondamento estocástico).
 * Os jogadores reais ou editados à mão nunca são tocados.
 */
export const AFINACAO_PLANTEL = {
  iteracoes: 5,
  /** Diferença aceite (pontos de força). */
  tolerancia: 1.0,
  /** Pontos de força por ponto de atributo (≈ declive médio da conversão índice → força). */
  forca_por_ponto: 7.4,
  /** Deslocamento máximo por iteração (pontos de atributo). */
  passo_maximo: 2.5,
};

/**
 * Correcção provisória da deriva dos plantéis (Fase 2, até haver mercado de transferências no Prompt 3).
 * Sem transferências, os plantéis afastam-se da força-alvo do clube (evolução, reformas, reposição) e
 * os domínios fixam-se. No início de cada época, cada clube recebe uma correcção de força igual a uma
 * fracção da distância entre a força-alvo e a força do seu onze, limitada. Desliga-se com reversao 0.
 */
export const DERIVA_PLANTEL = {
  reversao: 0.45,
  /** Limite da correcção (pontos de força). */
  limite: 6,
};
