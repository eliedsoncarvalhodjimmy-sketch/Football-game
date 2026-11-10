// Request handler that owns the world. Runs inside the Web Worker (and in Node tests).

import { FAMILIARITY, N_POSITIONS, N_VISIBLE, POSITIONS, VISIBLE_ATTRIBUTES } from '../config/attributes.config';
import { CONFIRMED_TRANSFERS, WEAKEST_CRITERION } from '../config/confederations.config';
import { ECONOMY } from '../config/economy.config';
import { exportAttributesCsv, importAttributesCsv } from '../data/attributesIO';
import { MemoryFileProvider } from '../data/DataSource';
import { LocalFileSource } from '../data/adapters/LocalFileSource';
import { generateWorldFull } from '../engine/generator/worldGenerator';
import { countOverrideCells } from '../engine/store/overrides';
import { FOOT_CODES } from '../engine/store/playerStore';
import { buildWorld, type WorldStore } from '../engine/store/worldStore';
import { SQUAD_LEVELS, type CountryRecord } from '../engine/types';
import { assignConfederations } from '../engine/world/confederations';
import type { Database } from '../persistence/db';
import { SaveManager } from '../persistence/saveSlots';
import type { CountryRow, CountsReport, PlayerRow, Request, ResponseMap, WorldSummary } from './protocol';

export class WorldService {
  world: WorldStore | null = null;
  private lastBuildMs = 0;
  private saves: SaveManager | null = null;

  constructor(private openDb: () => Promise<Database>) {}

  private async saveManager(): Promise<SaveManager> {
    if (!this.saves) this.saves = new SaveManager(await this.openDb());
    return this.saves;
  }

  private requireWorld(): WorldStore {
    if (!this.world) throw new Error('Nenhum mundo carregado');
    return this.world;
  }

  summary(): WorldSummary | null {
    const w = this.world;
    if (!w) return null;
    let generated = 0;
    for (let i = 0; i < w.players.count; i++) generated += w.players.generated[i];
    return {
      name: w.meta.name,
      isTestData: w.meta.isTestData,
      seed: w.meta.seed,
      confederations: w.confederations.length,
      divisions: w.divisions.length,
      countries: w.countries.length,
      players: w.players.count,
      freeAgents: w.freeAgents().length,
      generatedPlayers: generated,
      overrideCells: countOverrideCells(w.overrides),
      buildMs: this.lastBuildMs,
      transfers: w.meta.transfers,
      economyMissing: w.countries.filter((c) => c.economyStatus === 'missing').length,
    };
  }

  /** Confederation table + weakest ranking, recomputed on a copy of the current countries. */
  counts(): CountsReport | null {
    const w = this.world;
    if (!w) return null;
    const copy: CountryRecord[] = w.countries.map((c) => ({ ...c }));
    const a = assignConfederations(copy, w.confederations, CONFIRMED_TRANSFERS, WEAKEST_CRITERION);
    return {
      table: a.table, ranking: Object.fromEntries(Object.entries(a.ranking).map(([k, v]) => [k, v.slice(0, 8)])),
      transfers: a.transfers, total: copy.length, basedOnTestData: w.countries.some((c) => c.economyStatus === 'test'),
    };
  }

  private playerRow(i: number): PlayerRow {
    const w = this.requireWorld();
    const p = w.players;
    return {
      id: p.ids[i],
      name: `${p.firstNames[i]} ${p.lastNames[i]}`.trim(),
      position: POSITIONS[p.position[i]],
      age: w.ageOf(i),
      ovr: p.ovrInput[i],
      nationality: p.nationalityCodes[p.nationality[i]],
      squad: SQUAD_LEVELS[p.squadLevel[i]],
      valueEur: p.valueEur[i],
    };
  }

  async handle<R extends Request>(req: R): Promise<ResponseMap[R['type']]> {
    return (await this.dispatch(req)) as ResponseMap[R['type']];
  }

