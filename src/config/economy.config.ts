// Economy inputs used from phase 1 (population / GDP). Finances themselves are phase 4.

export const ECONOMY = {
  /** Each country-club has this share of the real population (prompt v2.4 §1). */
  populationShare: 0.1,
  currency: 'EUR' as const,

  /**
   * TEST WORLD ONLY: invented population and GDP (flagged economyStatus = "test").
   * Log-normal: exp(normal(mu, sigma)). Real values come from your countries.csv.
   */
  testPopulation: { mu: 15.2, sigma: 1.9, min: 5_000, max: 1_500_000_000 },
  testGdpPerCapita: { mu: 9.0, sigma: 1.1, min: 400, max: 130_000 },
} as const;
