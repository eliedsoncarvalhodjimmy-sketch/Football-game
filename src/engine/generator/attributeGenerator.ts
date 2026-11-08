// Deterministic attribute generator.
// Input: what free data sources provide (OVR, position, age) + context (league quality, club reputation).
// Output: 30 visible attributes, 6 hidden attributes, hidden potential and position familiarity.
// Same inputs + same seed ⇒ exactly the same output.

import {
  ADJACENT_POSITIONS, ATTR_MAX, ATTR_MIN, FAMILIARITY, N_HIDDEN, N_POSITIONS, N_VISIBLE,
  HIDDEN_INDEX, OVR_PER_ATTRIBUTE_POINT, POSITIONS, POSITION_INDEX, POSITION_WEIGHTS,
  VISIBLE_ATTRIBUTES, type Position,
} from '../../config/attributes.config';
import { ATTRIBUTE_GEN as G } from '../../config/generator.config';
import { Rng, clamp } from '../rng';

export interface AttributeGenInput {
  seed: number;
  ovr: number;
  position: Position;
  /** Explicit secondary positions (from files). If given, they are used instead of random ones. */
  otherPositions?: readonly string[];
  age: number;
  /** Mean OVR of the league (LeagueConfig.quality). */
  leagueQuality: number;
  /** Club reputation 1–100 (free agents: use ~30). */
  clubReputation: number;
}

export interface AttributeGenOutput {
  visible: Uint8Array; // N_VISIBLE
  hidden: Uint8Array; // N_HIDDEN
  potential: number;
  familiarity: Uint8Array; // N_POSITIONS
}

/** Normalised weight vectors per position (sum = 1), precomputed once. */
export const NORMALISED_WEIGHTS: Float64Array[] = POSITIONS.map((p) => {
  const w = new Float64Array(N_VISIBLE);
  const def = POSITION_WEIGHTS[p];
  let sum = 0;
  VISIBLE_ATTRIBUTES.forEach((a, i) => {
    const v = def[a.key] ?? 0;
    w[i] = v;
    sum += v;
  });
  for (let i = 0; i < N_VISIBLE; i++) w[i] /= sum;
  return w;
});

/** Relevant attribute indices per position, most important first. */
const WEIGHT_ORDER: number[][] = NORMALISED_WEIGHTS.map((w) =>
  Array.from(w.keys()).filter((i) => w[i] > 0).sort((a, b) => w[b] - w[a]),
);

/** Weighted mean of attributes for a position, on the OVR scale (1–20 → 5–100). */
export function weightedOvr(attrs: ArrayLike<number>, positionIndex: number, offset = 0): number {
  const w = NORMALISED_WEIGHTS[positionIndex];
  let m = 0;
  for (let i = 0; i < N_VISIBLE; i++) m += w[i] * attrs[offset + i];
  return m * OVR_PER_ATTRIBUTE_POINT;
}

const GROUP = VISIBLE_ATTRIBUTES.map((a) => a.group);

