// Prompt 3, Bloco B: dívida, administração, fair play financeiro e donos.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo, dados } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { Economia } from '../src/economia/motorEconomico.ts';
import { gerirMes, entrarAdministracao, sancionarFFP, precoClube, trocarDono } from '../src/club/financas.ts';
import { ATRIBUTOS_DONO } from '../src/config/donos.ts';
import { ADMINISTRACAO, DIVIDA, SANCOES_FFP } from '../src/config/divida.ts';
import { VENDA } from '../src/config/donos.ts';
import { CONTRATOS } from '../src/config/economia.ts';
import { Tabela } from '../src/engine/competitions/table.ts';
import { Rng } from '../src/core/rng.ts';

let w: World;
const dia = () => Math.floor(Date.UTC(2026, 9, 1) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('donos', () => {
  it('todos os clubes têm dono com 7 atributos 1–20; o tipo segue o país', () => {
    const e = w.economia!;
    for (let c = 0; c < w.clubes.length; c++) {
      const d = e.donos[c];
      expect(d).toBeDefined();
      for (const a of ATRIBUTOS_DONO) { expect(d.atributos[a]).toBeGreaterThanOrEqual(1); expect(d.atributos[a]).toBeLessThanOrEqual(20); }
    }
    const frac = (id: string, tipo: string) => { const cl = w.ligaPorId(id).clubes; return cl.filter((c) => e.donos[c].tipo === tipo).length / cl.length; };
    expect(frac('GER1', 'adeptos')).toBeGreaterThan(0.4);
    expect(frac('ARG1', 'adeptos')).toBeGreaterThan(0.5);
    expect(frac('KSA1', 'estado')).toBeGreaterThan(0.4);
    expect(frac('ENG1', 'adeptos')).toBeLessThan(0.15);
  });

  it('donos.csv: o dono real/manual tem prioridade', async () => {
    const d = await dados();
    const v = construirMundo(d, { semente: 2026, modo: 'teste', economia: false });
    const id = v.clubes[v.ligaPorId('ENG1').clubes[0]].id;
    const e = new Economia(v, [], [{ id: 'x', nome: 'Dono Real', tipo: 'bilionario', clube: id, riqueza: '20', origem: 'real' }]);
    const dn = e.donos[v.idx(id)];
    expect(dn.nome).toBe('Dono Real');
    expect(dn.atributos.riqueza).toBe(20);
    expect(dn.origem).toBe('real');
  }, 60000);

  it('venda: preço = múltiplo da receita + activos − dívida; lua de mel; o comprador tem fortuna suficiente', async () => {
    const v = await mundo();
    const e = v.economia!;
    const c = v.ligaPorId('ENG2').clubes[2];
    const p = precoClube(e, c);
    expect(p).toBeGreaterThanOrEqual(VENDA.minimo_receita * e.clubes.receitaPrevista[c] - 1);
    const antes = e.donos[c];
    trocarDono(e, c, dia(), 'teste', p, Rng.de(1));
    expect(e.donos[c]).not.toBe(antes);
    expect(e.donos[c].tipo).not.toBe('adeptos');
    expect(e.donos[c].luaDeMelAte).toBe(dia() + VENDA.lua_de_mel_meses * 30);
    expect(e.eventos.at(-1)!.tipo).toBe('venda');
  }, 60000);
});

describe('dívida e administração', () => {
  it('falta de caixa: o clube pede ao dono ou ao banco, dentro do limite', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('ESP2').clubes[5];
    s.caixa[c] = -0.05 * s.receitaPrevista[c];
    s.dividaBanco[c] = 0;
    gerirMes(e, c, dia());
    expect(s.caixa[c]).toBeGreaterThan(0);
    expect(s.divida(c)).toBeLessThanOrEqual(DIVIDA.limite_banco * s.receitaPrevista[c] + 1);
    expect(e.eventos.some((x) => x.clube === c && ['emprestimo_banco', 'capital_dono', 'emprestimo_dono'].includes(x.tipo))).toBe(true);
  }, 60000);

  it('insolvência → administração: pontos, proibição, venda forçada, dívida perdoada, novo dono; o clube não desaparece', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes, st = v.jogadores!;
    const c = v.ligaPorId('ITA2').clubes[1];
    e.donos[c] = { ...e.donos[c], tipo: 'familia' };
    const antes = e.donos[c];
    s.dividaBanco[c] = 3 * s.receitaPrevista[c];
    const div0 = s.divida(c);
    entrarAdministracao(e, c, dia());
    expect(e.pontosPendentes.get(c)).toBe(ADMINISTRACAO.pontos);
    expect(s.proibidoAte[c]).toBeGreaterThan(dia());
    expect(s.saude[c]).toBe(3);
    expect(s.divida(c)).toBeLessThan(div0 * (1 - ADMINISTRACAO.perdao) + 1);
    expect(v.plantel[c].filter((j) => st.clube[j] === c).length).toBeGreaterThanOrEqual(CONTRATOS.plantel_minimo);
    expect(e.donos[c]).not.toBe(antes);
    expect(v.liga[c]).toBeGreaterThanOrEqual(0);
  }, 60000);
});

