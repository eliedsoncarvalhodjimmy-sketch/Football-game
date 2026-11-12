// Parâmetros do gerador de clubes (mundo fictício e clubes em falta).
// PROVISÓRIO: à espera do documento do utilizador (pendência 5).

export const GERACAO = {
  reputacao: {
    // Curva dentro de cada liga: rep = piso + (tecto - piso) * f(u), u = posição/(n-1)
    // f(u) = (1 - a) * (1 - u) + a * (1 - u)^p  -> topo íngreme (poucos muito fortes), meio largo.
    a: 0.45,
    p: 6,
    /** Ruído (desvio-padrão) somado antes de reordenar. */
    ruido: 2,
    /** Se a liga não tiver geracao.rep_tecto/rep_piso: fórmula a partir do índice de riqueza. */
    tecto: (riqueza: number) => 34 + 12.5 * Math.log1p(riqueza),
    piso: (riqueza: number) => 14 + 9.5 * Math.log1p(riqueza),
  },
  estadio: {
    max: 80000,
    /** Tecto absoluto depois do ruído. */
    limite: 95000,
    min: 1500,
    expoente: 2.2,
    ruido_relativo: 0.2,
  },
  /** Probabilidade de um clube novo partilhar a cidade de outro do mesmo país (dérbis). */
  prob_mesma_cidade: 0.12,
  /** Probabilidade de um clube ter um rival "regional" na mesma liga (além dos da mesma cidade). */
  prob_rival_liga: 0.6,
  max_rivais: 2,
  /** Clubes que sobem do exterior: reputação = piso da liga - desconto. */
  exterior: { desconto_reputacao: 4, ruido: 2 },
  cores: [
    '#c8102e', '#003399', '#ffffff', '#000000', '#006a4e', '#fdb913', '#6cabdd', '#7a263a',
    '#f47b20', '#5c2d91', '#00843d', '#1b458f', '#ee2737', '#ffd100', '#8b0000', '#00a3e0',
    '#2e2d2c', '#e30613', '#004b87', '#78be20',
  ],
};
