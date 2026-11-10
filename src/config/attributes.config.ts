// Attribute definitions and per-position weights.
// Order of the arrays is the storage order in PlayerStore — append only, never reorder
// (saves and CSV exports depend on it).

export const ATTR_MIN = 1;
export const ATTR_MAX = 20;

export type AttributeGroup = 'technical' | 'mental' | 'physical' | 'goalkeeping';

export interface AttributeDef {
  key: string;
  label: string; // shown in the UI (pt-PT)
  group: AttributeGroup;
}

/** 30 visible attributes, 1–20. */
export const VISIBLE_ATTRIBUTES: readonly AttributeDef[] = [
  // technical (10)
  { key: 'finishing', label: 'Finalização', group: 'technical' },
  { key: 'longShots', label: 'Remate de longe', group: 'technical' },
  { key: 'passing', label: 'Passe', group: 'technical' },
  { key: 'crossing', label: 'Cruzamento', group: 'technical' },
  { key: 'dribbling', label: 'Drible', group: 'technical' },
  { key: 'firstTouch', label: 'Recepção', group: 'technical' },
  { key: 'heading', label: 'Cabeceamento', group: 'technical' },
  { key: 'tackling', label: 'Desarme', group: 'technical' },
  { key: 'marking', label: 'Marcação', group: 'technical' },
  { key: 'setPieces', label: 'Bolas paradas', group: 'technical' },
  // mental (9)
  { key: 'vision', label: 'Visão', group: 'mental' },
  { key: 'decisions', label: 'Decisões', group: 'mental' },
  { key: 'composure', label: 'Serenidade', group: 'mental' },
  { key: 'positioning', label: 'Posicionamento', group: 'mental' },
  { key: 'offTheBall', label: 'Movimentação', group: 'mental' },
  { key: 'anticipation', label: 'Antecipação', group: 'mental' },
  { key: 'workRate', label: 'Entrega', group: 'mental' },
  { key: 'teamwork', label: 'Trabalho de equipa', group: 'mental' },
  { key: 'leadership', label: 'Liderança', group: 'mental' },
  // physical (6)
  { key: 'pace', label: 'Velocidade', group: 'physical' },
  { key: 'acceleration', label: 'Aceleração', group: 'physical' },
  { key: 'stamina', label: 'Resistência', group: 'physical' },
  { key: 'strength', label: 'Força', group: 'physical' },
  { key: 'agility', label: 'Agilidade', group: 'physical' },
  { key: 'jumping', label: 'Impulsão', group: 'physical' },
  // goalkeeping (5)
  { key: 'reflexes', label: 'Reflexos', group: 'goalkeeping' },
  { key: 'handling', label: 'Segurar a bola', group: 'goalkeeping' },
  { key: 'aerialReach', label: 'Jogo aéreo (GR)', group: 'goalkeeping' },
  { key: 'oneOnOnes', label: 'Um para um', group: 'goalkeeping' },
  { key: 'distribution', label: 'Reposição', group: 'goalkeeping' },
] as const;

/** 6 hidden attributes, 1–20. Never shown directly in the UI, never visible to the AI. */
export const HIDDEN_ATTRIBUTES: readonly AttributeDef[] = [
  { key: 'professionalism', label: 'Profissionalismo', group: 'mental' },
  { key: 'ambition', label: 'Ambição', group: 'mental' },
  { key: 'consistency', label: 'Consistência', group: 'mental' },
  { key: 'injuryProneness', label: 'Propensão a lesões', group: 'physical' },
  { key: 'adaptability', label: 'Adaptabilidade', group: 'mental' },
  { key: 'pressure', label: 'Pressão', group: 'mental' },
] as const;

export const N_VISIBLE = VISIBLE_ATTRIBUTES.length; // 30
export const N_HIDDEN = HIDDEN_ATTRIBUTES.length; // 6

export const VISIBLE_INDEX: Record<string, number> = Object.fromEntries(
  VISIBLE_ATTRIBUTES.map((a, i) => [a.key, i]),
);
export const HIDDEN_INDEX: Record<string, number> = Object.fromEntries(
  HIDDEN_ATTRIBUTES.map((a, i) => [a.key, i]),
);

/** 12 positions. Order is the storage order of the familiarity array. */
export const POSITIONS = ['GK', 'DR', 'DC', 'DL', 'DM', 'MR', 'MC', 'ML', 'AM', 'RW', 'LW', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];
export const N_POSITIONS = POSITIONS.length;
export const POSITION_INDEX: Record<string, number> = Object.fromEntries(POSITIONS.map((p, i) => [p, i]));

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'GR', DR: 'DD', DC: 'DC', DL: 'DE', DM: 'MDC', MR: 'MD', MC: 'MC', ML: 'ME',
  AM: 'MO', RW: 'ED', LW: 'EE', ST: 'PL',
};

