// Request handler that owns the world. Runs inside the Web Worker (and in Node tests).

import { FAMILIARITY, N_POSITIONS, N_VISIBLE, POSITIONS, VISIBLE_ATTRIBUTES } from '../config/attributes.config';
import { exportAttributesCsv, importAttributesCsv } from '../data/attributesIO';
import { MemoryFileProvider } from '../data/DataSource';
import { GeneratedSource } from '../data/adapters/GeneratedSource';
import { LocalFileSource } from '../data/adapters/LocalFileSource';
import { countOverrideCells } from '../engine/store/overrides';
import { buildWorld, type WorldStore } from '../engine/store/worldStore';
import { FOOT_CODES } from '../engine/store/playerStore';
import type { Database } from '../persistence/db';
import { SaveManager } from '../persistence/saveSlots';
import type { ClubRow, PlayerRow, Request, ResponseMap, WorldSummary } from './protocol';

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
    return {
      name: w.meta.name,
      isTestData: w.meta.isTestData,
      seed: w.meta.seed,
      countries: w.countries.length,
      leagues: w.leagues.length,
      clubs: w.clubs.length,
      players: w.players.count,
      freeAgents: w.freeAgents().length,
      overrideCells: countOverrideCells(w.overrides),
      buildMs: this.lastBuildMs,
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
    };
  }

  async handle<R extends Request>(req: R): Promise<ResponseMap[R['type']]> {
    return (await this.dispatch(req)) as ResponseMap[R['type']];
  }

  private async dispatch(req: Request): Promise<unknown> {
    switch (req.type) {
      case 'generateWorld': {
        const t = performance.now();
        const { world } = await new GeneratedSource({ seed: req.seed }).load();
        this.world = buildWorld(world);
        this.lastBuildMs = Math.round(performance.now() - t);
        return this.summary();
      }
      case 'importFiles': {
        const t = performance.now();
        const res = await new LocalFileSource(new MemoryFileProvider(req.files)).load();
        const fatal = res.issues.some((i) => i.level === 'error') || res.world.clubs.length === 0;
        if (fatal) return { summary: null, issues: res.issues };
        this.world = buildWorld(res.world);
        const attributes = res.attributeCsv ? importAttributesCsv(this.world, res.attributeCsv) : undefined;
        this.lastBuildMs = Math.round(performance.now() - t);
        return { summary: this.summary(), issues: res.issues, attributes };
      }
      case 'summary':
        return this.summary();
      case 'countries': {
        const w = this.requireWorld();
        return w.countries.map((c) => ({
          id: c.id, name: c.name,
          leagues: c.leagues.map((l) => ({ id: l.id, name: l.name, tier: l.tier, clubs: l.clubs })),
        }));
      }
      case 'leagueClubs': {
        const w = this.requireWorld();
        const rows: ClubRow[] = [];
        w.clubs.forEach((c, ci) => {
          if (c.leagueId !== req.leagueId) return;
          const squad = w.squad(ci);
          const best = squad.map((i) => w.players.ovrInput[i]).sort((a, b) => b - a).slice(0, 11);
          rows.push({
            id: c.id, name: c.name, shortName: c.shortName, city: c.city, reputation: c.reputation,
            avgOvr: best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0,
            squadSize: squad.length, colorPrimary: c.colorPrimary, colorSecondary: c.colorSecondary,
            crest: c.crest, rivals: c.rivals.map((r) => w.clubs[w.clubIndexById.get(r) ?? -1]?.name ?? r),
          });
        });
        return rows.sort((a, b) => b.reputation - a.reputation);
      }
      case 'clubSquad': {
        const w = this.requireWorld();
        const ci = w.clubIndexById.get(req.clubId);
        const idx = ci === undefined ? [] : w.squad(ci);
        return idx.map((i) => this.playerRow(i)).sort((a, b) =>
          POSITIONS.indexOf(a.position as never) - POSITIONS.indexOf(b.position as never) || b.ovr - a.ovr);
      }
      case 'playerDetail': {
        const w = this.requireWorld();
        const i = w.playerIndexById.get(req.playerId);
        if (i === undefined) return null;
        const p = w.players;
        const ov = w.overrides.get(req.playerId);
        const ci = p.clubIndex[i];
        return {
          ...this.playerRow(i),
          club: ci >= 0 ? w.clubs[ci].name : 'Sem clube',
          foot: FOOT_CODES[p.foot[i]],
          heightCm: p.heightCm[i],
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
        const ci = req.clubId ? w.clubIndexById.get(req.clubId) : undefined;
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
