// Calibração do motor (Fase 2, Bloco B): 10 000 jogos de liga entre clubes da mesma liga, com os
// onzes escolhidos pelos treinadores, nos dois modos. Uso:
//   npx tsx scripts/calibrar-motor.ts [jogos] [rapido|detalhado|ambos]
//   SIM='{"empate_fator":1.2}' DET='{"K":0.025}' ...   (sobrepõe parâmetros para afinar)
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo, diaInicioMundo } from '../src/engine/world.ts';
import { prepararLado, golosRapido } from '../src/match/rapido.ts';
import { jogoDetalhado } from '../src/match/detalhado.ts';
import { Rng } from '../src/core/rng.ts';
import { SIMULACAO_ONZE as SIMULACAO } from '../src/config/simulacao.ts';
import { DETALHADO, RAPIDO } from '../src/config/motor.ts';

if (process.env.SIM) Object.assign(SIMULACAO, JSON.parse(process.env.SIM));
if (process.env.DET) Object.assign(DETALHADO, JSON.parse(process.env.DET));
const N = Number(process.argv[2] ?? 10000);
const modos = (process.argv[3] ?? 'ambos') === 'ambos' ? ['rapido', 'detalhado'] : [process.argv[3]];
const d = await carregarDados(new LocalFileSource(new URL('../packs/', import.meta.url).pathname));
const w = construirMundo(d, { semente: 2026, modo: 'teste' });
const dia = diaInicioMundo() + 40;
const rng = Rng.de(5, 'calibracao-motor');
// Pares: liga ponderada pelo nº de jogos; lados preparados uma vez por clube (onze do início da época).
const lados = w.clubes.map((_, c) => prepararLado(w, c, dia, Rng.de(9, c)));
const pesos = w.ligas.map((l) => l.clubes.length * (l.clubes.length - 1) * l.regras.formato.voltas);
const tot = pesos.reduce((a, b) => a + b, 0);
const pares: [number, number][] = [];
for (let i = 0; i < N; i++) {
  let r = rng.next() * tot, li = 0;
  while ((r -= pesos[li]) > 0) li++;
  const cl = w.ligas[li].clubes;
  const a = rng.pick(cl);
  let b = rng.pick(cl);
  while (b === a) b = rng.pick(cl);
  pares.push([a, b]);
}
const res: Record<string, string> = {};
for (const modo of modos) {
  let g = 0, c = 0, e = 0, f = 0, z = 0, ate3 = 0, cinco = 0, sete = 0, dez = 0, rem = 0, golosR = 0;
  let fracos = 0, fracosV = 0;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    const [a, b] = pares[i];
    const rj = Rng.de(77, modo, i);
    let x: number, y: number, rx: number, ry: number;
    if (modo === 'rapido') {
      const o = golosRapido(w, lados[a], lados[b], false, rj);
      x = o.gc; y = o.gf;
      rx = x + rj.poisson(Math.max(0.3, o.xg[0] * (1 / RAPIDO.conversao - 1)));
      ry = y + rj.poisson(Math.max(0.3, o.xg[1] * (1 / RAPIDO.conversao - 1)));
    } else {
      const o = jogoDetalhado(w, lados[a], lados[b], false, rj, { eventos: false });
      x = o.golos[0]; y = o.golos[1]; rx = o.remates[0]; ry = o.remates[1];
    }
    g += x + y; rem += rx + ry; golosR += x + y;
    if (x > y) c++; else if (x === y) e++; else f++;
    const t = x + y;
    if (t === 0) z++;
    if (t <= 3) ate3++;
    if (t >= 5) cinco++;
    if (t >= 7) sete++;
    if (t >= 10) dez++;
    // "Muito mais fraca": diferença de força (ataque+defesa)/2 ≥ 12 pontos.
    const fa = (lados[a].forcaAtaque + lados[a].forcaDefesa) / 2, fb = (lados[b].forcaAtaque + lados[b].forcaDefesa) / 2;
    if (Math.abs(fa - fb) >= 12) { fracos++; if ((fa < fb && x > y) || (fb < fa && y > x)) fracosV++; }
  }
  const ms = performance.now() - t0;
  const p = (k: number) => ((100 * k) / N).toFixed(1) + '%';
  res[modo] = `golos ${(g / N).toFixed(2)} | casa ${p(c)} emp ${p(e)} fora ${p(f)} | 0-0 ${p(z)} | ≤3 ${p(ate3)} | 5+ ${p(cinco)} | 7+ ${p(sete)} | 10+ ${dez} | remates/equipa ${(rem / N / 2).toFixed(1)} conv ${((100 * golosR) / rem).toFixed(1)}% | muito mais fraca ganha ${((100 * fracosV) / Math.max(1, fracos)).toFixed(1)}% (${fracos} jogos) | ${(ms / N * 1000).toFixed(0)} µs/jogo`;
  console.log(modo.padEnd(9), res[modo]);
}
