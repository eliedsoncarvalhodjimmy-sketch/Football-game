// Fase 2, Bloco A: jogadores (atributos, papéis, OVR, geração, evolução, CSV).
import { describe, expect, it } from 'vitest';
import { mundo } from './helpers.ts';
import { ATRIBUTOS, N_ATR, IDX } from '../src/config/atributos.ts';
import { PAPEIS, IDX_PAPEL, POSICOES, IDX_POS, factorFamiliaridade } from '../src/config/papeis.ts';
import { PlayerStore } from '../src/players/store.ts';
import { gerarJogador } from '../src/players/gerador.ts';
import { aplicarVariacao, variacaoEsperada, renovarPlantel } from '../src/players/evolucao.ts';
import { exportarPacote, importarLinhas } from '../src/players/csv.ts';
import { parseCsv } from '../src/data/csv.ts';
import { diaInicioMundo } from '../src/engine/world.ts';
import { FORCA } from '../src/config/forca.ts';
import { Rng } from '../src/core/rng.ts';
import { EVOLUCAO } from '../src/config/evolucao.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };

describe('papéis, adequação e OVR', () => {
  it('20 papéis, todos com pesos válidos e posição', () => {
    expect(PAPEIS.length).toBe(20);
    for (const r of PAPEIS) {
      expect(r.posicoes.length).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(r.pesos)) {
        expect(ATRIBUTOS.some((a) => a.id === k)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it('adequação = média ponderada (1–20) e OVR = 1 + 99 × (adequação − 1) / 19', () => {
    const st = new PlayerStore(4);
    const i = st.novo('x', 'X', 'POR');
    st.atr.fill(10, 0, N_ATR);
    st.recalcular(i);
    for (let r = 0; r < PAPEIS.length; r++) expect(st.adequacao(i, r)).toBe(10);
    expect(st.ovrPos(i, 'MC')).toBe(Math.round(1 + (99 * 9) / 19));
    st.atr.fill(20, 0, N_ATR);
    st.recalcular(i);
    expect(st.ovrPos(i, 'PL')).toBe(100);
    st.atr.fill(1, 0, N_ATR);
    st.recalcular(i);
    expect(st.ovrPos(i, 'GR')).toBe(1);
  });

  it('um falso 9 "puro" é mais adequado a falso 9 do que a finalizador, e vice-versa', () => {
    const st = new PlayerStore(4);
    const f9 = st.novo('f9', 'F9', 'ESP');
    const fin = st.novo('fin', 'Fin', 'ESP');
    st.atr.fill(10, 0, 2 * N_ATR);
    for (const k of ['ptq', 'pas', 'vis', 'tec', 'dec'] as const) st.atr[f9 * N_ATR + IDX[k]] = 18;
    for (const k of ['fin', 'msb', 'cmp', 'ant', 'cab'] as const) st.atr[fin * N_ATR + IDX[k]] = 18;
    st.recalcular(f9);
    st.recalcular(fin);
    expect(st.adequacao(f9, IDX_PAPEL.pl_f9)).toBeGreaterThan(st.adequacao(f9, IDX_PAPEL.pl_fin) + 1);
    expect(st.adequacao(fin, IDX_PAPEL.pl_fin)).toBeGreaterThan(st.adequacao(fin, IDX_PAPEL.pl_f9) + 1);
  });

  it('familiaridade: natural sem penalização, competente −3% a −8%, desconfortável −15% a −25%', () => {
    expect(factorFamiliaridade(20)).toBe(1);
    expect(factorFamiliaridade(18)).toBe(1);
    expect(factorFamiliaridade(17)).toBeCloseTo(0.97, 5);
    expect(factorFamiliaridade(10)).toBeCloseTo(0.92, 5);
    expect(factorFamiliaridade(9)).toBeCloseTo(0.85, 5);
    expect(factorFamiliaridade(1)).toBeCloseTo(0.75, 5);
  });
});

describe('geração de plantéis', async () => {
  const w = await mundo(2026);
  const st = w.jogadores!;
  const dia = diaInicioMundo();

  it('25 jogadores por clube: 3 GR, 8 defesas, 8 médios, 6 avançados; idades 17–38', () => {
    // Equipa principal: 25 por clube; os juniores da academia (Prompt 4, Bloco C) são registos à parte.
    expect(w.plantel.reduce((a, p) => a + p.length, 0)).toBe(w.clubes.length * 25);
    expect(st.n).toBe(w.clubes.length * 25 + (w.academia?.contagens().individuais ?? 0));
    for (const pl of w.plantel) {
      expect(pl.length).toBe(25);
      const g: Record<string, number> = {};
      for (const j of pl) {
        g[GRUPO[POSICOES[st.posNat[j]]]] = (g[GRUPO[POSICOES[st.posNat[j]]]] ?? 0) + 1;
        const idade = st.idade(j, dia);
        expect(idade).toBeGreaterThanOrEqual(17);
        expect(idade).toBeLessThan(39);
      }
      expect(g).toEqual({ GR: 3, DEF: 8, MED: 8, AVA: 6 });
    }
  });

  it('atributos 1–20; atributos de guarda-redes baixos nos jogadores de campo; posição natural com familiaridade ≥ 18', () => {
    let fora = 0, grAlto = 0, famBaixa = 0, acimaPot = 0;
    for (let i = 0; i < st.n; i++) {
      for (let k = 0; k < N_ATR; k++) { const v = st.atr[i * N_ATR + k]; if (v < 1 || v > 20) fora++; }
      if (POSICOES[st.posNat[i]] !== 'GR' && st.atr[i * N_ATR + IDX.ref] > 6) grAlto++;
      if (st.fam[i * 12 + st.posNat[i]] < 18) famBaixa++;
      if (st.ovrNat(i) > st.pot[i]) acimaPot++;
    }
    expect({ fora, grAlto, famBaixa, acimaPot }).toEqual({ fora: 0, grAlto: 0, famBaixa: 0, acimaPot: 0 });
  });

  it('mínimo de nacionais (formados no país): Alemanha 12, Inglaterra 8, Itália 8', () => {
    for (const l of w.ligas) {
      const min = l.regras.plantel.minimo_nacionais ?? 0;
      if (!min) continue;
      for (const c of l.clubes) {
        const nac = w.plantel[c].filter((j) => st.paises[st.pais[j]] === w.clubes[c].pais).length;
        expect(nac).toBeGreaterThanOrEqual(min);
      }
    }
    expect(w.ligaPorId('GER1').regras.plantel.minimo_nacionais).toBe(12);
    expect(w.ligaPorId('ENG1').regras.plantel.minimo_nacionais).toBe(8);
    expect(w.ligaPorId('ITA2').regras.plantel.minimo_nacionais).toBe(8);
  });

  it('hierarquia preservada: o melhor onze segue a força da Fase 1 (correlação > 0,95)', () => {
    const xs: number[] = [], ys: number[] = [];
    for (let c = 0; c < w.clubes.length; c++) {
      const l = w.liga[c];
      const f = w.reputacao[c] * (FORCA.base + (FORCA.peso_forca_desportiva * w.ligas[l].regras.forca_desportiva) / 100);
      const onze = w.plantel[c].map((j) => st.ovrNat(j)).sort((a, b) => b - a).slice(0, 11);
      xs.push(f);
      ys.push(onze.reduce((s, x) => s + x, 0) / 11);
    }
    const m = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    const mx = m(xs), my = m(ys);
    let num = 0, dx = 0, dy = 0;
    for (let k = 0; k < xs.length; k++) { num += (xs[k] - mx) * (ys[k] - my); dx += (xs[k] - mx) ** 2; dy += (ys[k] - my) ** 2; }
    expect(num / Math.sqrt(dx * dy)).toBeGreaterThan(0.95);
    const media = (id: string) => m(w.ligaPorId(id).clubes.map((c) => m(w.plantel[c].map((j) => st.ovrNat(j)))));
    expect(media('ENG1')).toBeGreaterThan(media('ENG2'));
    expect(media('ENG2')).toBeGreaterThan(media('ENG3'));
    expect(media('ENG3')).toBeGreaterThan(media('ENG4'));
  });

  it('poucos craques: menos de 3% dos jogadores com OVR ≥ 85', () => {
    let n = 0;
    for (let i = 0; i < st.n; i++) if (st.ovrNat(i) >= 85) n++;
    expect(n / st.n).toBeLessThan(0.03);
    expect(n).toBeGreaterThan(20);
  });

  it('determinismo: a mesma semente gera os mesmos jogadores', async () => {
    const w2 = await mundo(2026);
    expect(Array.from(w2.jogadores!.atr.subarray(0, st.n * N_ATR))).toEqual(Array.from(st.atr.subarray(0, st.n * N_ATR)));
    expect(w2.jogadores!.nomes.slice(0, 50)).toEqual(st.nomes.slice(0, 50));
  });

  it('CSV: exportar e reimportar; o que foi editado à mão sobrepõe-se ao gerado', async () => {
    const csv = exportarPacote(w, st, 'por');
    const linhas = parseCsv(csv);
    expect(linhas.length).toBe(w.ligaPorId('POR1').clubes.length * 25 + w.ligaPorId('POR2').clubes.length * 25);
    // Reimportar sem mudanças não sobrepõe nada.
    const w2 = await mundo(2026);
    expect(importarLinhas(w2, w2.jogadores!, linhas).sobrepostos).toBe(0);
    // Edita um jogador: finalização 20 e nome novo.
    linhas[0].fin = '20';
    linhas[0].nome = 'Nome Editado';
    const r = importarLinhas(w2, w2.jogadores!, linhas);
    expect(r.sobrepostos).toBe(1);
    const i = w2.jogadores!.idx(linhas[0].id)!;
    expect(w2.jogadores!.atr[i * N_ATR + IDX.fin]).toBe(20);
    expect(w2.jogadores!.nomes[i]).toBe('Nome Editado');
    expect(w2.jogadores!.origem[i]).toBe(2); // manual
  });

  it('reposição de fim de época mantém a composição do plantel', () => {
    const c = w.ligaPorId('ENG1').clubes[0];
    const rng = Rng.de(1, 'renova');
    const { aposentados, novos } = renovarPlantel(w, st, c, dia + 365 * 6, rng, 2032);
    expect(novos.length).toBe(aposentados.length + (25 - (w.plantel[c].length - novos.length) - aposentados.length));
    expect(w.plantel[c].length).toBe(25);
    const g: Record<string, number> = {};
    for (const j of w.plantel[c]) g[GRUPO[POSICOES[st.posNat[j]]]] = (g[GRUPO[POSICOES[st.posNat[j]]]] ?? 0) + 1;
    expect(g).toEqual({ GR: 3, DEF: 8, MED: 8, AVA: 6 });
  });
});

describe('evolução', () => {
  function coorte(pot: number, pos: 'MC' | 'GR', prof?: number) {
    const st = new PlayerStore(256);
    const rng = Rng.de(7, 'coorte', pot, pos, prof ?? 0);
    const js: number[] = [];
    for (let k = 0; k < 200; k++) {
      const i = gerarJogador(st, rng, { id: `c${k}`, pais: 'POR', pos, idade: 17, dia: 0, ovr: pot - 26, potencial: pot, clube: 0 });
      if (prof) st.ocu[i * 6] = prof;
      js.push(i);
    }
    const media: number[] = [];
    let ultrapassou = 0;
    for (let m = 0; m <= 21 * 12; m++) {
      const idade = 17 + m / 12;
      if (m % 12 === 0) media.push(js.reduce((s, i) => s + st.ovrNat(i), 0) / js.length);
      for (const i of js) {
        aplicarVariacao(st, i, variacaoEsperada(idade, pos === 'GR', st.ovrNat(i), st.pot[i], st.oculto(i, 'prof'), st.oculto(i, 'amb'), 0.85, 10) + rng.normal(0, EVOLUCAO.ruido), idade, rng);
        if (st.ovrNat(i) > st.pot[i]) ultrapassou++;
      }
    }
    return { media, ultrapassou }; // media[k] = idade 17 + k
  }

  const p80 = coorte(80, 'MC');
  it('ninguém ultrapassa o potencial', () => {
    expect(p80.ultrapassou).toBe(0);
  });

  it('pico entre os 25 e os 31; perto do potencial aos 25', () => {
    const m = p80.media;
    const pico = m.indexOf(Math.max(...m)) + 17;
    expect(pico).toBeGreaterThanOrEqual(25);
    expect(pico).toBeLessThanOrEqual(31);
    expect(m[25 - 17]).toBeGreaterThan(80 - 6);
    expect(m[19 - 17]).toBeLessThan(m[25 - 17] - 8);
  });

  it('declínio por volta dos 33 e mais forte depois dos 35', () => {
    const m = p80.media;
    expect(m[33 - 17]).toBeLessThan(m[30 - 17] + 0.5);
    expect(m[37 - 17]).toBeLessThan(m[33 - 17] - 4);
  });

  it('profissionalismo alto envelhece mais devagar; guarda-redes envelhecem mais tarde', () => {
    const alto = coorte(80, 'MC', 19).media;
    const baixo = coorte(80, 'MC', 3).media;
    expect(alto[37 - 17]).toBeGreaterThan(baixo[37 - 17] + 3);
    const gr = coorte(80, 'GR').media;
    expect(gr[36 - 17]).toBeGreaterThan(p80.media[36 - 17] + 2);
  });

  it('mais minutos e melhor treinador dão mais evolução', () => {
    expect(variacaoEsperada(19, false, 50, 80, 10, 10, 1, 10)).toBeGreaterThan(variacaoEsperada(19, false, 50, 80, 10, 10, 0, 10));
    expect(variacaoEsperada(19, false, 50, 80, 10, 10, 0.5, 18)).toBeGreaterThan(variacaoEsperada(19, false, 50, 80, 10, 10, 0.5, 5));
    expect(IDX_POS.GR).toBe(0);
  });
});