function interpolate(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

export function generateAttributes(input: AttributeGenInput, out?: AttributeGenOutput): AttributeGenOutput {
  const rng = new Rng(input.seed);
  const posIdx = POSITION_INDEX[input.position];
  const isGk = input.position === 'GK';
  const w = NORMALISED_WEIGHTS[posIdx];
  let maxW = 0;
  for (let i = 0; i < N_VISIBLE; i++) if (w[i] > maxW) maxW = w[i];

  const target = clamp(input.ovr, 1, 99) / OVR_PER_ATTRIBUTE_POINT;
  const v = new Float64Array(N_VISIBLE);
  const age = input.age;

  for (let i = 0; i < N_VISIBLE; i++) {
    const group = GROUP[i];
    const r = w[i] / maxW; // relevance 0..1
    let base: number;
    if (group === 'goalkeeping' && !isGk) {
      base = G.outfieldGkLevel + rng.normal(0, 1);
    } else if (isGk && group === 'technical' && r === 0) {
      base = target * G.gkOutfieldFactor + rng.normal(0, 1.5);
    } else {
      // generic mental/physical attributes drop less when irrelevant
      const drop = group === 'technical' ? G.offAttributeDrop : G.offAttributeDrop * 0.5;
      base = target + G.keyAttributeLift * r - drop * (1 - r) + rng.normal(0, G.noiseSd);
    }
    // age shape
    if (group === 'physical') {
      if (age <= 21) base += G.youngPhysicalBonus;
      if (age > G.veteranAge) base -= G.veteranPhysicalPenaltyPerYear * (age - G.veteranAge);
    } else if (group === 'mental') {
      if (age <= 21) base -= G.youngMentalPenalty;
      if (age > G.veteranAge) base += G.veteranMentalBonus;
    }
    v[i] = base;
  }

  // Correction passes: make the weighted mean match the target, then clamp.
  for (let pass = 0; pass < G.correctionPasses; pass++) {
    let m = 0;
    for (let i = 0; i < N_VISIBLE; i++) m += w[i] * v[i];
    const delta = target - m;
    for (let i = 0; i < N_VISIBLE; i++) {
      if (w[i] > 0) v[i] = clamp(v[i] + delta, ATTR_MIN, ATTR_MAX);
      else if (!(GROUP[i] === 'goalkeeping' && !isGk)) v[i] = clamp(v[i] + delta * 0.5, ATTR_MIN, ATTR_MAX);
      else v[i] = clamp(v[i], ATTR_MIN, ATTR_MAX);
    }
  }

  const visible = out?.visible ?? new Uint8Array(N_VISIBLE);
  for (let i = 0; i < N_VISIBLE; i++) visible[i] = Math.round(v[i]);
  // Fix rounding/clamping drift: nudge relevant attributes (most important first) by ±1
  // until the weighted OVR is within ±0.5 of the target (or nothing can move).
  const order = WEIGHT_ORDER[posIdx];
  for (let guard = 0; guard < 4; guard++) {
    let moved = false;
    for (const i of order) {
      const diff = input.ovr - weightedOvr(visible, posIdx);
      if (Math.abs(diff) <= 0.5) break;
      const nv = clamp(visible[i] + Math.sign(diff), ATTR_MIN, ATTR_MAX);
      if (nv !== visible[i]) {
        visible[i] = nv;
        moved = true;
      }
    }
    if (!moved || Math.abs(input.ovr - weightedOvr(visible, posIdx)) <= 0.5) break;
  }

  // Hidden attributes
  const hidden = out?.hidden ?? new Uint8Array(N_HIDDEN);
  const elite = (G.hidden.eliteDriftPer10Ovr * (input.ovr - 60)) / 10;
  for (let h = 0; h < N_HIDDEN; h++) {
    let val = rng.normal(G.hidden.mean, G.hidden.sd);
    if (h === HIDDEN_INDEX.professionalism || h === HIDDEN_INDEX.ambition) val += elite;
    hidden[h] = Math.round(clamp(val, ATTR_MIN, ATTR_MAX));
  }

  // Potential (hidden ceiling on the OVR scale)
  const P = G.potential;
  const growth = interpolate(P.growthByAge, age);
  let potential = input.ovr;
  if (growth > 0) {
    const repFactor = clamp(input.clubReputation / 100, 0, 1) * 0.6 + clamp((input.leagueQuality - 55) / 25, 0, 1) * 0.4;
    const bonus = P.reputationBonusMax * repFactor * Math.min(1, growth / 10);
    const noise = rng.normal(0, P.sd * Math.min(1, growth / 12 + 0.25));
    potential = input.ovr + Math.max(0, growth + bonus + noise);
  } else {
    potential = input.ovr + Math.max(0, rng.normal(0, 0.6));
  }
  potential = Math.round(clamp(potential, input.ovr, P.max));

  // Familiarity
  const familiarity = out?.familiarity ?? new Uint8Array(N_POSITIONS);
  familiarity.fill(FAMILIARITY.UNCOMFORTABLE);
  familiarity[posIdx] = FAMILIARITY.NATURAL;
  if (input.otherPositions && input.otherPositions.length > 0) {
    for (const p of input.otherPositions) {
      const k = POSITION_INDEX[p];
      if (k !== undefined && k !== posIdx) familiarity[k] = FAMILIARITY.COMPETENT;
    }
  } else {
    const adj = ADJACENT_POSITIONS[input.position];
    let secondNatural = rng.chance(G.secondNaturalChance);
    for (const p of adj) {
      if (rng.chance(G.adjacentCompetentChance)) {
        familiarity[POSITION_INDEX[p]] = secondNatural ? FAMILIARITY.NATURAL : FAMILIARITY.COMPETENT;
        secondNatural = false;
      }
    }
  }

  if (out) {
    out.potential = potential;
    return out;
  }
  return { visible, hidden, potential, familiarity };
}
