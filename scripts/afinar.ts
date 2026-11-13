// Afinação dos ajustes de equilíbrio com várias sementes × 10 épocas.
// Mede: campeões diferentes nas 8 maiores ligas, % de títulos europeus por país,
// pontos do campeão e calibração. Uso: FORCA='{...}' REP='{...}' npx tsx scripts/afinar.ts [sementes]
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { FORCA } from '../src/config/forca.ts';
import { REPUTACAO } from '../src/config/reputacao.ts';

if (process.env.FORCA) Object.assign(FORCA, JSON.parse(process.env.FORCA));
if (process.env.REP) Object.assign(REPUTACAO, JSON.parse(process.env.REP));
if (process.env.SIM) Object.assign((await import('../src/config/simulacao.ts')).SIMULACAO, JSON.parse(process.env.SIM));
const N = Number(process.argv[2] ?? 3);
const OITO = ['ENG1', 'ITA1', 'ESP1', 'GER1', 'FRA1', 'NED1', 'POR1', 'BEL1'];
const dist: number[] = [];
let dez = 0;
const titulos = new Map<string, number>();
const outras = new Map<string, number>();
let totalTit = 0, g = 0, j = 0, d = 0, c = 0;
for (let s = 1; s <= N; s++) {
  const dados = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
  const w = construirMundo(dados, { semente: 1000 + s, modo: 'teste' });
  const sim = new Simulador(w, false);
  sim.simularEpocas(10);
  const HA = sim.historico.filter((r) => r.grupo === 'ago_mai').slice(0, 10);
  for (const l of OITO) {
    const n = new Set(HA.map((r) => r.campeoes[l])).size;
    dist.push(n);
    if (n === 1) { dez++; console.log(`  10/10: ${l} (semente ${1000 + s})`); }
  }
  for (const r of sim.historico) {
    for (const id of ['ACLE', 'CLI']) {
      if (!r.continentais[id]) continue;
      const p = w.clubes[r.continentais[id].vencedor].pais;
      outras.set(`${id} ${p}`, (outras.get(`${id} ${p}`) ?? 0) + 1);
    }
  }
  for (const r of HA) {
    for (const id of ['UCL', 'UEL', 'UECL']) {
      const p = w.clubes[r.continentais[id].vencedor].pais;
      titulos.set(p, (titulos.get(p) ?? 0) + 1);
      totalTit++;
    }
    g += r.estatLiga.golos; j += r.estatLiga.jogos; d += r.estatLiga.empates; c += r.estatLiga.casa;
  }
}
const media = dist.reduce((a, b) => a + b, 0) / dist.length;
console.log(`8 maiores: média de campeões diferentes ${media.toFixed(2)} (mín ${Math.min(...dist)}), ligas com o mesmo campeão 10/10: ${dez}`);
console.log('Títulos europeus:', [...titulos].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${((100 * n) / totalTit).toFixed(0)}%`).join(', '));
console.log('Ásia e Libertadores (total em todas as sementes):', [...outras].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(', '));
console.log(`golos ${(g / j).toFixed(2)} casa ${((100 * c) / j).toFixed(1)}% emp ${((100 * d) / j).toFixed(1)}%`);
