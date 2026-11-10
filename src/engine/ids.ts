// Date helpers. (Generated ids are built in engine/world/squads.ts; imported data keeps its own ids.)

/** Age in whole years at a reference date (both YYYY-MM-DD). */
export function ageAt(birthDate: string, referenceDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
}
