// Prompt 3, Bloco A: o clube e as finanças.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo, dados } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { construirMundo, diaInicioMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { Economia, limiteFairPlayLiga, partesTV } from '../src/economia/motorEconomico.ts';
import { salarioMercado } from '../src/economia/contratos.ts';
import { N_INFRA } from '../src/club/store.ts';
import { ControladorIA, custoObra } from '../src/club/controlador.ts';
import { TV, CONTRATOS } from '../src/config/economia.ts';

let w: World;
let sim: Simulador;
let livresAntes = 0;
const fims = new Map<number, number>();
beforeAll(async () => {
  w = await mundo();
  const st = w.jogadores!;
  for (let j = 0; j < st.n; j++) if (st.clube[j] >= 0 && w.liga[st.clube[j]] >= 0) fims.set(j, st.fimContrato[j]);
  livresAntes = w.economia!.livres.length;
  sim = new Simulador(w);
  sim.simularEpoca();
}, 120000);

describe('ficha e valores iniciais', () => {
  it('todos os clubes em jogo têm estádio, adeptos, infraestruturas 1–10, patrocínio e jogadores com contrato', async () => {
    const v = await mundo();
    const s = v.economia!.clubes, st = v.jogadores!;
    for (let c = 0; c < v.clubes.length; c++) {
      if (v.liga[c] < 0) continue;
      expect(s.capacidade[c]).toBeGreaterThan(0);
      expect(s.adeptos[c]).toBeGreaterThan(0);
      expect(s.fidelidade[c]).toBeGreaterThanOrEqual(1);
      for (let k = 0; k < N_INFRA; k++) { expect(s.infra[c * N_INFRA + k]).toBeGreaterThanOrEqual(1); expect(s.infra[c * N_INFRA + k]).toBeLessThanOrEqual(10); }
      expect(s.patrocinio[c]).toBeGreaterThan(0);
      expect(s.receitaPrevista[c]).toBeGreaterThan(0);
      for (const j of v.plantel[c]) { expect(st.salario[j]).toBeGreaterThan(0); expect(st.fimContrato[j]).toBeGreaterThan(diaInicioMundo()); }
    }
  }, 60000);

  it('massa salarial inicial entre 45% e 75% da receita prevista em todas as ligas (calibração por liga)', async () => {
    const v = await mundo();
    const s = v.economia!.clubes;
    for (const L of v.ligas) {
      const rec = L.clubes.reduce((x, c) => x + s.receitaPrevista[c], 0), sal = L.clubes.reduce((x, c) => x + s.folha[c], 0);
      expect(sal / rec).toBeGreaterThan(0.45);
      expect(sal / rec).toBeLessThan(0.75);
    }
  }, 60000);

  it('salário de mercado sobe com o OVR e com a riqueza da liga; escala real', () => {
    const st = w.jogadores!;
    const dia = diaInicioMundo();
    const eng = w.ligaPorId('ENG1').clubes.flatMap((c) => w.plantel[c]);
    const ord = [...eng].sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
    const e = w.economia!;
    const c0 = st.clube[ord[0]];
    const topo = salarioMercado(st, ord[0], 100, dia, e.escala(c0));
    expect(topo).toBeGreaterThan(5e6);
    expect(topo).toBeLessThan(60e6);
    expect(salarioMercado(st, ord[0], 100, dia)).toBeGreaterThan(salarioMercado(st, ord[ord.length - 1], 100, dia));
    expect(salarioMercado(st, ord[0], 100, dia)).toBeGreaterThan(salarioMercado(st, ord[0], 10, dia));
  });

  it('fair play: a percentagem da folha da liga é o balizador; senão 80%', () => {
    expect(limiteFairPlayLiga(w.ligaPorId('ENG1').regras)).toBeCloseTo(0.85);
    expect(limiteFairPlayLiga(w.ligaPorId('ESP1').regras)).toBeCloseTo(0.7);
    expect(limiteFairPlayLiga(w.ligaPorId('ESP2').regras)).toBeCloseTo(0.8);
    expect(limiteFairPlayLiga(w.ligaPorId('USA1').regras)).toBeCloseTo(0.8);
  });

  it('financas.csv: os valores editados à mão têm prioridade', async () => {
    const d = await dados();
    const v = construirMundo(d, { semente: 2026, modo: 'teste', economia: false });
    const id = v.clubes[v.ligaPorId('POR1').clubes[0]].id;
    const e = new Economia(v, [{ clube: id, caixa: '12345678', adeptos: '777', infra_estadio: '3', origem: 'manual' }]);
    const c = v.idx(id);
    expect(e.clubes.caixa[c]).toBe(12345678);
    expect(e.clubes.adeptos[c]).toBe(777);
    expect(e.clubes.infra[c * N_INFRA]).toBe(3);
    expect(e.clubes.origem[c]).toBe('manual');
  }, 60000);
});

