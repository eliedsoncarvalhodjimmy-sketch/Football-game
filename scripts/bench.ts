// Benchmark with the full fictional world (213 country-clubs, ~17k players). Run: npm run bench
// Prints timings and memory, and writes out/bench-latest.json.

import 'fake-indexeddb/auto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { exportAttributesCsv, importAttributesCsv } from '../src/data/attributesIO';
import { generateWorld } from '../src/engine/generator/worldGenerator';
import { buildWorld } from '../src/engine/store/worldStore';
import { hashString } from '../src/engine/rng';
import { openDatabase } from '../src/persistence/db';
import { SaveManager, chunkHash, snapshotToChunks } from '../src/persistence/saveSlots';

const TARGETS = { worldReadyMs: 3000, heapMB: 60 };
const gc = (globalThis as { gc?: () => void }).gc;
// JS heap + ArrayBuffer backing stores (typed arrays live outside the JS heap)
const heapMB = () => { gc?.(); const m = process.memoryUsage(); return (m.heapUsed + m.arrayBuffers) / 1e6; };
const time = async <T>(fn: () => T | Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const r = await fn();
  return [r, performance.now() - t];
};

const heap0 = heapMB();
const [raw, genMs] = await time(() => generateWorld());
const [world, buildMs] = await time(() => buildWorld(raw));
const rawRecordsMB = heapMB() - heap0;
// drop the raw records: the game only keeps the WorldStore
(raw as { players: unknown[] }).players = [];
const heapWorld = heapMB() - heap0;

const chunks = snapshotToChunks(world.toSnapshot());
const chunkBytes = Object.fromEntries(Object.entries(chunks).map(([k, v]) => [k, ArrayBuffer.isView(v) ? v.byteLength : JSON.stringify(v).length]));
const totalSaveBytes = Object.values(chunkBytes).reduce((a, b) => a + b, 0);

const sm = new SaveManager(await openDatabase('bench'));
const [, saveMs] = await time(() => sm.save('bench', 'Bench', world));
const [, resaveMs] = await time(() => sm.save('bench', 'Bench', world));
const [, loadMs] = await time(() => sm.load('bench'));

const [csv, exportMs] = await time(() => exportAttributesCsv(world));
const [, importMs] = await time(() => importAttributesCsv(world, csv));

const determinism = chunkHash(world.players.attrs) === chunkHash(buildWorld(generateWorld()).players.attrs);

const divisions = world.divisions.length;
const result = {
  date: new Date().toISOString(),
  node: process.version,
  world: { confederations: world.confederations.length, divisions, countries: world.countries.length, players: world.players.count },
  ms: {
    generateRecords: Math.round(genMs),
    buildWorldWithAttributes: Math.round(buildMs),
    worldReady: Math.round(genMs + buildMs),
    saveFull: Math.round(saveMs),
    saveUnchanged: Math.round(resaveMs),
    load: Math.round(loadMs),
    exportAttributesCsv: Math.round(exportMs),
    importAttributesCsv: Math.round(importMs),
  },
  memory: {
    worldMB: +heapWorld.toFixed(1),
    peakWithRawRecordsMB: +rawRecordsMB.toFixed(1),
    playerTypedArraysMB: +(world.players.typedBytes() / 1e6).toFixed(2),
    saveSizeMB: +(totalSaveBytes / 1e6).toFixed(2),
    attributesCsvMB: +(csv.length / 1e6).toFixed(2),
  },
  chunkBytes,
  determinism,
  attrsHash: hashString(String(chunkHash(world.players.attrs))),
  targets: TARGETS,
  pass: genMs + buildMs < TARGETS.worldReadyMs && heapWorld < TARGETS.heapMB && determinism,
};

mkdirSync('out', { recursive: true });
writeFileSync('out/bench-latest.json', JSON.stringify(result, null, 2));

const line = (k: string, v: string | number) => console.log(`  ${k.padEnd(34)} ${v}`);
console.log(`\nFutCEO benchmark — ${result.world.confederations} confederações, ${divisions} divisões, ${result.world.countries} países-clube, ${result.world.players} jogadores${gc ? '' : ' (sem --expose-gc: memória aproximada)'}`);
console.log('Tempos (ms)');
for (const [k, v] of Object.entries(result.ms)) line(k, v);
console.log('Memória');
for (const [k, v] of Object.entries(result.memory)) line(k, v);
line('determinismo (mesma semente)', determinism ? 'OK' : 'FALHOU');
console.log(`\nMetas: mundo pronto < ${TARGETS.worldReadyMs} ms, heap < ${TARGETS.heapMB} MB → ${result.pass ? 'PASSA' : 'FALHA'}\n`);
if (!result.pass) process.exitCode = 1;
