// Prompt 4, Bloco C: academia e juniores.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { ESC } from '../src/academia/academia.ts';
import { ESCALOES, PROSPECTOS, COMPENSACAO } from '../src/config/academia.ts';
import { ControladorIA } from '../src/club/controlador.ts';
import { ovrAlvoClube } from '../src/players/gerador.ts';

let w: World;
const dia = Math.floor(Date.UTC(2026, 7, 1) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('estrutura', () => {
  it('dois escalões (sub-18, sub-21) e a shortlist de prospectos, fora da equipa principal; ~40 000 registos individuais', () => {
    const ac = w.academia!, st = w.jogadores!;
    const k = ac.contagens();
    expect(k.individuais).toBeGreaterThan(30000);
    expect(k.individuais).toBeLessThan(45000);
    expect(k.agregado).toBeGreaterThan(0);
    for (const c of w.ligaPorId('ENG1').clubes) {
      expect(ac.sub18[c].length).toBeLessThanOrEqual(ESCALOES.sub18.maximo);
      expect(ac.sub21[c].length).toBeLessThanOrEqual(ESCALOES.sub21.maximo);
      expect(ac.prospectos[c].length).toBeLessThanOrEqual(PROSPECTOS.shortlist_maximo);
      for (const j of ac.jovens(c)) { expect(st.clube[j]).toBe(c); expect(w.plantel[c]).not.toContain(j); }
      for (const j of ac.sub21[c]) { expect(st.idade(j, dia)).toBeGreaterThanOrEqual(18.9); expect(ac.escalao[j]).toBe(ESC.sub21); }
      for (const j of ac.prospectos[c]) expect(st.idade(j, dia)).toBeLessThan(18);
    }
  });

  it('qualidade do intake: reputação, academia, coordenador, recrutamento e país pesam; volume pela dimensão do país', () => {
    const ac = w.academia!, e = w.economia!;
    const c = w.ligaPorId('POR1').clubes[0];
    const base = ac.potencialMedio(c);
    const k = e.clubes.infra.length ? c * 5 + 2 : -1; // academia é o 3.º tipo de infra-estrutura
    const n0 = e.clubes.infra[k];
    e.clubes.infra[k] = 10;
    expect(ac.potencialMedio(c)).toBeGreaterThan(base);
    expect(ac.shortlistMax(c)).toBeGreaterThanOrEqual(PROSPECTOS.shortlist_base + 4);
    e.clubes.infra[k] = n0;
    expect(ac.potencialMedio(c, 'BRA')).toBeGreaterThan(ac.potencialMedio(c, 'KSA'));
    const bra = w.ligaPorId('BRA1').clubes[0], sco = w.ligaPorId('SCO1').clubes[0];
    expect(ac.volumeIntake(bra) + 2).toBeGreaterThan(ac.volumeIntake(sco));
  });

  it('juniores evoluem pelos minutos do escalão e pelo coordenador (não pelo treinador principal)', () => {
    const ac = w.academia!;
    const c = w.ligaPorId('ENG1').clubes[0];
    const j = ac.sub21[c][0], p = ac.prospectos[c][0];
    expect(ac.minutos(j)).toBeGreaterThan(ac.minutos(p));
    expect(ac.minutos(j)).toBeLessThanOrEqual(1);
    expect(ac.desenvolvimento(c)).toBeGreaterThanOrEqual(1);
  });
});

describe('passagem de época', () => {
  it('promove sub-21 com nível, passa os sub-18 de 19 anos ao sub-21, enche o sub-18 com prospectos, faz o intake', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('NED1').clubes[3];
    // Abre duas vagas na equipa principal.
    const pl = w.plantel[c].filter((j) => st.clube[j] === c);
    for (const j of pl.slice(-3)) st.clube[j] = -2;
    w.plantel[c] = w.plantel[c].filter((j) => st.clube[j] === c);
    // Um sub-21 claramente com nível.
    const j = ac.sub21[c][0];
    for (let k = 0; k < 39; k++) st.atr[j * 39 + k] = Math.min(20, st.atr[j * 39 + k] + 4);
    st.recalcular(j);
    st.pot[j] = Math.max(st.pot[j], st.ovrNat(j));
    const p0 = ac.promovidos.length, n0 = st.n;
    ac.fimDeEpoca(c, dia - 40);
    expect(ac.promovidos.length).toBeGreaterThan(p0);
    expect(w.plantel[c]).toContain(j);
    expect(ac.escalao[j]).toBe(ESC.nenhum);
    expect(st.n).toBeGreaterThan(n0); // intake
    expect(ac.sub18[c].length).toBeLessThanOrEqual(ESCALOES.sub18.maximo);
    expect(w.plantel[c].filter((x) => st.clube[x] === c).length).toBeGreaterThanOrEqual(22);
  });

  it('fora da curva: um sub-18 de 16 anos muito acima do escalão sobe ao sub-21 ou à equipa principal', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('BEL1').clubes[2];
    const j = ac.sub18[c].find((x) => st.idade(x, dia) < 17.3) ?? ac.sub18[c][0];
    for (let k = 0; k < 39; k++) st.atr[j * 39 + k] = Math.min(20, st.atr[j * 39 + k] + 8);
    st.recalcular(j);
    st.pot[j] = 99;
    const f0 = ac.foraDaCurva.length;
    ac.fimDeEpoca(c, dia - 40);
    expect(ac.foraDaCurva.length).toBe(f0 + 1);
    expect([ESC.sub21, ESC.nenhum]).toContain(ac.escalao[j]);
  });

  it('a reposição gerada do Prompt 2 deixou de existir (as vagas enchem-se com a academia e o mercado)', async () => {
    const { renovarPlantel } = await import('../src/players/evolucao.ts');
    const { Rng } = await import('../src/core/rng.ts');
    const st = w.jogadores!;
    const c = w.ligaPorId('ENG1').clubes[5];
    const n0 = st.n;
    const r = renovarPlantel(w, st, c, dia, Rng.de(1, 'x'), 2026, false);
    expect(r.novos.length).toBe(0);
    expect(st.n).toBe(n0);
  });
});