describe('fair play financeiro', () => {
  it('escala com o excesso e a reincidência: aviso → multa e proibição → perda de pontos', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('FRA1').clubes[3];
    const r = 100e6;
    sancionarFFP(e, c, dia(), 0.03, r, 'FRA1');
    expect(e.eventos.at(-1)!.tipo).toBe('aviso_ffp');
    expect(s.conta(c, 'multas')).toBe(0);
    sancionarFFP(e, c, dia(), 0.12, r, 'FRA1');
    expect(e.eventos.at(-1)!.tipo).toBe('sancao_ffp');
    expect(s.conta(c, 'multas')).toBeCloseTo(SANCOES_FFP.multa[1] * 0.12 * r, 0);
    expect(s.proibidoAte[c]).toBeGreaterThan(dia());
    sancionarFFP(e, c, dia(), 0.2, r, 'FRA1');
    expect(e.pontosPendentes.get(c)).toBe(SANCOES_FFP.pontos_base + 2 * SANCOES_FFP.pontos_por_decimo);
    // Clube que cumpre não é sancionado: a contagem de reincidência volta a zero no fecho de época (testado no teste de 5 épocas).
  }, 60000);

  it('pontos deduzidos aparecem na tabela', () => {
    const t = new Tabela([1, 2, 3]);
    t.registar(1, 2, 2, 0);
    expect(t.deduzir(1, 6)).toBe(true);
    const l = t.linhas.find((x) => x.clube === 1)!;
    expect(l.pts).toBe(-3);
    expect(l.ded).toBe(6);
  });
});

describe('três épocas com dívida, fair play e donos', () => {
  it('sanções e vendas acontecem mas são raras; os clubes de adeptos não são vendidos; os pontos pendentes são aplicados', async () => {
    const v = await mundo();
    const e = v.economia!;
    const adeptos = new Map([...Array(v.clubes.length).keys()].filter((c) => e.donos[c].tipo === 'adeptos').map((c) => [c, e.donos[c]]));
    const sim = new Simulador(v);
    for (let k = 0; k < 3; k++) sim.simularEpoca();
    const n = v.clubes.filter((_, c) => v.liga[c] >= 0).length;
    const vendas = e.eventos.filter((x) => x.tipo === 'venda' && !x.texto.includes('administração'));
    for (const x of vendas) expect(adeptos.has(x.clube)).toBe(false);
    expect(vendas.length).toBeGreaterThan(0.01 * n);
    expect(vendas.length).toBeLessThan(0.25 * n);
    const ffp = e.eventos.filter((x) => x.tipo === 'sancao_ffp').length;
    expect(ffp).toBeGreaterThan(0);
    expect(ffp).toBeLessThan(0.4 * n);
    // Os pontos pendentes da 1.ª passagem já foram aplicados (ficam registados como evento "pontos").
    if (e.eventos.some((x) => x.tipo === 'administracao' || x.texto.includes('pontos'))) expect(e.eventos.some((x) => x.tipo === 'pontos')).toBe(true);
    let crise = 0;
    for (let c = 0; c < v.clubes.length; c++) if (v.liga[c] >= 0 && e.clubes.saude[c] === 2) crise++;
    expect(crise).toBeLessThan(0.1 * n);
  }, 180000);
});
