// Write a world back to the local-files format (countries.csv, players.csv, world.json).
// Used to dump the fictional world as an example of the format for your real data.

import type { WorldStore } from '../engine/store/worldStore';
import type { RawWorld } from '../engine/types';
import { LIST_SEP, toCsv } from './csv';
import { COUNTRY_COLUMNS, PLAYER_COLUMNS, type WorldFile } from './schema';

export function countriesToCsv(raw: Pick<RawWorld, 'countries'>, delimiter = ','): string {
  return toCsv(COUNTRY_COLUMNS, raw.countries.map((c) => [
    c.id, c.name, c.confederation, c.population ?? '', c.gdpUsd ?? '', c.reputation, c.footballCulture,
    c.youthStrength, c.division, c.flag, c.rivals.join(LIST_SEP), c.colorPrimary, c.colorSecondary,
  ]), delimiter);
}

export function playersToCsv(raw: Pick<RawWorld, 'players'>, delimiter = ','): string {
  return toCsv(PLAYER_COLUMNS, raw.players.map((p) => [
    p.id, p.firstName, p.lastName, p.nationality, p.team, p.squad, p.birthDate, p.position,
    p.otherPositions.join(LIST_SEP), p.ovr, p.valueEur ?? '', p.foot, p.heightCm,
  ]), delimiter);
}

export function worldFileFor(raw: RawWorld): WorldFile {
  return { name: raw.meta.name, seed: raw.meta.seed, referenceDate: raw.meta.referenceDate };
}

export function worldStoreToRaw(world: WorldStore): RawWorld {
  return {
    meta: world.meta,
    confederations: world.confederations,
    countries: world.countries,
    players: Array.from({ length: world.players.count }, (_, i) => world.playerRecord(i)),
  };
}
