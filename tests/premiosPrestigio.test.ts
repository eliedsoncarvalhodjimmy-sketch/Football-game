// Prompt 8, Bloco C: o selo dos prémios na carreira e na economia. Um vencedor com o contrato a acabar pede mais salário
// e sai mais caro (na faixa; razão preço/valor entre 0,6 e 2,5); a IA de mercado passa a conhecê-lo; o efeito decai em
// 2 a 3 anos; o clube ganha um pouco nas receitas comerciais; Hall of Fame e legado. Nada mexe nos atributos.
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { mundo } from './helpers.ts';
import { Prestigio } from '../src/premios/prestigio.ts';
import { precoPedido, valorMercado } from '../src/mercado/valor.ts';
import { salarioPedido } from '../src/mercado/decisaoJogador.ts';
import { PRESTIGIO as PR } from '../src/config/premios.ts';
import { PRECO } from '../src/config/valor.ts';
import type { World } from '../src/engine/world.ts';
import type { LinhaPremio } from '../src/historico/historico.ts';

describe('prestígio dos prémios (Prompt 8, Bloco C)', () => {
  let w: World, j: number, comprador: number, longe: number;
  const ano = 2026, dia = Prestigio.dia(ano) + 30; // um mês depois da cerimónia
  beforeAll(async () => {
    w = await mundo();
    const st = w.jogadores!;
    // A estrela da ITA1, com o contrato a acabar dentro de 8 meses.
    const ita = w.ligaPorId('ITA1').clubes;
    j = ita.flatMap((c) => w.plantel[c].filter((x) => st.clube[x] === c)).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[0];
    st.fimContrato[j] = dia + 240;
    comprador = w.ligaPorId('ENG1').clubes.sort((a, b) => w.reputacao[b] - w.reputacao[a])[0];
    longe = w.ligaPorId('JPN1').clubes[0];
  }, 120000);

  const linha = (premio: LinhaPremio['premio'], idxs: number[]): LinhaPremio => ({ ano, premio, jogador: '', clube: '', nota: '', fonte: 'jogo', idx: idxs[0], finalistas: idxs.map((idx) => ({ jogador: '', clube: '', pontos: 0, idx })) });

  it('vencedor da Bola de Ouro: preço e salário sobem na faixa; o valor de mercado não muda; a IA passa a vê-lo', () => {
    const m = w.mercado!, st = w.jogadores!, p = w.prestigio!;
    const sc = m.scouting;
    const v0 = valorMercado(w, j, dia, w.economia!.inflacao), p0 = precoPedido(w, m, j, comprador, dia), s0 = salarioPedido(w, j, m.salarioMercado(j, comprador, dia), dia);
    const n0 = sc.nivel(longe, j, dia), ovr0 = st.ovrNat(j), moral0 = st.moral[j];
    p.registar(linha('melhor_do_mundo', [j, 1, 2]));
    const v1 = valorMercado(w, j, dia, w.economia!.inflacao), p1 = precoPedido(w, m, j, comprador, dia), s1 = salarioPedido(w, j, m.salarioMercado(j, comprador, dia), dia);
    expect(v1).toBe(v0);
    // Preço: + 10 a 15% (salvo o tecto da faixa); razão preço/valor sempre entre 0,6 e 2,5.
    expect(p1.factores.marca).toBeGreaterThan(1.1);
    expect(p1.factores.marca).toBeLessThanOrEqual(1 + PR.preco_tecto);
    expect(p1.preco).toBeGreaterThanOrEqual(p0.preco);
    expect(p1.preco / v1).toBeGreaterThanOrEqual(PRECO.razao[0] - 1e-9);
    expect(p1.preco / v1).toBeLessThanOrEqual(PRECO.razao[1] + 1e-9);
    // Salário: + 5 a 10%.
    expect(s1 / s0).toBeGreaterThan(1.05);
    expect(s1 / s0).toBeLessThanOrEqual(1.1 + 0.01);
    // Conhecido de todos os clubes (nevoeiro no mínimo).
    expect(n0).toBeLessThan(PR.conhecimento_minimo);
    expect(sc.nivel(longe, j, dia)).toBeGreaterThanOrEqual(PR.conhecimento_minimo);
    // Nunca os atributos nem a moral.
    expect(st.ovrNat(j)).toBe(ovr0);
    expect(st.moral[j]).toBe(moral0);
  });

  it('o efeito decai: meia-vida de 2 anos e nada ao fim de 3', () => {
    const p = w.prestigio!;
    const a0 = p.valor(j, Prestigio.dia(ano)), a2 = p.valor(j, Prestigio.dia(ano) + 2 * 365), a4 = p.valor(j, Prestigio.dia(ano) + 3 * 365 + 10);
    expect(a0).toBeCloseTo(100, 5);
    expect(a2).toBeCloseTo(50, 0);
    expect(a4).toBe(0);
    expect(p.marca(j, Prestigio.dia(ano) + 3 * 365 + 10)).toBe(1);
    expect(p.conhecimentoMinimo(j, Prestigio.dia(ano) + 2 * 365 + 10)).toBe(0);
  });

  it('tecto da marca: com vários selos, nunca acima de +25%', () => {
    const p = w.prestigio!;
    p.registar(linha('golden_boy', [j]));
    p.registar(linha('guarda_redes', [j]));
    expect(p.marca(j, dia)).toBeLessThanOrEqual(1 + PR.preco_tecto + 1e-9);
    expect(p.valor(j, dia)).toBeLessThanOrEqual(100);
  });

  it('receitas comerciais do clube: um pouco mais, com tecto', () => {
    const c = w.jogadores!.clube[j];
    const x = w.prestigio!.comercial(dia).get(c)!;
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThanOrEqual(PR.comercial.tecto);
  });

  it('Hall of Fame e legado (reputação de entrada de um ex-craque)', () => {
    const p = w.prestigio!;
    const h = p.hallOfFame();
    expect(h[0].idx).toBe(j);
    expect(h[0].contagem.melhor_do_mundo.vencedor).toBe(1);
    expect(p.contagem(1).melhor_do_mundo.top3).toBe(1);
    expect(p.reputacaoLegado(j)).toBeGreaterThan(PR.legado.base);
    expect(p.reputacaoLegado(w.jogadores!.n - 1)).toBeNull();
  });

  it('regra de ouro: o motor do jogo e a evolução nunca leem o prestígio', () => {
    const ficheiros = [...readdirSync('src/match').map((f) => `src/match/${f}`), 'src/players/evolucao.ts', 'src/players/store.ts', 'src/engine/season/temporada.ts'];
    for (const f of ficheiros) if (f.endsWith('.ts')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/prestigio/i);
  });
});
