// Ajusta a conversão índice (1–20) → força (escala da Fase 1): regressão linear entre os
// índices de ataque/defesa dos onzes escolhidos pelos treinadores e a força da Fase 1 de cada clube.
// Uso: npx tsx scripts/calibrar-ratings.ts   (imprime os valores a copiar para config/ratings.ts)
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, diaInicioMundo } from '../src/engine/world.ts';
import { escolherOnze } from '../src/match/onze.ts';
import { calcularRatings } from '../src/match/ratings.ts';
import { FORCA } from '../src/config/forca.ts';
import { Rng } from '../src/core/rng.ts';

const d = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const w = construirMundo(d, { semente: Number(process.argv[2] ?? 2026), modo: 'teste', afinar: false });
const st = w.jogadores!;
const ia: number[] = [], id: number[] = [], f: number[] = [];
for (let c = 0; c < w.clubes.length; c++) {
  const e = escolherOnze(st, w.plantel[c], w.motor!.treinadores[c], diaInicioMundo() + 40, Rng.de(1, c));
  const r = calcularRatings(st, e.onze);
  ia.push(r.indiceAtaque); id.push(r.indiceDefesa);
  f.push(w.reputacao[c] * (FORCA.base + (FORCA.peso_forca_desportiva * w.ligas[w.liga[c]].regras.forca_desportiva) / 100));
}
function reg(x: number[], y: number[]) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) ** 2; syy += (y[k] - my) ** 2; }
  // Conserva a média e o desvio-padrão da força da Fase 1 (a regressão simples encolheria a dispersão).
  const b = Math.sqrt(syy / sxx);
  return { a: +(my - b * mx).toFixed(3), b: +b.toFixed(4), r: +(sxy / Math.sqrt(sxx * syy)).toFixed(4), mx: +mx.toFixed(2) };
}
console.log('ataque', reg(ia, f));
console.log('defesa', reg(id, f));
