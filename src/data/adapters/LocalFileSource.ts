// Local files adapter: world.json (optional), countries.csv, players.csv, initial_country.csv (optional)
// and attributes.csv (optional), through a FileProvider (Node fs, browser File API or in-memory).

import { defaultConfederations } from '../../config/confederations.config';
import { GENERATOR } from '../../config/generator.config';
import { baseCountryRecords } from '../../engine/generator/worldGenerator';
import { assembleWorld } from '../../engine/world/assemble';
import type { AssignmentResult } from '../../engine/world/confederations';
import type { ConfederationId } from '../../engine/types';
import { parseCsv } from '../csv';
import type { DataIssue, DataSource, FileProvider, LoadResult } from '../DataSource';
import { FILES, type WorldFile } from '../schema';
import { applyExceptions, mergeCountries, parsePlayers } from '../validate';

export class LocalFileSource implements DataSource {
  readonly kind = 'local-files';
  /** Confederation table and weakest ranking of the last load (for the counts report). */
  assignment: AssignmentResult | null = null;

  constructor(
    private files: FileProvider,
    private label = 'Ficheiros locais',
    private confirmedTransfers?: Record<string, ConfederationId>,
  ) {}

  async load(): Promise<LoadResult> {
    const issues: DataIssue[] = [];
    let wf: WorldFile = {};
    const worldText = await this.files.readText(FILES.world);
    if (worldText) {
      try { wf = JSON.parse(worldText) as WorldFile; } catch (e) {
        issues.push({ level: 'error', file: FILES.world, message: `JSON inválido: ${(e as Error).message}` });
      }
    }

    const countries = baseCountryRecords();
    const countriesText = await this.files.readText(FILES.countries);
    if (countriesText === null) issues.push({ level: 'warning', file: FILES.countries, message: 'ficheiro em falta: população, PIB e reputação ficam por preencher' });
    else mergeCountries(parseCsv(countriesText), countries, issues);

    const playersText = await this.files.readText(FILES.players);
    if (playersText === null) issues.push({ level: 'warning', file: FILES.players, message: 'ficheiro em falta: todos os plantéis serão gerados' });
    const players = playersText ? parsePlayers(parseCsv(playersText), countries, issues) : [];

    const exceptionsText = await this.files.readText(FILES.exceptions);
    if (exceptionsText) applyExceptions(parseCsv(exceptionsText), players, countries, issues);

    const seed = wf.seed ?? GENERATOR.defaultSeed;
    const assembled = assembleWorld({
      meta: {
        name: wf.name ?? this.label,
        isTestData: wf.fillSquads !== false, // generated fill-in players are test data
        seed,
        referenceDate: wf.referenceDate ?? GENERATOR.referenceDate,
        source: this.kind,
        createdAt: new Date().toISOString(),
      },
      confederations: defaultConfederations(),
      countries,
      players,
      fill: wf.fillSquads !== false,
      fillIdPrefix: 'G',
      freeAgents: 0,
      confirmedTransfers: this.confirmedTransfers,
    });
    this.assignment = assembled.assignment;
    return {
      world: assembled.raw,
      attributeCsv: (await this.files.readText(FILES.attributes)) ?? undefined,
      issues: [...issues, ...assembled.issues],
    };
  }
}
