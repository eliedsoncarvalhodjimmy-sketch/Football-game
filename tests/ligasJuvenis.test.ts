// Plano juvenil, bloco 2: ligas Sub-18 e Sub-21 (1.ª + 2.ª divisão juntas, uma volta, playoff dos 8 primeiros; amigáveis
// na 3.ª e 4.ª divisão) e minutos reais na evolução dos juniores.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { roundRobin } from '../src/academia/ligasJuvenis.ts';

let w: World;
let sim: Simulador;
beforeAll(async () => { w = await mundo(); sim = new Simulador(w); }, 60000);

describe('calendário', () => {
  it('todos contra todos a uma volta: cada par uma vez, cada clube uma vez por jornada', () => {
    for (const n of [18, 19, 36, 44]) {
      const cs = Array.from({ length: n }, (_, i) => i);
      const R = roundRobin(cs);
      expect(R.length).toBe(n % 2 ? n : n - 1);
      const pares = new Set<string>();
      for (const j of R) { const v = new Set<number>(); for (const [a, b] of j) { expect(v.has(a) || v.has(b)).toBe(false); v.add(a); v.add(b); pares.add([a, b].sort((x, y) => x - y).join('-')); } }
      expect(pares.size).toBe((n * (n - 1)) / 2);
    }
  });
});

describe('uma época de ligas juvenis', () => {
  it('ligas por país com a 1.ª e a 2.ª divisão juntas; 3.ª e 4.ª em amigáveis; playoff e campeão', () => {
    const L = w.academia!.ligas;
    const st = w.jogadores!;
    // Algumas semanas: as ligas abrem em Agosto.
    for (let k = 0; k < 6; k++) sim.simularSemana();
    const por = L.ligas.find((x) => x.pais === 'POR' && x.esc === 'sub18')!;
    expect(por.clubes.length).toBe(w.ligaPorId('POR1').clubes.length + w.ligaPorId('POR2').clubes.length);
    expect(por.jornadas.length).toBe(por.clubes.length - 1);
    expect(L.ligas.find((x) => x.pais === 'ENG' && x.esc === 'sub21')!.clubes.length).toBe(w.ligaPorId('ENG1').clubes.length + w.ligaPorId('ENG2').clubes.length);
    const eng3 = w.ligaPorId('ENG3').clubes[0];
    expect(L.ligaDe(eng3, 'sub18')).toBeNull();
    expect(L.amigaveis.some((g) => g.pais === 'ENG' && g.clubes.includes(eng3))).toBe(true);
    // Minutos reais (liga e amigáveis) para a evolução: há juniores com minutos e titulares acima dos que não jogam.
    const minutos = (c: number) => w.academia!.sub18[c].map((j) => L.minMes[j]);
    expect(minutos(eng3).some((m) => m > 0)).toBe(true);
    const c = por.clubes[0];
    const js = [...w.academia!.sub18[c]].sort((a, b) => L.minMes[b] - L.minMes[a]);
    expect(L.parteMinutos(js[0])).toBeGreaterThan(L.parteMinutos(js[js.length - 1]));
    // Fim da época (a época juvenil acaba em Maio, antes da passagem de época sénior).
    sim.simularEpoca();
    expect(por.jornadaActual).toBe(por.jornadas.length);
    for (const r of por.tabela.values()) expect(r.j).toBe(por.clubes.length - 1);
    expect(por.playoff.quartos.length).toBe(4);
    expect(por.playoff.meias.length).toBe(2);
    expect(por.playoff.campeao).toBeGreaterThanOrEqual(0);
    const t8 = L.classificacao(por).slice(0, 8).map((x) => x.clube);
    expect(t8).toContain(por.playoff.campeao);
    // Golos por jogo na fase regular dentro do razoável.
    let g = 0, n = 0;
    for (const x of L.ligas) for (const y of x.jogos) if (y.fase === 'regular') { g += y.gc + y.gf; n++; }
    expect(g / n).toBeGreaterThan(2.1);
    expect(g / n).toBeLessThan(3.2);
    void st;
  }, 240000);

  it('estatísticas dos jogadores batem com a tabela; o histórico guarda o campeão da época anterior', () => {
    const L = w.academia!.ligas;
    // A nova época juvenil abre em Agosto (fecha a anterior e guarda o campeão).
    for (let k = 0; k < 4 && L.historico.length === 0; k++) sim.simularSemana();
    while (L.historico.length === 0) sim.simularSemana();
    expect(L.historico.some((h) => h.pais === 'POR' && h.esc === 'sub18')).toBe(true);
    // Algumas jornadas: golos marcados pelos jogadores do clube = golos na tabela (só fase regular nesta altura).
    for (let k = 0; k < 5; k++) sim.simularSemana();
    const liga = L.ligas.find((x) => x.pais === 'ESP' && x.esc === 'sub21')!;
    for (const c of liga.clubes.slice(0, 6)) {
      const golos = L.estatisticas(c, 'sub21').reduce((a, x) => a + x.golos, 0);
      // Jogadores que saíram do escalão entretanto levam os seus golos: no máximo igual.
      expect(golos).toBeLessThanOrEqual(liga.tabela.get(c)!.gm);
      expect(golos).toBeGreaterThanOrEqual(liga.tabela.get(c)!.gm - 3);
    }
  }, 240000);
});
