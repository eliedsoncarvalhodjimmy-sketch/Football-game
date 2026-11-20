// Prompt 6, Bloco D: o clube do utilizador usa o mesmo motor e os mesmos direitos. A recompra chega como evento
// (uma frase e uma decisão) e decide-se com um comando; a venda futura entra nas opções de oferta (0–25%); o que
// acontece sem decisão (venda futura recebida, recompra exercida) aparece como aviso.
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';
import { Rng } from '../src/core/rng.ts';
import { NEG_CLUBE } from '../src/config/negociacaoUtilizador.ts';
import { vistaMercado } from '../src/jogo/vistasA3.ts';
import type { Negocio } from '../src/mercado/mercado.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('mercado do utilizador (Prompt 6, Bloco D)', () => {
  it('recompra por notificação: evento com a decisão; exercer traz o jogador ao preço fixo; venda futura recebida é um aviso', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    a.comecar(paises.find((p) => p.id === 'por')!.ligas[0].clubes[2].id, { nome: 'Teste', perfilDono: 'dono-banca' });
    a.avancar(); // Julho: janela aberta
    const w = a.w!, st = w.jogadores!, m = w.mercado!, u = m.util!, c = a.clube;
    const dia = a.sim!.segunda;
    expect(NEG_CLUBE.venda_futura_opcoes).toEqual([0, 10, 15, 20, 25]);
    expect(NEG_CLUBE.parcelas.map((x) => x.id)).toEqual(['vista', 'parcelado']);
    // O utilizador tem a recompra (barata) de um jogador de outro clube português; um clube inglês faz uma oferta aceite.
    const vend = w.ligas[w.liga[c]].clubes.find((x) => x !== c)!, comp = w.ligaPorId('ENG1').clubes[3];
    const j = m.plantel(vend).filter((x) => !m.podeInscrever(x, c)).sort((x, y) => st.ovrNat(y) - st.ovrNat(x))[3];
    w.economia!.clubes.caixa[c] = Math.max(w.economia!.clubes.caixa[c], 5e8);
    const d = m.direitos.criar(j, 'recompra', c, 2e6, dia, 2e6, 2)!;
    // E uma venda futura de 25% sobre outro jogador, que o dono vende a seguir.
    const k = m.plantel(vend).sort((x, y) => st.ovrNat(y) - st.ovrNat(x))[6];
    m.direitos.criar(k, 'venda_futura', c, 0.25, dia, 1e6, 5);
    const n: Negocio = { id: 8e6, tipo: 'transferencia', jogador: j, vendedor: vend, comprador: comp, estado: 'oferta', oferta: 3e7, pedido: 0, maximo: 3e7, salario: 0, estatuto: 'rotacao', dia, inicio: dia, rondas: [], contra: 1 };
    m.negocios.push(n);
    m.ronda(n, Rng.de(3, 'teste-d', n.id));
    expect(n.estado).toBe('recompra');
    const ev = vistaMercado(w, c, dia).eventos.find((e) => e.tipo === 'recompra');
    expect(ev).toBeTruthy();
    expect(ev!.decisoes).toEqual(['exercer', 'recusar']);
    expect(ev!.texto).toContain(st.nomes[j]);
    a.comando({ tipo: 'recompra', negocio: ev!.ref!, exercer: true });
    m.ronda(n, Rng.de(3, 'teste-d', n.id, 2));
    expect(n.estado).toBe('falhou');
    const r = m.negocios.find((x) => x.deRecompra && x.jogador === j)!;
    expect(r.comprador).toBe(c);
    expect(r.oferta).toBe(d.preco);
    m.concluir(r, Rng.de(3, 'teste-d', r.id));
    expect(st.clube[j]).toBe(c);
    // Venda do outro jogador: o utilizador recebe 25% e vê o aviso.
    const vk: Negocio = { id: 8e6 + 1, tipo: 'transferencia', jogador: k, vendedor: vend, comprador: comp, estado: 'registo', oferta: 1e7, pedido: 1e7, maximo: 1e7, salario: st.salario[k], estatuto: 'rotacao', dia, inicio: dia, rondas: [] };
    m.concluir(vk, Rng.de(3, 'teste-d', vk.id));
    const avisos = u.eventos(dia).filter((e) => e.tipo === 'aviso');
    expect(avisos.some((e) => e.texto.includes('25% de venda futura') && e.texto.includes(st.nomes[k]))).toBe(true);
    expect(avisos.every((e) => e.decisoes.length === 0)).toBe(true);
  }, 180000);

  it('oferta com 25% de venda futura e pagamento parcelado: o direito fica com o vendedor; pagam-se 2 parcelas semestrais', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    a.comecar(paises.find((p) => p.id === 'por')!.ligas[0].clubes[2].id, { nome: 'Teste', perfilDono: 'dono-banca' });
    a.avancar();
    const w = a.w!, st = w.jogadores!, m = w.mercado!, c = a.clube;
    w.economia!.clubes.caixa[c] = Math.max(w.economia!.clubes.caixa[c], 5e8);
    const outro = w.ligas[w.liga[c]].clubes.find((x) => x !== c)!;
    const alvo = m.plantel(outro).sort((x, y) => st.ovrNat(y) - st.ovrNat(x))[6];
    a.comando({ tipo: 'negociar', jogador: st.ids[alvo], negocio: 'transferencia' });
    const n = m.util!.negs[0];
    a.comando({ tipo: 'propostaClube', id: n.id, valor: Math.ceil(n.pedido * 1.1), vendaFutura: 25, parcelas: 'parcelado', troca: null });
    expect(n.fase).toBe('jogador');
    const boa = { papel: n.pede!.papel, anos: 3, salario: n.pede!.salario, premio: n.pede!.premio, agente: n.pede!.agente, clausula: 0, bonus: null };
    a.comando({ tipo: 'propostaJogador', id: n.id, proposta: boa });
    for (let k = 0; k < 3 && n.fase !== 'concluida'; k++) a.avancar();
    expect(n.fase).toBe('concluida');
    expect(m.direitos.de(alvo).find((d) => d.tipo === 'venda_futura' && d.clube === outro)?.pct).toBeCloseTo(0.25);
    const parc = m.parcelas.filter((p) => p.pagador === c && p.recebedor === outro);
    expect(parc.length).toBe(2);
    expect(parc[1].dia - parc[0].dia).toBe(NEG_CLUBE.parcelas[1].dias);
    expect(() => a.comando({ tipo: 'propostaClube', id: n.id, valor: 1, vendaFutura: 30, parcelas: 'vista', troca: null })).toThrow();
  }, 180000);
});
