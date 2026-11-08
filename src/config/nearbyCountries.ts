// Nearby countries for academy intake (phase 6): up to 10% of youngsters may come from these.
// Includes countries outside the 29 playable ones, identified by simple codes (only used as nationality).

export const NEARBY_COUNTRIES: Record<string, string[]> = {
  ESP: ['POR', 'FRA', 'MAR', 'AND'],
  POR: ['ESP', 'BRA', 'CPV', 'ANG'],
  FRA: ['BEL', 'SUI', 'ESP', 'GER', 'SEN', 'CIV'],
  GER: ['AUT', 'SUI', 'NED', 'POL', 'DEN', 'CZE'],
  ENG: ['SCO', 'WAL', 'IRL', 'NIR'],
  SCO: ['ENG', 'NIR', 'IRL', 'WAL'],
  BEL: ['NED', 'FRA', 'GER', 'LUX'],
  NED: ['BEL', 'GER', 'SUR'],
  DEN: ['SWE', 'NOR', 'GER'],
  NOR: ['SWE', 'DEN', 'ISL'],
  SWE: ['NOR', 'DEN', 'FIN'],
  AUT: ['GER', 'SUI', 'CZE', 'HUN', 'SLO'],
  SUI: ['GER', 'FRA', 'AUT', 'ITA'],
  CZE: ['SVK', 'POL', 'AUT', 'GER'],
  POL: ['CZE', 'SVK', 'UKR', 'GER', 'LTU'],
  HUN: ['AUT', 'SVK', 'ROU', 'SRB', 'CRO'],
  UKR: ['POL', 'ROU', 'MDA', 'SVK'],
  CRO: ['SLO', 'BIH', 'SRB', 'HUN'],
  GRE: ['CYP', 'ALB', 'MKD', 'BUL'],
  TUR: ['GRE', 'BUL', 'GEO', 'AZE'],
  KSA: ['UAE', 'QAT', 'KUW', 'JOR', 'EGY'],
  USA: ['CAN', 'MEX', 'JAM', 'CRC'],
  BRA: ['ARG', 'URU', 'PAR', 'COL'],
  ARG: ['URU', 'PAR', 'CHI', 'BRA'],
  URU: ['ARG', 'BRA', 'PAR'],
  COL: ['ECU', 'VEN', 'PER', 'PAN'],
  ECU: ['COL', 'PER'],
  JPN: ['KOR', 'CHN'],
  KOR: ['JPN', 'CHN'],
};

/** Maximum share of an academy intake that may come from nearby countries. */
export const NEARBY_INTAKE_MAX_SHARE = 0.1;
