// Reference market value (EUR) for an OVR and age. Used as an input signal by the attribute
// generator and to give test players a value. Real valuation (contract, context) is phase 5.

import { GENERATOR } from '../../config/generator.config';

export function interpolate(table: readonly (readonly [number, number])[], x: number): number {
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

export function referenceValue(ovr: number, age: number): number {
  const V = GENERATOR.value;
  return V.base * Math.exp(V.k * (ovr - 60)) * interpolate(V.ageFactor, age);
}
