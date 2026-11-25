// Prompt 8, Bloco A: a janela dos prémios (1 de Agosto a 28 de Julho), somada entre clubes; títulos repartidos pelos
// minutos de cada passagem por um clube; estatísticas novas de guarda-redes; jogadores de ligas de ano civil; guarda de
// integridade; e o histórico das últimas 3 épocas por jogador (que não entra nos prémios).
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { passagem, IDX_CAT } from '../src/premios/janela.ts';
import { calcularPremios, atribuirPremios } from '../src/premios/premios.ts';
import { N_CAT } from '../src/players/store.ts';
import type { World } from '../src/engine/world.ts';

describe('janela dos prémios (Prompt 8, Bloco A)', () => {
  let w: World, sim: Simulador;
  beforeAll(async () => {
    w = await mundo();
    sim = new Simulador(w, true);
    // Até à 1.ª semana de Novembro: a janela abre a 1 de Agosto (antes da época de Agosto–Maio).
    for (let k = 0; k < 18; k++) sim.simularSemana();
  }, 240000);

  it('abre a 1 de Agosto; os contadores da janela fecham com as estatísticas da época (Agosto–Maio)', () => {
    const jp = w.janelaPremios!, st = w.jogadores!;
    expect(new Date(jp.inicio * 864e5).toISOString().slice(5, 10)).toBe('08-01');
    let n = 0;
    for (const c of w.ligaPorId('ENG1').clubes) for (const j of w.plantel[c]) {
      if (st.clube[j] !== c || st.eJogos[j] === 0 || st.wClube[j * 2 + 1] !== -1) continue;
      expect(st.wJogos[j]).toBe(st.eJogos[j]);
      expect(st.wMinutos[j]).toBe(st.eMinutos[j]);
      expect(st.wGolos[j]).toBe(st.eGolos[j]);
      expect(st.wNotas[j]).toBe(st.eNotas[j]);
      let min = 0; for (let cat = 0; cat < N_CAT; cat++) min += st.wMinCat[j * 2 * N_CAT + cat];
      expect(min).toBe(st.wMinutos[j]);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('guarda-redes: remates à baliza sofridos = golos + defesas; xG sofrido e jogos sem sofrer contados', () => {
    const st = w.jogadores!;
    let n = 0;
    for (const c of w.ligaPorId('ESP1').clubes) {
      const gr = w.plantel[c].filter((j) => st.clube[j] === c && st.posNat[j] === 0).sort((a, b) => st.wMinutos[b] - st.wMinutos[a])[0];
      if (gr === undefined || st.wJogos[gr] < 5) continue;
      expect(st.wRematesSofridos[gr]).toBe(st.wDefesas[gr] + st.eSofridos[gr]);
      expect(st.wXgSofrido[gr]).toBeGreaterThan(0);
      expect(st.wSemSofrer[gr]).toBeLessThanOrEqual(st.wJogos[gr]);
      n++;
    }
    expect(n).toBeGreaterThan(10);
  });

  it('jogador transferido a meio da época: minutos e títulos repartidos pelas duas passagens', () => {
    const st = w.jogadores!, jp = w.janelaPremios!;
    const [a, b] = w.ligaPorId('POR1').clubes;
    const j = 0; // um jogador qualquer, com a janela limpa à mão
    st.wClube[j * 2] = -1; st.wClube[j * 2 + 1] = -1; st.wMinCat.fill(0, j * 2 * N_CAT, (j * 2 + 2) * N_CAT);
    const ka = passagem(w, j, a); st.wMinCat[(j * 2 + ka) * N_CAT + IDX_CAT.liga] += 900;
    const kb = passagem(w, j, b); st.wMinCat[(j * 2 + kb) * N_CAT + IDX_CAT.liga] += 450;
    expect([ka, kb]).toEqual([0, 1]);
    expect(passagem(w, j, a)).toBe(0); // voltar ao 1.º clube conta na 1.ª passagem
    const ja = jp.jogos.get(`${IDX_CAT.liga}|${a}`)!, jb = jp.jogos.get(`${IDX_CAT.liga}|${b}`)!;
    expect(jp.participacao(j, IDX_CAT.liga, a)).toBeCloseTo(Math.min(1, 900 / (90 * ja)), 6);
    expect(jp.participacao(j, IDX_CAT.liga, b)).toBeCloseTo(Math.min(1, 450 / (90 * jb)), 6);
    expect(jp.participacao(j, IDX_CAT.taca, a)).toBe(0);
  });

  it('guarda de integridade: com a janela por abrir não há prémios (e diz porquê)', () => {
    const jp = w.janelaPremios!, ini = jp.inicio;
    jp.inicio = -1;
    expect(calcularPremios(w, [], 2027)).toBeNull();
    expect(atribuirPremios(w, [], 2027)).toContain('janela de avaliação incompleta');
    jp.inicio = ini;
  });

  it('liga de ano civil: os jogos de Janeiro e Fevereiro contam na janela aberta a 1 de Agosto', () => {
    for (let k = 0; k < 15; k++) sim.simularSemana(); // até meados de Fevereiro de 2027
    const st = w.jogadores!;
    let n = 0;
    for (const c of w.ligaPorId('BRA1').clubes) for (const j of w.plantel[c]) {
      if (st.clube[j] !== c || st.eJogos[j] === 0 || st.wClube[j * 2 + 1] !== -1) continue;
      expect(st.wJogos[j]).toBe(st.eJogos[j]);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  }, 240000);

  it('histórico das últimas 3 épocas: clube, jogos, minutos, golos, assistências e nota; a mais antiga sai', () => {
    const st = w.jogadores!, j = 1;
    for (const [ep, jogos, golos] of [[2026, 30, 5], [2027, 25, 7], [2028, 20, 9], [2029, 10, 1]]) {
      st.eJogos[j] = jogos; st.eMinutos[j] = jogos * 80; st.eGolos[j] = golos; st.eAssist[j] = 2; st.eNotas[j] = jogos * 70;
      st.zerarEstatisticas([j], ep);
    }
    expect(Array.from(st.hEpoca.subarray(j * 3, j * 3 + 3))).toEqual([2029, 2028, 2027]);
    expect(Array.from(st.hJogos.subarray(j * 3, j * 3 + 3))).toEqual([10, 20, 25]);
    expect(Array.from(st.hGolos.subarray(j * 3, j * 3 + 3))).toEqual([1, 9, 7]);
    expect(st.hNota[j * 3]).toBe(70);
    expect(st.hClube[j * 3]).toBe(st.clube[j]);
    expect(st.eJogos[j]).toBe(0);
  });
});
