// Prompt 6, Bloco B: medições do mercado para comparar antes/depois da IA por necessidade.
// Por janela (Verão: Jul–Ago; Inverno: Jan, calendário europeu): negócios, contratações por clube; depois de cada
// janela: cobertura das posições da formação do treinador, posições repetidas, idades e tamanho dos plantéis; e o tempo
// da semana mundial. Uso: npx tsx scripts/comparar-mercado.ts [--seasons 2] [--seed 2026] [--out ficheiro.json]
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados } from '../src/data/load.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { FORMACAO_POR_ID } from '../src/config/tacticas.ts';
import { POSICOES, IDX_POS, FAMILIARIDADE } from '../src/config/papeis.ts';
import { args, RAIZ_PACKS } from '../src/cli/args.ts';

const a = args();
const N = Number(a.seasons ?? 2), semente = Number(a.seed ?? 2026);
const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
const sim = new Simulador(w, true);
const m = w.mercado!, st = w.jogadores!;
const N_POS = POSICOES.length;
const mes = (d: number) => new Date(d * 864e5).getUTCMonth();
const janelaDe = (d: number) => (mes(d) === 6 || mes(d) === 7 ? 'verao' : mes(d) === 0 ? 'inverno' : null);

interface Janela { nome: string; transferencias: number; livres: number; emprestimos: number; porClube: number[]; semNecessidade?: number }
const janelas: Janela[] = [];
const fotos: Record<string, number | string>[] = [];
const semanas: number[] = [];
let actual: Janela | null = null;
const vistos = new Set<number>();

function foto(rot: string) {
  const porPos: Record<string, number> = {}; let tres = 0, totRep = 0, casaRep = 0, jovensRep = 0, listRep = 0;
  let sem = 0, repetidos = 0, idade = 0, n = 0, tam = 0, tamMin = 99, tamMax = 0, clubes = 0;
  const dia = sim.temporadas.values().next().value!.base + sim.temporadas.values().next().value!.semana * 7;
  for (let c = 0; c < w.clubes.length; c++) {
    if (w.liga[c] < 0) continue;
    const pl = m.plantel(c);
    clubes++; tam += pl.length; tamMin = Math.min(tamMin, pl.length); tamMax = Math.max(tamMax, pl.length);
    const nat = new Array(N_POS).fill(0);
    for (const j of pl) { nat[st.posNat[j]]++; idade += st.idade(j, dia); n++; }
    const f = FORMACAO_POR_ID[w.motor!.treinadores[c]?.formacoes?.[0] ?? '4-3-3'] ?? FORMACAO_POR_ID['4-3-3'];
    if (nat.some((x) => x >= 6)) {
      repetidos++;
      const p = nat.findIndex((x) => x >= 6);
      porPos[POSICOES[p]] = (porPos[POSICOES[p]] ?? 0) + 1;
      if (f.lugares.filter((l) => l.pos === POSICOES[p]).length >= 3) tres++;
      for (const j of pl) if (st.posNat[j] === p) { totRep++; if (m.contratos.formadoClube[j] === c) casaRep++; if (st.idade(j, dia) <= 21) jovensRep++; if (m.contratos.listado[j]) listRep++; }
    }
    // Posições da formação preferida do treinador sem ninguém natural ou competente.
    const posF = new Set(f.lugares.map((l) => l.pos));
    for (const p of posF) if (!pl.some((j) => st.fam[j * N_POS + IDX_POS[p]] >= FAMILIARIDADE.competente)) { sem++; break; }
  }
  fotos.push({ janela: rot, clubesComPosicaoVazia: sem, clubesCom6Iguais: repetidos, repetidosPorPosicao: JSON.stringify(porPos), repetidosDaCasa: `${casaRep}/${totRep}`, repetidosJovens: jovensRep, repetidosListados: listRep, repetidosComTresTitulares: tres, idadeMedia: +(idade / n).toFixed(2), plantelMedio: +(tam / clubes).toFixed(1), plantelMin: tamMin, plantelMax: tamMax });
}

foto('início');
let mesAnt = -1;
const t0 = performance.now();
for (let e = 0; e < N; e++) for (let s = 0; s < 52; s++) {
  const ts = performance.now();
  const ns = sim.simularSemana();
  void ns;
  semanas.push(performance.now() - ts);
  { const t = sim.temporadas.values().next().value!; const mm = mes(t.base + t.semana * 7); if (mm !== mesAnt && (mm === 9 || mm === 2)) foto(`depois da janela (${mm === 9 ? 'Outubro' : 'Março'} ${new Date((t.base + t.semana * 7) * 864e5).getUTCFullYear()})`); mesAnt = mm; }
  for (const n of m.concluidos) {
    if (vistos.has(n.id)) continue;
    vistos.add(n.id);
    if (n.estado !== 'concluido') continue;
    const jn = janelaDe(n.dia);
    if (!jn) continue;
    const nome = `${jn} ${new Date(n.dia * 864e5).getUTCFullYear()}`;
    if (!actual || actual.nome !== nome) { if (actual) janelas.push(actual); actual = { nome, transferencias: 0, livres: 0, emprestimos: 0, porClube: new Array(w.clubes.length).fill(0) }; }
    if (n.tipo === 'emprestimo') actual.emprestimos++; else if (n.tipo === 'livre') actual.livres++; else if (n.oferta > 0) actual.transferencias++;
    if (n.tipo !== 'pre_contrato') actual.porClube[n.comprador]++;
  }
}
if (actual) janelas.push(actual);
const seg = (performance.now() - t0) / 1000;
const q = (v: number[], p: number) => [...v].sort((x, y) => x - y)[Math.floor(p * (v.length - 1))];
const res = {
  epocas: N, segundos: +seg.toFixed(1), semanaMedia: +(semanas.reduce((x, y) => x + y, 0) / semanas.length).toFixed(0), semanaMax: +Math.max(...semanas).toFixed(0),
  janelas: janelas.map((j) => {
    const v = j.porClube.filter((_, c) => w.liga[c] >= 0);
    return { janela: j.nome, transferencias: j.transferencias, livres: j.livres, emprestimos: j.emprestimos, total: j.transferencias + j.livres + j.emprestimos,
      contratacoesPorClube: { media: +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2), p90: q(v, 0.9), max: Math.max(...v), clubesSem: v.filter((x) => x === 0).length } };
  }),
  fotos,
};
console.log(JSON.stringify(res, null, 1));
if (a.out) writeFileSync(String(a.out), JSON.stringify(res, null, 1));
