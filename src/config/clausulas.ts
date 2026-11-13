// Cláusulas de rescisão (Prompt 4, Bloco A): contextuais, não universais (valores aprovados pelo utilizador).
export const CLAUSULAS = {
  /** Costume por liga: probabilidade base por contrato. */
  costume: { universal: 1, comum: 0.3, rara: 0.05 },
  ligas_universal: ['ESP1', 'ESP2'],
  ligas_comum: ['POR1', 'POR2', 'BRA1', 'BRA2', 'ARG1', 'MEX1', 'URU1', 'COL1', 'ECU1'],
  /** Jovem de potencial enorme num clube pequeno: + x × (potencial − nível do clube)/10. */
  poder_jovem: 0.25,
  /** Arquétipos mais abertos (formador e clube-vendedor). */
  arquetipo: { formador: 0.15, vendedor: 0.15 } as Record<string, number>,
  /** Limite por plantel (ligas com tradição: universal e comum). */
  maximo_plantel: 2,
  maximo_tradicao: 3,
  /** Valor: múltiplo do valor de mercado (mais alto para jovens de potencial alto). */
  multiplo: [1.5, 4] as [number, number],
  /** A cláusula desce x por ano de contrato cumprido (até ao mínimo do múltiplo). */
  desce_por_ano: 0.1,
};
