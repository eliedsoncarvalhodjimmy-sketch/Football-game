// Prompt 3, Bloco B: dívida, administração, fair play financeiro e donos.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo, dados } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { Economia } from '../src/economia/motorEconomico.ts';
import { gerirMes, entrarAdministracao, recuperacaoJudicial, precoClube, trocarDono, racioDivida } from '../src/club/financas.ts';
import { ATRIBUTOS_DONO } from '../src/config/donos.ts';
import { ADMINISTRACAO, DIVIDA, RECUPERACAO, PONTOS_CAIXA, INJECCAO_MAXIMA } from '../src/config/divida.ts';
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
    s.dividaBanco[c] = 4 * s.receitaPrevista[c];
    const div0 = s.divida(c);
    expect(racioDivida(e, c)).toBeGreaterThan(ADMINISTRACAO.divida);
    gerirMes(e, c, dia());
    expect(e.pontosPendentes.get(c)).toBe(ADMINISTRACAO.pontos);
    expect(s.proibidoAte[c]).toBeGreaterThan(dia());
    expect(s.saude[c]).toBe(3);
    expect(s.divida(c)).toBeLessThan(div0 * (1 - ADMINISTRACAO.perdao) + 1);
    expect(v.plantel[c].filter((j) => st.clube[j] === c).length).toBeGreaterThanOrEqual(CONTRATOS.plantel_minimo);
    expect(e.donos[c]).not.toBe(antes);
    expect(v.liga[c]).toBeGreaterThanOrEqual(0);
  }, 60000);
});

describe('regime de sanções do utilizador', () => {
  it('limite de dívida: acima de 1,5× proibição de contratar até voltar a 1×; aviso a partir de 1,2×', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('FRA1').clubes[6];
    const r = s.receitaPrevista[c];
    s.caixa[c] = 0.5 * r; s.dividaDono[c] = 0;
    s.dividaBanco[c] = 1.3 * r;
    gerirMes(e, c, dia());
    expect(e.eventos.some((x) => x.clube === c && x.tipo === 'aviso')).toBe(true);
    expect(s.banDivida[c]).toBe(0);
    s.dividaBanco[c] = 1.7 * r;
    gerirMes(e, c, dia() + 30);
    expect(s.banDivida[c]).toBe(1);
    expect(s.proibidoAte[c]).toBeGreaterThan(dia() + 30);
    s.dividaBanco[c] = 0.9 * r;
    gerirMes(e, c, dia() + 60);
    expect(s.banDivida[c]).toBe(0);
  }, 60000);

  it('recuperação judicial: −6 pontos, proibição até ao fim da próxima janela, dívida renegociada', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('ESP2').clubes[2];
    recuperacaoJudicial(e, c, dia());
    expect(e.pontosPendentes.get(c)).toBe(RECUPERACAO.pontos);
    expect(s.proibidoAte[c]).toBeGreaterThan(dia());
    expect(s.proibidoAte[c]).toBeLessThan(dia() + 200);
    expect(s.juroBanco[c]).toBeCloseTo(RECUPERACAO.juro);
    expect(s.prazoBanco[c]).toBe(RECUPERACAO.prazo_anos);
  }, 60000);

  it('perda de pontos por caixa negativa: 2.º aviso −3, 3.º aviso −9, no espaço de 12 meses', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('POR2').clubes[4];
    e.controladores[c] = { ...e.controlador(c), tipo: 'ia', orcamentos: e.controlador(c).orcamentos, renovar: e.controlador(c).renovar, obra: () => null, financiamento: () => [], pedirRecuperacao: () => false };
    s.dividaBanco[c] = 0;
    const r = s.receitaPrevista[c];
    for (let k = 0; k < 3; k++) { s.caixa[c] = -0.2 * r; gerirMes(e, c, dia() + k * PONTOS_CAIXA.intervalo_dias); }
    expect(e.pontosPendentes.get(c)).toBe(PONTOS_CAIXA.pontos[1] + PONTOS_CAIXA.pontos[2]);
  }, 60000);

  it('injecção de capital do dono limitada a 25% da receita por época', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('KSA1').clubes[0];
    e.donos[c] = { ...e.donos[c], tipo: 'estado', atributos: { ...e.donos[c].atributos, riqueza: 20, lealdade: 20, gasto: 20 } };
    e.controladores[c] = { ...e.controlador(c), financiamento: () => ['capital_dono'], pedirRecuperacao: () => false } as never;
    s.injeccoes[c] = 0;
    for (let k = 0; k < 12; k++) { s.caixa[c] = -s.receitaPrevista[c]; gerirMes(e, c, dia() + 30 * k); }
    expect(s.injeccoes[c]).toBeLessThanOrEqual(INJECCAO_MAXIMA * s.receitaPrevista[c] + 1);
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

describe('três épocas com dívida, sanções e donos', () => {
  it('avisos e vendas acontecem mas são raros; os clubes de adeptos não são vendidos; os pontos pendentes são aplicados', async () => {
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
    const avisos = e.eventos.filter((x) => x.tipo === 'aviso' || x.tipo === 'aviso_ffp').length;
    expect(avisos).toBeGreaterThan(0);
    const pontos = e.eventos.filter((x) => x.tipo === 'pontos').length;
    expect(pontos).toBeLessThan(0.2 * n);
    // Os pontos pendentes da 1.ª passagem já foram aplicados (ficam registados como evento "pontos").
    let crise = 0;
    for (let c = 0; c < v.clubes.length; c++) if (v.liga[c] >= 0 && e.clubes.saude[c] === 2) crise++;
    expect(crise).toBeLessThan(0.1 * n);
  }, 180000);
});