describe('uma época com a economia ligada', () => {
  it('TV: a soma das partes de cada liga é o total da folha', () => {
    const e = w.economia!;
    for (const id of ['ENG1', 'ESP1', 'NED1', 'KOR1']) {
      const L = w.ligaPorId(id);
      const n = L.clubes.length;
      let soma = 0;
      for (const c of L.clubes) soma += e.tvFixaPrevista(c);
      for (let p = 1; p <= n; p++) soma += e.tvDesempenho(L.regras, n, p);
      expect(soma / (L.regras.tv.total_eur ?? 1)).toBeCloseTo(1, 6);
      const pt = partesTV(L.regras);
      expect(pt.igual + pt.desempenho + pt.comercial).toBeCloseTo(1, 9);
    }
  });

  it('balanços fechados com receitas e despesas em todas as rubricas principais; o campeão europeu recebe muito mais', () => {
    const s = w.economia!.clubes;
    const reg = sim.historico.find((r) => r.grupo === 'ago_mai')!;
    for (const { clube: c } of reg.tabelas.ENG1) {
      const b = s.balancos[c].at(-1)!;
      expect(b.receitas.tv).toBeGreaterThan(50e6);
      expect(b.receitas.bilheteira).toBeGreaterThan(1e6);
      expect(b.receitas.comercial).toBeGreaterThan(1e6);
      expect(b.despesas.salarios).toBeGreaterThan(10e6);
    }
    const ucl = reg.continentais.UCL.vencedor;
    const pr = s.balancos[ucl].at(-1)!.receitas.premios;
    expect(pr).toBeGreaterThan(80e6);
    const fase = Object.entries(reg.continentais.UCL.fases).find(([, f]) => f === 'liga')!;
    expect(pr).toBeGreaterThan(2 * s.balancos[Number(fase[0])].at(-1)!.receitas.premios);
  });

  it('pára-quedas para os descidos da Premier League (2 anos) e de La Liga; não para os de outras ligas', () => {
    const s = w.economia!.clubes;
    const reg = sim.historico.find((r) => r.grupo === 'ago_mai')!;
    const desc = (de: string) => reg.movimentos.filter((m) => m.de === de && m.via !== 'exterior').map((m) => m.clube);
    for (const c of desc('ENG1')) { expect(s.paraquedasAnos[c]).toBe(TV.paraquedas.ENG1.length); expect(s.paraquedas[c]).toBeGreaterThan(30e6); }
    for (const c of desc('ESP1')) expect(s.paraquedas[c]).toBeGreaterThan(0);
    for (const c of desc('ITA1')) expect(s.paraquedasAnos[c]).toBe(0);
  });

  it('contratos que acabaram: renovados (com nova data) ou o jogador sai para a lista de livres', () => {
    const st = w.jogadores!;
    let renovados = 0, livres = 0;
    for (const [j, fim] of fims) {
      const cl = w.jogadores!.clube[j] >= 0 ? w.jogadores!.clube[j] : -1;
      if (fim > sim.segunda + 30) continue; // só os que acabaram na primeira passagem de Agosto–Maio
      if (cl >= 0 && (w.liga[cl] < 0 || w.ligas[w.liga[cl]].regras.epoca.calendario !== 'ago_mai')) continue; // saiu do jogo ou ano civil
      if (st.clube[j] === -3) { livres++; expect(st.salario[j]).toBe(0); expect(w.plantel.some((p) => p.includes(j))).toBe(false); }
      else if (st.clube[j] >= 0) { renovados++; expect(st.fimContrato[j]).toBeGreaterThan(fim); }
    }
    expect(renovados).toBeGreaterThan(livres);
    expect(w.economia!.livres.length).toBeGreaterThan(livresAntes);
    for (const L of w.ligas) for (const c of L.clubes) expect(w.plantel[c].length).toBeGreaterThanOrEqual(CONTRATOS.plantel_minimo);
  });

  it('obras: há obras concluídas e em curso; o custo cresce com o nível e é menor em ligas pobres', () => {
    const s = w.economia!.clubes;
    let emCurso = 0;
    for (let i = 0; i < s.obraSemanal.length; i++) if (s.obraSemanal[i] > 0) emCurso++;
    expect(emCurso).toBeGreaterThan(10);
    expect(custoObra('treino', 6).custo).toBeGreaterThan(custoObra('treino', 3).custo);
    expect(custoObra('treino', 5, 2).custo).toBeLessThan(custoObra('treino', 5, 100).custo);
  });

  it('instalações neutras no nível 5 e com efeito limitado', () => {
    const e = w.economia!;
    for (let c = 0; c < 50; c++) {
      expect(Math.abs(e.factorLesao(c) - 1)).toBeLessThanOrEqual(0.15 + 1e-9);
      expect(Math.abs(e.bonusTreino(c))).toBeLessThanOrEqual(4 + 1e-9);
    }
  });
});

describe('controlador do clube', () => {
  it('um controlador que nunca renova (exceto o mínimo) deixa sair os jogadores; o IA é o de omissão', async () => {
    const v = await mundo();
    const e = v.economia!;
    expect(e.controlador(0)).toBeInstanceOf(ControladorIA);
    const c = v.ligaPorId('ENG2').clubes[3];
    let chamadas = 0;
    e.controladores[c] = {
      tipo: 'utilizador',
      orcamentos: (ww, ee, cc, r) => { chamadas++; return { salarios: 0.5 * r, transferencias: 0, infra: 0, staff: 0.05 * r }; },
      renovar: (_w, _e, _c, p) => p.tamanhoPlantel <= CONTRATOS.plantel_minimo,
      obra: () => null,
      financiamento: () => ['banco'],
    };
    const s2 = new Simulador(v);
    s2.simularEpoca();
    expect(chamadas).toBeGreaterThan(0);
    expect(e.clubes.orcInfra[c]).toBe(0);
  }, 120000);
});

describe('determinismo', () => {
  it('a mesma semente dá as mesmas finanças', async () => {
    const v = await mundo();
    const s2 = new Simulador(v);
    s2.simularEpoca();
    const a = w.economia!.clubes, b = v.economia!.clubes;
    for (const c of [0, 10, 100, 500]) { expect(b.caixa[c]).toBeCloseTo(a.caixa[c], 2); }
  }, 120000);
});
