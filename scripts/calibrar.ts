// Mede a distribuição de resultados do modo rápido em jogos de liga reais do
// mundo de teste (pares de clubes da mesma liga). Uso: npx tsx scripts/calibrar.ts [N]
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { jogoRapido } from '../src/engine/match/quickSim.ts';
import { Rng } from '../src/core/rng.ts';
import { SIMULACAO } from '../src/config/simulacao.ts';

if (process.env.SIM) Object.assign(SIMULACAO, JSON.parse(process.env.SIM));
const N = Number(process.argv[2] ?? 100000);
const d = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const w = construirMundo(d, { semente: 1, modo: 'teste' });
const rng = Rng.de(99, 'calib');
const pesos = w.ligas.map((l) => l.clubes.length * (l.clubes.length - 1) * l.regras.formato.voltas);
const tot = pesos.reduce((a, b) => a + b, 0);
let g = 0, c = 0, e = 0, f = 0, z = 0, cinco = 0, sete = 0;
for (let i = 0; i < N; i++) {
  let r = rng.next() * tot, li = 0;
  while ((r -= pesos[li]) > 0) li++;
  const cl = w.ligas[li].clubes;
  const a = rng.pick(cl);
  let b = rng.pick(cl);
  while (b === a) b = rng.pick(cl);
  const [x, y] = jogoRapido(w.ataque[a], w.defesa[a], w.ataque[b], w.defesa[b], false, rng);
  g += x + y;
  if (x > y) c++; else if (x === y) e++; else f++;
  if (x + y === 0) z++;
  if (x + y >= 5) cinco++;
  if (x + y >= 7) sete++;
}
const p = (k: number) => ((100 * k) / N).toFixed(1) + '%';
console.log(JSON.stringify(SIMULACAO));
console.log(`golos/jogo ${(g / N).toFixed(3)} | casa ${p(c)} empate ${p(e)} fora ${p(f)} | 0-0 ${p(z)} | 5+ ${p(cinco)} | 7+ ${p(sete)}`);
