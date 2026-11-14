// Valor de mercado e preço pedido (Prompt 4, Bloco A). Escala 1:1 em euros.
//   valor = referência × e^(k × (OVR − OVR_ref)) × idade × potencial × posição × contrato × inflação
export const VALOR = {
  referencia: 120_000_000,
  ovr_referencia: 88,
  por_ponto_ovr: 0.14,
  minimo: 25_000,
  /** Factor de idade (pico 22–27). */
  idade: (i: number) => (i <= 17 ? 0.5 : i <= 19 ? 0.75 : i <= 21 ? 0.95 : i <= 27 ? 1 : i <= 29 ? 0.8 : i <= 31 ? 0.55 : i <= 33 ? 0.3 : 0.12),
  /** Potencial acima do OVR (até aos 24 anos): +x por ponto, até ao máximo. */
  potencial_por_ponto: 0.06,
  potencial_maximo: 1.5,
  /** Posição (grupo). */
  posicao: { GR: 0.65, DEF: 0.85, MED: 1.0, AVA: 1.15 } as Record<string, number>,
  /** Contrato restante (anos): < 0,5 → 0,35; < 1 → 0,55; < 2 → 0,85; senão 1. */
  contrato: (anos: number) => (anos < 0.5 ? 0.35 : anos < 1 ? 0.55 : anos < 2 ? 0.85 : 1),
};

/** Preço pedido = valor × factores (cada um limitado). */
export const PRECO = {
  /** Vendedor em crise vende abaixo do valor (saúde: saudável, apertado, crise, administração). */
  necessidade: [1, 0.92, 0.8, 0.65],
  /** Importância: jogador-chave (top 3 do plantel por OVR) e jovem da casa (formado no clube, ≤ 23 anos). */
  chave: 1.35,
  titular: 1.12,
  jovem_casa: 1.2,
  /** Riqueza do comprador: × (1 + x × (índice comprador − índice vendedor)/100), limitado. */
  riqueza_comprador: 0.25,
  riqueza_limites: [0.9, 1.3] as [number, number],
  /** Prémio da liga do comprador (força desportiva acima da do vendedor). */
  liga_comprador: 0.003,
  liga_limites: [1, 1.15] as [number, number],
  /** Concorrência: cada interessado a mais +x, até ao máximo (leilão). */
  concorrencia: 0.15,
  concorrencia_maximo: 1.6,
  /** Rivais não vendem barato: × (1 + x × intensidade). */
  rivalidade: 0.15,
  /** Vender a um clube mais forte da mesma liga (reforçar um concorrente directo): × x. */
  mesma_liga: 1.3,
  /** Arquétipo do vendedor: clube-vendedor vende depressa por bom preço; formador resiste a vender jovens da casa; tradicional resiste a vender ídolos. */
  arquetipo: { vendedor: 0.95, formador_jovem: 1.3, tradicional_idolo: 1.3 } as Record<string, number>,
  /** Ídolo: há 5+ anos no clube e OVR entre os 5 melhores. */
  idolo_anos: 5,
  /** Faixa realista da razão preço/valor (os extremos ficam raros): o preço final é limitado a isto. */
  razao: [0.6, 2.5] as [number, number],
  /** Excepção (decisão do utilizador): jovem (≤ idade) de potencial absurdo (≥ pot) num clube de menor expressão
   *  (reputação ≥ diferença abaixo do comprador) pode sair por mais de 5× o valor: factor 1 + x × (potencial − base), razão até ao máximo. */
  talento: { idade: 20, potencial: 88, diferenca_reputacao: 15, por_ponto: 0.25, base: 85, factor_maximo: 3, razao_maxima: 6 },
};

/** Inflação de valores e salários: 2% a cada dois anos (decisão do utilizador). */
export const INFLACAO = { taxa: 0.02, anos: 2 };

/** TV: renegociada a cada 3 anos, sobe 5–25% (probabilidade p) ou desce 5% (decisão do utilizador). */
export const TV_RENEGOCIACAO = { anos: 3, sobe_prob: 0.8, sobe: [0.05, 0.25] as [number, number], desce: 0.05 };
