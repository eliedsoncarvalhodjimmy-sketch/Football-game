// Write a world back to the local-files format (clubs.csv, players.csv, world.json).
// Used to dump the fictional world as an example of the format you'll use for real data.

import type { WorldStore } from '../engine/store/worldStore';
import type { RawWorld } from '../engine/types';
import { LIST_SEP, toCsv } from './csv';
import { CLUB_COLUMNS, PLAYER_COLUMNS, type WorldFile } from './schema';

export function clubsToCsv(raw: Pick<RawWorld, 'clubs'>, delimiter = ','): string {
  return toCsv(CLUB_COLUMNS, raw.clubs.map((c) => [
    c.id, c.name, c.shortName, c.countryId, c.leagueId, c.city, c.reputation, c.stadiumCapacity,
    c.transferBudget, c.wageBudget, c.facilities, c.youthFacilities, c.crest, c.rivals.join(LIST_SEP),
    c.colorPrimary, c.colorSecondary,
  ]), delimiter);
}

export function playersToCsv(raw: Pick<RawWorld, 'players'>, delimiter = ','): string {
  return toCsv(PLAYER_COLUMNS, raw.players.map((p) => [
    p.id, p.firstName, p.lastName, p.clubId, p.nationality, p.birthDate, p.position,
    p.otherPositions.join(LIST_SEP), p.ovr, p.foot, p.heightCm,
  ]), delimiter);
}

export function worldFileFor(raw: RawWorld): WorldFile {
  return { name: raw.meta.name, seed: raw.meta.seed, referenceDate: raw.meta.referenceDate };
}

export function worldStoreToRaw(world: WorldStore): RawWorld {
  return {
    meta: world.meta,
    countries: world.countries,
    clubs: world.clubs,
    players: Array.from({ length: world.players.count }, (_, i) => world.playerRecord(i)),
  };
}
