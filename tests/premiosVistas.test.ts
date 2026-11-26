// Prompt 8, Bloco D: dados dos prémios para a interface (votação com a decomposição e os votos, ordem da cerimónia, selos
// na ficha do jogador); histórico real e do jogo separados; o clube do utilizador tratado como os outros.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { calcularPremios, titulosDaJanela } from '../src/premios/premios.ts';
import { vistaVotacao, selosJogador } from '../src/jogo/vistasPremios.ts';
import { vistaJogador } from '../src/jogo/vistas.ts';
import { ControladorUtilizador } from '../src/club/controladorUtilizador.ts';
import { FINALISTAS, CERIMONIA } from '../src/config/premios.ts';
import type { World } from '../src/engine/world.ts';

describe('prémios: dados para a interface e histórico (Prompt 8, Bloco D)', () => {
  let w: World, sim: Simulador, reaisAntes: string;
  beforeAll(async () => {
    w = await mundo();
    reaisAntes = JSON.stringify(w.historico!.premiosReais);
    sim = new Simulador(w, true);
    while (new Date(sim.segunda * 864e5).toISOString().slice(0, 10) < '2027-07-19') sim.simularSemana();
  }, 300000);

  it('o clube do utilizador é tratado como os outros: a mesma pontuação e os mesmos votos', () => {
    const regs = sim.historico.filter((r) => r.epoca === 2026);
    const a = calcularPremios(w, titulosDaJanela(regs), 2027)!;
    const c = a.melhor_do_mundo.candidatos[0].clubeIdx;
    w.economia!.controladores[c] = new ControladorUtilizador();
    const b = calcularPremios(w, titulosDaJanela(regs), 2027)!;
    delete w.economia!.controladores[c];
    for (const k of ['melhor_do_mundo', 'golden_boy', 'guarda_redes'] as const) expect(b[k].candidatos.map((x) => [x.idx, x.pontos, x.comp.total])).toEqual(a[k].candidatos.map((x) => [x.idx, x.pontos, x.comp.total]));
  });

  it('votação para a interface: finalistas com a decomposição e os votos; ordem da cerimónia', () => {
    while (!w.historico!.premiosJogo.length) sim.simularSemana();
    const v = vistaVotacao(w, 'melhor_do_mundo', 2027)!;
    expect(v.fonte).toBe('jogo');
    expect(v.finalistas).toHaveLength(FINALISTAS.melhor_do_mundo);
    expect(v.finalistas[0].lugar).toBe(1);
    expect(v.finalistas[0].comp!.total).toBeGreaterThan(0);
    expect(v.votacao!.boletins).toBeGreaterThan(0);
    expect(v.votacao!.porPais.reduce((s, x) => s + x.pontos, 0)).toBe(v.finalistas[0].pontos);
    // Do 30.º ao 1.º; o top 3 com suspense.
    expect(v.cerimonia.map((x) => x.lugar)).toEqual(v.finalistas.map((f) => f.lugar).reverse());
    expect(v.cerimonia.at(-1)!.espera_ms).toBe(CERIMONIA.suspense_ms);
    expect(v.cerimonia[0].espera_ms).toBe(CERIMONIA.intervalo_ms);
    expect(vistaVotacao(w, 'melhor_do_mundo', 2026)).toBeNull(); // ano real: não é do jogo
  });

  it('selos na ficha do jogador: o vencedor tem o selo e o prestígio; os outros não têm nada', () => {
    const j = w.historico!.premiosJogo.find((p) => p.premio === 'melhor_do_mundo')!.idx!;
    const s = selosJogador(w, j, sim.segunda);
    expect(s.selos[0]).toMatchObject({ premio: 'melhor_do_mundo', ano: 2027, lugar: 'vencedor' });
    expect(s.prestigio).toBeGreaterThan(90);
    expect(s.conhecidoDeTodos).toBe(true);
    expect(vistaJogador(w, j, sim.segunda, -1).premios!.contagem.melhor_do_mundo.vencedor).toBe(1);
    const semNada = w.plantel[w.ligaPorId('POR1').clubes.at(-1)!].find((x) => !w.prestigio!.selos.has(x))!;
    expect(vistaJogador(w, semNada, sim.segunda, -1).premios).toBeNull();
  });

  it('histórico: reais (premiosReais) e do jogo (premiosJogo) nunca se misturam', () => {
    const h = w.historico!;
    expect(JSON.stringify(h.premiosReais)).toBe(reaisAntes);
    expect(h.premiosReais.every((p) => p.fonte === 'real' && p.idx === null)).toBe(true);
    expect(h.premiosJogo.length).toBeGreaterThan(0);
    expect(h.premiosJogo.every((p) => p.fonte === 'jogo' && p.idx !== null)).toBe(true);
  });
});
