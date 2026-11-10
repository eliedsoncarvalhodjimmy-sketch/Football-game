// Write the fictional world in the local-files format (example of the format for your real data).
// Usage: npm run generate-world -- [outDir] [seed]      (default: out/test-world)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportAttributesCsv } from '../src/data/attributesIO';
import { countriesToCsv, playersToCsv, worldFileFor } from '../src/data/worldExport';
import { generateWorld } from '../src/engine/generator/worldGenerator';
import { buildWorld } from '../src/engine/store/worldStore';

const outDir = process.argv[2] ?? 'out/test-world';
const seed = process.argv[3] ? Number(process.argv[3]) : undefined;
const raw = generateWorld({ seed });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'world.json'), JSON.stringify(worldFileFor(raw), null, 2));
writeFileSync(join(outDir, 'countries.csv'), countriesToCsv(raw));
writeFileSync(join(outDir, 'players.csv'), playersToCsv(raw));
writeFileSync(join(outDir, 'attributes.generated.csv'), exportAttributesCsv(buildWorld(raw)));
console.log(`Mundo de teste (semente ${raw.meta.seed}) escrito em ${outDir}: ${raw.countries.length} países-clube, ${raw.players.length} jogadores.`);
console.log('attributes.generated.csv é só referência; para editar, renomeia para attributes.csv.');
