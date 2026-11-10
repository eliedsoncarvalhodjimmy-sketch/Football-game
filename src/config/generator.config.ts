// Tuning for the fictional world generator and the deterministic attribute generator.
// Edit freely: none of these values are real data.

export const GENERATOR = {
  /** Default world seed. */
  defaultSeed: 20260205,
  /** Reference date (season start) used to compute ages. */
  referenceDate: '2026-02-05',

  /** Country-clubs in the test world. */
  country: {
    /** Test reputation 1–100: normal(mean, sd) per confederation strength. */
    reputationMean: { UEFA: 55, CONMEBOL: 65, CAF: 42, AFC: 38, CONCACAF: 35, OFC: 25 } as Record<string, number>,
    reputationSd: 18,
    /** Exponent for rank → strength inside a division (>1 = few dominant teams). */
    strengthCurve: 1.4,
  },

  /** Squad depth: OVR offset by rank at the same position (0 = starter), then normal noise. */
  depthOffset: [1.5, -3, -6, -8],
  ovrNoiseSd: 3,
  youngPenaltyAge: 22,
  youngPenaltyPerYear: 2.5,
  oldPenaltyAge: 32,
  oldPenaltyPerYear: 1.5,
  ovrMin: 25,
  ovrMax: 94,

  /** Height (cm): mean by position, sd. */
  heightMean: { GK: 189, DC: 187, ST: 183, DM: 182 } as Record<string, number>,
  heightMeanDefault: 178,
  heightSd: 6,

  /**
   * Reference market value (EUR) used by the attribute generator and the test world:
   * value = base × exp(k × (OVR − 60)) × ageFactor. Proper valuation comes in phase 5.
   */
  value: {
    base: 400_000,
    k: 0.16,
    /** [age, factor] — interpolated. */
    ageFactor: [[16, 1.4], [20, 1.6], [24, 1.4], [27, 1.0], [30, 0.6], [33, 0.25], [36, 0.1]] as [number, number][],
    testNoiseSd: 0.35,
  },
} as const;

/** Deterministic attribute generator tuning (used for both fictional and imported players). */
export const ATTRIBUTE_GEN = {
  keyAttributeLift: 2.0,
  offAttributeDrop: 5.0,
  noiseSd: 1.6,
  outfieldGkLevel: 3,
  gkOutfieldFactor: 0.45,
  youngPhysicalBonus: 1.0,
  youngMentalPenalty: 1.5,
  veteranPhysicalPenaltyPerYear: 0.45,
  veteranMentalBonus: 1.2,
  veteranAge: 30,
  correctionPasses: 4,

  adjacentCompetentChance: 0.6,
  secondNaturalChance: 0.15,

  /** Potential (hidden ceiling, OVR scale). */
  potential: {
    /** Expected remaining growth by age (OVR points). Linear interpolation, 0 after the last age. */
    growthByAge: [[15, 22], [17, 18], [19, 13], [21, 8], [23, 4], [25, 1.5], [27, 0.5], [28, 0]] as [number, number][],
    /** Extra growth for country reputation / division quality (talent goes to strong countries). */
    reputationBonusMax: 3,
    /**
     * Market value signal: a young player valued above the reference value for his OVR/age
     * is seen by the market as a bigger talent. Bonus = valueBonusPerDoubling × log2(value / reference).
     */
    valueBonusPerDoubling: 2.5,
    valueBonusMax: 6,
    sd: 4,
    max: 99,
  },

  hidden: {
    mean: 11,
    sd: 3.5,
    eliteDriftPer10Ovr: 0.8,
  },
} as const;
