// Uso: npx tsx scripts/comparar-longa-duracao.ts [épocas] (correr antes e depois de uma mudança e comparar as linhas).
// Comparação de longa duração (antes × depois da cadeia juvenil): craques no mundo, OVR médio das ligas, idade, juniores.
import { carregarDados } from '../src/data/load.ts';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
const N = Number(process.argv[2] ?? 15);
const d = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const w = construirMundo(d, { semente: 2026, modo: 'teste' });
const st = w.jogadores!;
const sim = new Simulador(w, true);
const lin: string[] = [];
const medir = (ep: string) => {
  let n85 = 0, n90 = 0, n80 = 0, s = 0, n = 0, id = 0, p85 = 0;
  for (let c = 0; c < w.clubes.length; c++) { if (w.liga[c] < 0) continue; for (const j of w.plantel[c]) { if (st.clube[j] !== c) continue; const o = st.ovrNat(j); n++; s += o; id += st.idade(j, sim.segunda); if (o >= 80) n80++; if (o >= 85) n85++; if (o >= 90) n90++; if (st.pot[j] >= 85 && st.idade(j, sim.segunda) < 23) p85++; } }
  const top = w.ligas.filter((l) => l.regras.nivel === 1).map((l) => { let a = 0, k = 0; for (const c of l.clubes) for (const j of w.plantel[c]) if (st.clube[j] === c) { a += st.ovrNat(j); k++; } return [l.regras.id, a / Math.max(1, k)] as const; });
  const k = w.academia!.contagens();
  lin.push(`${ep}\tovr ${(s / n).toFixed(2)}\tidade ${(id / n).toFixed(2)}\t80+ ${n80}\t85+ ${n85}\t90+ ${n90}\tjovensPT85+ ${p85}\tjuniores ${k.individuais}\tregistos ${st.n}\tENG1 ${top.find((x) => x[0] === 'ENG1')![1].toFixed(1)}\tPOR1 ${top.find((x) => x[0] === 'POR1')![1].toFixed(1)}\tBRA1 ${top.find((x) => x[0] === 'BRA1')![1].toFixed(1)}`);
};
medir('início');
const t0 = performance.now();
for (let e = 0; e < N; e++) { sim.simularEpoca(); medir(String(2026 + e)); }
lin.push(`tempo ${(performance.now() - t0) / 1000 | 0}s`);
console.log(lin.join('\n'));
