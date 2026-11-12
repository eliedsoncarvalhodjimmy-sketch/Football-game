// npm run simulate -- --seasons 10 --seed 2026
// Simula N épocas completas do mundo fictício e escreve o relatório em
// docs/relatorios/ (resumo, testes da secção 11 e uma página por época).
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo } from '../engine/world.ts';
import { Simulador } from '../engine/simulador.ts';
import { MUNDO } from '../config/mundo.ts';
import { args, RAIZ_PACKS } from './args.ts';
import { verificarIntegridade, verificarVagas, verificarCalendarioEpoca, impressaoDigital } from '../engine/verificacoes.ts';
import { novasEstatisticas, type Estatisticas } from '../engine/season/temporada.ts';
import { relatorioResumo, relatorioEpoca, type DadosRelatorio } from './relatorioEpocas.ts';
import { serializarHistorico } from '../storage/serializar.ts';

const a = args();
const N = Number(a.seasons ?? 10);
const semente = Number(a.seed ?? MUNDO.semente_padrao);
const comRelatorio = !a['sem-relatorio'];

async function correr(semente: number, n: number, medir: boolean) {
  const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
  const w = construirMundo(dados, { semente, modo: 'teste' });
  const sim = new Simulador(w, true);
  const out: DadosRelatorio = {
    semente, epocas: n, w, historico: sim.historico, integridade: [], vagas: [], calendario: [], semanasMs: [], epocasMs: [],
    calib10k: novasEstatisticas(), favoritos: [], memoriaMB: 0, saveKB: [], pacotes: dados.pacotes.length,
  };
  out.vagas.push({ epoca: w.epoca, problemas: verificarVagas(w) });
  for (let e = 0; e < n; e++) {
    const t = sim.temporada;
    const ep = w.epoca;
    // Favorito de cada liga no início da época: maior reputação.
    for (const [id, c] of t.ligas) {
      const fav = [...c.clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x]);
      out.favoritos.push({ epoca: ep, liga: id, top1: fav[0], top3: fav.slice(0, 3) });
    }
    const t0 = performance.now();
    for (let s = 0; s < 52; s++) {
      const ts = performance.now();
      sim.simularSemana();
      if (medir) out.semanasMs.push(performance.now() - ts);
    }
    out.epocasMs.push(performance.now() - t0);
    if (e === 0) {
      let k = 0;
      for (const j of t.jogos) {
        if (k >= 10000) break;
        if (!t.ligas.has(j.comp)) continue;
        somar(out.calib10k, j.r!.gc, j.r!.gf);
        k++;
      }
    }
    out.calendario.push({ epoca: ep, problemas: verificarCalendarioEpoca(t).map((p) => `${p.tipo}: ${p.msg}`), jogos: t.jogos.length });
    out.integridade.push({ epoca: w.epoca, problemas: verificarIntegridade(w) });
    out.vagas.push({ epoca: w.epoca, problemas: verificarVagas(w) });
    if (medir) out.saveKB.push(gzipSync(serializarHistorico([sim.historico[sim.historico.length - 1]])).length / 1024);
  }
  out.memoriaMB = process.memoryUsage().heapUsed / 1024 / 1024;
  return out;
}

function somar(e: Estatisticas, gc: number, gf: number) {
  e.jogos++;
  e.golos += gc + gf;
  if (gc > gf) e.casa++; else if (gc === gf) e.empates++; else e.fora++;
  if (gc + gf === 0) e.zero++;
  if (gc + gf >= 5) e.cincoMais++;
  if (gc + gf >= 7) e.seteMais++;
}

const t0 = performance.now();
const res: DadosRelatorio = await correr(semente, N, true);
const total = performance.now() - t0;
// Determinismo: repete 2 épocas com a mesma semente e com outra.
const dA = impressaoDigital(res.historico.slice(0, 2));
const rB = await correr(semente, 2, false);
const rC = await correr(semente + 1, 2, false);
res.determinismo = { mesma: dA === impressaoDigital(rB.historico), outra: dA !== impressaoDigital(rC.historico), hash: dA };

console.log(`${N} épocas simuladas em ${(total / 1000).toFixed(1)} s (média ${(res.epocasMs.reduce((x, y) => x + y, 0) / N).toFixed(0)} ms/época).`);
const prob = [...res.integridade, ...res.vagas, ...res.calendario].reduce((s, x) => s + x.problemas.length, 0);
console.log(`Problemas de integridade, vagas e calendário: ${prob}. Determinismo: ${res.determinismo.mesma && res.determinismo.outra ? 'OK' : 'FALHOU'}.`);
if (comRelatorio) {
  const dir = new URL('../../docs/relatorios/', import.meta.url).pathname;
  mkdirSync(`${dir}epocas`, { recursive: true });
  writeFileSync(`${dir}simulacao_${N}_epocas.md`, relatorioResumo(res));
  for (const r of res.historico) writeFileSync(`${dir}epocas/epoca_${r.epoca}-${String(r.epoca + 1).slice(2)}.md`, relatorioEpoca(res, r));
  console.log(`Relatório: docs/relatorios/simulacao_${N}_epocas.md e docs/relatorios/epocas/`);
}
