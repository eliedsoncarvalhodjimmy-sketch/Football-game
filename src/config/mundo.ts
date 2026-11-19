// Configuração geral do mundo.
export const MUNDO = {
  /** Data de início do mundo (1.º dia da 1.ª época). */
  inicio: '2026-07-01',
  /** Semente por defeito dos CLI. */
  semente_padrao: 2026,
  /** "teste" gera nomes fictícios marcados como dados de teste; "gerado" é para o jogo real. */
  modo_geracao: 'teste' as 'teste' | 'gerado',
};

/** Jogadores livres no início do mundo (pedido do utilizador): por liga, N por clube, um pouco abaixo do nível dos clubes
 *  mais fracos dela (os livres são quem sobrou do mercado), sem clube há 0–9 meses. */
export const LIVRES_INICIAIS = {
  por_clube: 1.2,
  idade: [21, 34] as [number, number],
  /** OVR = alvo do clube mais fraco da liga − desconto (pontos). */
  desconto: [0, 10] as [number, number],
  meses_livre: [0, 9] as [number, number],
  /** Distribuição de posições (pesos). */
  posicoes: { GR: 2, DC: 4, DD: 2, DE: 2, MDC: 2, MC: 3, MO: 2, ED: 2, EE: 2, PL: 3 } as Record<string, number>,
};
