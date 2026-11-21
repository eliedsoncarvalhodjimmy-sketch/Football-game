// Prompt 6 (fecho, pedido do utilizador): titulares dos gigantes ficam (preço e recusa do jogador), poder de compra pelo
// clube (não pela liga), limite tipo PSR com amortização, e receitas provisórias dos gigantes de fora de Inglaterra.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { diaInicioMundo, type World } from '../src/engine/world.ts';
import { GIGANTES } from '../src/config/negociacao.ts';
import { RECEITAS_PROVISORIAS } from '../src/config/economia.ts';
import { PRECO } from '../src/config/valor.ts';
import { pontuarProposta } from '../src/mercado/decisaoJogador.ts';
import { valorMercado } from '../src/mercado/valor.ts';
import { Rng } from '../src/core/rng.ts';
import type { Mercado, Negocio } from '../src/mercado/mercado.ts';

let w: World, m: Mercado;
const dia = diaInicioMundo() + 5;
const gigante = (id: string) => [...w.ligaPorId(id).clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a])[0];
beforeAll(async () => { w = await mundo(); m = w.mercado!; }, 60000);

describe('mercado, fecho do Prompt 6', () => {
  it('receitas provisórias: Real Madrid ~1 050 M€, Barcelona ~900 M€, Bayern e PSG ~825 M€ (ao nível dos ingleses de topo)', () => {
    const s = w.economia!.clubes;
    for (const [id, alvos] of Object.entries(RECEITAS_PROVISORIAS)) {
      const ordem = [...w.ligaPorId(id).clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
      alvos.forEach((alvo, k) => expect(s.receitaPrevista[ordem[k]]).toBeGreaterThanOrEqual(alvo * 0.97));
    }
    // O poder de compra vem do clube: o gigante espanhol está no mesmo escalão do maior inglês (ou acima).
    expect(m.poderCompra(gigante('ESP1')).tecto).toBeGreaterThanOrEqual(m.poderCompra(gigante('ENG1')).tecto);
  });

  it('titular de um gigante: o clube só o vende muito acima do valor; o jogador recusa descer de reputação', () => {
    const st = w.jogadores!, c = gigante('ESP1');
    const p = m.planos.calcular(c, dia);
    const j = [...p.lugar.entries()].find(([, l]) => l.titular)![0];
    const pequeno = [...w.ligaPorId('POR1').clubes].sort((a, b) => w.reputacao[a] - w.reputacao[b])[0];
    expect(w.reputacao[c] - w.reputacao[pequeno]).toBeGreaterThanOrEqual(GIGANTES.descida.diferenca);
    // (a) Preço: oferta igual ao valor, o vendedor pede ≥ multiplo × o valor.
    const valor = valorMercado(w, j, dia, w.economia!.inflacao);
    const n: Negocio = { id: 7e6, tipo: 'transferencia', jogador: j, vendedor: c, comprador: pequeno, estado: 'oferta', oferta: valor, pedido: 0, maximo: valor, salario: 0, estatuto: 'rotacao', dia, inicio: dia, rondas: [] };
    m.negocios.push(n);
    m.ronda(n, Rng.de(1, 'gigante', n.id));
    const mult = 1 + (GIGANTES.multiplo_max - 1) * Math.min(1, (w.reputacao[c] - GIGANTES.reputacao_min) / (GIGANTES.reputacao_max - GIGANTES.reputacao_min));
    expect(n.pedido).toBeGreaterThanOrEqual(Math.min(PRECO.preco_maximo, Math.round(valor * mult / 10000) * 10000) - 10000);
    m.negocios = m.negocios.filter((x) => x !== n);
    // (b) O jogador: a proposta de um clube muito mais pequeno leva a penalização de descida; com salário enorme não.
    const sal = st.salario[j];
    const r1 = pontuarProposta(w, m, j, { clube: pequeno, salario: sal * 1.2, minutos: 1 }, dia);
    expect(r1.parcelas.descida).toBeLessThan(0);
    const r2 = pontuarProposta(w, m, j, { clube: pequeno, salario: sal * GIGANTES.descida.salario_enorme, minutos: 1 }, dia);
    expect(r2.parcelas.descida).toBe(0);
  });

  it('limite tipo PSR: o custo do plantel soma salários e a amortização das transferências (preço ÷ anos de contrato)', () => {
    const st = w.jogadores!, c = gigante('ENG1');
    const j = m.plantel(c)[0];
    const antes = m.custoPlantel(c, dia);
    m.contratos.amortAnual[j] = 20e6; m.contratos.amortAte[j] = dia + 365;
    expect(m.custoPlantel(c, dia)).toBeCloseTo(antes + 20e6, -3);
    expect(m.custoPlantel(c, dia + 400)).toBeCloseTo(antes, -3);
    m.contratos.amortAnual[j] = 0; m.contratos.amortAte[j] = 0;
    void st;
  });
});
