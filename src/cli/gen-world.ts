// npm run gen-world [-- --seed 2026]
// Gera o mundo fictício completo (dados de teste) e escreve o resumo por liga
// em docs/relatorios/. Também grava o mundo em out/mundo_<seed>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { validar } from '../data/validate.ts';
import { construirMundo } from '../engine/world.ts';
import { calendarioLigas } from '../engine/calendar/epoca.ts';
import { verificarCalendario } from '../engine/calendar/verificar.ts';
import { isoData } from '../engine/calendar/datas.ts';
import { modelo, semanasFds, semanasMeioLiga } from '../engine/calendar/scheduler.ts';
import { MUNDO } from '../config/mundo.ts';
import { args, RAIZ_PACKS } from './args.ts';
import { relatorioMundo, relatorioClubes, relatorioCalendario } from './relatorioMundo.ts';

const a = args();
const semente = Number(a.seed ?? MUNDO.semente_padrao);
const t0 = performance.now();
const dados = await carregarDados(new LocalFileSource(RAIZ_PACKS));
const erros = validar(dados).filter((p) => p.nivel === 'erro');
if (erros.length) {
  for (const e of erros) console.error(`[erro] ${e.pacote}: ${e.msg}`);
  process.exit(1);
}
const t1 = performance.now();
const w = construirMundo(dados, { semente, modo: MUNDO.modo_geracao });
const t2 = performance.now();
const cal = calendarioLigas(w);
const t3 = performance.now();
const todos = [...cal.values()].flat();
const problemas = verificarCalendario(todos);

const raizRel = new URL('../../docs/relatorios/', import.meta.url).pathname;
mkdirSync(raizRel, { recursive: true });
mkdirSync(new URL('../../out/', import.meta.url).pathname, { recursive: true });
const tempos = { carregar: t1 - t0, gerar: t2 - t1, calendario: t3 - t2 };
writeFileSync(`${raizRel}mundo_teste_resumo.md`, relatorioMundo(w, cal, problemas, tempos));
writeFileSync(`${raizRel}mundo_teste_clubes.md`, relatorioClubes(w));
writeFileSync(`${raizRel}mundo_teste_calendario.md`, relatorioCalendario(w, cal));
writeFileSync(new URL(`../../out/mundo_${semente}.json`, import.meta.url).pathname, JSON.stringify({ semente, epoca: w.epoca, clubes: w.clubes }, null, 0));

console.log(`Mundo gerado (semente ${semente}): ${w.activos()} clubes em ${w.ligas.length} ligas, ${todos.length} jogos de liga.`);
console.log(`Tempos: carregar ${tempos.carregar.toFixed(0)} ms, gerar ${tempos.gerar.toFixed(0)} ms, calendário ${tempos.calendario.toFixed(0)} ms.`);
console.log(`Calendário: ${problemas.length === 0 ? 'sem conflitos' : problemas.length + ' problema(s)'}.`);
const m = modelo('ago_mai');
console.log(`Modelo ago_mai: ${semanasFds(m).length} fins-de-semana de liga, ${semanasMeioLiga(m).length} meios de semana livres; 1.ª jornada ${isoData(w.epoca, m.primeira_semana, 5)}.`);
console.log(`Relatórios em docs/relatorios/mundo_teste_*.md`);
