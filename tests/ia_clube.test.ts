// Prompt 3, Bloco C: IA do clube (arquétipos), mercado de treinadores e staff.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo, dados } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { construirMundo } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { ARQUETIPOS, PARAMETROS } from '../src/config/arquetipos.ts';
import { MERCADO_TREINADORES, DESPEDIMENTO } from '../src/config/mercadoTreinadores.ts';
import { CARGOS, EFEITOS_STAFF } from '../src/config/staff.ts';
import { INTERFERENCIA } from '../src/config/treinadores.ts';
import { Rng } from '../src/core/rng.ts';

let w: World;
const dia = () => Math.floor(Date.UTC(2026, 10, 1) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('arquétipos do clube', () => {
  it('todos os clubes têm arquétipo; os 6 existem; parâmetros completos', () => {
    const e = w.economia!;
    const vistos = new Set<string>();
    for (let c = 0; c < w.clubes.length; c++) { expect(ARQUETIPOS).toContain(e.ia.arquetipo[c]); vistos.add(e.ia.arquetipo[c]); }
    expect(vistos.size).toBe(6);
    for (const a of ARQUETIPOS) expect(PARAMETROS[a].crise).toBeTruthy();
  });

  it('arquetipos.csv tem prioridade', async () => {
    const d = await dados();
    for (const p of d.pacotes) if (p.manifest.id === 'eng') p.arquetipos = [{ clube: 'eng_001', arquetipo: 'formador', origem: 'manual' }];
    const v = construirMundo(d, { semente: 2026, modo: 'teste' });
    const c = v.idx('eng_001');
    expect(v.economia!.ia.arquetipo[c]).toBe('formador');
    expect(v.economia!.ia.arqOrigem[c]).toBe('manual');
    for (const p of d.pacotes) if (p.manifest.id === 'eng') p.arquetipos = [];
  }, 60000);

  it('reacção à crise depende do arquétipo (formador corta salários; clube-vendedor regista a intenção de vender)', async () => {
    const v = await mundo();
    const e = v.economia!;
    const [a, b] = v.ligaPorId('POR1').clubes;
    e.ia.arquetipo[a] = 'formador'; e.ia.arquetipo[b] = 'vendedor';
    const esc = e.clubes.escalaClube[a];
    e.ia.crise(a, dia(), Rng.de(1));
    e.ia.crise(b, dia(), Rng.de(2));
    expect(e.clubes.escalaClube[a]).toBeCloseTo(esc * 0.9, 5);
    expect(e.ia.intencoes.some((x) => x.clube === b)).toBe(true);
  }, 60000);
});

describe('mercado de treinadores', () => {
  it('um treinador com contrato por clube; reserva de livres; reputação e idade', () => {
    const e = w.economia!;
    expect(e.mercadoT.livres.length).toBe(MERCADO_TREINADORES.livres);
    for (let c = 0; c < w.clubes.length; c++) {
      if (w.liga[c] < 0) continue;
      const t = w.motor!.treinadores[c];
      expect(t.clube).toBe(c);
      expect(t.salario).toBeGreaterThan(0);
      expect(t.contratoFim).toBeGreaterThan(dia() - 400);
      expect(t.clausula).toBeGreaterThan(0);
      expect(t.reputacao).toBeGreaterThanOrEqual(1);
    }
  });

  it('bons treinadores recusam projectos fracos', () => {
    const e = w.economia!;
    const pequeno = w.ligaPorId('ENG4').clubes[0];
    const t = { ...e.mercadoT.livres[0], reputacao: 95 };
    const t2 = { ...e.mercadoT.livres[0], reputacao: 20 };
    expect(e.mercadoT.probAceitar(t, pequeno)).toBeLessThan(0.05);
    expect(e.mercadoT.probAceitar(t2, pequeno)).toBeGreaterThan(0.5);
  });

  it('despedimentos: por resultados paga o restante; mútuo acordo 30–70%; justa causa ≤ 10% (ou litígio); imagem e novo treinador', async () => {
    const v = await mundo();
    const e = v.economia!, s = e.clubes;
    const c = v.ligaPorId('ITA1').clubes[4];
    const t = v.motor!.treinadores[c];
    const restante = ((t.contratoFim! - dia()) / 365) * t.salario!;
    const im = e.ia.imagem[c];
    e.mercadoT.despedir(c, dia(), 'resultados', Rng.de(1));
    expect(s.conta(c, 'indemnizacoes')).toBeCloseTo(restante, -2);
    expect(e.ia.imagem[c]).toBeLessThan(im);
    expect(v.motor!.treinadores[c]).not.toBe(t);
    expect(t.estado).not.toBe('empregado');
    const t2 = v.motor!.treinadores[c];
    const r2 = ((t2.contratoFim! - dia()) / 365) * t2.salario!;
    const antes = s.conta(c, 'indemnizacoes');
    e.mercadoT.despedir(c, dia(), 'mutuo_acordo', Rng.de(2));
    const pago = s.conta(c, 'indemnizacoes') - antes;
    expect(pago).toBeGreaterThanOrEqual(DESPEDIMENTO.mutuo[0] * r2 - 1);
    expect(pago).toBeLessThanOrEqual(DESPEDIMENTO.mutuo[1] * r2 + 1);
    const t3 = v.motor!.treinadores[c];
    const r3 = ((t3.contratoFim! - dia()) / 365) * t3.salario!;
    const a3 = s.conta(c, 'indemnizacoes');
    e.mercadoT.despedir(c, dia(), 'justa_causa', Rng.de(3));
    const p3 = s.conta(c, 'indemnizacoes') - a3;
    expect(p3 <= DESPEDIMENTO.justa_causa * r3 + 1 || Math.abs(p3 - DESPEDIMENTO.litigio_custo * r3) < 1).toBe(true);
  }, 60000);

  it('choque de filosofia: a moral de um treinador incompatível desce e acaba em saída ou conflito público', async () => {
    const v = await mundo();
    const e = v.economia!;
    const c = v.ligaPorId('GER2').clubes[3];
    e.ia.arquetipo[c] = 'formador';
    const t = v.motor!.treinadores[c];
    t.perfil = 'pragmatico'; t.atributos.adaptabilidade = 2; t.moral = 60;
    for (let k = 0; k < 18 && v.motor!.treinadores[c] === t && !t.conflito; k++) e.ia.mes(dia() + 30 * k);
    expect(t.moral!).toBeLessThan(60);
    expect(v.motor!.treinadores[c] !== t || t.conflito).toBe(true);
  }, 60000);

  it('conflito com o utilizador (interferência do Prompt 2) em crise: o treinador demite-se', async () => {
    const v = await mundo();
    const e = v.economia!;
    const c = v.ligaPorId('ESP1').clubes[2];
    v.motor!.definirClubeUtilizador(c);
    const t = v.motor!.treinadores[c];
    v.motor!.relacao!.conflito = INTERFERENCIA.crise + 5;
    e.ia.mes(dia());
    expect(v.motor!.treinadores[c]).not.toBe(t);
    expect(e.eventos.some((x) => x.clube === c && x.tipo === 'treinador_demite')).toBe(true);
    expect(v.motor!.relacao!.conflito).toBe(0);
  }, 60000);
});

describe('staff', () => {
  it('cada clube tem staff (os cargos principais), com custo e efeitos limitados', () => {
    const e = w.economia!;
    for (let c = 0; c < w.clubes.length; c += 11) {
      if (w.liga[c] < 0) continue;
      const cargos = new Set(e.staff.porClube[c].map((m) => m.cargo));
      for (const k of CARGOS.filter((x) => x !== 'analista')) expect(cargos.has(k)).toBe(true);
      expect(e.staff.custo(c)).toBeGreaterThan(0);
      expect(Math.abs(e.staff.factorTaxaLesao(c) - 1)).toBeLessThanOrEqual(EFEITOS_STAFF.limite + 1e-9);
      expect(Math.abs(e.staff.factorDiasLesao(c) - 1)).toBeLessThanOrEqual(EFEITOS_STAFF.limite + 1e-9);
    }
    // O adjunto atenua as fraquezas do treinador.
    const c = w.ligaPorId('ENG1').clubes[0];
    const t = { ...w.motor!.treinadores[c], atributos: { ...w.motor!.treinadores[c].atributos, tactica: 1 } };
    expect(e.staff.atributoTreinador(c, t, 'tactica')).toBeGreaterThan(1);
  });
});

describe('duas épocas com a IA do clube ligada', () => {
  it('mudanças de treinador entre 10% e 45% dos clubes por época; poucas mudanças de filosofia', async () => {
    const v = await mundo();
    const e = v.economia!;
    const sim = new Simulador(v);
    for (let k = 0; k < 2; k++) {
      const ev0 = e.eventos.length;
      sim.simularEpoca();
      const evs = e.eventos.slice(ev0);
      const n = v.clubes.filter((_, c) => v.liga[c] >= 0).length;
      const mud = new Set(evs.filter((x) => x.tipo === 'treinador_contratado').map((x) => x.clube)).size;
      expect(mud / n).toBeGreaterThan(0.1);
      expect(mud / n).toBeLessThan(0.45);
      expect(evs.filter((x) => x.tipo === 'arquetipo').length).toBeLessThan(0.05 * n);
    }
  }, 180000);
});
