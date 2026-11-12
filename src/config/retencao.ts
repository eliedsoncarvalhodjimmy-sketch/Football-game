// Poda de memória do histórico (a simulação é igual em todas as ligas).
export const RETENCAO = {
  /** Épocas em que se guarda o detalhe de todos os jogos de todas as ligas. */
  epocas_detalhe_completo: 3,
  /** Ligas cujo detalhe se guarda para sempre (além do clube do jogador). */
  ligas_principais: ['eng_1', 'esp_1', 'ger_1', 'ita_1', 'fra_1', 'por_1', 'ned_1', 'bel_1'],
  /** Competições continentais: detalhe guardado para sempre. */
  continentais_sempre: true,
};