describe('mercado de jovens', () => {
  it('compensação de formação por tabela: anos de formação (12–21) × categoria do comprador', () => {
    const ac = w.academia!, st = w.jogadores!;
    const peq = w.ligaPorId('POR1').clubes.at(-1)!, gr = w.ligaPorId('ENG1').clubes[0];
    const j = ac.sub18[peq].find((x) => st.idade(x, dia) >= 16 && st.idade(x, dia) < 18)!;
    const v = ac.compensacao(j, gr, dia);
    const cat = COMPENSACAO.categorias.find((k) => w.reputacao[gr] >= k.reputacao)!;
    expect(v % cat.por_ano).toBe(0);
    expect(v / cat.por_ano).toBeGreaterThanOrEqual(3);
    expect(v / cat.por_ano).toBeLessThanOrEqual(7);
    expect(ac.compensacao(j, peq, dia)).toBeLessThan(v);
  });

  it('aliciamento: um clube grande leva um prospecto que conhece e paga a compensação', () => {
    const ac = w.academia!, st = w.jogadores!, e = w.economia!;
    const peq = w.ligaPorId('POR1').clubes.at(-2)!, gr = w.ligaPorId('ENG1').clubes[1];
    const j = ac.sub18[peq].find((x) => st.idade(x, dia) >= 16.2 && st.idade(x, dia) < 18)!;
    const caixa = e.clubes.caixa[peq];
    const v = ac.transferirJovem(j, gr, dia);
    expect(st.clube[j]).toBe(gr);
    expect(ac.jovens(gr)).toContain(j);
    expect(ac.jovens(peq)).not.toContain(j);
    expect(e.clubes.caixa[peq]).toBeGreaterThanOrEqual(caixa); // recebe (o lançamento entra na caixa)
    expect(w.mercado!.registo.at(-1)!.tipo).toBe('formacao');
    expect(v).toBeGreaterThan(0);
  });
});

describe('dados para a interface', () => {
  it('shortlist: o próprio clube vê tudo; um rival vê intervalos (nevoeiro)', () => {
    const ac = w.academia!, sc = w.mercado!.scouting;
    const c = w.ligaPorId('ESP1').clubes[4], rival = w.ligaPorId('ESP1').clubes[6];
    const r = ac.resumoProspectos(c, dia);
    expect(r.length).toBeGreaterThan(5);
    expect(typeof r[0].ovr).toBe('number');
    expect(r[0].estrelas[1] - r[0].estrelas[0]).toBeLessThanOrEqual(0.5);
    expect(['promover_sub18', 'promover_sub21', 'promover_principal', 'manter', 'emprestar', 'vender', 'libertar']).toContain(r[0].conselho);
    sc.conhecer(rival, r[0].jogador, 20, dia);
    const v = ac.resumoProspectos(c, dia, rival);
    const x = v.find((y) => y.jogador === r[0].jogador)!;
    expect(Array.isArray(x.ovr)).toBe(true);
    expect(x.conhecimento).toBeLessThan(100);
  });

  it('estatísticas leves dos jovens só no clube do utilizador', () => {
    const ac = w.academia!, e = w.economia!;
    const c = w.ligaPorId('ENG1').clubes[3];
    const u = new ControladorIA() as unknown as { tipo: string };
    Object.defineProperty(u, 'tipo', { value: 'utilizador' });
    e.controladores[c] = u as never;
    ac.mes(dia + 31);
    const js = ac.jovens(c);
    expect(js.some((j) => (ac.estat.get(j)?.jogos ?? 0) > 0)).toBe(true);
    const outro = w.ligaPorId('ENG1').clubes[4];
    expect(ac.jovens(outro).some((j) => ac.estat.has(j))).toBe(false);
    delete e.controladores[c];
    void ovrAlvoClube;
  });
});
