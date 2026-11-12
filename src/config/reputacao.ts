// Actualização anual da reputação (1–100). A reputação aproxima-se devagar de
// um "alvo" que depende da posição final e das conquistas, com inércia,
// reversão à média e limite anual de variação.
//   alvo = (1 - reversao) × banda da liga na posição final + reversao × média da banda + bónus
//   nova = antiga + limita(alfa * (alvo - antiga), ±max_variacao)
export const REPUTACAO = {
  alfa: 0.2,
  /** Reversão à média: fracção do alvo que puxa para a reputação média da banda da liga. */
  reversao_media: 0.4,
  max_variacao: 5,
  /** Somado ao alvo. */
  bonus: {
    campeao: 2,
    subida: 3,
    descida: -3,
    taca_vencedor: 2,
    taca_finalista: 1,
  },
  /** Bónus continental = pontos da fase × prestígio da competição. */
  continental_fase: { liga: 0.5, grupos: 0.5, playoff: 1, oitavos: 1.5, quartos: 2, meias: 3, final: 4, vencedor: 5 } as Record<string, number>,
  continental_prestigio: { UCL: 1, UEL: 0.6, UECL: 0.4, CLI: 0.9, ACLE: 0.7 } as Record<string, number>,
};