/** Familiarity levels stored per player per position. */
export const FAMILIARITY = { UNCOMFORTABLE: 0, COMPETENT: 1, NATURAL: 2 } as const;
export const FAMILIARITY_LABELS = ['Desconfortável', 'Competente', 'Natural'] as const;

/** Positions a player is usually at least "competent" in, given a natural position. */
export const ADJACENT_POSITIONS: Record<Position, Position[]> = {
  GK: [],
  DR: ['DC', 'MR'],
  DC: ['DM', 'DR', 'DL'],
  DL: ['DC', 'ML'],
  DM: ['MC', 'DC'],
  MR: ['RW', 'MC', 'DR'],
  MC: ['DM', 'AM'],
  ML: ['LW', 'MC', 'DL'],
  AM: ['MC', 'ST', 'RW', 'LW'],
  RW: ['MR', 'AM', 'LW', 'ST'],
  LW: ['ML', 'AM', 'RW', 'ST'],
  ST: ['AM', 'RW', 'LW'],
};

/**
 * Relative weights of each visible attribute for each position.
 * Unlisted attributes have weight 0. Weights are normalised at runtime.
 * Used by the generator (phase 1) and the OVR formula (phase 2).
 */
export const POSITION_WEIGHTS: Record<Position, Partial<Record<string, number>>> = {
  GK: { reflexes: 10, handling: 8, aerialReach: 6, oneOnOnes: 6, distribution: 4, positioning: 6,
    composure: 3, decisions: 3, anticipation: 3, agility: 4, jumping: 2, leadership: 1 },
  DR: { tackling: 7, marking: 6, positioning: 6, pace: 6, acceleration: 4, stamina: 5, crossing: 4,
    workRate: 4, anticipation: 4, decisions: 3, passing: 3, teamwork: 3, dribbling: 2, agility: 2, firstTouch: 2 },
  DL: { tackling: 7, marking: 6, positioning: 6, pace: 6, acceleration: 4, stamina: 5, crossing: 4,
    workRate: 4, anticipation: 4, decisions: 3, passing: 3, teamwork: 3, dribbling: 2, agility: 2, firstTouch: 2 },
  DC: { marking: 8, tackling: 8, positioning: 8, heading: 7, strength: 6, jumping: 5, anticipation: 5,
    composure: 4, decisions: 4, pace: 3, passing: 2, leadership: 2, teamwork: 2 },
  DM: { tackling: 7, positioning: 7, passing: 6, anticipation: 6, decisions: 5, marking: 5, teamwork: 5,
    workRate: 5, stamina: 4, strength: 4, composure: 4, firstTouch: 3, vision: 3 },
  MC: { passing: 8, vision: 6, decisions: 6, firstTouch: 5, teamwork: 5, composure: 5, stamina: 5,
    workRate: 4, anticipation: 4, offTheBall: 3, tackling: 3, longShots: 3, dribbling: 3, positioning: 2 },
  MR: { crossing: 7, pace: 6, dribbling: 6, stamina: 5, acceleration: 5, passing: 5, workRate: 4,
    firstTouch: 4, offTheBall: 4, teamwork: 3, decisions: 3, agility: 3, tackling: 2 },
  ML: { crossing: 7, pace: 6, dribbling: 6, stamina: 5, acceleration: 5, passing: 5, workRate: 4,
    firstTouch: 4, offTheBall: 4, teamwork: 3, decisions: 3, agility: 3, tackling: 2 },
  AM: { passing: 7, vision: 7, dribbling: 6, firstTouch: 6, offTheBall: 5, decisions: 5, composure: 4,
    longShots: 4, finishing: 4, agility: 4, acceleration: 3, setPieces: 2 },
  RW: { dribbling: 8, pace: 7, acceleration: 7, crossing: 5, firstTouch: 5, offTheBall: 5, finishing: 4,
    agility: 5, passing: 4, decisions: 3, composure: 3, longShots: 2 },
  LW: { dribbling: 8, pace: 7, acceleration: 7, crossing: 5, firstTouch: 5, offTheBall: 5, finishing: 4,
    agility: 5, passing: 4, decisions: 3, composure: 3, longShots: 2 },
  ST: { finishing: 9, offTheBall: 7, composure: 6, firstTouch: 5, heading: 5, pace: 5, acceleration: 5,
    anticipation: 5, strength: 4, dribbling: 4, decisions: 3, agility: 3, longShots: 2 },
};

/** OVR scale: OVR ≈ weighted mean of the relevant attributes × this factor. 20 → 100. */
export const OVR_PER_ATTRIBUTE_POINT = 5;
