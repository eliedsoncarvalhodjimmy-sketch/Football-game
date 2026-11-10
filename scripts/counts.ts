// Confederation counts report (pendência 1): table per confederation and weakest-country ranking.
// Usage: npm run counts -- [dataDir]   (without dataDir: the test world, with invented population/reputation)

import { LocalFileSource } from '../src/data/adapters/LocalFileSource';
import { NodeFileProvider } from '../src/data/nodeFiles';
import { generateWorldFull } from '../src/engine/generator/worldGenerator';
import { COUNTRY_LIST_STATUS } from '../src/config/countries.base';
import type { AssignmentResult } from '../src/engine/world/confederations';

const dir = process.argv[2];
let a: AssignmentResult;
if (dir) {
  const src = new LocalFileSource(new NodeFileProvider(dir));
  const res = await src.load();
  for (const i of res.issues.filter((x) => x.file === 'countries.csv' || x.file === 'confederations.config.ts')) console.log(`${i.level === 'error' ? 'ERRO ' : 'aviso'} ${i.file}${i.line ? ':' + i.line : ''} ${i.message}`);
  a = src.assignment!;
} else {
  console.log('⚠ Sem pasta de dados: ranking com população e reputação INVENTADAS (mundo de teste).');
  a = generateWorldFull().assignment;
}
console.log(`\nLista de países: ${COUNTRY_LIST_STATUS}\n`);
console.log('Confederação | Próprios | Vagas | Sobra | Saem | Entram | Final | OK');
for (const r of a.table) console.log(`${r.confederation.padEnd(12)} | ${String(r.own).padStart(8)} | ${String(r.slots).padStart(5)} | ${String(r.surplus).padStart(5)} | ${r.outgoing.join(',').padEnd(4)} | ${r.incoming.join(',').padEnd(6)} | ${String(r.final).padStart(5)} | ${r.ok ? '✓' : '✗'}`);
console.log(`Total        | ${String(a.table.reduce((s, r) => s + r.own, 0)).padStart(8)} | ${String(a.table.reduce((s, r) => s + r.slots, 0)).padStart(5)} |       |      |        | ${String(a.table.reduce((s, r) => s + r.final, 0)).padStart(5)} |`);
for (const [conf, list] of Object.entries(a.ranking)) {
  console.log(`\n${conf} — mais fracos (50% percentil população a 10% + 50% percentil reputação):`);
  list.slice(0, 8).forEach((c, k) => console.log(`  ${k + 1}. ${c.country} ${c.name.padEnd(24)} score ${c.score.toFixed(3)}  pop ${c.populationPct === null ? 'sem dados' : c.populationPct.toFixed(2)}  rep ${c.reputationPct.toFixed(2)}`));
}
console.log(`\nTransferências: ${a.transfers.map((t) => `${t.country} ${t.from} → ${t.to} (${t.confirmed ? 'confirmada' : 'PENDENTE'})`).join('; ')}`);
