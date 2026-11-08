// Stable id helpers for generated entities. Imported data keeps the ids from the files.

export const clubIdFor = (leagueId: string, index: number): string =>
  `T-${leagueId}-${String(index + 1).padStart(2, '0')}`;

export const playerIdFor = (clubId: string, index: number): string =>
  `${clubId}-P${String(index + 1).padStart(2, '0')}`;

/** Age in whole years at a reference date (both YYYY-MM-DD). */
export function ageAt(birthDate: string, referenceDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
}
