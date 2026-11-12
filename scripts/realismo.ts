// Mede pontos do campeão e do último (ligas de 20 equipas, 38 jornadas) e a
// distribuição de resultados em N épocas. Uso: SIM='{...}' npx tsx scripts/realismo.ts [épocas]
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { SIMULACAO } from '../src/config/simulacao.ts';
import { FORCA } from '../src/config/forca.ts';

if (process.env.SIM) Object.assign(SIMULACAO, JSON.parse(process.env.SIM));
if (process.env.FORCA) Object.assign(FORCA, JSON.parse(process.env.FORCA));
const N = Number(process.argv[2] ?? 5);
const d = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const w = construirMundo(d, { semente: 5, modo: 'teste' });
const s = new Simulador(w, false);
const camp: number[] = [], ult: number[] = [];
const e = { jogos: 0, golos: 0, casa: 0, empates: 0, fora: 0, zero: 0, cincoMais: 0, seteMais: 0 };
for (let i = 0; i < N; i++) {
  const r = s.simularEpoca();
  for (const [id, t] of Object.entries(r.tabelas)) {
    if (t.length !== 20 || t[0].pj !== 38) continue;
    camp.push(t[0].pts); ult.push(t[19].pts);
  }
  for (const k of Object.keys(e) as (keyof typeof e)[]) e[k] += r.estatLiga[k];
}
const med = (x: number[]) => (x.reduce((a, b) => a + b, 0) / x.length).toFixed(1);
const p = (k: number) => ((100 * k) / e.jogos).toFixed(1) + '%';
console.log(`campeão ${med(camp)} [${Math.min(...camp)}–${Math.max(...camp)}]  último ${med(ult)} [${Math.min(...ult)}–${Math.max(...ult)}]`);
console.log(`golos ${(e.golos / e.jogos).toFixed(2)} | casa ${p(e.casa)} emp ${p(e.empates)} fora ${p(e.fora)} | 0-0 ${p(e.zero)} | 5+ ${p(e.cincoMais)} | 7+ ${p(e.seteMais)}`);
