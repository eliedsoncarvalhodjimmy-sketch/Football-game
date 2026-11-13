// Fase 2, Bloco C: treinadores (geração, efeitos) e interferência do utilizador.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { diaInicioMundo } from '../src/engine/world.ts';
import { PERFIS, ATRIBUTOS_TREINADOR } from '../src/config/treinadores.ts';
import { novaRelacao, probabilidades, sugerir, recuperarSemana, nivelConflito } from '../src/coaches/interferencia.ts';
import { escolherOnze } from '../src/match/onze.ts';
import { prepararLado, registarLado } from '../src/match/rapido.ts';
import { jogoDetalhado } from '../src/match/detalhado.ts';
import { Rng } from '../src/core/rng.ts';
import type { Treinador } from '../src/coaches/store.ts';

let w: World;
const dia = diaInicioMundo() + 40;
beforeAll(async () => { w = await mundo(); }, 60000);

const comAtributos = (t: Treinador, a: Partial<Treinador['atributos']>): Treinador => ({ ...t, atributos: { ...t.atributos, ...a } });

describe('treinadores gerados', () => {
  it('um por clube, 7 atributos 1–20, os 6 perfis presentes, determinísticos', async () => {
    const ts = w.motor!.treinadores;
    expect(ts.length).toBe(w.clubes.length);
    for (const t of ts) for (const a of ATRIBUTOS_TREINADOR) { expect(t.atributos[a]).toBeGreaterThanOrEqual(1); expect(t.atributos[a]).toBeLessThanOrEqual(20); }
    const perfis = new Set(ts.map((t) => t.perfil));
    for (const p of PERFIS) expect(perfis.has(p.id)).toBe(true);
    const w2 = await mundo();
    expect(w2.motor!.treinadores.map((t) => t.nome + t.perfil + t.atributos.tactica)).toEqual(ts.map((t) => t.nome + t.perfil + t.atributos.tactica));
  }, 60000);

  it('perfil e qualidade coerentes com a reputação do clube', () => {
    const ts = w.motor!.treinadores;
    const rep = (ids: string[]) => { const x = ts.filter((t) => ids.includes(t.perfil)); return x.reduce((s, t) => s + w.reputacao[t.clube], 0) / x.length; };
    expect(rep(['ofensivo', 'pressao_alta'])).toBeGreaterThan(rep(['pragmatico', 'contra_ataque']));
    const grandes = ts.filter((t) => w.reputacao[t.clube] >= 80), pequenos = ts.filter((t) => w.reputacao[t.clube] <= 40);
    const tac = (x: Treinador[]) => x.reduce((s, t) => s + t.atributos.tactica, 0) / x.length;
    expect(tac(grandes)).toBeGreaterThan(tac(pequenos) + 2);
  });

  it('disciplina baixa dá mais cartões (modo detalhado)', () => {
    const l = w.ligaPorId('ESP1').clubes;
    const [c, f] = [l[2], l[3]];
    const t = w.motor!.treinadores[c];
    const orig = t.atributos.disciplina;
    const cartoes = (d: number) => {
      t.atributos.disciplina = d;
      let n = 0;
      for (let k = 0; k < 400; k++) {
        const rng = Rng.de(3, 'disc', k);
        const a = prepararLado(w, f, dia, rng), b = prepararLado(w, c, dia, rng);
        n += jogoDetalhado(w, a, b, false, rng, { eventos: false }).estat[1].amarelos;
      }
      return n / 400;
    };
    const alta = cartoes(20), baixa = cartoes(1);
    t.atributos.disciplina = orig;
    expect(baixa).toBeGreaterThan(alta * 1.2);
  });

  it('gestão de grupo alta segura a moral depois das derrotas', () => {
    const c = w.ligaPorId('ITA1').clubes[5];
    const t = w.motor!.treinadores[c];
    const st = w.jogadores!;
    const orig = t.atributos.gestao;
    const moralDepois = (g: number) => {
      t.atributos.gestao = g;
      const lado = prepararLado(w, c, dia, Rng.de(1));
      for (const j of lado.escolha.onze.jogadores) st.moral[j] = 13;
      for (let k = 0; k < 6; k++) registarLado(w, lado, 0, 2, 0.8, 90, dia + k * 7, Rng.de(2, k), false);
      return lado.escolha.onze.jogadores.reduce((s, j) => s + st.moral[j], 0) / 11;
    };
    const fraca = moralDepois(2), forte = moralDepois(19);
    t.atributos.gestao = orig;
    expect(forte).toBeGreaterThan(fraca + 0.5);
  });
});

