import { generateWorld } from '../src/engine/generator/worldGenerator';
import { buildWorld, type WorldStore } from '../src/engine/store/worldStore';
import type { RawWorld } from '../src/engine/types';

let cached: { raw: RawWorld; world: WorldStore } | null = null;

/** Full fictional world, built once per test file. */
export function fullWorld(): { raw: RawWorld; world: WorldStore } {
  if (!cached) {
    const raw = generateWorld();
    cached = { raw, world: buildWorld(raw) };
  }
  return cached;
}