  private async dispatch(req: Request): Promise<unknown> {
    switch (req.type) {
      case 'generateWorld': {
        const t = performance.now();
        this.world = buildWorld(generateWorldFull({ seed: req.seed }).raw);
        this.lastBuildMs = Math.round(performance.now() - t);
        return this.summary();
      }
      case 'importFiles': {
        const t = performance.now();
        const res = await new LocalFileSource(new MemoryFileProvider(req.files)).load();
        if (res.issues.some((i) => i.level === 'error')) return { summary: null, issues: res.issues };
        this.world = buildWorld(res.world);
        const attributes = res.attributeCsv ? importAttributesCsv(this.world, res.attributeCsv) : undefined;
        this.lastBuildMs = Math.round(performance.now() - t);
        return { summary: this.summary(), issues: res.issues, attributes };
      }
      case 'summary':
        return this.summary();
      case 'counts':
        return this.counts();
      case 'confederations':
        return this.requireWorld().confederations.map((c) => ({
          id: c.id, name: c.name, cup: c.cup.name,
          divisions: c.divisions.map((d) => ({ id: d.id, name: d.name, tier: d.tier, teams: d.teams })),
        }));
      case 'divisionCountries': {
        const w = this.requireWorld();
        const rows: CountryRow[] = w.countriesInDivision(req.divisionId).map((c) => {
          const ci = w.countryIndexById.get(c.id)!;
          const seniors = w.squad(ci, 'senior');
          const best = seniors.map((i) => w.players.ovrInput[i]).sort((a, b) => b - a).slice(0, 11);
          const natIdx = w.players.nationalityCodes.indexOf(c.id);
          return {
            id: c.id, name: c.name, reputation: c.reputation,
            avgOvr: best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0,
            squadSize: seniors.length,
            homeGrown: seniors.filter((i) => w.players.nationality[i] === natIdx).length,
            populationGame: c.population === null ? null : Math.round(c.population * ECONOMY.populationShare),
            economyStatus: c.economyStatus,
            colorPrimary: c.colorPrimary, colorSecondary: c.colorSecondary, flag: c.flag,
            rivals: c.rivals,
            transferredFrom: c.gameConfederation !== c.confederation ? c.confederation : undefined,
          };
        });
        return rows.sort((a, b) => b.avgOvr - a.avgOvr);
      }
      case 'countrySquad': {
        const w = this.requireWorld();
        const ci = w.countryIndexById.get(req.countryId);
        const idx = ci === undefined ? [] : w.squad(ci, req.level);
        return idx.map((i) => this.playerRow(i)).sort((a, b) =>
          POSITIONS.indexOf(a.position as never) - POSITIONS.indexOf(b.position as never) || b.ovr - a.ovr);
      }
      case 'playerDetail': {
        const w = this.requireWorld();
        const i = w.playerIndexById.get(req.playerId);
        if (i === undefined) return null;
        const p = w.players;
        const ov = w.overrides.get(req.playerId);
        const ti = p.teamIndex[i];
        return {
          ...this.playerRow(i),
          team: ti >= 0 ? w.countries[ti].name : 'Sem país (livre)',
          foot: FOOT_CODES[p.foot[i]],
          heightCm: p.heightCm[i],
          generated: p.generated[i] === 1,
          // visible attributes only — hidden attributes and potential are never sent to the UI
          attributes: VISIBLE_ATTRIBUTES.map((a, k) => ({
            key: a.key, label: a.label, group: a.group, value: p.attrs[i * N_VISIBLE + k], manual: ov?.has(a.key) ?? false,
          })),
          familiarity: POSITIONS.map((pos, k) => ({ position: pos, level: p.familiarity[i * N_POSITIONS + k] }))
            .filter((f) => f.level > FAMILIARITY.UNCOMFORTABLE),
        };
      }
      case 'exportAttributes': {
        const w = this.requireWorld();
        const ci = req.countryId ? w.countryIndexById.get(req.countryId) : undefined;
        return exportAttributesCsv(w, { delimiter: req.delimiter, players: ci !== undefined ? w.squad(ci) : undefined });
      }
      case 'importAttributes':
        return importAttributesCsv(this.requireWorld(), req.csv);
      case 'listSlots':
        return (await this.saveManager()).listSlots();
      case 'saveSlot': {
        const t = performance.now();
        const r = await (await this.saveManager()).save(req.slotId, req.name, this.requireWorld());
        return { slot: r.slot, written: r.written.length, skipped: r.skipped.length, ms: Math.round(performance.now() - t) };
      }
      case 'loadSlot': {
        const t = performance.now();
        this.world = await (await this.saveManager()).load(req.slotId);
        this.lastBuildMs = Math.round(performance.now() - t);
        return this.summary();
      }
      case 'deleteSlot':
        await (await this.saveManager()).delete(req.slotId);
        return true;
    }
  }
}
