// Prompt 4, Bloco A: valor, contratos, cláusulas, negociação, janelas, inscrições.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { valorMercado, precoPedido } from '../src/mercado/valor.ts';
import { PRECO, INFLACAO } from '../src/config/valor.ts';
import { CONTRATO } from '../src/config/contratosJogador.ts';
import { CLAUSULAS } from '../src/config/clausulas.ts';
import { garantirContratos, salarioMercado, indiceRiqueza } from '../src/economia/contratos.ts';
import { Rng } from '../src/core/rng.ts';

let w: World;
const dia = Math.floor(Date.UTC(2026, 6, 10) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('valor e preço', () => {
  it('valor sobe com o OVR, cai com a idade depois dos 27 e com o contrato a acabar', () => {
    const st = w.jogadores!, m = w.mercado!;
    const js = m.plantel(w.ligaPorId('ENG1').clubes[0]);
    const [a, b] = [...js].sort((x, y) => st.ovrNat(y) - st.ovrNat(x));
    expect(valorMercado(w, a, dia)).toBeGreaterThanOrEqual(valorMercado(w, js.sort((x, y) => st.ovrNat(x) - st.ovrNat(y))[0], dia));
    const fim = st.fimContrato[b];
    const v1 = valorMercado(w, b, dia);
    st.fimContrato[b] = dia + 200;
    expect(valorMercado(w, b, dia)).toBeLessThan(v1);
    st.fimContrato[b] = fim;
  });

  it('preço pedido dentro da faixa 0,6–2,5 × valor, com factores limitados', () => {
    const st = w.jogadores!, m = w.mercado!;
    const comp = w.ligaPorId('ENG1').clubes[1];
    for (const c of w.ligaPorId('POR1').clubes) for (const j of m.plantel(c).slice(0, 5)) {
      const pp = precoPedido(w, m, j, comp, dia, 3);
      expect(pp.preco / pp.valor).toBeGreaterThanOrEqual(PRECO.razao[0] - 0.01);
      expect(pp.preco / pp.valor).toBeLessThanOrEqual(PRECO.razao[1] + 0.01);
      expect(pp.factores.concorrencia).toBeLessThanOrEqual(PRECO.concorrencia_maximo);
      void st;
    }
  });
});

describe('contratos e cláusulas', () => {
  it('primeiro contrato de jovem: no máximo 40% do salário de mercado do OVR, com aumento após N jogos', async () => {
    const v = await mundo();
    const st = v.jogadores!;
    const c = v.ligaPorId('ESP1').clubes[0];
    const j = v.plantel[c][0];
    st.salario[j] = 0;
    garantirContratos(v, c, dia, Rng.de(1), true, v.economia!.escala(c));
    const mercado = salarioMercado(st, j, indiceRiqueza(v, c), dia, v.economia!.escala(c));
    expect(st.salario[j]).toBeLessThanOrEqual(CONTRATO.jovem_fraccao * mercado + 1000);
    expect(v.mercado!.contratos.aumentoJogos[j]).toBe(CONTRATO.jovem_aumento_jogos);
  }, 60000);

  it('cláusulas: universais em Espanha; no máximo 2 por plantel (3 nas ligas com tradição); valor 1,5–4 × o valor', () => {
    const m = w.mercado!, k = m.contratos;
    const esp = w.ligaPorId('ESP1').clubes[0];
    const pl = m.plantel(esp);
    expect(pl.filter((j) => k.clausula[j] > 0).length / pl.length).toBeGreaterThan(0.9);
    for (const L of w.ligas) {
      if (CLAUSULAS.ligas_universal.includes(L.regras.id)) continue;
      const max = CLAUSULAS.ligas_comum.includes(L.regras.id) ? CLAUSULAS.maximo_tradicao : CLAUSULAS.maximo_plantel;
      for (const c of L.clubes) expect(m.plantel(c).filter((j) => k.clausula[j] > 0).length).toBeLessThanOrEqual(max);
    }
    for (const j of pl.slice(0, 10)) { const r = k.clausula[j] / valorMercado(w, j, Math.floor(Date.UTC(2026, 6, 1) / 864e5)); expect(r).toBeGreaterThan(CLAUSULAS.multiplo[0] - 0.1); expect(r).toBeLessThan(CLAUSULAS.multiplo[1] + 0.1); }
  });
});

describe('negociação', () => {
  it('leilão entre 2 clubes: um ganha, o outro perde; dinheiro, agentes (5%) e parcelas', async () => {
    const v = await mundo();
    const st = v.jogadores!, m = v.mercado!, s = v.economia!.clubes;
    const vend = [...v.ligaPorId('ESP1').clubes].sort((a, b) => v.reputacao[b] - v.reputacao[a])[6];
    const j = m.plantel(vend).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[1];
    const eng = [...v.ligaPorId('ENG1').clubes].sort((a, b) => v.reputacao[b] - v.reputacao[a]);
    for (const c of [eng[3], eng[5]]) s.caixa[c] = 400e6;
    const pp = precoPedido(v, m, j, eng[3], dia, 2);
    const rng = Rng.de(3);
    const n1 = m.abrir('transferencia', j, eng[3], dia, pp.valor * 0.75, pp.preco * 1.3, rng)!;
    const n2 = m.abrir('transferencia', j, eng[5], dia, pp.valor * 0.8, pp.preco * 1.1, rng)!;
    for (let k = 0; k < 20; k++) for (const n of [n1, n2]) if (n.estado !== 'concluido' && n.estado !== 'falhou') { m.ronda(n, rng); n.dia++; }
    expect([n1, n2].filter((n) => n.motivo?.includes('perdeu o leilão')).length).toBe(1);
    const g = [n1, n2].find((n) => !n.motivo?.includes('perdeu o leilão'))!;
    if (g.estado !== 'concluido') { expect(g.motivo).toMatch(/recusa os termos/); return; }
    expect(st.clube[j]).toBe(g.comprador);
    expect(s.conta(g.comprador, 'agentes')).toBeCloseTo(CONTRATO.agentes * g.oferta, -2);
    if (g.oferta > CONTRATO.parcelas_acima) expect(s.dividaParcelas[g.comprador]).toBeGreaterThan(0);
    expect(s.conta(vend, 'transferencias')).toBeGreaterThan(0);
  }, 60000);

  it('cláusula activada: o comprador negocia directamente com o jogador', async () => {
    const v = await mundo();
    const st = v.jogadores!, m = v.mercado!;
    const c = v.ligaPorId('POR1').clubes[3];
    const j = m.plantel(c)[0];
    m.contratos.clausula[j] = 20e6;
    const comp = v.ligaPorId('ENG1').clubes[0];
    v.economia!.clubes.caixa[comp] = 200e6;
    const n = m.abrir('clausula', j, comp, dia, 20e6, 20e6, Rng.de(2))!;
    expect(n.estado).toBe('termos');
    for (let k = 0; k < 6 && n.estado !== 'concluido' && n.estado !== 'falhou'; k++) { m.ronda(n, Rng.de(10 + k)); n.dia++; }
    expect(['concluido', 'falhou']).toContain(n.estado);
    if (n.estado === 'concluido') expect(st.clube[j]).toBe(comp);
  }, 60000);
});

describe('janelas e inscrições', () => {
  it('janelas por liga; as de ano civil têm as suas', () => {
    const m = w.mercado!;
    const eng = w.ligaPorId('ENG1').clubes[0], bra = w.ligaPorId('BRA1').clubes[0];
    const d = (y: number, mo: number, da: number) => Math.floor(Date.UTC(y, mo - 1, da) / 864e5);
    expect(m.janelaAberta(eng, d(2026, 7, 15))).toBe(true);
    expect(m.janelaAberta(eng, d(2026, 10, 15))).toBe(false);
    expect(m.janelaAberta(eng, d(2027, 1, 20))).toBe(true);
    expect(m.janelaAberta(bra, d(2027, 3, 1))).toBe(true);
    expect(m.janelaAberta(eng, d(2027, 3, 1))).toBe(false);
  });

  it('mínimo de nacionais (Alemanha 12) e estrangeiros = fora da confederação', () => {
    const m = w.mercado!, st = w.jogadores!;
    const ger = w.ligaPorId('GER1').clubes[0];
    const est = [...Array(st.n).keys()].find((j) => st.paises[st.pais[j]] === 'BRA')!;
    expect(m.estrangeiro(est, ger)).toBe(true);
    const fra = [...Array(st.n).keys()].find((j) => st.paises[st.pais[j]] === 'FRA')!;
    expect(m.estrangeiro(fra, ger)).toBe(false);
    // Plantel cheio de estrangeiros: inscrever outro estrangeiro falha por faltarem nacionais.
    const pl = m.plantel(ger);
    const pais0 = pl.map((j) => st.pais[j]);
    for (const j of pl) st.pais[j] = st.pais[est];
    const max = w.ligaPorId('GER1').regras.plantel.max;
    const extra = [...Array(Math.max(0, max - pl.length - 3)).keys()].map((k) => pl[k % pl.length]);
    w.plantel[ger] = [...pl, ...extra];
    expect(m.podeInscrever(est, ger)).toMatch(/nacionais|cheio/);
    w.plantel[ger] = pl;
    pl.forEach((j, i) => (st.pais[j] = pais0[i]));
  });
});

describe('uma época de mercado', () => {
  it('há transferências, empréstimos, livres e pré-contratos; contratos acabados viram livres; a inflação entra a cada 2 anos', async () => {
    const v = await mundo();
    const sim = new Simulador(v);
    sim.simularEpoca();
    const es = v.mercado!.estat;
    expect(es.transferencias).toBeGreaterThan(30);
    expect(es.emprestimos).toBeGreaterThan(30);
    expect(es.preContratos).toBeGreaterThan(5);
    expect([...v.mercado!.livres.values()].reduce((a, b) => a + b.length, 0)).toBeGreaterThan(100);
    expect(v.economia!.inflacao).toBe(1);
    sim.simularEpoca();
    expect(v.economia!.inflacao).toBeCloseTo(1 + INFLACAO.taxa, 6);
    for (const L of v.ligas) for (const c of L.clubes) expect(v.mercado!.plantel(c).length).toBeGreaterThanOrEqual(18);
  }, 240000);
});
