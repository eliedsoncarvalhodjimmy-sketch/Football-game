// Local files adapter: reads world.json (optional), clubs.csv, players.csv and attributes.csv (optional)
// through a FileProvider (Node fs, browser File API or in-memory).

import { GENERATOR } from '../../config/generator.config';
import { defaultCountries } from '../../config/world.config';
import type { CountryConfig } from '../../engine/types';
import { parseCsv } from '../csv';
import type { DataIssue, DataSource, FileProvider, LoadResult } from '../DataSource';
import { FILES, type WorldFile } from '../schema';
import { parseClubs, parsePlayers } from '../validate';

export class LocalFileSource implements DataSource {
  readonly kind = 'local-files';
  constructor(private files: FileProvider, private label = 'Ficheiros locais') {}

  async load(): Promise<LoadResult> {
    const issues: DataIssue[] = [];
    const worldText = await this.files.readText(FILES.world);
    let worldFile: WorldFile = {};
    if (worldText) {
      try {
        worldFile = JSON.parse(worldText) as WorldFile;
      } catch (e) {
        issues.push({ level: 'error', file: FILES.world, message: `JSON inválido: ${(e as Error).message}` });
      }
    }
    const countries = applyWorldFile(defaultCountries(), worldFile, issues);

    const clubsText = await this.files.readText(FILES.clubs);
    const playersText = await this.files.readText(FILES.players);
    if (clubsText === null) issues.push({ level: 'error', file: FILES.clubs, message: 'ficheiro em falta' });
    if (playersText === null) issues.push({ level: 'error', file: FILES.players, message: 'ficheiro em falta' });
    const clubs = clubsText ? parseClubs(parseCsv(clubsText), countries, issues) : [];
    const players = playersText ? parsePlayers(parseCsv(playersText), clubs, issues) : [];

    // The real number of clubs comes from the files.
    for (const c of countries) {
      for (const l of c.leagues) {
        const n = clubs.filter((x) => x.leagueId === l.id).length;
        if (n !== l.clubs) {
          if (clubs.length > 0) issues.push({ level: 'warning', file: FILES.clubs, message: `${l.id}: ${n} clubes nos ficheiros (configuração previa ${l.clubs})` });
          l.clubs = n;
        }
      }
    }

    const attributeCsv = (await this.files.readText(FILES.attributes)) ?? undefined;
    return {
      world: {
        meta: {
          name: worldFile.name ?? this.label,
          isTestData: false,
          seed: worldFile.seed ?? GENERATOR.defaultSeed,
          referenceDate: worldFile.referenceDate ?? GENERATOR.referenceDate,
          source: this.kind,
          createdAt: new Date().toISOString(),
        },
        countries,
        clubs,
        players,
      },
      attributeCsv,
      issues,
    };
  }
}

function applyWorldFile(countries: CountryConfig[], wf: WorldFile, issues: DataIssue[]): CountryConfig[] {
  for (const [id, patch] of Object.entries(wf.countries ?? {})) {
    const c = countries.find((x) => x.id === id);
    if (!c) { issues.push({ level: 'warning', file: FILES.world, message: `país desconhecido: ${id}` }); continue; }
    Object.assign(c, patch);
    if (patch.promotionRelegation === false) for (const l of c.leagues) { l.promotionSlots = 0; l.relegationSlots = 0; }
  }
  for (const [id, patch] of Object.entries(wf.leagues ?? {})) {
    const l = countries.flatMap((c) => c.leagues).find((x) => x.id === id);
    if (!l) { issues.push({ level: 'warning', file: FILES.world, message: `liga desconhecida: ${id}` }); continue; }
    Object.assign(l, patch);
  }
  return countries;
}
