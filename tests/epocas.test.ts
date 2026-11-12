// Testes obrigatórios da secção 11, sobre 10 épocas completas do mundo fictício.
import { describe, expect, it } from 'vitest';
import { mundo } from './helpers.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { verificarIntegridade, verificarVagas, verificarCalendarioEpoca, impressaoDigital } from '../src/engine/verificacoes.ts';
import { atribuirVagas } from '../src/engine/season/qualify.ts';
import { serializarHistorico, desserializarHistorico } from '../src/storage/serializar.ts';
import { metricasRealismo, type DadosRelatorio } from '../src/cli/relatorioEpocas.ts';

describe('10 épocas do mundo fictício', async () => {
  const w = await mundo(2026);
  const sim = new Simulador(w);
  const integridade: string[] = [];
  const vagas: string[] = [...verificarVagas(w)];
  const calendario: string[] = [];
  const favoritos: DadosRelatorio['favoritos'] = [];
  const tamanhos = new Map<string, number>(w.ligas.map((l) => [l.regras.id, l.clubes.length]));
  let tamanhosOk = true;
  for (let e = 0; e < 10; e++) {
    const t = sim.temporada;
    for (const [id, c] of t.ligas) {
      const fav = [...c.clubes].sort((x, y) => w.reputacao[y] - w.reputacao[x]);
      favoritos.push({ epoca: w.epoca, liga: id, top1: fav[0], top3: fav.slice(0, 3) });
    }
    sim.simularEpoca();
    calendario.push(...verificarCalendarioEpoca(t).map((p) => p.msg));
    integridade.push(...verificarIntegridade(w));
    vagas.push(...verificarVagas(w));
    for (const l of w.ligas) if (l.clubes.length !== tamanhos.get(l.regras.id)) tamanhosOk = false;
  }
  const H = sim.historico;

  it('integridade: cada clube numa só divisão; nº de clubes por divisão constante', () => {
    expect(integridade).toEqual([]);
    expect(tamanhosOk).toBe(true);
  });

  it('vagas continentais preenchidas, sem duplicados e só de países com direito', () => {
    expect(vagas).toEqual([]);
  });

  it('calendários sem conflitos (todas as competições)', () => {
    expect(calendario).toEqual([]);
  });

  it('calibração em 10 épocas de jogos de liga', () => {
    const e = H.reduce((s, r) => ({ j: s.j + r.estatLiga.jogos, g: s.g + r.estatLiga.golos, c: s.c + r.estatLiga.casa, d: s.d + r.estatLiga.empates, z: s.z + r.estatLiga.zero, c5: s.c5 + r.estatLiga.cincoMais, c7: s.c7 + r.estatLiga.seteMais }), { j: 0, g: 0, c: 0, d: 0, z: 0, c5: 0, c7: 0 });
    expect(e.g / e.j).toBeGreaterThan(2.5);
    expect(e.g / e.j).toBeLessThan(2.7);
    expect(e.c / e.j).toBeGreaterThan(0.43);
    expect(e.c / e.j).toBeLessThan(0.47);
    expect(e.d / e.j).toBeGreaterThan(0.24);
    expect(e.d / e.j).toBeLessThan(0.28);
    expect(e.z / e.j).toBeGreaterThan(0.065);
    expect(e.z / e.j).toBeLessThan(0.085);
    expect(e.c5 / e.j).toBeGreaterThan(0.095);
    expect(e.c5 / e.j).toBeLessThan(0.125);
    expect(e.c7 / e.j).toBeLessThan(0.015);
  });

  it('realismo estrutural: pontos, campeões diferentes, favoritos, mobilidade', () => {
    const m = metricasRealismo(w, H, favoritos);
    const dentro = (xs: number[], a: number, b: number) => xs.filter((x) => x >= a && x <= b).length / xs.length;
    expect(dentro(m.ppgCamp, 1.9, 2.85)).toBeGreaterThanOrEqual(0.9);
    expect(dentro(m.ppgUlt, 0.25, 1.15)).toBeGreaterThanOrEqual(0.9);
    const media = m.distintos.reduce((a, b) => a + b, 0) / m.distintos.length;
    expect(media).toBeGreaterThanOrEqual(2.5);
    expect(media).toBeLessThanOrEqual(7);
    expect(m.distintos.filter((x) => x === 1).length).toBeLessThanOrEqual(m.distintos.length * 0.1);
    expect(m.distintos.filter((x) => x === 10).length).toBeLessThanOrEqual(m.distintos.length * 0.15);
    expect(m.fav1 / m.nFav).toBeGreaterThan(0.2);
    expect(m.fav1 / m.nFav).toBeLessThan(0.7);
    expect(m.fav3 / m.nFav).toBeGreaterThan(0.5);
    expect(m.subidas).toBe(m.descidas);
    expect(m.saidas).toBe(m.entradas);
    expect(m.ioio).toBeGreaterThan(0);
    expect(m.duplaSubida).toBeGreaterThan(0);
  });

  it('determinismo: a mesma semente dá exactamente os mesmos resultados', async () => {
    const w2 = await mundo(2026);
    const s2 = new Simulador(w2);
    for (let e = 0; e < 3; e++) s2.simularEpoca();
    expect(impressaoDigital(s2.historico)).toBe(impressaoDigital(H.slice(0, 3)));
    const w3 = await mundo(2027);
    const s3 = new Simulador(w3);
    s3.simularEpoca();
    expect(impressaoDigital(s3.historico)).not.toBe(impressaoDigital(H.slice(0, 1)));
  });

  it('a vaga da taça desce ao classificado seguinte quando o vencedor já tem vaga', () => {
    const ordemEng = [...w.ligaPorId('eng_1').clubes];
    const entradas = new Map(w.pacotes.filter((p) => p.manifest.pais).map((p) => {
      const ordem = [...w.ligas[p.ligas[0]].clubes];
      return [p.manifest.pais!, { pais: p.manifest.pais!, ordem, vencedorTaca: p.manifest.pais === 'ENG' ? ordem[0] : null }];
    }));
    const v = atribuirVagas(w, entradas);
    const eng = [...v.values()].flat().filter((q) => q.pais === 'ENG').map((q) => q.clube);
    expect([...eng].sort((a, b) => a - b)).toEqual(ordemEng.slice(0, 7).sort((a, b) => a - b)); // o campeão também venceu a taça: a vaga desce até ao 7.º
    expect(v.get('uefa_el')!.find((q) => q.pais === 'ENG')!.via).toContain('vaga da taça');
  });

  it('a gravação de uma época faz ida e volta', () => {
    const r = H[H.length - 1];
    const [d] = desserializarHistorico(serializarHistorico([r]));
    expect(d.campeoes).toEqual(r.campeoes);
    expect(Array.from(d.jogos!.dados)).toEqual(Array.from(r.jogos!.dados));
  });
});
