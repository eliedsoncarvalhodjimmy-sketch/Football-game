// Prompt 8, Bloco B: pontuação por componentes e júri simulado, numa janela completa do mundo de teste.
//  - dois jogadores com o mesmo rendimento, um na liga forte e outro na fraca: o forte pontua mais;
//  - um guarda-redes de equipa forte e outro de equipa fraca com a mesma qualidade (golos evitados): pontuação próxima;
//  - o mesmo candidato com o viés de posição ligado e desligado; o júri é determinístico e soma os pontos certos.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { calcularPremios, titulosDaJanela, type Componentes } from '../src/premios/premios.ts';
import { DESEMPENHO, VIES_POSICAO, JURI, VISIBILIDADE_LIGA as VL } from '../src/config/premios.ts';
import type { World } from '../src/engine/world.ts';

describe('pontuação dos prémios (Prompt 8, Bloco B)', () => {
  let w: World, regs: ReturnType<Simulador['historico']['filter']>;
  beforeAll(async () => {
    w = await mundo();
    const sim = new Simulador(w, true);
    // Até à semana de 19 de Julho de 2027: janela completa, prémios ainda por calcular.
    while (new Date(sim.segunda * 864e5).toISOString().slice(0, 10) < '2027-07-19') sim.simularSemana();
    regs = sim.historico.filter((r) => r.epoca === 2026);
  }, 300000);

  const copiar = (de: number, para: number) => {
    const st = w.jogadores!;
    for (const k of ['wJogos', 'wTitular', 'wMinutos', 'wGolos', 'wAssist', 'wAmarelos', 'wVermelhos', 'wNotas', 'wRepAdv', 'wGrandes', 'wNotasGrandes', 'wRematesSofridos', 'wDefesas', 'wXgSofrido', 'wSemSofrer', 'wPenaltisDefendidos', 'wErros'] as const) (st[k] as Uint16Array)[para] = (st[k] as Uint16Array)[de];
  };
  const comp = (j: number, premio: 'melhor_do_mundo' | 'guarda_redes', vies?: boolean) => {
    const todos = new Map<string, Componentes>();
    calcularPremios(w, titulosDaJanela(regs), 2027, { viesPosicao: vies, todos });
    return todos.get(`${premio}|${j}`);
  };

  it('o mesmo rendimento vale mais na liga forte (ENG1) do que na fraca (EUR1)', () => {
    const st = w.jogadores!;
    const avancado = (id: string) => w.ligaPorId(id).clubes.flatMap((c) => w.plantel[c].filter((j) => st.clube[j] === c && st.posNat[j] === 11 && st.wMinutos[j] >= 2500 && st.wClube[j * 2 + 1] === -1)).sort((a, b) => st.wGolos[b] - st.wGolos[a])[0];
    const a = avancado('ENG1'), b = avancado('EUR1');
    copiar(a, b);
    const ca = comp(a, 'melhor_do_mundo'), cb = comp(b, 'melhor_do_mundo');
    expect(ca && cb).toBeTruthy();
    const dif = ca!.desempenho - cb!.desempenho;
    const fd = (id: string) => w.ligaPorId(id).regras.forca_desportiva;
    expect(dif).toBeGreaterThan(0);
    // Fora das Big 5, o total ainda leva o factor da liga (mais o bónus continental, até ao tecto).
    expect(ca!.visibilidade).toBe(1);
    expect(cb!.visibilidade).toBeGreaterThanOrEqual(VL.fora_big5.melhor_do_mundo);
    expect(cb!.visibilidade).toBeLessThanOrEqual(VL.fora_big5.melhor_do_mundo + VL.continental.tecto + 1e-9);
    // Na faixa do config: a diferença vem sobretudo do termo da liga (mais o contexto de cada liga e dos adversários).
    expect(dif).toBeLessThan(2 * DESEMPENHO.escala * DESEMPENHO.liga_por_20 * (fd('ENG1') - fd('EUR1')) / 20 + 20);
  });

  it('guarda-redes: com os mesmos golos evitados, o de equipa fraca não fica para trás por sofrer mais golos', () => {
    const st = w.jogadores!;
    const gr = (id: string, forte: boolean) => { const cs = [...w.ligaPorId(id).clubes].sort((x, y) => (forte ? w.reputacao[y] - w.reputacao[x] : w.reputacao[x] - w.reputacao[y])); for (const c of cs) { const g = w.plantel[c].filter((j) => st.clube[j] === c && st.posNat[j] === 0).sort((x, y) => st.wMinutos[y] - st.wMinutos[x])[0]; if (g !== undefined && st.wMinutos[g] >= 2500) return g; } return -1; };
    const a = gr('ESP1', true), b = gr('ESP1', false);
    // Mesma qualidade: 5 golos evitados; o da equipa fraca enfrenta o dobro do xG.
    for (const [j, xg] of [[a, 30], [b, 60]] as const) {
      st.wXgSofrido[j] = xg * 10; st.wRematesSofridos[j] = Math.round(xg * 3.2); st.wDefesas[j] = st.wRematesSofridos[j] - (xg - 5);
      st.wSemSofrer[j] = Math.round(38 * Math.exp(-xg / 38)) + 2; st.wPenaltisDefendidos[j] = 0; st.wErros[j] = 0; st.wJogos[j] = 38; st.wMinutos[j] = 3420;
      st.wNotas[j] = 38 * 68; st.wGrandes[j] = 0; st.wNotasGrandes[j] = 0;
    }
    const ca = comp(a, 'guarda_redes'), cb = comp(b, 'guarda_redes');
    expect(ca && cb).toBeTruthy();
    // Sofre 25 golos a mais, mas a pontuação fica perto (as defesas a mais até lhe dão uma pequena vantagem).
    expect(cb!.desempenho).toBeGreaterThan(ca!.desempenho - 5);
  });

  it('viés de posição: o desempenho de um GR na Bola de Ouro × factor (ligado) ou × 1 (desligado)', () => {
    const st = w.jogadores!;
    const g = w.ligaPorId('ENG1').clubes.flatMap((c) => w.plantel[c].filter((j) => st.clube[j] === c && st.posNat[j] === 0 && st.wMinutos[j] >= 2500))[0];
    const ligado = comp(g, 'melhor_do_mundo', true), desligado = comp(g, 'melhor_do_mundo', false);
    expect(ligado && desligado).toBeTruthy();
    expect(ligado!.desempenho).toBeCloseTo(desligado!.desempenho * VIES_POSICAO.factor.GR, 0);
  });

  it('júri determinístico: os mesmos votos; cada boletim distribui os pontos por posição', () => {
    const r1 = calcularPremios(w, titulosDaJanela(regs), 2027)!, r2 = calcularPremios(w, titulosDaJanela(regs), 2027)!;
    expect(r1.melhor_do_mundo.candidatos.map((c) => [c.idx, c.pontos])).toEqual(r2.melhor_do_mundo.candidatos.map((c) => [c.idx, c.pontos]));
    const v = r1.melhor_do_mundo.votacao;
    expect(v.boletins).toBe(JURI.jurados);
    // Os pontos de todos os candidatos (não só os finalistas) somam boletins × soma da escala; os finalistas, no máximo isso.
    const soma = r1.melhor_do_mundo.candidatos.reduce((a, c) => a + c.pontos, 0);
    expect(soma).toBeLessThanOrEqual(JURI.jurados * JURI.pontos.reduce((a, b) => a + b, 0));
    expect(Object.values(v.porPais).reduce((a, b) => a + b, 0)).toBe(r1.melhor_do_mundo.candidatos[0].pontos);
    expect(r1.melhor_do_mundo.candidatos[0].comp.total).toBeGreaterThan(0);
  });

  it('Big 5: ninguém de fora das 5 grandes ligas no top 20 da Bola de Ouro', () => {
    const r = calcularPremios(w, titulosDaJanela(regs), 2027)!;
    expect(r.melhor_do_mundo.candidatos.slice(0, 20).filter((c) => c.comp.visibilidade < 1)).toEqual([]);
  });
});
