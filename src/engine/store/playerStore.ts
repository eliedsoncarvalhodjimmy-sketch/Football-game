// Compact structure-of-arrays storage for players.
// ~30k senior players × ~90 bytes of typed data ≈ 2.7 MB, plus name strings.

import { N_HIDDEN, N_POSITIONS, N_VISIBLE } from '../../config/attributes.config';

export const FOOT_CODES = ['R', 'L', 'B'] as const;

export class PlayerStore {
  count = 0;
  capacity: number;

  // strings (kept as plain arrays; the JS engine interns/compacts short strings well)
  ids: string[] = [];
  firstNames: string[] = [];
  lastNames: string[] = [];

  /** Dictionary of nationality codes; `nationality` stores indices into it. */
  nationalityCodes: string[] = [];
  private nationalityLookup = new Map<string, number>();

  clubIndex: Int32Array; // -1 = free agent
  nationality: Uint16Array;
  birthDate: Int32Array; // YYYYMMDD
  position: Uint8Array; // natural (primary) position index
  foot: Uint8Array; // index into FOOT_CODES
  heightCm: Uint8Array;
  ovrInput: Uint8Array; // OVR as provided by the data source / generator
  potential: Uint8Array; // hidden ceiling (OVR scale)
  seed: Uint32Array; // per-player seed for deterministic derived values
  attrs: Uint8Array; // capacity × N_VISIBLE
  hidden: Uint8Array; // capacity × N_HIDDEN
  familiarity: Uint8Array; // capacity × N_POSITIONS

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.clubIndex = new Int32Array(this.capacity);
    this.nationality = new Uint16Array(this.capacity);
    this.birthDate = new Int32Array(this.capacity);
    this.position = new Uint8Array(this.capacity);
    this.foot = new Uint8Array(this.capacity);
    this.heightCm = new Uint8Array(this.capacity);
    this.ovrInput = new Uint8Array(this.capacity);
    this.potential = new Uint8Array(this.capacity);
    this.seed = new Uint32Array(this.capacity);
    this.attrs = new Uint8Array(this.capacity * N_VISIBLE);
    this.hidden = new Uint8Array(this.capacity * N_HIDDEN);
    this.familiarity = new Uint8Array(this.capacity * N_POSITIONS);
  }

  nationalityIndex(code: string): number {
    let i = this.nationalityLookup.get(code);
    if (i === undefined) {
      i = this.nationalityCodes.length;
      this.nationalityCodes.push(code);
      this.nationalityLookup.set(code, i);
    }
    return i;
  }

  /** Append a player slot; returns its index. Typed fields must be filled by the caller. */
  add(id: string, firstName: string, lastName: string): number {
    if (this.count === this.capacity) this.grow(this.capacity * 2);
    const i = this.count++;
    this.ids[i] = id;
    this.firstNames[i] = firstName;
    this.lastNames[i] = lastName;
    return i;
  }

  grow(newCapacity: number): void {
    const g = <T extends Uint8Array | Uint16Array | Int32Array | Uint32Array>(a: T, per = 1): T => {
      const n = new (a.constructor as new (len: number) => T)(newCapacity * per);
      n.set(a);
      return n;
    };
    this.clubIndex = g(this.clubIndex);
    this.nationality = g(this.nationality);
    this.birthDate = g(this.birthDate);
    this.position = g(this.position);
    this.foot = g(this.foot);
    this.heightCm = g(this.heightCm);
    this.ovrInput = g(this.ovrInput);
    this.potential = g(this.potential);
    this.seed = g(this.seed);
    this.attrs = g(this.attrs, N_VISIBLE);
    this.hidden = g(this.hidden, N_HIDDEN);
    this.familiarity = g(this.familiarity, N_POSITIONS);
    this.capacity = newCapacity;
  }

  attr(i: number, a: number): number {
    return this.attrs[i * N_VISIBLE + a];
  }

  /** Bytes used by typed arrays (for the memory budget). */
  typedBytes(): number {
    return [
      this.clubIndex, this.nationality, this.birthDate, this.position, this.foot, this.heightCm,
      this.ovrInput, this.potential, this.seed, this.attrs, this.hidden, this.familiarity,
    ].reduce((s, a) => s + a.byteLength, 0);
  }

  /** Plain, structured-cloneable snapshot (typed arrays trimmed to `count`). */
  toSnapshot(): PlayerStoreSnapshot {
    const n = this.count;
    return {
      count: n,
      ids: this.ids.slice(0, n),
      firstNames: this.firstNames.slice(0, n),
      lastNames: this.lastNames.slice(0, n),
      nationalityCodes: this.nationalityCodes.slice(),
      clubIndex: this.clubIndex.slice(0, n),
      nationality: this.nationality.slice(0, n),
      birthDate: this.birthDate.slice(0, n),
      position: this.position.slice(0, n),
      foot: this.foot.slice(0, n),
      heightCm: this.heightCm.slice(0, n),
      ovrInput: this.ovrInput.slice(0, n),
      potential: this.potential.slice(0, n),
      seed: this.seed.slice(0, n),
      attrs: this.attrs.slice(0, n * N_VISIBLE),
      hidden: this.hidden.slice(0, n * N_HIDDEN),
      familiarity: this.familiarity.slice(0, n * N_POSITIONS),
    };
  }

  static fromSnapshot(s: PlayerStoreSnapshot): PlayerStore {
    const p = new PlayerStore(s.count);
    p.count = s.count;
    p.ids = s.ids.slice();
    p.firstNames = s.firstNames.slice();
    p.lastNames = s.lastNames.slice();
    for (const c of s.nationalityCodes) p.nationalityIndex(c);
    p.clubIndex.set(s.clubIndex);
    p.nationality.set(s.nationality);
    p.birthDate.set(s.birthDate);
    p.position.set(s.position);
    p.foot.set(s.foot);
    p.heightCm.set(s.heightCm);
    p.ovrInput.set(s.ovrInput);
    p.potential.set(s.potential);
    p.seed.set(s.seed);
    p.attrs.set(s.attrs);
    p.hidden.set(s.hidden);
    p.familiarity.set(s.familiarity);
    return p;
  }
}

export interface PlayerStoreSnapshot {
  count: number;
  ids: string[];
  firstNames: string[];
  lastNames: string[];
  nationalityCodes: string[];
  clubIndex: Int32Array;
  nationality: Uint16Array;
  birthDate: Int32Array;
  position: Uint8Array;
  foot: Uint8Array;
  heightCm: Uint8Array;
  ovrInput: Uint8Array;
  potential: Uint8Array;
  seed: Uint32Array;
  attrs: Uint8Array;
  hidden: Uint8Array;
  familiarity: Uint8Array;
}

export const dateToInt = (d: string): number => Number(d.replaceAll('-', ''));
export const intToDate = (n: number): string => {
  const s = String(n).padStart(8, '0');
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
