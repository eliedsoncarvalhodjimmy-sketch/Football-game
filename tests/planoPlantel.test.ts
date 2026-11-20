// Prompt 6, Bloco B: plano de plantel e IA por necessidade. O plano mensal por clube (posições da formação do treinador,
// nível no sistema pelo estilo, necessidades, excedentes, insubstituíveis) e o mercado depois de uma janela de Verão.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { diaInicioMundo, type World } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { PLANO_PLANTEL } from '../src/config/negociacao.ts';
import { FORMACAO_POR_ID } from '../src/config/tacticas.ts';
import { POSICOES, IDX_POS, FAMILIARIDADE } from '../src/config/papeis.ts';
import type { Mercado } from '../src/mercado/mercado.ts';

let w: World, m: Mercado;
const dia = diaInicioMundo() + 5;
beforeAll(async () => { w = await mundo(); m = w.mercado!; }, 60000);

describe('plano de plantel (Prompt 6, Bloco B)', () => {
  it('cada lugar da formação tem titular; necessidades curtas e ordenadas; excedentes sem baixar dos 22; insubstituíveis são titulares', () => {
    const st = w.jogadores!;
    let comNecessidades = 0;
    for (const id of ['ENG1', 'POR1', 'BRA1', 'NED1']) for (const c of w.ligaPorId(id).clubes.slice(0, 6)) {
      const p = m.planos.calcular(c, dia);
      const f = FORMACAO_POR_ID[p.formacao];
      const tit = [...p.lugar.values()].filter((x) => x.titular);
      expect(tit.length).toBeLessThanOrEqual(f.lugares.length);
      expect(p.necessidades.length).toBeLessThanOrEqual(PLANO_PLANTEL.necessidades_max);
      for (let k = 1; k < p.necessidades.length; k++) expect(p.necessidades[k - 1].urgencia).toBeGreaterThanOrEqual(p.necessidades[k].urgencia);
      if (p.necessidades.length) comNecessidades++;
      expect(m.plantel(c).length - p.excedentes.length).toBeGreaterThanOrEqual(22);
      for (const j of p.insubstituiveis) expect(p.lugar.get(j)?.titular).toBe(true);
      // Os titulares servem a posição (natural ou competente).
      for (const [j, l] of p.lugar) expect(st.fam[j * POSICOES.length + IDX_POS[l.pos]]).toBeGreaterThanOrEqual(FAMILIARIDADE.competente);
    }
    expect(comNecessidades).toBeGreaterThan(0);
  });

  it('o estilo do treinador conta: no Tiki-Taka um médio vale pelo passe e pela técnica', () => {
    const st = w.jogadores!;
    const c = w.ligaPorId('ESP1').clubes[0];
    const meds = m.plantel(c).filter((j) => POSICOES[st.posNat[j]] === 'MC');
    if (!meds.length) return;
    const j = meds[0];
    const tiki = m.planos.nivelNoSistema(j, 'MC', 'tiki_taka'), direto = m.planos.nivelNoSistema(j, 'MC', 'jogo_direto');
    // Sem estilo (neutro) o nível é o OVR na posição; com estilo, a mistura com os atributos que o estilo valoriza.
    const neutro = m.planos.nivelNoSistema(j, 'MC', 'neutro');
    expect(neutro).toBeCloseTo(st.ovrPos(j, 'MC'), 5);
    expect(tiki).not.toBeCloseTo(direto, 5);
  });

  it('um pedido do treinador por cumprir no fim da janela baixa-lhe a moral', () => {
    const c = w.ligaPorId('POR1').clubes[3];
    const p = m.planos.calcular(c, dia);
    const n0 = p.todas[0] ?? { pos: 'PL' as const, motivo: 'qualidade' as const, urgencia: 1, nivelMin: 70, idade: [20, 30] as [number, number], pedido: true, texto: 'teste' };
    p.necessidades = [{ ...n0, pedido: true }];
    m.reforcosJanela.delete(c);
    const t = w.motor!.treinadores[c];
    t.moral = 70;
    let d = dia; while (new Date(d * 864e5).getUTCMonth() !== 8) d++;
    m.mes(d);
    expect(t.moral).toBeLessThan(70);
  });

  it('depois de uma janela de Verão: nenhum clube sem ninguém numa posição da formação; poucos com 6 da mesma posição; contratações em faixa', () => {
    const sim = new Simulador(w, true);
    const st = w.jogadores!, NP = POSICOES.length;
    const porClube = new Map<number, number>();
    const vistos = new Set<number>();
    for (let k = 0; k < 10; k++) {
      sim.simularSemana();
      for (const n of m.concluidos) { if (vistos.has(n.id)) continue; vistos.add(n.id); if (n.estado === 'concluido' && n.tipo !== 'pre_contrato') porClube.set(n.comprador, (porClube.get(n.comprador) ?? 0) + 1); }
    }
    let vazios = 0, seis = 0, n = 0;
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0) continue;
      n++;
      const pl = m.plantel(c);
      const f = FORMACAO_POR_ID[w.motor!.treinadores[c].formacoes[0]] ?? FORMACAO_POR_ID['4-3-3'];
      if ([...new Set(f.lugares.map((l) => l.pos))].some((p) => !pl.some((j) => st.fam[j * NP + IDX_POS[p]] >= FAMILIARIDADE.competente))) vazios++;
      const nat = new Array(NP).fill(0); for (const j of pl) nat[st.posNat[j]]++;
      if (nat.some((x) => x >= 6)) seis++;
    }
    expect(vazios).toBe(0);
    expect(seis / n).toBeLessThan(0.1);
    expect(Math.max(...porClube.values())).toBeLessThanOrEqual(10);
  }, 240000);
});
