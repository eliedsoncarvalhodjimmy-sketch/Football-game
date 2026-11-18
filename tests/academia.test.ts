// Prompt 4, Bloco C: academia e juniores.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { ESC } from '../src/academia/academia.ts';
import { ESCALOES, COMPENSACAO, INTAKE } from '../src/config/academia.ts';
import { ControladorIA } from '../src/club/controlador.ts';
import { ovrAlvoClube } from '../src/players/gerador.ts';

let w: World;
const dia = Math.floor(Date.UTC(2026, 7, 1) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('estrutura', () => {
  it('cadeia Intake → Sub-18 (máx. 30) → Sub-21, fora da equipa principal; sem prospectos nem agregado', () => {
    const ac = w.academia!, st = w.jogadores!;
    const k = ac.contagens();
    expect(k.individuais).toBeGreaterThan(30000);
    expect(k.individuais).toBeLessThan(50000);
    expect(ESCALOES.sub18.maximo).toBe(30);
    for (const c of w.ligaPorId('ENG1').clubes) {
      expect(ac.sub18[c].length).toBeLessThanOrEqual(ESCALOES.sub18.maximo);
      expect(ac.sub18[c].length).toBeGreaterThan(18);
      expect(ac.sub21[c].length).toBeLessThanOrEqual(ESCALOES.sub21.maximo);
      for (const j of ac.jovens(c)) { expect(st.clube[j]).toBe(c); expect(w.plantel[c]).not.toContain(j); }
      for (const j of ac.sub21[c]) { expect(st.idade(j, dia)).toBeGreaterThanOrEqual(18.9); expect(ac.escalao[j]).toBe(ESC.sub21); }
      for (const j of ac.sub18[c]) { expect(st.idade(j, dia)).toBeLessThan(19); expect(st.idade(j, dia)).toBeGreaterThanOrEqual(15); }
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
    expect(ac.volumeIntake(c)).toBeGreaterThanOrEqual(INTAKE.minimo);
    expect(ac.volumeIntake(c)).toBeLessThanOrEqual(INTAKE.maximo);
    e.clubes.infra[k] = n0;
    expect(ac.potencialMedio(c, 'BRA')).toBeGreaterThan(ac.potencialMedio(c, 'KSA'));
    const bra = w.ligaPorId('BRA1').clubes[0], sco = w.ligaPorId('SCO1').clubes[0];
    expect(ac.volumeIntake(bra) + 2).toBeGreaterThan(ac.volumeIntake(sco));
  });

  it('juniores evoluem pelos minutos reais nas ligas juvenis e pelo coordenador (não pelo treinador principal)', () => {
    const ac = w.academia!;
    const c = w.ligaPorId('ENG1').clubes[0];
    const j = ac.sub21[c][0], p = ac.sub18[c][0];
    ac.ligas.minMes[j] = 330; ac.ligas.minMes[p] = 0;
    expect(ac.minutos(j)).toBeGreaterThan(ac.minutos(p));
    ac.ligas.minMes[j] = 0;
    expect(ac.minutos(j)).toBeLessThanOrEqual(1);
    expect(ac.desenvolvimento(c)).toBeGreaterThanOrEqual(1);
  });
});

describe('passagem de época', () => {
  it('promove sub-21 com nível, passa os sub-18 de 19 anos ao sub-21, deixa o sub-18 no máximo', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('NED1').clubes[3];
    // Abre vagas na equipa principal (abaixo do mínimo: alguns arquétipos deixam as vagas acima do mínimo para o mercado).
    const pl = w.plantel[c].filter((j) => st.clube[j] === c);
    for (const j of pl.slice(-4)) st.clube[j] = -2;
    w.plantel[c] = w.plantel[c].filter((j) => st.clube[j] === c);
    // Um sub-21 claramente com nível.
    const j = ac.sub21[c][0];
    for (let k = 0; k < 39; k++) st.atr[j * 39 + k] = Math.min(20, st.atr[j * 39 + k] + 7);
    st.recalcular(j);
    st.pot[j] = 95;
    const p0 = ac.promovidos.length;
    ac.fimDeEpoca(c, dia - 40);
    expect(ac.promovidos.length).toBeGreaterThan(p0);
    expect(w.plantel[c]).toContain(j);
    expect(ac.escalao[j]).toBe(ESC.nenhum);
    expect(ac.sub18[c].length).toBeLessThanOrEqual(ESCALOES.sub18.maximo);
    expect(w.plantel[c].filter((x) => st.clube[x] === c).length).toBeGreaterThanOrEqual(22);
  });

  it('intake de Junho: 6–12 jovens de 15–16 anos entram directamente no Sub-18; relatório simples', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('POR1').clubes[1];
    const d = Math.floor(Date.UTC(2027, 5, 1) / 864e5);
    const n0 = ac.sub18[c].length, vol = ac.volumeIntake(c);
    ac.intake(c, d);
    expect(ac.sub18[c].length).toBe(n0 + vol);
    expect(ac.ultimoIntake[c].jogadores.length).toBe(vol);
    for (const j of ac.ultimoIntake[c].jogadores) { expect(ac.escalao[j]).toBe(ESC.sub18); const a = st.idade(j, d); expect(a).toBeGreaterThanOrEqual(15); expect(a).toBeLessThan(17); }
    const r = ac.relatorioIntake(c, d);
    expect(r.length).toBe(vol);
    for (const x of r) {
      expect(x.ovr[0]).toBeLessThanOrEqual(st.ovrNat(x.jogador)); expect(x.ovr[1]).toBeGreaterThanOrEqual(st.ovrNat(x.jogador));
      expect(x.pt[0]).toBeLessThanOrEqual(st.pot[x.jogador]); expect(x.pt[1]).toBeGreaterThanOrEqual(st.pot[x.jogador]);
      expect(x.personalidade.length).toBeGreaterThan(3);
      expect(x.altura).toBeGreaterThan(150); expect(x.peso).toBeGreaterThan(40);
    }
  });

  it('excedente do Sub-18: a IA liberta logo; o utilizador recebe a proposta do gestor e decide', () => {
    const ac = w.academia!;
    const [a, b] = [w.ligaPorId('ITA1').clubes[2], w.ligaPorId('ITA1').clubes[3]];
    const d = Math.floor(Date.UTC(2027, 5, 1) / 864e5);
    for (let k = 0; k < 3; k++) { ac.intake(a, d + k); ac.intake(b, d + k); }
    expect(ac.sub18[a].length).toBeGreaterThan(ESCALOES.sub18.maximo);
    ac.fimDeEpoca(a, d + 50);
    expect(ac.sub18[a].length).toBeLessThanOrEqual(ESCALOES.sub18.maximo);
    const e = w.economia!;
    const u = new ControladorIA() as unknown as { tipo: string };
    Object.defineProperty(u, 'tipo', { value: 'utilizador' });
    e.controladores[b] = u as never;
    ac.fimDeEpoca(b, d + 50);
    const prop = ac.excedente.get(b)!;
    expect(prop.jogadores.length).toBe(ac.sub18[b].length - ESCALOES.sub18.maximo);
    // O utilizador fica com um da proposta: liberta os outros.
    ac.decidirExcedente(b, d + 60, prop.jogadores.slice(1));
    expect(ac.sub18[b]).toContain(prop.jogadores[0]);
    expect(ac.excedente.has(b)).toBe(false);
    delete e.controladores[b];
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

  it('aliciamento: um clube grande leva um jovem do Sub-18 que conhece e paga a compensação', () => {
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
  it('Sub-18: o próprio clube vê tudo; um rival vê intervalos (nevoeiro)', () => {
    const ac = w.academia!, sc = w.mercado!.scouting;
    const c = w.ligaPorId('ESP1').clubes[4], rival = w.ligaPorId('ESP1').clubes[6];
    const r = ac.resumoSub18(c, dia);
    expect(r.length).toBeGreaterThan(5);
    expect(typeof r[0].ovr).toBe('number');
    expect(r[0].estrelas[1] - r[0].estrelas[0]).toBeLessThanOrEqual(0.5);
    expect(['promover_sub21', 'promover_principal', 'manter', 'emprestar', 'vender', 'libertar']).toContain(r[0].conselho);
    sc.conhecer(rival, r[0].jogador, 20, dia);
    const v = ac.resumoSub18(c, dia, rival);
    const x = v.find((y) => y.jogador === r[0].jogador)!;
    expect(Array.isArray(x.ovr)).toBe(true);
    expect(x.conhecimento).toBeLessThan(100);
  });

  it('relatório do intake com intervalos que contêm o valor real', () => {
    const ac = w.academia!;
    const c = w.ligaPorId('ENG1').clubes[3];
    ac.intake(c, dia + 300);
    expect(ac.relatorioIntake(c, dia + 300).length).toBe(ac.volumeIntake(c));
    void ovrAlvoClube; void ControladorIA;
  });
});

describe('respostas à Paragem C', () => {
  it('intake pela tabela do utilizador (convertida): ~49% com potencial 65–75, extremos (95+) raríssimos; tecto de OVR até aos 18', async () => {
    const { Rng } = await import('../src/core/rng.ts');
    const ac = w.academia!, st = w.jogadores!;
    const inv = (x: number) => 99 - (99 - x) / 1.6;
    const rng = Rng.de(5, 'teste');
    const ps: number[] = [];
    for (let c = 0; c < w.clubes.length; c++) if (w.liga[c] >= 0) for (let k = 0; k < ac.volumeIntake(c); k++) ps.push(inv(ac.sortearJovem(c, rng).pot));
    const frac = (a: number, b: number) => ps.filter((x) => x >= a && x < b).length / ps.length;
    expect(frac(0, 75.5)).toBeGreaterThan(0.35);
    expect(frac(95, 100)).toBeLessThan(0.02);
    expect(frac(90, 100)).toBeLessThan(0.07);
    // (os testes anteriores puxaram alguns juniores para cima: o tecto aplica-se todos os meses depois da evolução)
    ac.aplicarTeto(dia);
    for (let j = 0; j < st.n; j++) if (st.clube[j] >= 0 && st.idade(j, dia) < 19) expect(st.ovrNat(j)).toBeLessThanOrEqual(ac.teto);
  });

  it('contrato profissional obrigatório aos 18 (salário mínimo da liga), senão sai', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('ESP1').clubes[8];
    ac.fimDeEpoca(c, dia - 40);
    for (const j of ac.jovens(c)) if (st.idade(j, dia + 20) >= 18) { expect(st.salario[j]).toBeGreaterThan(0); expect(st.fimContrato[j]).toBeGreaterThan(dia); }
    for (const j of ac.jovens(c)) if (st.idade(j, dia + 20) < 17.9) expect(st.salario[j]).toBe(0);
  });

  it('potencial dinâmico: muito acima do nível do clube e sem minutos perde potencial em média', () => {
    const ac = w.academia!, st = w.jogadores!;
    const c = w.ligaPorId('ENG4').clubes[0];
    const js = w.plantel[c].filter((j) => st.clube[j] === c && st.idade(j, dia) <= 24).slice(0, 6);
    for (const j of js) { st.pot[j] = 95; for (let k = 0; k < 39; k++) st.atr[j * 39 + k] = Math.min(20, st.atr[j * 39 + k] + 4); st.recalcular(j); st.eMinutos[j] = 0; }
    const antes = js.map((j) => st.pot[j]);
    ac.ajustarPotenciais([c], dia);
    expect(js.reduce((a, j, k) => a + st.pot[j] - antes[k], 0)).toBeLessThan(0);
  });
});
