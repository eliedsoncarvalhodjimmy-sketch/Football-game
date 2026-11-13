// Regressão do Bloco C (secção 3.4): 10 épocas com uma semente, num modo de força, e métricas em JSON.
// Uso: MODO=onze|reputacao npx tsx scripts/regressao-sementes.ts <semente> [épocas]
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { MOTOR } from '../src/config/motor.ts';

MOTOR.modo_forca = (process.env.MODO ?? 'onze') as 'onze' | 'reputacao';
const semente = Number(process.argv[2] ?? 2026);
const N = Number(process.argv[3] ?? 10);
const w = construirMundo(await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname)), { semente, modo: 'teste' });
const sim = new Simulador(w);
const t0 = performance.now();
sim.simularEpocas(N);
const campeoes: Record<string, string[]> = {};
const continentais: Record<string, string[]> = {};
for (const r of sim.historico) {
  for (const [l, c] of Object.entries(r.campeoes)) (campeoes[l] ??= []).push(w.clubes[c].id);
  for (const [id, c] of Object.entries(r.continentais)) (continentais[id] ??= []).push(w.clubes[c.vencedor].pais);
}
console.log(JSON.stringify({ semente, modo: MOTOR.modo_forca, segundos: (performance.now() - t0) / 1000, campeoes, continentais }));
