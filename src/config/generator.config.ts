// Tuning for the fictional world generator and the deterministic attribute generator.
// Edit freely: none of these values are real data.

import type { Position } from './attributes.config';

export const GENERATOR = {
  /** Default world seed. */
  defaultSeed: 20260801,
  /** Reference date (season start) used to compute ages. */
  referenceDate: '2026-08-01',

  /** Senior squad template: natural position → number of players. Sum = squad size (26). */
  squadTemplate: {
    GK: 3, DR: 2, DC: 4, DL: 2, DM: 2, MC: 4, MR: 1, ML: 1, AM: 2, RW: 1, LW: 1, ST: 3,
  } as Record<Position, number>,

  /** Age distribution of senior players: [age, relative weight]. */
  ageWeights: [
    [17, 2], [18, 4], [19, 6], [20, 7], [21, 8], [22, 9], [23, 9], [24, 9], [25, 9], [26, 9],
    [27, 8], [28, 8], [29, 7], [30, 6], [31, 5], [32, 4], [33, 3], [34, 2], [35, 1.2], [36, 0.6],
  ] as [number, number][],

  /** Share of players with a foreign nationality, by league tier (index 0 = tier 1). */
  foreignShareByTier: [0.35, 0.2, 0.12, 0.08],

  /**
   * Squad depth: OVR offset relative to the club's first XI mean, by rank inside the squad
   * at the same position (0 = starter). Then normal noise with sd = ovrNoiseSd.
   */
  depthOffset: [1.5, -3, -6, -8],
  ovrNoiseSd: 3,
  /** Young players are below their club level: OVR penalty per year under youngPenaltyAge. */
  youngPenaltyAge: 22,
  youngPenaltyPerYear: 2.5,
  /** Older players decline: OVR penalty per year above oldPenaltyAge. */
  oldPenaltyAge: 32,
  oldPenaltyPerYear: 1.5,
  ovrMin: 35,
  ovrMax: 94,

  /** Club generation */
  club: {
    /** Exponent for the curve rank → strength inside a league (>1 = few dominant clubs). */
    strengthCurve: 1.6,
    rivalsMin: 0,
    rivalsMax: 2,
    /** Probability that a club shares a city with another club of the same country (derby). */
    sameCityChance: 0.12,
    /** Reputation = base + (club OVR − 70) × perPoint + noise, clamped 1–100. */
    reputationBase: 55,
    reputationPerOvrPoint: 2.2,
    reputationNoiseSd: 4,
    /** Budgets (EUR): base × exp(reputation / scale). */
    transferBudgetBase: 100_000,
    transferBudgetScale: 12,
    wageBudgetBase: 200_000,
    wageBudgetScale: 13,
    /** Stadium capacity = base + reputation² × perRep². */
    stadiumBase: 3_000,
    stadiumPerRep2: 8,
  },

  /** Free agents (no club) in the fictional world. */
  freeAgents: { count: 400, ovrMin: 48, ovrMax: 70, ageMin: 21, ageMax: 34 },

  /** Height (cm): mean by position, sd. */
  heightMean: { GK: 189, DC: 187, ST: 183, DM: 182 } as Partial<Record<Position, number>>,
  heightMeanDefault: 178,
  heightSd: 6,
} as const;

/** Deterministic attribute generator tuning (used for both fictional and imported players). */
export const ATTRIBUTE_GEN = {
  /** How far above target the most important attributes of a position go (in 1–20 points). */
  keyAttributeLift: 2.0,
  /** How far below target the irrelevant attributes go. */
  offAttributeDrop: 5.0,
  /** Per-attribute noise sd (1–20 points). */
  noiseSd: 1.6,
  /** Outfield players' goalkeeping attributes are around this value. */
  outfieldGkLevel: 3,
  /** Goalkeepers' outfield technical attributes are reduced by this factor. */
  gkOutfieldFactor: 0.45,
  /** Age effects (points): young players are more physical, veterans more mental. */
  youngPhysicalBonus: 1.0,
  youngMentalPenalty: 1.5,
  veteranPhysicalPenaltyPerYear: 0.45,
  veteranMentalBonus: 1.2,
  veteranAge: 30,
  /** Number of correction passes so the weighted mean matches the target OVR. */
  correctionPasses: 4,

  /** Familiarity: chance for each adjacent position to be "competent". */
  adjacentCompetentChance: 0.6,
  /** Chance of a second natural position among the adjacent ones. */
  secondNaturalChance: 0.15,

  /** Potential (hidden ceiling, OVR scale). */
  potential: {
    /** Expected remaining growth by age (OVR points). Linear interpolation, 0 after the last age. */
    growthByAge: [[15, 22], [17, 18], [19, 13], [21, 8], [23, 4], [25, 1.5], [27, 0.5], [28, 0]] as [number, number][],
    /** Extra growth for high league quality / club reputation (talent goes to good clubs). */
    reputationBonusMax: 4,
    sd: 4,
    max: 99,
  },

  /** Hidden attributes: mean / sd (1–20). */
  hidden: {
    mean: 11,
    sd: 3.5,
    /** professionalism & ambition drift with OVR: +k per 10 OVR above 60 */
    eliteDriftPer10Ovr: 0.8,
  },
} as const;