describe('interferência do utilizador (3.3)', () => {
  const clube = () => w.ligaPorId('ENG1').clubes[4];
  it('aceita mais com capital alto, treinador adaptável e pouca autoridade; ignora mais no caso contrário', () => {
    const t = w.motor!.treinadores[clube()];
    const aberto = comAtributos(t, { autoridade: 4, adaptabilidade: 18 });
    const fechado = comAtributos(t, { autoridade: 19, adaptabilidade: 3 });
    const pa = probabilidades(aberto, { ...novaRelacao(aberto), capital: 90 }, 2);
    const pf = probabilidades(fechado, { ...novaRelacao(fechado), capital: 20 }, 2);
    expect(pa.aceita).toBeGreaterThan(0.7);
    expect(pf.ignora).toBeGreaterThan(0.6);
    for (const p of [pa, pf]) { expect(p.parcial).toBeGreaterThanOrEqual(0); expect(p.aceita + p.parcial + p.ignora).toBeCloseTo(1, 9); }
    // Pedidos maiores são mais difíceis de aceitar.
    expect(probabilidades(t, novaRelacao(t), 6).aceita).toBeLessThan(probabilidades(t, novaRelacao(t), 1).aceita);
  });

  it('aceita: aplica a formação e o onze sugeridos, gasta capital e autoridade', () => {
    const c = clube();
    const st = w.jogadores!;
    const t = comAtributos(w.motor!.treinadores[c], { autoridade: 2, adaptabilidade: 20 });
    const dele = escolherOnze(st, w.plantel[c], t, dia, Rng.de(1));
    const outra = dele.plano.formacao.id === '4-4-2' ? '4-3-3' : '4-4-2';
    const suplente = dele.banco.find((j) => st.posNat[j] !== 0)!;
    const onze = dele.onze.jogadores.map((j, s) => (s === 10 ? suplente : j));
    const r = { ...novaRelacao(t), capital: 100 };
    let res;
    for (let k = 0; ; k++) { res = sugerir(st, w.plantel[c], t, { ...r, historico: [] }, { formacao: outra, onze, instrucoes: { pressao: 1 } }, dia, Rng.de(5, k)); if (res.decisao === 'aceita') break; }
    expect(res.escolha.onze.formacao.id).toBe(outra);
    expect(res.escolha.onze.jogadores).toContain(suplente);
    expect(res.escolha.onze.instrucoes.pressao).toBe(1);
    expect(res.aplicadas).toBe(res.pedidas);
    const r2 = { ...r, historico: [] };
    for (let k = 0; ; k++) { const x = sugerir(st, w.plantel[c], t, r2, { formacao: outra }, dia, Rng.de(6, k)); if (x.decisao === 'aceita') break; Object.assign(r2, { ...r, historico: [] }); }
    expect(r2.capital).toBeLessThan(100);
    expect(r2.autoridade).toBeLessThan(t.atributos.autoridade * 5);
  });

  it('ignora: joga o onze dele; parcial: aplica só parte do pedido', () => {
    const c = clube();
    const st = w.jogadores!;
    const t = comAtributos(w.motor!.treinadores[c], { autoridade: 12, adaptabilidade: 10 });
    const dele = escolherOnze(st, w.plantel[c], t, dia, Rng.de(1));
    const outra = dele.plano.formacao.id === '4-4-2' ? '4-3-3' : '4-4-2';
    const vistos = new Set<string>();
    for (let k = 0; k < 200 && vistos.size < 3; k++) {
      const res = sugerir(st, w.plantel[c], t, novaRelacao(t), { formacao: outra, instrucoes: { mentalidade: 2, ritmo: 1 } }, dia, Rng.de(7, k));
      vistos.add(res.decisao);
      if (res.decisao === 'ignora') { expect(res.escolha.onze.formacao.id).toBe(dele.plano.formacao.id); expect(res.aplicadas).toBe(0); }
      if (res.decisao === 'parcial') { expect(res.aplicadas).toBeGreaterThan(0); expect(res.aplicadas).toBeLessThan(res.pedidas); }
    }
    expect(vistos.size).toBe(3);
  });

  it('abuso faz crescer o conflito (mais depressa com pouca gestão); recupera com as semanas', () => {
    const c = clube();
    const st = w.jogadores!;
    const conflitoApos = (gestao: number) => {
      const t = comAtributos(w.motor!.treinadores[c], { gestao, autoridade: 15, adaptabilidade: 6 });
      const r = novaRelacao(t);
      for (let k = 0; k < 8; k++) sugerir(st, w.plantel[c], t, r, { formacao: '5-3-2', instrucoes: { mentalidade: -2, linha: -1 } }, dia, Rng.de(8, k));
      return { r, t };
    };
    const fraca = conflitoApos(3), forte = conflitoApos(18);
    expect(fraca.r.conflito).toBeGreaterThan(forte.r.conflito);
    expect(nivelConflito(fraca.r)).not.toBe('baixo');
    const antes = fraca.r.conflito;
    for (let k = 0; k < 10; k++) recuperarSemana(fraca.t, fraca.r);
    expect(fraca.r.conflito).toBeLessThan(antes);
    expect(fraca.r.recentes).toBeLessThan(1);
  });

  it('integração: a sugestão pendente é usada no jogo do clube do utilizador e consumida', () => {
    const c = clube();
    const m = w.motor!;
    m.definirClubeUtilizador(c);
    m.sugestao = { instrucoes: { largura: 1 } };
    const lado = prepararLado(w, c, dia, Rng.de(9));
    expect(m.sugestao).toBeNull();
    expect(m.ultimaDecisao).not.toBeNull();
    if (m.ultimaDecisao!.decisao !== 'ignora') expect(lado.escolha.onze.instrucoes.largura).toBe(1);
    m.clubeUtilizador = -1; m.relacao = null;
  });
});

describe('gravação dos jogadores', () => {
  it('exportar → importar devolve o mesmo estado (atributos, clube, estatísticas, OVR recalculado)', async () => {
    const { PlayerStore } = await import('../src/players/store.ts');
    const st = w.jogadores!;
    const b = PlayerStore.importar(st.exportar());
    expect(b.n).toBe(st.n);
    for (const i of [0, 1, 500, st.n - 1]) {
      expect(b.ids[i]).toBe(st.ids[i]);
      expect(b.nomes[i]).toBe(st.nomes[i]);
      expect(b.clube[i]).toBe(st.clube[i]);
      expect(b.ovrNat(i)).toBe(st.ovrNat(i));
      expect(Array.from(b.atr.subarray(i * 39, i * 39 + 39))).toEqual(Array.from(st.atr.subarray(i * 39, i * 39 + 39)));
      expect(b.idx(st.ids[i])).toBe(i);
    }
  });
});
