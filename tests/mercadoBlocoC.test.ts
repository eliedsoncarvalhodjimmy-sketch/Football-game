// Prompt 6, Bloco C: estrelas, veteranos e preços. A idade-alvo dos reforços por liga (veteranos na Arábia e na MLS),
// a "estrela" da janela só nos clubes ricos, e a pechincha de um contrato a acabar.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { diaInicioMundo, type World } from '../src/engine/world.ts';
import { PLANO_PLANTEL } from '../src/config/negociacao.ts';
import { PRECO } from '../src/config/valor.ts';
import { precoPedido } from '../src/mercado/valor.ts';
import type { Mercado } from '../src/mercado/mercado.ts';

let w: World, m: Mercado;
const dia = diaInicioMundo() + 5;
beforeAll(async () => { w = await mundo(); m = w.mercado!; }, 60000);

describe('mercado, Bloco C (Prompt 6)', () => {
  it('veteranos: na Arábia e na MLS os reforços (fora da sucessão) vão até aos 34–35 anos; numa liga sem veteranos não', () => {
    for (const [id, idade] of [['KSA1', PLANO_PLANTEL.ligas_veteranos.KSA1], ['USA1', PLANO_PLANTEL.ligas_veteranos.USA1]] as const) {
      const nec = w.ligaPorId(id).clubes.flatMap((c) => m.planos.calcular(c, dia).todas).filter((n) => n.motivo !== 'sucessao');
      expect(nec.length).toBeGreaterThan(0);
      for (const n of nec) expect(n.idade[1]).toBeGreaterThanOrEqual(idade);
    }
    // Na Holanda só os candidatos ao título passam dos 31.
    const ned = w.ligaPorId('NED1').clubes.flatMap((c) => m.planos.calcular(c, dia).todas).filter((n) => n.motivo !== 'sucessao');
    for (const n of ned) expect(n.idade[1]).toBeLessThanOrEqual(PLANO_PLANTEL.titulo_idade_max);
  });

  it('estrela: no máximo uma por clube e só em ligas ricas; é uma necessidade de qualidade com nível acima do titular', () => {
    let estrelas = 0;
    for (const l of w.ligas) for (const c of l.clubes) {
      const p = m.planos.calcular(c, dia);
      const e = p.necessidades.filter((n) => n.estrela);
      expect(e.length).toBeLessThanOrEqual(1);
      if (!e.length) continue;
      estrelas++;
      expect(m.poderCompra(c).estrelas).toBeGreaterThan(0);
      expect(e[0].motivo).toBe('qualidade');
    }
    expect(estrelas).toBeGreaterThan(0);
    // Depois de contratar as estrelas do seu escalão, o clube não marca outra nessa janela.
    const c = w.ligaPorId('ENG1').clubes.find((x) => m.planos.calcular(x, dia).necessidades.some((n) => n.estrela));
    if (c !== undefined) {
      m.estrelaJanela.set(c, m.poderCompra(c).estrelas);
      expect(m.planos.calcular(c, dia).necessidades.some((n) => n.estrela)).toBe(false);
      m.estrelaJanela.delete(c);
    }
  });

  it('pechincha: contrato a acabar de quem o vendedor não renova sai mais barato; a razão preço/valor fica em 0,6–2,5', () => {
    const st = w.jogadores!;
    const c = w.ligaPorId('POR1').clubes[2], outro = w.ligaPorId('ENG1').clubes[5];
    const j = m.plantel(c).sort((a, b) => st.ovrNat(a) - st.ovrNat(b))[0];
    const fim0 = st.fimContrato[j], lst0 = m.contratos.listado[j];
    st.fimContrato[j] = dia + 200;
    m.contratos.listado[j] = 1;
    const pp = precoPedido(w, m, j, outro, dia);
    expect(pp.factores.fim_contrato).toBe(PRECO.fim_contrato.factor);
    expect(pp.preco / pp.valor).toBeGreaterThanOrEqual(PRECO.razao[0] - 0.01);
    expect(pp.preco / pp.valor).toBeLessThanOrEqual(PRECO.razao[1] + 0.01);
    st.fimContrato[j] = fim0; m.contratos.listado[j] = lst0;
  });
});
