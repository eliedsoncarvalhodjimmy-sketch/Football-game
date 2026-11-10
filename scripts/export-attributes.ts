// Export (generated + hand-edited) attributes for a data folder.
// Usage: npm run export-attributes -- <dataDir> [out.csv] [--semicolon]
// If <dataDir>/attributes.csv exists, its hand edits are applied first and kept in the output.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportAttributesCsv, importAttributesCsv } from '../src/data/attributesIO';
import { LocalFileSource } from '../src/data/adapters/LocalFileSource';
import { NodeFileProvider } from '../src/data/nodeFiles';
import { buildWorld } from '../src/engine/store/worldStore';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const semicolon = process.argv.includes('--semicolon');
const dir = args[0];
if (!dir) {
  console.error('Uso: npm run export-attributes -- <pasta-de-dados> [saida.csv] [--semicolon]');
  process.exit(1);
}
const out = args[1] ?? join(dir, 'attributes.export.csv');
const res = await new LocalFileSource(new NodeFileProvider(dir)).load();
for (const i of res.issues) console.log(`${i.level === 'error' ? 'ERRO ' : 'aviso'} ${i.file}${i.line ? ':' + i.line : ''} ${i.column ?? ''} ${i.message}`);
if (res.issues.some((i) => i.level === 'error')) process.exit(1);
const world = buildWorld(res.world);
if (res.attributeCsv) {
  const s = importAttributesCsv(world, res.attributeCsv);
  console.log(`attributes.csv: ${s.overridesSet} valores manuais aplicados`);
}
writeFileSync(out, exportAttributesCsv(world, { delimiter: semicolon ? ';' : ',' }));
console.log(`${world.players.count} jogadores exportados para ${out}`);
